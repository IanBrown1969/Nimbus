# Admin UI - Agent Guidelines

These guidelines define the frontend coding standards for the Nimbus ERP administration dashboard.

## 1. Project Stack & Design System

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript.
- **Styling**: Tailwind CSS v4. Standardize on the rich aesthetic theme (dark theme, harmony-based HSL accent palettes, glassmorphism overlays, custom gradients).
- **Icons**: Lucide React (`lucide-react`). Use Lucide icons exclusively for visual cues.
- **Fonts**: Outfit or Inter for headings and body copy (imported from Google Fonts in `app/layout.tsx`).

## 2. Directory Structure & File Naming

- **Folder Names**: kebab-case (e.g. `src/components/warehouse-item`).
- **File Names**: kebab-case (e.g. `product-card.tsx`).
- **Component & Types Exports**: PascalCase (e.g. `export function ProductCard(...)`).
- **Data & Services**: Keep API fetching logic inside `src/services/` or `src/hooks/` using `axios`.

## 3. Server vs Client Components

- By default, pages and layouts are **Server Components**.
- Add the `"use client"` directive at the very top of files that require:
  - React Hooks (`useState`, `useEffect`, `useContext`, `useReducer`).
  - Interactive event listeners (`onClick`, `onChange`, etc.).
  - Frontend-only libraries.
- Keep interactive client-side logic encapsulated in small, focused child components to optimize server rendering.

## 4. Navigation & Layouts

- **Sidebar Menu**: Configured dynamically based on user role and subscribed plugins (CRM, PIM, WMS, SUP).
- **Tenant Context**: Persist the active `TenantId` and exchange rate configurations in local storage or a global context provider.
- **Error Boundaries**: Create descriptive fallback UIs using `error.tsx` pages.
