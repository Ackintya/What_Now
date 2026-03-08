# Authentication Testing Guide

## Quick Start

### 1. Start Both Applications

**Terminal 1 - Base App (localhost:3000):**
```bash
cd /Users/charithpurushotham/Desktop/Wats_Next/base
npm run dev
```

**Terminal 2 - Skin-Hair Analysis (localhost:3002):**
```bash
cd /Users/charithpurushotham/Desktop/Wats_Next/skin-hair-analysis
npm run dev
```

Wait for both servers to start successfully.

---

## Manual Testing Checklist

### Test 1: User Registration ✅

1. Open browser: `http://localhost:3000`
2. Click "Register" tab
3. Enter:
   - **Name**: `John Doe`
   - **Email**: `john@example.com`
   - **Password**: `password123`
4. Click "Create Account"

**Expected Results:**
- ✅ Redirects to feature carousel
- ✅ User info shows "John Doe" in top-right corner
- ✅ No errors displayed

**What's Happening:**
- Password hashed with bcryptjs
- User saved to MongoDB `wellbeing_app.users` collection
- JWT token generated and stored in HTTP-only cookie
- Frontend receives user data

---

### Test 2: User Login ✅

1. Click logout button (if logged in)
2. Fill in login form:
   - **Email**: `john@example.com`
   - **Password**: `password123`
3. Click "Sign In"

**Expected Results:**
- ✅ Redirects to feature carousel
- ✅ User info appears in top-right
- ✅ Same user data as registration

**What's Happening:**
- Email lookup in MongoDB
- Password verified with bcrypt.compare()
- New JWT token generated
- Cookie updated

---

### Test 3: Cross-Service Authentication ✅

**This is the most important test!**

1. Login to base app (localhost:3000)
2. In same browser, navigate to `http://localhost:3002`
3. Do NOT login again

**Expected Results:**
- ✅ Skin-hair page loads immediately
- ✅ Shows "Logged in as John Doe"
- ✅ No redirect to login page
- ✅ Can interact with all features

**What's Happening:**
- Cookie sent from browser to localhost:3002
- Skin-hair app verifies JWT token
- Extracts user info from token
- Grants access without re-authentication

---

### Test 4: Logout from Skin-Hair App ✅

1. While on `http://localhost:3002`
2. Click logout button in navigation

**Expected Results:**
- ✅ Redirects to `http://localhost:3000`
- ✅ Shows login form
- ✅ User session completely cleared

**What's Happening:**
- Logout button calls `http://localhost:3000/api/auth/logout`
- Auth cookie deleted from browser
- Redirects to base app

---

### Test 5: Protected Route Access ✅

1. Open incognito/private window
2. Navigate directly to `http://localhost:3002`

**Expected Results:**
- ✅ Immediately redirects to `http://localhost:3000`
- ✅ Shows login form
- ✅ Cannot access skin-hair features

**What's Happening:**
- Server-side check for auth cookie
- No cookie found
- `getCurrentUser()` returns null
- `redirect()` triggers to base app

---

### Test 6: Invalid Credentials ✅

**Test Wrong Password:**
1. Go to `http://localhost:3000`
2. Enter:
   - Email: `john@example.com`
   - Password: `wrongpassword`
3. Click "Sign In"

**Expected:**
- ✅ Error: "Invalid email or password"
- ✅ Stays on login page

**Test Non-existent Email:**
1. Enter:
   - Email: `nobody@example.com`
   - Password: `anything`
2. Click "Sign In"

**Expected:**
- ✅ Error: "Invalid email or password"
- ✅ Same generic error (no information leak)

**Test Duplicate Registration:**
1. Click "Register" tab
2. Use email that already exists
3. Click "Create Account"

**Expected:**
- ✅ Error: "User with this email already exists"

---

### Test 7: Session Persistence ✅

1. Login to base app
2. Close browser tab
3. Reopen `http://localhost:3000`

**Expected:**
- ✅ Still logged in
- ✅ Shows feature carousel
- ✅ User info displayed

**Explanation:**
- Cookie persists in browser
- 7-day expiration
- Automatic re-authentication

---

### Test 8: Navigation Between Services ✅

1. Login to base app
2. Click "Skin & Hair Analysis" in navigation
3. Verify skin-hair page loads
4. Click "Home" in skin-hair navigation
5. Verify returns to base app

**Expected:**
- ✅ Seamless navigation
- ✅ No login required
- ✅ User session maintained

---

## API Testing with cURL

### Test Registration API
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123",
    "name": "Test User"
  }' \
  -c cookies.txt \
  -v
```

**Expected Response:**
```json
{
  "success": true,
  "user": {
    "userId": "507f1f77bcf86cd799439011",
    "email": "test@example.com",
    "name": "Test User"
  }
}
```

**Expected Headers:**
- `Set-Cookie: auth_token=...`
- Status: `201 Created`

---

### Test Login API
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123"
  }' \
  -c cookies.txt \
  -v
```

**Expected Response:**
```json
{
  "success": true,
  "user": {
    "userId": "507f1f77bcf86cd799439011",
    "email": "test@example.com",
    "name": "Test User"
  }
}
```

---

### Test Get Current User API
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -b cookies.txt \
  -v
```

**Expected Response:**
```json
{
  "user": {
    "userId": "507f1f77bcf86cd799439011",
    "email": "test@example.com",
    "name": "Test User"
  }
}
```

**Without Cookie:**
```bash
curl -X GET http://localhost:3000/api/auth/me -v
```

**Expected:**
- Status: `401 Unauthorized`
- Body: `{ "error": "Not authenticated" }`

---

### Test Logout API
```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -b cookies.txt \
  -c cookies.txt \
  -v
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Expected Headers:**
- Cookie cleared from cookies.txt

---

### Test Cross-Service Token Verification
```bash
# 1. Login to get cookie
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "test123"}' \
  -c cookies.txt

# 2. Access skin-hair page with same cookie
curl -X GET http://localhost:3002/ \
  -b cookies.txt \
  -L
```

**Expected:**
- ✅ HTML content (not redirect)
- ✅ Contains user data

---

## Database Verification

### Check User in MongoDB

```javascript
// MongoDB Shell
use wellbeing_app

// Find user
db.users.findOne({ email: "john@example.com" })

// Expected output:
{
  "_id": ObjectId("..."),
  "email": "john@example.com",
  "name": "John Doe",
  "password": "$2a$10$...",  // bcrypt hash
  "createdAt": ISODate("2026-03-08T...")
}
```

### Verify Password Hash

```javascript
// Password should be hashed
db.users.find({ email: "john@example.com" }, { password: 1 })

// Output should show bcrypt hash starting with $2a$ or $2b$
```

---

## Browser DevTools Testing

### Check Authentication Cookie

1. Open DevTools (F12)
2. Go to Application/Storage tab
3. Expand "Cookies"
4. Select `http://localhost:3000`

**Expected Cookie:**
```
Name: auth_token
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Domain: localhost
Path: /
Expires: 7 days from now
HttpOnly: ✓ (checked)
Secure: - (unchecked in development)
SameSite: Lax
```

### Decode JWT Token

1. Copy token value
2. Go to https://jwt.io
3. Paste token

**Expected Payload:**
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "email": "john@example.com",
  "name": "John Doe",
  "iat": 1678291200,
  "exp": 1678896000
}
```

---

## Network Tab Testing

### Monitor Login Request

1. Open DevTools > Network tab
2. Perform login
3. Find `login` request

**Request:**
```
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response Headers:**
```
Set-Cookie: auth_token=...; Path=/; HttpOnly; SameSite=Lax
Content-Type: application/json
```

**Response Body:**
```json
{
  "success": true,
  "user": {
    "userId": "...",
    "email": "john@example.com",
    "name": "John Doe"
  }
}
```

---

## Error Cases to Test

### 1. Email Validation
**Input:** `invalid-email`
**Expected:** `"Invalid email format"`

### 2. Short Password
**Input:** `12345` (only 5 chars)
**Expected:** `"Password must be at least 6 characters long"`

### 3. Missing Fields
**Input:** `{ email: "test@test.com" }` (no password)
**Expected:** `"Email and password are required"`

### 4. Database Connection Error
**Simulate:** Stop MongoDB
**Expected:** `"Internal server error"`
**Log:** Console shows connection error

### 5. Invalid JWT Token
**Simulate:** Manually edit cookie value
**Expected:** Logged out, redirected to login

### 6. Expired Token
**Simulate:** Set JWT_EXPIRES_IN=1s, wait, refresh
**Expected:** Token verification fails, redirected to login

---

## Security Testing

### Test 1: Password Not Exposed
```bash
curl http://localhost:3000/api/auth/me -b cookies.txt
```
**Verify:** Response does NOT contain password field

### Test 2: JWT Secret Not Leaked
- Check browser console
- Check network responses
- Verify JWT_SECRET never sent to client

### Test 3: HttpOnly Cookie Protection
- Try accessing cookie via JavaScript in browser console:
```javascript
document.cookie
```
**Expected:** Cookie NOT visible (HttpOnly protection)

### Test 4: CSRF Protection
- Try cross-origin request without proper credentials
**Expected:** Request blocked by SameSite=Lax

---

## Performance Testing

### Token Verification Speed
Run 100 requests:
```bash
for i in {1..100}; do
  curl -X GET http://localhost:3000/api/auth/me -b cookies.txt -w "%{time_total}\n" -o /dev/null -s
done
```

**Expected:** < 100ms per request

---

## Troubleshooting Common Issues

### Issue: Cookie not shared between apps
**Solution:**
1. Check both apps use same JWT_SECRET
2. Verify both running on localhost
3. Clear browser cookies and retry

### Issue: "Not authenticated" error
**Solution:**
1. Check cookie exists in DevTools
2. Verify JWT_SECRET matches
3. Check MongoDB connection
4. Verify user exists in database

### Issue: Infinite redirect loop
**Solution:**
1. Clear cookies
2. Check redirect logic in code
3. Verify getCurrentUser() returns correctly

### Issue: "User not found" after login
**Solution:**
1. Check MongoDB database name
2. Verify user in correct collection
3. Check userId format (string vs ObjectId)

---

## Success Criteria

All tests pass when:

- ✅ Users can register with valid credentials
- ✅ Users can login with correct password
- ✅ Users can logout successfully
- ✅ Invalid credentials rejected
- ✅ Passwords hashed in database
- ✅ JWT tokens generated correctly
- ✅ Cookies set with proper security flags
- ✅ Authentication works across both apps
- ✅ Protected routes redirect correctly
- ✅ Session persists across page refreshes
- ✅ No security vulnerabilities
- ✅ Error handling works properly

---

## Next Steps After Testing

If all tests pass:

1. ✅ JWT authentication is fully functional
2. ✅ Ready for production deployment (after updating secrets)
3. ✅ Can proceed with building features
4. ✅ Consider adding:
   - Email verification
   - Password reset
   - Refresh tokens
   - Rate limiting
   - Account management

---

**Last Updated:** March 8, 2026
**Test Status:** ✅ Ready for Testing
**Estimated Test Duration:** 15-20 minutes
