"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";

interface NeoButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  children: ReactNode;
}

export function NeoButton({
  variant = "primary",
  children,
  className = "",
  ...props
}: NeoButtonProps) {
  const baseStyles = "font-bold border-2 border-neo-black transition-all duration-150 active:translate-x-0.5 active:translate-y-0.5";
  
  const variants = {
    primary: "bg-neo-black text-neo-white hover:bg-neo-yellow hover:text-neo-black shadow-neo hover:shadow-neo-hover",
    secondary: "bg-neo-white text-neo-black hover:bg-neo-pink hover:text-neo-white shadow-neo hover:shadow-neo-hover",
    ghost: "bg-transparent border-none shadow-none hover:bg-neo-yellow",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}