"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { FileText, User, LogOut, Settings, MessageSquare, ArrowLeft } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { ChatPane } from "@/components/ChatPane";
import { ContextViewer } from "@/components/ContextViewer";
import { UploadModal } from "@/components/UploadModal";
import { api, Source, Session } from "@/lib/api";

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

export default function Dashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSessionMenu, setShowSessionMenu] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [sources, setSources] = useState<Source[]>([]);
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
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
    return (session?.user as any)?.accessToken || (session as any)?.accessToken;
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
        // Don't load sources if it's a new chat
        const isNewChat = searchParams?.get("new");
        if (isNewChat !== "true") {
          loadSources(token);
        }
        createOrGetSession(token);
      }
    }
  }, [status, session]);

  useEffect(() => {
    // Handle new chat param - clear sources for fresh chat
    const isNewChat = searchParams?.get("new");
    if (isNewChat === "true") {
      setSources([]); // Clear ALL sources from list
      setSelectedSourceIds([]);
      setCurrentSessionSourceIds([]);
      // Remove the query param to clean URL
      const url = new URL(window.location.href);
      url.searchParams.delete("new");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams]);

  const createOrGetSession = async (token: string) => {
    const sessionsResult = await api.chat.listSessions(token);
    if (sessionsResult.data) {
      setSessions(sessionsResult.data.sessions);
      
      // Check for session query param
      const sessionParam = searchParams?.get("session");
      
      if (sessionParam && sessionsResult.data.sessions.some(s => s.id === sessionParam)) {
        // Load specific session from query param
        const targetSession = sessionsResult.data.sessions.find(s => s.id === sessionParam)!;
        setCurrentSessionId(targetSession.id);
        setCurrentSessionTitle(targetSession.title);
        setCurrentSessionSourceIds(targetSession.source_ids || []);
        setSelectedSourceIds(targetSession.source_ids || []);
        loadMessages(targetSession.id, token);
      } else if (sessionsResult.data.sessions.length > 0) {
        // Default: load first session
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
      setSources([]); // Clear all sources for fresh session
      setMessages([]);
    }
  };

  const handleStartNewChat = () => {
    const token = getToken();
    if (!token) return;
    
    if (selectedSourceIds.length > 0) {
      createNewSession(token, selectedSourceIds);
    } else {
      createNewSession(token);
    }
  };

  const switchSession = async (session: Session) => {
    const token = getToken();
    if (!token) return;
    
    setCurrentSessionId(session.id);
    setCurrentSessionTitle(session.title);
    setCurrentSessionSourceIds(session.source_ids || []);
    setSelectedSourceIds(session.source_ids || []);
    setShowSessionMenu(false);
    loadMessages(session.id, token);
  };

  const handleSessionTitleChange = (newTitle: string) => {
    setCurrentSessionTitle(newTitle);
    // Update in sessions list
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
        const newSource = { id: result.data!.id, name: result.data!.name, type: "file" as const };
        setSources((prev) => [...prev, newSource]);
        setSelectedSourceIds(prev => [...prev, result.data!.id]);
        
        // Auto-generate response after upload
        await autoGenerateResponse(result.data!.id);
      }
    }
    setIsUploading(false);
  };
  
  const autoGenerateResponse = async (sourceId: string) => {
    const token = getToken();
    if (!token || !currentSessionId) return;
    
    const autoQuestion = "Provide a summary of this document";
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: autoQuestion,
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoadingChat(true);
    
    const result = await api.chat.sendMessage(currentSessionId, autoQuestion, token, [sourceId]);
    setIsLoadingChat(false);
    
    if (result.data) {
      const aiResponse: ChatMessage = {
        id: result.data.message.id,
        role: "ai",
        title: result.data.title,
        content: result.data.answer,
        extractive_summary: result.data.extractive_summary,
        citations: result.data.citations || [],
        follow_ups: result.data.follow_ups || [],
      };
      setMessages((prev) => [...prev, aiResponse]);
    } else if (result.error) {
      const errorResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: `Error: ${result.error}`,
        isTruncated: true,
      };
      setMessages((prev) => [...prev, errorResponse]);
    }
  };

  const handleUploadText = async (title: string, content: string) => {
    const token = getToken();
    if (!token) return;
    
    const result = await api.sources.uploadText(title, content, token);
    if (result.data) {
      const newSource = { id: result.data!.id, name: result.data!.name, type: "text" as const };
      setSources((prev) => [...prev, newSource]);
      // Auto-select newly uploaded source
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
      // Auto-select newly uploaded source
      setSelectedSourceIds(prev => [...prev, result.data!.id]);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !currentSessionId) return;

    const token = getToken();
    if (!token) return;

    // Use session's saved sources first, fallback to current sidebar selection
    const sourceIds = currentSessionSourceIds.length > 0 ? currentSessionSourceIds : selectedSourceIds;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
    };
    setMessages((prev) => [...prev, userMessage]);

    // Create placeholder AI message for streaming
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
      // Stream response tokens
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

      // Fetch final response metadata (title, summary, citations)
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
      // Fallback: try non-streaming request
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
      } catch (fallbackError) {
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
    
    // When creating new chat, use currently selected sources in sidebar
    const sourceIds = selectedSourceIds.length > 0 ? selectedSourceIds : [];
    const result = await api.chat.createSession("New Chat", sourceIds, token);
    if (result.data) {
      setCurrentSessionId(result.data.id);
      setCurrentSessionTitle(result.data.title);
      setCurrentSessionSourceIds(sourceIds);
      setSelectedSourceIds([]); // Clear sidebar selection for new chat
      setSources([]); // Clear all sources from list for fresh chat
      setMessages([]);
      // Update sessions list
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
      <div className="min-h-screen flex items-center justify-center bg-neo-white">
        <div className="text-xl font-black">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-soft-gray font-body">
        <header className="flex justify-between items-center w-full px-6 py-2 sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b-2 border-slate-900">
          <div className="flex items-center gap-12">
            <button
              onClick={() => router.push("/chats")}
              className="flex items-center gap-2 text-slate-800 hover:text-neo-pink transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-lg font-black uppercase tracking-tighter">SOURCESYNC</span>
            </button>
            <nav className="hidden md:flex items-center gap-6">
              <a className="text-brutal-blue border-b border-brutal-blue pb-0.5 font-label uppercase text-[10px] font-bold" href="#">Workspace</a>
              <a className="text-slate-400 font-medium hover:text-slate-700 transition-colors font-label uppercase text-[10px] font-bold" href="#">Sources</a>
              <a className="text-slate-400 font-medium hover:text-slate-700 transition-colors font-label uppercase text-[10px] font-bold" href="#">Archive</a>
              <a className="text-slate-400 font-medium hover:text-slate-700 transition-colors font-label uppercase text-[10px] font-bold" href="#">Settings</a>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleNewChat}
              className="kinetic-btn bg-neo-blue text-neo-white border-2 border-neo-black px-3 py-1.5 rounded-lg font-label text-[10px] font-bold uppercase"
            >
              + NEW CHAT
            </button>
            <button 
              onClick={() => setShowUploadModal(true)}
              className="kinetic-btn bg-brutal-yellow border-2 border-slate-900 px-3 py-1.5 rounded-lg font-label text-[10px] font-bold uppercase"
            >
              + UPLOAD
            </button>
            <button onClick={() => router.push("/")} className="kinetic-btn bg-white border-2 border-slate-900 px-3 py-1.5 rounded-lg font-label text-[10px] font-bold uppercase">
              HOME
            </button>
            <button onClick={() => setShowRightPane(!showRightPane)} className="md:hidden kinetic-btn bg-white border-2 border-slate-900 px-3 py-1.5 rounded-lg font-label text-[10px] font-bold uppercase">
              {showRightPane ? "HIDE" : "SHOW"}
            </button>
            <div className="flex gap-2 ml-2">
              <span className="material-symbols-outlined text-slate-400 text-lg cursor-pointer p-1 hover:bg-slate-100 rounded">notifications</span>
              <span className="material-symbols-outlined text-slate-400 text-lg cursor-pointer p-1 hover:bg-slate-100 rounded">help</span>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold border-2 border-slate-900 bg-white hover:bg-slate-100 transition-colors rounded-lg"
              >
                <User className="w-4 h-4" />
                <span>USER</span>
              </button>
              {showUserMenu && (
                <div className="absolute right-0 top-full mt-1 w-40 border-2 border-slate-900 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-50">
                  <button className="w-full px-3 py-2 text-left text-sm font-bold hover:bg-brutal-yellow flex items-center gap-2 transition-colors">
                    <Settings className="w-3 h-3" />
                    SETTINGS
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full px-3 py-2 text-left text-sm font-bold hover:bg-brutal-pink hover:text-white flex items-center gap-2 transition-colors border-t-2 border-slate-900"
                  >
                    <LogOut className="w-3 h-3" />
                    LOGOUT
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {error && (
          <div className="p-2 bg-neo-pink text-neo-black text-center font-bold text-sm">
            Error: {error}
            <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
          </div>
        )}

      <div className="flex-1 flex flex-col md:flex-row overflow-visible">
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

        <div className="flex-1 flex flex-col md:flex-row">
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
    </div>
  );
}
