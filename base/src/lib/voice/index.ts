/**
 * Voice Feedback System
 * Barrel export for clean imports
 */

// Interfaces and types
export type { IVoiceFeedback, VoiceConfig, VoiceMessage, VoicePriority } from './IVoiceFeedback';

// Voice providers
export { WebSpeechVoice } from './WebSpeechVoice';
export { ElevenLabsVoice } from './ElevenLabsVoice';
export type { ElevenLabsConfig } from './ElevenLabsVoice';

// Voice manager
export { VoiceFeedbackManager } from './VoiceFeedbackManager';
export type { VoiceFeedbackManagerConfig } from './VoiceFeedbackManager';

// Configuration and message templates
export {
  DEFAULT_VOICE_CONFIG,
  BICEP_CURL_MESSAGES,
  LATERAL_RAISE_MESSAGES,
  REP_COUNT_MESSAGES,
  PHASE_MESSAGES,
  SESSION_MESSAGES,
  VOICE_FEEDBACK_SETTINGS,
  getRepCountMessage,
  getRandomEncouragement,
} from './voiceConfig';
