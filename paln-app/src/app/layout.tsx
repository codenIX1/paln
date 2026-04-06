import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers/SessionProvider";

export const metadata: Metadata = {
  title: "SourceSync",
  description: "AI summarizer and Q&A tool",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link 
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;700&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body className="bg-neo-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
