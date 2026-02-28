import { Shield, Lock, Zap, Coins, ExternalLink, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-20">

      {/* Hero */}
      <section className="text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-[var(--color-navy)] leading-tight">
          About Pharos
        </h1>
        <p className="mt-6 text-lg text-[var(--color-muted)] max-w-2xl mx-auto leading-relaxed">
          A privacy-preserving, assurance-contract crowdfunding protocol built on Monad.
          Fund causes you believe in — with a guarantee that if the goal isn&apos;t met, your money comes back.
        </p>
        <div className="mt-8 flex justify-center gap-4 flex-wrap">
          <Link
            href="/"
            className="btn-primary px-6 py-3 rounded-xl font-semibold flex items-center gap-2"
          >
            Browse Campaigns
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/create"
            className="px-6 py-3 rounded-xl bg-white/10 text-[var(--color-navy)] font-medium hover:bg-white/15 border border-[var(--color-border)] transition-all"
          >
            Start a Campaign
          </Link>
        </div>
      </section>

      {/* Lighthouse Inspiration */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-8 sm:p-10">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shrink-0 mt-0.5 shadow-lg shadow-amber-900/40">
            <span className="text-white text-lg font-bold">₿</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[var(--color-navy)]">
              Inspired by Lighthouse
            </h2>
            <p className="text-sm text-violet-400 mt-0.5">Mike Hearn&apos;s Bitcoin assurance contract protocol, c. 2013</p>
          </div>
        </div>
        <div className="space-y-4 text-[var(--color-muted)] leading-relaxed">
          <p>
            Pharos draws its core design from{" "}
            <a
              href="https://github.com/mikehearn/lighthouse"
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-400 hover:underline hover:text-violet-300 transition-colors inline-flex items-center gap-1"
            >
              Lighthouse
              <ExternalLink className="w-3 h-3" />
            </a>
            , a crowdfunding application built on Bitcoin by Mike Hearn. Lighthouse introduced the concept of
            assurance contracts to the crypto world: donors pledge funds to a shared goal, but
            nothing moves until the target is fully reached. If it fails, every satoshi is returned.
          </p>
          <p>
            Bitcoin&apos;s UTXO model made assurance contracts possible through a clever trick — transaction
            inputs could be partially signed and only combined when the goal was met. But Bitcoin lacked
            the programmability to make this trustless and general-purpose at scale.
          </p>
          <p>
            Pharos reimagines Lighthouse for the smart-contract era. Using Solidity on Monad, we replace
            the off-chain coordination of Bitcoin assurance contracts with an on-chain escrow that enforces
            the all-or-nothing guarantee automatically — no trusted third party, no server needed.
          </p>
        </div>
      </section>

      {/* How Assurance Contracts Work */}
      <section>
        <h2 className="text-2xl font-bold text-[var(--color-navy)] mb-3">
          What Is an Assurance Contract?
        </h2>
        <p className="text-[var(--color-muted)] leading-relaxed mb-8">
          An assurance contract solves a classic coordination problem: people want to fund a public good,
          but only if enough others join in. Without a mechanism to enforce this, individual donors face
          the risk of contributing while the campaign falls short — wasting their money.
          Assurance contracts remove that risk entirely.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            {
              step: "1",
              title: "Pledge Safely",
              description:
                "Donors send funds to the campaign smart contract. Funds are locked in escrow — neither the campaign creator nor anyone else can touch them.",
            },
            {
              step: "2",
              title: "Goal Must Be Reached",
              description:
                "If the campaign reaches its target before the deadline, it is finalized and funds flow to the recipient. The contract enforces this automatically.",
            },
            {
              step: "3",
              title: "Fail Safe Refunds",
              description:
                "If the goal isn't met by the deadline, every donor can claim a full refund. There is no counterparty risk — the smart contract guarantees it.",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 text-white font-bold flex items-center justify-center mb-4 shadow-lg shadow-violet-900/40">
                {item.step}
              </div>
              <h3 className="text-base font-semibold text-[var(--color-navy)] mb-2">
                {item.title}
              </h3>
              <p className="text-sm text-[var(--color-muted)] leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Privacy */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-teal-900/40">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-[var(--color-navy)]">Privacy by Design</h2>
        </div>
        <div className="space-y-4 text-[var(--color-muted)] leading-relaxed">
          <p>
            Public blockchains are transparent by default — every transaction is visible to anyone.
            This creates a real chilling effect for donors who support causes that may be politically
            sensitive, legally contested, or simply personal. Pharos addresses this directly.
          </p>
          <p>
            Donors can choose to make a <strong className="text-[var(--color-navy)]">shielded donation</strong>.
            Instead of recording the donor&apos;s address on-chain, a cryptographic commitment hash is stored.
            Only the donor knows the pre-image. They can later prove they donated — without revealing
            how much or who they are — by revealing the commitment on their own terms.
          </p>
          <p>
            This allows whistleblowers, activists, and privacy-conscious individuals to support causes
            they believe in without leaving a permanent on-chain footprint linking them to the campaign.
          </p>
        </div>
      </section>

      {/* Milestone Matching */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-900/40">
            <Coins className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-[var(--color-navy)]">Milestone Matching</h2>
        </div>
        <p className="text-[var(--color-muted)] leading-relaxed">
          Pharos supports on-chain milestone matches — large donors or sponsors can pledge a matching
          contribution that unlocks only once a campaign crosses a funding milestone. This incentivizes
          smaller donors (&ldquo;your $50 unlocks a $10,000 match&rdquo;) and creates natural momentum moments
          that drive campaigns to completion. Match pledges are held in the same escrow and subject
          to the same all-or-nothing guarantee.
        </p>
      </section>

      {/* Why Monad */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-900/40">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-[var(--color-navy)]">Built on Monad</h2>
        </div>
        <div className="space-y-4 text-[var(--color-muted)] leading-relaxed">
          <p>
            Pharos runs on{" "}
            <a
              href="https://monad.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-400 hover:underline hover:text-violet-300 transition-colors inline-flex items-center gap-1"
            >
              Monad
              <ExternalLink className="w-3 h-3" />
            </a>
            , a high-performance EVM-compatible blockchain with sub-second finality and 10,000+ TPS.
            This matters for crowdfunding because:
          </p>
          <ul className="space-y-2 pl-4 list-disc list-outside marker:text-violet-400">
            <li>
              <strong className="text-[var(--color-navy)]">Low fees</strong> — donors aren&apos;t priced
              out by gas costs. A $5 donation shouldn&apos;t cost $3 in fees.
            </li>
            <li>
              <strong className="text-[var(--color-navy)]">Fast finality</strong> — donors see their
              contribution confirmed almost instantly, creating a better user experience.
            </li>
            <li>
              <strong className="text-[var(--color-navy)]">EVM compatible</strong> — developers can
              audit and extend Pharos contracts using familiar Solidity tooling.
            </li>
          </ul>
          <p>
            USDC is used as the funding token, providing a stable, dollar-denominated unit of account
            that donors and campaign creators can reason about without worrying about token volatility.
          </p>
        </div>
      </section>

      {/* Open Source */}
      <section className="bg-gradient-to-br from-violet-900/20 to-purple-900/20 border border-violet-500/20 rounded-2xl p-8 text-center">
        <Lock className="w-8 h-8 text-violet-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-[var(--color-navy)] mb-3">Trustless &amp; Open Source</h2>
        <p className="text-[var(--color-muted)] leading-relaxed max-w-xl mx-auto mb-6">
          Pharos smart contracts are fully open source and verifiable on-chain. There are no admin keys,
          no upgrades, and no ability for the team to freeze or redirect funds. The protocol is the contract —
          read it, audit it, fork it.
        </p>
        <a
          href="https://github.com/mlewellen/pharos-hackathon"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 transition-colors font-medium"
        >
          View on GitHub
          <ExternalLink className="w-4 h-4" />
        </a>
      </section>

    </div>
  );
}
