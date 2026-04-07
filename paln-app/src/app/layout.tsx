import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers/SessionProvider";

export const metadata: Metadata = {
  title: "PALN",
  description: "AI summarizer and Q&A tool",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
