# WellBeing App

A comprehensive wellness app with AI-powered exercise tracking, nutrition planning, skin/hair analysis, and unified health insights.

## 📚 Documentation

All detailed documentation is organized in the [`docs/`](./docs/) folder:
- Project plans and architecture
- Implementation guides
- System design documents
- Updates and logging guides

See [docs/README.md](./docs/README.md) for the complete documentation index.

## Current Features

### ✅ Feature 1: Exercise Tracker (Bicep Curl)

- **Real-time Pose Detection** using MediaPipe Pose
- **Bicep Curl Analysis** with:
  - Automatic rep counting
  - Posture validation (straight back/head alignment)
  - Arm position validation (arms close to body at 0° angle)
  - Full body visibility check
  - Form scoring (0-100%)
  - Live feedback overlay
- **Mobile Responsive UI** with hamburger menu navigation
- **MongoDB Integration** for session storage
- **Dark theme** inspired by Doom 64

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + React + TypeScript
- **Styling**: Tailwind CSS (all styles in CSS files)
- **Pose Detection**: MediaPipe Pose (client-side)
- **Database**: MongoDB Atlas
- **AI**: Google Gemini API (ready for advanced analysis)
- **State Management**: Zustand + React Query

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

The `.env.local` file is already configured with:
- MongoDB connection string
- Gemini API key
- App URL

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Test the Exercise Tracker

1. Navigate to **Physical Fitness** from the homepage or hamburger menu
2. Allow camera permissions when prompted
3. Stand 6-8 feet from camera with full body visible
4. Click "Start Exercise" to begin tracking
5. Perform bicep curls with proper form:
   - Stand straight (back and head aligned)
   - Keep elbows close to your body
   - Full range of motion (extend and curl)
6. Watch real-time feedback and metrics
7. Click "Save Session" when done

## Project Structure

```
Wats_Next/
├── src/
│   ├── app/
│   │   ├── globals.css          # Global styles
│   │   ├── layout.tsx           # Root layout
│   │   ├── page.tsx             # Homepage
│   │   ├── fitness/
│   │   │   ├── page.tsx         # Exercise tracker page
│   │   │   └── fitness.css      # Fitness page styles
│   │   └── api/
│   │       └── sessions/
│   │           └── route.ts     # Session API endpoints
│   ├── components/
│   │   ├── Navigation.tsx       # Mobile-responsive nav
│   │   ├── Providers.tsx        # React Query provider
│   │   └── WebcamCapture.tsx    # MediaPipe webcam component
│   └── lib/
│       ├── BicepCurlAnalyzer.ts # Exercise analysis logic
│       └── mongodb.ts           # MongoDB utilities
├── tailwind.config.ts           # Tailwind configuration
├── next.config.js               # Next.js configuration
└── package.json                 # Dependencies
```

## Exercise Tracker Features

### Posture Validation
- ✅ Back alignment check (vertical tolerance: ±15°)
- ✅ Head positioning (centered above shoulders)
- ✅ Real-time posture scoring

### Arm Position Validation
- ✅ Elbow-to-body angle monitoring (target: 0°, max: 15°)
- ✅ Left and right arm symmetry
- ✅ Feedback for arm positioning

### Full Body Visibility
- ✅ Detects all required landmarks (head, shoulders, elbows, wrists, hips, ankles)
- ✅ Minimum visibility threshold (50%)
- ✅ Alerts when body parts are out of frame

### Rep Counting
- ✅ Automatic rep detection with realistic thresholds
- ✅ Phase tracking (down: >160°, up: <30°)
- ✅ Angle calculation using `arctan2` method (same as Python/JS CV implementations)
- ✅ Rep completion confirmation

### Form Scoring
- ✅ Overall form score (0-100%)
- ✅ Posture score
- ✅ Arm position score
- ✅ Visibility score
- ✅ Real-time feedback messages

### Session Storage
- ✅ Save completed sessions to MongoDB
- ✅ Track reps, scores, and metrics
- ✅ Retrieve session history (API ready)

## Mobile Responsive Design

- ✅ Hamburger menu for mobile navigation
- ✅ Responsive grid layouts
- ✅ Touch-friendly controls
- ✅ Optimized for all screen sizes (mobile, tablet, desktop)

## Next Features (Coming Soon)

- [ ] Feature 2: Nutrition Tracker
- [ ] Feature 3: Skin Analysis
- [ ] Feature 4: Hair Analysis
- [ ] Feature 5: Sleep Tracking
- [ ] Feature 6: Supplement Tracker

## Browser Requirements

- Modern browser with WebRTC support (Chrome, Firefox, Safari, Edge)
- Camera permissions
- Good lighting for optimal pose detection

## Performance Tips

- Ensure good lighting for better pose detection
- Stand 6-8 feet from camera
- Keep full body in frame
- Use a stable camera position
- Clear background helps accuracy

## Development

Built with feature-by-feature approach for easy testing and iteration.

### Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Database Schema

### Sessions Collection
```typescript
{
  userId: string;
  exercise: string;
  date: Date;
  reps: number;
  duration: number;
  formScore: number;
  postureScore: number;
  armPositionScore: number;
  visibilityScore: number;
  avgElbowAngle: number;
  notes?: string;
}
```

## API Endpoints

- `POST /api/sessions` - Save exercise session
- `GET /api/sessions?userId=xxx&limit=10` - Get user sessions

## License

Private project

## Support

For issues or questions about Feature 1 (Exercise Tracker), test the app and provide feedback before moving to the next feature.
