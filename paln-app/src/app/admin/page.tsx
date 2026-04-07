"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { BarChart3, Clock, TrendingUp, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface FollowUpStats {
  total_clicks: number;
  messages_with_followups: number;
  click_rate: number;
  recent_clicks: {
    original_question: string;
    follow_up_clicked: string;
    clicked_at: string;
    session_title: string;
  }[];
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<FollowUpStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    
    if (!session) {
      router.push("/login");
      return;
    }

    const fetchStats = async () => {
      try {
        const token = (session.user as { accessToken?: string })?.accessToken;
        const res = await fetch("http://localhost:8003/api/admin/follow-up-stats", {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          if (res.status === 403) {
            setError("Admin access required. Set ADMIN_EMAIL in backend .env");
            return;
          }
          throw new Error("Failed to fetch stats");
        }

        const data = await res.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [session, status, router]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-neo-white flex items-center justify-center">
        <div className="text-2xl font-black">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neo-white flex flex-col items-center justify-center gap-4">
        <div className="text-2xl font-black text-neo-pink">ERROR</div>
        <p className="text-lg font-medium">{error}</p>
        <Link href="/dashboard" className="px-4 py-2 bg-neo-black text-neo-white font-bold border-2 border-neo-black hover:bg-neo-yellow hover:text-neo-black transition-colors">
          ← BACK TO DASHBOARD
        </Link>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-neo-white flex items-center justify-center">
        <div className="text-xl font-bold">No data available</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neo-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard" className="p-2 border-2 border-neo-black bg-neo-white hover:bg-neo-pink hover:text-neo-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-3xl font-black">ADMIN: FOLLOW-UP ANALYTICS</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="p-4 border-4 border-neo-black bg-neo-yellow">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-5 h-5" />
              <span className="font-bold text-sm">TOTAL CLICKS</span>
            </div>
            <div className="text-4xl font-black">{stats.total_clicks}</div>
          </div>

          <div className="p-4 border-4 border-neo-black bg-neo-blue text-neo-white">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5" />
              <span className="font-bold text-sm">CLICK RATE</span>
            </div>
            <div className="text-4xl font-black">{stats.click_rate}%</div>
          </div>

          <div className="p-4 border-4 border-neo-black bg-neo-green">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5" />
              <span className="font-bold text-sm">MESSAGES WITH FOLLOW-UPS</span>
            </div>
            <div className="text-4xl font-black">{stats.messages_with_followups}</div>
          </div>
        </div>

        <div className="border-4 border-neo-black bg-neo-white">
          <div className="p-3 border-b-4 border-neo-black bg-neo-black text-neo-white">
            <h2 className="font-black text-lg">RECENT CLICKS</h2>
          </div>
          
          {stats.recent_clicks.length === 0 ? (
            <div className="p-6 text-center font-medium">No follow-up clicks yet</div>
          ) : (
            <div className="divide-y-2 divide-neo-black">
              {stats.recent_clicks.map((click, i) => (
                <div key={i} className="p-3 hover:bg-neo-yellow/30">
                  <div className="flex justify-between items-start gap-4 mb-2">
                    <span className="font-bold text-xs text-neo-black/60">
                      {new Date(click.clicked_at).toLocaleString()}
                    </span>
                    <span className="font-bold text-xs px-2 py-0.5 bg-neo-black text-neo-white">
                      {click.session_title || "Unknown Session"}
                    </span>
                  </div>
                  <div className="mb-1">
                    <span className="font-bold text-xs text-neo-black/60 mr-2">Q:</span>
                    <span className="text-sm">{click.original_question}</span>
                  </div>
                  <div>
                    <span className="font-bold text-xs text-neo-pink mr-2">Clicked:</span>
                    <span className="text-sm font-medium text-neo-pink">{click.follow_up_clicked}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}