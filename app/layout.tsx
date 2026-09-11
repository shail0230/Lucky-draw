import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Benne | The Lucky Draw",
  description: "A little luck, a delicious surprise. Enter the Benne lucky draw and scratch to reveal your restaurant offer.",
  other: {
    "codex-preview": "development",
  },
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

