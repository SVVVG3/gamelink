import { supabase } from './supabaseClient';

// Client-side auth functions (no Neynar SDK imports)
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}

// Client-side function to call our API route
export async function signInWithFarcaster() {
  try {
    const response = await fetch('/api/auth/farcaster', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to sign in with Farcaster');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error signing in with Farcaster:', error);
    throw error;
  }
}

// Client-side function for Farcaster context authentication
export async function signInWithFarcasterContext(fid: number) {
  try {
    const response = await fetch('/api/auth/farcaster-context', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fid }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to sign in with Farcaster context');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error signing in with Farcaster context:', error);
    throw error;
  }
}

// Client-side function to get current user via API
export async function getUser() {
  try {
    const response = await fetch('/api/auth/user');
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
} 