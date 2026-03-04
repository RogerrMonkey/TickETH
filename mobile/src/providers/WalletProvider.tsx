import React, { createContext, useContext, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useActiveAccount, useActiveWallet, useDisconnect } from 'thirdweb/react-native';
import { signMessage as twSignMessage } from 'thirdweb/utils';
import { useWalletStore, type AppMode } from '../stores/walletStore';
import { useAuthStore } from '../stores/authStore';
import { authApi } from '../api';
import { buildSiweMessage } from '../services/wallet';
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
  const login = useAuthStore((s) => s.login);
  const activeAccount = useActiveAccount();
  const activeWallet = useActiveWallet();
  const { disconnect: twDisconnect } = useDisconnect();

  // Restore persisted mode on mount
  useEffect(() => {
    AsyncStorage.getItem(MODE_STORAGE_KEY).then((stored) => {
      if (stored === 'volunteer' || stored === 'attendee') {
        wallet.setMode(stored);
      }
    });
  }, []);

  // When thirdweb connects a wallet, perform SIWE auth with backend
  useEffect(() => {
    if (!activeAccount?.address) {
      // Wallet disconnected
      if (wallet.connected) {
        wallet.disconnect();
      }
      return;
    }

    const address = activeAccount.address;

    // Already connected with this address — skip re-auth
    if (wallet.address?.toLowerCase() === address.toLowerCase() && wallet.connected) {
      return;
    }

    // New wallet connected — perform SIWE auth
    let cancelled = false;
    (async () => {
      wallet.setConnecting(true);
      try {
        // 1. Get nonce from backend
        const { nonce } = await authApi.getNonce(address);

        // 2. Build SIWE message
        const message = buildSiweMessage({ address, nonce });

        // 3. Sign with thirdweb account
        const signature = await twSignMessage({
          message,
          account: activeAccount,
        });

        if (cancelled) return;

        // 4. Verify on backend — creates user + returns JWT
        await login(message, signature);

        // 5. Set wallet state
        wallet.setWallet(address, CHAIN_CONFIG.chainId);
      } catch (err: any) {
        if (cancelled) return;
        console.error('SIWE auth failed:', err?.message ?? err);
        // Disconnect the wallet if SIWE fails
        if (activeWallet) {
          twDisconnect(activeWallet);
        }
        wallet.setConnecting(false);
      }
    })();

    return () => { cancelled = true; };
  }, [activeAccount?.address]);

  // ─── Disconnect ─────────────────────────────────────────
  const disconnect = useCallback(async () => {
    if (activeWallet) {
      twDisconnect(activeWallet);
    }
    wallet.disconnect();
    await useAuthStore.getState().logout();
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
