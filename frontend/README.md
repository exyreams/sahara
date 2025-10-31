# Sahara Frontend

Next.js web application for the Sahara platform.

## Tech Stack

- Next.js 16 (App Router)
- TypeScript 5.9
- Tailwind CSS 4 + shadcn/ui
- Solana Web3.js + Anchor 0.32
- Biome 2.3

## Prerequisites

- Node.js 22.13.0+
- Bun
- Deployed Sahara program

## Setup

```bash
# Install dependencies
bun install

# Copy program IDL
cp ../sahara-core/target/idl/sahara_core.json lib/anchor/

# Configure environment (.env.local)
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC_HOST=https://api.devnet.solana.com
NEXT_PUBLIC_PROGRAM_ID=your-program-id

# Start dev server
bun run dev
```

## Structure

```
frontend/
├── app/                      # Next.js App Router
│   ├── page.tsx             # Home page
│   ├── layout.tsx           # Root layout
│   ├── disasters/           # Disaster management pages
│   ├── beneficiaries/       # Beneficiary pages
│   ├── pools/               # Fund pool pages
│   ├── ngo/                 # NGO portal pages
│   └── admin/               # Admin pages
│       ├── ngos/           # NGO management
│       ├── audit-log/      # Admin action logs
│       └── settings/       # Admin settings
│
├── components/              # React components
│   ├── ui/                 # shadcn/ui components
│   ├── layout/             # Layout components
│   ├── admin/              # Admin-specific components
│   ├── disasters/          # Disaster components
│   ├── beneficiaries/      # Beneficiary components
│   ├── pools/              # Pool components
│   ├── ngo/                # NGO components
│   └── wallet/             # Wallet components
│
├── hooks/                   # Custom React hooks
│   ├── use-program.ts      # Anchor program hook
│   ├── use-transaction.ts  # Transaction handling
│   ├── use-admin.ts        # Admin authorization
│   ├── use-platform-config.ts
│   ├── use-disasters.ts
│   ├── use-beneficiaries.ts
│   ├── use-all-ngos.ts
│   └── ...
│
├── lib/                     # Utilities
│   ├── anchor/             # Anchor setup
│   │   ├── idl.ts         # IDL import
│   │   ├── pdas.ts        # PDA derivation
│   │   └── sahara_core.json  # Program IDL
│   ├── error-parser.ts    # Error handling
│   ├── formatters.ts      # Data formatters
│   └── utils.ts           # General utilities
│
└── types/                   # TypeScript types
    ├── program.ts          # Program account types
    └── admin.ts            # Admin-specific types
```

## 🎨 Key Features

### User Roles & Pages

#### Donors

- Browse disasters and beneficiaries
- Make direct donations
- Donate to fund pools
- Track donation history

#### NGOs

- Register organization
- Manage field workers
- Create fund pools
- Distribute funds
- View statistics

#### Field Workers

- Register beneficiaries
- Verify beneficiaries (multi-sig)
- View verification dashboard

#### Beneficiaries

- View profile and verification status
- Claim distributions
- View donation history

#### Platform Admin

- **NGO Management** (`/admin/ngos`)
  - Verify/revoke NGO verification
  - Activate/deactivate NGOs
  - Blacklist/remove blacklist
  - Batch operations (up to 20 NGOs)
- **Audit Log** (`/admin/audit-log`)
  - View all admin actions
  - Filter by action type
  - Search by address
  - Pagination support
- **Settings** (`/admin/settings`)
  - Emergency admin transfer
  - View current admin
  - Transfer acceptance (7-day window)

### UI Components

Built with shadcn/ui for consistent, accessible design:

- Buttons, Cards, Badges
- Forms with validation
- Dialogs and Alerts
- Dropdowns and Selects
- Toast notifications
- Loading skeletons

### Wallet Integration

Supports multiple Solana wallets:

- Phantom
- Solflare
- Backpack
- And more via Wallet Adapter

## Development

### Scripts

```bash
# Development server (with Turbopack)
bun run dev

# Production build
bun run build

# Start production server
bun start

# Lint and format code
bun run lint

# Check code without fixing
bunx biome check app/ components/ hooks/ lib/ types/

# Auto-fix issues
bunx biome check --write --unsafe app/ components/ hooks/ lib/ types/

# Format
bunx biome format
```

### Code Quality

```bash
# Type check
bun run build

# Lint
bunx biome check app/ components/ hooks/ lib/ types/

# Auto-fix
bunx biome check --write --unsafe app/ components/ hooks/ lib/ types/
```
