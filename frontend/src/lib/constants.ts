import { createThirdwebClient } from 'thirdweb';
import { polygonAmoy } from 'thirdweb/chains';

/* ─── Thirdweb ───────────────────────────────────────────── */
export const THIRDWEB_CLIENT_ID =
  process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID ?? '98ae3d982a02db9fa69f6aeec72166e2';

export const thirdwebClient = createThirdwebClient({
  clientId: THIRDWEB_CLIENT_ID,
});

export const activeChain = polygonAmoy;

/* ─── API ────────────────────────────────────────────────── */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

/* ─── Contracts ──────────────────────────────────────────── */
export const FACTORY_ADDRESS = '0x8E0237fed96693c36c5A5021A6893b7B9F3494B2';
export const MARKETPLACE_ADDRESS = '0x828bE7efB199b867684bE502A8e93F817697a543';
export const CHAIN_ID = 80002;
export const BLOCK_EXPLORER = 'https://amoy.polygonscan.com';

/* ─── App ────────────────────────────────────────────────── */
export const APP_NAME = 'TickETH';
export const APP_DESCRIPTION = 'Blockchain NFT Ticketing — Secure. Transparent. Yours.';
export const SIWE_DOMAIN = 'ticketh.io';
export const SIWE_URI = 'https://ticketh.io';
