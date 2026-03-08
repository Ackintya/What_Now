# Quick Start Guide - JWT Authentication

## Start the Apps

### Terminal 1 - Base App
```bash
cd /Users/charithpurushotham/Desktop/Wats_Next/base
npm run dev
```
**Runs on:** http://localhost:3000

### Terminal 2 - Skin-Hair Analysis
```bash
cd /Users/charithpurushotham/Desktop/Wats_Next/skin-hair-analysis
npm run dev
```
**Runs on:** http://localhost:3002

---

## Test the Authentication

### 1. Register a New User
1. Open: http://localhost:3000
2. Click: "Register" tab
3. Fill in:
   - Name: John Doe
   - Email: john@example.com
   - Password: password123
4. Click: "Create Account"
5. ✅ Should see feature carousel

### 2. Test Cross-Service Auth
1. Click: "Skin & Hair Analysis" link in navigation
2. ✅ Should load http://localhost:3002 without login
3. ✅ Should show "Logged in as John Doe"

### 3. Test Logout
1. Click: Logout button (in either app)
2. ✅ Should redirect to login page
3. ✅ Session cleared

---

## Key Features

✅ JWT-based authentication
✅ HTTP-only cookies for security
✅ Cross-service authentication (base ↔ skin-hair)
✅ Password hashing with bcryptjs
✅ MongoDB user storage
✅ 7-day token expiration
✅ Protected routes with auto-redirect
✅ Production-ready error handling

---

## API Endpoints

### Register
```bash
POST http://localhost:3000/api/auth/register
Body: { email, password, name }
```

### Login
```bash
POST http://localhost:3000/api/auth/login
Body: { email, password }
```

### Get Current User
```bash
GET http://localhost:3000/api/auth/me
Cookie: auth_token (auto-sent)
```

### Logout
```bash
POST http://localhost:3000/api/auth/logout
```

---

## Configuration Files

### Both Apps Must Have:
- `.env.local` with JWT_SECRET (MUST MATCH)
- MongoDB connection configured
- Dependencies installed

### Verify Setup:
```bash
# Check base app
cat /Users/charithpurushotham/Desktop/Wats_Next/base/.env.local | grep JWT_SECRET

# Check skin-hair app
cat /Users/charithpurushotham/Desktop/Wats_Next/skin-hair-analysis/.env.local | grep JWT_SECRET

# Should show the same JWT_SECRET value
```

---

## Troubleshooting

**Problem:** Cookie not shared between apps
**Solution:** Verify JWT_SECRET is identical in both .env.local files

**Problem:** "Not authenticated" error
**Solution:** Check MongoDB connection and verify user exists

**Problem:** Can't login
**Solution:** Clear cookies and try again

**Problem:** Build errors
**Solution:** Run `npm install` in both directories

---

## Documentation

- **AUTHENTICATION_SUMMARY.md** - High-level overview
- **JWT_AUTH_IMPLEMENTATION_COMPLETE.md** - Technical details
- **TEST_AUTHENTICATION.md** - Comprehensive testing guide

---

## Status

✅ Authentication system fully implemented
✅ Both apps building successfully
✅ Security features enabled
✅ Ready for testing and deployment

---

**Last Updated:** March 8, 2026
