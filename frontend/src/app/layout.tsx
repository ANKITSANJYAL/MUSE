import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Project Muse — Creative Director AI",
  description:
    "Real-time multimodal creative agent powered by Gemini Live API. Storyboard ads with AI-driven voice direction and image generation.",
  keywords: [
    "AI",
    "creative director",
    "storyboard",
    "Gemini",
    "image generation",
    "real-time",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
