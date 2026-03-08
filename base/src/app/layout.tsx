import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { AgentChat } from "@/components/AgentChat";

export const metadata: Metadata = {
  title: "WellBeing App - Your Complete Health Companion",
  description: "Track fitness, nutrition, skin health, and more - all connected in one unified platform",
  manifest: "/manifest.json",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-doom-bg text-doom-text min-h-screen">
        <Providers>{children}</Providers>
        <AgentChat />
      </body>
    </html>
  );
}
