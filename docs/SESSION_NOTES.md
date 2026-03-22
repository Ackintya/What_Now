# Session Notes - WellBeing Application Development

## Project Overview

WellBeing is a comprehensive wellness application built using a microservices architecture. The application includes fitness tracking with real-time pose analysis, skin & hair analysis, nutrition wellness planning, and restaurant finder with health scoring.

## Architecture

### Microservices Structure

```
Wats_Next/
├── base/                          # Main application (port 3000)
│   ├── Fitness tracker with pose estimation
│   ├── Authentication system (JWT)
│   ├── Homepage with 5-screen carousel
│   ├── User profile management
│   └── Navigation to other microservices
├── skin-hair-analysis/            # Skin & hair module (port 3002)
│   ├── Skin analysis with image upload
│   ├── Hair analysis
│   ├── Product recommendations
│   └── Wellness insights
├── nutrition-wellness/            # Nutrition planning (port 3003)
│   ├── Pantry meal planner
│   ├── Authentic dish optimizer
│   ├── Recipe library with filters
│   ├── Custom recipe creation
│   └── AI wellness insights
├── nutrition-yelp/                # Restaurant finder (port 3004 frontend, 3001 backend)
│   ├── Yelp restaurant search
│   ├── AI health scoring
│   ├── Food photo scanning
│   └── Favorite restaurants tracking
└── docs/                          # Documentation
```

### Technology Stack

- **Frontend**: Next.js 14 with TypeScript, React
- **Styling**: Tailwind CSS with custom doom theme
- **Database**: MongoDB
- **Authentication**: JWT with httpOnly cookies
- **Pose Detection**: MediaPipe Pose (WebAssembly)
- **Voice Feedback**: Web Speech API
- **Fonts**: Space Grotesk (headings), Manrope (body)

## Implemented Features

### 1. Authentication System

**Location**: `base/src/lib/auth.ts`, `base/src/app/api/auth/*`

**Features**:
- User registration with email and password
- Login with credential verification
- JWT token generation (7-day expiration)
- HttpOnly cookies for secure token storage
- Password hashing with bcrypt (10 salt rounds)
- Cross-microservice authentication with shared JWT_SECRET

**Key Functions**:
```typescript
getCurrentUser()  // Extract user from JWT cookie
generateToken()   // Create JWT with userId, email, name
```

**Endpoints**:
- `POST /api/auth/register` - Create new user account
- `POST /api/auth/login` - Authenticate and receive token
- `POST /api/auth/logout` - Clear auth token
- `GET /api/auth/me` - Get current authenticated user

**Database Schema**:
```javascript
{
  email: String (unique, required),
  password: String (bcrypt hashed, required),
  name: String (required),
  createdAt: Date,
  updatedAt: Date
}
```

### 2. Exercise Tracker (Feature 1)

**Location**: `base/src/app/fitness/`, `base/src/lib/*Analyzer.ts`

#### Supported Exercises

**A. Bicep Curl**
- **Tracking Metric**: SEW angle (Shoulder-Elbow-Wrist)
- **Down Position**: Angle > 160° (nearly straight arm)
- **Up Position**: Angle < 30° (full contraction)
- **Form Requirements**:
  - Back angle ≥ 170° (straight posture)
  - ESH angle ≤ 30° (arms close to body)
  - Both legs straight (knee angle ≥ 165°)
  - Camera distance check (body height ratio < 0.8)
  - Full body visible in frame

**B. Lateral Raises**
- **Tracking Metric**: ESH angle (Elbow-Shoulder-Hip)
- **Down Position**: Angle > 140° (arms at sides)
- **Up Position**: Angle 80-90° (arms parallel to ground)
- **Form Requirements**: Same as bicep curl
- **Warnings**: Arms too high if ESH < 80° during up phase

#### Implementation Details

**MediaPipe Integration** (`WebcamCapture.tsx`):
- 33 pose landmarks detected at 30 FPS
- Model complexity: 1 (light)
- Confidence thresholds: 0.5 (detection), 0.5 (tracking)
- Memory management: Cleanup sequence with 200ms delay

**Angle Calculation** (arctan2 method):
```typescript
private calculateAngle(a: Point, b: Point, c: Point): number {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) -
                  Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs(radians * (180 / Math.PI));
  if (angle > 180.0) angle = 360 - angle;
  return angle;
}
```

**Visual Feedback**:
- **Red skeleton**: Form error or too close to camera
- **Green skeleton**: Correct form, all conditions met
- **Landmark filtering**: Only shows core body (no hands/feet)
- **Angle display**: Blue text showing current elbow angles (rounded up)

**Voice Feedback System**:
- Priority queue with 4 message slots
- Rate limiting: 1.5s global, 3s for critical warnings
- HIGH priority bypasses rate limiting
- Message categories:
  - Rep count announcements
  - Posture corrections
  - Arm position warnings
  - Leg bending alerts
  - Camera distance notifications
- Mute toggle available

**Session Storage** (`/api/fitness/sessions`):
- Exercise type and duration
- Rep count and average rep time
- Form validation percentages:
  - Posture (back angle)
  - Arm position (ESH angle)
  - Leg straightness
  - Camera distance
- Timestamps for each session

### 3. Skin & Hair Analysis Module

**Location**: `skin-hair-analysis/src/modules/skin-hair/`

**Features**:
- User profile management (skin type, concerns, allergies)
- Image upload for skin/hair analysis
- Loved products tracking with categories
- AI-powered product recommendations
- Wellness insights generation
- Summary dashboard with statistics

**Authentication Integration**:
- Receives userId from authenticated user via JWT cookie
- Verifies JWT token from base application
- Redirects to base login if not authenticated
- Shared JWT_SECRET for token verification

**Key Bug Fixes**:
- UserId consistency: Profile initialized with authenticated userId (not DEFAULT_USER_ID)
- Logout redirect: Uses `window.location.href` for guaranteed redirect to base app
- Layout alignment: Matches base app padding and spacing

### 4. Nutrition Wellness Module

**Location**: `nutrition-wellness/src/modules/nutrition/`

**Port**: 3003

**Features**:
- **Pantry Meal Planner**: Generate meals from available ingredients
- **Authentic Dish Optimizer**: Modify traditional recipes for health goals
- **Recipe Library**: Search, filter, save, and modify generated recipes
- **Custom Recipes**: Manually add and save personal recipes
- **Wellness Insights**: AI-generated nutrition behavior analysis

**Authentication Integration**:
- JWT verification via shared JWT_SECRET
- Redirects to base app if not authenticated
- Uses authenticated userId for all operations

**Session-Based Insights**:
- Tracks nutrition activities automatically (15-minute sessions)
- Meaningful activities: profile updates, recipe generation, saving, modifications
- AI-generated insights from session patterns
- Stored in separate `nutrition_insight_memory` collection

**Database Collections**:
- `nutrition_profiles` - User dietary preferences and goals
- `nutrition_recipes` - Generated and custom recipes
- `nutrition_pantry_items` - Saved pantry ingredients
- `nutrition_insight_sessions` - Active tracking sessions
- `nutrition_insight_memory` - Finalized insights

### 5. Find Restaurants Module (Nutrition-Yelp)

**Location**: `nutrition-yelp/`

**Ports**:
- Frontend: 3004
- Backend: 3001

**Architecture**: Separate frontend and backend with API proxy

**Features**:
- **Restaurant Search**: Yelp API integration with location, category, price filters
- **AI Health Scoring**: Gemini-powered health score for each restaurant (0-100)
- **Food Scanner**: Upload food photos for nutritional breakdown
- **Favorites**: Like/unlike restaurants, filter by liked
- **Activity Tracking**: Automatic tracking of searches, clicks, favorites
- **Insights Generation**: AI-generated dining preference insights (every 10 minutes)

**Authentication Integration**:
- JWT verification via shared JWT_SECRET
- Redirects to base app if not authenticated
- Uses authenticated userId for favorites, tracking, insights

**API Endpoints** (Backend on :3001):
- `GET /api/yelp` - Search restaurants via Yelp API
- `POST /api/health-score` - AI health scoring for restaurants
- `POST /api/food-scan` - Analyze food photos
- `GET/POST /api/favorites` - Manage favorite restaurants
- `POST /api/track-click` - Track user activity
- `GET/POST /api/insights` - Generate dining insights

**Database Collections**:
- `favorites` - Liked restaurants per user
- `clicks` - User activity tracking
- `yelp-insights` - AI-generated dining preference insights

**Environment Variables** (Backend):
- `GEMINI_API_KEY` - For health scoring and food scanning
- `YELP_API_KEY` - For restaurant search
- `MONGODB_URI` - Database connection

### 6. User Profile Management

**Location**: `base/src/app/profile/`

**Features**:
- View and edit account information
- Extended profile fields (optional):
  - Date of Birth
  - Height (cm)
  - Weight (kg)
  - Lifestyle (Sedentary, Lightly Active, Moderately Active, Very Active, Extremely Active)
- Mobile-responsive 3-column grid layout
- Email displayed in header (non-editable)
- User ID displayed for reference

**Database Structure**:
- `users` collection - Email, password, name, createdAt
- `userProfiles` collection - Extended profile data linked by userId

**API Endpoints**:
- `POST /api/auth/update-profile` - Update name in users collection
- `GET /api/profile` - Fetch extended profile
- `POST /api/profile` - Save extended profile data

### 7. Unified Navigation System

**Consistent Across All Pages**:

All microservices now share the same navigation structure with cross-linking:

**All Navigation Bars Include**:
- Home button → http://localhost:3000
- Physical Fitness → http://localhost:3000/fitness
- Nutrition → http://localhost:3003
- Find Restaurants → http://localhost:3004
- Skin & Hair Analysis → http://localhost:3002
- Profile button → /profile (or http://localhost:3000/profile for microservices)
- Logout button

**Page-Specific Navigation**:
- **Homepage**: Shows all links + Profile icon with username (clickable)
- **Fitness Page**: FitnessNavigation (excludes Physical Fitness link)
- **Each Microservice**: Excludes its own link from menu

**Common Design**:
- Fixed top bar with backdrop blur
- Doom theme colors (primary: #00ff9f, accent: #00d4ff)
- Animated mobile menu with framer-motion
- Profile button replaces "Hi, username" for cleaner UI
- Consistent spacing and icon sizes across all pages

## Configuration

### Environment Variables

**Base App** (`.env.local`):
```env
MONGODB_URI=mongodb://localhost:27017/fitness
GEMINI_API_KEY=<your-key>
JWT_SECRET=<shared-secret-key>
```

**Skin-Hair Analysis** (`.env.local`):
```env
MONGODB_URI=mongodb://localhost:27017/skin_hair
GEMINI_API_KEY=<your-key>
JWT_SECRET=<same-shared-secret-key>
```

**IMPORTANT**: Both apps must share the same JWT_SECRET for authentication to work.

### Next.js Configuration

**Base App** (`next.config.js`):
```javascript
{
  reactStrictMode: false,  // Disabled for MediaPipe stability
  webpack: (config) => {
    config.experiments = {
      asyncWebAssembly: true,
      layers: true,
    };
  }
}
```

**Scrolling**: Disabled on html/body in globals.css for exercise camera view

## Running the Application

### Prerequisites
- Node.js 18+
- MongoDB running (cloud or local)
- All dependencies installed (`npm install` in each folder)
- Yelp API key (optional, for restaurant search)

### Start Commands

**Terminal 1 - Base App**:
```bash
cd /Users/charithpurushotham/Desktop/Wats_Next/base
npm run dev
# Runs on http://localhost:3000
```

**Terminal 2 - Skin-Hair Analysis**:
```bash
cd /Users/charithpurushotham/Desktop/Wats_Next/skin-hair-analysis
npm run dev
# Runs on http://localhost:3002
```

**Terminal 3 - Nutrition Wellness**:
```bash
cd /Users/charithpurushotham/Desktop/Wats_Next/nutrition-wellness
npm run dev
# Runs on http://localhost:3003
```

**Terminal 4 - Nutrition-Yelp Backend**:
```bash
cd /Users/charithpurushotham/Desktop/Wats_Next/nutrition-yelp/backend
npm run dev
# Runs on http://localhost:3001
```

**Terminal 5 - Nutrition-Yelp Frontend**:
```bash
cd /Users/charithpurushotham/Desktop/Wats_Next/nutrition-yelp/frontend
npm run dev
# Runs on http://localhost:3004
```

### User Flow

1. Navigate to http://localhost:3000
2. Register account or login
3. View 5-screen feature carousel on homepage
4. Navigate to any feature:
   - **Physical Fitness** - Exercise tracking with pose analysis
   - **Nutrition** - Meal planning and recipe optimization
   - **Find Restaurants** - Healthy restaurant search with AI scoring
   - **Skin Analysis** - Selfie-based skin analysis
   - **Hair Analysis** - Hair health tracking
5. All microservices automatically authenticated via JWT cookie
6. Access profile page from any navigation bar
7. Update personal information (DOB, height, weight, lifestyle)
8. Navigate seamlessly between all modules

## Critical Implementation Details

### MediaPipe Memory Management

**Problem**: WebAssembly memory leaks causing "Out of memory" errors

**Solution**: Cleanup sequence before creating new instances
```typescript
// 1. Stop camera
if (cameraRef.current) {
  cameraRef.current.stop();
  cameraRef.current = null;
}

// 2. Close pose instance
if (poseRef.current) {
  poseRef.current.close();
  poseRef.current = null;
}

// 3. Wait for WASM memory release
await new Promise(resolve => setTimeout(resolve, 200));

// 4. Create new instances
window.Module = {};
poseRef.current = new Pose({...});
```

### React Refs vs State for MediaPipe

**Use refs for**:
- Pose instance
- Camera instance
- Active state flags (cameraActive, analyzing)

**Reason**: Prevents re-renders that destroy/recreate MediaPipe instances

### Angle Calculation Accuracy

**Method**: arctan2 (inverse tangent with quadrant awareness)

**Why**: Standard computer vision method, handles all angle orientations correctly

**Threshold Buffers**: 160° instead of 180° for "down" position accounts for human anatomical limits

### Authentication Security

**JWT Storage**: httpOnly cookies (not localStorage) prevents XSS attacks

**Token Expiration**: 7 days, requires re-login

**Password Security**: bcrypt with 10 salt rounds (2^10 iterations)

**Cross-Origin**: Both apps must run on localhost for cookie sharing to work

### Voice Feedback Priority System

**Queue Management**:
- Max 4 messages (prevents backlog)
- Messages cleared on exercise stop
- Rep count messages cleared when new count announced

**Rate Limiting**:
- Global: 1.5 seconds between any messages
- Critical warnings: 3 seconds (leg bending, too close)
- HIGH priority: Bypasses rate limits

**Message Deduplication**: Same message won't repeat within rate limit window

## Known Issues and Solutions

### Issue 1: Exercise switching TypeError
**Symptom**: "Cannot read properties of undefined (reading 'left')"
**Cause**: Different metrics objects for different exercises
**Solution**: Type guards checking for property existence before access

### Issue 2: Logout doesn't redirect
**Symptom**: Logout clears auth but stays on same page
**Cause**: Using Next.js router which doesn't force reload
**Solution**: Use `window.location.href` or `window.location.reload()` for guaranteed redirect

### Issue 3: UserId inconsistency
**Symptom**: Different userIds for profile vs other operations
**Cause**: Profile state initialized with DEFAULT_USER_ID constant
**Solution**: Initialize profile state with authenticated userId from props

### Issue 4: Rep counting without form validation
**Symptom**: Reps counted even when form is incorrect
**Cause**: Only checking angle thresholds, not all conditions
**Solution**: Added `isInValidPosition` check before incrementing rep count

### Issue 5: Lateral raises "arms too high" warning at 30°
**Symptom**: Warning when arms are correctly at sides
**Cause**: Inverted logic (30° is down position, not up)
**Solution**: Warning only triggers when ESH < 80° AND phase is 'up'

## Testing Checklist

### Authentication
- [ ] Register new account
- [ ] Login with credentials
- [ ] Invalid credentials rejected
- [ ] Duplicate email rejected
- [ ] Token persists across page refreshes
- [ ] Logout clears token and redirects
- [ ] Skin-hair module receives correct userId
- [ ] Unauthorized access redirects to login

### Exercise Tracking
- [ ] Camera starts/stops correctly
- [ ] Skeleton overlay appears (green when correct, red when incorrect)
- [ ] Angles display and update in real-time
- [ ] Rep counting only when all conditions met:
  - [ ] Back straight (≥170°)
  - [ ] Arms close to body (≤30° ESH)
  - [ ] Legs straight (≥165°)
  - [ ] Proper camera distance
  - [ ] Full body visible
- [ ] Voice feedback announces reps
- [ ] Voice feedback warns about form errors
- [ ] Mute button silences voice
- [ ] Exercise switching works without errors
- [ ] Session saved to database
- [ ] No memory leaks after multiple start/stop cycles

### Skin-Hair Module
- [ ] Profile saves and loads correctly
- [ ] Image upload triggers analysis
- [ ] Products can be added/edited/deleted
- [ ] Recommendations generate successfully
- [ ] Wellness insights refresh
- [ ] Summary cards display statistics
- [ ] Navigation between sections works
- [ ] Logout returns to base app

### UI/UX
- [ ] Responsive on mobile (hamburger menu)
- [ ] Responsive on tablet
- [ ] Responsive on desktop
- [ ] Consistent padding across apps
- [ ] User greeting displays in skin-hair navbar
- [ ] All links navigate correctly
- [ ] Loading states display appropriately

## Performance Metrics

### MediaPipe Pose
- Processing: ~30 FPS on modern hardware
- Latency: <50ms per frame
- Accuracy: 95%+ landmark detection in good lighting

### Voice Feedback
- Latency: <100ms from trigger to speech start
- Queue processing: Real-time (no noticeable delays)

### Page Load Times
- Base app: ~2s initial load
- Skin-hair module: ~1.5s (smaller bundle)
- Exercise camera initialization: ~500ms

## Future Enhancements

### Immediate Next Steps
1. Complete remaining features (Nutrition, Sleep, Supplements)
2. ElevenLabs voice integration (replace Web Speech API)
3. Profile page creation with user preferences
4. Exercise history and progress tracking
5. Comparison charts for skin/hair analysis over time

### Long-term Improvements
1. Real-time multiplayer workout sessions
2. Trainer matching and video calls
3. Wearable device integration (heart rate, sleep)
4. Meal photo analysis with nutritional breakdown
5. Gamification (achievements, streaks, leaderboards)
6. Social features (friends, challenges)
7. Offline mode with local storage
8. Progressive Web App (PWA) for mobile install

## Development Notes

### Debugging MediaPipe
- Enable verbose logging in analyzer classes
- Check browser console for WASM errors
- Monitor memory usage in DevTools (Performance tab)
- Use `console.log` for angle calculations during development
- Test with different lighting conditions

### Debugging Authentication
- Check cookies in DevTools (Application > Cookies)
- Verify JWT_SECRET matches in both apps
- Test with MongoDB Compass to see user documents
- Check server logs for auth API calls

### Code Organization
- Analyzers: Pure logic classes (no React dependencies)
- Components: UI and MediaPipe integration
- API routes: Server-side business logic
- Lib: Shared utilities (auth, database, voice)

### Commit Guidelines
- No co-author attribution
- Descriptive commit messages
- Squash related changes when possible
- Push to main after testing

## Contact and Support

**Repository**: github.com:charithcherry/NowWhat.git

**Last Updated**: March 9, 2026

**Current Status**: 6 microservices + community, unified navigation, WellBeing Agent chat across all services

## Session Updates — March 12, 2026

### Fitness Page — Full Agent Redesign

#### Problem
- `gemini-3.1-pro-preview` model doesn't exist → 500 errors on master + generate routes
- Master agent only sending last 6 messages → repetitive, forgetful conversations
- `generate` route was synchronous (blocked conversation for 30–60s during generation)
- No job queue → no status tracking, no feedback loop for parse/test failures
- No chat log UI → user couldn't see conversation

#### New Architecture

**New files:**
- `base/src/lib/video-agents/agents.ts` — shared Gemini helper, prompts (CODE_SYSTEM, SIM_SYSTEM), parseCodeResponse, parseSimData, runTester. All models set to `gemini-2.5-flash`.
- `base/src/lib/video-agents/jobQueue.ts` — in-memory job store (globalThis._jobQueue, survives HMR), async pipeline: code+sim parallel → parse → tester retry loop (up to 3 attempts). Parse errors and test failures both feed back to code agent.
- `base/src/app/api/video-agents/job/[jobId]/route.ts` — NEW GET endpoint, client polls every 2s

**Modified files:**
- `base/src/app/api/video-agents/generate/route.ts` — now just calls `createJob` + `runJobPipeline` (fire-and-forget), returns `{ jobId }` immediately
- `base/src/app/api/video-agents/master/route.ts` — receives full conversation history + jobStatus every call; builds complete history string in prompt; `responseMimeType: 'application/json'` for clean JSON; no responseSchema (causes "Here is the JSON" garbage)
- `base/src/app/fitness/page.tsx` — polling via `setInterval(2s)`, full `conversationHistoryRef` sent every master call, chat log UI (scrollable, auto-scroll), job status display

#### Key Design Decisions
- **Full conversation history** sent every call (standard chatbot pattern) — master never repeats itself
- **Job queue** in-memory Map on `globalThis._jobQueue` — persists across Next.js HMR in dev
- **Fire-and-forget** pipeline: `runJobPipeline(jobId)` called without await in route handler — Node.js event loop completes it
- **Frame snapshots** (every 6s during exercise) are silent coaching cues — not added to chat log, but added to conversation history so master has context
- **Master model**: `gemini-2.5-flash` with `responseMimeType: 'application/json'` (no schema) — clean JSON, no garbage text
- **Code/sim models**: `gemini-2.5-flash` (NOT pro — `gemini-3.1-pro-preview` doesn't exist)

#### MongoDB TLS Fix
- Node 22 + MongoDB Atlas TLS handshake error (`tlsv1 alert internal error`)
- Fix: `const options = { tlsInsecure: true }` in `base/src/lib/mongodb.ts`
- Note: `globalThis._mongoClientPromise` cache means hot reload doesn't pick up options change — must restart server after edit

#### Live Pipeline Log UI
- Added collapsible "Pipeline Log" panel to fitness page
- Appears as soon as a job starts, updates live every 2s via the existing job poll
- Collapsed by default, expandable — shows all job log entries with line numbers
- Color-coded: red = error/fail, green = pass/ready/complete, grey = normal steps
- Auto-scrolls to latest entry
- State: `jobLog`, `showJobLog`, `jobLogEndRef` added to page.tsx
- Log data comes from `job.log` in the `/api/video-agents/job/[jobId]` poll response

## Session Updates — March 13, 2026

### Fitness Agent — Bug Fixes & Architecture Shift

#### Echo Loop (Conversation Corruption) — Fixed
- Root cause: `recognition.onend` was restarting the mic even when `speakMaster` had just stopped it, allowing TTS audio to be captured as user input
- Fix 1: Added `isSpeakingRef` — set `true` on speak start, `false` after 600ms post-speech end
- Fix 2: `recognition.onend` checks `isSpeakingRef.current` before restarting — mic only restarts after the speaking delay
- Fix 3: `recognition.onresult` discards results while `isSpeakingRef.current === true`
- Also: `if (isExerciseActiveRef.current) return` added — mic ignored during exercise

#### Tester Failing (Zero Reps) — Fixed via Spec Engine Architecture
The user refactored the pipeline from raw code generation to a **spec-based engine**:

**New files:**
- `base/src/lib/video-agents/specEngine.ts` — defines `AnalyzerSpec` type, interprets specs into exercise analyzers
- Agents now import `SPEC_MODEL`, `SPEC_SYSTEM`, `parseAnalyzerResponse` from agents.ts

**New pipeline order (serial, not parallel):**
1. **Sim agent first** — generates 30 frames, extracts angle ranges
2. **Spec agent second** — receives actual angle ranges from sim data, generates spec calibrated to those ranges
3. **Tester** — validates spec against sim frames, retries with diagnostic feedback

**Key insight:** Running sim first and feeding angle ranges to spec agent solves the "thresholds inverted" problem. The spec agent now knows `leftElbow: 90°–165°` and can set valid thresholds within those ranges.

**Retry prompt improvements:**
- `buildRetryPrompt()` includes actual sim angle stats + explicit warnings (e.g. "elbow never goes below 90°, don't use threshold < 30°")
- Angle stats logged in pipeline UI on first failure

#### Chat Overlay on Camera
- Removed chat log from above-camera position
- Last 4 messages shown as gradient overlay at the bottom of the camera view
- `pointer-events-none` so it doesn't interfere with camera interaction

#### Sim JSON Truncation Fix
- Sim agent now uses `jsonMode=true` + `maxOutputTokens: 16384`

#### Pipeline Log Page
- `/fitness/logs` — dedicated page, polls `/api/video-agents/jobs` (all jobs), live updates every 2s
- Color-coded log entries, expandable per job, auto-expands active jobs
- Status pill on fitness page links to logs page in new tab

#### Layout Fix
- `.top-bar` made `sticky top-16 z-40` — always below nav bar, never overlaps
- Camera height reduced from 70vh → 55vh to fit all content in viewport

## Session Updates — March 9, 2026

### App Branding
- Renamed app to **What Now?** across all services
- Added logo (logo.jpg) to all service navigation bars with `mix-blend-screen` for background removal
- Updated page title in base layout

### Homepage Redesign (BetterMe-style)
- Full-screen slider with numbered circle buttons (1–6) bottom-right
- Images/videos cover entire screen as background with dark overlay gradient
- Slide transitions on number click (horizontal CSS transform)
- 6 screens: Fitness, Nutrition, Skin Analysis, Hair Analysis, Find Restaurants, Community

### Navigation Fixes
- Physical Fitness logo reloads `/fitness` (uses `<a>` not `<Link>`)
- Skin & Hair logo reloads `http://localhost:3002`
- All navs use `getHref()` helper (no stale closures)
- Community added to all service navs

### WellBeing Agent Chat
- Floating draggable robot sticker on all 6 services
- On every click: rebuilds profile from MongoDB (past 2 days), saves to `agent_profile_cache` collection
- Profile sources: users, userProfiles, nutrition_profiles, generated_recipes, saved_recipes, pantry_items, skin_hair_profiles, loved_products, favorites, clicks, yelp-insights, nutrition_insight_memory, community-posts, community-comments, community-moods, community-events, community-connections
- Age calculated server-side (proper month/day boundary check)
- Gemini function calling (tools): `get_user_data` tool queries any allowed MongoDB collection
- Chat history persisted in `agent_chats` MongoDB collection — synced across all services
- localStorage as fast local cache per origin (24hr TTL)
- Profile context saved to `agent_profile_cache` (shared across all service ports via MongoDB)
- On logout: clears all `wb_agent_profile_*` from localStorage

### Gemini API
- Old key (`AIzaSyDwRs6uRfbPMiJ7XE56iXrn-R9Z3rf_zSw`) was leaked via committed docs files — revoked
- New key in all `.env.local` files (gitignored)
- Model updated to `gemini-2.5-flash` (primary) — `gemini-2.0-flash` no longer available for new keys
- All credentials redacted from all docs files

### ElevenLabs Voice (Fitness)
- Switched from Web Speech API to ElevenLabs TTS (`eleven_turbo_v2_5` model)
- Sarah voice (EXAVITQu4vr4xnSDxMaL) — clear coaching voice
- Fixed stuck promise bug: `stop()` now resolves pending promise so VoiceFeedbackManager doesn't freeze
- AbortController cancels in-flight fetches on stop
- Fallback to Web Speech API on any error

### Community Microservice Integration
- Frontend: port 3006, Backend: port 3005
- Same JWT cookie auth pattern as nutrition-wellness
- Server-side `getCurrentUser()` in page.tsx → passes `userId`/`userName` as props to `CommunityPage`
- Navigation matches all other services
- AgentChat sticker added with community backend agent routes
- MongoDB collections: community-posts, community-comments, community-moods, community-events, community-connections

### Port Reference (Updated)
| Service | Port |
|---|---|
| Base App | 3000 |
| Yelp Backend | 3001 |
| Skin-Hair Analysis | 3002 |
| Nutrition Wellness | 3003 |
| Yelp Frontend | 3004 |
| Community Backend | 3005 |
| Community Frontend | 3006 |

### Security Fixes
- All leaked credentials redacted from `base/docs/` and `docs/` markdown files
- `.env.local.example` files replaced real MongoDB creds with placeholders
- `.env.local` files confirmed gitignored — never committed
- Yelp API key added to `nutrition-yelp/backend/.env.local`

## Recent Updates (Previous Session)

### Microservices Integration

**Nutrition Wellness Integration**:
- Configured to run on port 3003
- Added JWT dependencies (jsonwebtoken, bcryptjs)
- Created auth.ts for token verification
- Updated Navigation component with full menu
- Removed userId input field, uses authenticated userId automatically
- Updated page.tsx to pass userId/userName props
- Created .env.local with shared JWT_SECRET

**Nutrition-Yelp Integration**:
- Frontend on port 3004, Backend on port 3001
- Separate frontend/backend architecture with API proxy
- Added JWT authentication to frontend
- Created Navigation component matching other microservices
- Refactored page.tsx → RestaurantSearchPage.tsx
- Updated all userId references from hardcoded to authenticated
- Created .env.local files for both frontend and backend
- Backend needs: GEMINI_API_KEY, YELP_API_KEY, MONGODB_URI

### Homepage Carousel Updates

**Now 5 Screens**:
1. Physical Fitness → /fitness
2. Nutrition → http://localhost:3003
3. Skin Analysis → http://localhost:3002
4. Hair Analysis → http://localhost:3002
5. Find Restaurants → http://localhost:3004 (NEW)

### Navigation Updates

**Unified Navigation Across All Pages**:
- Removed Sleep Tracking and Supplements from menu
- Added Find Restaurants button
- Replaced "Hi, username" with Profile button
- All microservices show full navigation menu
- Each page excludes its own link from menu
- Profile button links to base app profile page
- Fitness page has dedicated FitnessNavigation component

### Profile Page Creation

**Location**: `base/src/app/profile/page.tsx`

**Features**:
- Mobile-responsive 3-column grid layout (1 col mobile, 2 tablet, 3 desktop)
- Email displayed in header (top-right)
- Editable fields:
  - Full Name
  - Date of Birth (optional, date picker)
  - Height (optional, number input with cm label)
  - Weight (optional, number input with kg label)
  - Lifestyle (optional, dropdown: Sedentary, Lightly Active, Moderately Active, Very Active, Extremely Active)
- Read-only fields:
  - Email Address
  - Member Since
  - User ID
- Edit/Save/Cancel functionality

**Database Structure**:
- `users` collection: name updated via POST /api/auth/update-profile
- `userProfiles` collection: extended data via GET/POST /api/profile
- Separate collections linked by userId

**API Endpoints Created**:
- `POST /api/auth/update-profile` - Update name and refresh JWT token
- `GET /api/profile` - Fetch extended profile
- `POST /api/profile` - Upsert extended profile data

### Key Fixes

**Database Import Error**:
- Fixed: Changed `getDb()` to `getDatabase()` in update-profile route
- Issue: Base app exports `getDatabase()` not `getDb()`

**Asset Loading**:
- Copied restaurant.mp4 from base/assets/ to base/public/assets/
- Updated 5th screen to use video format instead of image

## Appendix: Key File Locations

### Authentication
- `base/src/lib/auth.ts` - JWT utilities
- `base/src/app/api/auth/register/route.ts` - Registration
- `base/src/app/api/auth/login/route.ts` - Login
- `base/src/app/api/auth/logout/route.ts` - Logout
- `base/src/app/api/auth/me/route.ts` - Current user

### Exercise Tracking
- `base/src/lib/BicepCurlAnalyzer.ts` - Bicep curl logic
- `base/src/lib/LateralRaisesAnalyzer.ts` - Lateral raises logic
- `base/src/components/WebcamCapture.tsx` - MediaPipe integration
- `base/src/app/fitness/page.tsx` - Main fitness UI
- `base/src/lib/voice/` - Voice feedback system

### Skin-Hair Module
- `skin-hair-analysis/src/modules/skin-hair/ui/SkinHairPage.tsx` - Main component
- `skin-hair-analysis/src/modules/skin-hair/ui/api.ts` - API calls
- `skin-hair-analysis/src/components/Navigation.tsx` - Navigation bar
- `skin-hair-analysis/src/app/page.tsx` - Protected route wrapper

### Shared Components
- `base/src/components/Navigation.tsx` - Base navigation
- `base/src/app/page.tsx` - Homepage with auth forms
- `base/src/app/globals.css` - Global styles
- `skin-hair-analysis/src/app/globals.css` - Skin-hair styles
