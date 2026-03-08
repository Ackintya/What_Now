import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { AgentChat } from "@/components/AgentChat";

export const metadata: Metadata = {
  title: "NowWhat - Nutrition Wellness Module",
  description: "Standalone Nutrition Wellness module for hackathon integration",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-doom-bg text-doom-text min-h-screen">
        <Providers>{children}</Providers>
        <AgentChat />
      </body>
    </html>
  );
}
