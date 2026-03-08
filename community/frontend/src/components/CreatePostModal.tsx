"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X, Send } from "lucide-react";

const TAGS = [
  "nutrition",
  "fitness",
  "skincare",
  "mental-health",
  "healthy-eating",
  "recipes",
  "motivation",
  "support",
];

interface CreatePostModalProps {
  userId: string;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreatePostModal({ userId, onClose, onCreated }: CreatePostModalProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setError("Please fill in both title and body");
      return;
    }
    if (selectedTags.length === 0) {
      setError("Please select at least one tag");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          displayName: "You",
          title: title.trim(),
          body: body.trim(),
          tags: selectedTags,
        }),
      });

      if (res.ok) {
        onCreated();
        onClose();
      } else {
        setError("Failed to create post. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-doom-surface rounded-2xl border border-doom-primary/20 w-full max-w-lg shadow-2xl shadow-black/40"
      >
        <div className="flex items-center justify-between p-5 border-b border-doom-primary/10">
          <h2 className="text-xl font-bold text-doom-text">Share with the Community</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-doom-muted hover:text-doom-text hover:bg-doom-bg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's on your mind?"
              className="w-full px-4 py-3 bg-doom-bg border border-doom-primary/15 rounded-lg text-doom-text placeholder:text-doom-muted/40 focus:outline-none focus:border-doom-primary/50 transition-colors text-lg"
              maxLength={120}
            />
          </div>

          <div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Share your experience, ask a question, or offer support..."
              rows={4}
              className="w-full px-4 py-3 bg-doom-bg border border-doom-primary/15 rounded-lg text-doom-text placeholder:text-doom-muted/40 focus:outline-none focus:border-doom-primary/50 transition-colors resize-none text-sm leading-relaxed"
            />
          </div>

          <div>
            <p className="text-xs text-doom-muted mb-2 uppercase tracking-wider">Topics</p>
            <div className="flex flex-wrap gap-2">
              {TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    selectedTags.includes(tag)
                      ? "bg-doom-primary/20 text-doom-primary border-doom-primary/40"
                      : "bg-doom-bg text-doom-muted border-doom-primary/10 hover:border-doom-primary/30"
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-doom-secondary">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-doom-primary text-doom-bg font-semibold rounded-lg hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            {submitting ? "Posting..." : "Post"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
