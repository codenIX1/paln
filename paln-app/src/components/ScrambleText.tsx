"use client";

import { useEffect, useState, useCallback } from "react";

const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";

interface ScrambleTextProps {
  text: string;
  className?: string;
  scrambleSpeed?: number;
  revealDelay?: number;
}

export function ScrambleText({ text, className = "", scrambleSpeed = 30, revealDelay = 50 }: ScrambleTextProps) {
  const [displayed, setDisplayed] = useState(text);
  const [isHovering, setIsHovering] = useState(false);

  const scramble = useCallback(() => {
    let iteration = 0;
    const interval = setInterval(() => {
      setDisplayed(
        text
          .split("")
          .map((char, idx) => {
            if (char === " ") return " ";
            if (idx < iteration) return text[idx];
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join("")
      );
      iteration += 1 / 2;
      if (iteration >= text.length) {
        clearInterval(interval);
        setDisplayed(text);
      }
    }, scrambleSpeed);
    return () => clearInterval(interval);
  }, [text, scrambleSpeed]);

  useEffect(() => {
    if (isHovering) {
      const cleanup = scramble();
      return cleanup;
    } else {
      setDisplayed(text);
    }
  }, [isHovering, scramble, text]);

  // Auto-scramble on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      const cleanup = scramble();
      setTimeout(() => cleanup?.(), text.length * revealDelay + 500);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <span
      className={className}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      style={{ cursor: "default" }}
    >
      {displayed}
    </span>
  );
}
