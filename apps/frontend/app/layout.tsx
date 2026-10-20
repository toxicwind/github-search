import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GitHub Advanced Search - MCP Platform",
  description: "AI-first GitHub discovery engine with command palette and advanced search",
};

import Providers from "./providers";
import { CommandProvider } from "@/components/command-palette/CommandProvider";
import { CommandPalette } from "@/components/command-palette/CommandPalette";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <CommandProvider>
          <Providers>{children}</Providers>
          <CommandPalette />
        </CommandProvider>
      </body>
    </html>
  );
}

