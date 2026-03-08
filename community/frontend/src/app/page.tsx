"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, TrendingUp, Clock, Filter, Users, Heart, MessageCircle, ArrowBigUp, Calendar, Smile, X } from "lucide-react";
import PostCard, { type Post } from "@/components/PostCard";
import CreatePostModal from "@/components/CreatePostModal";
import PeopleLikeYou from "@/components/PeopleLikeYou";
import EventsCalendar from "@/components/EventsCalendar";
import MoodCheckin from "@/components/MoodCheckin";

const USER_ID = "demo-user";

const FILTER_TAGS = [
  { value: "", label: "All Topics" },
  { value: "nutrition", label: "Nutrition" },
  { value: "fitness", label: "Fitness" },
  { value: "skincare", label: "Skincare" },
  { value: "mental-health", label: "Mental Health" },
  { value: "healthy-eating", label: "Healthy Eating" },
  { value: "recipes", label: "Recipes" },
  { value: "motivation", label: "Motivation" },
  { value: "support", label: "Support" },
];

type Tab = "discussion" | "events" | "mood";

export default function CommunityPage() {
  const [activeTab, setActiveTab] = useState<Tab>("discussion");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"recent" | "popular">("recent");
  const [filterTag, setFilterTag] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [connectedIds, setConnectedIds] = useState<Set<string>>(new Set());
  const [filterByUserId, setFilterByUserId] = useState<string | null>(null);
  const [filterByDisplayName, setFilterByDisplayName] = useState<string | null>(null);

  useEffect(() => {
    loadPosts();
  }, [sortBy, filterTag]);

  useEffect(() => {
    loadConnections();
  }, []);

  async function loadPosts() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ sort: sortBy });
      if (filterTag) params.set("tag", filterTag);
      const res = await fetch(`/api/posts?${params.toString()}`);
      if (res.ok) {
        setPosts(await res.json());
      }
    } catch {
      // silently fail
    }
    setLoading(false);
  }

  async function loadConnections() {
    try {
      const res = await fetch(`/api/connections?userId=${USER_ID}`);
      if (res.ok) {
        const data = await res.json();
        setConnectedIds(new Set(data.connectedIds));
      }
    } catch {
      // silently fail
    }
  }

  async function toggleConnect(toUserId: string, toDisplayName: string) {
    const wasConnected = connectedIds.has(toUserId);
    setConnectedIds((prev) => {
      const next = new Set(prev);
      if (wasConnected) next.delete(toUserId);
      else next.add(toUserId);
      return next;
    });

    try {
      const res = await fetch("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromUserId: USER_ID, toUserId, toDisplayName }),
      });
      if (!res.ok) {
        setConnectedIds((prev) => {
          const next = new Set(prev);
          if (wasConnected) next.add(toUserId);
          else next.delete(toUserId);
          return next;
        });
      }
    } catch {
      setConnectedIds((prev) => {
        const next = new Set(prev);
        if (wasConnected) next.add(toUserId);
        else next.delete(toUserId);
        return next;
      });
    }
  }

  async function handleUpvote(postId: string) {
    const post = posts.find((p) => p._id === postId);
    if (!post) return;

    const wasUpvoted = post.upvotedBy?.includes(USER_ID);
    setPosts((prev) =>
      prev.map((p) => {
        if (p._id !== postId) return p;
        return {
          ...p,
          upvotes: p.upvotes + (wasUpvoted ? -1 : 1),
          upvotedBy: wasUpvoted
            ? p.upvotedBy.filter((id) => id !== USER_ID)
            : [...(p.upvotedBy || []), USER_ID],
        };
      })
    );

    try {
      await fetch("/api/posts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, userId: USER_ID, action: "upvote" }),
      });
    } catch {
      setPosts((prev) =>
        prev.map((p) => {
          if (p._id !== postId) return p;
          return {
            ...p,
            upvotes: p.upvotes + (wasUpvoted ? 1 : -1),
            upvotedBy: wasUpvoted
              ? [...(p.upvotedBy || []), USER_ID]
              : p.upvotedBy.filter((id) => id !== USER_ID),
          };
        })
      );
    }
  }

  return (
    <main className="min-h-screen bg-doom-bg">
      {/* Hero */}
      <div className="bg-gradient-doom border-b border-doom-primary/20">
        <div className="max-w-[95%] mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <div className="text-center">
            <div className="inline-flex items-center gap-3 mb-4">
              <Users className="w-8 h-8 text-doom-accent" />
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-doom-text">
                Wellness{" "}
                <span className="bg-gradient-to-r from-doom-accent to-doom-primary bg-clip-text text-transparent">
                  Community
                </span>
              </h1>
            </div>
            <p className="text-doom-muted text-lg max-w-2xl mx-auto">
              Connect with people on similar wellness journeys. Share experiences, ask questions, and support each other.
            </p>

            <div className="flex items-center justify-center gap-6 mt-6 text-sm text-doom-muted">
              <span className="flex items-center gap-1.5">
                <Heart className="w-4 h-4 text-doom-secondary" /> Share & Support
              </span>
              <span className="flex items-center gap-1.5">
                <MessageCircle className="w-4 h-4 text-doom-accent" /> Discuss
              </span>
              <span className="flex items-center gap-1.5">
                <ArrowBigUp className="w-4 h-4 text-doom-primary" /> Upvote
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-[95%] mx-auto px-4 sm:px-6 -mt-5 mb-4">
        <div className="flex gap-2 bg-doom-surface rounded-xl border border-doom-primary/20 p-1.5">
          <button
            onClick={() => setActiveTab("discussion")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "discussion"
                ? "bg-doom-primary text-doom-bg"
                : "text-doom-muted hover:text-doom-text"
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            Discussion
          </button>
          <button
            onClick={() => setActiveTab("events")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "events"
                ? "bg-doom-primary text-doom-bg"
                : "text-doom-muted hover:text-doom-text"
            }`}
          >
            <Calendar className="w-4 h-4" />
            Events
          </button>
          <button
            onClick={() => setActiveTab("mood")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "mood"
                ? "bg-doom-primary text-doom-bg"
                : "text-doom-muted hover:text-doom-text"
            }`}
          >
            <Smile className="w-4 h-4" />
            Mood Check-in
          </button>
        </div>
      </div>

      {/* Events Tab */}
      {activeTab === "events" && (
        <div className="max-w-[95%] mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1 min-w-0">
              <EventsCalendar userId={USER_ID} />
            </div>
            <div className="w-full lg:w-80 flex-shrink-0">
              <div className="lg:sticky lg:top-6">
                <PeopleLikeYou
                userId={USER_ID}
                onSelectUser={(id, name) => {
                  setActiveTab("discussion");
                  setFilterByUserId(id);
                  setFilterByDisplayName(name);
                }}
              />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mood Tab */}
      {activeTab === "mood" && (
        <div className="max-w-[95%] mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1 max-w-2xl mx-auto">
              <MoodCheckin userId={USER_ID} />
            </div>
          </div>
        </div>
      )}

      {/* Discussion Tab */}
      {activeTab === "discussion" && (
      <div className="max-w-[95%] mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Feed */}
          <div className="flex-1 min-w-0">
            {/* Controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSortBy("recent")}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    sortBy === "recent"
                      ? "bg-doom-primary/15 text-doom-primary border border-doom-primary/30"
                      : "text-doom-muted hover:text-doom-text border border-transparent"
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  Recent
                </button>
                <button
                  onClick={() => setSortBy("popular")}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    sortBy === "popular"
                      ? "bg-doom-primary/15 text-doom-primary border border-doom-primary/30"
                      : "text-doom-muted hover:text-doom-text border border-transparent"
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  Popular
                </button>

                <div className="relative ml-2">
                  <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-doom-muted pointer-events-none" />
                  <select
                    value={filterTag}
                    onChange={(e) => setFilterTag(e.target.value)}
                    className="pl-8 pr-3 py-2 bg-doom-surface border border-doom-primary/15 rounded-lg text-sm text-doom-text focus:outline-none focus:border-doom-primary/40 transition-colors appearance-none cursor-pointer"
                  >
                    {FILTER_TAGS.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={() => setShowCreateModal(true)}
                className="px-5 py-2.5 bg-doom-primary text-doom-bg font-semibold rounded-lg hover:scale-105 transition-transform flex items-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" />
                New Post
              </button>
            </div>

            {filterByUserId && (
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm text-doom-muted">
                  Showing posts by <strong className="text-doom-text">{filterByDisplayName ?? "this user"}</strong>
                </span>
                <button
                  onClick={() => { setFilterByUserId(null); setFilterByDisplayName(null); }}
                  className="p-1.5 rounded-lg text-doom-muted hover:text-doom-text hover:bg-doom-bg transition-colors"
                  aria-label="Clear filter"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Posts */}
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-doom-surface rounded-xl border border-doom-primary/10 p-5 animate-pulse">
                    <div className="flex gap-4">
                      <div className="w-10 space-y-2">
                        <div className="h-8 w-8 rounded-lg bg-doom-bg" />
                        <div className="h-4 w-6 rounded bg-doom-bg mx-auto" />
                      </div>
                      <div className="flex-1 space-y-3">
                        <div className="h-4 bg-doom-bg rounded w-1/4" />
                        <div className="h-5 bg-doom-bg rounded w-3/4" />
                        <div className="h-4 bg-doom-bg rounded w-full" />
                        <div className="h-4 bg-doom-bg rounded w-2/3" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (() => {
              const displayPosts = filterByUserId
                ? posts.filter((p) => p.userId === filterByUserId)
                : posts;
              return displayPosts.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16"
              >
                <Users className="w-14 h-14 text-doom-muted/25 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-doom-text mb-2">
                  {filterByUserId
                    ? `No posts by ${filterByDisplayName ?? "this user"} yet`
                    : filterTag
                    ? "No posts with this topic yet"
                    : "Be the first to post!"}
                </h3>
                <p className="text-doom-muted mb-6 max-w-md mx-auto">
                  {filterByUserId
                    ? "They haven't shared anything yet. Check back later or browse all posts."
                    : "Share your wellness journey, ask a question, or offer encouragement to others."}
                </p>
                {filterByUserId ? (
                  <button
                    onClick={() => { setFilterByUserId(null); setFilterByDisplayName(null); }}
                    className="px-6 py-3 bg-doom-surface border border-doom-primary/20 text-doom-primary font-semibold rounded-lg hover:scale-105 transition-transform"
                  >
                    View all posts
                  </button>
                ) : (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-6 py-3 bg-doom-primary text-doom-bg font-semibold rounded-lg hover:scale-105 transition-transform inline-flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Create First Post
                  </button>
                )}
              </motion.div>
            ) : (
              <div className="space-y-4">
                {displayPosts.map((post, index) => (
                  <PostCard
                    key={post._id}
                    post={post}
                    currentUserId={USER_ID}
                    index={index}
                    onUpvote={handleUpvote}
                    isConnected={connectedIds.has(post.userId)}
                    onToggleConnect={toggleConnect}
                  />
                ))}
              </div>
            );
            })()}
          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-80 flex-shrink-0">
            <div className="lg:sticky lg:top-6">
              <PeopleLikeYou
                userId={USER_ID}
                onSelectUser={(id, name) => {
                  setActiveTab("discussion");
                  setFilterByUserId(id);
                  setFilterByDisplayName(name);
                }}
              />
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Create Post Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreatePostModal
            userId={USER_ID}
            onClose={() => setShowCreateModal(false)}
            onCreated={loadPosts}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
