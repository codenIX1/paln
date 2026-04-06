"use client";

import Link from "next/link";
import { Upload, MessageSquare, Sparkles, ArrowRight } from "lucide-react";
import { Footer } from "@/components/Footer";

const steps = [
    {
      icon: Upload,
      title: "UPLOAD",
      description: "Drop in files, paste text, or add links. We support PDFs, images, videos, and more.",
      color: "bg-neo-pink",
    },
    {
      icon: Sparkles,
      title: "SUMMARIZE",
      description: "Our AI analyzes your content and generates comprehensive summaries instantly.",
      color: "bg-neo-yellow",
    },
    {
      icon: MessageSquare,
      title: "ASK ANYTHING",
      description: "Ask questions about your content and get precise answers with source citations.",
      color: "bg-neo-blue",
    },
  ];

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="p-6 flex justify-between items-center border-b-4 border-neo-black bg-neo-white">
        <h1 className="text-3xl font-bold tracking-tight text-neo-black">SOURCESYNC</h1>
        <div className="flex gap-4 items-center">
          <nav className="flex gap-6">
            <a href="#how-it-works" className="text-neo-black font-bold hover:text-neo-pink transition-colors">
              HOW IT WORKS
            </a>
            <a href="#about" className="text-neo-black font-bold hover:text-neo-pink transition-colors">
              ABOUT
            </a>
          </nav>
          <Link
            href="/login"
            className="bg-neo-yellow text-neo-black border-4 border-neo-black px-4 py-2 font-bold shadow-neo hover:shadow-neo-hover transition-all duration-150"
          >
            LOGIN
          </Link>
        </div>
      </header>

      <section className="flex-1 flex flex-col items-center justify-center p-12 text-center gap-8">
        <div className="max-w-3xl">
          <h2 className="text-5xl md:text-7xl font-black text-neo-black mb-6 leading-tight">
            SUMMARIZE & ASK
            <br />
            <span className="bg-neo-yellow px-4">ANYTHING</span>
          </h2>
          <p className="text-xl md:text-2xl text-neo-black font-medium mb-8 max-w-2xl mx-auto">
            Upload documents, images, videos, or links and get instant AI-powered summaries with intelligent questions.
          </p>
        </div>

        <Link
          href="/login"
          className="bg-neo-yellow text-neo-black text-2xl font-black px-12 py-5 border-4 border-neo-black shadow-neo hover:shadow-neo-hover hover:translate-x-1 hover:translate-y-1 transition-all duration-150"
        >
          GET STARTED →
        </Link>

        <div className="flex gap-8 mt-8">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-neo-pink border-2 border-neo-black"></div>
            <span className="font-bold">FILES</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-neo-blue border-2 border-neo-black"></div>
            <span className="font-bold">IMAGES</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-neo-yellow border-2 border-neo-black"></div>
            <span className="font-bold">TEXT</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-neo-black border-2 border-neo-black"></div>
            <span className="font-bold">LINKS</span>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-16 md:py-24 bg-neo-black text-neo-white">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-4xl md:text-5xl font-black text-center mb-4">
            HOW IT <span className="text-neo-yellow">WORKS</span>
          </h2>
          <p className="text-center text-lg font-medium opacity-70 mb-12 max-w-2xl mx-auto">
            Get started in three simple steps
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <div
                key={index}
                className="border-4 border-neo-white p-8 text-center hover:border-neo-yellow transition-colors group"
              >
                <div className={`w-16 h-16 mx-auto mb-6 ${step.color} border-4 border-neo-black flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <step.icon className="w-8 h-8 text-neo-black" />
                </div>
                <div className="text-neo-yellow font-black text-xl mb-3">{step.title}</div>
                <p className="text-sm font-medium opacity-80">
                  {step.description}
                </p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-neo-yellow text-neo-black text-lg font-black px-8 py-4 border-4 border-neo-yellow shadow-neo hover:shadow-neo-hover hover:translate-x-1 hover:translate-y-1 transition-all"
            >
              TRY IT NOW <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      <section id="about" className="py-16 md:py-24 bg-neo-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-black text-neo-black mb-6">
            ABOUT <span className="text-neo-pink">SOURCESYNC</span>
          </h2>
          <p className="text-lg md:text-xl text-neo-black font-medium leading-relaxed mb-8">
            SourceSync is an AI-powered tool designed to help you understand any content faster.
            Whether you're researching documents, analyzing reports, or learning from videos,
            our intelligent system provides instant summaries and answers your specific questions.
          </p>
          <p className="text-lg md:text-xl text-neo-black font-medium leading-relaxed">
            Built with cutting-edge AI technology, SourceSync brings the power of advanced
            language models to your fingertips—making information accessible, understandable,
            and actionable.
          </p>

          <div className="mt-12 flex flex-wrap justify-center gap-4">
            <div className="px-6 py-3 border-2 border-neo-black bg-neo-yellow font-bold">
              AI-POWERED
            </div>
            <div className="px-6 py-3 border-2 border-neo-black bg-neo-pink text-neo-white font-bold">
              INSTANT SUMMARIES
            </div>
            <div className="px-6 py-3 border-2 border-neo-black bg-neo-blue text-neo-white font-bold">
              SOURCE CITATIONS
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
