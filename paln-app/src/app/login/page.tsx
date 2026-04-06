"use client";

import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="p-6 border-b-4 border-neo-black bg-neo-white">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Link href="/" className="text-3xl font-bold tracking-tight text-neo-black">
            SOURCESYNC
          </Link>
          <Link
            href="/register"
            className="text-neo-black font-bold hover:text-neo-pink transition-colors"
          >
            SIGN UP
          </Link>
        </div>
      </header>

      <section className="flex-1 flex items-center justify-center p-8 bg-neo-white">
        <AuthForm mode="login" />
      </section>
    </main>
  );
}
