"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Smile, TrendingUp } from "lucide-react";

const MOODS = [
  { rating: 1, emoji: "😔", label: "Struggling" },
  { rating: 2, emoji: "😕", label: "Not great" },
  { rating: 3, emoji: "😊", label: "Okay" },
  { rating: 4, emoji: "😄", label: "Good" },
  { rating: 5, emoji: "🤩", label: "Amazing" },
];

interface MoodData {
  userMood: { rating: number; note: string } | null;
  community: {
    avgMood: number;
    totalCheckins: number;
    distribution: Record<number, number>;
  };
  history: { date: string; rating: number }[];
}

interface MoodCheckinProps {
  userId: string;
}

export default function MoodCheckin({ userId }: MoodCheckinProps) {
  const [data, setData] = useState<MoodData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);

  useEffect(() => {
    loadMood();
  }, []);

  async function loadMood() {
    try {
      const res = await fetch(`/api/mood?userId=${userId}`);
      if (res.ok) {
        const d = await res.json();
        setData(d);
        if (d.userMood) {
          setSelectedRating(d.userMood.rating);
          setNote(d.userMood.note || "");
        }
      }
    } catch { /* silently fail */ }
    setLoading(false);
  }

  async function submitMood() {
    if (!selectedRating || submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/mood", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, rating: selectedRating, note }),
      });
      if (res.ok) {
        setJustSubmitted(true);
        loadMood();
        setTimeout(() => setJustSubmitted(false), 3000);
      }
    } catch { /* silently fail */ }
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="bg-doom-surface rounded-xl border border-doom-primary/10 p-6 animate-pulse">
        <div className="h-6 bg-doom-bg rounded w-1/3 mb-4" />
        <div className="flex gap-4 justify-center mb-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-14 h-14 rounded-xl bg-doom-bg" />
          ))}
        </div>
      </div>
    );
  }

  const communityMoodEmoji = data?.community.avgMood
    ? MOODS[Math.min(Math.round(data.community.avgMood) - 1, 4)]?.emoji || "😊"
    : "😊";

  return (
    <div className="space-y-4">
      {/* Check-in card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-doom-surface rounded-xl border border-doom-primary/10 p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <Smile className="w-5 h-5 text-doom-primary" />
          <h2 className="text-lg font-bold text-doom-text">How are you feeling today?</h2>
        </div>

        <div className="flex gap-3 justify-center mb-4">
          {MOODS.map((mood) => (
            <button
              key={mood.rating}
              onClick={() => setSelectedRating(mood.rating)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all ${
                selectedRating === mood.rating
                  ? "bg-doom-primary/15 border-2 border-doom-primary/50 scale-110"
                  : "bg-doom-bg border-2 border-transparent hover:border-doom-primary/20 hover:scale-105"
              }`}
            >
              <span className="text-3xl">{mood.emoji}</span>
              <span className={`text-xs font-medium ${
                selectedRating === mood.rating ? "text-doom-primary" : "text-doom-muted"
              }`}>
                {mood.label}
              </span>
            </button>
          ))}
        </div>

        {selectedRating && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="space-y-3"
          >
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note (optional) - e.g., 'Had a great workout!'"
              className="w-full px-4 py-2.5 bg-doom-bg border border-doom-primary/15 rounded-lg text-sm text-doom-text placeholder:text-doom-muted/40 focus:outline-none focus:border-doom-primary/40 transition-colors"
              maxLength={120}
            />
            <button
              onClick={submitMood}
              disabled={submitting}
              className="w-full py-2.5 bg-doom-primary text-doom-bg font-semibold rounded-lg hover:scale-[1.02] transition-transform disabled:opacity-50 text-sm"
            >
              {justSubmitted ? "Saved!" : data?.userMood ? "Update Check-in" : "Check In"}
            </button>
          </motion.div>
        )}

        {justSubmitted && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-sm text-doom-primary mt-3"
          >
            Thanks for checking in! Your wellness matters.
          </motion.p>
        )}
      </motion.div>

      {/* Community mood */}
      {data && data.community.totalCheckins > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-doom-accent/5 to-doom-primary/5 rounded-xl border border-doom-accent/15 p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-doom-accent" />
            <h3 className="text-sm font-bold text-doom-accent uppercase tracking-wider">Community Mood</h3>
          </div>

          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="text-4xl">{communityMoodEmoji}</span>
            <div>
              <div className="text-2xl font-bold text-doom-primary">{data.community.avgMood}/5</div>
              <div className="text-xs text-doom-muted">{data.community.totalCheckins} check-in{data.community.totalCheckins !== 1 ? "s" : ""} today</div>
            </div>
          </div>

          {/* Mood distribution bar */}
          <div className="flex gap-1 h-8 rounded-lg overflow-hidden">
            {MOODS.map((mood) => {
              const count = data.community.distribution[mood.rating] || 0;
              const pct = data.community.totalCheckins > 0
                ? (count / data.community.totalCheckins) * 100
                : 0;
              if (pct === 0) return null;
              return (
                <div
                  key={mood.rating}
                  style={{ width: `${pct}%` }}
                  className={`flex items-center justify-center text-xs transition-all ${
                    mood.rating <= 2
                      ? "bg-doom-secondary/30"
                      : mood.rating === 3
                      ? "bg-yellow-500/30"
                      : "bg-doom-primary/30"
                  }`}
                  title={`${mood.label}: ${count}`}
                >
                  {pct > 15 && mood.emoji}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* 7-day history */}
      {data && data.history.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-doom-surface rounded-xl border border-doom-primary/10 p-5"
        >
          <h3 className="text-sm font-bold text-doom-muted uppercase tracking-wider mb-3">Your Week</h3>
          <div className="flex items-end gap-2 justify-center">
            {data.history.reverse().map((day) => (
              <div key={day.date} className="flex flex-col items-center gap-1">
                <span className="text-lg">{MOODS[day.rating - 1]?.emoji}</span>
                <div
                  className="w-8 rounded-t bg-doom-primary/30"
                  style={{ height: `${day.rating * 8}px` }}
                />
                <span className="text-[10px] text-doom-muted">
                  {new Date(day.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "narrow" })}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
