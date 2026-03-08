# WellBeing App — Project Plan

## Concept

A web-based wellness app that builds a unified health profile where every system talks to every other.
Most apps are siloed — fitness app, skin app, nutrition app. This connects them all.

**Core differentiator:** workout quality → nutrition needs → skin/hair signals → sleep → coordination → posture → back to workout. One pipeline, no single product does this end-to-end.

---

## Features

### 1. Exercise Rep Counter
- Count reps for exercises: bicep curl, hammer curl, shoulder raises, etc.
- Tech: MediaPipe Pose or TensorFlow.js (runs in browser)

### 2. Yoga Form Correction
- Real-time pose comparison against reference angles~
- Flag incorrect joint positions with visual overlay
- Tech: MediaPipe Pose

### 3. Movement Smoothness Analysis
- Detect jerky or compensatory movement patterns
- Suggest reducing weight or switching exercises
- Tech: Pose landmark velocity/acceleration analysis + LLM (Gemini/GPT) for suggestion generation

### 4. Bilateral Asymmetry Detection (Unique)
- Compare left vs right side joint angles and timing per rep
- Flag compensation patterns (e.g., one shoulder rising, elbow flare on weak side)
- Real injury predictor — no mainstream app does this with live video
- Tech: MediaPipe Pose landmark comparison

### 5. Fatigue-Within-Set Detection (Unique)
- Track how form degrades rep-by-rep across a single set
- Identify the rep where form breaks down → true failure point
- Tech: Pose quality scoring per rep, trend analysis

### 6. Tempo / TUT Tracker (Unique)
- Measure eccentric vs concentric phase duration per rep
- Compare to hypertrophy-optimal ranges (e.g., 3s down, 1s up)
- Derived from raw pose landmark timestamps — no hardware needed
- Tech: MediaPipe + timestamp analysis

### 7. Injury Risk Score (Unique)
- Daily score combining: form quality, bilateral imbalance, volume load, fatigue signal
- Simple actionable number with breakdown
- Tech: Scoring formula + LLM explanation

### 8. Protein Meal Planner
- User inputs ingredients they have at home
- App suggests high-protein meals tailored to their workout data (exercises done, weight used, volume)
- Tech: Gemini / OpenAI API

### 9. Authentic Dish Scraper + Protein Optimizer
- Search for authentic versions of a cuisine (e.g., Indian)
- Suggests how to add protein to traditional dishes without losing authenticity
- Tech: Web scraping + LLM

### 10. Restaurant Menu Scanner (Unique)
- User uploads/photos a restaurant menu
- OCR extracts items, LLM ranks by protein value and fit to daily targets
- Tech: Tesseract / Google Vision OCR + LLM

### 11. Gym Progress Tracker
- Store: exercise, sets, reps, weight, form score, asymmetry score, fatigue score per session
- Visualize performance trends over time
- Auto-suggest progressive overload based on actual movement quality (not just numbers)
- Tech: PostgreSQL / SQLite, Chart.js or Recharts

### 12. Skin Analysis (Unique)
- Selfie-based skin analysis: detect acne, dark circles, oiliness, dryness using CV model
- Track skin changes week over week (before/after timeline)
- Cross-correlate with workout intensity, nutrition, sleep logs — flag patterns (e.g., high cortisol week + low protein → skin inflammation)
- Tech: TensorFlow.js skin model or Google ML Kit, camera API

### 13. Hair & Scalp Analysis (Unique)
- Upload close-up photo: detect thinning zones, dryness, dandruff
- Flag nutritional deficiencies likely causing issues (zinc, biotin, omega-3) based on meal logs
- Tech: CV classification model + LLM for nutritional cross-reference

### 14. Skin & Hair Profile + Product Recommender (Unique)
- User fills in skin/hair profile: skin type (dry/oily/combo/sensitive), scalp type, known allergies, ingredient sensitivities (e.g., fragrance, parabens, sulfates)
- User adds skincare/haircare products they love and that work for them
- System extracts key ingredients from loved products
- Recommends new products with high ingredient overlap, filtered against allergies/sensitivities
- Combines CV analysis results + profile + loved-product ingredient fingerprint for personalized matching
- Tech: ingredient database (Open Beauty Facts or similar), LLM for ingredient parsing + explanation, DB for user profile + product list

### 15. Skin & Hair Nutrition Loop (Unique)
- If skin/hair analysis detects issues → automatically check if relevant nutrients are low in the meal planner
- Closes the loop: workout stress → cortisol → skin → nutrition → meal suggestion
- This cross-system correlation exists in no current wellness app

### 15. Eye-Hand Coordination Tests (Unique)
- **Reaction tap test**: targets appear randomly on screen, user taps them, measures reaction time and accuracy
- **Hand tracking follow**: follow a moving dot with index finger via MediaPipe Hands, measures smoothness and lag
- **Catch game**: virtual objects fall, intercept with hand gesture, tracks success rate
- Track scores over time — declining scores are a research-backed early neurological health signal
- Tech: MediaPipe Hands, canvas animations

### 16. Breathing Mechanics from Pose (Unique)
- Use pose landmarks to detect chest/belly expansion rhythm (no hardware needed)
- Guide box breathing, 4-7-8, or workout recovery breathing in real-time
- Flag shallow breathing patterns during exercise
- Tech: MediaPipe Pose landmark tracking (shoulders, chest keypoints)

### 17. Desk Posture Monitor
- Passive webcam monitoring while user works at desk
- Alerts when slouching, forward head, or asymmetric sitting detected
- Separate from workout posture — covers the other 8+ hours of the day
- Tech: MediaPipe Pose, background tab monitoring

### 18. Balance & Stability Score
- Single-leg stance test: measure postural sway via pose landmarks over 30 seconds
- Correlate with injury risk score and athletic performance
- Tech: MediaPipe Pose, variance analysis on ankle/hip landmarks

### 19. Flexibility / ROM Tracker
- Measure joint range of motion (forward fold angle, shoulder mobility, hip flexion)
- Track improvement over weeks and months
- Tech: MediaPipe Pose, angle computation at key joints

### 20. Sleep + Performance Correlation
- User logs sleep duration and quality
- App correlates sleep with form scores, asymmetry, fatigue, skin quality, coordination scores
- e.g., "Your form degrades 23% on days after less than 6h sleep"
- Tech: DB analytics, LLM-generated insight summaries

### 21. Supplement Tracker
- Log supplements taken (creatine, zinc, omega-3, vitamin D, etc.)
- Correlate over time with: skin quality, workout performance, coordination scores, energy trends
- Tech: DB logging, trend analysis, LLM insight generation

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Next.js) |
| Pose Estimation | MediaPipe Pose (browser, via JS) |
| ML Models | TensorFlow.js (optional fallback) |
| Backend | FastAPI (Python) |
| Database | MongoDB Atlas |
| LLM | Gemini API (primary), OpenAI fallback |
| OCR | Google Vision API or Tesseract |
| CV / Skin & Hair | TensorFlow.js or Google ML Kit |
| Voice Coaching | ElevenLabs API (rep counts, form corrections, breathing guides, injury alerts) |
| Auth | Clerk or Firebase Auth |

---

## Phases

### Phase 1 — Core Exercise Engine (MVP)
- [ ] Camera feed setup in browser
- [ ] MediaPipe Pose integration
- [ ] Rep counter (bicep curl first)
- [ ] Basic form feedback (joint angle thresholds)
- [ ] Store session data (exercises, reps, weight) in DB

### Phase 2 — Biomechanical Intelligence
- [ ] Movement smoothness scoring
- [ ] Bilateral asymmetry detection
- [ ] Fatigue-within-set detection
- [ ] Tempo / TUT tracking
- [ ] Injury risk score computation

### Phase 3 — Yoga Module
- [ ] Pose reference library (key yoga poses)
- [ ] Real-time angle comparison and overlay
- [ ] Form correction feedback

### Phase 4 — Nutrition Layer
- [ ] Pantry-based meal planner (LLM)
- [ ] Workout-aware protein targeting
- [ ] Authentic dish scraper + protein optimizer
- [ ] Restaurant menu scanner (OCR + LLM)

### Phase 5 — Skin, Hair & Body Health
- [ ] Selfie skin analysis (acne, dark circles, oiliness, dryness)
- [ ] Hair/scalp analysis from photo
- [ ] Skin/hair profile intake (skin type, scalp type, allergies, ingredient sensitivities)
- [ ] Loved products list + ingredient extraction
- [ ] Ingredient-based product recommender (filtered by profile + allergies)
- [ ] Skin/hair → nutrition cross-correlation loop
- [ ] Breathing mechanics detection from pose
- [ ] Desk posture monitor (passive)
- [ ] Balance & stability score test
- [ ] Flexibility / ROM tracker

### Phase 6 — Coordination, Sleep & Supplements
- [ ] Eye-hand coordination tests (reaction tap, hand tracking follow, catch game)
- [ ] Sleep logging + performance correlation dashboard
- [ ] Supplement tracker + trend correlation
- [ ] Injury risk history

### Phase 7 — Progress & Unified Insights
- [ ] Unified health dashboard (all systems in one view)
- [ ] Adaptive progressive overload suggestions
- [ ] Weekly performance summary (LLM-generated, cross-system)
- [ ] Long-term trend analysis across workout, skin, sleep, nutrition, coordination

---

## Data Model (High Level)

> All collections stored in MongoDB Atlas. Arrays/nested objects stored as embedded documents.

```
User
  id, name, email, weight_kg, height_cm, goal

Session
  id, user_id, date, duration_mins

ExerciseSet
  id, session_id, exercise_name, reps, weight_kg,
  form_score, asymmetry_score, fatigue_score, avg_tempo_s

MealLog
  id, user_id, date, meal_name, protein_g, calories

PantryItem
  id, user_id, item_name

SkinLog
  id, user_id, date, acne_score, dark_circles_score, oiliness_score, dryness_score, photo_path

HairLog
  id, user_id, date, thinning_score, dryness_score, dandruff_score, photo_path

SleepLog
  id, user_id, date, duration_hrs, quality_score

SupplementLog
  id, user_id, date, supplement_name, dose_mg

CoordinationTest
  id, user_id, date, test_type, reaction_time_ms, accuracy_pct, smoothness_score

FlexibilityLog
  id, user_id, date, joint_name, range_of_motion_deg

BalanceLog
  id, user_id, date, sway_score, duration_s

SkinHairProfile
  id, user_id, skin_type, scalp_type, allergies (array), sensitivities (array)

LovedProduct
  id, user_id, product_name, brand, category (skincare/haircare), ingredients (array), notes

ProductRecommendation
  id, user_id, recommended_product_name, brand, category, match_score, matched_ingredients (array), generated_at
```

---

## Open Questions
- Run MediaPipe fully client-side or stream frames to backend?
- Use Gemini or OpenAI as primary LLM?
- MVP target: web only, or consider PWA for mobile camera access? (PWA strongly preferred for mobile camera + skin selfie use cases)
- Auth required from day one or add later?
- Skin/hair CV model: build custom classifier or use Google ML Kit / existing API?
- Store skin/hair photos on device only or encrypted cloud?




user notes:
Some noyes:

1. mediapipe we can do client side validation based on the exercise typ like for bicep curl we know the person shud stand stright and keep arms in a certain angle and based on angle chnages we can do rep counter    and we can aslo cature how how time was taken per rep or other metrics andnseee hoe this can be done. for the gemini can we do is send 10 frames in maybe 60 fps to get a clear understanding. we can send more if need whta do u think 

2. for now use gemini api 

3. we want to buid a next js app such that it is mobile responsive. so this is the basic UI: we will have a homepage where u can log in and once u log in u can use all the features. so in mobile responsove form there will be hamburger menu which when clicked we will get the other features. 

4. the physical fitness is a feature which opens a page where we can have all the features related to physical wellbeing and then in the hamburger menu there wil other features like the skin analyst , hair anlyst or nutrition etc etc. FYI no ml models to be used. 

5. for the rag system for recipes or anything we will have a memoery layer (basically context fill with patterns about the user, we can run a  backgroiund consolidation of the chats, we can store the chats onto a db as well). db we can use mongodb :mongodb+srv://YOUR_USER:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/


any questions?

1. tech stack backend nextjs and frontend we can use node. anY suggestions?
2.  u will be using the webcam to capture the feed