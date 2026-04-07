"use client";

import Link from "next/link";
import { Upload, MessageSquare, Sparkles, ArrowRight, Zap, Shield, Globe, ChevronRight } from "lucide-react";
import { Footer } from "@/components/Footer";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ScrambleText } from "@/components/ScrambleText";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const steps = [
  {
    icon: Upload,
    title: "Upload",
    description: "Drop in files, paste text, or add links. We support PDFs, images, videos, and more.",
    gradient: "from-blue-500/20 to-cyan-500/20",
  },
  {
    icon: Sparkles,
    title: "Summarize",
    description: "Our AI analyzes your content and generates comprehensive summaries instantly.",
    gradient: "from-violet-500/20 to-purple-500/20",
  },
  {
    icon: MessageSquare,
    title: "Ask Anything",
    description: "Ask questions about your content and get precise answers with source citations.",
    gradient: "from-amber-500/20 to-orange-500/20",
  },
];

const features = [
  { icon: Zap, label: "Lightning Fast" },
  { icon: Shield, label: "100% Private" },
  { icon: Globe, label: "Multi-Format" },
];

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col hero-gradient">
      {/* ---- FLOATING NAVBAR ---- */}
      <header className="floating-nav sticky top-3 z-50 px-6 py-3 flex justify-between items-center mx-4 md:mx-8">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center animate-glow">
            <Sparkles className="w-4.5 h-4.5 text-primary" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">PALN</h1>
        </div>
        <div className="flex gap-4 items-center">
          <nav className="hidden md:flex gap-6">
            <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              How it works
            </a>
            <a href="#about" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              About
            </a>
          </nav>
          <ThemeToggle />
          <Link href="/login">
            <Button variant="default" className="rounded-full px-6 glow-primary">
              Login
            </Button>
          </Link>
        </div>
      </header>

      {/* ---- HERO ---- */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-20 md:py-32 text-center relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-primary/8 rounded-full blur-3xl animate-float pointer-events-none" />
        <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-violet-500/6 rounded-full blur-3xl animate-float-delayed pointer-events-none" />
        <div className="absolute top-1/2 right-10 w-48 h-48 bg-cyan-500/5 rounded-full blur-2xl animate-float pointer-events-none" />

        <Badge variant="secondary" className="mb-8 px-4 py-1.5 rounded-full text-xs font-medium tracking-wide uppercase border-primary/20 glass">
          ✨ AI-Powered Document Intelligence
        </Badge>

        <h2 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 leading-[1.05] tracking-tight max-w-4xl">
          <ScrambleText text="Summarize" className="inline-block hover:text-primary transition-colors" /> & <ScrambleText text="Ask" className="inline-block hover:text-primary transition-colors" />{" "}
          <span className="bg-gradient-to-r from-primary via-violet-400 to-cyan-400 bg-clip-text text-transparent animate-gradient">
            <ScrambleText text="Anything" />
          </span>
        </h2>

        <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl leading-relaxed">
          Upload documents, images, videos, or links and get instant AI-powered summaries with intelligent Q&A — all running locally on your hardware.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-12">
          <Link href="/login">
            <Button size="lg" className="text-base px-10 py-6 rounded-full glow-primary-strong group">
              Get Started
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <a href="#how-it-works">
            <Button variant="outline" size="lg" className="text-base px-10 py-6 rounded-full glass">
              Learn More
            </Button>
          </a>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-3">
          {features.map((f) => (
            <div key={f.label} className="flex items-center gap-2 px-4 py-2 rounded-full glass text-sm">
              <f.icon className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">{f.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ---- HOW IT WORKS ---- */}
      <section id="how-it-works" className="py-20 md:py-28 relative">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 uppercase tracking-widest text-xs rounded-full glass">How it works</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Three simple <span className="text-primary">steps</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              From upload to insight in under a minute.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((step, index) => (
              <div
                key={index}
                className="group relative glass rounded-2xl p-8 hover:border-primary/30 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                <div className="relative z-10">
                  <div className="text-xs font-bold text-muted-foreground/50 mb-4 uppercase tracking-widest">
                    Step {index + 1}
                  </div>
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${step.gradient} flex items-center justify-center mb-5`}>
                    <step.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-16">
            <Link href="/login">
              <Button size="lg" className="text-base rounded-full px-10 py-6 glow-primary group">
                Try it now
                <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ---- ABOUT ---- */}
      <section id="about" className="py-20 md:py-28 relative">
        <div className="max-w-4xl mx-auto px-6">
          <div className="glass rounded-3xl p-10 md:p-16 text-center relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-60 h-60 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10">
              <Badge variant="secondary" className="mb-6 uppercase tracking-widest text-xs rounded-full glass">About</Badge>
              <h2 className="text-4xl md:text-5xl font-bold mb-8">
                About <span className="text-primary">PALN</span>
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                PALN is an AI-powered tool designed to help you understand any content faster.
                Whether you're researching documents, analyzing reports, or learning from videos,
                our intelligent system provides instant summaries and answers your specific questions.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed mb-10">
                Built with cutting-edge AI technology, PALN brings the power of advanced language
                models to your fingertips — running entirely on your local hardware for maximum
                privacy and speed.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Badge variant="outline" className="px-5 py-2.5 rounded-full text-sm glass">AI-Powered</Badge>
                <Badge variant="outline" className="px-5 py-2.5 rounded-full text-sm glass">Instant Summaries</Badge>
                <Badge variant="outline" className="px-5 py-2.5 rounded-full text-sm glass">Source Citations</Badge>
                <Badge variant="outline" className="px-5 py-2.5 rounded-full text-sm glass">100% Local</Badge>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
