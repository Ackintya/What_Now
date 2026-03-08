"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, MapPin, Clock, Users, Plus, Check } from "lucide-react";

interface WellnessEvent {
  _id: string;
  userId: string;
  displayName: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  category: string;
  attendees: string[];
  attendeeNames: string[];
}

const CATEGORY_COLORS: Record<string, string> = {
  fitness: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  nutrition: "bg-green-500/20 text-green-400 border-green-500/30",
  mindfulness: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  social: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  outdoors: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  general: "bg-doom-primary/10 text-doom-primary border-doom-primary/20",
};

const EVENT_CATEGORIES = [
  { value: "fitness", label: "Fitness" },
  { value: "nutrition", label: "Nutrition" },
  { value: "mindfulness", label: "Mindfulness" },
  { value: "social", label: "Social" },
  { value: "outdoors", label: "Outdoors" },
  { value: "general", label: "General" },
];

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (dateStr === today.toISOString().split("T")[0]) return "Today";
  if (dateStr === tomorrow.toISOString().split("T")[0]) return "Tomorrow";

  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

interface EventsCalendarProps {
  userId: string;
}

export default function EventsCalendar({ userId }: EventsCalendarProps) {
  const [events, setEvents] = useState<WellnessEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
    time: "10:00",
    location: "",
    category: "general",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    try {
      const res = await fetch("/api/events");
      if (res.ok) setEvents(await res.json());
    } catch { /* silently fail */ }
    setLoading(false);
  }

  async function createEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, userId, displayName: "You" }),
      });
      if (res.ok) {
        setShowCreate(false);
        setForm({ title: "", description: "", date: new Date().toISOString().split("T")[0], time: "10:00", location: "", category: "general" });
        loadEvents();
      }
    } catch { /* silently fail */ }
    setSubmitting(false);
  }

  async function toggleRSVP(eventId: string) {
    const event = events.find((e) => e._id === eventId);
    if (!event) return;

    const wasAttending = event.attendees.includes(userId);
    setEvents((prev) =>
      prev.map((e) => {
        if (e._id !== eventId) return e;
        return {
          ...e,
          attendees: wasAttending
            ? e.attendees.filter((id) => id !== userId)
            : [...e.attendees, userId],
        };
      })
    );

    try {
      await fetch("/api/events", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, userId, displayName: "You" }),
      });
    } catch {
      setEvents((prev) =>
        prev.map((e) => {
          if (e._id !== eventId) return e;
          return {
            ...e,
            attendees: wasAttending
              ? [...e.attendees, userId]
              : e.attendees.filter((id) => id !== userId),
          };
        })
      );
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-doom-accent" />
          <h2 className="text-lg font-bold text-doom-text">Upcoming Wellness Events</h2>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-doom-primary text-doom-bg font-semibold rounded-lg hover:scale-105 transition-transform flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          Create Event
        </button>
      </div>

      {/* Create Event Form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-6"
          >
            <form
              onSubmit={createEvent}
              className="bg-doom-surface rounded-xl border border-doom-primary/15 p-5 space-y-3"
            >
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Event title (e.g., Morning Yoga in the Park)"
                className="w-full px-4 py-3 bg-doom-bg border border-doom-primary/15 rounded-lg text-doom-text placeholder:text-doom-muted/40 focus:outline-none focus:border-doom-primary/50 transition-colors"
                maxLength={100}
              />
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Description (optional)"
                rows={2}
                className="w-full px-4 py-3 bg-doom-bg border border-doom-primary/15 rounded-lg text-doom-text placeholder:text-doom-muted/40 focus:outline-none focus:border-doom-primary/50 transition-colors resize-none text-sm"
              />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="px-3 py-2.5 bg-doom-bg border border-doom-primary/15 rounded-lg text-doom-text text-sm focus:outline-none focus:border-doom-primary/50"
                />
                <input
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                  className="px-3 py-2.5 bg-doom-bg border border-doom-primary/15 rounded-lg text-doom-text text-sm focus:outline-none focus:border-doom-primary/50"
                />
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="Location"
                  className="px-3 py-2.5 bg-doom-bg border border-doom-primary/15 rounded-lg text-doom-text text-sm placeholder:text-doom-muted/40 focus:outline-none focus:border-doom-primary/50"
                />
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="px-3 py-2.5 bg-doom-bg border border-doom-primary/15 rounded-lg text-doom-text text-sm focus:outline-none focus:border-doom-primary/50"
                >
                  {EVENT_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 text-sm text-doom-muted hover:text-doom-text transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!form.title.trim() || submitting}
                  className="px-5 py-2 bg-doom-primary text-doom-bg text-sm font-semibold rounded-lg hover:scale-105 transition-transform disabled:opacity-40 disabled:hover:scale-100"
                >
                  {submitting ? "Creating..." : "Create Event"}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Event List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-doom-surface rounded-xl border border-doom-primary/10 p-4 animate-pulse">
              <div className="flex gap-4">
                <div className="w-16 h-16 rounded-lg bg-doom-bg" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-doom-bg rounded w-2/3" />
                  <div className="h-4 bg-doom-bg rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
          <Calendar className="w-12 h-12 text-doom-muted/25 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-doom-text mb-2">No upcoming events</h3>
          <p className="text-doom-muted text-sm mb-4">Be the first to organize a wellness event!</p>
          <button
            onClick={() => setShowCreate(true)}
            className="px-5 py-2.5 bg-doom-primary text-doom-bg font-semibold rounded-lg hover:scale-105 transition-transform inline-flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" /> Create Event
          </button>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {events.map((event, i) => {
            const isAttending = event.attendees.includes(userId);
            return (
              <motion.div
                key={event._id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-doom-surface rounded-xl border border-doom-primary/10 hover:border-doom-primary/25 transition-colors p-4"
              >
                <div className="flex items-start gap-4">
                  {/* Date badge */}
                  <div className="w-16 h-16 rounded-lg bg-doom-bg border border-doom-primary/10 flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-xs text-doom-muted uppercase">
                      {new Date(event.date + "T12:00:00").toLocaleDateString("en-US", { month: "short" })}
                    </span>
                    <span className="text-xl font-bold text-doom-primary">
                      {new Date(event.date + "T12:00:00").getDate()}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-semibold text-doom-text truncate">{event.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border flex-shrink-0 ${
                        CATEGORY_COLORS[event.category] || CATEGORY_COLORS.general
                      }`}>
                        {event.category}
                      </span>
                    </div>

                    {event.description && (
                      <p className="text-sm text-doom-text/70 mb-2 line-clamp-2">{event.description}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 text-xs text-doom-muted">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(event.date)} at {event.time}
                      </span>
                      {event.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {event.location}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {event.attendees.length} going
                      </span>
                      <span className="text-doom-muted/50">by {event.displayName}</span>
                    </div>
                  </div>

                  {/* RSVP */}
                  <button
                    onClick={() => toggleRSVP(event._id)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 flex-shrink-0 ${
                      isAttending
                        ? "bg-doom-primary/15 text-doom-primary border border-doom-primary/30 hover:bg-doom-primary/25"
                        : "bg-doom-bg text-doom-muted border border-doom-primary/15 hover:text-doom-primary hover:border-doom-primary/30"
                    }`}
                  >
                    {isAttending ? (
                      <><Check className="w-4 h-4" /> Going</>
                    ) : (
                      "RSVP"
                    )}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
