import type { Metadata, Viewport } from "next";
import { Schibsted_Grotesk } from "next/font/google";
import AppShell from "@/components/AppShell";
import "./globals.css";

const schibsted = Schibsted_Grotesk({ subsets: ["latin"], variable: "--font-schibsted", display: "swap" });

export const metadata: Metadata = {
  title: "GROW.",
  description: "Inbox intelligente, archivio creativo, calendario operativo e AI personale per trasformare contenuti in lavoro.",
};

export const viewport: Viewport = {
  themeColor: "#0D0C0B",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={`${schibsted.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
