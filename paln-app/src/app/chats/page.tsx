"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Plus, MessageSquare, User, LogOut, Settings, Moon, Sun } from "lucide-react";
import { SessionCard } from "@/components/SessionCard";
import { api, Session } from "@/lib/api";
import { Button } from "@/components/ui/button";

export default function ChatsPage() {
  const router = useRouter();
  const { status, data: session } = useSession();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);

  const getToken = (): string | undefined => {
    return (session?.user as { accessToken?: string })?.accessToken;
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
    } catch {
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
    } catch {
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
    } catch {
      setError("Failed to create session");
    }
  };

  const handleSessionClick = (sessionId: string) => {
    router.push(`/dashboard?session=${sessionId}`);
  };

  const handleLogout = () => {
    signOut({ callbackUrl: "/" });
  };

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark", !isDark);
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-xl font-semibold">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans">
      <header className="flex justify-between items-center w-full px-6 py-3 sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b">
        <div className="flex items-center gap-8">
          <button
            onClick={() => router.push("/")}
            className="text-lg font-semibold text-foreground hover:text-primary transition-colors"
          >
            PALN
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleNewChat}
            variant="default"
            size="sm"
          >
            + New Chat
          </Button>
          <Button 
            onClick={() => router.push("/dashboard")} 
            variant="ghost"
            size="sm"
          >
            Home
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleTheme}>
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
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
              <div className="absolute right-0 top-full mt-1 w-44 border bg-popover rounded-md shadow-lg z-50">
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

      <main className="flex-1 p-6 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <MessageSquare className="w-8 h-8 text-primary" />
            <h1 className="text-3xl md:text-4xl font-semibold">My Chats</h1>
          </div>

          {sessions.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-6 bg-primary/10 rounded-xl flex items-center justify-center">
                <MessageSquare className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold mb-4">No chats yet</h2>
              <p className="text-lg text-muted-foreground mb-8">
                Start a new chat to get started
              </p>
              <Button
                onClick={handleNewChat}
                size="lg"
                className="text-lg"
              >
                <Plus className="w-5 h-5 mr-2" />
                Start New Chat
              </Button>
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

      <Button
        onClick={handleNewChat}
        className="fixed bottom-8 right-8 w-14 h-14 rounded-full shadow-lg z-50"
        size="icon"
      >
        <Plus className="w-6 h-6" />
      </Button>
    </div>
  );
}
