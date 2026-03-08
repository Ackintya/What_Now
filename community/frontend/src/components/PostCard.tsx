"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowBigUp, MessageCircle, Clock, User, UserPlus, UserCheck } from "lucide-react";

export interface Post {
  _id: string;
  userId: string;
  displayName: string;
  title: string;
  body: string;
  tags: string[];
  upvotes: number;
  upvotedBy: string[];
  commentCount: number;
  createdAt: string;
}

interface Comment {
  _id: string;
  postId: string;
  userId: string;
  displayName: string;
  body: string;
  createdAt: string;
}

const TAG_COLORS: Record<string, string> = {
  nutrition: "bg-green-500/20 text-green-400 border-green-500/30",
  fitness: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  skincare: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  "mental-health": "bg-purple-500/20 text-purple-400 border-purple-500/30",
  "healthy-eating": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  recipes: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  motivation: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  support: "bg-red-500/20 text-red-400 border-red-500/30",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

interface PostCardProps {
  post: Post;
  currentUserId: string;
  index: number;
  onUpvote: (postId: string) => void;
  isConnected: boolean;
  onToggleConnect: (userId: string, displayName: string) => void;
}

export default function PostCard({ post, currentUserId, index, onUpvote, isConnected, onToggleConnect }: PostCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [localCommentCount, setLocalCommentCount] = useState(post.commentCount);

  const isUpvoted = post.upvotedBy?.includes(currentUserId);

  async function toggleComments() {
    if (showComments) {
      setShowComments(false);
      return;
    }
    setShowComments(true);
    setLoadingComments(true);
    try {
      const res = await fetch(`/api/comments?postId=${post._id}`);
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch {
      // silently fail
    }
    setLoadingComments(false);
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim() || submittingComment) return;

    setSubmittingComment(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: post._id,
          userId: currentUserId,
          displayName: "You",
          body: commentText.trim(),
        }),
      });
      if (res.ok) {
        const newComment = await res.json();
        setComments((prev) => [...prev, newComment]);
        setLocalCommentCount((c) => c + 1);
        setCommentText("");
      }
    } catch {
      // silently fail
    }
    setSubmittingComment(false);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-doom-surface rounded-xl border border-doom-primary/10 hover:border-doom-primary/25 transition-colors overflow-hidden"
    >
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Upvote column */}
          <div className="flex flex-col items-center gap-1 pt-1">
            <button
              onClick={() => onUpvote(post._id)}
              className={`p-1.5 rounded-lg transition-all ${
                isUpvoted
                  ? "bg-doom-primary/20 text-doom-primary"
                  : "text-doom-muted hover:text-doom-primary hover:bg-doom-primary/10"
              }`}
            >
              <ArrowBigUp className={`w-6 h-6 ${isUpvoted ? "fill-current" : ""}`} />
            </button>
            <span className={`text-sm font-bold ${isUpvoted ? "text-doom-primary" : "text-doom-muted"}`}>
              {post.upvotes}
            </span>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-doom-primary/20 flex items-center justify-center">
                <User className="w-4 h-4 text-doom-primary" />
              </div>
              <span className="text-sm text-doom-muted">{post.displayName}</span>
              {post.userId !== currentUserId && (
                <button
                  onClick={() => onToggleConnect(post.userId, post.displayName)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border transition-all ${
                    isConnected
                      ? "bg-doom-accent/15 text-doom-accent border-doom-accent/30 hover:bg-doom-accent/25"
                      : "bg-doom-primary/10 text-doom-primary border-doom-primary/20 hover:bg-doom-primary/20"
                  }`}
                >
                  {isConnected ? (
                    <><UserCheck className="w-3 h-3" /> Connected</>
                  ) : (
                    <><UserPlus className="w-3 h-3" /> Connect</>
                  )}
                </button>
              )}
              <span className="text-doom-muted/40">·</span>
              <span className="text-xs text-doom-muted/60 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {timeAgo(post.createdAt)}
              </span>
            </div>

            <h3 className="text-lg font-semibold text-doom-text mb-2">{post.title}</h3>
            <p className="text-doom-text/80 text-sm leading-relaxed mb-3 whitespace-pre-wrap">{post.body}</p>

            {post.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                      TAG_COLORS[tag] || "bg-doom-primary/10 text-doom-primary border-doom-primary/20"
                    }`}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <button
              onClick={toggleComments}
              className="flex items-center gap-1.5 text-sm text-doom-muted hover:text-doom-accent transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              {localCommentCount} {localCommentCount === 1 ? "comment" : "comments"}
            </button>
          </div>
        </div>
      </div>

      {/* Comments section */}
      {showComments && (
        <div className="border-t border-doom-primary/10 bg-doom-bg/50 p-4">
          {loadingComments ? (
            <p className="text-sm text-doom-muted text-center py-4">Loading comments...</p>
          ) : comments.length === 0 ? (
            <p className="text-sm text-doom-muted text-center py-3">No comments yet. Be the first!</p>
          ) : (
            <div className="space-y-3 mb-4">
              {comments.map((c) => (
                <div key={c._id} className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-doom-accent/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User className="w-3 h-3 text-doom-accent" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-doom-text">{c.displayName}</span>
                      <span className="text-xs text-doom-muted/50">{timeAgo(c.createdAt)}</span>
                    </div>
                    <p className="text-sm text-doom-text/75 mt-0.5">{c.body}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={submitComment} className="flex gap-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a supportive comment..."
              className="flex-1 px-3 py-2 bg-doom-surface border border-doom-primary/15 rounded-lg text-sm text-doom-text placeholder:text-doom-muted/40 focus:outline-none focus:border-doom-primary/40 transition-colors"
            />
            <button
              type="submit"
              disabled={!commentText.trim() || submittingComment}
              className="px-4 py-2 bg-doom-primary text-doom-bg text-sm font-semibold rounded-lg hover:scale-105 transition-transform disabled:opacity-40 disabled:hover:scale-100"
            >
              Reply
            </button>
          </form>
        </div>
      )}
    </motion.div>
  );
}
