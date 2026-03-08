import { FORBIDDEN_TERMS } from "../constants";

export function clampScore(value: unknown): number {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function replaceUnsafeTerm(text: string): string {
  let sanitized = text;

  if (sanitized.toLowerCase().includes("you have")) {
    sanitized = sanitized.replace(/you have/gi, "there appears to be");
  }

  if (sanitized.toLowerCase().includes("diagnos")) {
    sanitized = sanitized.replace(/diagnos[a-z]*/gi, "visual pattern");
  }

  sanitized = sanitized.replace(/caused by/gi, "may align with");
  sanitized = sanitized.replace(/proves/gi, "may suggest");
  sanitized = sanitized.replace(/disease/gi, "condition pattern");
  sanitized = sanitized.replace(/treatment/gi, "care step");

  return sanitized;
}

export function sanitizeObservation(input: unknown, fallback: string): string {
  const raw = typeof input === "string" && input.trim().length > 0 ? input.trim() : fallback;
  let candidate = replaceUnsafeTerm(raw);

  for (const term of FORBIDDEN_TERMS) {
    const pattern = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    if (pattern.test(candidate)) {
      candidate = fallback;
      break;
    }
  }

  if (!/possible|appearance|signal|pattern|may align/i.test(candidate)) {
    candidate = `Possible appearance signal: ${candidate.toLowerCase()}`;
  }

  if (!candidate.endsWith(".")) {
    candidate = `${candidate}.`;
  }

  return candidate;
}

export function confidenceLabel(value: number): "Low" | "Low to medium" | "Medium" {
  if (value < 35) {
    return "Low";
  }

  if (value < 70) {
    return "Low to medium";
  }

  return "Medium";
}
