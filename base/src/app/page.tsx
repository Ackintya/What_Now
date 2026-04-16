"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  ArrowRight,
  Dumbbell,
  Droplets,
  Scissors,
  UtensilsCrossed,
  Users2,
  LogOut,
  User,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Manrope, Space_Grotesk } from "next/font/google";
import { Navigation } from "@/components/Navigation";
import "./home.css";

const headingFont = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "700"],
});

const bodyFont = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

type FeatureScreen = {
  id: string;
  label: string;
  title: string;
  description: string;
  bullets: string[];
  mediaType: "image" | "video";
  mediaSrc: string;
  mediaAlt: string;
  icon: LucideIcon;
  ctaHref: string;
  ctaLabel: string;
};

const featureScreens: FeatureScreen[] = [
  {
    id: "fitness",
    label: "Fitness Coach",
    title: "Real-time coaching that sees your form",
    description:
      "Your camera becomes a personal trainer. Every rep is counted, every angle is tracked, and instant cues keep your form sharp.",
    bullets: [
      "Bicep curls & lateral raises with live joint-angle overlays",
      "Red/green skeleton feedback — fix form before bad habits set in",
      "Voice coaching with rep counts, posture alerts & encouragement",
    ],
    mediaType: "image",
    mediaSrc: "/assets/workout-bicep curl.jpg",
    mediaAlt: "Workout coaching interface preview",
    icon: Dumbbell,
    ctaHref: "/fitness",
    ctaLabel: "Start Training",
  },
  {
    id: "nutrition",
    label: "Nutrition",
    title: "Meals built around how hard you trained",
    description:
      "Log what's in your pantry, get high-protein recipes tailored to your workout intensity. No guesswork, no generic plans.",
    bullets: [
      "AI meal generation from your actual pantry ingredients",
      "Protein targets adjust based on recent workout load",
      "Scan restaurant menus and rank dishes by recovery value",
    ],
    mediaType: "video",
    mediaSrc: "/assets/nutrition.mp4",
    mediaAlt: "Nutrition feature walkthrough",
    icon: UtensilsCrossed,
    ctaHref: "http://localhost:3003",
    ctaLabel: "Explore Nutrition",
  },
  {
    id: "skin",
    label: "Skin Analysis",
    title: "Your skin reflects everything — now track it",
    description:
      "A selfie-based analysis that connects skin condition to workout stress, sleep, and nutrition. See what's actually causing flare-ups.",
    bullets: [
      "Acne, dark circles, oiliness & texture scored from a photo",
      "Timeline view linking skin state to lifestyle changes",
      "Product recommendations matched to your ingredient sensitivities",
    ],
    mediaType: "video",
    mediaSrc: "/assets/skincare.mp4",
    mediaAlt: "Skin analysis feature walkthrough",
    icon: Droplets,
    ctaHref: "http://localhost:3002",
    ctaLabel: "Analyse Your Skin",
  },
  {
    id: "hair",
    label: "Hair Analysis",
    title: "Hair health you can actually measure over time",
    description:
      "Track density, scalp health, and hair quality across weeks. Correlate changes with nutrition gaps and recovery patterns.",
    bullets: [
      "Density, scalp health & damage scored from photos",
      "Nutritional deficiency indicators (protein, biotin, iron)",
      "Before/after comparisons with improvement percentages",
    ],
    mediaType: "image",
    mediaSrc: "/assets/haircare.jpg",
    mediaAlt: "Haircare analysis preview",
    icon: Scissors,
    ctaHref: "http://localhost:3002",
    ctaLabel: "Analyse Your Hair",
  },
  {
    id: "restaurants",
    label: "Find Restaurants",
    title: "Discover healthy dining options near you",
    description:
      "Search for health-focused restaurants, scan meals for nutritional info, and get AI-powered health scores for every dish.",
    bullets: [
      "Find restaurants by location, cuisine, and health focus",
      "AI health scoring for restaurant menus and categories",
      "Scan food photos for instant nutritional breakdown",
    ],
    mediaType: "video",
    mediaSrc: "/assets/restaurant.mp4",
    mediaAlt: "Restaurant finder feature walkthrough",
    icon: UtensilsCrossed,
    ctaHref: "http://localhost:3004",
    ctaLabel: "Find Restaurants",
  },
  {
    id: "community",
    label: "Community",
    title: "Connect with people on the same wellness journey",
    description:
      "Share progress, join wellness events, find people like you, and stay motivated together.",
    bullets: [
      "Post updates, tips, and milestones with the community",
      "Mood check-ins and daily wellness tracking",
      "Find people with similar fitness and health goals",
    ],
    mediaType: "image",
    mediaSrc: "/assets/workout.jpg",
    mediaAlt: "Community feature",
    icon: Users2,
    ctaHref: "http://localhost:3006",
    ctaLabel: "Join Community",
  },
];

interface AuthUser {
  userId: string;
  email: string;
  name: string;
}

export default function Home() {
  const [urls, setUrls] = useState({
    nutrition: "http://localhost:3003",
    yelp: "http://localhost:3004",
    skin: "http://localhost:3002",
    community: "http://localhost:3006"
  });

  const [activeIndex, setActiveIndex] = useState(0);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/config', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => setUrls(prev => ({...prev, ...data})))
      .catch(console.error);
  }, []);

  // Check if user is logged in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/me");
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        }
      } catch (err) {
        console.error("Auth check failed:", err);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const endpoint = authMode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body = authMode === "login"
        ? { email: formData.email, password: formData.password }
        : formData;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok) {
        setUser(data.user);
        setFormData({ email: "", password: "", name: "" });
      } else {
        setError(data.error || "Authentication failed");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      // Force full page reload to clear state and show login
      window.location.reload();
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-doom-bg">
        <div className="text-doom-primary text-xl">Loading...</div>
      </div>
    );
  }

  // If not logged in, show auth forms
  if (!user) {
    return (
      <>
        <Navigation user={user} />
        <div
          className={`min-h-screen bg-doom-bg flex items-center justify-center px-4 ${bodyFont.className}`}
          style={{ paddingTop: "4rem" }}
        >
          <div className="max-w-md w-full">
            <div className="bg-doom-surface border border-doom-primary/20 rounded-2xl p-8 shadow-2xl">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-doom-primary to-doom-accent rounded-xl mb-4">
                  <User className="w-8 h-8 text-doom-bg" />
                </div>
                <h1 className={`${headingFont.className} text-3xl font-bold text-doom-text mb-2`}>
                  Welcome to WellBeing
                </h1>
                <p className="text-doom-muted">
                  {authMode === "login" ? "Sign in to continue" : "Create your account"}
                </p>
              </div>

              {/* Auth Mode Toggle */}
              <div className="flex gap-2 mb-6 bg-doom-bg rounded-lg p-1">
                <button
                  onClick={() => {
                    setAuthMode("login");
                    setError("");
                  }}
                  className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${authMode === "login"
                      ? "bg-doom-primary text-doom-bg"
                      : "text-doom-muted hover:text-doom-text"
                    }`}
                >
                  Login
                </button>
                <button
                  onClick={() => {
                    setAuthMode("register");
                    setError("");
                  }}
                  className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${authMode === "register"
                      ? "bg-doom-primary text-doom-bg"
                      : "text-doom-muted hover:text-doom-text"
                    }`}
                >
                  Register
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {authMode === "register" && (
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-doom-text mb-2">
                      Name
                    </label>
                    <input
                      id="name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 bg-doom-bg border border-doom-primary/20 rounded-lg text-doom-text placeholder-doom-muted focus:outline-none focus:border-doom-primary transition-colors"
                      placeholder="Enter your name"
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-doom-text mb-2">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 bg-doom-bg border border-doom-primary/20 rounded-lg text-doom-text placeholder-doom-muted focus:outline-none focus:border-doom-primary transition-colors"
                    placeholder="Enter your email"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-doom-text mb-2">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-3 bg-doom-bg border border-doom-primary/20 rounded-lg text-doom-text placeholder-doom-muted focus:outline-none focus:border-doom-primary transition-colors"
                    placeholder="Enter your password"
                    minLength={6}
                  />
                  {authMode === "register" && (
                    <p className="text-xs text-doom-muted mt-1">Minimum 6 characters</p>
                  )}
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 px-4 bg-doom-primary text-doom-bg font-semibold rounded-lg hover:bg-doom-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Please wait..." : authMode === "login" ? "Sign In" : "Create Account"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </>
    );
  }

  // If logged in, show feature carousel
  return (
    <>
      <Navigation user={user} />
      <div
        className={`home-slider ${bodyFont.className}`}
        style={{ height: "calc(100vh - 4rem)", top: "4rem" }}
      >
        {featureScreens.map((screen, i) => {
          const Icon = screen.icon;
          const offset = i - activeIndex;
          return (
            <div
              key={screen.id}
              className="home-slide"
              style={{ transform: `translateX(${offset * 100}%)` }}
              aria-hidden={i !== activeIndex}
            >
              {/* Full-bleed background */}
              {screen.mediaType === "video" ? (
                <video
                  src={screen.mediaSrc}
                  className="home-slide-bg"
                  autoPlay
                  muted
                  loop
                  playsInline
                />
              ) : (
                <img
                  src={screen.mediaSrc}
                  alt={screen.mediaAlt}
                  className="home-slide-bg"
                />
              )}

              {/* Dark gradient overlay — darker on left for text readability */}
              <div className="home-slide-overlay" />

              {/* Text content */}
              <div className="home-slide-content">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-doom-primary/40 bg-black/40 px-4 py-1.5 text-lg font-semibold uppercase tracking-widest text-doom-primary backdrop-blur-sm">
                  <Icon className="h-4 w-4" />
                  {screen.label}
                </div>

                <h2
                  className={`${headingFont.className} max-w-xl text-4xl font-bold leading-[1.1] text-white sm:text-5xl lg:text-6xl`}
                >
                  {screen.title}
                </h2>

                <p className="mt-5 max-w-md text-base text-white/70 sm:text-lg">
                  {screen.description}
                </p>

                <ul className="mt-6 space-y-2.5">
                  {screen.bullets.map((point) => (
                    <li
                      key={point}
                      className="flex items-start gap-3 text-sm text-white/80 sm:text-base"
                    >
                      <span className="mt-[0.4rem] h-1.5 w-1.5 shrink-0 rounded-full bg-doom-primary" />
                      {point}
                    </li>
                  ))}
                </ul>

                <a
                  href={
                    screen.id === 'fitness' ? '/fitness' : 
                    screen.id === 'nutrition' ? `/api/sso?target=${encodeURIComponent(urls.nutrition)}` :
                    screen.id === 'skin' || screen.id === 'hair' ? `/api/sso?target=${encodeURIComponent(urls.skin)}` :
                    screen.id === 'restaurants' ? `/api/sso?target=${encodeURIComponent(urls.yelp)}` :
                    screen.id === 'community' ? `/api/sso?target=${encodeURIComponent(urls.community)}` : screen.ctaHref
                  }
                  className="mt-8 inline-flex items-center gap-2 rounded-xl bg-doom-primary px-6 py-3 font-semibold text-doom-bg transition-transform hover:-translate-y-0.5"
                >
                  {screen.ctaLabel}
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          );
        })}

        {/* Numbered circle buttons — bottom right */}
        <div className="home-nav-circles">
          {featureScreens.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={`home-nav-circle ${i === activeIndex ? "home-nav-circle--active" : ""}`}
              aria-label={`Go to screen ${i + 1}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
