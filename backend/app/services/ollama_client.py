"""Ollama client for embeddings and chat."""

import hashlib
import json
from collections import OrderedDict
from typing import Optional
import httpx

from app.config import get_settings


class OllamaError(Exception):
    """Custom exception for Ollama errors."""
    pass


class OllamaClient:
    """Client for Ollama API."""

    def __init__(self):
        settings = get_settings()
        self.base_url = settings.ollama_base_url
        self.embed_model = settings.ollama_embed_model
        self.chat_model = settings.ollama_chat_model
        self.system_prompt = settings.generation_system_prompt
        self._http_client: Optional[httpx.AsyncClient] = None
        self._embedding_cache: OrderedDict[str, list[float]] = OrderedDict()
        self._CACHE_MAX = 500

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create shared HTTP client."""
        if self._http_client is None:
            self._http_client = httpx.AsyncClient(
                timeout=httpx.Timeout(120.0, connect=30.0),
                limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
            )
        return self._http_client

    async def close(self) -> None:
        """Close the HTTP client."""
        if self._http_client is not None:
            await self._http_client.aclose()
            self._http_client = None

    async def get_embedding(self, text: str, model: Optional[str] = None) -> list[float]:
        """Get embedding for text using Ollama.
        
        Args:
            text: Text to embed
            model: Optional specific embedding model (defaults to config)
        """
        embed_model = model or self.embed_model
        
        try:
            client = await self._get_client()
            response = await client.post(
                f"{self.base_url}/api/embeddings",
                json={
                    "model": embed_model,
                    "prompt": text,
                },
            )
            response.raise_for_status()
            data = response.json()
            return data["embedding"]
        except httpx.HTTPStatusError as e:
            raise OllamaError(f"Ollama embedding failed: {e.response.status_code}. Is Ollama running with model '{embed_model}'?")
        except httpx.RequestError as e:
            raise OllamaError(f"Cannot connect to Ollama: {e}. Is Ollama running at {self.base_url}?")

    async def get_embedding_cached(self, text: str, model: Optional[str] = None) -> list[float]:
        """Cached embedding — instant on repeated queries."""
        cache_key = hashlib.md5(f"{model or self.embed_model}:{text}".encode()).hexdigest()
        
        if cache_key in self._embedding_cache:
            # Move to end (most recently used)
            self._embedding_cache.move_to_end(cache_key)
            return self._embedding_cache[cache_key]

        embedding = await self.get_embedding(text, model)
        self._embedding_cache[cache_key] = embedding

        if len(self._embedding_cache) > self._CACHE_MAX:
            # Remove oldest (first item)
            self._embedding_cache.popitem(last=False)

        return embedding

    async def chat(
        self,
        messages: list[dict],
        system_prompt: Optional[str] = None,
    ) -> str:
        """Get chat completion from Ollama."""
        try:
            client = await self._get_client()
            payload = {
                "model": self.chat_model,
                "messages": messages,
                "stream": False,
            }
            
            if system_prompt:
                payload["system"] = system_prompt
            
            response = await client.post(
                f"{self.base_url}/api/chat",
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
            return data["message"]["content"]
        except httpx.HTTPStatusError as e:
            raise OllamaError(f"Ollama chat failed: {e.response.status_code}. Is Ollama running with model '{self.chat_model}'?")
        except httpx.RequestError as e:
            raise OllamaError(f"Cannot connect to Ollama: {e}. Is Ollama running at {self.base_url}?")

    async def describe_image(self, image_base64: str, prompt: Optional[str] = None) -> str:
        """Generate natural language description for an image using vision model.
        
        Args:
            image_base64: Base64 encoded image
            prompt: Optional custom prompt (defaults to describing the image)
            
        Returns:
            Natural language description of the image
        """
        settings = get_settings()
        vision_model = settings.ollama_vision_model
        
        default_prompt = "Describe this image in detail. Include any text you see, objects, people, colors, layout, and context. Be thorough and specific."
        
        try:
            client = await self._get_client()
            payload = {
                "model": vision_model,
                "messages": [
                    {
                        "role": "user",
                        "content": prompt or default_prompt,
                        "images": [image_base64],
                    }
                ],
                "stream": False,
            }
            
            response = await client.post(
                f"{self.base_url}/api/chat",
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
            return data["message"]["content"]
        except httpx.HTTPStatusError as e:
            raise OllamaError(f"Vision model failed: {e.response.status_code}. Is Ollama running with model '{vision_model}'? Run 'ollama pull {vision_model}'")
        except httpx.RequestError as e:
            raise OllamaError(f"Cannot connect to Ollama: {e}. Is Ollama running at {self.base_url}?")

    async def is_vision_model_available(self) -> bool:
        """Check if vision model is available in Ollama."""
        try:
            client = await self._get_client()
            response = await client.get(
                f"{self.base_url}/api/tags",
                timeout=10.0,
            )
            if response.status_code == 200:
                models = response.json().get("models", [])
                model_names = [m["name"] for m in models]
                settings = get_settings()
                return settings.ollama_vision_model in model_names
            return False
        except Exception:
            return False

    async def chat_stream(
        self,
        messages: list[dict],
        system_prompt: Optional[str] = None,
    ):
        """Stream chat tokens as they arrive via SSE. Yields OpenAI-compatible format."""
        client = await self._get_client()
        payload = {
            "model": self.chat_model,
            "messages": messages,
            "stream": True,
        }
        if system_prompt:
            payload["system"] = system_prompt

        async with client.stream("POST", f"{self.base_url}/api/chat", json=payload) as resp:
            async for line in resp.aiter_lines():
                if line:
                    try:
                        data = json.loads(line)
                    except json.JSONDecodeError:
                        continue
                    
                    token = data.get("message", {}).get("content", "")
                    done = data.get("done", False)
                    
                    if token or done:
                        yield {"content": token, "done": done}

    async def chat_with_context(
        self,
        user_message: str,
        context_chunks: list[dict],
        chat_history: list[dict] | None = None,
        system_prompt: Optional[str] = None,
    ) -> str:
        """Chat with context from retrieved document chunks."""
        context_text = "\n\n".join(
            f"[Source {i+1}]: {chunk['chunk_text']}"
            for i, chunk in enumerate(context_chunks)
        )
        
        messages = [
            {
                "role": "system",
                "content": system_prompt or self.system_prompt,
            },
        ]
        
        if chat_history:
            for msg in chat_history:
                if msg["role"] in ("user", "assistant"):
                    messages.append({
                        "role": msg["role"],
                        "content": msg["content"],
                    })
        
        messages.append({
            "role": "user",
            "content": f"Context:\n{context_text}\n\nQuestion: {user_message}",
        })
        
        return await self.chat(messages)

    async def generate_chat_response(
        self,
        question: str,
        context_chunks: list[dict],
        chat_history: list[dict] | None = None,
    ) -> dict:
        """Generate structured chat response with title, extractive summary, and follow-ups.
        
        Returns:
            dict with keys: title, answer, extractive_summary, follow_ups
        """
        if not context_chunks:
            return {
                "title": "No Context",
                "answer": "I couldn't find any relevant context to answer your question. Please upload some documents first.",
                "extractive_summary": [],
                "follow_ups": []
            }
        
        context_text = "\n\n".join([
            f"[Chunk {i+1}]: {chunk.get('chunk_text', '')}"
            for i, chunk in enumerate(context_chunks)
        ])
        
        structured_prompt = f"""Based ONLY on the provided context, answer the user's question and generate additional metadata.

CONTEXT:
{context_text}

USER QUESTION: {question}

OUTPUT FORMAT (STRICT JSON - no other text):
{{
  "title": "A highly creative, catchy, 2-5 word title summarizing your response (e.g., 'The Quantum Leap', 'Data Goldmine', 'Key Breakthroughs')",
  "answer": "Your detailed answer based ONLY on the context (2-3 sentences)",
  "extractive_summary": [
    "8-10 bullet points that are elaborative and detailed",
    "Each point should capture a distinct key idea from the text",
    "Include specific data, facts, examples when available",
    "Do not paraphrase heavily - use direct excerpts when possible",
    "Make each point informative with context and details"
  ],
  "follow_ups": ["3 specific follow-up questions that deepen understanding"]
}}

CONSTRAINTS:
- Do NOT hallucinate or add external knowledge
- Use ONLY information from the provided context
- Keep extractive_summary detailed (8-10 points)
- Make follow-up questions conversational and specific
- If no relevant context, return empty arrays for summary and follow-ups

Output valid JSON only:"""

        try:
            response = await self.chat(
                messages=[{"role": "user", "content": structured_prompt}],
            )
            
            import json
            import re
            
            try:
                result = json.loads(response)
            except json.JSONDecodeError:
                match = re.search(r'```json\s*(.*?)\s*```', response, re.DOTALL)
                if match:
                    result = json.loads(match.group(1))
                else:
                    match = re.search(r'\{.*\}', response, re.DOTALL)
                    if match:
                        result = json.loads(match.group(0))
                    else:
                        result = {
                            "title": "Chat Response",
                            "answer": response,
                            "extractive_summary": [],
                            "follow_ups": []
                        }
            
            return {
                "title": result.get("title", "Chat Response"),
                "answer": result.get("answer", response),
                "extractive_summary": result.get("extractive_summary", []),
                "follow_ups": result.get("follow_ups", []),
            }
            
        except Exception as e:
            return {
                "title": "Error",
                "answer": f"Failed to generate response: {str(e)}",
                "extractive_summary": [],
                "follow_ups": []
            }

    async def is_model_available(self) -> bool:
        """Check if Ollama is running and models are available."""
        try:
            client = await self._get_client()
            response = await client.get(
                f"{self.base_url}/api/tags",
                timeout=10.0,
            )
            if response.status_code == 200:
                models = response.json().get("models", [])
                model_names = [m["name"] for m in models]
                return self.embed_model in model_names and self.chat_model in model_names
            return False
        except Exception:
            return False


ollama_client = OllamaClient()
