# How to Run All Servers - WellBeing Application

This guide shows you how to start all microservices for the WellBeing application.

## Prerequisites

- Node.js 18+ installed
- MongoDB connection (cloud or local)
- All dependencies installed in each folder

## Quick Start - Run All Servers

Open 5 terminal windows and run these commands:

### Terminal 1: Base App (Homepage & Auth)
```bash
cd /Users/charithpurushotham/Desktop/Wats_Next/base
npm run dev
```
**URL**: http://localhost:3000

### Terminal 2: Skin-Hair Analysis
```bash
cd /Users/charithpurushotham/Desktop/Wats_Next/skin-hair-analysis
npm run dev
```
**URL**: http://localhost:3002

### Terminal 3: Nutrition Wellness
```bash
cd /Users/charithpurushotham/Desktop/Wats_Next/nutrition-wellness
npm run dev
```
**URL**: http://localhost:3003

### Terminal 4: Restaurant Finder - Backend
```bash
cd /Users/charithpurushotham/Desktop/Wats_Next/nutrition-yelp/backend
npm run dev
```
**URL**: http://localhost:3001 (API server)

### Terminal 5: Restaurant Finder - Frontend
```bash
cd /Users/charithpurushotham/Desktop/Wats_Next/nutrition-yelp/frontend
npm run dev
```
**URL**: http://localhost:3004

## Port Reference

| Service | Port | Type | URL |
|---------|------|------|-----|
| Base App | 3000 | Frontend | http://localhost:3000 |
| Nutrition-Yelp Backend | 3001 | API | http://localhost:3001 |
| Skin-Hair Analysis | 3002 | Frontend | http://localhost:3002 |
| Nutrition Wellness | 3003 | Frontend | http://localhost:3003 |
| Nutrition-Yelp Frontend | 3004 | Frontend | http://localhost:3004 |

## First Time Setup

If you haven't installed dependencies yet, run in each folder:

```bash
# Base app
cd base && npm install

# Skin-hair analysis
cd skin-hair-analysis && npm install

# Nutrition wellness
cd nutrition-wellness && npm install

# Restaurant finder backend
cd nutrition-yelp/backend && npm install

# Restaurant finder frontend
cd nutrition-yelp/frontend && npm install
```

## Environment Variables

Make sure these `.env.local` files exist:

### base/.env.local
```env
MONGODB_URI=your_mongodb_connection_string
MONGODB_DB=wellbeing_app
GEMINI_API_KEY=your_gemini_api_key
JWT_SECRET=your_shared_secret_key
JWT_EXPIRES_IN=7d
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### skin-hair-analysis/.env.local
```env
MONGODB_URI=your_mongodb_connection_string
MONGODB_DB=wellbeing_app
GEMINI_API_KEY=your_gemini_api_key
JWT_SECRET=same_shared_secret_key
```

### nutrition-wellness/.env.local
```env
MONGODB_URI=your_mongodb_connection_string
MONGODB_DB=wellbeing_app
GEMINI_API_KEY=your_gemini_api_key
JWT_SECRET=same_shared_secret_key
NEXT_PUBLIC_DEFAULT_USER_ID=demo-user
NUTRITION_MEMORY_CRON_SECRET=your_cron_secret
```

### nutrition-yelp/frontend/.env.local
```env
JWT_SECRET=same_shared_secret_key
JWT_EXPIRES_IN=7d
```

### nutrition-yelp/backend/.env.local
```env
MONGODB_URI=your_mongodb_connection_string
GEMINI_API_KEY=your_gemini_api_key
YELP_API_KEY=your_yelp_api_key
```

**IMPORTANT**: All microservices must share the same `JWT_SECRET` for authentication to work!

## Verification

Once all servers are running, verify they're accessible:

```bash
# Check all servers respond
curl http://localhost:3000
curl http://localhost:3001
curl http://localhost:3002
curl http://localhost:3003
curl http://localhost:3004
```

## Usage Flow

1. Open http://localhost:3000 in your browser
2. Register a new account or login
3. Navigate through the 5-screen carousel:
   - Physical Fitness
   - Nutrition
   - Skin Analysis
   - Hair Analysis
   - Find Restaurants
4. Click any feature to access the microservice
5. All modules share your authentication automatically
6. Access your profile from any navigation bar

## Troubleshooting

**Port Already in Use:**
```bash
# Kill process on specific port (Mac/Linux)
lsof -ti:3000 | xargs kill -9
```

**MongoDB Connection Issues:**
- Check MongoDB is running
- Verify `MONGODB_URI` in .env.local files
- Ensure network connectivity to cloud MongoDB

**JWT Authentication Not Working:**
- Verify all `.env.local` files have the SAME `JWT_SECRET`
- Check browser cookies are enabled
- Clear cookies and login again

**Module Not Found Errors:**
- Run `npm install` in the affected folder
- Delete `.next` folder and restart: `rm -rf .next && npm run dev`

## Stopping All Servers

Press `Ctrl+C` in each terminal window to stop the servers gracefully.
