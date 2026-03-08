# WellBeing - Comprehensive Wellness Application

A microservices-based wellness platform integrating fitness tracking, nutrition planning, restaurant discovery, and skin/hair analysis.

## 🏗️ Architecture

WellBeing uses a **microservices architecture** with 4 independent modules sharing JWT authentication:

```
Wats_Next/
├── base/                       # Main app (port 3000)
│   ├── Authentication system (JWT)
│   ├── Fitness tracker with MediaPipe Pose
│   ├── User profile management
│   └── Homepage with feature carousel
├── skin-hair-analysis/         # Port 3002
│   ├── Skin condition analysis
│   ├── Hair health tracking
│   └── Product recommendations
├── nutrition-wellness/         # Port 3003
│   ├── Pantry meal planner
│   ├── Recipe optimization
│   └── Wellness insights
├── nutrition-yelp/
│   ├── backend/                # Port 3001 (API)
│   └── frontend/               # Port 3004
│       ├── Restaurant search (Yelp API)
│       ├── AI health scoring
│       └── Food photo scanning
└── docs/                       # Documentation
```

## ✨ Features

### ✅ Implemented

**1. Authentication System**
- User registration and login
- JWT token-based auth across all microservices
- HttpOnly cookies for security
- Password hashing with bcrypt

**2. Physical Fitness Tracker**
- Real-time pose detection with MediaPipe
- Bicep curls and lateral raises analysis
- Form validation (posture, arm position, leg straightness)
- Voice feedback with priority queue
- Rep counting with strict validation
- Session history storage

**3. Skin & Hair Analysis**
- Image upload for analysis
- AI-powered condition scoring
- Product recommendations
- Loved products tracking
- Wellness insights

**4. Nutrition Wellness**
- Pantry-based meal generation
- Authentic dish optimization
- Recipe library with search/filters
- Custom recipe creation
- Session-based wellness insights (15-min tracking)

**5. Find Restaurants**
- Yelp restaurant search by location/category/price
- AI health scoring (Gemini-powered)
- Food photo scanning for nutrition
- Favorite restaurants tracking
- Automatic dining preference insights

**6. User Profile Management**
- Extended profile fields (DOB, height, weight, lifestyle)
- Mobile-responsive grid layout
- Separate storage for extended data

## 🚀 Quick Start

See [docs/HOW_TO_RUN.md](./docs/HOW_TO_RUN.md) for detailed instructions.

### Start All Servers

```bash
# Terminal 1: Base App
cd base && npm run dev                              # Port 3000

# Terminal 2: Skin-Hair Analysis
cd skin-hair-analysis && npm run dev                # Port 3002

# Terminal 3: Nutrition Wellness
cd nutrition-wellness && npm run dev                # Port 3003

# Terminal 4: Restaurant Backend
cd nutrition-yelp/backend && npm run dev            # Port 3001

# Terminal 5: Restaurant Frontend
cd nutrition-yelp/frontend && npm run dev           # Port 3004
```

Open http://localhost:3000 in your browser.

## 🔑 Environment Setup

Each microservice needs a `.env.local` file. **Important**: All must share the same `JWT_SECRET`.

### Base App (.env.local)
```env
MONGODB_URI=your_mongodb_connection
MONGODB_DB=wellbeing_app
GEMINI_API_KEY=your_gemini_key
JWT_SECRET=your_shared_secret
JWT_EXPIRES_IN=7d
```

### All Microservices
Copy the same `JWT_SECRET` to:
- `skin-hair-analysis/.env.local`
- `nutrition-wellness/.env.local`
- `nutrition-yelp/frontend/.env.local`

See [docs/HOW_TO_RUN.md](./docs/HOW_TO_RUN.md) for complete environment variable documentation.

## 🎨 Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS (custom doom theme)
- **Database**: MongoDB (Cloud or Local)
- **Authentication**: JWT with httpOnly cookies
- **AI**: Google Gemini API
- **Pose Detection**: MediaPipe Pose (WebAssembly)
- **Voice**: Web Speech API
- **External APIs**: Yelp Fusion API

## 📊 Database Collections

**Authentication** (MongoDB: `wellbeing_app`)
- `users` - Email, password, name, timestamps
- `userProfiles` - Extended profile data (DOB, height, weight, lifestyle)

**Fitness** (MongoDB: `wellbeing_app`)
- `sessions` - Exercise session data with form scores

**Skin-Hair** (MongoDB: `skin_hair`)
- `profiles` - Skin/hair type and concerns
- `analyses` - Analysis results
- `loved_products` - Favorited products
- `recommendations` - AI-generated recommendations

**Nutrition Wellness** (MongoDB: `wellbeing_app`)
- `nutrition_profiles` - Dietary preferences
- `nutrition_recipes` - Generated and custom recipes
- `nutrition_pantry_items` - Saved ingredients
- `nutrition_insight_sessions` - Activity tracking
- `nutrition_insight_memory` - AI insights

**Restaurant Finder** (MongoDB: via backend)
- `favorites` - Liked restaurants
- `clicks` - Activity tracking
- `yelp-insights` - Dining preference insights

## 🔐 Authentication Flow

1. User logs in at base app (localhost:3000)
2. JWT token stored in httpOnly cookie
3. All microservices verify token automatically
4. Shared JWT_SECRET enables cross-service auth
5. Single logout clears token everywhere

## 📱 Navigation

All microservices share a consistent navigation bar:
- Home
- Physical Fitness
- Nutrition
- Find Restaurants
- Skin & Hair Analysis
- Profile (user information)
- Logout

## 📚 Documentation

See `docs/` folder for:
- [HOW_TO_RUN.md](./docs/HOW_TO_RUN.md) - Complete setup guide
- [SESSION_NOTES.md](./docs/SESSION_NOTES.md) - Detailed implementation notes
- Additional architecture and API documentation

## 🐛 Troubleshooting

**Port conflicts**: Kill process with `lsof -ti:PORT | xargs kill -9`

**JWT auth fails**: Verify all `.env.local` files have identical `JWT_SECRET`

**MongoDB connection**: Check URI and network connectivity

**Module errors**: Run `npm install` and restart with `rm -rf .next && npm run dev`

## 📞 Support

Repository: github.com:charithcherry/NowWhat.git

Last Updated: March 8, 2026
