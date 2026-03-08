import { BANNED_CLAIMS } from "./constants";

export function enforceWellnessTone(text: string): string {
  let cleaned = text;

  for (const phrase of BANNED_CLAIMS) {
    const pattern = new RegExp(phrase, "ig");
    cleaned = cleaned.replace(pattern, "wellness-oriented option");
  }

  return cleaned.replace(/\s+/g, " ").trim();
}

export function ensureGroundingLine(line: string): string {
  const trimmed = line.trim();
  if (!trimmed.toLowerCase().startsWith("also check:")) {
    return `Also check: ${trimmed.replace(/^also check:\s*/i, "")}`;
  }

  return trimmed;
}
