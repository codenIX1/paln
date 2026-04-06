"use client";

import Link from "next/link";
import { Globe, ExternalLink } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t-4 border-neo-black bg-neo-black text-neo-white p-8 md:p-12">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <h3 className="text-2xl font-black mb-4 text-neo-yellow">SOURCESYNC</h3>
          <p className="text-sm font-medium opacity-80 max-w-xs">
            Upload documents, images, videos, or links and get instant AI-powered summaries with intelligent questions.
          </p>
        </div>

        <div>
          <h4 className="text-lg font-bold mb-4 text-neo-yellow">QUICK LINKS</h4>
          <ul className="space-y-2">
            <li>
              <Link href="/" className="text-sm font-medium hover:text-neo-yellow transition-colors">
                Home
              </Link>
            </li>
            <li>
              <Link href="/dashboard" className="text-sm font-medium hover:text-neo-yellow transition-colors">
                Dashboard
              </Link>
            </li>
            <li>
              <Link href="/login" className="text-sm font-medium hover:text-neo-yellow transition-colors">
                Login
              </Link>
            </li>
            <li>
              <Link href="/register" className="text-sm font-medium hover:text-neo-yellow transition-colors">
                Sign Up
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-lg font-bold mb-4 text-neo-yellow">CONNECT</h4>
          <div className="flex gap-4">
            <a
              href="#"
              className="p-2 border-2 border-neo-white hover:bg-neo-yellow hover:text-neo-black transition-colors"
              aria-label="Website"
            >
              <Globe className="w-5 h-5" />
            </a>
            <a
              href="#"
              className="p-2 border-2 border-neo-white hover:bg-neo-yellow hover:text-neo-black transition-colors"
              aria-label="External"
            >
              <ExternalLink className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto mt-10 pt-6 border-t border-neo-white/20 text-center">
        <p className="text-xs font-medium opacity-60">
          © 2026 SOURCESYNC. ALL RIGHTS RESERVED.
        </p>
      </div>
    </footer>
  );
}
