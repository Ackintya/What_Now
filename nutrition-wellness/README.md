# Nutrition Wellness Module (Standalone)

This folder is an isolated, integration-ready Nutrition Wellness module for the NowWhat hackathon project.

It does **not** modify anything in `../base`.

## Included Features

- Unified Nutrition Wellness page with sections:
  - Nutrition Profile
  - Pantry Meal Planner
  - Authentic Dish Optimizer
  - Saved Recipe Library
  - Add Custom Recipe
  - Wellness Nutrition Insights
- Backend API routes under `/api/nutrition/*`
- MongoDB-backed entities:
  - `nutrition_profiles`
  - `pantry_items`
  - `generated_recipes`
  - `recipe_modifications`
  - `saved_recipes`
  - `authentic_dish_requests`
  - `meal_pattern`
- Nutrition insight memory layer:
  - `nutrition_insight` (chat-personalization memory)
  - `nutrition_sessions_summary` (internal session tracker)
- Gemini integration scaffolding with deterministic fallback datasets
- Grounding line included in generated results (`Also check: ...`)
- Non-medical wording guardrails for meal-planning context

## Local Run

1. Install dependencies

```bash
cd nutrition-wellness
npm install
```

2. Configure env

```bash
cp .env.local.example .env.local
```

Set:
- `MONGODB_URI`
- `MONGODB_DB` (optional; default `wellbeing_app`)
- `GEMINI_API_KEY`
- `NEXT_PUBLIC_DEFAULT_USER_ID` (optional)
- `NUTRITION_MEMORY_CRON_SECRET` (optional, recommended for finalize endpoint)

3. Start dev server

```bash
npm run dev
```

Open `http://localhost:3000`.

## API Map

- `GET/PUT /api/nutrition/profile`
- `GET/PUT /api/nutrition/pantry-items`
- `POST /api/nutrition/pantry/generate`
- `POST /api/nutrition/authentic/optimize`
- `GET/POST /api/nutrition/recipes`
- `POST/DELETE /api/nutrition/recipes/[id]/save`
- `GET/POST /api/nutrition/recipes/[id]/modify`
- `POST /api/nutrition/recipes/[id]/duplicate`
- `GET /api/nutrition/library`
- `GET /api/nutrition/insights`
- `POST /api/nutrition/insights/generate`
- `GET /api/nutrition/summary`
- `GET /api/nutrition/insight-memory?userId=...`
- `POST /api/nutrition/insight-memory/finalize`

## Nutrition Insight Memory

- A lightweight memory layer stores concise Gemini-generated session summaries in `nutrition_insight`.
- Stored fields are only:
  - `user_id`
  - `created_at`
  - `insight_text`
- Meaningful Nutrition actions are tracked into active sessions and finalized after inactivity.
- A 15-minute cron should call `POST /api/nutrition/insight-memory/finalize` to finalize stale sessions.
- Duplicate or near-identical summaries are skipped.

## Integration Handoff

Core module logic lives in:

- `src/modules/nutrition/*`

UI entry point:

- `src/modules/nutrition/ui/NutritionWellnessPage.tsx`

This structure is intended for low-friction integration into the main NowWhat app.
