"use client";

import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";

export default function RegisterPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="p-6 border-b bg-background">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Link href="/" className="text-2xl font-semibold tracking-tight">
            PALN
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign in
          </Link>
        </div>
      </header>

      <section className="flex-1 flex items-center justify-center p-8 bg-background">
        <AuthForm mode="register" />
      </section>
    </main>
  );
}
