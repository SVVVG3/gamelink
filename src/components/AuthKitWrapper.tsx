'use client'

import { AuthKitProvider } from '@farcaster/auth-kit';

const config = {
  rpcUrl: 'https://mainnet.optimism.io',
  domain: 'gamelink.app',
  siweUri: 'https://gamelink.app/login',
};

export default function AuthKitWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthKitProvider config={config}>
      {children}
    </AuthKitProvider>
  );
} 