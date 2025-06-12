import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import './globals.css';
import '@farcaster/auth-kit/styles.css';
import AuthKitWrapper from '@/components/AuthKitWrapper';
import { SocialDataProvider } from '@/contexts/SocialDataContext';

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
        <AuthKitWrapper>
          <SocialDataProvider>
            {children}
          </SocialDataProvider>
        </AuthKitWrapper>
      </body>
    </html>
  );
}
