"""Hybrid multimodal summarizer — 3-pass pipeline."""

import json
import re
from dataclasses import dataclass, field
from enum import Enum


class SummarizeMode(str, Enum):
    SHORT = "short"
    MEDIUM = "medium"
    DETAILED = "detailed"


class ModalityFocus(str, Enum):
    ALL = "all"
    TEXT_ONLY = "text_only"
    VISUAL_ONLY = "visual_only"
    AUDIO_ONLY = "audio_only"


class OutputFormat(str, Enum):
    BULLETS = "bullets"
    NARRATIVE = "narrative"
    HYBRID = "hybrid"


@dataclass
class SummarizationResult:
    narrative: str
    bullets: list[str]
    anchors: list[dict]
    breakdown: dict = field(default_factory=dict)
    modality_tags: list[str] = field(default_factory=list)


SEGMENT_WEIGHTS = {
    "heading": 1.5,
    "caption": 1.3,
    "table": 1.2,
    "list": 1.0,
    "paragraph": 0.8,
    "transcript_segment": 0.9,
}

MODALITY_LABELS = {
    "text": "[Text]",
    "image": "[Image-OCR]",
    "audio": "[Audio-Transcript]",
    "video": "[Video-Derived]",
}

MODE_LIMITS = {
    "short": {"bullets": 3, "paragraphs": 1},
    "medium": {"bullets": 6, "paragraphs": 2},
    "detailed": {"bullets": 10, "paragraphs": 4},
}


class HybridSummarizer:
    """3-pass: extractive → abstractive → anchor assembly."""

    def __init__(self, ollama_client):
        self.ollama = ollama_client

    def extractive_pass(self, chunks: list[dict], mode: str, focus: str) -> list[dict]:
        if focus == "text_only":
            chunks = [c for c in chunks if c.get("modality") == "text"]
        elif focus == "visual_only":
            chunks = [c for c in chunks if c.get("modality") in ("image", "video")]
        elif focus == "audio_only":
            chunks = [c for c in chunks if c.get("modality") in ("audio", "video")]

        for c in chunks:
            c["_composite_score"] = (
                c.get("score", 0.5)
                * SEGMENT_WEIGHTS.get(c.get("segment_type", "paragraph"), 0.8)
                * c.get("confidence", 1.0)
            )

        limit = MODE_LIMITS.get(mode, MODE_LIMITS["medium"])["bullets"]
        return sorted(chunks, key=lambda c: c["_composite_score"], reverse=True)[:limit]

    async def abstractive_pass(
        self,
        selected_chunks: list[dict],
        mode: str,
        fmt: str,
        query: str | None = None,
    ) -> dict:
        context_lines = []
        for i, c in enumerate(selected_chunks):
            label = MODALITY_LABELS.get(c.get("modality", "text"), "[Unknown]")
            page = c.get("page_number") or c.get("page", "?")
            anchor = c.get("source_anchor", {})
            ts = ""
            if anchor.get("timestamp_start") is not None:
                ts = f", {anchor['timestamp_start']:.1f}s–{anchor['timestamp_end']:.1f}s"
            text = c.get("chunk_text") or c.get("text", "")
            context_lines.append(f"[Source {i+1}] {label} (p.{page}{ts}):\n{text}")

        limits = MODE_LIMITS.get(mode, MODE_LIMITS["medium"])
        fmt_instruction = {
            "bullets": f"Output ONLY {limits['bullets']} bullet points. Tag each with modality.",
            "narrative": f"Write {limits['paragraphs']} fluent paragraphs. Weave modality tags.",
            "hybrid": f"{limits['bullets']} bullets + {limits['paragraphs']} paragraphs. Tag each.",
        }.get(fmt, "Write a hybrid summary.")

        focus_note = f"\nFOCUS: {query}" if query else ""
        prompt = f"""You are a multimodal summarizer. Sources are tagged: [Text], [Image-OCR], [Audio-Transcript], [Video-Derived].

SOURCES:
{chr(10).join(context_lines)}

INSTRUCTIONS:
{fmt_instruction}
- Use modality tags in output (e.g., "According to [Image-OCR], ...")
- Cross-reference when modalities corroborate
- Do NOT hallucinate beyond sources{focus_note}

Output JSON: {{"narrative": "...", "bullets": ["..."], "modality_tags_used": ["..."]}}"""

        response = await self.ollama.chat(messages=[{"role": "user", "content": prompt}])

        try:
            return json.loads(response)
        except json.JSONDecodeError:
            match = re.search(r'\{.*\}', response, re.DOTALL)
            if match:
                return json.loads(match.group(0))
            return {"narrative": response, "bullets": [], "modality_tags_used": []}

    def anchor_pass(self, selected_chunks: list[dict]) -> tuple[list[dict], dict]:
        anchors, breakdown = [], {}
        for c in selected_chunks:
            mod = c.get("modality", "text")
            breakdown[mod] = breakdown.get(mod, 0) + 1
            anchors.append({
                "chunk_id": c.get("id", f"chunk_{c.get('chunk_index', 0)}"),
                "modality": mod,
                "modality_label": MODALITY_LABELS.get(mod, "[Unknown]"),
                "page": c.get("page_number") or c.get("page"),
                "confidence": c.get("confidence", 1.0),
                "segment_type": c.get("segment_type", "paragraph"),
                "excerpt": (c.get("chunk_text") or c.get("text", ""))[:150] + "...",
                "source_anchor": c.get("source_anchor", {}),
            })
        return anchors, breakdown

    async def run(
        self,
        chunks: list[dict],
        mode: str = "medium",
        focus: str = "all",
        fmt: str = "hybrid",
        query: str | None = None,
    ) -> SummarizationResult:
        selected = self.extractive_pass(chunks, mode, focus)
        llm_result = await self.abstractive_pass(selected, mode, fmt, query)
        anchors, breakdown = self.anchor_pass(selected)
        return SummarizationResult(
            narrative=llm_result.get("narrative", ""),
            bullets=llm_result.get("bullets", []),
            anchors=anchors,
            breakdown=breakdown,
            modality_tags=llm_result.get("modality_tags_used", []),
        )
