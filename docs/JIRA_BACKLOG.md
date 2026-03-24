# What Now? — Jira Backlog
> Full project backlog: Epics, Sprints, Stories, and Tasks
> Generated: March 18, 2026
> Status reflects current implementation as of this date.

---

## Sprint Structure Overview

| Sprint | Theme | Status |
|---|---|---|
| Sprint 1 | Foundation — Ideation, Architecture, Auth | Done |
| Sprint 2 | Core Features — Fitness, Nutrition, Restaurants, Skin & Hair | Done |
| Sprint 3 | Intelligence — AI Agent Pipeline, WellBeing Chat | Done |
| Sprint 4 | Community & Polish | Done / In Progress |

---

## Sprint 1 — Foundation

### Epic 1: Ideation & Discovery

**Description**: Define the core problem, target user, and product vision for What Now?. Covers all initial thinking, research, and decision-making before any code was written.

---

**Story 1.1 — Define the problem statement and target user**
As a product team, we want to clearly define the problem What Now? solves and who it's for so that all design and development decisions stay focused on the right user.

**Problem Statement:**
Most people want to live healthier but don't know where to start or what to do next. Existing wellness apps are siloed — one app for fitness, another for nutrition, another for skin care — forcing users to juggle multiple tools with no unified picture of their health. What Now? solves this by being a single AI-powered wellness companion that looks at your whole lifestyle and tells you exactly what to do next.

**Target User:**
- Age: 20–35
- Lifestyle: Health-conscious but busy; wants to improve but lacks structure
- Pain points: Doesn't know what exercise to do, forgets to eat well, has no skincare routine, feels disconnected from wellness community
- Behaviour: Uses their phone for everything, expects AI-powered experiences, frustrated by generic advice

- **Status: Done**

---

**Story 1.2 — Research competitor wellness apps**
As a product team, we want to understand what apps like MyFitnessPal, BetterMe, and Headspace do well and where they fall short so that What Now? can differentiate itself.

**Competitor Analysis:**

| App | Strength | Gap |
|---|---|---|
| MyFitnessPal | Calorie tracking, food database | No AI coaching, no fitness or skin features, feels like a spreadsheet |
| BetterMe | Workout plans, meal plans | Pre-set programs only, no real-time pose detection or personalization |
| Headspace | Meditation, mental wellness | Only mental health, zero physical fitness or nutrition |
| Yummly | Recipe suggestions | No health scoring, no pantry logic, not wellness-focused |
| SkinVision | Skin photo analysis | Medical focus only, no product recommendations, no lifestyle integration |

**Key Gap What Now? fills:** No competitor combines AI real-time fitness coaching + nutrition planning + skin/hair analysis + restaurant health scoring + community in a single app with a shared user profile.

- **Status: Done**

---

**Story 1.3 — Define the What Now? product vision and core domains**
As a product team, we want a clear vision statement and a defined set of wellness domains so that we have a north star for all feature decisions.

**Vision Statement:**
What Now? is your personal AI wellness companion. It knows your fitness history, eating habits, skin health, and daily mood — and when you don't know what to do next for your health, it tells you exactly what to do.

**Core Domains confirmed:**
1. **Physical Fitness** — Real-time AI exercise coaching via pose detection. Rep counting, form feedback, voice coaching, AI-generated analyzers for any exercise.
2. **Nutrition** — Meal planning from your pantry, traditional dish optimization, recipe library, wellness insights from eating patterns.
3. **Find Restaurants** — Nearby restaurant search with AI health scoring, food photo scanning, personalized dining insights.
4. **Skin & Hair** — Selfie-based skin and hair analysis, product recommendations, loved products tracker, lifestyle correlation insights.
5. **Community** — Discussion posts, wellness events, daily mood check-ins, user connections, AI-powered people matching.

**Cross-cutting features:**
- Unified JWT auth across all services (one login)
- WellBeing Agent Chat — AI assistant that knows all your data, available on every page
- Shared user profile (fitness goals, diet, skin type, lifestyle)

- **Status: Done**

---

**Story 1.4 — Prioritize features for MVP vs future releases**
As a product team, we want to decide which features ship in MVP and which are deferred so that we build the most valuable thing first.

**MVP (Shipped):**
- Auth (register, login, profile)
- Fitness: Bicep curl + lateral raises with real-time pose tracking
- Fitness: AI agent pipeline for any exercise
- Nutrition: Pantry meal planner, dish optimizer, recipe library
- Restaurants: Yelp search, health scoring, food scanner, favorites
- Skin & Hair: Photo analysis, product recommendations, wellness insights
- Community: Posts, comments, events, mood check-ins, connections
- WellBeing Agent Chat across all services

**Deferred to backlog:**
- Sleep tracking module
- Supplements tracker
- Wearable device integration (heart rate, sleep data)
- Gamification (achievements, streaks, leaderboards)
- Real-time multiplayer workout sessions
- Trainer matching and video calls
- Offline mode / PWA
- Exercise history charts

- **Status: Done**

---

### Epic 2: Architecture & Design

**Description**: Define the system architecture, microservices structure, database schema, API contracts, and shared design patterns across all services.

---

**Story 2.1 — Design microservices structure and port allocation**
As a developer, I want a clear microservices map with assigned ports so that each service can run independently without conflicts.
- Task: Define 7 services across ports 3000–3006
- Task: Document startup commands for each service
- **Status: Done**

| Service | Port |
|---|---|
| Base App | 3000 |
| Yelp Backend | 3001 |
| Skin-Hair Analysis | 3002 |
| Nutrition Wellness | 3003 |
| Yelp Frontend | 3004 |
| Community Backend | 3005 |
| Community Frontend | 3006 |

---

**Story 2.2 — Define shared auth strategy**
As a developer, I want all services to share a single JWT secret so that a user logged in on the base app is automatically authenticated everywhere.
- Task: Choose httpOnly cookie + JWT approach
- Task: Define shared JWT_SECRET pattern across all `.env.local` files
- Task: Document 7-day expiry and bcrypt 10 rounds
- **Status: Done**

---

**Story 2.3 — Design MongoDB collections per service**
As a developer, I want a documented schema for every MongoDB collection so that all services store data consistently.
- Task: Map collections for base app (users, userProfiles, sessions)
- Task: Map collections for nutrition (profiles, recipes, pantry, insights)
- Task: Map collections for yelp (favorites, clicks, insights)
- Task: Map collections for skin-hair (profiles, skin_logs, hair_logs, products)
- Task: Map collections for community (posts, comments, moods, events, connections)
- Task: Map shared agent collections (agent_chats, agent_profile_cache)
- **Status: Done**

---

**Story 2.4 — Define unified navigation and cross-service UX**
As a user, I want consistent navigation across all 7 services so that I can move between modules without getting lost.
- Task: Design fixed top nav with doom theme
- Task: Define cross-service link strategy (absolute localhost URLs)
- Task: Define logo + branding placement
- **Status: Done**

---

**Story 2.5 — Define tech stack**
As a team, we want all technology choices documented so that every engineer uses the same stack.
- Task: Confirm frontend: Next.js 14, React 18, TypeScript, Tailwind CSS
- Task: Confirm AI: Gemini 2.5-flash (NOT 2.0-flash)
- Task: Confirm pose: MediaPipe Pose (WebAssembly, 33 landmarks)
- Task: Confirm voice: ElevenLabs TTS + Web Speech API fallback
- Task: Confirm state: Zustand + TanStack React Query
- **Status: Done**

---

### Epic 3: Auth & User Accounts

**Description**: Implement secure user registration, login, logout, JWT session management, and user profile management across the base app.

---

**Story 3.1 — User registration**
As a new user, I want to create an account with my email and password so that my wellness data is private and persists across sessions.
- Task: `POST /api/auth/register` — hash password (bcrypt 10), insert to `users`, return JWT cookie
- Task: Validate email uniqueness and minimum password length
- Task: Build registration form on homepage
- **Status: Done**

---

**Story 3.2 — User login**
As a returning user, I want to log in with my credentials so that I can access my personal wellness data.
- Task: `POST /api/auth/login` — verify bcrypt hash, generate JWT, set httpOnly cookie (7-day)
- Task: Build login form with error states on homepage
- Task: `GET /api/auth/me` — verify JWT and return current user
- **Status: Done**

---

**Story 3.3 — User logout**
As a user, I want to log out so that my session is cleared and my data is secure.
- Task: `POST /api/auth/logout` — clear auth cookie
- Task: Use `window.location.href` (not Next.js router) for guaranteed redirect
- Task: Clear all `wb_agent_profile_*` from localStorage on logout
- **Status: Done**

---

**Story 3.4 — Cross-service authentication**
As a user, I want to log in once on the base app and be authenticated across all microservices so that I don't have to log in repeatedly.
- Task: Add `auth.ts` JWT verification to skin-hair, nutrition, yelp, community services
- Task: All services share same `JWT_SECRET` in `.env.local`
- Task: Each service redirects to `http://localhost:3000` if not authenticated
- **Status: Done**

---

**Story 3.5 — User profile**
As a logged-in user, I want to view and edit my profile including name, date of birth, height, weight, and lifestyle so that the app can personalize recommendations.
- Task: `GET /api/profile` — fetch from `userProfiles` collection
- Task: `POST /api/profile` — upsert extended profile data
- Task: `POST /api/auth/update-profile` — update name + refresh JWT token
- Task: Build profile page with 3-column responsive grid layout
- Task: Editable fields: name, DOB, height (cm), weight (kg), lifestyle dropdown
- Task: Read-only fields: email, member since, user ID
- **Status: Done**

---

## Sprint 2 — Core Features

### Epic 4: Physical Fitness

**Description**: Implement real-time exercise tracking using MediaPipe pose detection, rep counting, form feedback, voice coaching, and session storage.

---

**Story 4.1 — MediaPipe webcam integration**
As a fitness user, I want the app to detect my body pose through my webcam so that it can track my exercise in real-time.
- Task: Integrate MediaPipe Pose (WebAssembly, 33 landmarks, 30FPS)
- Task: Build `WebcamCapture.tsx` component with canvas skeleton overlay
- Task: Color-coded skeleton (green = good form, red = poor form)
- Task: Display joint angles as text labels on canvas
- Task: Handle camera start/stop with cleanup sequence (stop → close → 200ms → recreate)
- Task: Set `reactStrictMode: false` in `next.config.js` for MediaPipe stability
- **Status: Done**

---

**Story 4.2 — Bicep curl analyzer**
As a fitness user, I want the app to count my bicep curl reps and validate my form so that I exercise safely and effectively.
- Task: Build `BicepCurlAnalyzer.ts` with SEW angle tracking (Shoulder-Elbow-Wrist)
- Task: Rep thresholds: down > 160°, up < 30°
- Task: Form validation: back ≥ 170°, ESH ≤ 30°, knees ≥ 165°, body height ratio ≤ 0.8
- Task: Implement `isInValidPosition` guard — reps only count when form is correct
- Task: Track formScore, postureScore, armPositionScore, visibilityScore
- **Status: Done**

---

**Story 4.3 — Lateral raises analyzer**
As a fitness user, I want the app to count my lateral raise reps and validate my form so that I lift correctly.
- Task: Build `LateralRaisesAnalyzer.ts` with ESH angle tracking (Elbow-Shoulder-Hip)
- Task: Rep thresholds: down ESH ≤ 40°, up ESH 75–100°
- Task: Warning zone: ESH > 110° (arms too high)
- Task: Fix: "arms too high" warning only triggers when ESH < 80° AND phase is 'up'
- Task: Same form validation rules as bicep curl
- **Status: Done**

---

**Story 4.4 — Voice feedback system**
As a fitness user, I want to hear voice coaching during exercise so that I can focus on my form without reading the screen.
- Task: Build `VoiceFeedbackManager.ts` with priority queue (HIGH/MEDIUM/LOW)
- Task: Rate limiting: 3s between messages, HIGH priority bypasses limits
- Task: Max queue size 4 — drops oldest low-priority messages
- Task: Integrate ElevenLabs TTS (`eleven_turbo_v2_5`, Sarah voice `EXAVITQu4vr4xnSDxMaL`)
- Task: Fallback to Web Speech API on ElevenLabs error
- Task: AbortController for cancelling in-flight fetches on stop
- Task: Mute toggle on fitness page
- **Status: Done**

---

**Story 4.5 — Exercise session storage**
As a fitness user, I want my exercise sessions saved so that I can track my progress over time.
- Task: `POST /api/fitness/sessions` — save exercise, reps, duration, form scores
- Task: `GET /api/fitness/sessions` — fetch user history (last 10)
- Task: MongoDB collection: `sessions` (userId, exercise, date, reps, duration, formScore, postureScore, armPositionScore, visibilityScore)
- **Status: Done**

---

**Story 4.6 — Fitness page UI**
As a fitness user, I want a clean, full-screen fitness interface with camera feed, controls, and live metrics.
- Task: Exercise selector dropdown (Bicep Curl, Lateral Raises)
- Task: Control buttons: Play, Stop, Reset, Camera, Voice, Exit
- Task: Sticky top bar (below navbar, `sticky top-16 z-40`)
- Task: Camera view: 55vh height, rounded, bordered
- Task: Right-side HUD: Form %, Posture %, Phase, Rep count
- Task: Chat overlay: last 4 messages as gradient at bottom of camera view
- Task: `fitness.css` responsive layout (mobile/tablet/desktop)
- **Status: Done**

---

### Epic 5: Nutrition

**Description**: AI-powered meal planning, recipe management, pantry tracking, authentic dish optimization, and wellness insights.

---

**Story 5.1 — Nutrition profile management**
As a nutrition user, I want to set my dietary goals, restrictions, and preferences so that all meal recommendations are personalized.
- Task: `GET/PUT /api/nutrition/profile` — fetch and upsert profile
- Task: Fields: dietary goals, restrictions, allergies, cuisine preferences
- Task: MongoDB collection: `nutrition_profiles`
- **Status: Done**

---

**Story 5.2 — Pantry meal planner**
As a nutrition user, I want to enter ingredients I have at home and get AI-generated meal ideas so that I reduce food waste and eat healthier.
- Task: `GET/PUT /api/nutrition/pantry-items` — manage pantry ingredients
- Task: `POST /api/nutrition/pantry/generate` — call Gemini to generate meals from pantry
- Task: MongoDB collections: `pantry_items`, `generated_recipes`
- **Status: Done**

---

**Story 5.3 — Authentic dish optimizer**
As a nutrition user, I want to input a traditional recipe and have the AI modify it for my health goals so that I don't have to give up the food I love.
- Task: `POST /api/nutrition/authentic/optimize` — Gemini rewrites dish to meet user goals
- Task: MongoDB collection: `authentic_dish_requests`
- **Status: Done**

---

**Story 5.4 — Recipe library**
As a nutrition user, I want to search, save, modify, and manage recipes so that I can build a personal collection.
- Task: `GET/POST /api/nutrition/recipes` — list and create recipes
- Task: `POST /api/nutrition/recipes/[id]/save` — save/unsave recipe
- Task: `POST /api/nutrition/recipes/[id]/modify` — AI-powered recipe modification
- Task: `POST /api/nutrition/recipes/[id]/duplicate` — clone recipe
- Task: Filter by tags, cuisine, source (generated/custom/optimized)
- Task: MongoDB collections: `generated_recipes`, `saved_recipes`, `recipe_modifications`
- **Status: Done**

---

**Story 5.5 — Nutrition wellness insights**
As a nutrition user, I want the app to analyze my activity and generate personalized insights so that I understand my eating patterns.
- Task: `GET/POST /api/nutrition/insights` — fetch and generate insights
- Task: Activity tracking via 15-minute sessions
- Task: `POST /api/nutrition/insight-memory/finalize` — finalize session and generate insight
- Task: MongoDB collections: `nutrition_sessions_summary`, `meal_pattern`, `nutrition_insight_memory`
- **Status: Done**

---

### Epic 6: Find Restaurants

**Description**: Yelp-powered restaurant search with AI health scoring, food photo scanning, favorites management, and dining insights.

---

**Story 6.1 — Restaurant search**
As a user, I want to search nearby restaurants by location, cuisine, and price so that I can find places to eat.
- Task: `GET /api/yelp` — proxy to Yelp API with location, category, price, sort filters
- Task: 16 cuisine category types in filter panel
- Task: Geolocation detection (browser geolocation + IP-based fallback)
- Task: Restaurant cards: name, image, rating, review count, categories, location
- **Status: Done**

---

**Story 6.2 — AI health scoring**
As a user, I want to see an AI-generated health score for each restaurant so that I can make smarter dining decisions.
- Task: `POST /api/health-score` — batch score restaurants via Gemini (1–10 rating with reasoning)
- Task: Display health score badge on restaurant cards
- **Status: Done**

---

**Story 6.3 — Food photo scanner**
As a user, I want to upload a photo of food and get a nutritional breakdown so that I know what I'm eating.
- Task: `POST /api/food-scan` — Gemini vision analyzes base64 image
- Task: Output: individual foods, calories, macros, health score, healthier alternatives
- Task: Camera capture tab in restaurant search UI
- **Status: Done**

---

**Story 6.4 — Favorite restaurants**
As a user, I want to save and filter my favorite healthy restaurants so that I can quickly find them again.
- Task: `GET/POST /api/favorites` — toggle favorite (add/remove)
- Task: Heart button on restaurant cards with persistent state
- Task: Favorites filter to show only liked restaurants
- Task: MongoDB collection: `favorites`
- **Status: Done**

---

**Story 6.5 — Dining activity tracking and insights**
As a user, I want the app to learn my dining preferences from my activity and generate insights so that I get personalized recommendations.
- Task: `POST /api/track-click` — log search, view, favorite actions
- Task: `GET/POST /api/insights` — fetch and generate dining insights every 10 minutes
- Task: MongoDB collections: `clicks`, `yelp-insights`
- **Status: Done**

---

### Epic 7: Skin & Hair Analysis

**Description**: AI-powered skin and hair analysis from uploaded photos, product recommendations, loved products tracking, and wellness insights.

---

**Story 7.1 — Skin analysis**
As a user, I want to upload a selfie and receive a skin analysis so that I know the state of my skin.
- Task: `POST /api/skin-hair/analyze` — Gemini vision analyzes image (skin mode)
- Task: Scores (0–10): dryness, oiliness, acne-like appearance, dark circles
- Task: Confidence levels: low, medium, high
- Task: Discard raw image after analysis (privacy)
- Task: MongoDB collection: `skin_logs`
- **Status: Done**

---

**Story 7.2 — Hair analysis**
As a user, I want to upload a hair photo and receive an analysis so that I can improve my hair health.
- Task: `POST /api/skin-hair/analyze` — Gemini vision analyzes image (hair mode)
- Task: Scores (0–10): scalp dryness, dandruff-like flaking, thinning appearance
- Task: MongoDB collection: `hair_logs`
- **Status: Done**

---

**Story 7.3 — Skin/hair profile**
As a user, I want to set my skin type, scalp type, concerns, and allergies so that recommendations are personalized.
- Task: `GET/PUT /api/skin-hair/profile` — fetch and upsert profile
- Task: Profile setup wizard in UI
- Task: MongoDB collection: `skin_hair_profiles`
- **Status: Done**

---

**Story 7.4 — Product recommendations**
As a user, I want AI-generated product recommendations based on my skin/hair profile so that I use products that actually suit me.
- Task: `GET/POST /api/skin-hair/recommendations` — fetch and generate recommendations
- Task: Match score, ingredients list, reasoning per recommendation
- Task: MongoDB collection: `product_recommendations`
- **Status: Done**

---

**Story 7.5 — Loved products tracker**
As a user, I want to track products I already love so that the AI factors them into recommendations.
- Task: `GET/POST/PUT/DELETE /api/skin-hair/loved-products` — full CRUD
- Task: Gemini-powered ingredient lookup from brand/product name
- Task: MongoDB collection: `loved_products`
- **Status: Done**

---

**Story 7.6 — Skin/hair wellness insights**
As a user, I want insights correlating my skin/hair health with my lifestyle so that I can make holistic improvements.
- Task: `GET/POST /api/skin-hair/wellness-insights` — generate correlations (sleep, workout, nutrition, supplements)
- Task: MongoDB collection: `skin_hair_pattern`
- **Status: Done**

---

## Sprint 3 — Intelligence

### Epic 8: Intelligent Fitness Assistant (AI Agent Pipeline)

**Description**: AI-powered exercise analyzer generation pipeline using simulation, spec generation, and automated testing. Replaces hardcoded analyzers with dynamically generated ones for any exercise.

---

**Story 8.1 — Async job pipeline infrastructure**
As a developer, I want an async pipeline with job tracking so that analyzer generation doesn't block the fitness conversation.
- Task: Build in-memory job store `global._jobQueue` (survives Next.js HMR)
- Task: Job lifecycle: queued → running → testing → retrying → done/failed
- Task: `POST /api/video-agents/generate` — create job, fire pipeline async, return `{ jobId }` immediately
- Task: `GET /api/video-agents/job/[jobId]` — poll status, log, result every 2s
- Task: `GET /api/video-agents/jobs` — list all jobs for dashboard
- Task: Auto-delete jobs older than 30 minutes
- **Status: Done**

---

**Story 8.2 — Simulation agent**
As a developer, I want an AI agent that generates simulated pose data for any exercise so that the spec agent has real angle ranges to work with.
- Task: Build `SIM_SYSTEM` prompt in `agents.ts`
- Task: `callGemini()` with `maxOutputTokens: 16384` and `jsonMode: true`
- Task: `parseSimData()` — parse 30 frames, clamp angles to [0–180], bodyHeightRatio to [0–1.2]
- Task: Extract observed angle stats (min/max per joint) from sim output
- Task: Run sim FIRST in pipeline before spec agent
- **Status: Done**

---

**Story 8.3 — Spec agent**
As a developer, I want an AI agent that generates an `AnalyzerSpec` JSON for any exercise so that the runtime can execute it without JavaScript generation.
- Task: Build `SPEC_SYSTEM` prompt in `agents.ts` (with observed angle ranges embedded)
- Task: Define `AnalyzerSpec` type in `specEngine.ts`: phases, transitions, formChecks, entryChecks
- Task: `parseAnalyzerResponse()` — extract spec + cameraSetup + cameraInstructions
- Task: `normalizeAnalyzerSpec()` — inject standing exercise checks, clamp values, validate structure
- Task: Never use `responseSchema` — only `responseMimeType: "application/json"`
- **Status: Done**

---

**Story 8.4 — Automated tester with retry loop**
As a developer, I want an automated tester that validates the spec against sim data so that broken analyzers are never shown to users.
- Task: Build `runTester()` in `agents.ts` — run spec 3× through 30-frame sim (90 frames = 3 reps)
- Task: Checks: no runtime errors, reps ≥ expectedReps–1, phases cycle, valid frames exist
- Task: 1-rep tolerance: pass on 2+ reps when expecting 3
- Task: Retry loop up to 3 attempts in `jobQueue.ts`
- Task: `buildRetryPrompt()` — embed angle stats + diagnostic warnings (inverted thresholds, out-of-range values)
- **Status: Done**

---

**Story 8.5 — Spec engine runtime**
As a developer, I want a runtime that interprets `AnalyzerSpec` JSON into a live exercise analyzer so that no dynamic JavaScript evaluation is needed.
- Task: Build `createAnalyzerFromSpec()` in `specEngine.ts`
- Task: Per-frame logic: check entry conditions → match phase → check form → process transitions → increment reps
- Task: Derived metrics: avgElbow, avgShoulder, avgKnee, avgHip
- Task: `precompute.ts` — MediaPipe 33 landmarks → `ExerciseFrame` (10 angles + 5 meta)
- Task: Orientation detection: `shoulderSpanRatio` + `shoulderVisibilityAsymmetry` → front/side/unclear
- **Status: Done**

---

**Story 8.6 — Master fitness coach chatbot**
As a fitness user, I want a conversational AI coach on the fitness page so that I can discuss exercises naturally and get real-time coaching during my workout.
- Task: `POST /api/video-agents/master` — full conversation history chatbot (gemini-2.5-flash)
- Task: State machine: greeting → gathering → preparing → ready → exercising → reviewing
- Task: Max 15 words per response (spoken aloud)
- Task: Send full `conversationHistoryRef` on every call (standard chatbot pattern)
- Task: Frame snapshot every 6s during exercise → silent coaching cue to master
- Task: `isSendingRef` prevents concurrent master calls
- Task: Fix echo loop: `isSpeakingRef` + 600ms grace + `recognition.onend` guard + `onresult` guard
- Task: Mic disabled during exercise (`isExerciseActiveRef` guard)
- **Status: Done**

---

**Story 8.7 — Pipeline log dashboard**
As a developer, I want a dedicated page showing all pipeline jobs with live log streaming so that I can debug generation failures.
- Task: Build `/fitness/logs` page — polls `/api/video-agents/jobs` every 2s
- Task: Color-coded log entries: red=error, green=pass, orange=retry, grey=normal
- Task: Expandable job cards: exercise name, status badge, attempts, tester result
- Task: Auto-expand active jobs, auto-collapse finished
- Task: Toggle: Live/Paused refresh
- Task: Status pill on fitness page links to logs page in new tab
- **Status: Done**

---

### Epic 9: WellBeing Agent Chat

**Description**: Floating draggable AI chat assistant present on all 6 services. Builds a cross-service user profile from MongoDB and uses Gemini function calling to answer personalized wellness questions.

---

**Story 9.1 — Floating agent chat sticker**
As a user, I want a floating robot sticker on every page that opens a chat panel so that I can ask wellness questions from anywhere in the app.
- Task: Build `AgentChat.tsx` — draggable robot sticker (repositionable)
- Task: 340×480px chat panel, appears upper-left of sticker
- Task: Deploy across all 5 services: base, skin-hair, nutrition-wellness, yelp-frontend, community-frontend
- **Status: Done**

---

**Story 9.2 — Cross-service profile builder**
As a user, I want the agent to know my full wellness history so that its answers are personalized and accurate.
- Task: `GET /api/agent/profile` — fetch from 18 collections (2-day window)
- Task: Gemini synthesizes 4–6 sentence profile from raw data
- Task: Cache profile in `agent_profile_cache` MongoDB collection (24hr TTL)
- Task: Cache in localStorage per origin (24hr TTL)
- Task: Age calculated server-side with proper month/day boundary check
- Task: On logout: clear all `wb_agent_profile_*` from localStorage
- **Status: Done**

---

**Story 9.3 — Gemini function calling chat**
As a user, I want the agent to look up my real data when answering questions so that it never hallucinations about my wellness history.
- Task: `POST /api/agent/chat` — Gemini with `get_user_data` tool (queries any allowed collection)
- Task: Up to 4 function-calling rounds per message
- Task: Enforce fact-checking: only state what is explicitly in data
- Task: Max 600 tokens output
- Task: `GET /api/agent/history` — last 40 messages from `agent_chats`
- Task: MongoDB collection: `agent_chats` (persists across all services)
- **Status: Done**

---

## Sprint 4 — Community & Polish

### Epic 10: Community

**Description**: Social wellness features including discussion posts, community events, daily mood check-ins, user connections, and AI-powered people matching.

---

**Story 10.1 — Community posts and comments**
As a user, I want to post wellness updates and comment on others' posts so that I feel supported on my wellness journey.
- Task: `GET/POST /api/posts` — create posts (title, body, tags), sort by recent/popular
- Task: `PATCH /api/posts` — upvote toggle per user
- Task: `GET/POST /api/comments` — threaded comments on posts
- Task: 8 predefined tags for filtering
- Task: Build `PostCard.tsx`, `CreatePostModal.tsx`
- Task: Build `CommunityPage.tsx` with Discussion tab
- **Status: Done**

---

**Story 10.2 — Community events**
As a user, I want to create and join wellness events so that I can stay motivated with group challenges.
- Task: `GET/POST /api/events` — create events (title, description, date, time, location, category)
- Task: `PATCH /api/events` — RSVP/attendance toggle
- Task: 6 event categories: fitness, nutrition, mindfulness, social, outdoors, general
- Task: Build `EventsCalendar.tsx`
- Task: MongoDB collection: `community-events`
- **Status: Done**

---

**Story 10.3 — Daily mood check-in**
As a user, I want to log my daily mood and see how the community is feeling so that I stay connected and motivated.
- Task: `GET/POST /api/mood` — daily upsert (one entry per user per day, 1–5 scale)
- Task: Community stats: average mood, total check-ins, distribution histogram
- Task: 7-day personal mood history with emoji chart
- Task: Build `MoodCheckin.tsx`
- Task: MongoDB collection: `community-moods`
- **Status: Done**

---

**Story 10.4 — User connections**
As a user, I want to follow other users so that I can build a personal wellness network.
- Task: `GET/POST /api/connections` — follow/unfollow (fromUserId → toUserId)
- Task: Connected users shown with visual badge on posts
- Task: MongoDB collection: `community-connections`
- **Status: Done**

---

**Story 10.5 — People Like You**
As a user, I want to discover users with similar wellness interests so that I can connect with the right people.
- Task: `GET /api/people-like-you` — AI matching (score = shared_interests × 2 + post_count)
- Task: Top 5 similar users displayed in sidebar
- Task: Gemini generates 1-sentence community insight
- Task: Build `PeopleLikeYou.tsx`
- **Status: Done**

---

### Epic 11: Infrastructure & DevOps

**Description**: Shared infrastructure, environment configuration, MongoDB setup, security patches, and cross-service integration patterns.

---

**Story 11.1 — MongoDB Atlas connection with TLS fix**
As a developer, I want MongoDB to connect reliably on Node 22 so that all services work in production.
- Task: Add `tlsInsecure: true` to MongoDB options in `base/src/lib/mongodb.ts`
- Task: Use `globalThis._mongoClientPromise` for HMR-safe connection pooling
- Task: Note: must restart server after editing `mongodb.ts` (cache not hot-reloaded)
- **Status: Done**

---

**Story 11.2 — Environment variable management**
As a developer, I want all secrets managed in `.env.local` files so that credentials are never committed to git.
- Task: Create `.env.local` for all 7 services (MONGODB_URI, GEMINI_API_KEY, JWT_SECRET)
- Task: Confirm all `.env.local` files are gitignored
- Task: Create `.env.local.example` with placeholder values
- Task: Revoke leaked Gemini API key, issue new key across all services
- **Status: Done**

---

**Story 11.3 — Unified navigation across all services**
As a user, I want the same navigation bar on every service so that the app feels like one product.
- Task: Fixed top nav with backdrop blur and doom theme colors
- Task: Mobile hamburger menu with framer-motion slide-in overlay
- Task: Profile button with username, logout button
- Task: Logo (`logo.jpg`) with `mix-blend-screen` on all navs
- Task: `getHref()` helper to avoid stale closures
- Task: Deploy nav to: base, skin-hair, nutrition-wellness, yelp-frontend, community-frontend
- **Status: Done**

---

**Story 11.4 — App branding — What Now?**
As a product team, we want consistent branding across all services so that the app feels cohesive.
- Task: Rename app from WellBeing to "What Now?" across all services
- Task: Update page titles in all layouts
- Task: Add logo to all navigation bars
- Task: Update homepage to 6-screen full-screen slider (numbered circles bottom-right)
- **Status: Done**

---

**Story 11.5 — Security hardening**
As a developer, I want to ensure no credentials are exposed in the codebase so that the app is secure.
- Task: Redact all leaked API keys from `base/docs/` and `docs/` markdown files
- Task: Revoke compromised Gemini API key (leaked via committed docs)
- Task: Confirm `.env.local` is in `.gitignore` for all services
- Task: Use httpOnly cookies (not localStorage) for JWT — prevents XSS
- **Status: Done**

---

## Backlog (Future Sprints)

These items were scoped out of MVP and are in the backlog for future sprints:

| Story | Epic |
|---|---|
| Sleep tracking module | Future: Sleep & Recovery |
| Supplements tracker | Future: Supplements |
| Wearable device integration (heart rate, sleep) | Future: Wearables |
| Gamification (achievements, streaks, leaderboards) | Future: Engagement |
| Real-time multiplayer workout sessions | Future: Social Fitness |
| Trainer matching and video calls | Future: Marketplace |
| Meal photo analysis with nutritional breakdown | Nutrition |
| Offline mode with local storage | Infrastructure |
| Progressive Web App (PWA) for mobile install | Infrastructure |
| Exercise history charts and progress tracking | Physical Fitness |
| Skin/hair comparison charts over time | Skin & Hair |

---

## Collections Reference

| Collection | Service | Purpose |
|---|---|---|
| `users` | Base | User accounts |
| `userProfiles` | Base | Extended profile (DOB, height, weight, lifestyle) |
| `sessions` | Base | Exercise session records |
| `nutrition_profiles` | Nutrition | Dietary goals and preferences |
| `pantry_items` | Nutrition | User ingredient inventory |
| `generated_recipes` | Nutrition | AI-generated recipes |
| `saved_recipes` | Nutrition | User-saved recipes |
| `recipe_modifications` | Nutrition | Recipe modification history |
| `authentic_dish_requests` | Nutrition | Dish optimization history |
| `nutrition_sessions_summary` | Nutrition | Activity tracking sessions |
| `meal_pattern` | Nutrition | Generated nutrition insights |
| `favorites` | Yelp | Favourite restaurants |
| `clicks` | Yelp | User activity tracking |
| `yelp-insights` | Yelp | AI dining preference insights |
| `skin_hair_profiles` | Skin-Hair | User skin/hair profile |
| `skin_logs` | Skin-Hair | Skin analysis history |
| `hair_logs` | Skin-Hair | Hair analysis history |
| `loved_products` | Skin-Hair | User's favourite products |
| `product_recommendations` | Skin-Hair | AI product recommendations |
| `skin_hair_pattern` | Skin-Hair | Lifestyle correlation insights |
| `community-posts` | Community | Discussion posts |
| `community-comments` | Community | Post comments |
| `community-moods` | Community | Daily mood check-ins |
| `community-events` | Community | Wellness events |
| `community-connections` | Community | User follow relationships |
| `agent_chats` | Shared | WellBeing agent chat history |
| `agent_profile_cache` | Shared | Cross-service profile cache (24hr TTL) |
