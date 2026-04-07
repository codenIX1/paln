"use client";

import { MessageSquare, Trash2, MoreVertical } from "lucide-react";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

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
      <Card
        onClick={onClick}
        className="cursor-pointer hover:bg-accent/50 transition-colors"
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 bg-primary/10 rounded-md flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1 hover:bg-muted rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <h3 className="font-medium text-base mb-1 truncate">{session.title}</h3>
          <p className="text-sm text-muted-foreground">{formatDate(session.created_at)}</p>
        </CardContent>
      </Card>

      {showMenu && (
        <div className="absolute right-2 top-14 w-36 bg-popover border rounded-md shadow-lg z-10">
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
                setShowMenu(false);
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-destructive/10 hover:text-destructive flex items-center gap-2 transition-colors rounded-t-md"
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
