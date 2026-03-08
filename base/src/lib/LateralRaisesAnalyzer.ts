/**
 * Lateral Raises Analyzer
 *
 * Validates:
 * 1. Straight posture (back/head alignment) - same as bicep curl
 * 2. Arms at sides when down (ESH < 40°)
 * 3. Arms at shoulder level when raised (ESH ~80-90°, tolerant range used)
 * 4. Warning when arms too high (ESH > shoulder-level range)
 * 5. Full body visibility
 * 6. Proper rep counting based on ESH angle (arm elevation)
 */

export interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export interface LateralRaisesMetrics {
  repCount: number;
  eshAngles: { left: number; right: number }; // Primary metric for lateral raises
  formScore: number;
  postureScore: number;
  armElevationScore: number;
  visibilityScore: number;
  feedback: string[];
  isInValidPosition: boolean;
  phase: 'down' | 'up' | 'neutral';
  legBending?: {
    hasLegBend: boolean;
    leftKneeAngle: number;
    rightKneeAngle: number;
  };
  formValidation?: {
    leftArmScore: number;
    rightArmScore: number;
    leftLegScore: number;
    rightLegScore: number;
  };
}

export interface PostureAnalysis {
  isPostureStraight: boolean;
  backAngle: number;
  headAlignment: number;
  issues: string[];
}

export interface CameraDistanceCheck {
  isTooClose: boolean;
  bodyHeightRatio: number;
  feedback: string;
}

export interface ArmElevationAnalysis {
  isArmElevationValid: boolean;
  leftESH: number; // Elbow-Shoulder-Hip angle (arm elevation)
  rightESH: number; // Elbow-Shoulder-Hip angle (arm elevation)
  issues: string[];
}

export class LateralRaisesAnalyzer {
  private repCount: number = 0;
  private lastESH: { left: number; right: number } = { left: 0, right: 0 };
  private phase: 'down' | 'up' | 'neutral' = 'down';
  private repStarted: boolean = false;
  private logCallback?: (message: string) => void;

  // Thresholds for lateral raises (based on observed ESH geometry in logs)
  // In this coordinate setup:
  // - Arms DOWN at sides -> small ESH values (~5-35)
  // - Arms at shoulder level -> larger ESH values (~80-95)
  private readonly MAX_ESH_DOWN = 40; // Down position upper bound
  private readonly MIN_ESH_UP = 75; // Up position lower bound (tolerant)
  private readonly MAX_ESH_UP = 100; // Up position upper bound (tolerant)
  private readonly MAX_ESH_WARNING = 110; // Above this, arms are too high
  private readonly ARM_STRAIGHT_MIN_WES = 70; // Wrist-Elbow-Shoulder angle must be >= 70 for straight-enough arms
  private readonly LEG_BEND_MIN_HKA = 165; // Hip-Knee-Ankle angle must be >= 165 for straight legs
  private readonly MIN_VISIBILITY = 0.5; // Minimum landmark visibility
  private readonly BACK_STRAIGHT_THRESHOLD = 170; // Shoulder-hip-knee angle for straight back
  private readonly MAX_BODY_HEIGHT_RATIO = 0.8; // Max body height in frame (user too close if exceeded)

  // MediaPipe Pose landmark indices
  private readonly LANDMARKS = {
    NOSE: 0,
    LEFT_SHOULDER: 11,
    RIGHT_SHOULDER: 12,
    LEFT_ELBOW: 13,
    RIGHT_ELBOW: 14,
    LEFT_WRIST: 15,
    RIGHT_WRIST: 16,
    LEFT_HIP: 23,
    RIGHT_HIP: 24,
    LEFT_KNEE: 25,
    RIGHT_KNEE: 26,
    LEFT_ANKLE: 27,
    RIGHT_ANKLE: 28,
  };

  constructor(logCallback?: (message: string) => void) {
    this.logCallback = logCallback;
  }

  /**
   * Set the logging callback
   */
  setLogCallback(callback: (message: string) => void): void {
    this.logCallback = callback;
  }

  /**
   * Internal logging method with timestamp and formatting
   */
  private log(message: string): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[LATERAL RAISES] ${timestamp} | ${message}`;

    // Log to console
    console.log(logMessage);

    // Call external callback if provided
    if (this.logCallback) {
      this.logCallback(logMessage);
    }
  }

  /**
   * Interpret ESH angles for debug logging
   */
  private interpretESH(leftESH: number, rightESH: number): string {
    const avgESH = (leftESH + rightESH) / 2;
    if (avgESH <= this.MAX_ESH_DOWN) {
      return `Arms DOWN at sides (<=${this.MAX_ESH_DOWN}°)`;
    } else if (avgESH >= this.MIN_ESH_UP && avgESH <= this.MAX_ESH_UP) {
      return "Arms UP at shoulder level (IDEAL)";
    } else if (avgESH > this.MAX_ESH_WARNING) {
      return `Arms TOO HIGH above shoulders (>${this.MAX_ESH_WARNING}°)`;
    } else if (avgESH > this.MAX_ESH_DOWN && avgESH < this.MIN_ESH_UP) {
      return "Arms BETWEEN down and shoulder level (raising/lowering)";
    }
    return "Unknown position";
  }

  /**
   * Main analysis function - call this with each frame's landmarks
   */
  analyze(landmarks: PoseLandmark[]): LateralRaisesMetrics {
    const feedback: string[] = [];

    // 1. Check full body visibility
    const visibilityCheck = this.checkFullBodyVisibility(landmarks);
    if (!visibilityCheck.isVisible) {
      return {
        repCount: this.repCount,
        eshAngles: this.lastESH,
        formScore: 0,
        postureScore: 0,
        armElevationScore: 0,
        visibilityScore: 0,
        feedback: visibilityCheck.issues,
        isInValidPosition: false,
        phase: this.phase,
      };
    }

    // 2. Check camera distance (user too close to camera?)
    const distanceCheck = this.checkCameraDistance(landmarks);
    if (distanceCheck.isTooClose) {
      feedback.push(distanceCheck.feedback);
    }

    // 3. Check posture (straight back and head alignment)
    const postureAnalysis = this.analyzePosture(landmarks);
    if (!postureAnalysis.isPostureStraight) {
      feedback.push(...postureAnalysis.issues);
    }

    // 4. Calculate ESH angles for arm elevation tracking
    const leftElbow = landmarks[this.LANDMARKS.LEFT_ELBOW];
    const leftShoulder = landmarks[this.LANDMARKS.LEFT_SHOULDER];
    const leftWrist = landmarks[this.LANDMARKS.LEFT_WRIST];
    const leftHip = landmarks[this.LANDMARKS.LEFT_HIP];
    const leftKnee = landmarks[this.LANDMARKS.LEFT_KNEE];
    const leftAnkle = landmarks[this.LANDMARKS.LEFT_ANKLE];
    const rightElbow = landmarks[this.LANDMARKS.RIGHT_ELBOW];
    const rightShoulder = landmarks[this.LANDMARKS.RIGHT_SHOULDER];
    const rightWrist = landmarks[this.LANDMARKS.RIGHT_WRIST];
    const rightHip = landmarks[this.LANDMARKS.RIGHT_HIP];
    const rightKnee = landmarks[this.LANDMARKS.RIGHT_KNEE];
    const rightAnkle = landmarks[this.LANDMARKS.RIGHT_ANKLE];

    // Debug: Log landmark positions with visibility
    this.log(
      `📍 LEFT LANDMARKS - ` +
      `Elbow: (${leftElbow.x.toFixed(3)}, ${leftElbow.y.toFixed(3)}, vis: ${leftElbow.visibility.toFixed(2)}) | ` +
      `Shoulder: (${leftShoulder.x.toFixed(3)}, ${leftShoulder.y.toFixed(3)}, vis: ${leftShoulder.visibility.toFixed(2)}) | ` +
      `Hip: (${leftHip.x.toFixed(3)}, ${leftHip.y.toFixed(3)}, vis: ${leftHip.visibility.toFixed(2)})`
    );
    this.log(
      `📍 RIGHT LANDMARKS - ` +
      `Elbow: (${rightElbow.x.toFixed(3)}, ${rightElbow.y.toFixed(3)}, vis: ${rightElbow.visibility.toFixed(2)}) | ` +
      `Shoulder: (${rightShoulder.x.toFixed(3)}, ${rightShoulder.y.toFixed(3)}, vis: ${rightShoulder.visibility.toFixed(2)}) | ` +
      `Hip: (${rightHip.x.toFixed(3)}, ${rightHip.y.toFixed(3)}, vis: ${rightHip.visibility.toFixed(2)})`
    );

    // Left ESH angle: elbow → shoulder → hip (angle AT the shoulder)
    const leftESH = Math.abs(Math.round(this.calculateAngle(
      leftElbow,
      leftShoulder,
      leftHip
    )));

    // Right ESH angle: elbow → shoulder → hip (angle AT the shoulder)
    const rightESH = Math.abs(Math.round(this.calculateAngle(
      rightElbow,
      rightShoulder,
      rightHip
    )));

    // Debug: Log calculated ESH angles with interpretation
    this.log(
      `📐 ESH ANGLES CALCULATED - ` +
      `Left: ${leftESH}° | Right: ${rightESH}° | ` +
      `Interpretation: ${this.interpretESH(leftESH, rightESH)}`
    );

    // 5. Arm elevation analysis
    const armElevationAnalysis = this.analyzeArmElevation(leftESH, rightESH, feedback);

    // 5a. Arm straightness (Wrist-Elbow-Shoulder angle at elbow)
    const leftWES = Math.abs(Math.round(this.calculateAngle(leftShoulder, leftElbow, leftWrist)));
    const rightWES = Math.abs(Math.round(this.calculateAngle(rightShoulder, rightElbow, rightWrist)));

    // 5b. Leg straightness (Hip-Knee-Ankle angle at knee)
    const leftHKA = Math.abs(Math.round(this.calculateAngle(leftHip, leftKnee, leftAnkle)));
    const rightHKA = Math.abs(Math.round(this.calculateAngle(rightHip, rightKnee, rightAnkle)));

    this.log(
      `🧪 STRAIGHTNESS CHECK | ` +
      `Left WES: ${leftWES}° | Right WES: ${rightWES}° (min ${this.ARM_STRAIGHT_MIN_WES}°) | ` +
      `Left HKA: ${leftHKA}° | Right HKA: ${rightHKA}° (min ${this.LEG_BEND_MIN_HKA}°)`
    );

    // Check for leg bending (important for voice feedback)
    const hasLegBend = leftHKA < this.LEG_BEND_MIN_HKA || rightHKA < this.LEG_BEND_MIN_HKA;
    if (hasLegBend) {
      this.log(`⚠️ LEG BENDING DETECTED | Left: ${leftHKA}° | Right: ${rightHKA}° | Threshold: ${this.LEG_BEND_MIN_HKA}°`);
    }

    if (leftWES < this.ARM_STRAIGHT_MIN_WES || rightWES < this.ARM_STRAIGHT_MIN_WES) {
      feedback.push(`💪 Keep arms straighter (WES should be >= ${this.ARM_STRAIGHT_MIN_WES}°)`);
    }
    const leftArmTooHigh = leftESH > this.MAX_ESH_UP;
    const rightArmTooHigh = rightESH > this.MAX_ESH_UP;
    if (leftArmTooHigh || rightArmTooHigh) {
      feedback.push(`⬇️ Lower your arms slightly (ESH should be <= ${this.MAX_ESH_UP}°)`);
    }
    if (hasLegBend) {
      feedback.push(`🦵 Keep legs straighter (knee angle should be >= ${this.LEG_BEND_MIN_HKA}°)`);
    }

    // 6. Rep counting logic (using average ESH)
    const avgESH = (leftESH + rightESH) / 2;

    // Log ESH angles and current state
    this.log(
      `Left ESH: ${leftESH}° | Right ESH: ${rightESH}° | ` +
      `Avg ESH: ${Math.round(avgESH)}° | Phase: ${this.phase} | Reps: ${this.repCount}`
    );

    // Calculate validity for rep counting.
    // Camera distance should warn, but not block rep counting by itself.
    const postureCheck = postureAnalysis.isPostureStraight;
    const armCheck = armElevationAnalysis.isArmElevationValid;
    const visCheck = visibilityCheck.isVisible;
    const isInValidPositionEarly = postureCheck && armCheck && visCheck;

    this.updateRepCount(avgESH, leftESH, rightESH, feedback, isInValidPositionEarly);

    // 7. Calculate scores
    const postureScore = this.calculatePostureScore(postureAnalysis);
    const armElevationScore = this.calculateArmElevationScore(armElevationAnalysis);
    const visibilityScore = visibilityCheck.score;

    // Reduce form score if user is too close to camera
    let formScore = (postureScore + armElevationScore + visibilityScore) / 3;
    if (distanceCheck.isTooClose) {
      formScore = Math.max(0, formScore - 20); // Penalty for being too close
      this.log(`Camera distance penalty applied: -20% | Body height ratio: ${distanceCheck.bodyHeightRatio.toFixed(2)}`);
    }

    // Log scores and posture details
    this.log(
      `Scores - Form: ${Math.round(formScore)}% | Posture: ${Math.round(postureScore)}% | ` +
      `Arm Elevation: ${Math.round(armElevationScore)}% | Visibility: ${Math.round(visibilityScore)}%`
    );

    this.log(
      `Posture - Back Angle: ${Math.round(postureAnalysis.backAngle)}° | ` +
      `Head Alignment: ${postureAnalysis.headAlignment.toFixed(2)}%`
    );

    // 8. Check if in valid starting position
    const isInValidPosition =
      postureAnalysis.isPostureStraight &&
      armElevationAnalysis.isArmElevationValid &&
      visibilityCheck.isVisible &&
      !distanceCheck.isTooClose;

    // 9. Add form feedback
    if (formScore < 70) {
      feedback.push("⚠️ Improve form for better results");
    } else if (formScore >= 90) {
      feedback.push("✅ Excellent form!");
    }

    // Log feedback messages if any
    if (feedback.length > 0) {
      this.log(`Feedback: ${feedback.join(' | ')}`);
    }

    this.lastESH = { left: leftESH, right: rightESH };

    const leftArmScore = leftWES >= this.ARM_STRAIGHT_MIN_WES && !leftArmTooHigh ? 100 : 0;
    const rightArmScore = rightWES >= this.ARM_STRAIGHT_MIN_WES && !rightArmTooHigh ? 100 : 0;
    const leftLegScore = leftHKA >= this.LEG_BEND_MIN_HKA ? 100 : 0;
    const rightLegScore = rightHKA >= this.LEG_BEND_MIN_HKA ? 100 : 0;

    return {
      repCount: this.repCount,
      eshAngles: { left: leftESH, right: rightESH },
      formScore: Math.round(formScore),
      postureScore: Math.round(postureScore),
      armElevationScore: Math.round(armElevationScore),
      visibilityScore: Math.round(visibilityScore),
      feedback,
      isInValidPosition,
      phase: this.phase,
      legBending: {
        hasLegBend,
        leftKneeAngle: leftHKA,
        rightKneeAngle: rightHKA,
      },
      formValidation: {
        leftArmScore,
        rightArmScore,
        leftLegScore,
        rightLegScore,
      },
    };
  }

  /**
   * Check camera distance - warn if user is too close to camera
   * Detects when user takes up too much of the frame (body height > 80% of frame)
   */
  private checkCameraDistance(landmarks: PoseLandmark[]): CameraDistanceCheck {
    const nose = landmarks[this.LANDMARKS.NOSE];
    const leftAnkle = landmarks[this.LANDMARKS.LEFT_ANKLE];
    const rightAnkle = landmarks[this.LANDMARKS.RIGHT_ANKLE];

    // Check if required landmarks are visible
    if (!nose || !leftAnkle || !rightAnkle) {
      return {
        isTooClose: false,
        bodyHeightRatio: 0,
        feedback: "",
      };
    }

    // Calculate body height in frame (head to ankles)
    const headY = nose.y;
    const avgAnkleY = (leftAnkle.y + rightAnkle.y) / 2;
    const bodyHeightInFrame = Math.abs(avgAnkleY - headY);

    // If body height exceeds threshold, user is too close
    const isTooClose = bodyHeightInFrame > this.MAX_BODY_HEIGHT_RATIO;

    if (isTooClose) {
      this.log(
        `⚠️ USER TOO CLOSE TO CAMERA | Body height ratio: ${bodyHeightInFrame.toFixed(2)} ` +
        `(max: ${this.MAX_BODY_HEIGHT_RATIO}) | Head Y: ${headY.toFixed(3)} | Ankle Y: ${avgAnkleY.toFixed(3)}`
      );
    }

    return {
      isTooClose,
      bodyHeightRatio: bodyHeightInFrame,
      feedback: isTooClose ? "📏 Please move back so your full body is visible" : "",
    };
  }

  /**
   * Check if full body is visible in frame
   */
  private checkFullBodyVisibility(landmarks: PoseLandmark[]): {
    isVisible: boolean;
    score: number;
    issues: string[];
  } {
    const issues: string[] = [];
    const requiredLandmarks = [
      { index: this.LANDMARKS.NOSE, name: 'Head' },
      { index: this.LANDMARKS.LEFT_SHOULDER, name: 'Left Shoulder' },
      { index: this.LANDMARKS.RIGHT_SHOULDER, name: 'Right Shoulder' },
      { index: this.LANDMARKS.LEFT_ELBOW, name: 'Left Elbow' },
      { index: this.LANDMARKS.RIGHT_ELBOW, name: 'Right Elbow' },
      { index: this.LANDMARKS.LEFT_WRIST, name: 'Left Wrist' },
      { index: this.LANDMARKS.RIGHT_WRIST, name: 'Right Wrist' },
      { index: this.LANDMARKS.LEFT_HIP, name: 'Left Hip' },
      { index: this.LANDMARKS.RIGHT_HIP, name: 'Right Hip' },
      { index: this.LANDMARKS.LEFT_ANKLE, name: 'Left Ankle' },
      { index: this.LANDMARKS.RIGHT_ANKLE, name: 'Right Ankle' },
    ];

    let visibleCount = 0;
    const missingParts: string[] = [];

    for (const landmark of requiredLandmarks) {
      const lm = landmarks[landmark.index];
      if (lm && lm.visibility > this.MIN_VISIBILITY) {
        visibleCount++;
      } else {
        missingParts.push(landmark.name);
      }
    }

    const visibilityScore = (visibleCount / requiredLandmarks.length) * 100;
    const isVisible = visibilityScore >= 80; // At least 80% of body should be visible

    if (!isVisible) {
      if (missingParts.includes('Left Ankle') || missingParts.includes('Right Ankle')) {
        issues.push("⚠️ Move back - can't see your ankles");
      }
      if (missingParts.includes('Head') || missingParts.includes('Nose')) {
        issues.push("⚠️ Move back - can't see your head");
      }
      if (missingParts.length > 0) {
        issues.push(`⚠️ Can't see: ${missingParts.join(', ')}`);
      }
      issues.push("📏 Move back to show your full body");
    }

    return { isVisible, score: visibilityScore, issues };
  }

  /**
   * Analyze posture - back and head should be straight
   * Uses shoulder-hip-knee angle like the bicep curl implementation
   */
  private analyzePosture(landmarks: PoseLandmark[]): PostureAnalysis {
    const issues: string[] = [];

    // Get landmarks
    const leftShoulder = landmarks[this.LANDMARKS.LEFT_SHOULDER];
    const rightShoulder = landmarks[this.LANDMARKS.RIGHT_SHOULDER];
    const leftHip = landmarks[this.LANDMARKS.LEFT_HIP];
    const rightHip = landmarks[this.LANDMARKS.RIGHT_HIP];
    const leftKnee = landmarks[this.LANDMARKS.LEFT_KNEE];
    const rightKnee = landmarks[this.LANDMARKS.RIGHT_KNEE];
    const nose = landmarks[this.LANDMARKS.NOSE];

    // Calculate shoulder-hip-knee angle (right side) - for back straightness
    const rightBackAngle = this.calculateAngle(
      rightShoulder,
      rightHip,
      rightKnee
    );

    // Calculate shoulder-hip-knee angle (left side) - for symmetry
    const leftBackAngle = this.calculateAngle(
      leftShoulder,
      leftHip,
      leftKnee
    );

    // Average back angle
    const backAngle = (rightBackAngle + leftBackAngle) / 2;

    // Mid-shoulder point for head alignment check
    const midShoulder = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2,
      z: (leftShoulder.z + rightShoulder.z) / 2,
      visibility: 1,
    };

    // Head alignment (nose should be centered above shoulders)
    const headAlignment = Math.abs((nose.x - midShoulder.x) * 100); // As percentage

    // Back should be straight: shoulder-hip-knee angle > 170 degrees
    const isPostureStraight =
      backAngle >= this.BACK_STRAIGHT_THRESHOLD &&
      headAlignment <= 10;

    if (backAngle < this.BACK_STRAIGHT_THRESHOLD) {
      issues.push(`📐 Stand straighter - back angle: ${Math.round(backAngle)}° (need ${this.BACK_STRAIGHT_THRESHOLD}°)`);
    }

    if (headAlignment > 10) {
      issues.push(`👤 Keep your head centered - offset: ${headAlignment.toFixed(1)}%`);
    }

    return {
      isPostureStraight,
      backAngle,
      headAlignment,
      issues,
    };
  }

  /**
   * Analyze arm elevation - ESH angles determine arm position
   */
  private analyzeArmElevation(leftESH: number, rightESH: number, feedback: string[]): ArmElevationAnalysis {
    const issues: string[] = [];

    // During the exercise, ESH will vary from >140° (down) to 80-90° (up)
    // This is expected and valid - we're just tracking the movement
    const isArmElevationValid = true; // Always valid during exercise

    // No warnings in this method - we'll handle warnings in updateRepCount()
    // where we have phase context

    return {
      isArmElevationValid,
      leftESH,
      rightESH,
      issues,
    };
  }

  /**
   * Calculate angle between three points (e.g., elbow-shoulder-hip)
   * Uses arctan2 method similar to the Python implementation
   *
   * @param a - First point (e.g., elbow)
   * @param b - Middle point (e.g., shoulder) - the vertex of the angle
   * @param c - Third point (e.g., hip)
   * @returns Angle in degrees
   */
  private calculateAngle(
    a: PoseLandmark,
    b: PoseLandmark,
    c: PoseLandmark
  ): number {
    // Handle missing or invalid points
    if (!a || !b || !c) {
      this.log("⚠️ Missing landmarks for angle calculation, returning 0°");
      return 0; // Return 0 for lateral raises if points are missing
    }

    // Calculate vectors from shoulder (b) to elbow (a) and hip (c)
    const vec1 = { x: a.x - b.x, y: a.y - b.y };
    const vec2 = { x: c.x - b.x, y: c.y - b.y };

    // Calculate angle using arctan2 (same as Python implementation)
    const angle1 = Math.atan2(a.y - b.y, a.x - b.x);
    const angle2 = Math.atan2(c.y - b.y, c.x - b.x);
    const radians = angle2 - angle1;

    let angle = Math.abs(radians * (180 / Math.PI));

    // Normalize angle to 0-180 range
    if (angle > 180.0) {
      angle = 360 - angle;
    }

    // Debug: VERBOSE angle calculation logging with step-by-step breakdown
    this.log(
      `🔢 ANGLE CALCULATION STEPS:` +
      `\n   1. Point A (elbow): (${a.x.toFixed(3)}, ${a.y.toFixed(3)})` +
      `\n   2. Point B (shoulder - VERTEX): (${b.x.toFixed(3)}, ${b.y.toFixed(3)})` +
      `\n   3. Point C (hip): (${c.x.toFixed(3)}, ${c.y.toFixed(3)})` +
      `\n   4. Vector BA: (${vec1.x.toFixed(3)}, ${vec1.y.toFixed(3)})` +
      `\n   5. Vector BC: (${vec2.x.toFixed(3)}, ${vec2.y.toFixed(3)})` +
      `\n   6. Angle1 (BA): ${(angle1 * 180 / Math.PI).toFixed(1)}°` +
      `\n   7. Angle2 (BC): ${(angle2 * 180 / Math.PI).toFixed(1)}°` +
      `\n   8. Radians diff: ${radians.toFixed(3)} rad` +
      `\n   9. Degrees (abs): ${(Math.abs(radians * (180 / Math.PI))).toFixed(1)}°` +
      `\n   10. Final normalized angle: ${angle.toFixed(1)}°` +
      `\n   📍 Interpretation: ${this.interpretSingleESH(angle)}`
    );

    return angle;
  }

  /**
   * Interpret a single ESH angle for debug logging
   */
  private interpretSingleESH(esh: number): string {
    if (esh <= this.MAX_ESH_DOWN) {
      return `Arms DOWN (<=${this.MAX_ESH_DOWN}°)`;
    } else if (esh >= this.MIN_ESH_UP && esh <= this.MAX_ESH_UP) {
      return `Arms at SHOULDER LEVEL (${this.MIN_ESH_UP}-${this.MAX_ESH_UP}° target range)`;
    } else if (esh > this.MAX_ESH_WARNING) {
      return `Arms TOO HIGH (>${this.MAX_ESH_WARNING}°)`;
    } else if (esh > this.MAX_ESH_DOWN && esh < this.MIN_ESH_UP) {
      return `Arms MID-RANGE (${this.MAX_ESH_DOWN}-${this.MIN_ESH_UP}°)`;
    }
    return "Unknown";
  }

  /**
   * Update rep count based on ESH angle changes
   * Logic:
   * - Down position: ESH <= MAX_ESH_DOWN (arms at sides)
   * - Up position: ESH in [MIN_ESH_UP, MAX_ESH_UP] (arms at shoulder level)
   * - Warning: ESH > MAX_ESH_WARNING (arms too high)
   * - Rep ONLY counts if isInValidPosition is true
   */
  private updateRepCount(avgESH: number, leftESH: number, rightESH: number, feedback: string[], isInValidPosition: boolean): void {
    const previousPhase = this.phase;

    // Debug: Log EVERY frame with all conditions
    this.log(
      `🔍 REP COUNT CHECK | Phase: ${this.phase} | Avg ESH: ${Math.round(avgESH)}° | ` +
      `Left: ${leftESH}° | Right: ${rightESH}° | ` +
      `Valid Position: ${isInValidPosition} | Rep Started: ${this.repStarted} | ` +
      `Current Rep Count: ${this.repCount}`
    );

    // Down position: arms at sides (low ESH values)
    if (avgESH <= this.MAX_ESH_DOWN) {
      const wasDownBefore = this.phase === 'down';
      this.phase = 'down';
      this.repStarted = true;

      // Log phase transition
      if (previousPhase !== 'down') {
        this.log(
          `✅ PHASE TRANSITION: ${previousPhase} -> down | ` +
          `Avg ESH: ${Math.round(avgESH)}° (threshold: <=${this.MAX_ESH_DOWN}°) | ` +
          `Rep started: ${this.repStarted}`
        );
      } else if (!wasDownBefore) {
        this.log(`🔄 Staying in DOWN phase | Avg ESH: ${Math.round(avgESH)}°`);
      }
    }

    // Debug: Check if we're in the ESH range for "up" position
    const inESHRange = avgESH >= this.MIN_ESH_UP && avgESH <= this.MAX_ESH_UP;
    const canCountRep = inESHRange && this.phase === 'down' && this.repStarted;

    if (inESHRange) {
      this.log(
        `🎯 IN ESH RANGE for UP position! | ` +
        `Avg ESH: ${Math.round(avgESH)}° (range: ${this.MIN_ESH_UP}-${this.MAX_ESH_UP}°) | ` +
        `Current phase: ${this.phase} | ` +
        `Rep started: ${this.repStarted} | ` +
        `Can count rep: ${canCountRep} | ` +
        `Valid position: ${isInValidPosition}`
      );
    }

    // Up position: arms at shoulder level (ESH 80-90) AND previous stage was "down" AND valid position
    if (avgESH >= this.MIN_ESH_UP && avgESH <= this.MAX_ESH_UP && this.phase === 'down' && this.repStarted) {
      this.phase = 'up';

      this.log(
        `⬆️ PHASE CHANGE TO UP! | ` +
        `Avg ESH: ${Math.round(avgESH)}° (${this.MIN_ESH_UP}-${this.MAX_ESH_UP}°) | ` +
        `Previous phase: down | ` +
        `Rep started: true | ` +
        `Valid position: ${isInValidPosition} | ` +
        `Would count rep: ${isInValidPosition ? 'YES ✅' : 'NO ❌ (invalid form)'}`
      );

      // Only count rep if ALL conditions are met (valid position)
      if (isInValidPosition) {
        this.repCount++;
        feedback.push(`✅ Rep ${this.repCount} completed!`);

        // Log rep completion prominently
        this.log(
          `🎉🎉🎉 REP COUNTED! 🎉🎉🎉 | ` +
          `Rep #${this.repCount} | ` +
          `Avg ESH: ${Math.round(avgESH)}° | ` +
          `Left ESH: ${leftESH}° | Right ESH: ${rightESH}° | ` +
          `TRANSITION: down -> up | ` +
          `All conditions met: ✅`
        );
      } else {
        // Rep blocked due to invalid form
        this.log(
          `❌ REP NOT COUNTED - INVALID FORM! | ` +
          `Valid Position: ${isInValidPosition} | ` +
          `Avg ESH: ${Math.round(avgESH)}° (in range) | ` +
          `Phase: ${this.phase} | ` +
          `Rep started: ${this.repStarted}`
        );
        feedback.push("⚠️ Rep not counted - fix your form (posture, arm elevation, visibility)");
      }
    }

    // Warning for arms raised TOO HIGH (ESH above shoulder-level range)
    // ONLY warn when phase is 'up' or when actively raising
    if (avgESH > this.MAX_ESH_WARNING && this.phase === 'up') {
      this.log(
        `⚠️⚠️ WARNING: Arms raised too high above shoulders! ⚠️⚠️ | ` +
        `Avg ESH: ${Math.round(avgESH)}° (max recommended: ${this.MAX_ESH_WARNING}°) | ` +
        `Left: ${leftESH}° | Right: ${rightESH}°`
      );
      feedback.push(`⚠️ That's too high - lower your arms to shoulder level (target: ${this.MIN_ESH_UP}-${this.MAX_ESH_UP}°)`);
    }

    // Guide user to raise arms higher when in mid-range during down phase
    if (avgESH > this.MAX_ESH_DOWN && avgESH < this.MIN_ESH_UP && this.phase === 'down' && this.repStarted) {
      this.log(
        `💡 GUIDANCE: Raise arms higher to reach shoulder level | ` +
        `Avg ESH: ${Math.round(avgESH)}° (target: ${this.MIN_ESH_UP}-${this.MAX_ESH_UP}°)`
      );
    }

    // Debug: Log what the next action should be
    if (this.repStarted) {
      if (this.phase === 'down') {
        this.log(
          `💡 NEXT ACTION: Raise arms to shoulder level (ESH ${this.MIN_ESH_UP}-${this.MAX_ESH_UP}°) | ` +
          `Current: ${Math.round(avgESH)}° | ` +
          `Need: ${avgESH <= this.MAX_ESH_DOWN ? 'Raise arms UP' : avgESH < this.MIN_ESH_UP ? 'Keep raising' : avgESH > this.MAX_ESH_UP ? 'Lower slightly' : 'Almost there!'}`
        );
      } else if (this.phase === 'up') {
        this.log(
          `💡 NEXT ACTION: Lower arms back to sides (ESH <=${this.MAX_ESH_DOWN}°) to complete cycle | ` +
          `Current: ${Math.round(avgESH)}°`
        );
      }
    } else {
      this.log(
        `💡 WAITING TO START: Lower arms to sides (ESH <=${this.MAX_ESH_DOWN}°) to begin | ` +
        `Current: ${Math.round(avgESH)}°`
      );
    }

    // Provide real-time phase feedback
    if (this.repStarted) {
      if (this.phase === 'down' && avgESH > this.MAX_ESH_DOWN && avgESH < this.MIN_ESH_UP) {
        feedback.push("⬆️ Keep raising your arms");
      } else if (this.phase === 'up' && avgESH > this.MAX_ESH_DOWN && avgESH < this.MIN_ESH_UP) {
        feedback.push("⬇️ Lower arms slowly");
      }
    } else {
      if (avgESH > this.MAX_ESH_DOWN) {
        feedback.push("💪 Lower arms to sides to start");
      }
    }
  }

  /**
   * Calculate posture score (0-100)
   * Back angle should be >= 170 degrees for good posture
   */
  private calculatePostureScore(postureAnalysis: PostureAnalysis): number {
    // Back score: closer to 180 is better (perfectly straight)
    const backScore = postureAnalysis.backAngle >= this.BACK_STRAIGHT_THRESHOLD
      ? Math.min(100, ((postureAnalysis.backAngle - this.BACK_STRAIGHT_THRESHOLD) / (180 - this.BACK_STRAIGHT_THRESHOLD)) * 100 + 50)
      : Math.max(0, (postureAnalysis.backAngle / this.BACK_STRAIGHT_THRESHOLD) * 50);

    // Head score: centered above shoulders (headAlignment < 10%)
    const headScore = Math.max(0, 100 - (postureAnalysis.headAlignment / 10) * 50);

    return (backScore + headScore) / 2;
  }

  /**
   * Calculate arm elevation score (0-100)
   * Based on whether ESH angles are in expected down/up ranges.
   */
  private calculateArmElevationScore(armElevationAnalysis: ArmElevationAnalysis): number {
    const scoreOne = (esh: number): number => {
      // Strong score for either clear "down" or clear "up/shoulder-level".
      if (esh <= this.MAX_ESH_DOWN) return 100;
      if (esh >= this.MIN_ESH_UP && esh <= this.MAX_ESH_UP) return 100;

      // Mid-range gets partial score (transition zone).
      if (esh > this.MAX_ESH_DOWN && esh < this.MIN_ESH_UP) {
        const progress = (esh - this.MAX_ESH_DOWN) / (this.MIN_ESH_UP - this.MAX_ESH_DOWN);
        return Math.round(55 + progress * 25); // 55-80
      }

      // Above target shoulder range (too high), penalize progressively.
      return Math.max(0, 100 - (esh - this.MAX_ESH_UP) * 3);
    };

    const leftScore = scoreOne(armElevationAnalysis.leftESH);
    const rightScore = scoreOne(armElevationAnalysis.rightESH);

    return (leftScore + rightScore) / 2;
  }

  /**
   * Reset the analyzer
   */
  reset(): void {
    this.repCount = 0;
    this.phase = 'down';
    this.repStarted = false;
    this.lastESH = { left: 0, right: 0 };
  }

  /**
   * Get current rep count
   */
  getRepCount(): number {
    return this.repCount;
  }
}
