"use client";

import Link from "next/link";
import { Globe, ExternalLink, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Footer() {
  return (
    <footer className="border-t glass p-8 md:p-12">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <h3 className="text-xl font-bold">PALN</h3>
          </div>
          <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
            Upload documents, images, videos, or links and get instant AI-powered summaries with intelligent questions.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">Quick Links</h4>
          <ul className="space-y-2.5">
            <li>
              <Link href="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Home
              </Link>
            </li>
            <li>
              <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Dashboard
              </Link>
            </li>
            <li>
              <Link href="/login" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Login
              </Link>
            </li>
            <li>
              <Link href="/register" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Sign Up
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">Connect</h4>
          <div className="flex gap-3">
            <Button variant="outline" size="icon" aria-label="Website" className="rounded-full glass hover:border-primary/30 transition-colors">
              <Globe className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" aria-label="External" className="rounded-full glass hover:border-primary/30 transition-colors">
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto mt-10 pt-6 border-t border-border/50 text-center">
        <p className="text-xs text-muted-foreground/50">
          © 2026 PALN. All rights reserved. Built with ❤️ and AI.
        </p>
      </div>
    </footer>
  );
}
