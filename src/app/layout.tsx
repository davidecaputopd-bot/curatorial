import type { Metadata, Viewport } from "next";
import { Schibsted_Grotesk } from "next/font/google";
import AppShell from "@/components/AppShell";
import { getViewerRole } from "@/lib/auth/viewer";
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const role = await getViewerRole();

  return (
    <html lang="it" className={`${schibsted.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <AppShell role={role}>{children}</AppShell>
      </body>
    </html>
  );
}
