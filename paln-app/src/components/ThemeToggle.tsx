"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("paln-theme");
    if (saved === "light") {
      setIsDark(false);
      document.documentElement.classList.add("light");
    } else {
      setIsDark(true);
      document.documentElement.classList.remove("light");
    }
  }, []);

  const toggle = () => {
    const willBeLight = isDark;
    setIsDark(!isDark);
    document.documentElement.classList.toggle("light", willBeLight);
    localStorage.setItem("paln-theme", willBeLight ? "light" : "dark");
  };

  if (!mounted) return null;

  return (
    <button
      onClick={toggle}
      className="relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-primary/50"
      style={{
        background: isDark
          ? "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)"
          : "linear-gradient(135deg, #89cff0 0%, #ffd580 100%)",
      }}
      aria-label="Toggle theme"
    >
      {/* Track glow */}
      <div
        className="absolute inset-0 rounded-full opacity-40 transition-all duration-300"
        style={{
          boxShadow: isDark
            ? "inset 0 0 8px rgba(124,108,255,0.3)"
            : "inset 0 0 8px rgba(255,180,50,0.3)",
        }}
      />

      {/* Thumb */}
      <div
        className="absolute top-0.5 w-6 h-6 rounded-full shadow-md flex items-center justify-center transition-all duration-300 ease-out"
        style={{
          left: isDark ? "2px" : "calc(100% - 26px)",
          background: isDark ? "#0f0f1a" : "#fff",
          boxShadow: isDark
            ? "0 0 10px rgba(124,108,255,0.4), 0 2px 4px rgba(0,0,0,0.3)"
            : "0 0 10px rgba(255,200,50,0.3), 0 2px 4px rgba(0,0,0,0.1)",
        }}
      >
        {isDark ? (
          <Moon className="w-3.5 h-3.5 text-violet-400" />
        ) : (
          <Sun className="w-3.5 h-3.5 text-amber-500" />
        )}
      </div>

      {/* Stars (dark mode decoration) */}
      {isDark && (
        <>
          <div className="absolute top-1.5 right-2.5 w-1 h-1 rounded-full bg-white/60 animate-pulse" />
          <div className="absolute top-3.5 right-4 w-0.5 h-0.5 rounded-full bg-white/40 animate-pulse" style={{ animationDelay: "0.5s" }} />
        </>
      )}
    </button>
  );
}
