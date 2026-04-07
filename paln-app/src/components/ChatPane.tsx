"use client";

import { useState, useRef, useEffect } from "react";
import { Send, MessageSquare, FileSearch, MoreHorizontal, Trash2, Copy, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    <div className="flex-1 flex flex-col h-full bg-background relative">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-background shrink-0 z-10 flex justify-between items-center">
        <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <MessageSquare className="w-4 h-4" /> 
          <span className="text-xs">Chat</span>
        </h2>
        <div className="relative">
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 hover:bg-muted rounded-md transition-colors"
          >
            <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-40 bg-popover border rounded-md shadow-lg z-50">
              <button 
                onClick={() => { if (onClearChat) onClearChat(); setShowMenu(false); }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 transition-colors rounded-t-md"
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
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 transition-colors rounded-b-md"
              >
                <Copy className="w-3 h-3" />
                Copy All
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea 
        ref={containerRef}
        className="flex-1 p-4 md:p-6 space-y-6"
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground text-sm">Upload a document to get started</p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "user" ? (
                <div className="max-w-[75%] bg-muted px-4 py-3 rounded-2xl rounded-tr-none">
                  <p className="text-sm text-foreground">{msg.content}</p>
                  <div className="mt-2 flex items-center justify-end">
                    <span className="text-[10px] text-muted-foreground">{formatTime()}</span>
                  </div>
                </div>
              ) : (
                <Card className="max-w-[85%]">
                  {msg.title && !["AI Response", "Chat Response", "Error", "Generating..."].includes(msg.title) ? (
                    <CardHeader className="px-5 py-3.5 border-b flex justify-between items-center bg-muted/10">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <CardTitle className="text-sm md:text-base font-bold bg-gradient-to-r from-primary/90 to-primary/60 bg-clip-text text-transparent">
                          {msg.title}
                        </CardTitle>
                      </div>
                      <Badge variant="secondary" className="text-[10px] uppercase">AI Insight</Badge>
                    </CardHeader>
                  ) : msg.title === "Generating..." ? (
                    <CardHeader className="px-5 py-4 border-b flex justify-between items-center">
                      <CardTitle className="text-base font-medium animate-pulse text-muted-foreground">
                        {msg.title}
                      </CardTitle>
                    </CardHeader>
                  ) : null}
                  
                  <CardContent className="p-5 space-y-5">
                    {msg.content ? (
                      <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                        {msg.content}
                      </p>
                    ) : (
                      isLoading && index === messages.length - 1 ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Thinking</span>
                          <span className="flex gap-1">
                            <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </span>
                        </div>
                      ) : null
                    )}
                    
                    {msg.extractive_summary && msg.extractive_summary.length > 0 && (
                      <div className="bg-muted/50 border rounded-lg p-4">
                        <h4 className="text-xs font-medium text-muted-foreground uppercase mb-3">Key Points</h4>
                        <ul className="space-y-2">
                          {msg.extractive_summary.map((point, idx) => (
                            <li key={`${msg.id}-point-${idx}`} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <span className="text-muted-foreground mt-0.5">•</span>
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
                      <div className="flex flex-wrap gap-2 pt-2 border-t">
                        {msg.citations.map((cite) => (
                          <Button
                            key={cite.id || cite.label}
                            onClick={() => onCitationClick(cite)}
                            variant="outline"
                            size="sm"
                            className="text-xs"
                          >
                            <FileSearch className="w-3 h-3 mr-1" />
                            {cite.label}
                          </Button>
                        ))}
                      </div>
                    )}
                    
                    {msg.follow_ups && msg.follow_ups.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {msg.follow_ups.slice(0, 3).map((followUp, idx) => (
                          <Button
                            key={`${msg.id}-${idx}`}
                            onClick={() => {
                              const prevUserMsg = messages
                                .filter(m => m.role === "user" && messages.indexOf(m) < messages.indexOf(msg))
                                .pop();
                              if (onFollowUpClick && prevUserMsg) {
                                onFollowUpClick(msg.id, prevUserMsg.content, followUp);
                              }
                              onInputChange(followUp);
                            }}
                            variant="outline"
                            size="sm"
                            className="text-xs rounded-full"
                          >
                            {followUp}
                          </Button>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          ))
        )}
        
        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Input Area */}
      <div className="px-4 py-3 bg-background border-t shrink-0 z-10">
        <div className="relative max-w-3xl mx-auto">
          <Textarea
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && !isLoading && onSendMessage()}
            placeholder="Ask something..."
            disabled={isLoading}
            rows={1}
            className="pr-24 resize-none text-sm"
          />
          <div className="absolute right-3 bottom-2.5 flex items-center gap-2">
            <Button
              onClick={handleSendOrStop}
              disabled={!inputValue.trim() && !isLoading}
              size="sm"
              className={isLoading ? "bg-muted-foreground" : ""}
            >
              {isLoading ? (
                <span className="text-sm">Stop</span>
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-1.5 bg-muted/30 border-t shrink-0 z-10 flex justify-between items-center">
        <span className="text-[10px] text-muted-foreground">PALN v1.0</span>
        <span className="text-[10px] text-muted-foreground">Powered by Ollama</span>
      </div>
    </div>
  );
}
