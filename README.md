# Meow 2.0 🐾

Xperia Nigeria's shop management and point-of-sale frontend.

## Stack

- React + TypeScript
- Vite
- Supabase JavaScript client
- Lucide icons
- Responsive CSS

Vite officially supports React + TypeScript templates and production builds. Current Vite releases require a modern Node.js runtime; Windows 7 is therefore not a suitable development environment for the current toolchain. citeturn0search0turn0search6

## Run locally

```bash
npm install
npm run dev
```

For a production build:

```bash
npm run build
npm run preview
```

## Connect Supabase

Copy `.env.example` to `.env` and set:

```text
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

The current UI includes a safe demo mode so the screens can be explored before live credentials are configured.

## Screens

- Dashboard
- Point of Sale
- Inventory
- Sales
- Reports
- Staff
- Settings
- Checkout
