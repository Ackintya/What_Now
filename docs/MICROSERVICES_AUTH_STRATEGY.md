# Microservices Authentication Strategy

## Current Architecture

```
Wats_Next/
├── base/                    # Fitness + Auth (Next.js)
├── nutrition-wellness/      # Meal planning (Next.js)
├── skin-hair-analysis/      # Skin/Hair analysis (Next.js)
└── nutrition-yelp/
    ├── backend/            # Menu scanning backend
    └── frontend/           # Menu scanning frontend
```

---

## The Challenge

**Problem:** How to share authentication across independent microservices?

**Your scenario:**
1. User logs in on **base** (homepage)
2. Clicks "Nutrition" in hamburger menu
3. Navigates to **nutrition-wellness** microservice
4. nutrition-wellness needs to know: Who is this user?

**Current (INSECURE):**
- Passing `userId` as query parameter: `?userId=123`
- Anyone can change the userId and access other users' data

**Needed (SECURE):**
- Cryptographically signed tokens that can't be forged
- Each microservice can independently verify the user
- Tokens expire after a reasonable time
- No shared session store needed

---

## Recommended Solution: JWT (JSON Web Tokens)

### Why JWT?

✅ **Stateless** - No shared session database needed
✅ **Self-contained** - Token includes user info
✅ **Cryptographically secure** - Can't be forged without secret key
✅ **Standard** - Every language/framework has JWT libraries
✅ **Microservice-friendly** - Each service validates independently

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      BASE (Auth Service)                     │
│  - Login/Register pages                                      │
│  - Issues JWT tokens                                         │
│  - Stores in httpOnly cookie                                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
              ┌─────────────┴─────────────┐
              ↓                           ↓
┌───────────────────────┐    ┌───────────────────────┐
│  nutrition-wellness   │    │  skin-hair-analysis   │
│  - Reads JWT cookie   │    │  - Reads JWT cookie   │
│  - Verifies with key  │    │  - Verifies with key  │
│  - Gets userId        │    │  - Gets userId        │
└───────────────────────┘    └───────────────────────┘
```

---

## Implementation Plan

### **Phase 1: Setup JWT in Base**

#### 1.1 Install Dependencies
```bash
cd base
npm install jsonwebtoken bcryptjs cookie
npm install --save-dev @types/jsonwebtoken @types/bcryptjs @types/cookie
```

#### 1.2 Add JWT Secret to Environment
```env
# base/.env.local
JWT_SECRET=your-super-secret-key-min-32-characters-long
JWT_EXPIRES_IN=7d  # Token valid for 7 days
```

#### 1.3 Create Auth API Routes in Base

**`base/src/app/api/auth/register/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDatabase } from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  const { username, password, retypePassword } = await request.json();

  // Validate passwords match
  if (password !== retypePassword) {
    return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 });
  }

  const db = await getDatabase();

  // Check if user exists
  const existingUser = await db.collection('users').findOne({ username });
  if (existingUser) {
    return NextResponse.json({ error: 'Username already taken' }, { status: 400 });
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user
  const result = await db.collection('users').insertOne({
    username,
    password: hashedPassword,
    createdAt: new Date(),
    lastLogin: new Date(),
  });

  // Create JWT
  const token = jwt.sign(
    { userId: result.insertedId.toString(), username },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  // Set httpOnly cookie
  const response = NextResponse.json({
    success: true,
    user: { id: result.insertedId.toString(), username }
  });

  response.cookies.set('auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/',
  });

  return response;
}
```

**`base/src/app/api/auth/login/route.ts`**
```typescript
export async function POST(request: NextRequest) {
  const { username, password } = await request.json();

  const db = await getDatabase();
  const user = await db.collection('users').findOne({ username });

  if (!user) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  // Verify password
  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  // Update last login
  await db.collection('users').updateOne(
    { _id: user._id },
    { $set: { lastLogin: new Date() }}
  );

  // Create JWT
  const token = jwt.sign(
    { userId: user._id.toString(), username: user.username },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  );

  const response = NextResponse.json({
    success: true,
    user: { id: user._id.toString(), username: user.username }
  });

  response.cookies.set('auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  });

  return response;
}
```

---

### **Phase 2: Share JWT Secret Across Microservices**

#### Option A: Environment Variable (Recommended for Development)

Add the SAME secret to each microservice:

```env
# nutrition-wellness/.env.local
JWT_SECRET=your-super-secret-key-min-32-characters-long  # SAME as base

# skin-hair-analysis/.env.local
JWT_SECRET=your-super-secret-key-min-32-characters-long  # SAME as base
```

#### Option B: Shared Configuration File (Recommended for Production)

Create a shared config:
```typescript
// shared/auth-config.ts (symlinked or copied to each service)
export const AUTH_CONFIG = {
  jwtSecret: process.env.JWT_SECRET!,
  jwtExpiresIn: '7d',
  cookieName: 'auth-token',
};
```

---

### **Phase 3: Add JWT Verification to Each Microservice**

#### 3.1 Create Auth Utility in Each Service

**`nutrition-wellness/src/lib/auth.ts`**
```typescript
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

export interface User {
  userId: string;
  username: string;
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return null;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as User;
    return decoded;
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
}

export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}
```

**Copy this SAME file to:**
- `skin-hair-analysis/src/lib/auth.ts`
- `nutrition-yelp/frontend/src/lib/auth.ts` (if Next.js)

#### 3.2 Use in API Routes

**Example: `nutrition-wellness/src/app/api/meals/route.ts`**
```typescript
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(); // Throws if not authenticated

    // Now you have the userId!
    const meals = await db.collection('meals').find({
      userId: user.userId
    }).toArray();

    return NextResponse.json({ meals });
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
```

#### 3.3 Use in Pages (Server Components)

**Example: `nutrition-wellness/src/app/page.tsx`**
```typescript
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function NutritionPage() {
  const user = await getCurrentUser();

  if (!user) {
    // Redirect to base homepage for login
    redirect('http://localhost:3000/'); // Or your base URL
  }

  return (
    <div>
      <h1>Welcome, {user.username}!</h1>
      {/* Rest of nutrition page */}
    </div>
  );
}
```

---

### **Phase 4: Navigation Between Services**

#### 4.1 Update Base Navigation to Link to Microservices

**`base/src/components/Navigation.tsx`**
```typescript
const menuItems = [
  {
    name: "Physical Fitness",
    href: "/fitness",  // Internal route
    icon: Dumbbell
  },
  {
    name: "Nutrition",
    href: "http://localhost:3001",  // nutrition-wellness port
    icon: Apple,
    external: true
  },
  {
    name: "Skin Analysis",
    href: "http://localhost:3002",  // skin-hair-analysis port
    icon: Droplet,
    external: true
  },
];
```

#### 4.2 Handle External Links

```typescript
{menuItems.map((item) => (
  item.external ? (
    <a href={item.href} target="_blank" rel="noopener noreferrer">
      {item.name}
    </a>
  ) : (
    <Link href={item.href}>{item.name}</Link>
  )
))}
```

---

### **Phase 5: Cookie Sharing Across Localhost Ports**

**Problem:** Cookies set on `localhost:3000` (base) are not automatically sent to `localhost:3001` (nutrition)

**Solution 1: Development - Use Same Port with Proxy** (Recommended)

Set up API routes in base that proxy to microservices:

**`base/src/app/nutrition/page.tsx`**
```typescript
// This is just a proxy/iframe to nutrition-wellness
export default function NutritionProxy() {
  return (
    <iframe
      src="http://localhost:3001"
      className="w-full h-screen"
      style={{ border: 'none' }}
    />
  );
}
```

**Or use Next.js rewrites in `base/next.config.js`:**
```javascript
async rewrites() {
  return [
    {
      source: '/nutrition/:path*',
      destination: 'http://localhost:3001/:path*',
    },
    {
      source: '/skin/:path*',
      destination: 'http://localhost:3002/:path*',
    },
  ];
}
```

This way everything appears on `localhost:3000`, cookies work!

**Solution 2: Production - Use Subdomains**

Deploy to:
- `app.wellbeing.com` (base)
- `nutrition.wellbeing.com` (nutrition)
- `skin.wellbeing.com` (skin)

Set cookie domain to `.wellbeing.com` (works across subdomains):
```typescript
response.cookies.set('auth-token', token, {
  domain: '.wellbeing.com',  // ← Works on all subdomains
  httpOnly: true,
  // ...
});
```

---

## Complete Flow Diagram

### **1. User Registers/Logs In:**

```
User → base/login
  ↓
POST /api/auth/login
  ↓
MongoDB: Find user, verify password
  ↓
Create JWT: { userId: "123", username: "john" }
  ↓
Set cookie: auth-token=eyJhbG... (httpOnly)
  ↓
Redirect to /fitness or /
```

### **2. User Navigates to Nutrition:**

```
User clicks "Nutrition" in menu
  ↓
Navigate to /nutrition (proxied to localhost:3001)
  ↓
Browser automatically sends auth-token cookie
  ↓
nutrition-wellness reads cookie
  ↓
jwt.verify(token, JWT_SECRET)
  ↓
Extract: { userId: "123", username: "john" }
  ↓
Fetch user's meals from MongoDB using userId
  ↓
Display personalized content
```

### **3. Token Verification in Every Microservice:**

```typescript
// Middleware or utility function (same across all services)
const token = cookies().get('auth-token');
const user = jwt.verify(token, JWT_SECRET);
// user = { userId: "123", username: "john" }
```

---

## Security Best Practices

### 1. **httpOnly Cookies**
- JavaScript can't access (prevents XSS attacks)
- Automatically sent with requests

### 2. **Secure Flag**
- Only sent over HTTPS in production
- Set `secure: true` in production

### 3. **SameSite**
- Prevents CSRF attacks
- Use `sameSite: 'lax'` or `'strict'`

### 4. **Token Expiration**
- Tokens expire after 7 days
- User must re-login
- Refresh tokens for longer sessions (optional)

### 5. **Password Hashing**
- bcrypt with 10 rounds
- Never store plain passwords
- Salt automatically included

### 6. **Shared Secret Protection**
- JWT_SECRET must be identical across all services
- Store in .env files (not in code)
- Never commit to git (.gitignore protects it)

---

## MongoDB Schema

### **Users Collection:**
```javascript
{
  _id: ObjectId("..."),
  username: "john_doe",      // Unique index
  password: "$2a$10$...",     // Bcrypt hash
  createdAt: ISODate("..."),
  lastLogin: ISODate("..."),
  profile: {
    weight: 70,
    height: 175,
    goal: "muscle_gain"
  }
}
```

### **Create Index:**
```javascript
db.users.createIndex({ username: 1 }, { unique: true });
```

---

## Implementation Checklist

### **Base (Auth Service):**
- [ ] Install: jsonwebtoken, bcryptjs, cookie
- [ ] Create `/api/auth/register` route
- [ ] Create `/api/auth/login` route
- [ ] Create `/api/auth/logout` route
- [ ] Create `/api/auth/me` route (get current user)
- [ ] Update homepage with login/register forms
- [ ] Create auth utility functions
- [ ] Add JWT_SECRET to .env.local

### **Each Microservice:**
- [ ] Install: jsonwebtoken
- [ ] Add JWT_SECRET to .env.local (SAME as base)
- [ ] Create `src/lib/auth.ts` utility
- [ ] Protect pages: check auth, redirect if not logged in
- [ ] Use `requireAuth()` in API routes
- [ ] Test token verification works

### **Navigation:**
- [ ] Update base navigation to link to microservices
- [ ] Use Next.js rewrites OR iframes OR direct links
- [ ] Ensure cookies are sent with cross-origin requests

### **Testing:**
- [ ] Register new user
- [ ] Login works
- [ ] Token stored in cookie
- [ ] Navigate to nutrition - user still authenticated
- [ ] Navigate to skin - user still authenticated
- [ ] Logout clears cookie everywhere
- [ ] Expired token requires re-login

---

## Profile Page

Create `/profile` route in base:

**`base/src/app/profile/page.tsx`**
```typescript
import { getCurrentUser } from '@/lib/auth';

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) redirect('/');

  // Fetch user profile from MongoDB
  const db = await getDatabase();
  const userDoc = await db.collection('users').findOne({
    _id: new ObjectId(user.userId)
  });

  return (
    <div>
      <h1>Profile</h1>
      <p>Username: {userDoc.username}</p>
      <p>Member since: {userDoc.createdAt.toLocaleDateString()}</p>
      <p>Last login: {userDoc.lastLogin.toLocaleDateString()}</p>
      {/* Edit form for profile.weight, profile.height, etc. */}
    </div>
  );
}
```

---

## Alternative: Shared Auth Service (Advanced)

If microservices grow complex, consider a dedicated auth service:

```
┌──────────────────┐
│  Auth Service    │  (Separate microservice)
│  :4000           │  - Handles all login/register
└──────────────────┘  - Issues JWT tokens
          ↓
    ┌─────┴─────┬─────────┬─────────┐
    ↓           ↓         ↓         ↓
  base    nutrition   skin    nutrition-yelp
  (validates JWT)  (validates JWT)  (validates JWT)
```

Benefits:
- Single source of truth for auth
- Easier to update auth logic
- Can use OAuth, social login, etc.

---

## Recommended: Start Simple, Grow As Needed

**Phase 1 (Now):**
- JWT tokens
- httpOnly cookies
- Base handles login
- Shared JWT_SECRET

**Phase 2 (Later):**
- Refresh tokens
- Token revocation list
- OAuth integration

**Phase 3 (Production):**
- Dedicated auth service
- Redis for sessions
- Rate limiting
- 2FA

---

## Quick Start Commands

```bash
# 1. Install dependencies in base
cd base
npm install jsonwebtoken bcryptjs cookie

# 2. Add JWT_SECRET to .env.local
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env.local

# 3. Copy secret to other services
JWT_SECRET=$(grep JWT_SECRET base/.env.local)
echo $JWT_SECRET >> nutrition-wellness/.env.local
echo $JWT_SECRET >> skin-hair-analysis/.env.local
echo $JWT_SECRET >> nutrition-yelp/frontend/.env.local

# 4. Start all services
cd base && npm run dev &                    # Port 3000
cd nutrition-wellness && npm run dev &      # Port 3001
cd skin-hair-analysis && npm run dev &      # Port 3002
cd nutrition-yelp/frontend && npm run dev & # Port 3003
```

---

## Summary

✅ **Use JWT tokens** for stateless, secure authentication
✅ **Share JWT_SECRET** across all microservices
✅ **httpOnly cookies** prevent XSS attacks
✅ **Each service validates independently** - no central session store needed
✅ **Works with your existing MongoDB** - just add users collection
✅ **Easy to implement** - Standard libraries available
✅ **Scalable** - Works for any number of microservices

**Next Steps:**
1. Implement auth routes in base
2. Add login/register UI to homepage
3. Copy JWT secret to all services
4. Test authentication flow
5. Add profile page

This gives you production-ready, secure authentication across all your microservices! 🔐
