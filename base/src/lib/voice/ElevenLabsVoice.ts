/**
 * ElevenLabs Voice Provider (Stub Implementation)
 * This is a placeholder for future ElevenLabs integration
 */

import { IVoiceFeedback, VoiceConfig } from './IVoiceFeedback';
import { WebSpeechVoice } from './WebSpeechVoice';

export interface ElevenLabsConfig extends VoiceConfig {
  apiKey?: string;
  voiceId?: string; // ElevenLabs voice ID
  modelId?: string; // ElevenLabs model ID
}

export class ElevenLabsVoice implements IVoiceFeedback {
  private config: ElevenLabsConfig;
  private fallbackProvider: WebSpeechVoice;
  private isElevenLabsAvailable: boolean = false;

  constructor(config: ElevenLabsConfig = {}) {
    this.config = {
      rate: config.rate ?? 1.0,
      pitch: config.pitch ?? 1.0,
      volume: config.volume ?? 1.0,
      language: config.language ?? 'en-US',
      apiKey: config.apiKey,
      voiceId: config.voiceId ?? 'EXAVITQu4vr4xnSDxMaL', // Default: Bella (warm, engaging)
      modelId: config.modelId ?? 'eleven_monolingual_v1',
    };

    // Create fallback provider
    this.fallbackProvider = new WebSpeechVoice({
      rate: this.config.rate,
      pitch: this.config.pitch,
      volume: this.config.volume,
      language: this.config.language,
    });

    // TODO: Check if ElevenLabs API is available
    this.checkElevenLabsAvailability();
  }

  /**
   * Checks if ElevenLabs API is available and properly configured
   */
  private async checkElevenLabsAvailability(): Promise<void> {
    // TODO: Implement ElevenLabs API availability check
    // - Verify API key is present
    // - Test API connection
    // - Check rate limits

    if (!this.config.apiKey) {
      console.warn('ElevenLabs API key not provided, falling back to Web Speech');
      this.isElevenLabsAvailable = false;
      return;
    }

    // TODO: Make test API call to verify key and connectivity
    // For now, assume unavailable
    this.isElevenLabsAvailable = false;
  }

  async speak(text: string, config?: Partial<VoiceConfig>): Promise<void> {
    // TODO: Implement ElevenLabs text-to-speech
    // 1. Make API call to ElevenLabs
    // 2. Get audio stream
    // 3. Play audio using Web Audio API
    // 4. Handle errors and fallback

    if (!this.isElevenLabsAvailable) {
      console.log('Using Web Speech fallback for:', text);
      return this.fallbackProvider.speak(text, config);
    }

    // TODO: ElevenLabs implementation
    /*
    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${this.config.voiceId}`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': this.config.apiKey!,
          },
          body: JSON.stringify({
            text,
            model_id: this.config.modelId,
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audio.volume = this.config.volume ?? 1.0;

      return new Promise((resolve, reject) => {
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        audio.onerror = (error) => {
          URL.revokeObjectURL(audioUrl);
          reject(error);
        };
        audio.play();
      });
    } catch (error) {
      console.error('ElevenLabs error, falling back to Web Speech:', error);
      return this.fallbackProvider.speak(text, config);
    }
    */

    // Current implementation: fallback
    return this.fallbackProvider.speak(text, config);
  }

  stop(): void {
    // TODO: Implement stopping ElevenLabs audio playback
    // For now, use fallback
    this.fallbackProvider.stop();
  }

  setVolume(volume: number): void {
    this.config.volume = Math.max(0, Math.min(1, volume));
    this.fallbackProvider.setVolume(volume);
  }

  isSupported(): boolean {
    // Always supported due to fallback
    return this.isElevenLabsAvailable || this.fallbackProvider.isSupported();
  }

  getConfig(): VoiceConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<ElevenLabsConfig>): void {
    this.config = { ...this.config, ...config };

    // Update fallback provider
    this.fallbackProvider.updateConfig({
      rate: config.rate,
      pitch: config.pitch,
      volume: config.volume,
      language: config.language,
    });

    // Re-check availability if API key changed
    if (config.apiKey) {
      this.checkElevenLabsAvailability();
    }
  }

  /**
   * Sets the ElevenLabs API key
   */
  setApiKey(apiKey: string): void {
    this.config.apiKey = apiKey;
    this.checkElevenLabsAvailability();
  }

  /**
   * Sets the ElevenLabs voice ID
   */
  setVoiceId(voiceId: string): void {
    this.config.voiceId = voiceId;
  }

  /**
   * Checks if currently using ElevenLabs or fallback
   */
  isUsingElevenLabs(): boolean {
    return this.isElevenLabsAvailable;
  }
}
