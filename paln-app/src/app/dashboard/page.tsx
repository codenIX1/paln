"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { User, LogOut, Settings, ArrowLeft, Bell, HelpCircle, Sparkles } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { ChatPane } from "@/components/ChatPane";
import { ContextViewer } from "@/components/ContextViewer";
import { UploadModal } from "@/components/UploadModal";
import { SummaryModal } from "@/components/SummaryModal";
import { api, Source, Session } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";

interface ChatMessage {
  id: string;
  role: "user" | "ai";
  title?: string;
  content: string;
  extractive_summary?: string[];
  citations?: {
    id: string;
    label: string;
    sourceName: string;
    content: string;
    page?: number;
    relevance: number;
  }[];
  follow_ups?: string[];
  isTruncated?: boolean;
}

interface RetrievedChunk {
  id: string;
  title: string;
  sourceName: string;
  content: string;
  page?: number;
  relevance: number;
  type: "text" | "image" | "metadata";
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [sources, setSources] = useState<Source[]>([]);
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentSessionSourceIds, setCurrentSessionSourceIds] = useState<string[]>([]);
  const [currentSessionTitle, setCurrentSessionTitle] = useState<string>("New Chat");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [showRightPane, setShowRightPane] = useState(true);
  const [selectedSource, setSelectedSource] = useState<RetrievedChunk | null>(null);
  const [error, setError] = useState<string | null>(null);
  const streamingControllerRef = useRef<AbortController | null>(null);

  const getToken = (): string | undefined => {
    return (session?.user as { accessToken?: string })?.accessToken;
  };

  const toggleSourceSelection = (sourceId: string) => {
    setSelectedSourceIds(prev => 
      prev.includes(sourceId)
        ? prev.filter(id => id !== sourceId)
        : [...prev, sourceId]
    );
  };

  const selectAllSources = () => {
    setSelectedSourceIds(sources.map(s => s.id));
  };

  const clearSourceSelection = () => {
    setSelectedSourceIds([]);
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      const token = getToken();
      if (token) {
        const isNewChat = searchParams?.get("new");
        if (isNewChat !== "true") {
          loadSources(token);
        }
        createOrGetSession(token);
      }
    }
  }, [status, session]);

  useEffect(() => {
    const isNewChat = searchParams?.get("new");
    if (isNewChat === "true") {
      setSources([]);
      setSelectedSourceIds([]);
      setCurrentSessionSourceIds([]);
      const url = new URL(window.location.href);
      url.searchParams.delete("new");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams]);

  const createOrGetSession = async (token: string) => {
    const sessionsResult = await api.chat.listSessions(token);
    if (sessionsResult.data) {
      setSessions(sessionsResult.data.sessions);
      
      const sessionParam = searchParams?.get("session");
      
      if (sessionParam && sessionsResult.data.sessions.some(s => s.id === sessionParam)) {
        const targetSession = sessionsResult.data.sessions.find(s => s.id === sessionParam)!;
        setCurrentSessionId(targetSession.id);
        setCurrentSessionTitle(targetSession.title);
        setCurrentSessionSourceIds(targetSession.source_ids || []);
        setSelectedSourceIds(targetSession.source_ids || []);
        loadMessages(targetSession.id, token);
      } else if (sessionsResult.data.sessions.length > 0) {
        const firstSession = sessionsResult.data.sessions[0];
        setCurrentSessionId(firstSession.id);
        setCurrentSessionTitle(firstSession.title);
        setCurrentSessionSourceIds(firstSession.source_ids || []);
        setSelectedSourceIds(firstSession.source_ids || []);
        loadMessages(firstSession.id, token);
      } else {
        createNewSession(token);
      }
    }
  };

  const loadSources = async (token: string) => {
    const result = await api.sources.list(token);
    if (result.error) {
      setError(result.error);
    }
    if (result.data) {
      setSources(result.data.sources);
    }
  };

  const createNewSession = async (token: string, sourceIds?: string[]) => {
    const createResult = await api.chat.createSession(undefined, sourceIds, token);
    if (createResult.data) {
      setSessions((prev) => [createResult.data!, ...prev]);
      setCurrentSessionId(createResult.data.id);
      setCurrentSessionTitle(createResult.data.title);
      setCurrentSessionSourceIds(sourceIds || []);
      setSelectedSourceIds([]);
      setSources([]);
      setMessages([]);
    }
  };

  const handleSessionTitleChange = (newTitle: string) => {
    setCurrentSessionTitle(newTitle);
    setSessions(prev => prev.map(s => 
      s.id === currentSessionId ? { ...s, title: newTitle } : s
    ));
  };

  const loadMessages = async (sessionId: string, token: string) => {
    const result = await api.chat.getMessages(sessionId, token);
    if (result.data) {
      setMessages(
        result.data.messages.map((m) => ({
          id: m.id,
          role: m.role === "user" ? "user" : "ai",
          content: m.content,
        }))
      );
    }
  };

  const handleAddSource = (source: Source) => {
    setSources((prev) => [...prev, source]);
  };

  const handleRemoveSource = async (id: string) => {
    const token = getToken();
    if (!token) return;
    
    const result = await api.sources.delete(id, token);
    if (!result.error) {
      setSources((prev) => prev.filter((s) => s.id !== id));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    const token = getToken();
    if (!files || !token) return;
    
    setIsUploading(true);
    for (const file of Array.from(files)) {
      const result = await api.sources.upload(file, token);
      if (result.data) {
        const data = result.data as any;
        
        if (data.job_id) {
          // It's a background job, we don't have the source ID yet
          alert(`File "${file.name}" uploaded. Background processing started.`);
        } else if (data.id) {
          // Synchronous response (fallback)
          const newSource = { id: data.id, name: data.name || file.name, type: "file" as const };
          setSources((prev) => [...prev, newSource]);
          setSelectedSourceIds(prev => [...prev, data.id]);
        }
      }
    }
    setIsUploading(false);
  };

  const handleUploadText = async (title: string, content: string) => {
    const token = getToken();
    if (!token) return;
    
    const result = await api.sources.uploadText(title, content, token);
    if (result.data) {
      const newSource = { id: result.data!.id, name: result.data!.name, type: "text" as const };
      setSources((prev) => [...prev, newSource]);
      setSelectedSourceIds(prev => [...prev, result.data!.id]);
    }
  };

  const handleUploadLink = async (url: string) => {
    const token = getToken();
    if (!token) return;
    
    const result = await api.sources.uploadLink(url, token);
    if (result.data) {
      const newSource = { id: result.data!.id, name: result.data!.name, type: "link" as const };
      setSources((prev) => [...prev, newSource]);
      setSelectedSourceIds(prev => [...prev, result.data!.id]);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !currentSessionId) return;

    const token = getToken();
    if (!token) return;

    const sourceIds = currentSessionSourceIds.length > 0 ? currentSessionSourceIds : selectedSourceIds;

    // Guard: don't allow sending if no documents are selected
    if (!sourceIds || sourceIds.length === 0) {
      const warningMsg: ChatMessage = {
        id: Date.now().toString(),
        role: "ai",
        content: "⚠️ Please upload and select at least one document source before asking questions. I can only answer based on your uploaded documents.",
      };
      setMessages((prev) => [...prev, warningMsg]);
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
    };
    setMessages((prev) => [...prev, userMessage]);

    const aiMessageId = (Date.now() + 1).toString();
    const aiMessage: ChatMessage = {
      id: aiMessageId,
      role: "ai",
      title: "Generating...",
      content: "",
    };
    setMessages((prev) => [...prev, aiMessage]);
    setIsLoadingChat(true);
    setInputValue("");

    streamingControllerRef.current = new AbortController();
    const { signal } = streamingControllerRef.current;

    try {
      for await (const chunk of api.chat.sendMessageStream(
        currentSessionId,
        inputValue,
        token,
        sourceIds,
        signal
      )) {
        if (chunk.content) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMessageId
                ? { ...msg, content: msg.content + chunk.content }
                : msg
            )
          );
        }
        if (chunk.done) break;
      }

      const finalResult = await api.chat.sendMessage(
        currentSessionId,
        inputValue,
        token,
        sourceIds
      );

      if (finalResult.data) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === aiMessageId
              ? {
                  ...msg,
                  title: finalResult.data!.title,
                  extractive_summary: finalResult.data!.extractive_summary,
                  citations: finalResult.data!.citations || [],
                  follow_ups: finalResult.data!.follow_ups || [],
                }
              : msg
          )
        );
      }
    } catch (error) {
      try {
        const fallbackResult = await api.chat.sendMessage(
          currentSessionId,
          inputValue,
          token,
          sourceIds
        );
        
        if (fallbackResult.data) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMessageId
                ? {
                    ...msg,
                    title: fallbackResult.data!.title,
                    content: fallbackResult.data!.answer,
                    extractive_summary: fallbackResult.data!.extractive_summary,
                    citations: fallbackResult.data!.citations || [],
                    follow_ups: fallbackResult.data!.follow_ups || [],
                  }
                : msg
            )
          );
        } else if (fallbackResult.error) {
          setMessages((prev) => prev.filter((msg) => msg.id !== aiMessageId));
          setError(fallbackResult.error);
        }
      } catch {
        setMessages((prev) => prev.filter((msg) => msg.id !== aiMessageId));
        setError(error instanceof Error ? error.message : "Streaming failed");
      }
    }

    setIsLoadingChat(false);
  };

  const handleCitationClick = (citation: { id: string; label: string; sourceName: string; content: string; page?: number; relevance: number }) => {
    const chunk: RetrievedChunk = {
      id: citation.id,
      title: citation.label,
      sourceName: citation.sourceName,
      content: citation.content,
      page: citation.page,
      relevance: citation.relevance,
      type: "text",
    };
    setSelectedSource(chunk);
  };

  const handleFollowUpClick = async (messageId: string, originalQuestion: string, followUpText: string) => {
    const token = getToken();
    if (!token) return;
    
    await api.chat.trackFollowUp(messageId, originalQuestion, followUpText, token);
  };

  const handleLogout = () => {
    signOut({ callbackUrl: "/" });
  };

  const handleNewChat = async () => {
    const token = getToken();
    if (!token) return;
    
    const sourceIds = selectedSourceIds.length > 0 ? selectedSourceIds : [];
    const result = await api.chat.createSession("New Chat", sourceIds, token);
    if (result.data) {
      setCurrentSessionId(result.data.id);
      setCurrentSessionTitle(result.data.title);
      setCurrentSessionSourceIds(sourceIds);
      setSelectedSourceIds([]);
      setSources([]);
      setMessages([]);
      setSessions(prev => [{ ...result.data!, source_ids: sourceIds }, ...prev]);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  const handleStopGeneration = () => {
    if (streamingControllerRef.current) {
      streamingControllerRef.current.abort();
      streamingControllerRef.current = null;
    }
    setIsLoadingChat(false);
  };



  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-xl font-semibold">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans mesh-bg">
        <header className="floating-nav sticky top-3 z-50 px-5 py-2 flex justify-between items-center mx-4">
          <div className="flex items-center gap-8">
            <button
              onClick={() => router.push("/chats")}
              className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="text-lg font-bold tracking-tight">PALN</span>
              </div>
            </button>
            <nav className="hidden md:flex items-center gap-1">
              <a className="text-sm font-medium px-3 py-1.5 rounded-full bg-primary/10 text-primary" href="#">Workspace</a>
              <a className="text-sm font-medium px-3 py-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all" href="#">Sources</a>
              <a className="text-sm font-medium px-3 py-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all" href="#">Archive</a>
              <a className="text-sm font-medium px-3 py-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all" href="#">Settings</a>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={handleNewChat}
              variant="default"
              size="sm"
              className="rounded-full glow-primary"
            >
              + New Chat
            </Button>
            <Button 
              onClick={() => setShowUploadModal(true)}
              variant="outline"
              size="sm"
              className="rounded-full"
            >
              + Upload
            </Button>
            <Button 
              onClick={() => router.push("/")} 
              variant="ghost"
              size="sm"
            >
              Home
            </Button>
            <Button 
              onClick={() => setShowRightPane(!showRightPane)} 
              className="md:hidden"
              variant="outline"
              size="sm"
            >
              {showRightPane ? "Hide" : "Show"}
            </Button>
            <div className="flex items-center gap-2 ml-1">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Bell className="w-4 h-4 text-muted-foreground" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <HelpCircle className="w-4 h-4 text-muted-foreground" />
              </Button>
              <ThemeToggle />
            </div>
            <div className="relative">
              <Button
                onClick={() => setShowUserMenu(!showUserMenu)}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <User className="w-4 h-4" />
                <span>User</span>
              </Button>
              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-44 glass rounded-xl shadow-lg z-50 overflow-hidden">
                  <button className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 transition-colors rounded-t-md">
                    <Settings className="w-3 h-3" />
                    Settings
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-destructive/10 hover:text-destructive flex items-center gap-2 transition-colors border-t rounded-b-md"
                  >
                    <LogOut className="w-3 h-3" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {error && (
          <div className="p-2 bg-destructive/10 text-destructive text-center text-sm">
            Error: {error}
            <Button onClick={() => setError(null)} variant="link" className="ml-2 h-auto p-0 text-sm">Dismiss</Button>
          </div>
        )}

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden mx-4 mb-4 rounded-2xl glass">
        <Sidebar
          sources={sources}
          selectedSourceIds={selectedSourceIds}
          sessionTitle={currentSessionTitle}
          onSessionTitleChange={handleSessionTitleChange}
          onAddSource={handleAddSource}
          onRemoveSource={handleRemoveSource}
          onFileUpload={handleFileUpload}
          onUploadText={handleUploadText}
          onUploadLink={handleUploadLink}
          onToggleSource={toggleSourceSelection}
          onSelectAllSources={selectAllSources}
          onClearSelection={clearSourceSelection}
          isUploading={isUploading}
        />

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          <ChatPane
            messages={messages}
            inputValue={inputValue}
            onInputChange={setInputValue}
            onSendMessage={handleSendMessage}
            onStopGeneration={handleStopGeneration}
            onCitationClick={handleCitationClick}
            onFollowUpClick={handleFollowUpClick}
            onClearChat={handleClearChat}
            isLoading={isLoadingChat}
          />

          {showRightPane && (
            <ContextViewer
              selectedSource={selectedSource}
              onSelectSource={setSelectedSource}
              sources={sources}
              retrievedChunks={selectedSource ? [selectedSource] : []}
              onOpenSummaryModal={() => setShowSummaryModal(true)}
            />
          )}
        </div>
      </div>

      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={(uploadedSources) => {
          if (uploadedSources.length > 0) {
            setSources(prev => [...prev, ...uploadedSources]);
            setSelectedSourceIds(prev => [...prev, ...uploadedSources.map(s => s.id)]);
          }
          setShowUploadModal(false);
        }}
      />
      
      <SummaryModal
        isOpen={showSummaryModal}
        onClose={() => setShowSummaryModal(false)}
        sourceIds={selectedSourceIds}
        token={getToken()}
      />
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><div className="text-xl font-semibold">Loading...</div></div>}>
      <DashboardContent />
    </Suspense>
  );
}
