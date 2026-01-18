import type { Metadata, Viewport } from "next";
import "./globals.css";

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
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-bg-primary">
        {children}
      </body>
    </html>
  );
}
