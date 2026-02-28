# Pharos — Deployment Guide

This document covers all deployment processes: Railway (frontend), smart contracts (Monad testnet), and custom domain setup (pharos.gives).

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Railway Setup](#initial-railway-setup)
3. [Environment Variables Reference](#environment-variables-reference)
4. [Custom Domain (pharos.gives)](#custom-domain-pharosgives)
5. [Password Protection](#password-protection)
6. [Smart Contract Deployment](#smart-contract-deployment)
7. [Ongoing Deployments](#ongoing-deployments)

---

## Prerequisites

Before starting, ensure you have the following accounts and tools:

| Tool / Account | Purpose | Link |
|---|---|---|
| Railway account | Frontend hosting | https://railway.com |
| Railway CLI | CLI deploys + Railway MCP | `npm install -g @railway/cli` |
| GitHub account | Repo + auto-deploy trigger | — |
| Foundry | Contract compilation + deployment | `curl -L https://foundry.paradigm.xyz \| bash` |
| Turnkey account | Embedded wallet kit | https://app.turnkey.com |
| Alchemy account | Monad testnet RPC | https://dashboard.alchemy.com |

---

## Initial Railway Setup

### Step 1: Create the Railway Project

1. Log in to [railway.com](https://railway.com)
2. Click **New Project → Deploy from GitHub repo**
3. Authorize Railway to access your GitHub account if prompted
4. Select the `pharos-hackathon` repository

### Step 2: Configure the Service Root Directory

> Railway must know the app lives in `frontend/`, not the repo root.

1. In the Railway dashboard, click on the new service
2. Go to **Settings → Source**
3. Set **Root Directory** to `frontend`
4. Railway will now use `frontend/railway.json` for build/start commands

### Step 3: Set Environment Variables

In the Railway dashboard, go to **Variables** and add every variable from the list below.

> **Important:** Do NOT check in real values to git — only `.env.example` (with blanks) is committed.

```
NEXT_PUBLIC_ORGANIZATION_ID=<your Turnkey org ID>
NEXT_PUBLIC_AUTH_PROXY_CONFIG_ID=<your Turnkey auth proxy config ID>
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<your Google OAuth client ID>
NEXT_PUBLIC_OAUTH_REDIRECT_URI=https://pharos.gives
NEXT_PUBLIC_ALCHEMY_API_KEY=<your Alchemy API key>
NEXT_PUBLIC_CHAIN_ID=10143
NEXT_PUBLIC_FACTORY_ADDRESS=<deployed factory contract address>
NEXT_PUBLIC_WC_PROJECT_ID=<WalletConnect project ID>
NEXT_PUBLIC_UNLINK_GATEWAY_URL=https://api.unlink.xyz
NEXT_PUBLIC_UNLINK_POOL_ADDRESS=0x0813da0a10328e5ed617d37e514ac2f6fa49a254
DEPLOYER_PRIVATE_KEY=<deployer wallet private key — server-only>
SITE_PASSWORD=nodoj
```

### Step 4: Trigger Initial Deploy

After setting variables, click **Deploy** (or push any commit to `main`). Railway will:
1. Run `npm ci && npm run build` using nixpacks
2. Start the app with `npm run start`
3. Assign a `*.railway.app` URL

---

## Environment Variables Reference

| Variable | Public? | Description |
|---|---|---|
| `NEXT_PUBLIC_ORGANIZATION_ID` | Yes | Turnkey organization ID |
| `NEXT_PUBLIC_AUTH_PROXY_CONFIG_ID` | Yes | Turnkey auth proxy config |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Yes | Google OAuth for Turnkey sign-in |
| `NEXT_PUBLIC_OAUTH_REDIRECT_URI` | Yes | OAuth callback URL — must match Google Console allowed origins |
| `NEXT_PUBLIC_ALCHEMY_API_KEY` | Yes | Alchemy RPC key for Monad testnet |
| `NEXT_PUBLIC_CHAIN_ID` | Yes | `10143` (Monad testnet) |
| `NEXT_PUBLIC_FACTORY_ADDRESS` | Yes | Deployed `PharosCampaignFactory` address |
| `NEXT_PUBLIC_WC_PROJECT_ID` | Yes | WalletConnect project ID |
| `NEXT_PUBLIC_UNLINK_GATEWAY_URL` | Yes | Unlink privacy gateway |
| `NEXT_PUBLIC_UNLINK_POOL_ADDRESS` | Yes | Unlink privacy pool contract |
| `DEPLOYER_PRIVATE_KEY` | **No** | Server-only. Used by `/api/prefund` to send gas to new wallets |
| `SITE_PASSWORD` | **No** | Server-only. Password gate for the entire site (default: `nodoj`) |

---

## Custom Domain (pharos.gives)

### Step 1: Add Domain in Railway

1. In the Railway dashboard, go to your service → **Settings → Networking**
2. Click **Add Custom Domain**
3. Enter `pharos.gives`
4. Railway will display a **CNAME target** (looks like `<something>.railway.app`)

### Step 2: Configure Squarespace DNS

1. Log in to [Squarespace Domains](https://account.squarespace.com/domains)
2. Click `pharos.gives` → **DNS Settings**
3. Scroll to **Custom Records**
4. Add a new record:
   - **Type:** `CNAME`
   - **Host:** `@` (or blank, representing the root domain)
   - **Data:** paste the CNAME target from Railway
   - **TTL:** 3600 (or default)

> **Note:** Some DNS providers don't allow CNAME on the root (`@`). If Squarespace blocks this, use an **A record** pointing to Railway's IP instead. Check Railway's docs for the current IP or use their ALIAS/ANAME record type if supported.

5. Save changes — DNS propagation takes 5–30 minutes

### Step 3: Update Google OAuth Allowed Origins

1. Go to [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services → Credentials**
2. Click your OAuth 2.0 Client ID
3. Under **Authorized JavaScript origins**, add: `https://pharos.gives`
4. Under **Authorized redirect URIs**, add: `https://pharos.gives`
5. Save

### Step 4: Verify in Railway

Once DNS propagates, Railway will automatically provision a TLS certificate via Let's Encrypt. The site will be live at `https://pharos.gives`.

---

## Password Protection

The site is protected by a password gate. All routes redirect to `/login` unless a valid session cookie is present.

### How It Works

- `frontend/src/middleware.ts` — intercepts every request and checks for the `pharos-auth` cookie
- `frontend/src/app/api/auth/login/route.ts` — POST endpoint that validates the password and sets the cookie
- `frontend/src/app/login/page.tsx` — the login page shown to unauthenticated visitors
- Cookie expires after **7 days**

### Changing the Password

Update the `SITE_PASSWORD` variable in Railway (or your `.env.local` for local dev):

```
SITE_PASSWORD=yournewpassword
```

Existing sessions will be invalidated automatically because the cookie token is derived from the password.

### Removing Password Protection

To disable the gate entirely, either:
- Delete `frontend/src/middleware.ts`, or
- Set `SITE_PASSWORD=` (empty) and update the middleware to always pass

---

## Smart Contract Deployment

### Prerequisites

Ensure the following are configured in your shell environment (or in `.env` at the repo root):

```bash
export DEPLOYER_PRIVATE_KEY=0x...
export FEE_COLLECTOR_ADDRESS=0x...
```

Foundry must be installed:

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### Deploying for the First Time (or Redeploying)

```bash
cd contracts

# Install dependencies
forge install

# Run tests before deploying
forge test -vvv

# Deploy to Monad testnet
forge script script/Deploy.s.sol:DeployPharos \
  --rpc-url https://testnet-rpc.monad.xyz \
  --broadcast \
  --private-key $DEPLOYER_PRIVATE_KEY
```

After a successful deployment, the console will print:

```
PharosCampaignFactory deployed at: 0x...
Token (USDC): 0xf817257fed379853cDe0fa4F97AB987181B1E5Ea
```

### Update Frontend After New Contract Deployment

1. Copy the new factory address from the deployment output
2. Update `NEXT_PUBLIC_FACTORY_ADDRESS` in Railway dashboard:
   - Go to **Variables** → edit `NEXT_PUBLIC_FACTORY_ADDRESS`
   - Paste the new address
   - Railway will automatically redeploy
3. For local development, update `frontend/.env.local`:
   ```
   NEXT_PUBLIC_FACTORY_ADDRESS=0xYourNewAddressHere
   ```

### Verifying the Contract (Optional)

Monad testnet has a block explorer. Once deployed, you can verify the contract source:

```bash
forge verify-contract \
  <FACTORY_ADDRESS> \
  contracts/src/PharosCampaignFactory.sol:PharosCampaignFactory \
  --rpc-url https://testnet-rpc.monad.xyz \
  --constructor-args $(cast abi-encode "constructor(address,address,uint16)" \
    0xf817257fed379853cDe0fa4F97AB987181B1E5Ea \
    $FEE_COLLECTOR_ADDRESS \
    100)
```

### Changing Fee or Fee Collector

The fee is hardcoded to `100` basis points (1%) in `Deploy.s.sol:14`. To change:

1. Edit `contracts/script/Deploy.s.sol`:
   ```solidity
   uint16 feeBasisPoints = 200; // 2%
   ```
2. Run the deploy command again
3. Update `NEXT_PUBLIC_FACTORY_ADDRESS` in Railway

---

## Ongoing Deployments

### Auto-Deploy on Push

Railway is connected to the GitHub repo and auto-deploys on every push to `main`.

**Workflow:**
```bash
git add .
git commit -m "feat: your changes"
git push origin main
# Railway picks up the push and deploys automatically
```

### Manual Deploy via Railway CLI

```bash
# Authenticate (first time only)
railway login

# Deploy from the frontend directory
cd frontend
railway up
```

### Checking Deploy Status

```bash
railway status
railway logs
```

Or check the Railway dashboard at [railway.com](https://railway.com).

### Rollback

In the Railway dashboard:
1. Go to your service → **Deployments**
2. Find the last working deployment
3. Click **Redeploy** on that version

---

## Quick Reference

| Action | Command |
|---|---|
| Deploy contracts | `forge script script/Deploy.s.sol:DeployPharos --rpc-url https://testnet-rpc.monad.xyz --broadcast --private-key $DEPLOYER_PRIVATE_KEY` |
| Run contract tests | `forge test -vvv` (from `contracts/`) |
| Deploy frontend manually | `cd frontend && railway up` |
| View Railway logs | `railway logs` |
| Change site password | Update `SITE_PASSWORD` in Railway variables |
