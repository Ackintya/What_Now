/**
 * Precomputes all joint angles and meta values from MediaPipe landmarks.
 * The generated analyzeExercise() function receives this — never raw landmarks.
 *
 * MediaPipe Pose landmark indices:
 *  0=nose  11=leftShoulder  12=rightShoulder
 *  13=leftElbow  14=rightElbow  15=leftWrist  16=rightWrist
 *  23=leftHip    24=rightHip
 *  25=leftKnee   26=rightKnee
 *  27=leftAnkle  28=rightAnkle
 */

export interface LandmarkPoint {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export interface ExerciseFrame {
  angles: {
    leftElbow: number;      // Shoulder-Elbow-Wrist
    rightElbow: number;
    leftShoulder: number;   // Elbow-Shoulder-Hip (ESH)
    rightShoulder: number;
    leftKnee: number;       // Hip-Knee-Ankle
    rightKnee: number;
    leftHip: number;        // Shoulder-Hip-Knee
    rightHip: number;
    spineAngle: number;     // shoulder midpoint - hip midpoint - knee midpoint
    neckAngle: number;      // nose - shoulder midpoint - hip midpoint
  };
  meta: {
    orientation: 'front' | 'side' | 'unclear';
    shoulderSpanRatio: number;
    bodyHeightRatio: number;
    fullBodyVisible: boolean;
    shoulderVisibilityAsymmetry: number;
  };
  landmarks: LandmarkPoint[];
}

export interface AnalysisState {
  phase: string;
  reps: number;
  [key: string]: any;
}

export interface AnalysisResult {
  reps: number;
  phase: string;
  formIssues: Array<{ severity: 'LOW' | 'MEDIUM' | 'HIGH'; message: string; joint?: string }>;
  isValidPosition: boolean;
  debugInfo?: Record<string, number>;
}

// ─── Angle math ───────────────────────────────────────────────────────────────

function angle(a: LandmarkPoint, b: LandmarkPoint, c: LandmarkPoint): number {
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let deg = Math.abs(radians * (180 / Math.PI));
  if (deg > 180) deg = 360 - deg;
  return deg;
}

function midpoint(a: LandmarkPoint, b: LandmarkPoint): LandmarkPoint {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: (a.z + b.z) / 2,
    visibility: Math.min(a.visibility, b.visibility),
  };
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function precomputeFrame(landmarks: LandmarkPoint[]): ExerciseFrame {
  const lm = landmarks;

  // Key points
  const nose         = lm[0];
  const lShoulder    = lm[11], rShoulder = lm[12];
  const lElbow       = lm[13], rElbow    = lm[14];
  const lWrist       = lm[15], rWrist    = lm[16];
  const lHip         = lm[23], rHip      = lm[24];
  const lKnee        = lm[25], rKnee     = lm[26];
  const lAnkle       = lm[27], rAnkle    = lm[28];

  const shoulderMid  = midpoint(lShoulder, rShoulder);
  const hipMid       = midpoint(lHip, rHip);
  const kneeMid      = midpoint(lKnee, rKnee);

  // ── Angles ────────────────────────────────────────────────────────────────
  const leftElbow    = angle(lShoulder, lElbow, lWrist);
  const rightElbow   = angle(rShoulder, rElbow, rWrist);
  const leftShoulder = angle(lElbow,    lShoulder, lHip);   // ESH
  const rightShoulder= angle(rElbow,    rShoulder, rHip);
  const leftKnee     = angle(lHip,  lKnee,  lAnkle);
  const rightKnee    = angle(rHip,  rKnee,  rAnkle);
  const leftHip      = angle(lShoulder, lHip, lKnee);
  const rightHip     = angle(rShoulder, rHip, rKnee);
  const spineAngle   = angle(shoulderMid, hipMid, kneeMid);
  const neckAngle    = angle(nose, shoulderMid, hipMid);

  // ── Orientation detection ─────────────────────────────────────────────────
  const bodyHeight = Math.abs(
    nose.y - ((lm[27].y + lm[28].y) / 2)
  );
  const shoulderSpan = Math.abs(lShoulder.x - rShoulder.x);
  const shoulderSpanRatio = bodyHeight > 0 ? shoulderSpan / bodyHeight : 0;
  const shoulderVisibilityAsymmetry = Math.abs(
    (lShoulder.visibility ?? 1) - (rShoulder.visibility ?? 1)
  );

  let orientation: 'front' | 'side' | 'unclear';
  if (shoulderSpanRatio < 0.10 && shoulderVisibilityAsymmetry > 0.25) {
    orientation = 'side';
  } else if (shoulderSpanRatio > 0.18 && shoulderVisibilityAsymmetry < 0.20) {
    orientation = 'front';
  } else {
    orientation = 'unclear';
  }

  // ── Meta ──────────────────────────────────────────────────────────────────
  const frameHeight = 1; // normalized coords
  const bodyHeightRatio = bodyHeight / frameHeight;

  const keyIndices = [0, 11, 12, 13, 14, 23, 24, 25, 26, 27, 28];
  const fullBodyVisible = keyIndices.every(
    i => (lm[i]?.visibility ?? 0) > 0.4
  );

  return {
    angles: {
      leftElbow, rightElbow,
      leftShoulder, rightShoulder,
      leftKnee, rightKnee,
      leftHip, rightHip,
      spineAngle, neckAngle,
    },
    meta: {
      orientation,
      shoulderSpanRatio,
      bodyHeightRatio,
      fullBodyVisible,
      shoulderVisibilityAsymmetry,
    },
    landmarks: lm,
  };
}

// ─── Analyzer factory ─────────────────────────────────────────────────────────

export { createAnalyzerFromSpec as compileAnalyzer } from './specEngine';
