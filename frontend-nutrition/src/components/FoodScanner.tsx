"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  Upload,
  Loader2,
  X,
  Flame,
  Drumstick,
  Wheat,
  Droplet,
  Leaf,
  Dumbbell,
  ArrowRight,
  Lightbulb,
} from "lucide-react";

interface FoodItem {
  name: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

interface ScanResult {
  foods: FoodItem[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  healthScore: number;
  healthLabel: string;
  summary: string;
  healthierAlternatives: string[];
}

const CALORIES_PER_BICEP_CURL_REP = 3.5;
const CALORIES_PER_LATERAL_RAISE_REP = 4.0;

function getHealthColor(score: number): string {
  if (score >= 8) return "text-green-400";
  if (score >= 6) return "text-doom-primary";
  if (score >= 4) return "text-yellow-400";
  return "text-doom-secondary";
}

function getHealthBg(score: number): string {
  if (score >= 8) return "bg-green-400/10 border-green-400/30";
  if (score >= 6) return "bg-doom-primary/10 border-doom-primary/30";
  if (score >= 4) return "bg-yellow-400/10 border-yellow-400/30";
  return "bg-doom-secondary/10 border-doom-secondary/30";
}

export function FoodScanner() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setImagePreview(dataUrl);
      setResult(null);
      setError(null);
      scanFood(dataUrl, file.type);
    };
    reader.readAsDataURL(file);
  }

  async function scanFood(dataUrl: string, mimeType: string) {
    setIsScanning(true);
    setError(null);

    try {
      const res = await fetch("/api/food-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl, mimeType }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Scan failed");
      }

      const data: ScanResult = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to analyze food");
    } finally {
      setIsScanning(false);
    }
  }

  function clearScan() {
    setImagePreview(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  }

  const curlReps = result
    ? Math.ceil(result.totalCalories / CALORIES_PER_BICEP_CURL_REP)
    : 0;
  const raiseReps = result
    ? Math.ceil(result.totalCalories / CALORIES_PER_LATERAL_RAISE_REP)
    : 0;

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      {!imagePreview && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-2 border-dashed border-doom-primary/30 rounded-xl p-8 sm:p-12 text-center hover:border-doom-primary/50 transition-colors"
        >
          <Camera className="w-12 h-12 text-doom-primary/50 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-doom-text mb-2">
            Scan Your Food
          </h3>
          <p className="text-doom-muted text-sm mb-6 max-w-md mx-auto">
            Take a photo or upload an image of your meal to get instant calorie
            and nutrition estimates powered by AI.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="px-6 py-3 bg-doom-primary text-doom-bg font-semibold rounded-lg hover:scale-105 transition-transform flex items-center gap-2 justify-center"
            >
              <Camera className="w-5 h-5" />
              Take Photo
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-3 bg-doom-surface border border-doom-primary/30 text-doom-text font-semibold rounded-lg hover:border-doom-primary/60 transition-colors flex items-center gap-2 justify-center"
            >
              <Upload className="w-5 h-5" />
              Upload Image
            </button>
          </div>

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </motion.div>
      )}

      {/* Image Preview + Scanning State */}
      {imagePreview && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative"
        >
          <div className="relative rounded-xl overflow-hidden border border-doom-primary/20">
            <img
              src={imagePreview}
              alt="Food to scan"
              className="w-full max-h-80 object-cover"
            />
            {isScanning && (
              <div className="absolute inset-0 bg-doom-bg/70 backdrop-blur-sm flex flex-col items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-doom-primary mb-3" />
                <p className="text-doom-text font-medium">Analyzing your food...</p>
                <p className="text-doom-muted text-sm">
                  Estimating calories & nutrients
                </p>
              </div>
            )}
            <button
              onClick={clearScan}
              className="absolute top-3 right-3 p-2 rounded-lg bg-doom-bg/80 backdrop-blur-sm text-doom-muted hover:text-doom-text transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 rounded-lg bg-doom-secondary/10 border border-doom-secondary/30 text-doom-secondary flex items-center justify-between"
        >
          <span>{error}</span>
          <button onClick={() => setError(null)}>
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Summary + Health Score */}
            <div
              className={`p-4 rounded-xl border ${getHealthBg(result.healthScore)}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-doom-text font-medium mb-1">
                    {result.summary}
                  </p>
                  <p
                    className={`text-sm font-semibold ${getHealthColor(result.healthScore)}`}
                  >
                    {result.healthLabel}
                  </p>
                </div>
                <div
                  className={`text-3xl font-bold ${getHealthColor(result.healthScore)}`}
                >
                  {result.healthScore}/10
                </div>
              </div>
            </div>

            {/* Macro Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MacroCard
                icon={<Flame className="w-5 h-5" />}
                label="Calories"
                value={`${result.totalCalories}`}
                unit="kcal"
                color="text-orange-400"
              />
              <MacroCard
                icon={<Drumstick className="w-5 h-5" />}
                label="Protein"
                value={`${result.totalProtein}`}
                unit="g"
                color="text-red-400"
              />
              <MacroCard
                icon={<Wheat className="w-5 h-5" />}
                label="Carbs"
                value={`${result.totalCarbs}`}
                unit="g"
                color="text-yellow-400"
              />
              <MacroCard
                icon={<Droplet className="w-5 h-5" />}
                label="Fat"
                value={`${result.totalFat}`}
                unit="g"
                color="text-blue-400"
              />
            </div>

            {/* Food Breakdown */}
            {result.foods.length > 0 && (
              <div className="bg-doom-surface rounded-xl border border-doom-primary/20 overflow-hidden">
                <div className="px-4 py-3 border-b border-doom-primary/10">
                  <h4 className="text-sm font-semibold text-doom-text uppercase tracking-wider">
                    Food Breakdown
                  </h4>
                </div>
                <div className="divide-y divide-doom-primary/10">
                  {result.foods.map((food, i) => (
                    <div
                      key={i}
                      className="px-4 py-3 flex items-center justify-between"
                    >
                      <div>
                        <span className="text-doom-text font-medium">
                          {food.name}
                        </span>
                        <span className="text-doom-muted text-sm ml-2">
                          ({food.portion})
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-doom-muted">
                        <span>
                          <strong className="text-doom-text">
                            {food.calories}
                          </strong>{" "}
                          cal
                        </span>
                        <span>P: {food.protein}g</span>
                        <span>C: {food.carbs}g</span>
                        <span>F: {food.fat}g</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fitness Connection */}
            <div className="bg-doom-surface rounded-xl border border-doom-primary/20 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Dumbbell className="w-5 h-5 text-doom-primary" />
                <h4 className="text-sm font-semibold text-doom-text uppercase tracking-wider">
                  Workout to Burn This Meal
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-4 p-4 rounded-lg bg-doom-bg/50">
                  <div className="p-3 rounded-lg bg-doom-primary/10">
                    <Dumbbell className="w-6 h-6 text-doom-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-doom-text">
                      {curlReps.toLocaleString()}
                    </p>
                    <p className="text-sm text-doom-muted">Bicep Curl reps</p>
                    <p className="text-xs text-doom-muted/70">
                      ~{Math.ceil(curlReps / 12)} sets of 12
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-lg bg-doom-bg/50">
                  <div className="p-3 rounded-lg bg-doom-accent/10">
                    <Dumbbell className="w-6 h-6 text-doom-accent" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-doom-text">
                      {raiseReps.toLocaleString()}
                    </p>
                    <p className="text-sm text-doom-muted">Lateral Raise reps</p>
                    <p className="text-xs text-doom-muted/70">
                      ~{Math.ceil(raiseReps / 10)} sets of 10
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-doom-muted mt-3 flex items-center gap-1.5">
                <ArrowRight className="w-3 h-3" />
                Estimates based on average calorie burn per rep. Actual values vary by weight and intensity.
              </p>
            </div>

            {/* Healthier Alternatives */}
            {result.healthierAlternatives.length > 0 && (
              <div className="bg-doom-surface rounded-xl border border-doom-primary/20 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="w-5 h-5 text-yellow-400" />
                  <h4 className="text-sm font-semibold text-doom-text uppercase tracking-wider">
                    Healthier Alternatives
                  </h4>
                </div>
                <ul className="space-y-2">
                  {result.healthierAlternatives.map((alt, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-doom-muted"
                    >
                      <Leaf className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                      <span>{alt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Scan Another */}
            <div className="text-center">
              <button
                onClick={clearScan}
                className="px-6 py-3 bg-doom-surface border border-doom-primary/30 text-doom-text font-semibold rounded-lg hover:border-doom-primary/60 transition-colors inline-flex items-center gap-2"
              >
                <Camera className="w-5 h-5" />
                Scan Another Meal
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MacroCard({
  icon,
  label,
  value,
  unit,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
  color: string;
}) {
  return (
    <div className="bg-doom-surface rounded-xl border border-doom-primary/20 p-4 text-center">
      <div className={`${color} flex justify-center mb-2`}>{icon}</div>
      <p className="text-2xl font-bold text-doom-text">
        {value}
        <span className="text-sm font-normal text-doom-muted ml-1">{unit}</span>
      </p>
      <p className="text-xs text-doom-muted uppercase tracking-wider">{label}</p>
    </div>
  );
}
