"use client";

import { useState } from "react";
import { Upload, FileText, X, Link as LinkIcon, Image, Video, Plus, MessageSquare, Check } from "lucide-react";
import { NeoButton } from "./NeoButton";

interface Source {
  id: string;
  name: string;
  type: "file" | "image" | "text" | "link" | "video";
}

interface SidebarProps {
  sources: Source[];
  selectedSourceIds: string[];
  sessionTitle: string;
  onSessionTitleChange: (title: string) => void;
  onAddSource: (source: Source) => void;
  onRemoveSource: (id: string) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUploadText: (title: string, content: string) => Promise<void>;
  onUploadLink: (url: string) => Promise<void>;
  onToggleSource: (id: string) => void;
  onSelectAllSources: () => void;
  onClearSelection: () => void;
  isUploading: boolean;
}

export function Sidebar({ 
  sources, 
  selectedSourceIds,
  sessionTitle,
  onSessionTitleChange,
  onAddSource, 
  onRemoveSource, 
  onFileUpload, 
  onUploadText, 
  onUploadLink,
  onToggleSource,
  onSelectAllSources,
  onClearSelection,
  isUploading 
}: SidebarProps) {
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const [uploadedText, setUploadedText] = useState("");
  const [textTitle, setTextTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [isProcessingText, setIsProcessingText] = useState(false);
  const [isProcessingLink, setIsProcessingLink] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(sessionTitle);

  // Update editedTitle when sessionTitle changes from outside
  useState(() => {
    setEditedTitle(sessionTitle);
  });

  const handleTextSubmit = async () => {
    if (!uploadedText.trim()) return;
    const title = textTitle.trim() || `Text ${sources.length + 1}`;
    setIsProcessingText(true);
    await onUploadText(title, uploadedText);
    setUploadedText("");
    setTextTitle("");
    setIsProcessingText(false);
  };

  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkUrl) return;
    setIsProcessingLink(true);
    await onUploadLink(linkUrl);
    setLinkUrl("");
    setIsProcessingLink(false);
  };

  const getSourceIcon = (type: Source["type"]) => {
    switch (type) {
      case "file": return <FileText className="w-4 h-4" />;
      case "image": return <Image className="w-4 h-4" />;
      case "video": return <Video className="w-4 h-4" />;
      case "link": return <LinkIcon className="w-4 h-4" />;
      case "text": return <FileText className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const handleTitleSubmit = () => {
    if (editedTitle.trim() && editedTitle !== sessionTitle) {
      onSessionTitleChange(editedTitle.trim());
    }
    setIsEditingTitle(false);
  };

  return (
    <aside className="w-full md:w-56 border-b-4 md:border-b-0 md:border-r-4 border-neo-black flex flex-col">
      {/* Session Title - Editable */}
      <div className="p-3 border-b-2 border-neo-black bg-neo-yellow">
        {isEditingTitle ? (
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleTitleSubmit()}
              className="flex-1 text-xs font-bold p-1 border-2 border-neo-black focus:outline-none"
              autoFocus
            />
            <button
              onClick={handleTitleSubmit}
              className="p-1 bg-neo-black text-neo-white border-2 border-neo-black hover:bg-neo-green"
            >
              <Check className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div 
            onClick={() => { setEditedTitle(sessionTitle); setIsEditingTitle(true); }}
            className="flex items-center gap-2 cursor-pointer hover:bg-neo-black/10 p-1 -m-1 rounded transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            <span className="flex-1 text-xs font-bold truncate">{sessionTitle}</span>
          </div>
        )}
      </div>

      <div className="p-2 border-b-2 border-neo-black bg-neo-pink text-neo-white flex justify-between items-center">
        <h2 className="font-black text-sm flex items-center gap-1.5">
          <FileText className="w-4 h-4" /> SOURCES
        </h2>
        <button onClick={() => setShowUploadPanel(!showUploadPanel)} className="p-1 hover:bg-neo-black/20 rounded transition-colors">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {showUploadPanel && (
        <div className="p-3 border-b-2 border-neo-black bg-neo-white space-y-2">
          <label className="block cursor-pointer">
            <input type="file" multiple className="hidden" onChange={onFileUpload} accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif,.mp4,.mov" />
            <div className="border-2 border-dashed border-neo-black p-3 text-center hover:bg-neo-yellow transition-colors">
              <Upload className="w-5 h-5 mx-auto mb-1" />
              <span className="text-xs font-bold">UPLOAD</span>
            </div>
          </label>
          <div className="border-2 border-neo-black p-2 space-y-2">
            <input
              type="text"
              value={textTitle}
              onChange={(e) => setTextTitle(e.target.value)}
              placeholder="Title (optional)"
              className="w-full text-xs p-1 border border-neo-black focus:outline-none"
            />
            <textarea
              value={uploadedText}
              onChange={(e) => setUploadedText(e.target.value)}
              placeholder="Paste text..."
              className="w-full text-xs p-1 resize-none border-none focus:outline-none"
              rows={2}
            />
            <button 
              onClick={handleTextSubmit} 
              disabled={!uploadedText.trim() || isProcessingText}
              className="w-full py-1 bg-neo-black text-neo-white text-xs font-bold hover:bg-neo-yellow hover:text-neo-black transition-colors disabled:opacity-50"
            >
              {isProcessingText ? "PROCESSING..." : "ADD TEXT"}
            </button>
          </div>
          <form onSubmit={handleLinkSubmit} className="flex gap-1">
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="URL"
              className="flex-1 text-xs p-1.5 border-2 border-neo-black focus:outline-none"
            />
            <button 
              type="submit" 
              disabled={!linkUrl || isProcessingLink}
              className="px-2 py-1 bg-neo-blue text-neo-white text-xs font-bold border-2 border-neo-black hover:bg-neo-yellow hover:text-neo-black transition-colors disabled:opacity-50"
            >
              {isProcessingLink ? "..." : "+"}
            </button>
          </form>
          {isUploading && <div className="text-xs font-bold text-center py-1 bg-neo-pink border-2 border-neo-black">UPLOADING...</div>}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {sources.length > 0 && (
          <div className="flex gap-1 text-xs">
            <button 
              onClick={onSelectAllSources}
              className="flex-1 py-1 border border-neo-black hover:bg-neo-black hover:text-neo-white transition-colors font-bold"
            >
              ALL
            </button>
            <button 
              onClick={onClearSelection}
              className="flex-1 py-1 border border-neo-black hover:bg-neo-black hover:text-neo-white transition-colors font-bold"
            >
              CLEAR
            </button>
          </div>
        )}
        
        {sources.length === 0 ? (
          <p className="text-xs font-medium text-neo-black/50 p-2">No sources yet</p>
        ) : (
          sources.map((source) => (
            <div 
              key={source.id} 
              onClick={() => onToggleSource(source.id)}
              className={`flex items-center gap-2 p-2 border-2 border-neo-black group hover:bg-neo-pink hover:text-neo-white transition-colors cursor-pointer ${
                selectedSourceIds.includes(source.id) ? "bg-neo-blue text-neo-white" : "bg-neo-yellow"
              }`}
            >
              <input 
                type="checkbox" 
                checked={selectedSourceIds.includes(source.id)}
                onChange={() => onToggleSource(source.id)}
                className="w-4 h-4"
                onClick={(e) => e.stopPropagation()}
              />
              <span>{getSourceIcon(source.type)}</span>
              <span className="flex-1 text-xs font-bold truncate">{source.name}</span>
              <button 
                onClick={(e) => { e.stopPropagation(); onRemoveSource(source.id); }} 
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))
        )}
        
        {selectedSourceIds.length > 0 && (
          <div className="text-xs font-bold text-center py-1 bg-neo-green text-neo-black border-2 border-neo-black">
            {selectedSourceIds.length} source(s) selected
          </div>
        )}
      </div>
    </aside>
  );
}