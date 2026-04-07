"use client";

import { useState } from "react";
import { Upload, FileText, X, Link as LinkIcon, Image, Video, Plus, MessageSquare, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  onAddSource: (_source: Source) => void;
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
    <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-border/50 flex flex-col bg-background/50 backdrop-blur-sm">
      {/* Session Title - Editable */}
      <div className="p-3 border-b border-border/50 bg-muted/10">
        {isEditingTitle ? (
          <div className="flex items-center gap-2">
            <Input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleTitleSubmit()}
              className="flex-1 text-sm"
              autoFocus
            />
            <Button
              onClick={handleTitleSubmit}
              size="sm"
              variant="outline"
            >
              <Check className="w-3 h-3" />
            </Button>
          </div>
        ) : (
          <div 
            onClick={() => { setEditedTitle(sessionTitle); setIsEditingTitle(true); }}
            className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 -m-2 rounded-md transition-colors"
          >
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
            <span className="flex-1 text-sm font-medium truncate">{sessionTitle}</span>
          </div>
        )}
      </div>

      <div className="p-3 border-b border-border/50 flex justify-between items-center bg-muted/5">
        <h2 className="font-bold text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
          <FileText className="w-4 h-4" /> Sources
        </h2>
        <Button 
          onClick={() => setShowUploadPanel(!showUploadPanel)} 
          size="sm"
          variant="ghost"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {showUploadPanel && (
        <div className="p-3 border-b border-border/50 bg-background/50 space-y-3">
          <label className="block cursor-pointer">
            <input type="file" multiple className="hidden" onChange={onFileUpload} accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif,.mp4,.mov" />
            <div className="border-2 border-dashed border-primary/20 p-4 text-center hover:bg-primary/5 hover:border-primary/40 transition-all rounded-xl cursor-pointer group">
              <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
              <span className="text-sm font-medium">Upload files</span>
            </div>
          </label>
          <div className="space-y-2">
            <Input
              type="text"
              value={textTitle}
              onChange={(e) => setTextTitle(e.target.value)}
              placeholder="Title (optional)"
              className="text-sm"
            />
            <Textarea
              value={uploadedText}
              onChange={(e) => setUploadedText(e.target.value)}
              placeholder="Paste text..."
              className="text-sm resize-none"
              rows={3}
            />
            <Button 
              onClick={handleTextSubmit} 
              disabled={!uploadedText.trim() || isProcessingText}
              className="w-full"
              size="sm"
            >
              {isProcessingText ? "Processing..." : "Add text"}
            </Button>
          </div>
          <form onSubmit={handleLinkSubmit} className="flex gap-2">
            <Input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com"
              className="flex-1 text-sm"
            />
            <Button 
              type="submit" 
              disabled={!linkUrl || isProcessingLink}
              size="sm"
            >
              {isProcessingLink ? "..." : "Add"}
            </Button>
          </form>
          {isUploading && (
            <div className="text-sm text-center py-2 bg-muted/50 rounded-md">
              Uploading...
            </div>
          )}
        </div>
      )}

      <ScrollArea className="flex-1 p-2">
        {sources.length > 0 && (
          <div className="flex gap-2 text-xs mb-2">
            <Button 
              onClick={onSelectAllSources}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              Select all
            </Button>
            <Button 
              onClick={onClearSelection}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              Clear
            </Button>
          </div>
        )}
        
        {sources.length === 0 ? (
          <p className="text-sm text-muted-foreground p-2">No sources yet</p>
        ) : (
          <div className="space-y-1">
            {sources.map((source) => (
              <div 
                key={source.id} 
                onClick={() => onToggleSource(source.id)}
                className={`flex items-center gap-2 p-2.5 rounded-xl group transition-all cursor-pointer ${
                  selectedSourceIds.includes(source.id) 
                    ? "bg-primary/10 border border-primary/30 shadow-sm" 
                    : "bg-muted/20 hover:bg-muted/40 border border-transparent"
                }`}
              >
                <input 
                  type="checkbox" 
                  checked={selectedSourceIds.includes(source.id)}
                  onChange={() => onToggleSource(source.id)}
                  className="w-4 h-4 rounded"
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="text-muted-foreground">{getSourceIcon(source.type)}</span>
                <span className="flex-1 text-sm truncate">{source.name}</span>
                <Button 
                  onClick={(e) => { e.stopPropagation(); onRemoveSource(source.id); }} 
                  size="sm"
                  variant="ghost"
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
        
        {selectedSourceIds.length > 0 && (
          <div className="text-sm text-center py-2 mt-2">
            <Badge variant="secondary">
              {selectedSourceIds.length} source(s) selected
            </Badge>
          </div>
        )}
      </ScrollArea>
    </aside>
  );
}
