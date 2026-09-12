import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Madras Pesu | The Lucky Draw",
  description: "A little luck, a delicious surprise. Enter the Madras Pesu lucky draw and scratch to reveal your restaurant offer.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/madras-pesu-logo.jpeg",
    shortcut: "/madras-pesu-logo.jpeg",
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

