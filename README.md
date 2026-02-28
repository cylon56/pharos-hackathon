# Pharos

Privacy-preserving assurance-contract crowdfunding on Monad.

Pharos lets campaign creators set up all-or-nothing funding campaigns where donors are guaranteed refunds if the goal isn't met. It adds a privacy layer via shielded donations (commit-reveal scheme) and integrates Unlink Protocol for on-chain transaction privacy. Milestone matching allows conditional pledges that activate automatically when funding thresholds are reached.

## Architecture

```
pharos-hackathon/
├── contracts/          # Solidity smart contracts (Foundry)
│   ├── src/
│   │   ├── FeeCollectible.sol          # Base contract for fee collector role
│   │   ├── PharosCampaign.sol          # Individual campaign logic
│   │   └── PharosCampaignFactory.sol   # Factory for deploying campaigns
│   ├── test/
│   │   ├── PharosCampaign.t.sol        # Core test suite (34 tests)
│   │   └── PharosCampaignAdvanced.t.sol # Edge cases + fuzz tests (74 tests)
│   └── script/
│       └── Deploy.s.sol                # Deployment script
└── frontend/           # Next.js 16 web application
    └── src/
        ├── app/                        # Pages (App Router)
        ├── components/                 # UI components
        ├── config/                     # Chain & contract config
        ├── lib/                        # Contract ABIs, utils, privacy helpers
        └── providers/                  # Turnkey + React Query + Unlink providers
```

## Smart Contracts

**PharosCampaignFactory** deploys and tracks individual campaign instances. Each **PharosCampaign** supports:

- **Public donations** — tracked on-chain with donor addresses
- **Shielded donations** — privacy-preserving via commit-reveal (`keccak256(amount, secret, nullifier)`)
- **Milestone matching** — conditional pledges that activate when a funding threshold is met (public or private)
- **Assurance contract** — full refunds for all donors if the campaign fails to reach its goal
- **Fee collection** — configurable protocol fee (up to 10%) taken on successful campaigns

### Campaign Lifecycle

1. Creator deploys a campaign via the factory with a funding goal, time window, and metadata URI
2. Donors contribute publicly or via shielded donations during the active period
3. Matchers can pledge conditional funds tied to milestone thresholds
4. After the end time, anyone calls `finalize()` — campaign is marked Successful or Failed
5. **Successful**: recipient claims funds (minus fee), fee collector claims fee
6. **Failed**: all donors can claim refunds; shielded donors reveal their commitment to refund to any address

## Frontend

Built with Next.js 16 (App Router), Tailwind CSS v4, and viem for blockchain interaction.

### Key Integrations

- **[Turnkey Embedded Wallet Kit](https://docs.turnkey.com/)** — Email OTP, passkey, Google OAuth, and external wallet authentication
- **[Unlink Protocol](https://unlink.xyz/)** — Shielded deposits/withdrawals for donor privacy
- **[viem](https://viem.sh/)** — TypeScript Ethereum client for contract reads and writes

### Pages

| Route | Description |
|---|---|
| `/` | Campaign discovery with hero, cards, and "How It Works" |
| `/campaign/[address]` | Campaign detail — donate, view progress, milestone matches, admin actions |
| `/create` | Create a new campaign with goal, duration, and metadata |
| `/dashboard` | User dashboard — campaigns created and donated to |

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [Foundry](https://book.getfoundry.sh/getting-started/installation) (forge, cast, anvil)
- A [Turnkey](https://app.turnkey.com/) account with Wallet Kit configured
- (Optional) [Alchemy](https://dashboard.alchemy.com/) API key for Monad testnet RPC

## Setup

### 1. Clone and install

```bash
git clone https://github.com/cylon56/pharos-hackathon.git
cd pharos-hackathon
```

### 2. Smart Contracts

```bash
cd contracts
forge install
forge build
```

Run tests:

```bash
forge test -v
```

### 3. Frontend

```bash
cd frontend
npm install
```

Copy the environment template and fill in your values:

```bash
cp ../.env.example .env.local
```

Required environment variables:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_ORGANIZATION_ID` | Turnkey organization ID |
| `NEXT_PUBLIC_AUTH_PROXY_CONFIG_ID` | Turnkey Wallet Kit proxy config |
| `NEXT_PUBLIC_ALCHEMY_API_KEY` | Alchemy API key for Monad testnet |
| `NEXT_PUBLIC_CHAIN_ID` | `10143` (Monad testnet) |
| `NEXT_PUBLIC_FACTORY_ADDRESS` | Deployed factory contract address |
| `NEXT_PUBLIC_WC_PROJECT_ID` | WalletConnect project ID |

Start the dev server:

```bash
npm run dev
```

## Deployment

### Deploy Contracts to Monad Testnet

Set deployment environment variables:

```bash
export DEPLOYER_PRIVATE_KEY=<your-deployer-private-key>
export FEE_COLLECTOR_ADDRESS=<fee-collector-address>
export MONAD_TESTNET_RPC_URL=https://monad-testnet.g.alchemy.com/v2/<your-key>
```

Deploy:

```bash
cd contracts
forge script script/Deploy.s.sol:DeployPharos --rpc-url $MONAD_TESTNET_RPC_URL --broadcast
```

Copy the deployed factory address to your frontend `.env.local` as `NEXT_PUBLIC_FACTORY_ADDRESS`.

### Deploy Frontend

```bash
cd frontend
npm run build
```

The app can be deployed to Vercel, Netlify, or any platform that supports Next.js.

## Testing

The test suite includes **108 tests** across two files:

- **PharosCampaign.t.sol** (34 tests) — Core functionality: factory, donations, shielded donations, finalization, claims, fees, refunds, milestone matching, reentrancy
- **PharosCampaignAdvanced.t.sol** (74 tests) — Edge cases, event verification, fuzz tests, integration lifecycle tests

### Fuzz tests cover:

- Arbitrary donation amounts
- Commitment hash uniqueness with random secrets/nullifiers
- Fee calculation invariants across all valid fee basis points
- Multiple donor totals
- Refund exact amounts
- Milestone threshold activation logic

Run with verbose output:

```bash
cd contracts
forge test -vvv
```

## Tech Stack

| Layer | Technology |
|---|---|
| Smart Contracts | Solidity 0.8.24, OpenZeppelin, Foundry |
| Frontend | Next.js 16, React 19, Tailwind CSS v4 |
| Blockchain Client | viem |
| Wallet Auth | Turnkey Embedded Wallet Kit |
| Privacy | Unlink Protocol, commit-reveal scheme |
| Target Chain | Monad Testnet (Chain ID: 10143) |

## License

MIT
