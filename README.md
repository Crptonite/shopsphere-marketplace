# ShopSphere — Singapore Marketplace starter

A Next.js App Router + TypeScript marketplace starter with a model-aware search UI, SGD prices, sample listings, and a PostgreSQL/pgvector schema.

## Included
- Responsive marketplace homepage with search autocomplete and product thumbnails
- Model-family suggestions for iPhone and Samsung Galaxy
- Search results sorted by **Best match** or **Most recent**
- Sample/demo product listings, visibly labelled
- Cart state in the browser for this starter
- PostgreSQL schema including `vector(1536)` embeddings and text-search indexes
- Search API route with PostgreSQL full-text/fuzzy matching and optional vector similarity
- Product create/list API route
- SQL seed data

## Requirements
- Node.js 20.9+
- PostgreSQL 15+ (pgvector extension required for vector queries)
- npm

## Run the UI
```bash
npm install
cp .env.example .env.local
npm run dev
```
Open http://localhost:3000. The homepage can render its built-in sample catalogue without a database connection.

## Configure PostgreSQL
1. Create a database.
2. Apply `db/schema.sql` and then `db/seed.sql`.
3. Set `DATABASE_URL` in `.env.local`.
4. Restart the dev server.

The API uses `pg` directly so PostgreSQL vector operations can be expressed as SQL. The database must have pgvector installed. Set `OPENAI_API_KEY` to enable query embeddings; populate each product's 1536-dimensional `embedding` column with embeddings from the same model to activate semantic similarity. Without embeddings, the endpoint falls back to full-text, exact and fuzzy text matching.

## Environment
See `.env.example`.

## API
- `GET /api/search?q=iphone%2018&sort=best_match`
- `GET /api/search?q=samsung&sort=recent`
- `GET /api/products`
- `POST /api/products` — create a listing (authentication/authorization is not yet implemented; do not expose publicly before adding it).

## Important production gaps
This is a starting scaffold, not a production-ready marketplace. Before handling real customers or money, add authentication, seller ownership checks, server-side cart persistence, order/inventory transactions, payment provider integration and webhook verification, image storage, moderation/reporting, rate limits, audit logs, privacy policy, and automated tests.

## Catalog accuracy
Product *models* in the seed catalogue are discovery metadata based on the official Singapore product ranges. Every offer in the seed data is explicitly a **sample/demo listing** with illustrative pricing; it is not a claim of live stock, real sellers, or current resale prices. Refresh model metadata and official links from the manufacturer before launch.
