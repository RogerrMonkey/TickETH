'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Badge } from '@/components/Badge';
import { eventsApi, marketplaceApi } from '@/lib/api';
import { formatPrice, formatDate, shortenAddress } from '@/lib/utils';
import type { TickETHEvent, Listing } from '@/lib/types';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: 'easeOut' as const },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

/* ─── Data ───────────────────────────────────────────── */
const features = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
    title: 'Fraud-Proof',
    description: 'Each ticket is a unique NFT on Polygon — impossible to duplicate or counterfeit.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
    title: 'Secure Check-in',
    description: 'Two-step verification with QR scan + wallet signature. No fake entries.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
    title: 'Instant Transfers',
    description: 'Send or resell tickets peer-to-peer. Ownership transfers on-chain in seconds.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
        <path d="M16 16h5v5" />
      </svg>
    ),
    title: 'Low Gas Fees',
    description: 'Built on Polygon L2 — minting costs a fraction of a cent.',
  },
];

const howItWorks = [
  {
    step: '01',
    title: 'Connect Wallet',
    description: 'Sign in with MetaMask, Coinbase, or any supported wallet in one click.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    step: '02',
    title: 'Mint Your Ticket',
    description: 'Browse events, select your tier, and mint an NFT ticket directly to your wallet.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
        <path d="M13 5v2" /><path d="M13 17v2" /><path d="M13 11v2" />
      </svg>
    ),
  },
  {
    step: '03',
    title: 'Attend & Enjoy',
    description: 'Show your NFT ticket at the venue for instant QR-code verification.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m9 12 2 2 4-4" />
        <circle cx="12" cy="12" r="10" />
      </svg>
    ),
  },
];

const trustLogos = ['Polygon', 'Thirdweb', 'ERC-721', 'IPFS', 'SIWE'];

const faqs = [
  { q: 'What is TickETH?', a: 'TickETH is a blockchain-based event ticketing platform built on Polygon. Every ticket is a unique ERC-721 NFT that you truly own.' },
  { q: 'Do I need crypto to buy tickets?', a: 'You need a small amount of POL (Polygon\'s native token) to pay for gas fees and the ticket price. Tickets are affordable — gas costs less than $0.01.' },
  { q: 'What wallets are supported?', a: 'We support MetaMask, Coinbase Wallet, Rainbow, and email/phone-based wallets via our social login feature.' },
  { q: 'Can I resell my ticket?', a: 'Yes! If the organizer allows resale, you can list your ticket on our built-in marketplace. All transfers happen on-chain with full transparency.' },
  { q: 'How does check-in work?', a: 'At the event, a volunteer scans your QR code. You confirm via wallet signature to verify ownership. It\'s 2-step, fraud-proof verification.' },
  { q: 'Is this on mainnet?', a: 'Currently deployed on Polygon Amoy testnet. Mainnet deployment is planned after security audits.' },
];

/* ─── Stats: try real data, fallback to defaults ──── */
const defaultStats = [
  { label: 'Gas per Mint', value: '<$0.01' },
  { label: 'Confirmation', value: '~2s' },
  { label: 'Network', value: 'Polygon' },
  { label: 'Standard', value: 'ERC-721' },
];

/* ─── FAQ Accordion ──────────────────────────────── */
function FAQItem({ q, a, open, toggle }: { q: string; a: string; open: boolean; toggle: () => void }) {
  return (
    <div className="border-b border-border">
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between py-5 text-left group"
        aria-expanded={open}
      >
        <span className="text-sm font-semibold group-hover:text-primary transition-colors">{q}</span>
        <svg
          width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={`shrink-0 text-muted transition-transform duration-200 ${open ? 'rotate-45' : ''}`}
        >
          <path d="M12 5v14" /><path d="M5 12h14" />
        </svg>
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        className="overflow-hidden"
      >
        <p className="pb-5 text-sm text-muted leading-relaxed">{a}</p>
      </motion.div>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────── */
export default function HomePage() {
  const [featuredEvents, setFeaturedEvents] = useState<TickETHEvent[]>([]);
  const [recentListings, setRecentListings] = useState<Listing[]>([]);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    eventsApi.list({ page: 1, limit: 6 }).then((r) => setFeaturedEvents(r.data ?? [])).catch(() => {});
    marketplaceApi.listings({ page: 1, limit: 4, status: 'active' }).then((r) => setRecentListings(r.data ?? [])).catch(() => {});
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        {/* ── Hero ─────────────────────────────────── */}
        <section className="relative overflow-hidden px-4 pt-20 pb-24 sm:pt-28 sm:pb-32">
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-primary/10 blur-[120px]" />
            <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-accent/8 blur-[100px]" />
          </div>

          <div className="mx-auto max-w-4xl text-center">
            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary mb-6">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                Live on Polygon Amoy Testnet
              </span>
            </motion.div>

            <motion.h1
              className="text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl"
              initial="hidden" animate="visible" variants={fadeUp} custom={1}
            >
              Event Tickets as{' '}
              <span className="gradient-text">NFTs</span>
            </motion.h1>

            <motion.p
              className="mt-6 text-lg text-muted max-w-2xl mx-auto leading-relaxed"
              initial="hidden" animate="visible" variants={fadeUp} custom={2}
            >
              TickETH is a blockchain-based ticketing platform that eliminates fraud,
              enables transparent ownership, and powers secure event-day check-in —
              all with the efficiency of Polygon L2.
            </motion.p>

            <motion.div
              className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
              initial="hidden" animate="visible" variants={fadeUp} custom={3}
            >
              <Link
                href="/events"
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-primary px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-primary/25 hover:bg-primary-light transition-all active:scale-[0.97]"
              >
                Browse Events
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="ml-2"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </Link>
              <Link
                href="/organizer"
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-border px-8 py-3.5 text-base font-semibold text-foreground hover:bg-surface-light transition-all active:scale-[0.97]"
              >
                Become an Organizer
              </Link>
            </motion.div>

            {/* Trust indicators */}
            <motion.div
              className="mt-14 flex flex-wrap items-center justify-center gap-6"
              initial="hidden" animate="visible" variants={fadeUp} custom={4}
            >
              <span className="text-xs text-muted mr-2">Powered by</span>
              {trustLogos.map((name) => (
                <span key={name} className="text-xs font-semibold text-muted/70 uppercase tracking-widest">
                  {name}
                </span>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ── Stats strip ─────────────────────────── */}
        <section className="border-y border-border bg-surface/50">
          <div className="mx-auto max-w-5xl px-4 py-8 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {defaultStats.map((s, i) => (
              <motion.div
                key={s.label}
                initial="hidden" whileInView="visible" viewport={{ once: true }}
                variants={fadeUp} custom={i}
              >
                <p className="text-2xl font-bold text-primary">{s.value}</p>
                <p className="text-sm text-muted mt-1">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── How It Works ────────────────────────── */}
        <section className="px-4 py-20 sm:py-28">
          <div className="mx-auto max-w-5xl">
            <motion.div
              className="text-center mb-16"
              initial="hidden" whileInView="visible" viewport={{ once: true }}
              variants={fadeUp} custom={0}
            >
              <h2 className="text-3xl font-extrabold sm:text-4xl">
                How It <span className="text-primary">Works</span>
              </h2>
              <p className="mt-3 text-muted max-w-xl mx-auto">
                Three simple steps to own your event experience.
              </p>
            </motion.div>

            <div className="grid gap-8 sm:grid-cols-3">
              {howItWorks.map((step, i) => (
                <motion.div
                  key={step.step}
                  className="relative text-center group"
                  initial="hidden" whileInView="visible" viewport={{ once: true }}
                  variants={fadeUp} custom={i}
                >
                  <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 text-primary group-hover:bg-primary/25 transition-colors">
                    {step.icon}
                  </div>
                  <span className="text-xs font-bold text-primary/60 uppercase tracking-widest">{step.step}</span>
                  <h3 className="mt-2 text-lg font-bold">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted leading-relaxed">{step.description}</p>
                  {/* Connector line */}
                  {i < howItWorks.length - 1 && (
                    <div className="hidden sm:block absolute top-8 left-[calc(50%+40px)] w-[calc(100%-80px)] border-t border-dashed border-border" />
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features ────────────────────────────── */}
        <section className="px-4 py-20 sm:py-28 bg-surface/30">
          <div className="mx-auto max-w-6xl">
            <motion.div
              className="text-center mb-16"
              initial="hidden" whileInView="visible" viewport={{ once: true }}
              variants={fadeUp} custom={0}
            >
              <h2 className="text-3xl font-extrabold sm:text-4xl">
                Why <span className="text-primary">TickETH</span>?
              </h2>
              <p className="mt-3 text-muted max-w-xl mx-auto">
                Every feature is designed to solve real problems in event ticketing.
              </p>
            </motion.div>

            <motion.div
              className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
              initial="hidden" whileInView="visible" viewport={{ once: true }}
              variants={staggerContainer}
            >
              {features.map((f) => (
                <motion.div
                  key={f.title}
                  className="group rounded-2xl border border-border bg-surface p-6 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300"
                  variants={fadeUp}
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary group-hover:bg-primary/25 transition-colors">
                    {f.icon}
                  </div>
                  <h3 className="text-base font-bold">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted leading-relaxed">{f.description}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ── Featured Events ─────────────────────── */}
        {featuredEvents.length > 0 && (
          <section className="px-4 py-20 sm:py-28">
            <div className="mx-auto max-w-6xl">
              <motion.div
                className="flex items-end justify-between mb-10"
                initial="hidden" whileInView="visible" viewport={{ once: true }}
                variants={fadeUp} custom={0}
              >
                <div>
                  <h2 className="text-3xl font-extrabold">Upcoming Events</h2>
                  <p className="mt-2 text-muted">Discover events and mint your tickets</p>
                </div>
                <Link href="/events" className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-light transition-colors">
                  View All
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </Link>
              </motion.div>

              <motion.div
                className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
                initial="hidden" whileInView="visible" viewport={{ once: true }}
                variants={staggerContainer}
              >
                {featuredEvents.slice(0, 6).map((event) => (
                  <motion.div key={event.id} variants={fadeUp}>
                    <Link
                      href={`/events/${event.id}`}
                      className="group block rounded-2xl border border-border bg-surface overflow-hidden hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300"
                    >
                      {/* Image placeholder */}
                      <div className="h-44 bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-primary/40">
                          <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
                          <path d="M13 5v2" /><path d="M13 17v2" /><path d="M13 11v2" />
                        </svg>
                      </div>
                      <div className="p-5">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge status={event.status} />
                          {event.city && (
                            <span className="text-xs text-muted">{event.city}</span>
                          )}
                        </div>
                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {event.name || event.title}
                        </h3>
                        <p className="mt-1 text-sm text-muted">
                          {event.start_time || event.startTime
                            ? formatDate(event.start_time || event.startTime || '')
                            : event.date
                              ? formatDate(event.date)
                              : 'TBA'}
                        </p>
                        {event.venue && (
                          <p className="mt-0.5 text-xs text-muted truncate">{event.venue}</p>
                        )}
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>

              <div className="mt-8 text-center sm:hidden">
                <Link href="/events" className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
                  View All Events
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* ── Marketplace Preview ─────────────────── */}
        {recentListings.length > 0 && (
          <section className="px-4 py-20 sm:py-28 bg-surface/30">
            <div className="mx-auto max-w-6xl">
              <motion.div
                className="flex items-end justify-between mb-10"
                initial="hidden" whileInView="visible" viewport={{ once: true }}
                variants={fadeUp} custom={0}
              >
                <div>
                  <h2 className="text-3xl font-extrabold">Marketplace</h2>
                  <p className="mt-2 text-muted">Browse and buy resale tickets from other users</p>
                </div>
                <Link href="/marketplace" className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-light transition-colors">
                  Browse All
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </Link>
              </motion.div>

              <motion.div
                className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
                initial="hidden" whileInView="visible" viewport={{ once: true }}
                variants={staggerContainer}
              >
                {recentListings.map((listing) => (
                  <motion.div key={listing.id} variants={fadeUp}>
                    <Link
                      href={`/marketplace/${listing.id}`}
                      className="group block rounded-2xl border border-border bg-surface p-5 hover:border-primary/40 transition-all duration-300"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center text-primary">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/></svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate">
                            {listing.event?.name || listing.ticket?.event?.name || 'Ticket'}
                          </p>
                          <p className="text-xs text-muted">
                            {shortenAddress(listing.sellerWallet || listing.seller_wallet || listing.sellerAddress || '')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-primary">{formatPrice(listing.price)}</span>
                        <Badge status={listing.status} />
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </section>
        )}

        {/* ── FAQ ─────────────────────────────────── */}
        <section className="px-4 py-20 sm:py-28">
          <div className="mx-auto max-w-3xl">
            <motion.div
              className="text-center mb-12"
              initial="hidden" whileInView="visible" viewport={{ once: true }}
              variants={fadeUp} custom={0}
            >
              <h2 className="text-3xl font-extrabold sm:text-4xl">
                Frequently Asked <span className="text-primary">Questions</span>
              </h2>
            </motion.div>

            <motion.div
              initial="hidden" whileInView="visible" viewport={{ once: true }}
              variants={fadeUp} custom={1}
            >
              {faqs.map((faq, i) => (
                <FAQItem
                  key={i}
                  q={faq.q}
                  a={faq.a}
                  open={openFaq === i}
                  toggle={() => setOpenFaq(openFaq === i ? null : i)}
                />
              ))}
            </motion.div>
          </div>
        </section>

        {/* ── CTA ─────────────────────────────────── */}
        <section className="px-4 pb-24">
          <div className="mx-auto max-w-3xl text-center">
            <motion.div
              className="rounded-3xl border border-border bg-gradient-to-br from-surface to-surface-light p-12 relative overflow-hidden"
              initial="hidden" whileInView="visible" viewport={{ once: true }}
              variants={fadeUp} custom={0}
            >
              <div className="absolute inset-0 bg-primary/5 blur-3xl" />
              <div className="relative">
                <h2 className="text-2xl sm:text-3xl font-extrabold">
                  Ready to experience the future of ticketing?
                </h2>
                <p className="mt-3 text-muted">
                  Connect your wallet and start exploring events on Polygon.
                </p>
                <Link
                  href="/events"
                  className="mt-8 inline-flex items-center rounded-xl bg-primary px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-primary/25 hover:bg-primary-light transition-all active:scale-[0.97]"
                >
                  Get Started
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="ml-2"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
