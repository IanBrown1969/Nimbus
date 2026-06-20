# Portal UI - Agent Guidelines

These guidelines define the coding standards for the client-facing catalog portal.

## 1. Project Stack

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript.
- **Styling**: Tailwind CSS v4. Standardize on the rich aesthetic theme (modern responsive commerce layout, clean product grids).
- **Icons**: Lucide React (`lucide-react`).
- **Data Fetching**: Axios for HTTP calling the `/api/integration` endpoints of the `admin-api`.

## 2. Directory Structure & File Naming

- **Folder Names**: kebab-case.
- **File Names**: kebab-case.
- **Components**: PascalCase.

## 3. Product Catalog Integration

- Connects to `admin-api` using an API Key.
- Read products from `GET /api/integration/catalog`.
- Automatically convert stocking quantity to selling quantity using the `ConversionRatio` for stock displays (e.g. if we have 5 pallets and conversion ratio is 10, display 50 "Available").
- Display prices dynamically in selected currency.
