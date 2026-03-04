import Constants from 'expo-constants';
import { createThirdwebClient } from 'thirdweb';
import { polygonAmoy } from 'thirdweb/chains';

/** Backend API base URL */
export const API_BASE_URL =
  Constants.expoConfig?.extra?.apiBaseUrl ??
  (__DEV__
    ? 'http://192.168.0.234:3001/api/v1'   // LAN IP -> host machine
    : 'https://api.ticketh.io/api/v1');

/** Thirdweb client — uses clientId from Expo config or fallback */
export const THIRDWEB_CLIENT_ID =
  Constants.expoConfig?.extra?.thirdwebClientId ?? '98ae3d982a02db9fa69f6aeec72166e2';

export const thirdwebClient = createThirdwebClient({
  clientId: THIRDWEB_CLIENT_ID,
});

/** Active chain for the app */
export const activeChain = polygonAmoy;

/** Polygon Amoy testnet config */
export const CHAIN_CONFIG = {
  chainId: 80002,
  chainName: 'Polygon Amoy Testnet',
  rpcUrl: 'https://rpc-amoy.polygon.technology/',
  blockExplorer: 'https://amoy.polygonscan.com',
  nativeCurrency: {
    name: 'POL',
    symbol: 'POL',
    decimals: 18,
  },
} as const;

/** Deployed contract addresses (Polygon Amoy) */
export const CONTRACTS = {
  factory: '0x8E0237fed96693c36c5A5021A6893b7B9F3494B2',
  marketplace: '0x828bE7efB199b867684bE502A8e93F817697a543',
  implementation: '0x164d162Da6edF739A0bCd610FBd5d808c165870e',
} as const;

/** WalletConnect project ID — get one at https://cloud.walletconnect.com */
export const WALLETCONNECT_PROJECT_ID = 'YOUR_WALLETCONNECT_PROJECT_ID';

/** QR code refresh interval (ms) — refresh nonce every 25 seconds */
export const QR_REFRESH_INTERVAL = 25_000;

/** Push notification channel (Android) */
export const NOTIFICATION_CHANNEL_ID = 'ticketh-checkin';

/** Offline scan cache TTL (ms) — 24 hours */
export const OFFLINE_CACHE_TTL = 24 * 60 * 60 * 1000;

/** Max offline scans to queue before forcing sync */
export const MAX_OFFLINE_QUEUE = 200;

/** Minimum app version for forced updates */
export const MIN_APP_VERSION = '1.0.0';
