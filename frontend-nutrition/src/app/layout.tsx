import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NowWhat - Nutrition",
  description: "Find healthy restaurants near you",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
