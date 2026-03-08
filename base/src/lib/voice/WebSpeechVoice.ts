/**
 * Web Speech API Voice Provider
 * Uses the browser's built-in Speech Synthesis API
 */

import { IVoiceFeedback, VoiceConfig } from './IVoiceFeedback';

export class WebSpeechVoice implements IVoiceFeedback {
  private config: VoiceConfig;
  private synthesis: SpeechSynthesis | null = null;
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  constructor(config: VoiceConfig = {}) {
    this.config = {
      rate: config.rate ?? 1.0,
      pitch: config.pitch ?? 1.0,
      volume: config.volume ?? 1.0,
      language: config.language ?? 'en-US',
      voice: config.voice,
    };

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis;
      this.loadVoices();

      // Voices may load asynchronously
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => {
          this.loadVoices();
        };
      }
    }
  }

  /**
   * Loads and selects the best available voice
   * Prefers natural, female voices for fitness coaching
   */
  private loadVoices(): void {
    if (!this.synthesis) return;

    const voices = this.synthesis.getVoices();
    if (voices.length === 0) return;

    // If a specific voice is requested, try to find it
    if (this.config.voice) {
      const requestedVoice = voices.find(
        (v) => v.name === this.config.voice
      );
      if (requestedVoice) {
        this.selectedVoice = requestedVoice;
        return;
      }
    }

    // Otherwise, select the best voice for the language
    const languageVoices = voices.filter(
      (v) => v.lang.startsWith(this.config.language?.substring(0, 2) || 'en')
    );

    if (languageVoices.length === 0) {
      // Fallback to any English voice
      this.selectedVoice = voices.find((v) => v.lang.startsWith('en')) || voices[0];
      return;
    }

    // Prefer natural-sounding voices (often contain 'natural', 'premium', 'enhanced')
    const naturalVoice = languageVoices.find(
      (v) =>
        v.name.toLowerCase().includes('natural') ||
        v.name.toLowerCase().includes('premium') ||
        v.name.toLowerCase().includes('enhanced')
    );

    if (naturalVoice) {
      this.selectedVoice = naturalVoice;
      return;
    }

    // Prefer female voices for fitness coaching (often contain 'female', 'samantha', 'victoria')
    const femaleVoice = languageVoices.find(
      (v) =>
        v.name.toLowerCase().includes('female') ||
        v.name.toLowerCase().includes('samantha') ||
        v.name.toLowerCase().includes('victoria') ||
        v.name.toLowerCase().includes('karen') ||
        v.name.toLowerCase().includes('zira')
    );

    if (femaleVoice) {
      this.selectedVoice = femaleVoice;
      return;
    }

    // Fallback to first voice in language
    this.selectedVoice = languageVoices[0];
  }

  async speak(text: string, config?: Partial<VoiceConfig>): Promise<void> {
    if (!this.isSupported()) {
      console.warn('🚫 Web Speech API is not supported in this browser');
      return Promise.resolve();
    }

    // Stop any currently playing speech
    this.stop();

    console.log(`🎤 WebSpeechVoice.speak() called: "${text}"`);

    return new Promise((resolve, reject) => {
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        this.currentUtterance = utterance;

        // Apply configuration
        const finalConfig = { ...this.config, ...config };
        utterance.rate = finalConfig.rate ?? 1.0;
        utterance.pitch = finalConfig.pitch ?? 1.0;
        utterance.volume = finalConfig.volume ?? 1.0;
        utterance.lang = finalConfig.language ?? 'en-US';

        // Set voice if available
        if (this.selectedVoice) {
          utterance.voice = this.selectedVoice;
          console.log(`🗣️ Using voice: ${this.selectedVoice.name}`);
        } else {
          console.log(`⚠️ No voice selected, using default`);
        }

        console.log(`🔧 Voice config - Rate: ${utterance.rate}, Pitch: ${utterance.pitch}, Volume: ${utterance.volume}, Lang: ${utterance.lang}`);

        // Event handlers
        utterance.onstart = () => {
          console.log(`▶️ Speech started: "${text}"`);
        };

        utterance.onend = () => {
          console.log(`✅ Speech ended: "${text}"`);
          this.currentUtterance = null;
          resolve();
        };

        utterance.onerror = (event) => {
          console.error(`❌ Speech synthesis error for "${text}":`, event.error, event);
          this.currentUtterance = null;
          // Don't reject - resolve instead to prevent breaking the queue
          resolve();
        };

        // Speak
        console.log(`📢 Calling speechSynthesis.speak() for: "${text}"`);
        this.synthesis!.speak(utterance);

        // Check if synthesis is working
        setTimeout(() => {
          if (this.synthesis && !this.synthesis.speaking && !this.synthesis.pending) {
            console.warn(`⚠️ Speech synthesis may not be working - speaking: false, pending: false`);
          } else {
            console.log(`✓ Speech synthesis status - speaking: ${this.synthesis?.speaking}, pending: ${this.synthesis?.pending}`);
          }
        }, 100);
      } catch (error) {
        console.error('❌ Error in speak():', error);
        this.currentUtterance = null;
        resolve(); // Resolve instead of reject to prevent breaking the queue
      }
    });
  }

  stop(): void {
    if (!this.synthesis) return;

    try {
      this.synthesis.cancel();
      this.currentUtterance = null;
    } catch (error) {
      console.error('Error stopping speech:', error);
    }
  }

  setVolume(volume: number): void {
    this.config.volume = Math.max(0, Math.min(1, volume));
  }

  isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'speechSynthesis' in window &&
      this.synthesis !== null
    );
  }

  getConfig(): VoiceConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<VoiceConfig>): void {
    this.config = { ...this.config, ...config };

    // Reload voices if language or voice name changed
    if (config.language || config.voice) {
      this.loadVoices();
    }
  }

  /**
   * Gets available voices
   * Useful for UI to let users select their preferred voice
   */
  getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!this.synthesis) return [];
    return this.synthesis.getVoices();
  }

  /**
   * Gets the currently selected voice
   */
  getSelectedVoice(): SpeechSynthesisVoice | null {
    return this.selectedVoice;
  }
}
