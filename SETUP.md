# Sahara - Complete Setup Guide

> Step-by-step guide to set up Sahara from scratch

## Table of Contents

- [Quick Start](#quick-start)
- [Step 1: Clone & Install](#step-1-clone--install)
- [Step 2: Generate Program ID & Configure](#step-2-generate-program-id--configure)
- [Step 3: Deploy Program](#step-3-deploy-program)
- [Step 4: Start Frontend](#step-4-start-frontend)

---

## Quick Start

**Prerequisites**: Rust, Solana CLI, Anchor 0.31.1, Node.js 22+, Bun, Yarn

If you don't have these installed, see [Prerequisites Reference](#prerequisites-reference) at the bottom.

---

## Step 1: Clone & Install

### 1.1 Clone Repository

```bash
git clone https://github.com/exyreams/sahara.git
cd sahara
```

### 1.2 Install Frontend Dependencies

![Frontend Installation](https://github.com/exyreams/sahara_guide/blob/main/01_package_install.gif?raw=true)

```bash
cd frontend
bun install
```

### 1.3 Install Anchor Dependencies

![Anchor Installation](https://github.com/exyreams/sahara_guide/blob/main/02_anchor_install.gif?raw=true)

```bash
cd ../sahara-core
yarn install
```

---

## Step 2: Generate Program ID & Configure

[Step 2 Generate Program ID & Configure.webm](https://github.com/user-attachments/assets/b3001e04-b625-4ac5-b26b-f3f844aa8cd9)

### 2.1 Generate Program Keypair

```bash
# Make sure you're in sahara-core directory
cd sahara-core

# Create target/deploy directory if it doesn't exist
mkdir -p target/deploy

# Generate new keypair for program ID
solana-keygen new --no-bip39-passphrase -o target/deploy/saharasol_core-keypair.json

# View the generated program ID (COPY THIS!)
solana-keygen pubkey target/deploy/saharasol_core-keypair.json
```

**Example Output:**

```
Wrote new keypair to target/deploy/sahara_core-keypair.json
================================================================================
pubkey: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
================================================================================
```

**📝 IMPORTANT**: Copy this program ID! You'll need it in the next steps.

### 2.2 Update Program ID in Anchor.toml

Open `sahara-core/Anchor.toml` and find the `[programs.devnet]` section:

```toml
[programs.devnet]
sahara_core = "YOUR_PROGRAM_ID_HERE"  # Replace with your program ID
```

### 2.3 Update Program ID in lib.rs

Open `sahara-core/programs/sahara-core/src/lib.rs` and update the `declare_id!` at the top:

```rust
declare_id!("YOUR_PROGRAM_ID_HERE");  // Replace with your program ID
```

### 2.4 Create Frontend Environment File

```bash
cd ../frontend

# Create .env.local file
cat > .env.local << EOF
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC_HOST=https://api.devnet.solana.com
NEXT_PUBLIC_PROGRAM_ID=YOUR_PROGRAM_ID_HERE
EOF
```

**Or manually create** `frontend/.env.local`:

```env
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC_HOST=https://api.devnet.solana.com
NEXT_PUBLIC_PROGRAM_ID=YOUR_PROGRAM_ID_HERE
```

Replace `YOUR_PROGRAM_ID_HERE` with your actual program ID!

---

## Step 3: Deploy Program

### 3.1 Create Wallet & Get Devnet SOL

![Wallet Creation](https://github.com/exyreams/sahara_guide/blob/main/04_id_creation.gif?raw=true)

**Create a new wallet:**

# Create new wallet

solana-keygen new --outfile ~/.config/solana/id.json

# View your wallet address

solana address

**Get SOL for deployment (you need ~8-10 SOL):**

```bash
# Option 1: CLI Airdrop (I couln't get sol becuse of rate limit on video)
solana airdrop 5 --url devnet

# Check balance
solana balance --url devnet
```

**Option 2: Use Solana Faucet** (if CLI airdrop fails)

Visit [faucet.solana.com](https://faucet.solana.com) and paste your wallet address to get devnet SOL.

### 3.2 Build the Program

[3.2 Anchor Build.webm](https://github.com/user-attachments/assets/bb9e863b-e239-465d-b062-69eedcd32765)

> **Note**: The build command was run prior to recording, so it completes quickly in the video. First-time builds typically take 2-5 minutes.

```bash
cd sahara-core

# Build the program
anchor build
```

**Expected Output:**

```
✔ Built program successfully
```

### 3.3 Deploy to Devnet

[3.3 Deploy to Devnet.webm](https://github.com/user-attachments/assets/7b5db8c2-00ae-4123-b878-b7e10b63ad72)

```bash
# Deploy to devnet
anchor deploy --provider.cluster devnet
```

**Expected Output:**

```
Deploying cluster: https://api.devnet.solana.com
Upgrade authority: YOUR_WALLET_ADDRESS
Deploying program "sahara_core"...
Program path: /path/to/target/deploy/sahara_core.so...
Program Id: YOUR_PROGRAM_ID

Deploy success
```

### 3.4 Copy IDL to Frontend

[3.4 Copy IDL to frontend.webm](https://github.com/user-attachments/assets/d15bafeb-87a4-4c2a-bf03-77e271e1709d)

```bash
# From sahara-core directory
cp target/idl/sahara_core.json ../frontend/lib/anchor/
```

---

## Step 4: Start Frontend

```bash
cd frontend
bun run dev
```

**Expected Output:**

```
  ▲ Next.js 16.x.x
  - Local:        http://localhost:3000

 ✓ Ready in 2.5s
```

Visit: `http://localhost:3000` 🎉

---
