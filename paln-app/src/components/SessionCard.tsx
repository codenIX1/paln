"use client";

import { MessageSquare, Trash2, MoreVertical } from "lucide-react";
import { useState } from "react";

interface Session {
  id: string;
  title: string;
  created_at: string;
}

interface SessionCardProps {
  session: Session;
  onClick: () => void;
  onDelete?: () => void;
}

export function SessionCard({ session, onClick, onDelete }: SessionCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="relative group">
      <div
        onClick={onClick}
        className="bg-neo-white border-4 border-neo-black p-6 cursor-pointer hover:bg-neo-yellow hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="w-10 h-10 bg-neo-blue border-2 border-neo-black flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-neo-white" />
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1 hover:bg-slate-200 rounded opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
        <h3 className="font-bold text-lg mb-2 truncate">{session.title}</h3>
        <p className="text-sm text-slate-500 font-medium">{formatDate(session.created_at)}</p>
      </div>

      {showMenu && (
        <div className="absolute right-2 top-14 w-32 border-2 border-neo-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-10">
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
                setShowMenu(false);
              }}
              className="w-full px-3 py-2 text-left text-sm font-bold hover:bg-brutal-pink hover:text-white flex items-center gap-2 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              DELETE
            </button>
          )}
        </div>
      )}
    </div>
  );
}
