"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MapPin, Loader2, Apple, SlidersHorizontal, X, LocateFixed, Camera, UtensilsCrossed, Heart } from "lucide-react";
import { RestaurantCard, type Restaurant, type HealthScore } from "@/components/RestaurantCard";
import { FoodScanner } from "@/components/FoodScanner";

const INSIGHT_INTERVAL_MS = 10 * 60 * 1000;

const CATEGORY_OPTIONS = [
  { value: "", label: "All Restaurants" },
  { value: "__liked", label: "Liked Restaurants \u2764\uFE0F" },
  { value: "healthfood", label: "Health Food" },
  { value: "salad", label: "Salads" },
  { value: "vegan", label: "Vegan" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "juicebars", label: "Juice Bars" },
  { value: "acaibowls", label: "Acai Bowls" },
  { value: "poke", label: "Poke" },
  { value: "mediterranean", label: "Mediterranean" },
  { value: "sushi", label: "Sushi" },
  { value: "thai", label: "Thai" },
  { value: "mexican", label: "Mexican" },
  { value: "indian", label: "Indian" },
  { value: "chinese", label: "Chinese" },
  { value: "italian", label: "Italian" },
  { value: "korean", label: "Korean" },
];

const PRICE_OPTIONS = [
  { value: "", label: "Any Price" },
  { value: "1", label: "$" },
  { value: "2", label: "$$" },
  { value: "3", label: "$$$" },
  { value: "4", label: "$$$$" },
];

const SORT_OPTIONS = [
  { value: "best_match", label: "Best Match" },
  { value: "rating", label: "Highest Rated" },
  { value: "distance", label: "Nearest" },
  { value: "review_count", label: "Most Reviewed" },
];

type Tab = "restaurants" | "scanner";

interface RestaurantSearchPageProps {
  userId: string;
  userName?: string;
}

export default function RestaurantSearchPage({ userId, userName }: RestaurantSearchPageProps) {
  const [activeTab, setActiveTab] = useState<Tab>("restaurants");
  const [location, setLocation] = useState("Boulder, CO");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [sortBy, setSortBy] = useState("best_match");
  const [showFilters, setShowFilters] = useState(false);

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [healthScores, setHealthScores] = useState<Record<string, HealthScore>>({});
  const [totalResults, setTotalResults] = useState(0);

  const [isLoading, setIsLoading] = useState(false);
  const [isScoringHealth, setIsScoringHealth] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);

  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const insightTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadFavorites();

    generateInsights();
    insightTimerRef.current = setInterval(generateInsights, INSIGHT_INTERVAL_MS);
    return () => {
      if (insightTimerRef.current) clearInterval(insightTimerRef.current);
    };
  }, []);

  async function loadFavorites() {
    try {
      const res = await fetch(`/api/favorites?userId=${userId}`);
      if (!res.ok) return;
      const data = await res.json();
      const ids = new Set<string>(data.map((f: any) => f.restaurantId));
      setFavoriteIds(ids);
    } catch (err) {
      console.error("Failed to load favorites:", err);
    }
  }

  async function toggleFavorite(restaurant: Restaurant) {
    const wasLiked = favoriteIds.has(restaurant.id);
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (wasLiked) {
        next.delete(restaurant.id);
      } else {
        next.add(restaurant.id);
      }
      return next;
    });

    try {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userId,
          restaurantId: restaurant.id,
          restaurantName: restaurant.name,
          categories: restaurant.categories,
          location: restaurant.location.display_address?.join(", ") || "",
        }),
      });
      if (!res.ok) {
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          if (wasLiked) next.add(restaurant.id);
          else next.delete(restaurant.id);
          return next;
        });
      }
    } catch (err) {
      console.error("Failed to toggle favorite:", err);
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (wasLiked) next.add(restaurant.id);
        else next.delete(restaurant.id);
        return next;
      });
    }
  }

  async function trackClick(restaurant: Restaurant) {
    trackActivity("view_yelp", restaurant.id, restaurant.name);
  }

  async function trackActivity(action: string, restaurantId = "", restaurantName = "", metadata: Record<string, any> = {}) {
    try {
      await fetch("/api/track-click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userId, restaurantId, restaurantName, action, metadata }),
      });
    } catch {
      // fire-and-forget
    }
  }

  async function generateInsights() {
    try {
      await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userId }),
      });
    } catch {
      // background task, silently fail
    }
  }

  async function detectLocation() {
    setDetectingLocation(true);
    setError(null);

    // Try browser geolocation first
    if (navigator.geolocation) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 5000,
            maximumAge: 60000,
          });
        });
        const { latitude, longitude } = position.coords;
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
        );
        const data = await res.json();
        const city = data.address?.city || data.address?.town || data.address?.village || "";
        const state = data.address?.state || "";
        if (city) {
          setLocation(state ? `${city}, ${state}` : city);
          setDetectingLocation(false);
          return;
        }
      } catch {
        // Browser geolocation failed, fall through to IP-based
      }
    }

    // Fallback: IP-based location (no permission needed)
    try {
      const res = await fetch("https://ipapi.co/json/");
      const data = await res.json();
      if (data.city) {
        setLocation(data.region ? `${data.city}, ${data.region}` : data.city);
      } else {
        setError("Could not detect location. Please enter it manually.");
      }
    } catch {
      setError("Could not detect location. Please enter it manually.");
    }

    setDetectingLocation(false);
  }

  async function searchRestaurants(e?: React.FormEvent) {
    if (e) e.preventDefault();

    if (!location.trim()) {
      setError("Please enter a location");
      return;
    }

    setIsLoading(true);
    setError(null);
    setHasSearched(true);
    setRestaurants([]);
    setHealthScores({});

    try {
      const params = new URLSearchParams();
      params.set("location", location.trim());
      params.set("sort_by", sortBy);
      params.set("limit", "20");

      if (category && category !== "__liked") params.set("categories", category);
      if (price) params.set("price", price);

      const res = await fetch(`/api/yelp?${params.toString()}`);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Search failed (${res.status})`);
      }

      const data = await res.json();
      const businesses: Restaurant[] = data.businesses || [];
      setRestaurants(businesses);
      setTotalResults(data.total || 0);

      trackActivity("search", "", "", {
        location: location.trim(),
        category: category || "all",
        price: price || "any",
        sortBy,
        resultCount: businesses.length,
      });

      if (businesses.length > 0) {
        fetchHealthScores(businesses);
      }
    } catch (err: any) {
      setError(err.message || "Failed to search restaurants");
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchHealthScores(businesses: Restaurant[]) {
    setIsScoringHealth(true);
    try {
      const payload = businesses.map((b) => ({
        name: b.name,
        categories: b.categories,
        price: b.price,
      }));

      const res = await fetch("/api/health-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Health scoring failed");

      const scores: HealthScore[] = await res.json();
      const scoreMap: Record<string, HealthScore> = {};
      businesses.forEach((b, i) => {
        if (scores[i]) {
          scoreMap[b.id] = scores[i];
        }
      });
      setHealthScores(scoreMap);
    } catch (err) {
      console.error("Health scoring error:", err);
    } finally {
      setIsScoringHealth(false);
    }
  }

  return (
    <main className="min-h-screen bg-doom-bg">
      {/* Hero */}
      <div className="bg-gradient-doom border-b border-doom-primary/20">
        <div className="max-w-[95%] mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 mb-4">
              <Apple className="w-8 h-8 text-green-400" />
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-doom-text">
                Find{" "}
                <span className="bg-gradient-to-r from-green-400 to-doom-primary bg-clip-text text-transparent">
                  Healthy Restaurants
                </span>{" "}
                Near You
              </h1>
            </div>
            <p className="text-doom-muted text-lg max-w-2xl mx-auto">
              Find healthy restaurants, scan your meals, and understand your nutrition — all powered by AI.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-[95%] mx-auto px-4 sm:px-6 -mt-6 mb-6">
        <div className="flex gap-2 bg-doom-surface rounded-xl border border-doom-primary/20 p-1.5">
          <button
            onClick={() => setActiveTab("restaurants")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "restaurants"
                ? "bg-doom-primary text-doom-bg"
                : "text-doom-muted hover:text-doom-text"
            }`}
          >
            <UtensilsCrossed className="w-4 h-4" />
            Find Restaurants
          </button>
          <button
            onClick={() => setActiveTab("scanner")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "scanner"
                ? "bg-doom-primary text-doom-bg"
                : "text-doom-muted hover:text-doom-text"
            }`}
          >
            <Camera className="w-4 h-4" />
            Scan Food
          </button>
        </div>
      </div>

      {/* Scanner Tab */}
      {activeTab === "scanner" && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-8">
          <FoodScanner />
        </div>
      )}

      {/* Restaurant Search Tab */}
      {activeTab === "restaurants" && <>
      <div className="max-w-[95%] mx-auto px-4 sm:px-6">
        <div className="bg-doom-surface rounded-xl border border-doom-primary/20 p-4 sm:p-6 shadow-lg shadow-black/20">
          <form onSubmit={searchRestaurants}>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-doom-muted" />
                <input
                  type="text"
                  placeholder="Enter city, address, or zip code..."
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-doom-bg border border-doom-primary/20 rounded-lg text-doom-text placeholder:text-doom-muted/50 focus:outline-none focus:border-doom-primary/60 transition-colors"
                />
              </div>

              <button
                type="button"
                onClick={detectLocation}
                disabled={detectingLocation}
                className="px-4 py-3 bg-doom-bg border border-doom-primary/20 rounded-lg text-doom-muted hover:text-doom-primary hover:border-doom-primary/40 transition-colors text-sm whitespace-nowrap disabled:opacity-50 flex items-center gap-2"
              >
                {detectingLocation ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <LocateFixed className="w-4 h-4" />
                )}
                {detectingLocation ? "Detecting..." : "My Location"}
              </button>

              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-3 border rounded-lg text-sm flex items-center gap-2 transition-colors whitespace-nowrap ${
                  showFilters
                    ? "bg-doom-primary/10 border-doom-primary/40 text-doom-primary"
                    : "bg-doom-bg border-doom-primary/20 text-doom-muted hover:text-doom-primary hover:border-doom-primary/40"
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters
              </button>

              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-3 bg-doom-primary text-doom-bg font-semibold rounded-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2 justify-center"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Search className="w-5 h-5" />
                )}
                Search
              </button>
            </div>

            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-doom-primary/10">
                    <div>
                      <label className="block text-xs text-doom-muted mb-1.5 uppercase tracking-wider">
                        Category
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-3 py-2.5 bg-doom-bg border border-doom-primary/20 rounded-lg text-doom-text focus:outline-none focus:border-doom-primary/60 transition-colors"
                      >
                        {CATEGORY_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-doom-muted mb-1.5 uppercase tracking-wider">
                        Price
                      </label>
                      <select
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="w-full px-3 py-2.5 bg-doom-bg border border-doom-primary/20 rounded-lg text-doom-text focus:outline-none focus:border-doom-primary/60 transition-colors"
                      >
                        {PRICE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-doom-muted mb-1.5 uppercase tracking-wider">
                        Sort By
                      </label>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="w-full px-3 py-2.5 bg-doom-bg border border-doom-primary/20 rounded-lg text-doom-text focus:outline-none focus:border-doom-primary/60 transition-colors"
                      >
                        {SORT_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-[95%] mx-auto px-4 sm:px-6 py-8">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-lg bg-doom-secondary/10 border border-doom-secondary/30 text-doom-secondary flex items-center justify-between"
          >
            <span>{error}</span>
            <button onClick={() => setError(null)}>
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {isLoading && (
          <div className="text-center py-16">
            <Loader2 className="w-10 h-10 animate-spin text-doom-primary mx-auto mb-4" />
            <p className="text-doom-muted">Searching restaurants...</p>
          </div>
        )}

        {!isLoading && hasSearched && restaurants.length > 0 && (
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-doom-text">
              Found{" "}
              <span className="text-doom-primary">{totalResults.toLocaleString()}</span>{" "}
              restaurants
            </h2>
            {isScoringHealth && (
              <div className="flex items-center gap-2 text-sm text-doom-muted">
                <Loader2 className="w-4 h-4 animate-spin text-green-400" />
                Scoring healthiness with AI...
              </div>
            )}
          </div>
        )}

        {!isLoading && restaurants.length > 0 && (() => {
          const displayList = category === "__liked"
            ? restaurants.filter((r) => favoriteIds.has(r.id))
            : restaurants;

          return displayList.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {displayList.map((restaurant, index) => (
                <RestaurantCard
                  key={restaurant.id}
                  restaurant={restaurant}
                  healthScore={healthScores[restaurant.id]}
                  index={index}
                  isFavorited={favoriteIds.has(restaurant.id)}
                  onToggleFavorite={toggleFavorite}
                  onTrackClick={trackClick}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Heart className="w-12 h-12 text-doom-muted/30 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-doom-text mb-2">No liked restaurants</h3>
              <p className="text-doom-muted">
                Like some restaurants first by clicking the heart icon, then filter by liked.
              </p>
            </div>
          );
        })()}

        {!isLoading && hasSearched && restaurants.length === 0 && !error && (
          <div className="text-center py-16">
            <Apple className="w-12 h-12 text-doom-muted/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-doom-text mb-2">No restaurants found</h3>
            <p className="text-doom-muted">
              Try a different location or broaden your filters.
            </p>
          </div>
        )}

        {!hasSearched && !isLoading && (
          <div className="text-center py-16">
            <Search className="w-12 h-12 text-doom-muted/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-doom-text mb-2">
              Search for restaurants
            </h3>
            <p className="text-doom-muted">
              Enter a location above to discover healthy dining options near you.
            </p>
          </div>
        )}
      </div>
      </>}
    </main>
  );
}
