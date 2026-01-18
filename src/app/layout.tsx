import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "67Ranked - Hand Motion Game",
  description: "Count 67 reps as fast as you can! A camera-based hand-motion game where players compete on the leaderboard.",
  keywords: ["game", "hand tracking", "leaderboard", "competition", "mediapipe"],
  authors: [{ name: "67Ranked" }],
  openGraph: {
    title: "67Ranked - Hand Motion Game",
    description: "Count 67 reps as fast as you can!",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#050505",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased bg-bg-primary font-sans">
        {children}
      </body>
    </html>
  );
}
