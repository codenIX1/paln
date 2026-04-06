"use client";

import { useState, useRef, useEffect } from "react";
import { X, Upload, FileText, Link as LinkIcon, Loader2 } from "lucide-react";

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

  if (!isOpen) return null;

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

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const canSubmit = files.length > 0 || textContent.trim() || linkUrl.trim();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-neo-black/50 backdrop-blur-sm"
      onClick={handleOverlayClick}
    >
      <div className="w-full max-w-lg mx-4 bg-neo-white border-4 border-neo-black shadow-neo-hover">
        <div className="flex items-center justify-between p-4 border-b-4 border-neo-black bg-neo-yellow">
          <h2 className="text-xl font-black text-neo-black">UPLOAD SOURCES</h2>
          <button
            onClick={onClose}
            className="p-1 border-2 border-neo-black bg-neo-white hover:bg-neo-pink hover:text-neo-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b-2 border-neo-black">
          {(["file", "text", "link"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 font-bold text-sm border-r-2 border-neo-black last:border-r-0 transition-colors ${
                activeTab === tab
                  ? "bg-neo-black text-neo-white"
                  : "bg-neo-white text-neo-black hover:bg-neo-yellow"
              }`}
            >
              {tab === "file" && <Upload className="w-4 h-4 inline mr-2" />}
              {tab === "text" && <FileText className="w-4 h-4 inline mr-2" />}
              {tab === "link" && <LinkIcon className="w-4 h-4 inline mr-2" />}
              {tab.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === "file" && (
            <div>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-3 border-dashed border-neo-black p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? "bg-neo-yellow border-neo-black scale-[1.02]"
                    : "bg-neo-white hover:bg-neo-yellow/50"
                }`}
              >
                <Upload className="w-12 h-12 mx-auto mb-3 text-neo-black/50" />
                <p className="font-black text-neo-black mb-1">
                  DROP FILES HERE
                </p>
                <p className="text-xs font-medium text-neo-black/60">
                  or click to browse
                </p>
                <p className="text-xs font-medium text-neo-black/40 mt-2">
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
                      className="flex items-center justify-between p-2 border-2 border-neo-black bg-neo-yellow"
                    >
                      <span className="text-sm font-bold truncate flex-1">
                        {file.name}
                      </span>
                      <button
                        onClick={() => removeFile(index)}
                        className="p-1 hover:bg-neo-pink hover:text-neo-white transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "text" && (
            <div>
              <label className="block text-sm font-bold text-neo-black mb-2">
                PASTE YOUR TEXT
              </label>
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Paste text content here..."
                className="w-full h-48 p-3 border-2 border-neo-black text-sm font-medium focus:outline-none focus:ring-2 focus:ring-neo-pink resize-none"
              />
            </div>
          )}

          {activeTab === "link" && (
            <div>
              <label className="block text-sm font-bold text-neo-black mb-2">
                ENTER URL
              </label>
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full p-3 border-2 border-neo-black text-sm font-medium focus:outline-none focus:ring-2 focus:ring-neo-pink"
              />
              <p className="text-xs font-medium text-neo-black/50 mt-2">
                Supported: webpages, articles, documents
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3 p-4 border-t-4 border-neo-black bg-neo-white">
          <button
            onClick={onClose}
            className="flex-1 py-3 border-2 border-neo-black bg-neo-white font-bold text-sm hover:bg-neo-black hover:text-neo-white transition-colors"
          >
            CANCEL
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || isUploading}
            className="flex-1 py-3 bg-neo-yellow border-2 border-neo-black font-black text-sm shadow-neo hover:shadow-neo-hover hover:translate-x-0.5 hover:translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                UPLOADING...
              </>
            ) : (
              <>START ANALYZING</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
