/**
 * Voice Configuration and Message Templates
 * Defines message templates and priorities for exercise feedback
 */

import { VoicePriority, VoiceConfig } from './IVoiceFeedback';

export interface VoiceMessage {
  text: string;
  priority: VoicePriority;
}

/**
 * Default voice configuration
 */
export const DEFAULT_VOICE_CONFIG: VoiceConfig = {
  rate: 1.0, // Normal speech rate
  pitch: 1.0, // Normal pitch
  volume: 0.8, // Slightly lower than max to avoid distortion
  language: 'en-US',
};

/**
 * Message templates for Bicep Curls
 */
export const BICEP_CURL_MESSAGES = {
  // High priority - Safety and critical form
  MOVE_BACK: {
    text: 'Move back from the camera',
    priority: 'high' as VoicePriority,
  },
  STAND_STRAIGHT: {
    text: 'Stand up straight',
    priority: 'high' as VoicePriority,
  },
  TOO_CLOSE: {
    text: 'Step back a little',
    priority: 'high' as VoicePriority,
  },
  LEGS_BENT: {
    text: "Don't bend your legs",
    priority: 'high' as VoicePriority,
  },

  // Medium priority - Form corrections
  ELBOWS_CLOSE: {
    text: 'Keep your elbows close to your body',
    priority: 'medium' as VoicePriority,
  },
  ELBOW_POSITION: {
    text: 'Watch your elbow position',
    priority: 'medium' as VoicePriority,
  },
  FULL_RANGE: {
    text: 'Use full range of motion',
    priority: 'medium' as VoicePriority,
  },
  CONTROL_DESCENT: {
    text: 'Control the descent',
    priority: 'medium' as VoicePriority,
  },

  // Low priority - Encouragement
  GOOD_FORM: {
    text: 'Good form',
    priority: 'low' as VoicePriority,
  },
  EXCELLENT: {
    text: 'Excellent',
    priority: 'low' as VoicePriority,
  },
  KEEP_IT_UP: {
    text: 'Keep it up',
    priority: 'low' as VoicePriority,
  },
  NICE_WORK: {
    text: 'Nice work',
    priority: 'low' as VoicePriority,
  },
};

/**
 * Message templates for Lateral Raises
 */
export const LATERAL_RAISE_MESSAGES = {
  // High priority - Safety and critical form
  MOVE_BACK: {
    text: 'Move back from the camera',
    priority: 'high' as VoicePriority,
  },
  STAND_STRAIGHT: {
    text: 'Stand up straight',
    priority: 'high' as VoicePriority,
  },
  TOO_CLOSE: {
    text: 'Step back a little',
    priority: 'high' as VoicePriority,
  },
  ARMS_TOO_HIGH: {
    text: 'Too high, lower to shoulder level',
    priority: 'high' as VoicePriority,
  },
  LEGS_BENT: {
    text: "Don't bend your legs",
    priority: 'high' as VoicePriority,
  },

  // Medium priority - Form corrections
  RAISE_TO_SHOULDER: {
    text: 'Raise to shoulder level',
    priority: 'medium' as VoicePriority,
  },
  TOO_HIGH: {
    text: 'Too high, lower slightly',
    priority: 'medium' as VoicePriority,
  },
  RAISE_HIGHER: {
    text: 'Raise your arms higher',
    priority: 'medium' as VoicePriority,
  },
  ARMS_STRAIGHT: {
    text: 'Keep your arms straight',
    priority: 'medium' as VoicePriority,
  },
  CONTROL_MOVEMENT: {
    text: 'Control the movement',
    priority: 'medium' as VoicePriority,
  },
  SHOULDER_HEIGHT: {
    text: 'Aim for shoulder height',
    priority: 'medium' as VoicePriority,
  },

  // Low priority - Encouragement
  GOOD_FORM: {
    text: 'Good form',
    priority: 'low' as VoicePriority,
  },
  EXCELLENT: {
    text: 'Excellent',
    priority: 'low' as VoicePriority,
  },
  PERFECT_HEIGHT: {
    text: 'Perfect height',
    priority: 'low' as VoicePriority,
  },
  NICE_WORK: {
    text: 'Nice work',
    priority: 'low' as VoicePriority,
  },
};

/**
 * Rep count messages (high priority)
 */
export const REP_COUNT_MESSAGES: Record<number, VoiceMessage> = {
  1: { text: 'One', priority: 'high' },
  2: { text: 'Two', priority: 'high' },
  3: { text: 'Three', priority: 'high' },
  4: { text: 'Four', priority: 'high' },
  5: { text: 'Five', priority: 'high' },
  6: { text: 'Six', priority: 'high' },
  7: { text: 'Seven', priority: 'high' },
  8: { text: 'Eight', priority: 'high' },
  9: { text: 'Nine', priority: 'high' },
  10: { text: 'Ten', priority: 'high' },
  11: { text: 'Eleven', priority: 'high' },
  12: { text: 'Twelve', priority: 'high' },
  13: { text: 'Thirteen', priority: 'high' },
  14: { text: 'Fourteen', priority: 'high' },
  15: { text: 'Fifteen', priority: 'high' },
  16: { text: 'Sixteen', priority: 'high' },
  17: { text: 'Seventeen', priority: 'high' },
  18: { text: 'Eighteen', priority: 'high' },
  19: { text: 'Nineteen', priority: 'high' },
  20: { text: 'Twenty', priority: 'high' },
};

/**
 * Milestone rep counts (every 5 reps after 20)
 */
export function getRepCountMessage(repCount: number): VoiceMessage {
  if (repCount <= 20) {
    return REP_COUNT_MESSAGES[repCount] || { text: `${repCount}`, priority: 'high' };
  }

  // For reps > 20, announce every 5 reps
  if (repCount % 5 === 0) {
    return { text: `${repCount}`, priority: 'high' };
  }

  // Don't announce non-milestone reps after 20
  return { text: '', priority: 'low' };
}

/**
 * Phase transition messages (low priority - optional)
 */
export const PHASE_MESSAGES = {
  UP_PHASE: {
    text: 'Up',
    priority: 'low' as VoicePriority,
  },
  DOWN_PHASE: {
    text: 'Down',
    priority: 'low' as VoicePriority,
  },
  REST: {
    text: 'Rest',
    priority: 'low' as VoicePriority,
  },
};

/**
 * Session messages
 */
export const SESSION_MESSAGES = {
  START: {
    text: 'Ready to begin',
    priority: 'medium' as VoicePriority,
  },
  PAUSE: {
    text: 'Workout paused',
    priority: 'medium' as VoicePriority,
  },
  RESUME: {
    text: 'Resuming workout',
    priority: 'medium' as VoicePriority,
  },
  COMPLETE: {
    text: 'Workout complete, great job',
    priority: 'medium' as VoicePriority,
  },
};

/**
 * Helper function to get random encouragement message
 */
export function getRandomEncouragement(exerciseType: 'bicep' | 'lateral'): VoiceMessage {
  const messages = exerciseType === 'bicep'
    ? [
        BICEP_CURL_MESSAGES.GOOD_FORM,
        BICEP_CURL_MESSAGES.EXCELLENT,
        BICEP_CURL_MESSAGES.KEEP_IT_UP,
        BICEP_CURL_MESSAGES.NICE_WORK,
      ]
    : [
        LATERAL_RAISE_MESSAGES.GOOD_FORM,
        LATERAL_RAISE_MESSAGES.EXCELLENT,
        LATERAL_RAISE_MESSAGES.PERFECT_HEIGHT,
        LATERAL_RAISE_MESSAGES.NICE_WORK,
      ];

  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Configurable settings for voice feedback behavior
 */
export const VOICE_FEEDBACK_SETTINGS = {
  // Rate limiting - REDUCED for more responsive feedback
  MIN_MESSAGE_INTERVAL: 1500, // 1.5 seconds between messages (reduced from 3s)

  // Queue management - REDUCED from 10 to 4 for more responsive feedback
  MAX_QUEUE_SIZE: 4,

  // Form correction thresholds
  BACK_ANGLE_THRESHOLD: 170, // degrees
  DISTANCE_TOO_CLOSE: 0.5, // normalized distance
  ELBOW_SPREAD_THRESHOLD: 0.15, // normalized distance

  // Lateral raise angle thresholds
  LATERAL_MIN_ANGLE: 70, // degrees - minimum for good form
  LATERAL_TARGET_ANGLE: 90, // degrees - shoulder height
  LATERAL_MAX_ANGLE: 100, // degrees - too high
  LATERAL_ARMS_TOO_HIGH_THRESHOLD: 80, // ESH threshold for "arms too high" warning

  // Leg bend angle thresholds
  LEG_BEND_MIN_ANGLE: 160, // Hip-knee-ankle angle (bent if < 160)

  // Voice event rate limiting (in milliseconds) - REDUCED for critical messages
  ARMS_TOO_HIGH_RATE_LIMIT: 3000, // Once every 3 seconds (reduced from 5s)
  LEG_BEND_RATE_LIMIT: 3000, // Once every 3 seconds (reduced from 5s) - CRITICAL safety message

  // Encouragement frequency
  ENCOURAGEMENT_EVERY_N_REPS: 5, // Give encouragement every 5 good reps

  // Volume settings
  DEFAULT_VOLUME: 0.8,
  MIN_VOLUME: 0.0,
  MAX_VOLUME: 1.0,
};
