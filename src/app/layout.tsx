import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import './globals.css';
import '@farcaster/auth-kit/styles.css';
import AuthKitWrapper from '@/components/AuthKitWrapper';
import { SocialDataProvider } from '@/contexts/SocialDataContext';
import FarcasterSDKProvider from '@/components/FarcasterSDKProvider';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GameLink - Connect with Fellow Gamers on Farcaster",
  description: "Share your gamertags, organize events, and chat with fellow gamers on Farcaster",
  manifest: "/.well-known/farcaster.json",
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover'
  },
  openGraph: {
    title: "GameLink - Connect with Fellow Gamers on Farcaster",
    description: "Share your gamertags, organize events, and chat with fellow gamers on Farcaster",
    images: [
      {
        url: "https://farcaster-gamelink.vercel.app/gamelinkEmbed.png",
        width: 600,
        height: 400,
        alt: "GameLink - Connect with Fellow Gamers",
      },
    ],
    type: "website",
    url: "https://farcaster-gamelink.vercel.app",
  },
  twitter: {
    card: "summary_large_image",
    title: "GameLink - Connect with Fellow Gamers on Farcaster",
    description: "Share your gamertags, organize events, and chat with fellow gamers on Farcaster",
    images: ["https://farcaster-gamelink.vercel.app/gamelinkEmbed.png"],
  },
  other: {
    'fc:frame': JSON.stringify({
      version: "next",
      imageUrl: "https://farcaster-gamelink.vercel.app/gamelinkEmbed.png",
      button: {
        title: "🎮 Start Gaming",
        action: {
          type: "launch_frame",
          url: "https://farcaster-gamelink.vercel.app",
          name: "GameLink",
          splashImageUrl: "https://farcaster-gamelink.vercel.app/gamelinkSplashImage.png",
          splashBackgroundColor: "#000000"
        }
      }
    }),
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <FarcasterSDKProvider>
          <AuthKitWrapper>
            <SocialDataProvider>
              {children}
            </SocialDataProvider>
          </AuthKitWrapper>
        </FarcasterSDKProvider>
      </body>
    </html>
  );
}
