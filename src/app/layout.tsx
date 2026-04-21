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

const APP_URL = "https://67ranked.com";

export const metadata: Metadata = {
  title: {
    default: "67Ranked - the viral 67 game",
    template: "%s | 67Ranked",
  },
  description:
    "Play 67Ranked: 67 against the best in the world and duel your friends in 3 gamemodes",
  keywords: [
    "67 game",
    "67game",
    "67 speed",
    "67 challenge",
    "67speed",
    "67 ranked",
    "67ranked",
    "67 rep challenge",
    "hand tracking game",
    "camera game",
    "speed challenge game",
    "rep counter game",
    "fitness game",
    "leaderboard game",
    "browser game",
  ],
  authors: [{ name: "67Ranked", url: APP_URL }],
  creator: "67Ranked",
  metadataBase: new URL(APP_URL),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "67Ranked - the viral 67 game",
    description:
      "Play 67Ranked: 67 against the best in the world and duel your friends in 3 gamemodes",
    url: APP_URL,
    siteName: "67Ranked",
    type: "website",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "67Ranked – The 67 Speed Game",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "67Ranked - the viral 67 game",
    description:
      "Play 67Ranked: 67 against the best in the world and duel your friends in 3 gamemodes",
    images: ["/api/og"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
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
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "67Ranked",
    alternateName: ["67 Game", "67game", "67 Speed Challenge", "67speed", "67 Challenge"],
    url: "https://67ranked.com",
    description:
      "The original 67 game — count 67 reps as fast as possible using your webcam. Compete in the 67 speed challenge on the global leaderboard or duel friends in real-time.",
    applicationCategory: "GameApplication",
    genre: "Sports & Fitness Game",
    operatingSystem: "Web Browser",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    aggregateRating: { "@type": "AggregateRating", ratingValue: "5", ratingCount: "1" },
  };

  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
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
