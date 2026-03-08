import type { Metadata } from "next";
import "./globals.css";
import { AgentChat } from "@/components/AgentChat";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "What Now? — Community",
  description: "Connect with others on similar wellness journeys",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("http://localhost:3000");
  return (
    <html lang="en">
      <body>
        {children}
        <AgentChat userId={user.userId} />
      </body>
    </html>
  );
}
