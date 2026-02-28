import { PharosLogo } from "@/components/ui/PharosLogo";

export function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)] mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <PharosLogo className="w-5 h-5 text-[var(--color-beacon)]" />
            <span className="text-sm font-semibold text-[var(--color-ocean)]">
              Pharos Protocol
            </span>
          </div>
          <p className="text-xs text-[var(--color-muted)]">
            Guiding funds safely to shore &mdash; peer-to-peer crowdfunding with assurance contracts on Monad.
          </p>
          <div className="flex items-center gap-4 text-xs text-[var(--color-muted)]">
            <a
              href="https://monad-testnet.socialscan.io"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[var(--color-ocean)] transition-colors"
            >
              Explorer
            </a>
            <a
              href="https://faucet.monad.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[var(--color-ocean)] transition-colors"
            >
              Faucet
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
