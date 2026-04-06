"use client";

import { InputHTMLAttributes, forwardRef } from "react";

interface NeoInputProps extends InputHTMLAttributes<HTMLInputElement> {
  as?: "input" | "textarea";
  rows?: number;
}

export const NeoInput = forwardRef<HTMLInputElement, NeoInputProps>(
  ({ as = "input", className = "", rows = 3, ...props }, ref) => {
    const baseStyles = "w-full p-2.5 border-2 border-neo-black font-mono text-xs focus:outline-none focus:ring-2 focus:ring-neo-pink bg-neo-white";
    
    if (as === "textarea") {
      return (
        <textarea
          ref={ref as unknown as React.RefObject<HTMLTextAreaElement>}
          className={`${baseStyles} resize-none ${className}`}
          rows={rows}
          {...(props as InputHTMLAttributes<HTMLTextAreaElement>)}
        />
      );
    }
    
    return (
      <input
        ref={ref}
        className={`${baseStyles} ${className}`}
        {...props}
      />
    );
  }
);

NeoInput.displayName = "NeoInput";