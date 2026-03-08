"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  Dumbbell,
  Droplets,
  Scissors,
  UtensilsCrossed,
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
    ctaHref: "/nutrition",
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
    ctaHref: "/skin",
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
    ctaHref: "/hair",
    ctaLabel: "Analyse Your Hair",
  },
];

export default function Home() {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <>
      <Navigation />
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

                <Link
                  href={screen.ctaHref}
                  className="mt-8 inline-flex items-center gap-2 rounded-xl bg-doom-primary px-6 py-3 font-semibold text-doom-bg transition-transform hover:-translate-y-0.5"
                >
                  {screen.ctaLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
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
