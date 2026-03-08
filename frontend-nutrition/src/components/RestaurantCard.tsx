"use client";

import { motion } from "framer-motion";
import { Star, MapPin, Phone, ExternalLink } from "lucide-react";

export interface Restaurant {
  id: string;
  name: string;
  image_url: string;
  url: string;
  rating: number;
  review_count: number;
  price: string | null;
  phone: string;
  categories: { alias: string; title: string }[];
  location: {
    address1: string;
    city: string;
    state: string;
    zip_code: string;
    display_address: string[];
  };
  is_closed: boolean;
  distance: number;
}

export interface HealthScore {
  score: number;
  reasoning: string;
  tags: string[];
}

interface RestaurantCardProps {
  restaurant: Restaurant;
  healthScore?: HealthScore;
  index: number;
}

function getScoreColor(score: number): string {
  if (score >= 8) return "text-green-400 border-green-400/50 bg-green-400/10";
  if (score >= 6) return "text-doom-primary border-doom-primary/50 bg-doom-primary/10";
  if (score >= 4) return "text-yellow-400 border-yellow-400/50 bg-yellow-400/10";
  return "text-doom-secondary border-doom-secondary/50 bg-doom-secondary/10";
}

function renderStars(rating: number) {
  const stars = [];
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;

  for (let i = 0; i < full; i++) {
    stars.push(
      <Star key={`full-${i}`} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
    );
  }
  if (half) {
    stars.push(
      <Star key="half" className="w-4 h-4 fill-yellow-400/50 text-yellow-400" />
    );
  }
  const remaining = 5 - full - (half ? 1 : 0);
  for (let i = 0; i < remaining; i++) {
    stars.push(
      <Star key={`empty-${i}`} className="w-4 h-4 text-doom-muted/30" />
    );
  }
  return stars;
}

export function RestaurantCard({ restaurant, healthScore, index }: RestaurantCardProps) {
  const address = restaurant.location.display_address?.join(", ") || "";
  const distanceMiles = restaurant.distance
    ? (restaurant.distance / 1609.34).toFixed(1)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="group rounded-xl bg-doom-surface border border-doom-primary/20 hover:border-doom-primary/40 transition-all overflow-hidden"
    >
      {/* Image */}
      <div className="relative h-48 overflow-hidden">
        {restaurant.image_url ? (
          <img
            src={restaurant.image_url}
            alt={restaurant.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-doom-bg flex items-center justify-center">
            <span className="text-doom-muted text-sm">No image available</span>
          </div>
        )}

        {/* Health Score Badge */}
        {healthScore && (
          <div
            className={`absolute top-3 right-3 px-3 py-1.5 rounded-lg border font-bold text-sm backdrop-blur-sm ${getScoreColor(healthScore.score)}`}
          >
            {healthScore.score}/10
          </div>
        )}

        {/* Price Badge */}
        {restaurant.price && (
          <div className="absolute top-3 left-3 px-2 py-1 rounded-md bg-doom-bg/80 backdrop-blur-sm text-doom-text text-sm font-medium">
            {restaurant.price}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Name + Rating */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-lg font-semibold text-doom-text group-hover:text-doom-primary transition-colors line-clamp-1">
            {restaurant.name}
          </h3>
          {!restaurant.is_closed ? (
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-400/10 text-green-400 border border-green-400/30 whitespace-nowrap">
              Open
            </span>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded-full bg-doom-secondary/10 text-doom-secondary border border-doom-secondary/30 whitespace-nowrap">
              Closed
            </span>
          )}
        </div>

        {/* Stars + Review Count */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-0.5">{renderStars(restaurant.rating)}</div>
          <span className="text-sm text-doom-muted">
            {restaurant.rating} ({restaurant.review_count})
          </span>
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {restaurant.categories.map((cat) => (
            <span
              key={cat.alias}
              className="text-xs px-2 py-0.5 rounded-full bg-doom-accent/10 text-doom-accent border border-doom-accent/20"
            >
              {cat.title}
            </span>
          ))}
        </div>

        {/* Health Tags */}
        {healthScore && healthScore.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {healthScore.tags.map((tag) => (
              <span
                key={tag}
                className={`text-xs px-2 py-0.5 rounded-full border ${getScoreColor(healthScore.score)}`}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Health Reasoning */}
        {healthScore && (
          <p className="text-xs text-doom-muted mb-3 italic">
            {healthScore.reasoning}
          </p>
        )}

        {/* Address + Distance */}
        <div className="flex items-start gap-2 text-sm text-doom-muted mb-2">
          <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
          <span className="line-clamp-2">
            {address}
            {distanceMiles && ` (${distanceMiles} mi)`}
          </span>
        </div>

        {/* Phone */}
        {restaurant.phone && (
          <div className="flex items-center gap-2 text-sm text-doom-muted mb-3">
            <Phone className="w-4 h-4 shrink-0" />
            <span>{restaurant.phone}</span>
          </div>
        )}

        {/* View on Yelp link */}
        <a
          href={restaurant.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-doom-primary hover:text-doom-accent transition-colors"
        >
          View on Yelp
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </motion.div>
  );
}
