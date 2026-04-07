"use client";

import { useState } from "react";
import { FileText, FileImage, Database, FileSearch, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface RetrievedChunk {
  id: string;
  title: string;
  sourceName: string;
  content: string;
  page?: number;
  relevance: number;
  type: "text" | "image" | "metadata";
}

interface Source {
  id: string;
  name: string;
  type: "file" | "image" | "text" | "link" | "video";
}

interface ContextViewerProps {
  selectedSource: RetrievedChunk | null;
  onSelectSource: (chunk: RetrievedChunk) => void;
  sources: Source[];
  retrievedChunks: RetrievedChunk[];
  onOpenSummaryModal?: () => void;
}

export function ContextViewer({ selectedSource, onSelectSource, sources, retrievedChunks, onOpenSummaryModal }: ContextViewerProps) {
  const [activeTab, setActiveTab] = useState<"text" | "images" | "metadata">("text");

  const getSourceIcon = (type: Source["type"]) => {
    switch (type) {
      case "file": return <FileText className="w-4 h-4" />;
      case "image": return <FileImage className="w-4 h-4" />;
      case "text": return <FileText className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="w-full md:w-[350px] lg:w-[280px] flex flex-col bg-background border-l h-full">
      {/* Workspace Info Header */}
      <div className="bg-muted/30 border-b p-4 relative overflow-hidden shrink-0">
        <div className="absolute top-0 right-0 p-2 opacity-5">
          <FileSearch className="w-12 h-12" />
        </div>
        <h2 className="font-medium text-sm mb-0.5 text-foreground">Studio Workspace</h2>
        <p className="text-[10px] uppercase font-medium text-muted-foreground tracking-widest mb-3">PALN V1</p>
        
        {/* Confidence Score */}
        <div className="space-y-3 mb-4 group">
          <div className="flex items-center justify-between text-[10px]">
            <span className="font-medium uppercase text-muted-foreground transition-colors group-hover:text-foreground">Confidence</span>
            <span className="font-medium text-primary">98.4%</span>
          </div>
          <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden shadow-inner">
            <div className="bg-primary h-full w-[98%] transition-all duration-1000 ease-out relative">
              <div className="absolute inset-0 bg-white/20 w-full animate-pulse"></div>
            </div>
          </div>
        </div>

        {onOpenSummaryModal && (
          <Button 
            onClick={onOpenSummaryModal} 
            className="w-full shadow-sm text-xs transition-all hover:shadow-md hover:scale-[1.02]" 
            size="sm" 
            variant="default"
          >
            <Sparkles className="w-3.5 h-3.5 mr-2 animate-pulse" /> Summarize Document
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "text" | "images" | "metadata")}>
        <TabsList className="w-full rounded-none border-b">
          <TabsTrigger value="text" className="flex-1">
            <FileText className="w-4 h-4 mr-1" />
            Text
          </TabsTrigger>
          <TabsTrigger value="images" className="flex-1">
            <FileImage className="w-4 h-4 mr-1" />
            Images
          </TabsTrigger>
          <TabsTrigger value="metadata" className="flex-1">
            <Database className="w-4 h-4 mr-1" />
            Metadata
          </TabsTrigger>
        </TabsList>

        {/* Content Area */}
        <ScrollArea className="flex-1">
          {selectedSource ? (
            <div className="p-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-sm font-medium">{selectedSource.title}</CardTitle>
                    <Badge variant="secondary">
                      {selectedSource.relevance}% Match
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground">
                    <FileSearch className="w-3 h-3" />
                    {selectedSource.sourceName}
                    {selectedSource.page && ` • Page ${selectedSource.page}`}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="p-3 bg-muted/50 border rounded-lg">
                    <p className="text-xs leading-relaxed">{selectedSource.content}</p>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button className="flex-1" size="sm">
                      View Doc
                    </Button>
                    <Button variant="outline" className="flex-1" size="sm">
                      Copy
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 animate-in fade-in zoom-in duration-300">
              <div className="p-4 bg-muted/50 rounded-full mb-4 group-hover:scale-110 transition-transform">
                <FileSearch className="w-10 h-10 text-muted-foreground/40" />
              </div>
              <h3 className="font-medium text-xs uppercase tracking-wider text-muted-foreground mb-1">No Context Focus</h3>
              <p className="text-[10px] text-muted-foreground/70 mb-6 max-w-[200px]">Select a citation fragment from the chat to inspect it closely.</p>
              
              <div className="w-full">
                <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-3 text-left px-1">Available Sources</div>
                <div className="flex flex-col gap-2">
                  {(sources || []).slice(0, 3).map((source) => (
                    <Button
                      key={source.id}
                      onClick={() => retrievedChunks?.[0] && onSelectSource(retrievedChunks[0])}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-[10px] font-medium transition-all hover:bg-muted/50 hover:translate-x-1"
                    >
                      <span className="p-1 bg-muted rounded shrink-0 mr-2">
                        {getSourceIcon(source.type)}
                      </span>
                      <span className="truncate">
                        {source.name}
                      </span>
                      <ChevronRight className="w-3 h-3 ml-auto opacity-50 block shrink-0" />
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </ScrollArea>
      </Tabs>

      {/* Utility Arsenal Section */}
      <div className="border-t p-4 bg-background">
        <h3 className="font-medium text-[10px] uppercase tracking-widest px-1 text-muted-foreground mb-3">Utility Arsenal</h3>
        
        <div className="space-y-2">
          {/* Audio Brief */}
          <Button variant="outline" className="w-full justify-start gap-3 h-auto py-3 transition-all hover:bg-muted/30 hover:border-primary/30 group">
            <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="text-lg">🎤</span>
            </div>
            <div className="text-left">
              <p className="font-medium text-xs text-foreground group-hover:text-primary transition-colors">Audio Brief</p>
              <p className="text-[8px] font-medium uppercase text-muted-foreground">Gen-2 Voice</p>
            </div>
          </Button>
          
          {/* Slide Deck */}
          <Button variant="outline" className="w-full justify-start gap-3 h-auto py-3 transition-all hover:bg-muted/30 hover:border-primary/30 group">
            <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="text-lg">📊</span>
            </div>
            <div className="text-left">
              <p className="font-medium text-xs text-foreground group-hover:text-primary transition-colors">Slide Deck</p>
              <p className="text-[8px] font-medium uppercase text-muted-foreground">Auto-Structure</p>
            </div>
          </Button>
          
          {/* Mind Map */}
          <Button variant="outline" className="w-full justify-start gap-3 h-auto py-3 transition-all hover:bg-muted/30 hover:border-primary/30 group">
            <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="text-lg">🧠</span>
            </div>
            <div className="text-left">
              <p className="font-medium text-xs text-foreground group-hover:text-primary transition-colors">Mind Map</p>
              <p className="text-[8px] font-medium uppercase text-muted-foreground">Visual Graph</p>
            </div>
          </Button>
        </div>
      </div>

      {/* Drop Files Area */}
      <div className="p-4 border-t border-dashed text-center group cursor-pointer hover:bg-muted/10 transition-colors">
        <span className="text-muted-foreground/30 text-3xl mb-1 block group-hover:-translate-y-1 transition-transform">☁️</span>
        <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors">Drop Files Here</p>
      </div>
    </div>
  );
}
