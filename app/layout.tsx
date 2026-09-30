import type { Metadata } from "next";
import "./globals.css";
import "./reference.css";
import "./porcelain.css";

export const metadata: Metadata = {
  title: "Signal | Relationship Call Studio",
  description: "Practice client conversations with a live AI customer and evidence-led call intelligence.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
