'use client';

import { Suspense, useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { prepareContractCall, getContract, toWei } from 'thirdweb';
import { useSendTransaction, useActiveAccount } from 'thirdweb/react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { CardSkeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { Modal } from '@/components/Modal';
import { Input } from '@/components/Input';
import { TransactionTracker, type TxStep } from '@/components/TransactionTracker';
import { marketplaceApi, ticketsApi } from '@/lib/api';
import { thirdwebClient, activeChain, MARKETPLACE_ADDRESS, BLOCK_EXPLORER } from '@/lib/constants';
import { formatPrice, shortenAddress, formatRelativeTime } from '@/lib/utils';
import { useAuthStore } from '@/lib/store';
import { cn } from '@/lib/cn';
import { useDebounce } from '@/lib/hooks';
import { parseError } from '@/lib/error-parser';
import { TiltCard, SpotlightSection, GlowBorder } from '@/components/ui/AnimatedElements';
import { toast } from 'sonner';
import type { Listing, Ticket } from '@/lib/types';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.5, ease: 'easeOut' as const },
  }),
};

const SORT_OPTIONS = [
  { label: 'Newest', value: 'newest' },
  { label: 'Price: Low → High', value: 'price-asc' },
  { label: 'Price: High → Low', value: 'price-desc' },
];

export default function MarketplacePageWrapper() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1 px-4 py-10">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (<CardSkeleton key={i} />))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    }>
      <MarketplacePage />
    </Suspense>
  );
}

function MarketplacePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const listTicketId = searchParams.get('list');
  const account = useActiveAccount();
  const { user } = useAuthStore();
  const { mutateAsync: sendTx } = useSendTransaction();

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [sort, setSort] = useState('newest');

  // Buy flow
  const [txStep, setTxStep] = useState<TxStep | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [buyingListing, setBuyingListing] = useState<Listing | null>(null);

  // List flow
  const [showListModal, setShowListModal] = useState(false);
  const [listPrice, setListPrice] = useState('');
  const [listingTicket, setListingTicket] = useState<Ticket | null>(null);
  const [myTickets, setMyTickets] = useState<Ticket[]>([]);
  const [listingInProgress, setListingInProgress] = useState(false);

  const loadListings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await marketplaceApi.listings({ status: 'active' });
      const data = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : (res as any)?.data ?? [];
      setListings(data);
    } catch (err) {
      setError(parseError(err).message);
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMyTickets = useCallback(async () => {
    try {
      const res = await ticketsApi.mine();
      const data = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : (res as any)?.data ?? [];
      setMyTickets(data.filter((t: Ticket) => t.status === 'valid' || t.status === 'minted'));

      if (listTicketId) {
        const ticket = data.find((t: Ticket) => t.id === listTicketId);
        if (ticket) {
          setListingTicket(ticket);
          setShowListModal(true);
        }
      }
    } catch {
      setMyTickets([]);
    }
  }, [listTicketId]);

  useEffect(() => { loadListings(); }, [loadListings]);

  useEffect(() => {
    if (listTicketId && user) loadMyTickets();
  }, [listTicketId, user, loadMyTickets]);

  const filtered = useMemo(() => {
    if (!Array.isArray(listings)) return [];
    let result = listings;

    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(
        (l) =>
          (l as any).event?.name?.toLowerCase().includes(q) ||
          (l as any).ticket?.event?.name?.toLowerCase().includes(q) ||
          (l.sellerAddress || l.sellerWallet || l.seller_wallet || '').toLowerCase().includes(q),
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      const aPrice = BigInt(a.asking_price_wei || a.askingPriceWei || a.price || '0');
      const bPrice = BigInt(b.asking_price_wei || b.askingPriceWei || b.price || '0');
      if (sort === 'price-asc') return Number(aPrice - bPrice);
      if (sort === 'price-desc') return Number(bPrice - aPrice);
      return new Date(b.createdAt || b.created_at || 0).getTime() - new Date(a.createdAt || a.created_at || 0).getTime();
    });

    return result;
  }, [listings, debouncedSearch, sort]);

  /* ─── Buy Flow ──── */
  const handleBuy = async (listing: Listing) => {
    if (!account) return;
    setBuyingListing(listing);
    setShowBuyModal(true);
    setTxStep('preparing');
    setTxError(null);
    setTxHash(null);

    try {
      const contract = getContract({
        client: thirdwebClient,
        chain: activeChain,
        address: MARKETPLACE_ADDRESS,
      });

      const listingPriceWei = listing.asking_price_wei || listing.askingPriceWei || listing.price || '0';

      const tx = prepareContractCall({
        contract,
        method: 'function buyListing(uint256 listingId) payable',
        params: [BigInt(listing.listingId ?? listing.listing_id ?? 0)],
        value: BigInt(listingPriceWei),
      });

      setTxStep('awaiting-signature');
      const result = await sendTx(tx);

      setTxStep('broadcasting');
      setTxHash(result.transactionHash);

      setTxStep('confirming');
      marketplaceApi.completeSale(listing.id, { txHash: result.transactionHash }).catch(() => {});

      setTxStep('success');
      toast.success('Ticket purchased successfully!');
      loadListings();
    } catch (err) {
      const parsed = parseError(err);
      setTxStep('error');
      setTxError(parsed.message);

      if (parsed.code === 'USER_REJECTED') {
        toast('Purchase cancelled');
      } else {
        toast.error(parsed.title, { description: parsed.message });
      }
    }
  };

  const closeBuyModal = () => {
    setShowBuyModal(false);
    setTxStep(null);
    setTxError(null);
    setTxHash(null);
    setBuyingListing(null);
  };

  /* ─── List Flow ──── */
  const handleCreateListing = async () => {
    if (!listingTicket || !listPrice) return;
    setListingInProgress(true);

    try {
      await marketplaceApi.create({
        ticketId: listingTicket.id,
        askingPriceWei: toWei(listPrice).toString(),
        askingPrice: parseFloat(listPrice) || 0,
      });
      setShowListModal(false);
      setListPrice('');
      setListingTicket(null);
      toast.success('Listing created successfully!');
      loadListings();
    } catch (err) {
      const parsed = parseError(err);
      toast.error(parsed.title, { description: parsed.message });
    } finally {
      setListingInProgress(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1 px-4 py-10">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-accent uppercase tracking-[0.3em]">Peer-to-Peer</span>
              <h1 className="mt-2 text-4xl font-extrabold">
                <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">Marketplace</span>
              </h1>
              <p className="mt-1 text-muted">Buy and sell NFT tickets peer-to-peer</p>
            </div>
            {user && (
              <Button
                onClick={() => { loadMyTickets(); setShowListModal(true); }}
                variant="outline"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                List a Ticket
              </Button>
            )}
          </div>

          {/* Search + Sort */}
          <div className="mb-8 flex flex-col sm:flex-row gap-3 rounded-2xl border border-border/30 bg-surface/60 backdrop-blur-sm p-4">
            <div className="relative flex-1 max-w-md">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
              </svg>
              <input
                type="text"
                placeholder="Search by event or seller..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-border/50 bg-background/80 pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 backdrop-blur-sm"
              />
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="rounded-xl border border-border/50 bg-background/80 px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 backdrop-blur-sm"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Error banner */}
          {error && !loading && (
            <div className="mb-8 rounded-2xl border border-error/30 bg-error/5 p-6 text-center">
              <p className="text-sm text-error mb-3">{error}</p>
              <Button variant="outline" size="sm" onClick={loadListings}>Retry</Button>
            </div>
          )}

          {/* Listings grid */}
          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (<CardSkeleton key={i} />))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              title={debouncedSearch ? 'No matching listings' : 'No listings yet'}
              message={debouncedSearch ? 'Try a different search term' : 'No tickets are listed for sale right now. Check back soon!'}
              icon={
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted">
                  <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
              }
              action={
                debouncedSearch ? (
                  <button
                    onClick={() => setSearch('')}
                    className="inline-flex items-center rounded-xl border border-border px-6 py-2.5 text-sm font-semibold hover:border-primary/30 transition-colors"
                  >
                    Clear Search
                  </button>
                ) : undefined
              }
            />
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={sort + debouncedSearch}
                className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {filtered.map((listing, i) => {
                  const eventName = (listing as any).event?.name || (listing as any).ticket?.event?.name || 'Event Ticket';
                  const sellerAddr = listing.sellerAddress || listing.sellerWallet || listing.seller_wallet || '';
                  const isOwn = account?.address?.toLowerCase() === sellerAddr.toLowerCase();
                  const createdDate = listing.createdAt || listing.created_at;

                  return (
                    <motion.div
                      key={listing.id}
                      initial="hidden" animate="visible" variants={fadeUp} custom={i}
                    >
                      <TiltCard glowColor="rgba(0, 217, 255, 0.1)">
                      <div className="group rounded-2xl border border-border/30 bg-surface/80 backdrop-blur-sm overflow-hidden hover:border-accent/40 hover:shadow-xl hover:shadow-accent/10 transition-all">
                        <div className="h-36 bg-gradient-to-br from-primary/15 via-accent/5 to-accent/10 flex items-center justify-center relative">
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary/40">
                            <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
                          </svg>
                          <div className="absolute top-3 right-3">
                            <Badge status={listing.status} />
                          </div>
                        </div>

                        <div className="p-4 space-y-3">
                          <h3 className="font-bold line-clamp-1">{eventName}</h3>

                          <div className="flex items-center gap-2 text-xs text-muted">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                            <span className="font-mono">{shortenAddress(sellerAddr)}</span>
                            {isOwn && <span className="text-primary text-[10px] font-semibold">(You)</span>}
                          </div>

                          {createdDate && (
                            <p className="text-xs text-muted">Listed {formatRelativeTime(createdDate)}</p>
                          )}

                          <div className="flex items-center justify-between pt-2 border-t border-border/30">
                            <span className="text-lg font-bold text-primary tabular-nums">
                              {formatPrice(listing.asking_price_wei || listing.askingPriceWei || listing.price)}
                            </span>

                            {isOwn ? (
                              <span className="text-xs text-muted bg-surface-light rounded-lg px-2 py-1">Your listing</span>
                            ) : account ? (
                              <Button size="sm" onClick={() => handleBuy(listing)}>Buy Now</Button>
                            ) : (
                              <span className="text-xs text-muted">Connect wallet</span>
                            )}
                          </div>
                        </div>
                      </div>
                      </TiltCard>
                    </motion.div>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </main>

      {/* Buy Transaction Modal */}
      <Modal
        open={showBuyModal}
        onClose={txStep === 'success' || txStep === 'error' ? closeBuyModal : () => {}}
        title="Purchasing Ticket"
        size="sm"
      >
        <div className="py-2">
          {buyingListing && txStep && (
            <>
              <div className="mb-4 rounded-xl bg-surface-light p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">Price</span>
                  <span className="font-bold text-primary">{formatPrice(buyingListing.asking_price_wei || buyingListing.askingPriceWei || buyingListing.price)}</span>
                </div>
              </div>
              <TransactionTracker
                currentStep={txStep}
                errorMessage={txError || undefined}
                txHash={txHash || undefined}
                blockExplorer={BLOCK_EXPLORER}
              />
            </>
          )}

          {txStep === 'success' && (
            <div className="mt-6 flex gap-3 justify-center">
              <Button variant="outline" onClick={closeBuyModal}>Close</Button>
              <Button onClick={() => { closeBuyModal(); router.push('/tickets'); }}>View My Tickets</Button>
            </div>
          )}

          {txStep === 'error' && (
            <div className="mt-6 flex gap-3 justify-center">
              <Button variant="outline" onClick={closeBuyModal}>Cancel</Button>
              {buyingListing && <Button onClick={() => handleBuy(buyingListing)}>Try Again</Button>}
            </div>
          )}
        </div>
      </Modal>

      {/* List Ticket Modal */}
      <Modal
        open={showListModal}
        onClose={() => { setShowListModal(false); setListingTicket(null); setListPrice(''); }}
        title="List Ticket for Sale"
      >
        <div className="space-y-4">
          {!listingTicket ? (
            <>
              <p className="text-sm text-muted">Select a ticket to list:</p>
              {myTickets.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-muted">No tickets available for listing.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => { setShowListModal(false); router.push('/events'); }}
                  >
                    Browse Events
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar">
                  {myTickets.map((t) => {
                    const tEventId = t.eventId || t.event_id;
                    const tTokenId = t.tokenId ?? t.token_id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setListingTicket(t)}
                        className="w-full rounded-xl border border-border bg-surface p-3 text-left hover:border-primary/30 transition-colors"
                      >
                        <p className="font-semibold text-sm">
                          {t.event?.name || t.event?.title || `Event #${tEventId}`}
                        </p>
                        <p className="text-xs text-muted mt-1">
                          {t.tier?.name || 'General'} · Token #{tTokenId ?? '?'}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="rounded-xl border border-border bg-surface-light p-3">
                <p className="font-semibold text-sm">
                  {listingTicket.event?.name || listingTicket.event?.title || `Event #${listingTicket.eventId || listingTicket.event_id}`}
                </p>
                <p className="text-xs text-muted mt-1">Token #{listingTicket.tokenId ?? listingTicket.token_id ?? '?'}</p>
              </div>
              <Input
                label="Price (POL)"
                type="number"
                step="0.001"
                min="0"
                value={listPrice}
                onChange={(e) => setListPrice(e.target.value)}
                placeholder="0.1"
              />
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setListingTicket(null)}>
                  Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleCreateListing}
                  loading={listingInProgress}
                  disabled={!listPrice || Number(listPrice) <= 0}
                >
                  Create Listing
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      <Footer />
    </div>
  );
}
