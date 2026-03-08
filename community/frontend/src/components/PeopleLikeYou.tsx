"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, User } from "lucide-react";

interface SimilarPerson {
  userId: string;
  displayName: string;
  sharedInterests: string[];
  postCount: number;
}

interface PeopleData {
  similarPeople: SimilarPerson[];
  aiInsight: string;
}

interface PeopleLikeYouProps {
  userId: string;
  onSelectUser?: (userId: string, displayName: string) => void;
}

export default function PeopleLikeYou({ userId, onSelectUser }: PeopleLikeYouProps) {
  const [data, setData] = useState<PeopleData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/people-like-you?userId=${userId}`);
        if (res.ok) {
          setData(await res.json());
        }
      } catch {
        // silently fail
      }
      setLoading(false);
    }
    load();
  }, [userId]);

  if (loading) {
    return (
      <div className="bg-doom-surface rounded-xl border border-doom-primary/10 p-5">
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-doom-bg rounded w-2/3" />
          <div className="h-4 bg-doom-bg rounded w-full" />
          <div className="h-4 bg-doom-bg rounded w-3/4" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-4"
    >
      {/* AI Insight */}
      {data.aiInsight && (
        <div className="bg-gradient-to-br from-doom-primary/5 to-doom-accent/5 rounded-xl border border-doom-primary/15 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-doom-primary" />
            <h3 className="text-sm font-bold text-doom-primary uppercase tracking-wider">Community Insight</h3>
          </div>
          <p className="text-sm text-doom-text/80 leading-relaxed">{data.aiInsight}</p>
        </div>
      )}

      {/* Similar People */}
      {data.similarPeople.length > 0 && (
        <div className="bg-doom-surface rounded-xl border border-doom-primary/10 p-5">
          <h3 className="text-sm font-bold text-doom-accent uppercase tracking-wider mb-4">
            People Like You
          </h3>
          <div className="space-y-3">
            {data.similarPeople.map((person) => (
              <button
                key={person.userId}
                type="button"
                onClick={() => onSelectUser?.(person.userId, person.displayName)}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-doom-bg/50 transition-colors text-left cursor-pointer border border-transparent hover:border-doom-accent/20"
              >
                <div className="w-8 h-8 rounded-full bg-doom-accent/15 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-doom-accent" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-doom-text truncate">{person.displayName}</p>
                  {person.sharedInterests.length > 0 && (
                    <p className="text-xs text-doom-muted truncate">
                      Shares: {person.sharedInterests.join(", ")}
                    </p>
                  )}
                </div>
                <span className="text-xs text-doom-muted/60 ml-auto flex-shrink-0">
                  {person.postCount} posts · View
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
