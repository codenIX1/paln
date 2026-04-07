"use client";

import { useState, useRef, useEffect } from "react";
import { X, Upload, FileText, Link as LinkIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/dialog";

interface Source {
  id: string;
  name: string;
  type: "file" | "image" | "text" | "link" | "video";
}

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (sources: Source[]) => void;
}

export function UploadModal({ isOpen, onClose, onUpload }: UploadModalProps) {
  const [activeTab, setActiveTab] = useState<"file" | "text" | "link">("file");
  const [textContent, setTextContent] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles((prev) => [...prev, ...droppedFiles]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...selectedFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const getFileType = (file: File): Source["type"] => {
    if (file.type.startsWith("image/")) return "image";
    if (file.type.startsWith("video/")) return "video";
    return "file";
  };

  const handleSubmit = () => {
    setIsUploading(true);

    const newSources: Source[] = [];

    files.forEach((file) => {
      newSources.push({
        id: `${Date.now()}-${Math.random()}`,
        name: file.name,
        type: getFileType(file),
      });
    });

    if (textContent.trim()) {
      newSources.push({
        id: `${Date.now()}-text`,
        name: `Text input ${newSources.length + 1}`,
        type: "text",
      });
    }

    if (linkUrl.trim()) {
      try {
        newSources.push({
          id: `${Date.now()}-link`,
          name: new URL(linkUrl).hostname,
          type: "link",
        });
      } catch {
        // Invalid URL, skip
      }
    }

    setTimeout(() => {
      setIsUploading(false);
      onUpload(newSources);
      onClose();
      setFiles([]);
      setTextContent("");
      setLinkUrl("");
    }, 800);
  };

  const canSubmit = files.length > 0 || textContent.trim() || linkUrl.trim();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogHeader>
        <DialogTitle>Upload Sources</DialogTitle>
      </DialogHeader>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "file" | "text" | "link")}>
        <TabsList className="w-full">
          <TabsTrigger value="file" className="flex-1">
            <Upload className="w-4 h-4 mr-2" />
            File
          </TabsTrigger>
          <TabsTrigger value="text" className="flex-1">
            <FileText className="w-4 h-4 mr-2" />
            Text
          </TabsTrigger>
          <TabsTrigger value="link" className="flex-1">
            <LinkIcon className="w-4 h-4 mr-2" />
            Link
          </TabsTrigger>
        </TabsList>

        <DialogContent>
          <TabsContent value="file">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
                isDragging
                  ? "bg-muted border-primary"
                  : "hover:bg-muted/50"
              }`}
            >
              <Upload className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="font-medium mb-1">
                Drop files here
              </p>
              <p className="text-sm text-muted-foreground">
                or click to browse
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                PDF, DOC, TXT, PNG, JPG, MP4, MOV
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif,.mp4,.mov"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {files.length > 0 && (
              <div className="mt-4 space-y-2 max-h-40 overflow-y-auto">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-muted rounded-md"
                  >
                    <span className="text-sm truncate flex-1">
                      {file.name}
                    </span>
                    <Button
                      onClick={() => removeFile(index)}
                      variant="ghost"
                      size="sm"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="text">
            <div className="space-y-2">
              <label className="text-sm font-medium">Paste your text</label>
              <Textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Paste text content here..."
                className="h-48 resize-none"
              />
            </div>
          </TabsContent>

          <TabsContent value="link">
            <div className="space-y-2">
              <label className="text-sm font-medium">Enter URL</label>
              <Input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
              />
              <p className="text-xs text-muted-foreground">
                Supported: webpages, articles, documents
              </p>
            </div>
          </TabsContent>
        </DialogContent>
      </Tabs>

      <DialogFooter>
        <Button
          onClick={onClose}
          variant="outline"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit || isUploading}
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Uploading...
            </>
          ) : (
            "Start Analyzing"
          )}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
