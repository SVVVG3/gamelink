'use client'

import { AuthKitProvider } from '@farcaster/auth-kit';
import { useEffect, useState } from 'react';

const config = {
  rpcUrl: 'https://mainnet.optimism.io',
  domain: typeof window !== 'undefined' ? window.location.hostname : 'farcaster-gamelink.vercel.app',
  siweUri: typeof window !== 'undefined' ? `${window.location.origin}/api/login` : 'https://farcaster-gamelink.vercel.app/api/login',
  relay: 'https://relay.farcaster.xyz',
};

export default function AuthKitWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Don't render AuthKit on server side to avoid hydration issues
  if (!isClient) {
    return <>{children}</>;
  }

  return (
    <AuthKitProvider config={config}>
      {children}
    </AuthKitProvider>
  );
} 