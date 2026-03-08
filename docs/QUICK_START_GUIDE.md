# Quick Start Guide - JWT Authentication

## Prerequisites
- Node.js installed
- MongoDB connection string
- Both apps installed with dependencies

## Step 1: Start Both Applications

### Terminal 1 - Base App
```bash
cd /Users/charithpurushotham/Desktop/Wats_Next/base
npm run dev
```
Server runs on: **http://localhost:3000**

### Terminal 2 - Skin-Hair-Analysis
```bash
cd /Users/charithpurushotham/Desktop/Wats_Next/skin-hair-analysis
npm run dev
```
Server runs on: **http://localhost:3002**

## Step 2: Create an Account

1. Open browser: **http://localhost:3000**
2. You'll see the login/register form
3. Click **Register** tab
4. Fill in:
   - **Name**: Your name (e.g., "John Doe")
   - **Email**: Valid email (e.g., "john@example.com")
   - **Password**: At least 6 characters
5. Click **Create Account**
6. You'll be automatically logged in

## Step 3: Explore the Base App

After login, you'll see:
- Feature carousel with 4 slides (Fitness, Nutrition, Skin, Hair)
- User info in top-right corner showing your name
- Logout button
- Navigation menu

## Step 4: Access Skin-Hair Analysis

### Option 1: Via Navigation Menu
1. Click the hamburger menu (mobile) or see desktop nav
2. Click **Skin & Hair Analysis**
3. Browser navigates to localhost:3002

### Option 2: Direct URL
1. Type: **http://localhost:3002**
2. You'll be automatically authenticated
3. If not logged in, redirects to base app

## Step 5: Use Skin-Hair Features

You'll see:
- "Logged in as [Your Name]" at top
- Home button to return to base
- Logout button in navigation
- All skin-hair analysis features
- Your userId automatically used for all operations

## Step 6: Test Logout

### From Skin-Hair App:
1. Click navigation menu
2. Click **Logout**
3. Redirected to base app login

### From Base App:
1. Click logout button in top-right
2. Returns to login screen

## Common Scenarios

### First Time User
```
1. Go to localhost:3000
2. See login form
3. Click Register
4. Create account
5. Automatically logged in
6. Browse features
```

### Returning User
```
1. Go to localhost:3000
2. See login form
3. Enter email and password
4. Click Sign In
5. Access granted
```

### Using Skin-Hair Analysis
```
1. Login to base app
2. Navigate to fitness or other features (optional)
3. Click "Skin & Hair Analysis" menu
4. Opens localhost:3002
5. Authenticated automatically
6. Upload skin/hair photos
7. Get analysis
8. View recommendations
```

### Session Persistence
```
- Login once
- Navigate between base (3000) and skin-hair (3002)
- Stay logged in across both
- Session lasts 7 days
- Logout from either clears both
```

## Troubleshooting

### Issue: Redirected to Login After Clicking Skin-Hair
**Solution**: Your session expired or you're not logged in
1. Login to base app first
2. Then navigate to skin-hair

### Issue: Can't Login - Invalid Credentials
**Solution**:
1. Double-check email (case-sensitive for password)
2. Try registering a new account
3. Check MongoDB connection in .env.local

### Issue: Registration Fails - User Already Exists
**Solution**: Email already registered
1. Use login instead
2. Or use a different email

### Issue: Skin-Hair Shows "Testing user context" Input
**Solution**: Old code still running
1. Restart skin-hair-analysis server
2. Hard refresh browser (Cmd/Ctrl + Shift + R)

### Issue: Cookie Not Shared Between Apps
**Solution**: Check both apps running on localhost
1. Base: localhost:3000
2. Skin-hair: localhost:3002
3. Both must use localhost (not 127.0.0.1)

## Testing Different Users

### Create Multiple Accounts
```bash
# User 1
Email: alice@example.com
Password: password123
Name: Alice Smith

# User 2
Email: bob@example.com
Password: password456
Name: Bob Jones
```

Each user has:
- Separate data in skin-hair analysis
- Own fitness sessions
- Own profile settings
- Own recommendations

## Development Tips

### Check Current User
```javascript
// In browser console on localhost:3000 or 3002
fetch('/api/auth/me')
  .then(r => r.json())
  .then(console.log)
```

### Clear Session
```javascript
// In browser console
fetch('/api/auth/logout', { method: 'POST' })
  .then(() => location.reload())
```

### View Cookie
```javascript
// In browser console
document.cookie
// Should see: auth_token=...
```

## MongoDB Data

### Check Users Collection
```javascript
// In MongoDB Compass or Shell
db.users.find()
```

Should show:
```json
{
  "_id": ObjectId("..."),
  "email": "alice@example.com",
  "name": "Alice Smith",
  "password": "$2a$10$...", // bcrypt hash
  "createdAt": ISODate("2025-...")
}
```

### Check Skin-Hair Profile
```javascript
db.skin_hair_profiles.find({ user_id: "user_id_here" })
```

## Security Notes

1. **Passwords**: Never shared or logged
2. **JWT Secret**: Keep in .env.local, never commit
3. **Cookies**: httpOnly, can't be accessed by JavaScript
4. **HTTPS**: Required in production
5. **Sessions**: Auto-expire after 7 days

## Next Steps

1. **Explore Features**
   - Try fitness tracking
   - Upload skin analysis photos
   - Get AI recommendations

2. **Customize Profile**
   - Set skin type
   - Add concerns
   - List allergies

3. **Track Progress**
   - Upload multiple photos
   - View trends over time
   - Compare results

4. **Integration Testing**
   - Create account
   - Use fitness features
   - Switch to skin-hair
   - Verify userId consistency
   - Check data isolation

## Support

If issues persist:
1. Check both servers running
2. Verify .env.local files exist and have JWT_SECRET
3. Check MongoDB connection
4. Review browser console for errors
5. Check server terminal for errors
