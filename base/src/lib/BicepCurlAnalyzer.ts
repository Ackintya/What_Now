/**
 * Bicep Curl Analyzer
 *
 * Validates:
 * 1. Straight posture (back/head alignment)
 * 2. Arms close to body:
 *    - Arm-body angle: angle between shoulder→elbow and shoulder→hip lines
 *    - ESH angle: elbow→shoulder→hip angle (vertical alignment, matching JS implementation)
 * 3. Full body visibility
 * 4. Proper rep counting based on elbow flexion
 * 5. Leg bending detection
 */

export interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export interface BicepCurlMetrics {
  repCount: number;
  currentAngle: { left: number; right: number };
  formScore: number;
  postureScore: number;
  armPositionScore: number;
  visibilityScore: number;
  feedback: string[];
  isInValidPosition: boolean;
  phase: 'down' | 'up' | 'neutral';
  // Additional metrics for detailed analysis
  eshAngles?: { left: number; right: number }; // Elbow-Shoulder-Hip angles (vertical alignment)
  armBodyAngles?: { left: number; right: number }; // Arm-body angles (directional alignment)
  formValidation?: {
    leftArmScore: number;
    rightArmScore: number;
    leftLegScore: number;
    rightLegScore: number;
  };
  // Leg bending detection
  legBending?: {
    hasLegBend: boolean;
    leftKneeAngle: number;
    rightKneeAngle: number;
  };
}

export interface PostureAnalysis {
  isPostureStraight: boolean;
  backAngle: number;
  headAlignment: number;
  issues: string[];
}

export interface ArmPositionAnalysis {
  isArmCloseToBody: boolean;
  leftArmBodyAngle: number;
  rightArmBodyAngle: number;
  leftESH: number; // Elbow-Shoulder-Hip angle (vertical alignment)
  rightESH: number; // Elbow-Shoulder-Hip angle (vertical alignment)
  issues: string[];
}

export interface CameraDistanceCheck {
  isTooClose: boolean;
  bodyHeightRatio: number;
  feedback: string;
}

export class BicepCurlAnalyzer {
  private repCount: number = 0;
  private lastAngle: { left: number; right: number } = { left: 180, right: 180 };
  private phase: 'down' | 'up' | 'neutral' = 'down';
  private repStarted: boolean = false;
  private logCallback?: (message: string) => void;

  // Thresholds (based on real-world testing - matching JavaScript implementation)
  private readonly MIN_ANGLE_DOWN = 160; // Arm fully extended (buffer from 180)
  private readonly MAX_ANGLE_UP = 30;    // Arm fully flexed (realistic threshold)
  private readonly ARM_BODY_MAX_ANGLE = 15; // Max angle between arm and body (close to 0)
  private readonly ESH_MAX_ANGLE = 30; // Max elbow-shoulder-hip angle (vertical alignment)
  private readonly LEG_BEND_MIN_ANGLE = 160; // Hip-knee-ankle angle should be >= 160 (nearly straight leg)
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
    const logMessage = `[BICEP CURL] ${timestamp} | ${message}`;

    // Log to console
    console.log(logMessage);

    // Call external callback if provided
    if (this.logCallback) {
      this.logCallback(logMessage);
    }
  }

  /**
   * Check for leg bending during exercise (both legs should be straight)
   * Calculates hip-knee-ankle angle for both legs
   */
  private checkLegBending(landmarks: PoseLandmark[], feedback: string[]): {
    hasLegBend: boolean;
    leftKneeAngle: number;
    rightKneeAngle: number;
  } {
    const leftKneeAngle = Math.abs(Math.round(this.calculateAngle(
      landmarks[this.LANDMARKS.LEFT_HIP],
      landmarks[this.LANDMARKS.LEFT_KNEE],
      landmarks[this.LANDMARKS.LEFT_ANKLE]
    )));
    
    const rightKneeAngle = Math.abs(Math.round(this.calculateAngle(
      landmarks[this.LANDMARKS.RIGHT_HIP],
      landmarks[this.LANDMARKS.RIGHT_KNEE],
      landmarks[this.LANDMARKS.RIGHT_ANKLE]
    )));

    const hasLegBend = leftKneeAngle < this.LEG_BEND_MIN_ANGLE || rightKneeAngle < this.LEG_BEND_MIN_ANGLE;
    
    if (hasLegBend) {
      feedback.push(`Don't bend your legs (left: ${leftKneeAngle}, right: ${rightKneeAngle}, min: ${this.LEG_BEND_MIN_ANGLE})`);
    }

    return {
      hasLegBend,
      leftKneeAngle,
      rightKneeAngle,
    };
  }

  /**
   * Main analysis function - call this with each frame's landmarks
   */
  analyze(landmarks: PoseLandmark[]): BicepCurlMetrics {
    const feedback: string[] = [];

    // 1. Check full body visibility
    const visibilityCheck = this.checkFullBodyVisibility(landmarks);
    if (!visibilityCheck.isVisible) {
      return {
        repCount: this.repCount,
        currentAngle: this.lastAngle,
        formScore: 0,
        postureScore: 0,
        armPositionScore: 0,
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

    // 4. Check arm position (should be close to body)
    const armPositionAnalysis = this.analyzeArmPosition(landmarks);
    if (!armPositionAnalysis.isArmCloseToBody) {
      feedback.push(...armPositionAnalysis.issues);
    }

    // 4a. Leg bend check
    const legBendingData = this.checkLegBending(landmarks, feedback);

    // 5. Calculate elbow angles for rep counting
    const leftShoulder = landmarks[this.LANDMARKS.LEFT_SHOULDER];
    const leftElbow = landmarks[this.LANDMARKS.LEFT_ELBOW];
    const leftWrist = landmarks[this.LANDMARKS.LEFT_WRIST];
    const rightShoulder = landmarks[this.LANDMARKS.RIGHT_SHOULDER];
    const rightElbow = landmarks[this.LANDMARKS.RIGHT_ELBOW];
    const rightWrist = landmarks[this.LANDMARKS.RIGHT_WRIST];

    const leftElbowAngle = this.calculateAngle(
      leftShoulder,
      leftElbow,
      leftWrist
    );

    const rightElbowAngle = this.calculateAngle(
      rightShoulder,
      rightElbow,
      rightWrist
    );

    // 6. Rep counting logic (using the better visible arm)
    const avgAngle = (leftElbowAngle + rightElbowAngle) / 2;

    // Calculate isInValidPosition early for rep counting
    const postureCheck = postureAnalysis.isPostureStraight;
    const armCheck = armPositionAnalysis.isArmCloseToBody;
    const visCheck = visibilityCheck.isVisible;
    const distCheck = !distanceCheck.isTooClose;
    const legCheck = !legBendingData.hasLegBend;
    const isInValidPositionEarly = postureCheck && armCheck && visCheck && distCheck && legCheck;

    this.updateRepCount(avgAngle, feedback, isInValidPositionEarly);

    // 7. Calculate scores
    const postureScore = this.calculatePostureScore(postureAnalysis);
    const armPositionScore = this.calculateArmPositionScore(armPositionAnalysis);
    const visibilityScore = visibilityCheck.score;

    // Reduce form score if user is too close to camera
    let formScore = (postureScore + armPositionScore + visibilityScore) / 3;
    if (distanceCheck.isTooClose) {
      formScore = Math.max(0, formScore - 20);
    }

    // Reduce form score if legs are bent
    if (legBendingData.hasLegBend) {
      formScore = Math.max(0, formScore - 15);
    }

    // 8. Check if in valid starting position
    const isInValidPosition =
      postureAnalysis.isPostureStraight &&
      armPositionAnalysis.isArmCloseToBody &&
      visibilityCheck.isVisible &&
      !distanceCheck.isTooClose &&
      !legBendingData.hasLegBend;

    // 9. Add form feedback
    if (formScore < 70) {
      feedback.push("⚠️ Improve form for better results");
    } else if (formScore >= 90) {
      feedback.push("✅ Excellent form!");
    }

    this.lastAngle = { left: leftElbowAngle, right: rightElbowAngle };

    const leftArmScore = armPositionAnalysis.leftESH <= this.ESH_MAX_ANGLE ? 100 : 0;
    const rightArmScore = armPositionAnalysis.rightESH <= this.ESH_MAX_ANGLE ? 100 : 0;
    const leftLegScore = legBendingData.leftKneeAngle >= this.LEG_BEND_MIN_ANGLE ? 100 : 0;
    const rightLegScore = legBendingData.rightKneeAngle >= this.LEG_BEND_MIN_ANGLE ? 100 : 0;

    return {
      repCount: this.repCount,
      currentAngle: { left: leftElbowAngle, right: rightElbowAngle },
      formScore: Math.round(formScore),
      postureScore: Math.round(postureScore),
      armPositionScore: Math.round(armPositionScore),
      visibilityScore: Math.round(visibilityScore),
      feedback,
      isInValidPosition,
      phase: this.phase,
      eshAngles: {
        left: armPositionAnalysis.leftESH,
        right: armPositionAnalysis.rightESH,
      },
      armBodyAngles: {
        left: Math.round(armPositionAnalysis.leftArmBodyAngle),
        right: Math.round(armPositionAnalysis.rightArmBodyAngle),
      },
      formValidation: {
        leftArmScore,
        rightArmScore,
        leftLegScore,
        rightLegScore,
      },
      legBending: legBendingData,
    };
  }

  /**
   * Check camera distance - warn if user is too close to camera
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
   */
  private analyzePosture(landmarks: PoseLandmark[]): PostureAnalysis {
    const issues: string[] = [];

    const leftShoulder = landmarks[this.LANDMARKS.LEFT_SHOULDER];
    const rightShoulder = landmarks[this.LANDMARKS.RIGHT_SHOULDER];
    const leftHip = landmarks[this.LANDMARKS.LEFT_HIP];
    const rightHip = landmarks[this.LANDMARKS.RIGHT_HIP];
    const leftKnee = landmarks[this.LANDMARKS.LEFT_KNEE];
    const rightKnee = landmarks[this.LANDMARKS.RIGHT_KNEE];
    const nose = landmarks[this.LANDMARKS.NOSE];

    const rightBackAngle = this.calculateAngle(
      rightShoulder,
      rightHip,
      rightKnee
    );

    const leftBackAngle = this.calculateAngle(
      leftShoulder,
      leftHip,
      leftKnee
    );

    const backAngle = (rightBackAngle + leftBackAngle) / 2;

    const midShoulder = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2,
      z: (leftShoulder.z + rightShoulder.z) / 2,
      visibility: 1,
    };

    const headAlignment = Math.abs((nose.x - midShoulder.x) * 100);

    const isPostureStraight =
      backAngle >= this.BACK_STRAIGHT_THRESHOLD &&
      headAlignment <= 10;

    if (backAngle < this.BACK_STRAIGHT_THRESHOLD) {
      issues.push(`📐 Stand straighter - back angle: ${Math.round(backAngle)}`);
    }

    if (headAlignment > 10) {
      issues.push(`👤 Keep your head centered`);
    }

    return {
      isPostureStraight,
      backAngle,
      headAlignment,
      issues,
    };
  }

  /**
   * Analyze arm position - arms should be close to body
   */
  private analyzeArmPosition(landmarks: PoseLandmark[]): ArmPositionAnalysis {
    const issues: string[] = [];

    const leftArmBodyAngle = this.calculateArmBodyAngle(
      landmarks[this.LANDMARKS.LEFT_SHOULDER],
      landmarks[this.LANDMARKS.LEFT_ELBOW],
      landmarks[this.LANDMARKS.LEFT_HIP]
    );

    const rightArmBodyAngle = this.calculateArmBodyAngle(
      landmarks[this.LANDMARKS.RIGHT_SHOULDER],
      landmarks[this.LANDMARKS.RIGHT_ELBOW],
      landmarks[this.LANDMARKS.RIGHT_HIP]
    );

    const leftESH = Math.abs(Math.round(this.calculateAngle(
      landmarks[this.LANDMARKS.LEFT_ELBOW],
      landmarks[this.LANDMARKS.LEFT_SHOULDER],
      landmarks[this.LANDMARKS.LEFT_HIP]
    )));

    const rightESH = Math.abs(Math.round(this.calculateAngle(
      landmarks[this.LANDMARKS.RIGHT_ELBOW],
      landmarks[this.LANDMARKS.RIGHT_SHOULDER],
      landmarks[this.LANDMARKS.RIGHT_HIP]
    )));

    const isArmCloseToBody =
      leftArmBodyAngle <= this.ARM_BODY_MAX_ANGLE &&
      rightArmBodyAngle <= this.ARM_BODY_MAX_ANGLE &&
      leftESH <= this.ESH_MAX_ANGLE &&
      rightESH <= this.ESH_MAX_ANGLE;

    if (leftArmBodyAngle > this.ARM_BODY_MAX_ANGLE || rightArmBodyAngle > this.ARM_BODY_MAX_ANGLE) {
      issues.push(`💪 Keep elbows closer`);
    }

    if (leftESH > this.ESH_MAX_ANGLE || rightESH > this.ESH_MAX_ANGLE) {
      issues.push(`💪 Keep elbows in line with shoulders`);
    }

    return {
      isArmCloseToBody,
      leftArmBodyAngle,
      rightArmBodyAngle,
      leftESH,
      rightESH,
      issues,
    };
  }

  /**
   * Calculate angle between arm and body
   */
  private calculateArmBodyAngle(
    shoulder: PoseLandmark,
    elbow: PoseLandmark,
    hip: PoseLandmark
  ): number {
    if (!shoulder || !elbow || !hip) {
      return 0;
    }

    const radians =
      Math.atan2(elbow.y - shoulder.y, elbow.x - shoulder.x) -
      Math.atan2(hip.y - shoulder.y, hip.x - shoulder.x);

    let angle = Math.abs(radians * (180 / Math.PI));

    if (angle > 180.0) {
      angle = 360 - angle;
    }

    if (angle > 90) {
      angle = 180 - angle;
    }

    return angle;
  }

  /**
   * Calculate angle between three points
   */
  private calculateAngle(
    a: PoseLandmark,
    b: PoseLandmark,
    c: PoseLandmark
  ): number {
    if (!a || !b || !c) {
      return 180;
    }

    const angle1 = Math.atan2(a.y - b.y, a.x - b.x);
    const angle2 = Math.atan2(c.y - b.y, c.x - b.x);
    const radians = angle2 - angle1;

    let angle = Math.abs(radians * (180 / Math.PI));

    if (angle > 180.0) {
      angle = 360 - angle;
    }

    return angle;
  }

  /**
   * Update rep count based on elbow angle changes
   */
  private updateRepCount(currentAngle: number, feedback: string[], isInValidPosition: boolean): void {
    const previousPhase = this.phase;

    if (currentAngle > this.MIN_ANGLE_DOWN) {
      this.phase = 'down';
      this.repStarted = true;
    }

    if (currentAngle < this.MAX_ANGLE_UP && this.phase === 'down' && this.repStarted) {
      this.phase = 'up';

      if (isInValidPosition) {
        this.repCount++;
        feedback.push(`✅ Rep ${this.repCount} completed!`);
      } else {
        feedback.push("⚠️ Rep not counted - fix your form");
      }
    }

    if (this.repStarted) {
      if (this.phase === 'down' && currentAngle < this.MIN_ANGLE_DOWN && currentAngle > this.MAX_ANGLE_UP + 20) {
        feedback.push("⬆️ Keep curling up");
      } else if (this.phase === 'up' && currentAngle > this.MAX_ANGLE_UP && currentAngle < this.MIN_ANGLE_DOWN - 20) {
        feedback.push("⬇️ Lower down slowly");
      }
    } else {
      if (currentAngle < this.MIN_ANGLE_DOWN) {
        feedback.push("💪 Extend arms fully to start");
      }
    }
  }

  /**
   * Calculate posture score (0-100)
   */
  private calculatePostureScore(postureAnalysis: PostureAnalysis): number {
    const backScore = postureAnalysis.backAngle >= this.BACK_STRAIGHT_THRESHOLD
      ? Math.min(100, ((postureAnalysis.backAngle - this.BACK_STRAIGHT_THRESHOLD) / (180 - this.BACK_STRAIGHT_THRESHOLD)) * 100 + 50)
      : Math.max(0, (postureAnalysis.backAngle / this.BACK_STRAIGHT_THRESHOLD) * 50);

    const headScore = Math.max(0, 100 - (postureAnalysis.headAlignment / 10) * 50);

    return (backScore + headScore) / 2;
  }

  /**
   * Calculate arm position score (0-100)
   */
  private calculateArmPositionScore(armPositionAnalysis: ArmPositionAnalysis): number {
    const leftScore = Math.max(0, 100 - (armPositionAnalysis.leftArmBodyAngle / this.ARM_BODY_MAX_ANGLE) * 100);
    const rightScore = Math.max(0, 100 - (armPositionAnalysis.rightArmBodyAngle / this.ARM_BODY_MAX_ANGLE) * 100);
    return (leftScore + rightScore) / 2;
  }

  /**
   * Reset the analyzer
   */
  reset(): void {
    this.repCount = 0;
    this.phase = 'down';
    this.repStarted = false;
    this.lastAngle = { left: 180, right: 180 };
  }

  /**
   * Get current rep count
   */
  getRepCount(): number {
    return this.repCount;
  }
}
