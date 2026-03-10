import React, { createContext, useContext, useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useActiveAccount, useActiveWallet, useDisconnect } from 'thirdweb/react-native';
import { signMessage as twSignMessage } from 'thirdweb/utils';
import { useWalletStore, type AppMode } from '../stores/walletStore';
import { useAuthStore } from '../stores/authStore';
import { CHAIN_CONFIG } from '../constants/config';

const MODE_STORAGE_KEY = 'ticketh_app_mode';

interface WalletContextValue {
  address: string | null;
  connected: boolean;
  chainId: number | null;
  connecting: boolean;
  mode: AppMode;

  /** Disconnect wallet and log out */
  disconnect: () => Promise<void>;
  /** Switch between attendee / volunteer mode */
  setMode: (mode: AppMode) => void;
  /** Sign a message with the active wallet */
  signMessage: (message: string) => Promise<string>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

/**
 * WalletProvider — bridges thirdweb wallet connection with our backend SIWE auth.
 *
 * Thirdweb's ConnectButton handles the wallet connection UI. This provider
 * watches for account changes and performs SIWE authentication automatically.
 */
export function WalletProvider({ children }: { children: React.ReactNode }) {
  const wallet = useWalletStore();
  const activeAccount = useActiveAccount();
  const activeWallet = useActiveWallet();
  const { disconnect: twDisconnect } = useDisconnect();
  const isDisconnecting = useRef(false);

  // Restore persisted mode on mount
  useEffect(() => {
    AsyncStorage.getItem(MODE_STORAGE_KEY).then((stored) => {
      if (stored === 'volunteer' || stored === 'attendee') {
        wallet.setMode(stored);
      }
    });
  }, []);

  // Sync wallet state from thirdweb account
  // (SIWE auth is handled by ConnectButton's auth prop in auth.tsx)
  useEffect(() => {
    if (!activeAccount?.address) {
      // Skip if we initiated the disconnect — prevents cascading state changes
      if (isDisconnecting.current) return;
      if (wallet.connected) {
        wallet.disconnect();
      }
      return;
    }

    const address = activeAccount.address;
    if (wallet.address?.toLowerCase() !== address.toLowerCase() || !wallet.connected) {
      wallet.setWallet(address, CHAIN_CONFIG.chainId);
    }
  }, [activeAccount?.address]);

  // ─── Disconnect ─────────────────────────────────────────
  const disconnect = useCallback(async () => {
    isDisconnecting.current = true;
    try {
      if (activeWallet) {
        twDisconnect(activeWallet);
      }
      wallet.disconnect();
      await useAuthStore.getState().logout();
    } finally {
      // Reset after a delay to allow all useEffect cycles to settle
      setTimeout(() => { isDisconnecting.current = false; }, 500);
    }
  }, [activeWallet, twDisconnect, wallet]);

  // ─── Sign Message ───────────────────────────────────────
  const signMessage = useCallback(
    async (message: string): Promise<string> => {
      if (!activeAccount) throw new Error('Wallet not connected');
      return twSignMessage({ message, account: activeAccount });
    },
    [activeAccount],
  );

  // ─── Mode with Persistence ─────────────────────────────
  const setMode = useCallback(
    (mode: AppMode) => {
      wallet.setMode(mode);
      AsyncStorage.setItem(MODE_STORAGE_KEY, mode).catch(console.warn);
    },
    [wallet],
  );

  const value: WalletContextValue = {
    address: wallet.address,
    connected: wallet.connected,
    chainId: wallet.chainId,
    connecting: wallet.connecting,
    mode: wallet.mode,
    disconnect,
    setMode,
    signMessage,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
}
