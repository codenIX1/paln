"use client";

import { useState } from "react";
import { X, FileText, Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api, SummarizeRequest, SummarizeData } from "@/lib/api";

interface SummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceIds: string[];
  token: string | undefined;
}

export function SummaryModal({ isOpen, onClose, sourceIds, token }: SummaryModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [summaryData, setSummaryData] = useState<SummarizeData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Options
  const [format, setFormat] = useState<"narrative" | "bullets" | "hybrid">("hybrid");
  const [mode, setMode] = useState<"short" | "medium" | "detailed">("medium");
  const [customTone, setCustomTone] = useState<string>("");

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!token || sourceIds.length === 0) {
      setError("No document selected or session invalid.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setSummaryData(null);

    const payload: SummarizeRequest = {
      source_ids: sourceIds,
      format,
      mode,
      focus: "all",
      query: customTone ? `Use the following tone/instructions: ${customTone}` : undefined
    };

    const result = await api.summarize.generate(payload, token);
    
    setIsGenerating(false);

    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      setSummaryData(result.data);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-md p-4 md:p-8">
      <div className="glass rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-border/30 shrinks-0 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold leading-none">Document Studio</h2>
              <p className="text-sm text-muted-foreground mt-1">Configure and generate a custom summary</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-muted">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content Container */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Left panel - Options */}
          <div className="w-full md:w-80 border-r border-border/30 p-6 flex flex-col gap-6 overflow-y-auto shrink-0">
            
            <div className="space-y-3">
              <label className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Format</label>
              <div className="grid grid-cols-1 gap-2">
                <button 
                  onClick={() => setFormat("hybrid")}
                  className={`px-4 py-3 text-sm text-left rounded-xl border transition-all ${format === "hybrid" ? "border-primary bg-primary/5 text-primary" : "bg-background hover:border-muted-foreground/30"}`}
                >
                  <span className="font-semibold block mb-1">Hybrid (Recommended)</span>
                  <span className="text-xs text-muted-foreground">Summary + key bullet points</span>
                </button>
                <button 
                  onClick={() => setFormat("narrative")}
                  className={`px-4 py-3 text-sm text-left rounded-xl border transition-all ${format === "narrative" ? "border-primary bg-primary/5 text-primary" : "bg-background hover:border-muted-foreground/30"}`}
                >
                  <span className="font-semibold block mb-1">Narrative</span>
                  <span className="text-xs text-muted-foreground">Paragraph style report</span>
                </button>
                <button 
                  onClick={() => setFormat("bullets")}
                  className={`px-4 py-3 text-sm text-left rounded-xl border transition-all ${format === "bullets" ? "border-primary bg-primary/5 text-primary" : "bg-background hover:border-muted-foreground/30"}`}
                >
                  <span className="font-semibold block mb-1">Bullets</span>
                  <span className="text-xs text-muted-foreground">Quick list of key takeaways</span>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Length</label>
              <div className="flex p-1 bg-muted rounded-xl">
                {["short", "medium", "detailed"].map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m as any)}
                    className={`flex-1 py-1.5 text-xs font-medium capitalize rounded-lg transition-colors ${mode === m ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Custom Tone / Instructions</label>
              <input 
                type="text" 
                value={customTone}
                onChange={(e) => setCustomTone(e.target.value)}
                placeholder="e.g. Formal, playful, 5th grader..."
                className="w-full px-3 py-2 bg-background border rounded-lg text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="mt-auto pt-6 border-t">
              <Button 
                onClick={handleGenerate} 
                disabled={isGenerating || sourceIds.length === 0} 
                className="w-full py-6 text-base rounded-xl"
              >
                {isGenerating ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-transparent border-t-foreground rounded-full animate-spin" /> Synthesizing...
                  </span>
                ) : "Generate Summary"}
              </Button>
              {sourceIds.length === 0 && (
                <p className="text-xs text-red-400 text-center mt-2 flex items-center justify-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Select a document first
                </p>
              )}
            </div>
          </div>

          {/* Right panel - Result */}
          <div className="flex-1 relative flex flex-col">
            {error ? (
              <div className="m-6 p-4 rounded-xl border border-destructive/20 bg-destructive/5 text-destructive flex items-center gap-3">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            ) : summaryData ? (
              <ScrollArea className="flex-1">
                <div className="p-8 max-w-3xl mx-auto space-y-8">
                  {summaryData.summary && (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-lg border-b pb-2 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" /> Overview
                      </h3>
                      <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap text-sm md:text-base">
                        {summaryData.summary}
                      </p>
                    </div>
                  )}

                  {summaryData.bullets && summaryData.bullets.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-lg border-b pb-2 mt-8">Key Insights</h3>
                      <ul className="space-y-3">
                        {summaryData.bullets.map((bullet, idx) => (
                          <li key={idx} className="flex items-start gap-3 text-sm md:text-base text-foreground/90">
                            <span className="text-primary mt-1">•</span>
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <div className="pt-8 flex justify-end">
                     <Button variant="outline" size="sm" onClick={() => {
                        const content = [summaryData.summary, ...summaryData.bullets.map(b => "• " + b)].join("\n\n");
                        navigator.clipboard.writeText(content);
                     }}>
                       Copy Full Summary
                     </Button>
                  </div>
                </div>
              </ScrollArea>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-6 text-center">
                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
                  <FileText className="w-8 h-8 opacity-50" />
                </div>
                <h3 className="text-xl font-medium text-foreground mb-2">No Summary Yet</h3>
                <p className="max-w-md">Customize your options on the left and click generate to synthesize your document.</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
