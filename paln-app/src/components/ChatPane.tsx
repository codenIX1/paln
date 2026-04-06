"use client";

import { useState, useRef, useEffect } from "react";
import { Send, MessageSquare, FileSearch, MoreHorizontal, Trash2, Copy } from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "ai";
  title?: string;
  content: string;
  extractive_summary?: string[];
  citations?: { id: string; label: string; sourceName: string; content: string; page?: number; relevance: number }[];
  follow_ups?: string[];
  isTruncated?: boolean;
}

interface ChatPaneProps {
  messages: ChatMessage[];
  inputValue: string;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  onStopGeneration?: () => void;
  onCitationClick: (citation: { id: string; label: string; sourceName: string; content: string; page?: number; relevance: number }) => void;
  onFollowUpClick?: (messageId: string, originalQuestion: string, followUpText: string) => void;
  onClearChat?: () => void;
  isLoading?: boolean;
}

export function ChatPane({
  messages,
  inputValue,
  onInputChange,
  onSendMessage,
  onStopGeneration,
  onCitationClick,
  onFollowUpClick,
  onClearChat,
  isLoading = false,
}: ChatPaneProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showMenu, setShowMenu] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendOrStop = () => {
    if (isLoading && onStopGeneration) {
      onStopGeneration();
    } else {
      onSendMessage();
    }
  };

  const formatTime = () => {
    return new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white relative">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-white shrink-0 z-10 flex justify-between items-center">
        <h2 className="text-sm font-medium text-gray-500 flex items-center gap-2">
          <MessageSquare className="w-4 h-4" /> 
          <span className="text-xs text-gray-400">Chat</span>
        </h2>
        <div className="relative">
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <MoreHorizontal className="w-4 h-4 text-gray-400" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
              <button 
                onClick={() => { if (onClearChat) onClearChat(); setShowMenu(false); }}
                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 transition-colors rounded-t-lg"
              >
                <Trash2 className="w-3 h-3" />
                Clear Chat
              </button>
              <button 
                onClick={() => { 
                  const allText = messages.map(m => `${m.role === 'user' ? 'You' : 'AI'}: ${m.content}`).join('\n\n');
                  navigator.clipboard.writeText(allText);
                  setShowMenu(false); 
                }}
                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 transition-colors rounded-b-lg"
              >
                <Copy className="w-3 h-3" />
                Copy All
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scroll-smooth"
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400 text-sm">Upload a document to get started</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "user" ? (
                <div className="max-w-[75%] bg-gray-100 px-4 py-3 rounded-2xl rounded-tr-none">
                  <p className="text-sm text-gray-800">{msg.content}</p>
                  <div className="mt-2 flex items-center justify-end">
                    <span className="text-[10px] text-gray-400">{formatTime()}</span>
                  </div>
                </div>
              ) : (
                <div className="max-w-[85%] bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-gray-800 font-medium text-base">
                      {msg.title || "AI Response"}
                    </h3>
                    <span className="bg-gray-100 px-2 py-0.5 rounded text-xs text-gray-500">AI</span>
                  </div>
                  
                  <div className="p-5 space-y-5">
                    <p className="text-gray-700 text-sm leading-relaxed">
                      {msg.content}
                    </p>
                    
                    {msg.extractive_summary && msg.extractive_summary.length > 0 && (
                      <div className="bg-gray-50 border border-gray-100 rounded-lg p-4">
                        <h4 className="text-xs font-medium text-gray-500 uppercase mb-3">Key Points</h4>
                        <ul className="space-y-2">
                          {msg.extractive_summary.map((point, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                              <span className="text-gray-400 mt-0.5">•</span>
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {msg.isTruncated && (
                      <div className="pt-2">
                        <p className="text-xs text-amber-600">Response truncated</p>
                      </div>
                    )}
                    
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                        {msg.citations.map((cite, i) => (
                          <button
                            key={i}
                            onClick={() => onCitationClick(cite)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors rounded-md"
                          >
                            <FileSearch className="w-3 h-3" />
                            {cite.label}
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {msg.follow_ups && msg.follow_ups.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {msg.follow_ups.slice(0, 3).map((followUp, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              const prevUserMsg = messages
                                .filter(m => m.role === "user" && messages.indexOf(m) < messages.indexOf(msg))
                                .pop();
                              if (onFollowUpClick && prevUserMsg) {
                                onFollowUpClick(msg.id, prevUserMsg.content, followUp);
                              }
                              onInputChange(followUp);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors rounded-full"
                          >
                            {followUp}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[85%] bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-gray-600 text-sm">Generating...</h3>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-sm">Thinking</span>
                  <span className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="px-4 py-3 bg-white border-t border-gray-200 shrink-0 z-10">
        <div className="relative max-w-3xl mx-auto">
          <textarea
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && !isLoading && onSendMessage()}
            placeholder="Ask something..."
            disabled={isLoading}
            rows={1}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 pr-24 focus:ring-2 focus:ring-gray-300 focus:border-gray-300 resize-none text-sm"
          />
          <div className="absolute right-3 bottom-2.5 flex items-center gap-2">
            <button
              onClick={handleSendOrStop}
              disabled={!inputValue.trim() && !isLoading}
              className={`p-2 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 ${
                isLoading 
                  ? "bg-gray-600 text-white" 
                  : "bg-gray-800 text-white hover:bg-gray-700"
              }`}
            >
              {isLoading ? (
                <span className="text-sm">Stop</span>
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-1.5 bg-gray-50 border-t border-gray-100 shrink-0 z-10 flex justify-between items-center">
        <span className="text-[10px] text-gray-400">PALN v1.0</span>
        <span className="text-[10px] text-gray-400">Powered by Ollama</span>
      </div>
    </div>
  );
}
