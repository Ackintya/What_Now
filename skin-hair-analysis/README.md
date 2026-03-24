# Skin Hair Analysis Module (Standalone)

This folder is an isolated, integration-ready Skin & Hair Health module for NowWhat.

It does **not** modify anything in `../base`.

## What is included

- Unified Skin & Hair page UI with sections:
  - Profile
  - Loved Products
  - Product Recommendations
  - Analysis (face and scalp uploads)
  - Wellness Insights
- Backend API routes under `/api/skin-hair/*`
- MongoDB-backed entities:
  - `skin_hair_profiles`
  - `skin_logs`
  - `hair_logs`
  - `loved_products`
  - `product_recommendations`
  - `skin_hair_pattern`
- Deterministic recommendation engine (ingredient overlap + sensitivity exclusion)
- Gemini Vision analysis scaffolding with mock fallback
- Guardrail post-processing for non-medical phrasing
- Raw image non-persistence policy (image bytes are not stored)

## Local run

1. Install dependencies

```bash
cd skin-hair-analysis
npm install
```

2. Create local env

```bash
cp .env.local.example .env.local
```

3. Fill `.env.local`

- `MONGODB_URI`
- `MONGODB_DB` (optional; default `wellbeing_app`)
- `GEMINI_API_KEY` (optional; if not set, mock analyzer is used)
- `NEXT_PUBLIC_DEFAULT_USER_ID` (optional)

4. Run

```bash
npm run dev
```

Open `http://localhost:3000`.

## API map

- `GET/PUT /api/skin-hair/profile`
- `POST /api/skin-hair/analyze`
- `GET/POST /api/skin-hair/loved-products`
- `PATCH/DELETE /api/skin-hair/loved-products/[id]`
- `GET /api/skin-hair/recommendations`
- `POST /api/skin-hair/recommendations/generate`
- `GET /api/skin-hair/wellness-insights`
- `POST /api/skin-hair/wellness-insights/generate`
- `GET /api/skin-hair/summary`

## Integration handoff

Core module logic lives in:

- `src/modules/skin-hair/*`

UI entry point:

- `src/modules/skin-hair/ui/SkinHairPage.tsx`

This layout is intended for easy lift-and-integrate into the main NowWhat app.
