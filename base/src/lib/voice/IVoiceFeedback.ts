/**
 * Voice Feedback Interface
 * Defines the contract for all voice feedback providers
 */

export type VoicePriority = 'high' | 'medium' | 'low';

export interface VoiceConfig {
  rate?: number; // Speed of speech (0.1 - 10, default 1)
  pitch?: number; // Pitch of voice (0 - 2, default 1)
  volume?: number; // Volume (0 - 1, default 1)
  language?: string; // Language code (e.g., 'en-US')
  voice?: string; // Specific voice name (optional)
}

export interface VoiceMessage {
  text: string;
  priority: VoicePriority;
  timestamp: number;
  id: string;
}

export interface IVoiceFeedback {
  /**
   * Speaks the given text with optional configuration
   * @param text - The text to speak
   * @param config - Optional voice configuration
   * @returns Promise that resolves when speech completes
   */
  speak(text: string, config?: Partial<VoiceConfig>): Promise<void>;

  /**
   * Stops any currently playing speech
   */
  stop(): void;

  /**
   * Sets the volume for future speech
   * @param volume - Volume level (0 - 1)
   */
  setVolume(volume: number): void;

  /**
   * Checks if this voice provider is supported in the current environment
   * @returns true if supported, false otherwise
   */
  isSupported(): boolean;

  /**
   * Gets the current configuration
   */
  getConfig(): VoiceConfig;

  /**
   * Updates the configuration
   */
  updateConfig(config: Partial<VoiceConfig>): void;
}
