"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Plus, MessageSquare, User, LogOut, Settings, ArrowLeft } from "lucide-react";
import { SessionCard } from "@/components/SessionCard";
import { api, Session } from "@/lib/api";

export default function ChatsPage() {
  const router = useRouter();
  const { status, data: session } = useSession();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getToken = (): string | undefined => {
    return (session?.user as any)?.accessToken || (session as any)?.accessToken;
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      loadSessions();
    }
  }, [status]);

  const loadSessions = async () => {
    const token = getToken();
    if (!token) return;

    try {
      const result = await api.chat.listSessions(token);
      if (result.data) {
        setSessions(result.data.sessions);
      } else if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      setError("Failed to load sessions");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    const token = getToken();
    if (!token) return;

    try {
      await api.chat.deleteSession(sessionId, token);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (err) {
      setError("Failed to delete session");
    }
  };

  const handleNewChat = async () => {
    const token = getToken();
    if (!token) return;

    try {
      const result = await api.chat.createSession("New Chat", [], token);
      if (result.data) {
        router.push(`/dashboard?session=${result.data.id}&new=true`);
      }
    } catch (err) {
      setError("Failed to create session");
    }
  };

  const handleSessionClick = (sessionId: string) => {
    router.push(`/dashboard?session=${sessionId}`);
  };

  const handleLogout = () => {
    signOut({ callbackUrl: "/" });
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neo-white">
        <div className="text-xl font-black">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-soft-gray font-body">
      <header className="flex justify-between items-center w-full px-6 py-3 sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b-2 border-neo-black">
        <div className="flex items-center gap-8">
          <button
            onClick={() => router.push("/")}
            className="text-lg font-black text-slate-800 uppercase tracking-tighter hover:text-neo-pink transition-colors"
          >
            SOURCESYNC
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleNewChat}
            className="kinetic-btn bg-neo-blue text-neo-white border-2 border-neo-black px-3 py-1.5 rounded-lg font-label text-[10px] font-bold uppercase"
          >
            + NEW CHAT
          </button>
          <button onClick={() => router.push("/dashboard")} className="kinetic-btn bg-white border-2 border-slate-900 px-3 py-1.5 rounded-lg font-label text-[10px] font-bold uppercase">
            HOME
          </button>
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

      <main className="flex-1 p-6 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <MessageSquare className="w-8 h-8" />
            <h1 className="text-3xl md:text-4xl font-black">MY CHATS</h1>
          </div>

          {sessions.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-6 bg-neo-yellow border-4 border-neo-black flex items-center justify-center">
                <MessageSquare className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-black mb-4">NO CHATS YET</h2>
              <p className="text-lg font-medium text-slate-600 mb-8">
                Start a new chat to get started
              </p>
              <button
                onClick={handleNewChat}
                className="inline-flex items-center gap-2 bg-neo-blue text-neo-white text-lg font-black px-8 py-4 border-4 border-neo-black shadow-neo hover:shadow-neo-hover hover:translate-x-1 hover:translate-y-1 transition-all"
              >
                <Plus className="w-5 h-5" />
                START NEW CHAT
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {sessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  onClick={() => handleSessionClick(session.id)}
                  onDelete={() => handleDeleteSession(session.id)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <button
        onClick={handleNewChat}
        className="fixed bottom-8 right-8 w-16 h-16 bg-neo-blue border-4 border-neo-black rounded-full flex items-center justify-center shadow-neo hover:shadow-neo-hover hover:translate-x-1 hover:translate-y-1 transition-all z-50"
      >
        <Plus className="w-8 h-8 text-neo-white" />
      </button>
    </div>
  );
}
