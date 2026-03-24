# DB Issues Handoff

Verified on `2026-03-24` against live MongoDB database `wellbeing_app` after the snake_case cleanup and the insight collection rename pass.

## Current DB Status

- Agent chat collection names are aligned with the live DB after the latest rename pass.
- Confirmed live insight collections at verification time:
  - `nutrition_insight_memory`: `2` docs
  - `nutrition_sessions_summary`: `4` docs
  - `yelp_insight`: `74` docs
  - `skin_hair_pattern`: `1` doc
  - `meal_pattern`: `0` docs
- `agent_profile_cache` still does not exist live.
- `products` still does not exist live.
- Of the `1` live `sessions` document, `1` is still missing `user_id`.

## Confirmed DB Issues To Fix

### 1. High: `sessions` write/read mismatch still drops data from reads

Problem:

- The sessions write path still allows inserts without a user id.
- The sessions read path only fetches documents by `user_id`.
- `saveExerciseSession()` still overwrites the incoming session date with `new Date()`.
- Live verification shows `1/1` current `sessions` documents is missing `user_id`.

Why this matters:

- Session history can be saved to MongoDB and still disappear from `/api/sessions`, agent reads, and any feature that depends on `getUserSessions`.
- The stored timeline can be wrong even when the insert succeeds.

Relevant code:

- `base/src/app/api/sessions/route.ts:6`
- `base/src/app/api/sessions/route.ts:9`
- `base/src/app/api/sessions/route.ts:16`
- `base/src/lib/mongodb.ts:41`
- `base/src/lib/mongodb.ts:86`
- `base/src/lib/mongodb.ts:90`
- `base/src/lib/mongodb.ts:92`
- `base/src/lib/mongodb.ts:110`

Recommended fix:

- Make `userId` required on session writes.
- Reject inserts without a user id.
- Preserve the provided session date when valid.
- Backfill `user_id` on existing live `sessions` rows if the owner is known.

### 2. Medium: connection semantics are inconsistent across code paths

Problem:

- All agent chat routes treat `community_connections` as keyed only by `from_user_id`.
- The shared `get_user_data` tool then queries only one direction with `.find({ [userIdField]: userId })`.
- All agent profile routes query both `from_user_id` and `to_user_id`.
- The community connections API `GET` route also returns only outbound connections.

Why this matters:

- Different parts of the product disagree on what counts as a connection.
- Inbound connections can be omitted from agent tool results and from `/api/connections`.
- This creates drift between profile context, agent tool output, and community views.

Relevant code:

- `base/src/app/api/agent/chat/route.ts:35`
- `base/src/app/api/agent/chat/route.ts:122`
- `community/backend/src/app/api/agent/chat/route.ts:35`
- `nutrition-wellness/src/app/api/agent/chat/route.ts:35`
- `nutrition-yelp/backend/src/app/api/agent/chat/route.ts:35`
- `skin-hair-analysis/src/app/api/agent/chat/route.ts:35`
- `base/src/app/api/agent/profile/route.ts:95`
- `community/backend/src/app/api/agent/profile/route.ts:95`
- `nutrition-wellness/src/app/api/agent/profile/route.ts:95`
- `nutrition-yelp/backend/src/app/api/agent/profile/route.ts:95`
- `skin-hair-analysis/src/app/api/agent/profile/route.ts:95`
- `community/backend/src/app/api/connections/route.ts:19`
- `community/backend/src/app/api/connections/route.ts:21`

Recommended fix:

- Decide whether connections are one-way or two-way.
- Implement the same rule in agent chat, agent profile, and `/api/connections`.
- If the intended behavior is "all relationships," special-case `community_connections` to query both directions.

### 3. Medium: `agent_profile_cache` is still write-only

Problem:

- Every `agent/profile` route still says it rebuilds fresh on every call.
- The same routes still upsert into `agent_profile_cache`.
- There is still no cache read path before the rebuild.
- The live collection does not currently exist because nothing has needed to create it yet.

Why this matters:

- Extra Mongo writes are happening for no current behavior change.
- The code suggests caching exists, but it is not actually used.

Relevant code:

- `base/src/app/api/agent/profile/route.ts:46`
- `base/src/app/api/agent/profile/route.ts:263`
- `community/backend/src/app/api/agent/profile/route.ts:46`
- `community/backend/src/app/api/agent/profile/route.ts:263`
- `nutrition-wellness/src/app/api/agent/profile/route.ts:46`
- `nutrition-wellness/src/app/api/agent/profile/route.ts:263`
- `nutrition-yelp/backend/src/app/api/agent/profile/route.ts:46`
- `nutrition-yelp/backend/src/app/api/agent/profile/route.ts:263`
- `skin-hair-analysis/src/app/api/agent/profile/route.ts:46`
- `skin-hair-analysis/src/app/api/agent/profile/route.ts:263`

Recommended fix:

- Either read from `agent_profile_cache` before rebuilding, or remove the cache writes.

### 4. Medium: the legacy correlation engine is still incompatible with the live DB

Problem:

- The correlation engine still queries collections that do not exist live:
  - `workout_sessions`
  - `nutrition_logs`
  - `skin_analyses`
  - `hair_analyses`
  - `sleep_logs`
  - `supplement_logs`
- It also still expects old document shapes and field names, for example:
  - `log.acne?.score`
  - `log.texture?.dryness`
  - `log.density?.overallScore`
  - `log.supplementName`
  - `workout.formScore`
  - `workout.fatigueScore`
  - `workout.asymmetryScore`
- Those shapes do not match the current live collections and snake_case fields.

Why this matters:

- If the engine is called, it will mostly read empty datasets from MongoDB.
- Even if replacement collections were added later, the downstream analysis logic would still be misreading the current schema.

Relevant code:

- `base/src/services/correlationEngine.js:81`
- `base/src/services/correlationEngine.js:86`
- `base/src/services/correlationEngine.js:91`
- `base/src/services/correlationEngine.js:96`
- `base/src/services/correlationEngine.js:101`
- `base/src/services/correlationEngine.js:106`
- `base/src/services/correlationEngine.js:380`
- `base/src/services/correlationEngine.js:485`
- `base/src/services/correlationEngine.js:744`
- `base/src/services/correlationEngine.js:763`
- `base/src/services/correlationEngine.js:987`

Recommended fix:

- Either remap the engine to the real live collections and current snake_case fields, or disable it until a matching data model exists.

### 5. Low: dormant product recommendation engine still points at a missing `products` collection

Problem:

- `base/src/services/productRecommendation.js` queries `this.db.collection('products')`.
- The live `wellbeing_app` database does not have a `products` collection.
- That same service also expects a legacy nested product shape such as `product.experience`, `ingredients.parsed`, and `texture.tags`.
- Current live product-related data is stored in collections like `loved_products` and `product_recommendations`, not a shared `products` catalog.
- A repo search did not find any current runtime imports of `ProductRecommendationEngine`, so this appears dormant right now.

Why this matters:

- It is not an active runtime failure today, but if this service is wired back in, the DB query will return no live catalog data and the ranking logic will still assume the wrong shape.

Relevant code:

- `base/src/services/productRecommendation.js:4`
- `base/src/services/productRecommendation.js:231`
- `base/src/services/productRecommendation.js:249`
- `base/src/services/productRecommendation.js:96`
- `base/src/services/productRecommendation.js:101`
- `base/src/services/productRecommendation.js:126`

Recommended fix:

- Either remove the stale service, or map it to a real product source with a schema that matches the current app.

## Non-Issues / Confirmed OK

- `nutrition_insight_memory` is valid in code and present live.
- The renamed insight collections now match the live DB:
  - `nutrition_sessions_summary`
  - `yelp_insight`
  - `skin_hair_pattern`
  - `meal_pattern`
- `meal_pattern` is currently empty, but that is not a schema mismatch by itself.
- All direct runtime `collection("...")` references in current source either exist live or fall into the issue buckets above.
- No old hyphenated or camelCase top-level MongoDB collection names remain live.
- Old collection names only remain in the migration script as intentional rename aliases.
