"use client";

import { useState } from "react";
import { FileText, FileImage, Database, FileSearch, ChevronRight, Maximize2 } from "lucide-react";

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
}

export function ContextViewer({ selectedSource, onSelectSource, sources, retrievedChunks }: ContextViewerProps) {
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
    <div className="w-full md:w-[350px] lg:w-[280px] flex flex-col bg-white border-l-2 border-slate-900">
      {/* Workspace Info Header */}
      <div className="bg-slate-50 border-b border-subtle-border p-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-2 opacity-5">
          <span className="material-symbols-outlined text-5xl">science</span>
        </div>
        <h2 className="font-bold text-sm mb-0.5 text-slate-700">Studio Workspace</h2>
        <p className="font-label text-[8px] uppercase font-bold text-slate-400 tracking-widest mb-3">SourceSync V1</p>
        
        {/* Confidence Score */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[10px]">
            <span className="font-label font-bold uppercase text-slate-400">CONFIDENCE</span>
            <span className="font-label font-bold text-brutal-blue">98.4%</span>
          </div>
          <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
            <div className="bg-brutal-blue h-full w-[98%]"></div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-subtle-border">
        {(["text", "images", "metadata"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 p-3 font-label font-bold text-[9px] tracking-widest uppercase border-r border-subtle-border last:border-r-0 transition-colors ${
              activeTab === tab 
                ? "bg-white text-brutal-blue border-b-2 border-b-brutal-blue" 
                : "bg-slate-50 text-slate-400 hover:bg-slate-100"
            }`}
          >
            {tab === "text" && <span className="material-symbols-outlined text-sm mr-1">description</span>}
            {tab === "images" && <span className="material-symbols-outlined text-sm mr-1">image</span>}
            {tab === "metadata" && <span className="material-symbols-outlined text-sm mr-1">info</span>}
            {tab}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        {selectedSource ? (
          <div className="p-4">
            <div className="bg-white border-2 border-slate-900 rounded-xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)]">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-sm font-bold">{selectedSource.title}</h3>
                <span className="px-2 py-1 bg-brutal-blue text-white font-label text-[8px] font-bold uppercase rounded">
                  {selectedSource.relevance}% MATCH
                </span>
              </div>
              <div className="flex items-center gap-2 mb-3 text-[10px] font-medium text-slate-400">
                <span className="material-symbols-outlined text-sm">source</span>
                {selectedSource.sourceName}
                {selectedSource.page && ` • Page ${selectedSource.page}`}
              </div>
              <div className="p-3 bg-soft-gray border border-subtle-border rounded-lg">
                <p className="text-xs leading-relaxed">{selectedSource.content}</p>
              </div>
              <div className="mt-3 flex gap-2">
                <button className="flex-1 py-2 bg-brutal-blue text-white font-label text-[10px] font-bold uppercase rounded-lg border border-slate-900 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-shadow">
                  VIEW DOC
                </button>
                <button className="flex-1 py-2 bg-white text-slate-700 font-label text-[10px] font-bold uppercase rounded-lg border border-slate-900 hover:bg-slate-50 transition-colors">
                  COPY
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-6">
            <span className="material-symbols-outlined text-4xl text-slate-200 mb-2">find_in_page</span>
            <h3 className="font-label font-black text-xs uppercase text-slate-400 mb-1">No Source Selected</h3>
            <p className="text-[10px] text-slate-400 mb-4">Select a citation or source</p>
            <div className="flex flex-wrap justify-center gap-2">
              {sources.slice(0, 3).map((source) => (
                <button
                  key={source.id}
                  onClick={() => retrievedChunks[0] && onSelectSource(retrievedChunks[0])}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-subtle-border bg-white hover:bg-brutal-yellow/10 font-label text-[9px] font-bold uppercase transition-colors rounded"
                >
                  {getSourceIcon(source.type)}
                  {source.name.length > 12 ? source.name.slice(0, 12) + "..." : source.name}
                  <ChevronRight className="w-3 h-3" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Utility Arsenal Section */}
      <div className="border-t-2 border-slate-900 p-4 bg-white">
        <h3 className="font-label font-black text-[9px] uppercase tracking-widest px-1 text-slate-400 mb-3">UTILITY ARSENAL</h3>
        
        <div className="space-y-2">
          {/* Audio Brief */}
          <button className="w-full group bg-white border border-subtle-border p-3 rounded-lg flex items-center gap-3 hover:bg-slate-50 transition-all text-left">
            <div className="w-8 h-8 rounded-md bg-slate-50 flex items-center justify-center border border-subtle-border group-hover:bg-brutal-yellow/10 transition-colors">
              <span className="material-symbols-outlined text-lg">mic</span>
            </div>
            <div>
              <p className="font-bold text-xs text-slate-700">Audio Brief</p>
              <p className="text-[8px] font-label font-bold uppercase text-slate-400">Gen-2 Voice</p>
            </div>
          </button>
          
          {/* Slide Deck */}
          <button className="w-full group bg-white border border-subtle-border p-3 rounded-lg flex items-center gap-3 hover:bg-slate-50 transition-all text-left">
            <div className="w-8 h-8 rounded-md bg-slate-50 flex items-center justify-center border border-subtle-border group-hover:bg-brutal-blue/10 transition-colors">
              <span className="material-symbols-outlined text-lg">slideshow</span>
            </div>
            <div>
              <p className="font-bold text-xs text-slate-700">Slide Deck</p>
              <p className="text-[8px] font-label font-bold uppercase text-slate-400">Auto-Structure</p>
            </div>
          </button>
          
          {/* Mind Map */}
          <button className="w-full group bg-white border border-subtle-border p-3 rounded-lg flex items-center gap-3 hover:bg-slate-50 transition-all text-left">
            <div className="w-8 h-8 rounded-md bg-slate-50 flex items-center justify-center border border-subtle-border group-hover:bg-slate-200 transition-colors">
              <span className="material-symbols-outlined text-lg">hub</span>
            </div>
            <div>
              <p className="font-bold text-xs text-slate-700">Mind Map</p>
              <p className="text-[8px] font-label font-bold uppercase text-slate-400">Visual Graph</p>
            </div>
          </button>
        </div>
      </div>

      {/* Drop Files Area */}
      <div className="p-4 border-t border-dashed border-slate-200 text-center">
        <span className="material-symbols-outlined text-slate-200 text-3xl mb-1">cloud_upload</span>
        <p className="font-label text-[8px] font-black uppercase text-slate-400">DROP FILES</p>
      </div>
    </div>
  );
}
