import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { LegalFooter } from "@/components/ui/LegalFooter";

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
        <LegalFooter />
        {/* Production-only: discourage casual dev tools snooping */}
        {process.env.NODE_ENV === 'production' && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function(){
                  // Clear console to remove any debug info
                  console.clear();
                  // Override console methods to suppress output
                  var n=function(){};
                  console.log=n;console.debug=n;console.info=n;console.warn=n;
                  // Disable right-click context menu
                  document.addEventListener('contextmenu',function(e){e.preventDefault()});
                  // Disable common dev tools shortcuts
                  document.addEventListener('keydown',function(e){
                    if(e.key==='F12')e.preventDefault();
                    if(e.ctrlKey&&e.shiftKey&&(e.key==='I'||e.key==='i'))e.preventDefault();
                    if(e.ctrlKey&&e.shiftKey&&(e.key==='J'||e.key==='j'))e.preventDefault();
                    if(e.ctrlKey&&(e.key==='U'||e.key==='u'))e.preventDefault();
                  });
                })();
              `,
            }}
          />
        )}
      </body>
    </html>
  );
}
