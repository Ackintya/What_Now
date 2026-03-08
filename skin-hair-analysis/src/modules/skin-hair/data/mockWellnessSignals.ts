import type { WellnessSignalRecord } from "../types";

function seededNumber(seed: number, min: number, max: number): number {
  const x = Math.sin(seed) * 10000;
  const fraction = x - Math.floor(x);
  return min + fraction * (max - min);
}

function hashUserId(userId: string): number {
  return userId.split("").reduce((acc, char, idx) => acc + char.charCodeAt(0) * (idx + 1), 17);
}

export function getMockWellnessSignals(userId: string, days = 14): WellnessSignalRecord[] {
  const baseSeed = hashUserId(userId);
  const records: WellnessSignalRecord[] = [];

  for (let i = 0; i < days; i += 1) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    const sleepDuration = Number(seededNumber(baseSeed + i * 3, 5.4, 8.6).toFixed(1));
    const sleepQuality = Math.round(seededNumber(baseSeed + i * 4, 42, 92));
    const fatigue = Math.round(seededNumber(baseSeed + i * 5, 25, 88));
    const nutrition = Math.round(seededNumber(baseSeed + i * 6, 45, 95));
    const proteinConsistency = Math.round(seededNumber(baseSeed + i * 7, 40, 96));
    const supplementConsistency = Math.round(seededNumber(baseSeed + i * 8, 30, 94));

    records.push({
      date: date.toISOString().slice(0, 10),
      sleep_duration_hours: sleepDuration,
      sleep_quality_score: sleepQuality,
      workout_fatigue_score: fatigue,
      nutrition_quality_score: nutrition,
      protein_consistency_score: proteinConsistency,
      supplement_consistency_score: supplementConsistency,
    });
  }

  return records.reverse();
}
