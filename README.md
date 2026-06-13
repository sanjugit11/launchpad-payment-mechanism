# SX Launchpad — Production-Grade Blockchain Ecosystem

> A full-stack stablecoin-powered investment and rewards launchpad deployed on **Base Sepolia**, featuring UUPS upgradeable smart contracts, a 3-of-3 multisig governance engine, AI security scanning, and a REST API backend.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Smart Contracts](#smart-contracts)
4. [Prerequisites](#prerequisites)
5. [Installation](#installation)
   - [1. Clone the Repository](#1-clone-the-repository)
   - [2. Smart Contracts Setup](#2-smart-contracts-setup)
   - [3. Database Setup](#3-database-setup)
   - [4. Backend Setup](#4-backend-setup)
   - [5. Frontend Setup](#5-frontend-setup)
6. [Environment Variables](#environment-variables)
7. [Workflow](#workflow)
   - [Compile & Test Contracts](#compile--test-contracts)
   - [Deploy to Base Sepolia](#deploy-to-base-sepolia)
   - [Run the Backend API](#run-the-backend-api)
   - [Run the AI Security Scanner](#run-the-ai-security-scanner)
   - [Run the Frontend](#run-the-frontend)
8. [API Reference](#api-reference)
9. [Smart Contract Details](#smart-contract-details)
10. [Fee & Reward Structure](#fee--reward-structure)
11. [Security Model](#security-model)
12. [Project Structure](#project-structure)
13. [CI/CD](#cicd)
14. [Contributing](#contributing)
15. [License](#license)

---

## Project Overview

**SX Launchpad** is a production-grade, stablecoin-powered blockchain ecosystem built on **Base Sepolia**. It enables:

- **Stablecoin Deposits** — Accept USDC (6 dec), USDT (6 dec), and DAI (18 dec) into a unified vault.
- **SX Unified Account (SXUA)** — Tracks uncommitted and committed stablecoin balances per user, accrues 0.12% daily APY, and earns 44% APY SXP staking rewards on committed balances.
- **Launchpad Engine** — Manages token sales, vesting locks, buyback windows, and enforces forfeiture penalties (configurable, e.g., 10%) on early exits.
- **Token Conversion** — SXP → SXCP conversion with a 12% protocol fee routed to the treasury.
- **Exchange Protocol (SXEP)** — Executes and settles token swaps with a 5% treasury fee on settlement.
- **Governance** — Strict 3-of-3 multisig with DMS Device Binding (physical hardware hash verification).
- **AI Security Scanner** — Automatically scans all Solidity contracts for reentrancy, access control gaps, overflow risks, timestamp dependence, and flash loan vectors, then writes `audit-report.json` and `security-report.md`.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         SX Launchpad                            │
├──────────────┬──────────────────┬───────────────┬──────────────┤
│  Frontend    │     Backend API   │  Smart Contracts│  Database  │
│  React/Vite  │  Node.js/Express │  Solidity 0.8.24│ PostgreSQL │
│  TypeScript  │  TypeScript       │  Base Sepolia   │            │
│  Wagmi/Ethers│  ethers v6        │  OpenZeppelin v5│            │
└──────────────┴──────────────────┴───────────────┴──────────────┘
```

### Smart Contract Layer

```
SXGovernance          ← 3-of-3 Multisig + DMS Device Binding
     │
     ├── SXUA (UUPS Proxy)      ← Vault: Deposit/Commit/Yield/SXP Rewards
     │        │
     │        └── SXLaunchpad (UUPS Proxy)  ← Sales/Vesting/Buyback/Forfeiture
     │
     ├── SXP Token              ← Reward Token (44% APY staking reward)
     │        └── SXCP Token   ← Converted reward (12% fee on SXP→SXCP)
     │
     └── SXEP                   ← Exchange Engine (5% settlement fee)
```

---

## Smart Contracts

| Contract | Description | Upgradeable |
|---|---|---|
| `SXGovernance.sol` | 3-of-3 multisig propose/approve/execute + DMS device binding | No |
| `SXUA.sol` | Unified vault: deposits, uncommitted/committed balances, 0.12% daily yield, 44% APY SXP rewards | Yes (UUPS) |
| `SXLaunchpad.sol` | Project registration, token sales, vesting lock, buyback, early exit forfeiture | Yes (UUPS) |
| `SXP.sol` | ERC20 reward token; minted by SXUA on staking; convertible to SXCP with 12% fee | No |
| `SXCP.sol` | ERC20 converted points token; minted by SXP contract only | No |
| `SXEP.sol` | Exchange/swap engine; 5% fee on settlement sent to treasury | No |
| `SXProxy.sol` | ERC1967 UUPS proxy wrapper | — |
| `mocks/MockStablecoin.sol` | Configurable-decimal ERC20 mock for USDC, USDT, DAI in tests | No |

---

## Prerequisites

Ensure the following tools are installed before proceeding:

| Tool | Version | Installation |
|---|---|---|
| **Node.js** | ≥ 20.x | [nodejs.org](https://nodejs.org) |
| **npm** | ≥ 10.x | Bundled with Node.js |
| **PostgreSQL** | ≥ 14.x | [postgresql.org](https://www.postgresql.org) |
| **Git** | ≥ 2.x | [git-scm.com](https://git-scm.com) |
| **Foundry** _(optional for Solidity tests)_ | latest | `curl -L https://foundry.paradigm.xyz \| bash` |

---

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/sx-launchpad.git
cd sx-launchpad
```

---

### 2. Smart Contracts Setup

```bash
cd smart-contracts
npm install
```

This installs:
- `hardhat` — Ethereum development framework
- `@nomicfoundation/hardhat-toolbox` — Testing utilities (Chai, ethers, coverage)
- `@openzeppelin/contracts` v5 — Standard ERC20, ReentrancyGuard, ERC1967Proxy
- `@openzeppelin/contracts-upgradeable` v5 — UUPS, Initializable, Ownable, Pausable

**Compile Contracts:**

```bash
npm run compile
# or: npx hardhat compile
```

Expected output:
```
Compiled 35 Solidity files successfully (evm target: paris).
```

**Run Hardhat Tests:**

```bash
npm test
# or: npx hardhat test
```

Expected output (10 passing):
```
  SX Launchpad Ecosystem
    Component 1: SX Unified Account (SXUA)
      ✔ V1.1: Deposit stablecoin
      ✔ V1.2: Balance tracking (Committed vs Uncommitted)
      ✔ V1.3: Daily yield accrual (0.12% APY per day)
    Component 2: Launchpad Payment & Forfeiture
      ✔ V2.1: Stablecoin payment via SXUA
      ✔ V2.2: Refund request and Buyback request
      ✔ V2.3: Forfeiture enforcement on early exit
    Component 3: Earnings & Fee Structure
      ✔ V3.1: 44% APY Reward calculation
      ✔ V3.2 & V3.3: SXP to SXCP Conversion with 12% fee
      ✔ SXEP Exchange: 5% fee on settlement
    Component 4: Governance & Security
      ✔ V4.2 & V4.3: Admin device binding and multi-sig activation

  10 passing (2s)
```

**Run Foundry Tests** _(optional)_:

```bash
# From the smart-contracts directory
forge test --match-path test/foundry/SXLaunchpad.t.sol -vvv
```

---

### 3. Database Setup

Ensure PostgreSQL is running, then create the database and apply the schema:

```bash
# Create the database
createdb sx_launchpad
# or with explicit credentials:
PGPASSWORD=yourpassword psql -U postgres -h localhost -c "CREATE DATABASE sx_launchpad;"

# Apply schema
PGPASSWORD=yourpassword psql -U postgres -h localhost -d sx_launchpad \
  -f backend/src/models/schema.sql

# Seed demo data (optional)
PGPASSWORD=yourpassword psql -U postgres -h localhost -d sx_launchpad \
  -f scripts/seed-db.sql
```

**Tables created:**

| Table | Purpose |
|---|---|
| `users` | Registered wallet addresses |
| `device_bindings` | Admin DMS device hash bindings |
| `stablecoin_balances` | Per-user committed/uncommitted/accrued balances |
| `projects` | Launchpad project registry |
| `allocations` | User token allocations per project |
| `proposals` | Multisig governance proposals |
| `audit_reports` | AI security scan findings and compliance reports |

---

### 4. Backend Setup

```bash
cd backend
npm install
```

**Create a `.env` file** in the `backend/` directory:

```bash
cp .env.example .env
# then edit .env with your values
```

```env
PORT=5000
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/sx_launchpad
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
PRIVATE_KEY=your_deployer_private_key_here
```

**Build TypeScript:**

```bash
npm run build
```

**Start Development Server:**

```bash
npm run dev
```

Server starts at: `http://localhost:5000`

**Start Production Server:**

```bash
npm start
```

---

### 5. Frontend Setup

```bash
cd frontend
npm install
```

**Create a `.env` file** in the `frontend/` directory:

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
VITE_CHAIN_ID=84532
```

**Start Development Server:**

```bash
npm run dev
```

Frontend runs at: `http://localhost:5173`

**Build for Production:**

```bash
npm run build
```

---

## Environment Variables

### Smart Contracts (`smart-contracts/.env`)

| Variable | Description | Required |
|---|---|---|
| `BASE_SEPOLIA_RPC_URL` | RPC endpoint for Base Sepolia | Yes (for deploy) |
| `PRIVATE_KEY` | Deployer wallet private key (no `0x` prefix) | Yes (for deploy) |
| `BASESCAN_API_KEY` | BaseScan API key for contract verification | Optional |

### Backend (`backend/.env`)

| Variable | Description | Default |
|---|---|---|
| `PORT` | Express server port | `5000` |
| `DATABASE_URL` | Full PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/sx_launchpad` |
| `BASE_SEPOLIA_RPC_URL` | RPC endpoint for on-chain event listeners | `https://sepolia.base.org` |
| `PRIVATE_KEY` | Optional signer key for transaction relayer | — |

### Frontend (`frontend/.env`)

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Backend API base URL |
| `VITE_BASE_SEPOLIA_RPC_URL` | Base Sepolia RPC for Wagmi |
| `VITE_CHAIN_ID` | Chain ID — Base Sepolia is `84532` |

---

## Workflow

### Compile & Test Contracts

```bash
# 1. Navigate to smart-contracts
cd smart-contracts

# 2. Compile all Solidity files
npx hardhat compile

# 3. Run the full Hardhat test suite (10 tests)
npx hardhat test

# 4. Run with gas reporting
REPORT_GAS=true npx hardhat test

# 5. Run Solidity coverage
npx hardhat coverage


npx hardhat run scripts/verifyHoodi.js --network hoodi
npx hardhat run scripts/verifyBaseSepolia.js --network baseSepolia

```

---

### Deploy to Base Sepolia

Create a `scripts/deploy.js` in `smart-contracts/`:

```javascript
const { ethers, upgrades } = require("hardhat");

async function main() {
  const [deployer, adminA, adminB, adminC, treasury] = await ethers.getSigners();

  // 1. Deploy Mock Stablecoins (testnet only)
  const MockStablecoin = await ethers.getContractFactory("MockStablecoin");
  const usdc = await MockStablecoin.deploy("Mock USDC", "USDC", 6);
  const usdt = await MockStablecoin.deploy("Mock USDT", "USDT", 6);
  const dai  = await MockStablecoin.deploy("Mock DAI",  "DAI",  18);

  // 2. Deploy Governance
  const SXGovernance = await ethers.getContractFactory("SXGovernance");
  const governance = await SXGovernance.deploy(adminA.address, adminB.address, adminC.address);

  // 3. Deploy SXP & SXCP
  const SXP  = await ethers.getContractFactory("SXP");
  const SXCP = await ethers.getContractFactory("SXCP");
  const sxp  = await SXP.deploy(treasury.address);
  const sxcp = await SXCP.deploy();
  await sxp.setSXCPToken(sxcp.target);
  await sxcp.setMinter(sxp.target, true);

  // 4. Deploy SXUA via UUPS Proxy
  const SXProxy = await ethers.getContractFactory("SXProxy");
  const SXUA    = await ethers.getContractFactory("SXUA");
  const sxuaImpl  = await SXUA.deploy();
  const sxuaProxy = await SXProxy.deploy(
    sxuaImpl.target,
    sxuaImpl.interface.encodeFunctionData("initialize", [
      sxp.target, treasury.address, 10, 30 * 24 * 60 * 60
    ])
  );

  // 5. Deploy SXLaunchpad via UUPS Proxy
  const SXLaunchpad    = await ethers.getContractFactory("SXLaunchpad");
  const launchpadImpl  = await SXLaunchpad.deploy();
  const launchpadProxy = await SXProxy.deploy(
    launchpadImpl.target,
    launchpadImpl.interface.encodeFunctionData("initialize", [sxuaProxy.target, treasury.address])
  );

  // 6. Deploy SXEP Exchange
  const SXEP = await ethers.getContractFactory("SXEP");
  const sxep = await SXEP.deploy(treasury.address);

  console.log("USDC:        ", usdc.target);
  console.log("USDT:        ", usdt.target);
  console.log("DAI:         ", dai.target);
  console.log("Governance:  ", governance.target);
  console.log("SXP:         ", sxp.target);
  console.log("SXCP:        ", sxcp.target);
  console.log("SXUA Proxy:  ", sxuaProxy.target);
  console.log("Launchpad:   ", launchpadProxy.target);
  console.log("SXEP:        ", sxep.target);
}

main().catch(console.error);
```

```bash
# Deploy to Base Sepolia
npx hardhat run scripts/deploy.js --network baseSepolia

# Verify contracts on BaseScan
npx hardhat verify --network baseSepolia <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

---

### Run the Backend API

```bash
cd backend

# Development (hot-reload with ts-node)
npm run dev

# Production
npm run build && npm start
```

The API will be available at `http://localhost:5000/api`.

---

### Run the AI Security Scanner

The scanner runs automatically on server startup and can also be triggered manually via API or CLI:

**Via CLI:**
```bash
cd backend
npm run scan
```

**Via API:**
```bash
curl -X POST http://localhost:5000/api/audit/scan
```

**Output files generated:**

| File | Description |
|---|---|
| `reports/audit-report.json` | Machine-readable findings (vulnerability type, risk level, file, line, snippet, fix) |
| `reports/security-report.md` | Human-readable compliance report with executive summary and threat model |

**Fetch the latest report:**
```bash
curl http://localhost:5000/api/audit/latest
```

---

### Run the Frontend

```bash
cd frontend
npm run dev
# → http://localhost:5173
```

---

## API Reference

Base URL: `http://localhost:5000/api`

### Vault Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/vault/:userAddress` | Get all stablecoin balances for a user |
| `POST` | `/vault/deposit` | Record a stablecoin deposit |
| `POST` | `/vault/commit` | Move balance from uncommitted → committed (staking) |

**POST `/vault/deposit` body:**
```json
{
  "userAddress": "0xYourAddress",
  "tokenAddress": "0xUSDCAddress",
  "amount": "1000.000000"
}
```

---

### Launchpad Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/projects` | List all registered projects |
| `POST` | `/projects/buy` | Record a token purchase allocation |
| `GET` | `/allocations/:userAddress` | Get all allocations for a user |

**POST `/projects/buy` body:**
```json
{
  "projectId": 0,
  "userAddress": "0xYourAddress",
  "tokenAmount": "100.0",
  "stablecoinCost": "200.0"
}
```

---

### Governance Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/proposals` | List all multisig proposals |
| `POST` | `/proposals/create` | Create a new governance proposal |
| `POST` | `/proposals/approve` | Admin approves a proposal (role: `a`, `b`, or `c`) |
| `POST` | `/proposals/execute` | Mark a proposal as executed |

**POST `/proposals/approve` body:**
```json
{
  "proposalId": 0,
  "adminRole": "a"
}
```

---

### Audit Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/audit/scan` | Trigger a new AI security scan of all contracts |
| `GET` | `/audit/latest` | Fetch the most recent audit report from the database |

---

## Smart Contract Details

### SXUA — SX Unified Account

The vault contract tracks per-user, per-token stablecoin balances split into:
- **Uncommitted** — freely withdrawable
- **Committed** — locked for staking; earns SXP rewards at 44% APY

Key functions:

```solidity
deposit(address token, uint256 amount)           // Deposit stablecoin
withdraw(address token, uint256 amount)          // Withdraw uncommitted balance
commit(address token, uint256 amount)            // Move to committed (staking)
uncommit(address token, uint256 amount)          // Move back to uncommitted
claimDailyYield(address token)                   // Accrue 0.12% daily yield
claimSxpReward(address token)                    // Mint SXP staking rewards
payForLaunchpad(address user, address token, uint256 amount)  // Called by launchpad
refundToUser(address user, address token, uint256 amount)     // Refund back to vault
setEmergencyShutdown(bool active)                // Owner: trigger emergency mode
```

---

### SXLaunchpad — Launchpad Engine

```solidity
addProject(...)              // Owner: register a new token sale project
buyTokens(uint projectId, uint tokenAmount)   // User: purchase tokens via SXUA
requestRefund(uint projectId)                 // User: refund before finalization
requestBuyback(uint projectId, uint amount)   // User: sell tokens back in buyback window
claimTokens(uint projectId)                   // User: claim vested tokens (forfeiture if early)
finalizeProject(uint projectId)               // Owner: finalize project → enable claims
emergencyWithdrawProjectFunds(uint projectId) // User: withdraw during emergency shutdown
```

**Forfeiture Logic:**
- If `block.timestamp < saleEnd + lockPeriod`, a `penaltyPercent` portion of tokens is forfeited to the treasury.

---

### SXGovernance — 3-of-3 Multisig

```solidity
bindDevice(bytes32 deviceHash)                        // Admin: bind hardware device
verifyDevice(address admin, bytes32 hash) → bool      // Check device binding
propose(address target, uint value, bytes data)        // AdminA/B/C: propose action
approve(uint proposalId, bytes32 deviceHash)           // Admin: approve with device verification
execute(uint proposalId)                               // Admin: execute if 3/3 approved
```

---

## Fee & Reward Structure

| Mechanism | Rate | Destination |
|---|---|---|
| Daily yield on uncommitted balance | **0.12% / day** (≈ 43.8% APY) | Added to user's uncommitted balance |
| SXP staking reward on committed balance | **44% APY** | Minted as SXP to user |
| SXP → SXCP conversion fee | **12%** of SXP converted | SXP transferred to treasury |
| SXEP exchange settlement fee | **5%** of output token amount | Transferred to treasury |
| Early exit forfeiture penalty | Configurable (default **10%**) | Project tokens sent to treasury |

---

## Security Model

### 1. Reentrancy Protection
All state-mutating vault and launchpad functions use OpenZeppelin v5's stateless `ReentrancyGuard` (`nonReentrant` modifier). The **Checks-Effects-Interactions** pattern is enforced: balances are updated _before_ any external calls.

### 2. 3-of-3 Multisig Governance
No privileged admin action (upgrade, pause, emergency shutdown, project finalization) executes without **all three** admin signatures. Each approval requires the approving admin's `deviceHash` to match their registered DMS device binding.

### 3. UUPS Upgradeability
`SXUA` and `SXLaunchpad` are deployed behind `ERC1967Proxy`. The `_authorizeUpgrade()` function is restricted to `onlyOwner` (which is the Governance contract), ensuring upgrades must pass the 3-of-3 multisig.

### 4. Decimal Precision
USDC/USDT (6 decimals) balances are scaled to 18 decimals internally using `getAmountIn18Decimals()` before SXP reward calculations, preventing reward dilution for 6-decimal tokens.

### 5. AI Security Scanner
The built-in scanner checks for:
- **Reentrancy** — Low-level calls without `nonReentrant`
- **Access Control** — Admin functions lacking `onlyOwner`/`onlyAdmin`
- **Overflow/Underflow** — Arithmetic in `unchecked` blocks
- **Timestamp Dependence** — `block.timestamp` usage
- **Flash Loan / Price Manipulation** — Trades lacking slippage protection

---

## Project Structure

```
sx-launchpad/
├── smart-contracts/
│   ├── contracts/
│   │   ├── SXGovernance.sol       # 3-of-3 Multisig + DMS
│   │   ├── SXUA.sol               # Unified Vault (UUPS)
│   │   ├── SXLaunchpad.sol        # Launchpad Engine (UUPS)
│   │   ├── SXP.sol                # Reward Token
│   │   ├── SXCP.sol               # Converted Points Token
│   │   ├── SXEP.sol               # Exchange Protocol
│   │   ├── SXProxy.sol            # ERC1967 Proxy wrapper
│   │   ├── interfaces/
│   │   │   └── ISXUA.sol
│   │   └── mocks/
│   │       └── MockStablecoin.sol
│   ├── test/
│   │   ├── sx-launchpad.test.js   # Hardhat tests (10 tests, all passing)
│   │   └── foundry/
│   │       └── SXLaunchpad.t.sol  # Foundry Solidity tests
│   ├── hardhat.config.js
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.ts              # PostgreSQL pool
│   │   ├── controllers/
│   │   │   ├── coreController.ts  # Vault, Launchpad, Governance endpoints
│   │   │   └── auditController.ts # Scan trigger & report fetch
│   │   ├── routes/
│   │   │   └── api.ts             # Express router
│   │   ├── services/
│   │   │   └── scanner.ts         # AI security scanner engine
│   │   ├── models/
│   │   │   └── schema.sql         # PostgreSQL DDL
│   │   └── server.ts              # App entrypoint
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   └── src/
│       ├── components/
│       ├── pages/
│       └── hooks/
│
├── scripts/
│   └── seed-db.sql                # Demo data seed script
│
├── reports/
│   ├── audit-report.json          # Generated by AI scanner
│   └── security-report.md        # Generated compliance report
│
├── .github/
│   └── workflows/                 # CI/CD GitHub Actions
│
└── README.md
```

---

## CI/CD

The `.github/workflows/` directory is set up for GitHub Actions CI/CD. A recommended pipeline:

```yaml
# .github/workflows/ci.yml
name: SX Launchpad CI

on: [push, pull_request]

jobs:
  contracts:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: cd smart-contracts && npm ci
      - run: cd smart-contracts && npx hardhat compile
      - run: cd smart-contracts && npx hardhat test

  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: cd backend && npm ci
      - run: cd backend && npm run build
```

---

## Contributing

1. **Fork** the repository
2. **Create a feature branch**: `git checkout -b feature/your-feature`
3. **Write tests** for any new smart contract logic
4. **Ensure all tests pass**: `npx hardhat test` (10/10)
5. **Run the security scanner**: `npm run scan` from `backend/`
6. **Submit a Pull Request** — PRs require review and 3-of-3 team approval

---

## License

This project is licensed under the **MIT License**. See [LICENSE](./LICENSE) for details.

---

> **Network**: Base Sepolia (Chain ID: `84532`)  
> **Solidity Version**: `0.8.24`  
> **OpenZeppelin**: `v5.0.2`  
> **Ethers.js**: `v6.13.0`
