# WellBeing App - Implementation Guide

## Quick Start Setup

### 1. Initialize Next.js Project

```bash
# Create new Next.js app with TypeScript
npx create-next-app@latest wellbeing-app --typescript --tailwind --app --src-dir=false

# Navigate to project
cd wellbeing-app

# Install essential dependencies
npm install @mediapipe/pose @mediapipe/hands @mediapipe/camera_utils
npm install @clerk/nextjs @tanstack/react-query zustand
npm install mongodb mongoose
npm install react-hook-form zod @hookform/resolvers
npm install recharts react-webcam
npm install next-pwa workbox-runtime workbox-webpack-plugin

# Install UI components (Shadcn)
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card dialog dropdown-menu sheet tabs
```

### 2. Environment Configuration

Create `.env.local`:

```env
# MongoDB
MONGODB_URI=mongodb+srv://YOUR_USER:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/

# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/register
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# Google APIs
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_VISION_API_KEY=your_vision_api_key

# Optional: Voice
ELEVENLABS_API_KEY=your_elevenlabs_key

# App Config
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Core Component Implementations

### 1. WebCam Capture with MediaPipe

```typescript
// components/camera/WebcamCapture.tsx
'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Camera } from '@mediapipe/camera_utils';
import { Pose, Results } from '@mediapipe/pose';
import Webcam from 'react-webcam';

interface WebcamCaptureProps {
  onPoseDetected?: (results: Results) => void;
  onFrameCapture?: (image: string) => void;
  exerciseType?: string;
  showOverlay?: boolean;
}

export function WebcamCapture({
  onPoseDetected,
  onFrameCapture,
  exerciseType,
  showOverlay = true
}: WebcamCaptureProps) {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const frameBuffer = useRef<string[]>([]);
  const frameCounter = useRef(0);

  useEffect(() => {
    if (!webcamRef.current?.video) return;

    const pose = new Pose({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
      },
    });

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      smoothSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    pose.onResults((results: Results) => {
      setIsLoading(false);

      // Draw pose overlay if enabled
      if (showOverlay && canvasRef.current) {
        drawPoseOverlay(canvasRef.current, results);
      }

      // Trigger pose detection callback
      if (onPoseDetected) {
        onPoseDetected(results);
      }

      // Capture frame for Gemini API (every 2 seconds, store 10 frames)
      frameCounter.current++;
      if (frameCounter.current % 60 === 0) { // At 30fps, every 60 frames = 2 seconds
        captureFrame();
      }
    });

    const camera = new Camera(webcamRef.current.video, {
      onFrame: async () => {
        await pose.send({ image: webcamRef.current!.video! });
      },
      width: 1280,
      height: 720,
    });

    camera.start();

    return () => {
      camera.stop();
      pose.close();
    };
  }, [onPoseDetected, showOverlay]);

  const captureFrame = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        frameBuffer.current.push(imageSrc);

        // Keep only last 10 frames
        if (frameBuffer.current.length > 10) {
          frameBuffer.current.shift();
        }

        if (onFrameCapture) {
          onFrameCapture(imageSrc);
        }
      }
    }
  }, [onFrameCapture]);

  const drawPoseOverlay = (canvas: HTMLCanvasElement, results: Results) => {
    const ctx = canvas.getContext('2d');
    if (!ctx || !results.poseLandmarks) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw landmarks
    results.poseLandmarks.forEach((landmark) => {
      ctx.beginPath();
      ctx.arc(
        landmark.x * canvas.width,
        landmark.y * canvas.height,
        5,
        0,
        2 * Math.PI
      );
      ctx.fillStyle = '#00ff00';
      ctx.fill();
    });

    // Draw connections
    const connections = [
      [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], // Arms
      [11, 23], [12, 24], [23, 24], // Torso
      [23, 25], [25, 27], [24, 26], [26, 28], // Legs
    ];

    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;

    connections.forEach(([start, end]) => {
      const startLandmark = results.poseLandmarks[start];
      const endLandmark = results.poseLandmarks[end];

      ctx.beginPath();
      ctx.moveTo(
        startLandmark.x * canvas.width,
        startLandmark.y * canvas.height
      );
      ctx.lineTo(
        endLandmark.x * canvas.width,
        endLandmark.y * canvas.height
      );
      ctx.stroke();
    });
  };

  const getFramesForAnalysis = useCallback(() => {
    return frameBuffer.current;
  }, []);

  return (
    <div className="relative w-full max-w-4xl mx-auto">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10 rounded-lg">
          <div className="text-white">Loading MediaPipe...</div>
        </div>
      )}

      <div className="relative rounded-lg overflow-hidden">
        <Webcam
          ref={webcamRef}
          className="w-full h-auto"
          screenshotFormat="image/jpeg"
          videoConstraints={{
            width: 1280,
            height: 720,
            facingMode: "user"
          }}
        />

        {showOverlay && (
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
            width={1280}
            height={720}
          />
        )}
      </div>

      {exerciseType && (
        <div className="mt-4 p-4 bg-gray-900 rounded-lg">
          <h3 className="text-white font-semibold">Current Exercise: {exerciseType}</h3>
        </div>
      )}
    </div>
  );
}
```

### 2. Exercise Rep Counter Implementation

```typescript
// lib/mediapipe/exercises/bicepCurl.ts
import { Results } from '@mediapipe/pose';

export interface ExerciseMetrics {
  reps: number;
  formScore: number;
  asymmetryScore: number;
  tempo: { eccentric: number; concentric: number };
  fatigueScore: number;
}

export class BicepCurlAnalyzer {
  private previousElbowAngle: number = 180;
  private repPhase: 'rest' | 'eccentric' | 'concentric' = 'rest';
  private repStartTime: number = 0;
  private phaseStartTime: number = 0;
  private metrics: ExerciseMetrics = {
    reps: 0,
    formScore: 100,
    asymmetryScore: 0,
    tempo: { eccentric: 0, concentric: 0 },
    fatigueScore: 0
  };
  private repFormScores: number[] = [];

  calculateAngle(a: any, b: any, c: any): number {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) -
                    Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * 180 / Math.PI);
    if (angle > 180) angle = 360 - angle;
    return angle;
  }

  analyzePose(results: Results): ExerciseMetrics {
    if (!results.poseLandmarks) return this.metrics;

    const landmarks = results.poseLandmarks;

    // Key points for bicep curl
    const leftShoulder = landmarks[11];
    const leftElbow = landmarks[13];
    const leftWrist = landmarks[15];
    const rightShoulder = landmarks[12];
    const rightElbow = landmarks[14];
    const rightWrist = landmarks[16];

    // Calculate elbow angles
    const leftElbowAngle = this.calculateAngle(leftShoulder, leftElbow, leftWrist);
    const rightElbowAngle = this.calculateAngle(rightShoulder, rightElbow, rightWrist);

    // Use average for rep counting (assuming bilateral exercise)
    const currentAngle = (leftElbowAngle + rightElbowAngle) / 2;

    // Detect rep phases
    this.detectRepPhase(currentAngle);

    // Calculate form score
    this.calculateFormScore(landmarks);

    // Calculate asymmetry
    this.metrics.asymmetryScore = Math.abs(leftElbowAngle - rightElbowAngle);

    // Update fatigue score based on form degradation
    this.updateFatigueScore();

    this.previousElbowAngle = currentAngle;
    return this.metrics;
  }

  private detectRepPhase(currentAngle: number) {
    const currentTime = Date.now();

    // Rest position: arm extended (angle > 160)
    // Peak contraction: arm flexed (angle < 50)

    if (this.repPhase === 'rest' && currentAngle < 140) {
      // Starting eccentric (lowering) phase
      this.repPhase = 'eccentric';
      this.repStartTime = currentTime;
      this.phaseStartTime = currentTime;
    }
    else if (this.repPhase === 'eccentric' && currentAngle < 50) {
      // Reached peak, starting concentric phase
      this.metrics.tempo.eccentric = (currentTime - this.phaseStartTime) / 1000;
      this.repPhase = 'concentric';
      this.phaseStartTime = currentTime;
    }
    else if (this.repPhase === 'concentric' && currentAngle > 160) {
      // Completed rep
      this.metrics.tempo.concentric = (currentTime - this.phaseStartTime) / 1000;
      this.metrics.reps++;
      this.repPhase = 'rest';

      // Store form score for this rep
      this.repFormScores.push(this.metrics.formScore);
    }
  }

  private calculateFormScore(landmarks: any[]) {
    let score = 100;

    // Check elbow position (should stay close to torso)
    const leftElbow = landmarks[13];
    const leftHip = landmarks[23];
    const rightElbow = landmarks[14];
    const rightHip = landmarks[24];

    const leftElbowDrift = Math.abs(leftElbow.x - leftHip.x);
    const rightElbowDrift = Math.abs(rightElbow.x - rightHip.x);

    // Deduct points for elbow drift
    if (leftElbowDrift > 0.1) score -= 10;
    if (rightElbowDrift > 0.1) score -= 10;

    // Check shoulder stability (shouldn't rise)
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const shoulderLevelDiff = Math.abs(leftShoulder.y - rightShoulder.y);

    if (shoulderLevelDiff > 0.05) score -= 15;

    // Check for body sway
    const nose = landmarks[0];
    if (Math.abs(nose.x - 0.5) > 0.1) score -= 10;

    this.metrics.formScore = Math.max(0, score);
  }

  private updateFatigueScore() {
    if (this.repFormScores.length < 3) return;

    // Calculate average form score for last 3 reps
    const recentScores = this.repFormScores.slice(-3);
    const avgRecent = recentScores.reduce((a, b) => a + b, 0) / 3;

    // Calculate average form score for first 3 reps
    const earlyScores = this.repFormScores.slice(0, 3);
    const avgEarly = earlyScores.reduce((a, b) => a + b, 0) / 3;

    // Fatigue score is the degradation percentage
    this.metrics.fatigueScore = Math.max(0, avgEarly - avgRecent);
  }

  reset() {
    this.metrics = {
      reps: 0,
      formScore: 100,
      asymmetryScore: 0,
      tempo: { eccentric: 0, concentric: 0 },
      fatigueScore: 0
    };
    this.repFormScores = [];
    this.repPhase = 'rest';
  }
}
```

### 3. State Management with Zustand

```typescript
// store/useAppStore.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface ExerciseSession {
  id: string;
  exerciseType: string;
  startTime: Date;
  reps: number[];
  formScores: number[];
  asymmetryScores: number[];
  tempoData: Array<{ eccentric: number; concentric: number }>;
  fatigueScores: number[];
  injuryRisk: number;
}

interface HealthProfile {
  fitness: {
    weeklyWorkouts: number;
    averageFormScore: number;
    injuryRiskTrend: number[];
  };
  nutrition: {
    dailyProtein: number;
    dailyCalories: number;
    pantryItems: string[];
  };
  skin: {
    lastAnalysis: Date | null;
    acneScore: number;
    oilinessScore: number;
    recommendations: string[];
  };
  hair: {
    lastAnalysis: Date | null;
    healthScore: number;
    recommendations: string[];
  };
  sleep: {
    averageHours: number;
    quality: number;
  };
}

interface AppState {
  // Current Session
  currentSession: ExerciseSession | null;
  isRecording: boolean;

  // Health Profile
  profile: HealthProfile;

  // Live Data
  liveMetrics: {
    currentRep: number;
    formScore: number;
    asymmetry: number;
    injuryRisk: number;
  };

  // Frame Buffer for Gemini
  frameBuffer: string[];

  // Actions
  startSession: (exerciseType: string) => void;
  endSession: () => void;
  updateLiveMetrics: (metrics: Partial<AppState['liveMetrics']>) => void;
  addFrame: (frame: string) => void;
  updateProfile: (updates: Partial<HealthProfile>) => void;
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial State
        currentSession: null,
        isRecording: false,
        profile: {
          fitness: {
            weeklyWorkouts: 0,
            averageFormScore: 0,
            injuryRiskTrend: []
          },
          nutrition: {
            dailyProtein: 0,
            dailyCalories: 0,
            pantryItems: []
          },
          skin: {
            lastAnalysis: null,
            acneScore: 0,
            oilinessScore: 0,
            recommendations: []
          },
          hair: {
            lastAnalysis: null,
            healthScore: 0,
            recommendations: []
          },
          sleep: {
            averageHours: 0,
            quality: 0
          }
        },
        liveMetrics: {
          currentRep: 0,
          formScore: 100,
          asymmetry: 0,
          injuryRisk: 0
        },
        frameBuffer: [],

        // Actions
        startSession: (exerciseType) => {
          set({
            currentSession: {
              id: Date.now().toString(),
              exerciseType,
              startTime: new Date(),
              reps: [],
              formScores: [],
              asymmetryScores: [],
              tempoData: [],
              fatigueScores: [],
              injuryRisk: 0
            },
            isRecording: true,
            liveMetrics: {
              currentRep: 0,
              formScore: 100,
              asymmetry: 0,
              injuryRisk: 0
            }
          });
        },

        endSession: () => {
          const { currentSession } = get();
          if (currentSession) {
            // Save session to database
            fetch('/api/sessions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(currentSession)
            });
          }
          set({ currentSession: null, isRecording: false });
        },

        updateLiveMetrics: (metrics) => {
          set((state) => ({
            liveMetrics: { ...state.liveMetrics, ...metrics }
          }));
        },

        addFrame: (frame) => {
          set((state) => {
            const buffer = [...state.frameBuffer, frame];
            if (buffer.length > 10) buffer.shift();
            return { frameBuffer: buffer };
          });
        },

        updateProfile: (updates) => {
          set((state) => ({
            profile: { ...state.profile, ...updates }
          }));
        }
      }),
      {
        name: 'wellbeing-storage',
        partialize: (state) => ({ profile: state.profile })
      }
    )
  )
);
```

### 4. API Route for Gemini Analysis

```typescript
// app/api/analysis/pose/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    const { frames, exerciseType, landmarks } = await request.json();

    // Use Gemini Pro Vision for frame analysis
    const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });

    const prompt = `
      Analyze these exercise frames for a ${exerciseType}.

      Look for:
      1. Form quality and common mistakes
      2. Range of motion issues
      3. Compensation patterns
      4. Asymmetry between left and right sides
      5. Signs of fatigue or form breakdown

      Provide specific, actionable feedback.

      Return response as JSON with structure:
      {
        "formScore": number (0-100),
        "issues": string[],
        "corrections": string[],
        "injuryRisk": "low" | "medium" | "high",
        "recommendations": string[]
      }
    `;

    // Process frames
    const imageParts = frames.map((frame: string) => ({
      inlineData: {
        mimeType: "image/jpeg",
        data: frame.split(',')[1] // Remove data:image/jpeg;base64, prefix
      }
    }));

    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    const text = response.text();

    // Parse JSON from response
    const analysis = JSON.parse(text);

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Gemini API error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze pose' },
      { status: 500 }
    );
  }
}
```

### 5. Mobile-Responsive Navigation

```typescript
// components/layout/MobileNav.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Dumbbell, Apple, Sparkles, Moon, Pill } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const menuItems = [
  {
    icon: Dumbbell,
    label: 'Physical Fitness',
    href: '/physical-fitness',
    subItems: [
      { label: 'Exercise Tracker', href: '/physical-fitness/exercise-tracker' },
      { label: 'Yoga', href: '/physical-fitness/yoga' },
      { label: 'Posture Monitor', href: '/physical-fitness/posture' },
      { label: 'Coordination Tests', href: '/physical-fitness/coordination' },
      { label: 'Balance Training', href: '/physical-fitness/balance' }
    ]
  },
  {
    icon: Apple,
    label: 'Nutrition',
    href: '/nutrition',
    subItems: [
      { label: 'Meal Planner', href: '/nutrition/meal-planner' },
      { label: 'Menu Scanner', href: '/nutrition/menu-scanner' },
      { label: 'Pantry Manager', href: '/nutrition/pantry' }
    ]
  },
  {
    icon: Sparkles,
    label: 'Skin Analyst',
    href: '/skin-analyst',
    subItems: [
      { label: 'Scan Now', href: '/skin-analyst/scan' },
      { label: 'History', href: '/skin-analyst/history' },
      { label: 'Products', href: '/skin-analyst/products' }
    ]
  },
  {
    icon: Sparkles,
    label: 'Hair Analyst',
    href: '/hair-analyst',
    subItems: [
      { label: 'Scan Now', href: '/hair-analyst/scan' },
      { label: 'Products', href: '/hair-analyst/products' }
    ]
  },
  { icon: Moon, label: 'Sleep Tracker', href: '/sleep-tracker' },
  { icon: Pill, label: 'Supplements', href: '/supplements' }
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="lg:hidden p-2">
          <Menu className="h-6 w-6" />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold">WellBeing</h2>
            <button onClick={() => setOpen(false)}>
              <X className="h-6 w-6" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);

              return (
                <div key={item.href} className="mb-4">
                  <Link
                    href={item.href}
                    onClick={() => !item.subItems && setOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>

                  {item.subItems && isActive && (
                    <div className="ml-8 mt-2 space-y-1">
                      {item.subItems.map((subItem) => (
                        <Link
                          key={subItem.href}
                          href={subItem.href}
                          onClick={() => setOpen(false)}
                          className="block px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                        >
                          {subItem.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

### 6. Dashboard Implementation (Doom 64 Theme)

```typescript
// app/(dashboard)/page.tsx
'use client';

import { useAppStore } from '@/store/useAppStore';
import { Card } from '@/components/ui/card';
import {
  LineChart, Line, AreaChart, Area, RadarChart,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

export default function Dashboard() {
  const { profile, liveMetrics } = useAppStore();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4">
      {/* Header with Gradient */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent">
          Your Wellness Dashboard
        </h1>
        <p className="text-gray-400">Unified health insights at a glance</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Injury Risk Card */}
        <Card className="bg-[#1a1a1a] border-gray-800 p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-gray-400 text-sm">Injury Risk</p>
              <p className="text-3xl font-bold mt-1">
                {liveMetrics.injuryRisk}%
              </p>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              liveMetrics.injuryRisk < 30 ? 'bg-green-500/20 text-green-400' :
              liveMetrics.injuryRisk < 60 ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-red-500/20 text-red-400'
            }`}>
              {liveMetrics.injuryRisk < 30 ? 'Low' :
               liveMetrics.injuryRisk < 60 ? 'Medium' : 'High'}
            </div>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#4facfe] to-[#00f2fe] transition-all duration-500"
              style={{ width: `${100 - liveMetrics.injuryRisk}%` }}
            />
          </div>
        </Card>

        {/* Form Quality Card */}
        <Card className="bg-[#1a1a1a] border-gray-800 p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-gray-400 text-sm">Form Quality</p>
              <p className="text-3xl font-bold mt-1">
                {liveMetrics.formScore}
              </p>
            </div>
            <div className="text-2xl">
              {liveMetrics.formScore > 90 ? '🔥' :
               liveMetrics.formScore > 70 ? '✨' : '⚠️'}
            </div>
          </div>
          <div className="flex gap-1">
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-8 rounded ${
                  i < Math.floor(liveMetrics.formScore / 10)
                    ? 'bg-gradient-to-t from-[#667eea] to-[#764ba2]'
                    : 'bg-gray-800'
                }`}
              />
            ))}
          </div>
        </Card>

        {/* Weekly Workouts */}
        <Card className="bg-[#1a1a1a] border-gray-800 p-6">
          <p className="text-gray-400 text-sm mb-2">Weekly Workouts</p>
          <p className="text-3xl font-bold">{profile.fitness.weeklyWorkouts}</p>
          <p className="text-sm text-gray-500 mt-2">Target: 5 sessions</p>
        </Card>

        {/* Sleep Quality */}
        <Card className="bg-[#1a1a1a] border-gray-800 p-6">
          <p className="text-gray-400 text-sm mb-2">Sleep Quality</p>
          <p className="text-3xl font-bold">{profile.sleep.averageHours}h</p>
          <div className="flex gap-1 mt-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                className={star <= profile.sleep.quality ? 'text-yellow-400' : 'text-gray-600'}
              >
                ★
              </span>
            ))}
          </div>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form Quality Trend */}
        <Card className="bg-[#1a1a1a] border-gray-800 p-6">
          <h3 className="text-lg font-semibold mb-4">Form Quality Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={[
              { day: 'Mon', score: 85 },
              { day: 'Tue', score: 88 },
              { day: 'Wed', score: 82 },
              { day: 'Thu', score: 90 },
              { day: 'Fri', score: 87 },
              { day: 'Sat', score: 92 },
              { day: 'Sun', score: 89 }
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="day" stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                labelStyle={{ color: '#999' }}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#667eea"
                strokeWidth={2}
                dot={{ fill: '#764ba2' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Body Asymmetry Radar */}
        <Card className="bg-[#1a1a1a] border-gray-800 p-6">
          <h3 className="text-lg font-semibold mb-4">Body Symmetry Analysis</h3>
          <ResponsiveContainer width="100%" height={250}>
            <RadarChart data={[
              { metric: 'Shoulders', left: 95, right: 92 },
              { metric: 'Arms', left: 88, right: 90 },
              { metric: 'Core', left: 85, right: 85 },
              { metric: 'Hips', left: 90, right: 88 },
              { metric: 'Legs', left: 92, right: 94 }
            ]}>
              <PolarGrid stroke="#333" />
              <PolarAngleAxis dataKey="metric" stroke="#666" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#666" />
              <Radar name="Left" dataKey="left" stroke="#667eea" fill="#667eea" fillOpacity={0.3} />
              <Radar name="Right" dataKey="right" stroke="#764ba2" fill="#764ba2" fillOpacity={0.3} />
              <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
            </RadarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
```

## Next Steps

1. **Initialize the Project**: Run the setup commands above
2. **Set Up Authentication**: Configure Clerk with your keys
3. **Implement Camera Component**: Start with WebcamCapture.tsx
4. **Add MediaPipe Integration**: Set up pose detection
5. **Create Exercise Analyzers**: Implement rep counters for each exercise
6. **Build API Routes**: Add Gemini integration endpoints
7. **Design UI Components**: Use Shadcn/ui with Tailwind
8. **Configure PWA**: Set up next-pwa for mobile access
9. **Deploy to Vercel**: Connect GitHub repo and deploy

## Testing Checklist

- [ ] Camera permissions work on mobile browsers
- [ ] MediaPipe loads and detects poses correctly
- [ ] Rep counting is accurate for different exercises
- [ ] Form feedback is real-time and helpful
- [ ] Gemini API integration provides meaningful insights
- [ ] Dashboard displays data correctly
- [ ] Mobile navigation is smooth
- [ ] PWA installs correctly on devices
- [ ] MongoDB connection is stable
- [ ] Authentication flow works properly