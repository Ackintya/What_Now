/**
 * Voice Feedback Manager
 * Manages voice feedback with message queuing, priority system, and rate limiting
 */

import { IVoiceFeedback, VoiceMessage, VoicePriority } from './IVoiceFeedback';

export interface VoiceFeedbackManagerConfig {
  minMessageInterval?: number; // Minimum milliseconds between messages (default: 3000)
  maxQueueSize?: number; // Maximum messages in queue (default: 4)
  priorityInterrupts?: boolean; // Whether high-priority messages interrupt current speech (default: true)
}

export class VoiceFeedbackManager {
  private provider: IVoiceFeedback;
  private queue: VoiceMessage[] = [];
  private isProcessing: boolean = false;
  private isSpeaking: boolean = false;
  private isEnabled: boolean = true;
  private lastSpeakTime: number = 0;
  private config: Required<VoiceFeedbackManagerConfig>;
  private messageIdCounter: number = 0;

  constructor(
    provider: IVoiceFeedback,
    config: VoiceFeedbackManagerConfig = {}
  ) {
    this.provider = provider;
    this.config = {
      minMessageInterval: config.minMessageInterval ?? 3000,
      maxQueueSize: config.maxQueueSize ?? 4, // Reduced from 10 to 4
      priorityInterrupts: config.priorityInterrupts ?? true,
    };
  }

  /**
   * Queues a message to be spoken
   * @param text - The text to speak
   * @param priority - Message priority (high, medium, low)
   * @returns Message ID (for potential cancellation)
   */
  queueMessage(text: string, priority: VoicePriority = 'medium'): string {
    if (!this.isEnabled) {
      console.log(`🔇 Voice disabled, not queueing: "${text}"`);
      return '';
    }

    const message: VoiceMessage = {
      text,
      priority,
      timestamp: Date.now(),
      id: `msg_${this.messageIdCounter++}`,
    };

    console.log(`📝 Queueing message [${priority}]: "${text}" | Queue size: ${this.queue.length} | Currently speaking: ${this.isSpeaking}`);

    // Handle high-priority messages
    if (priority === 'high') {
      // Remove all low-priority messages from queue
      const beforeSize = this.queue.length;
      this.queue = this.queue.filter((msg) => msg.priority !== 'low');
      const removed = beforeSize - this.queue.length;
      if (removed > 0) {
        console.log(`🗑️ Removed ${removed} low-priority messages for high-priority message`);
      }

      // Interrupt current speech if configured
      if (this.config.priorityInterrupts && this.isSpeaking) {
        console.log(`⚠️ Interrupting current speech for high-priority message`);
        this.provider.stop();
        this.isSpeaking = false;
      }

      // Add to front of queue
      this.queue.unshift(message);
      console.log(`⏫ HIGH priority message added to front of queue`);
    } else {
      // Add to queue based on priority
      this.queue.push(message);
      this.sortQueue();

      // Enforce max queue size (remove oldest low-priority messages)
      while (this.queue.length > this.config.maxQueueSize) {
        const lowPriorityIndex = this.queue.findIndex(
          (msg) => msg.priority === 'low'
        );
        if (lowPriorityIndex !== -1) {
          const removed = this.queue.splice(lowPriorityIndex, 1)[0];
          console.log(`🗑️ Queue full, removed low-priority: "${removed.text}"`);
        } else {
          // If no low-priority messages, remove oldest medium-priority
          const mediumPriorityIndex = this.queue.findIndex(
            (msg) => msg.priority === 'medium'
          );
          if (mediumPriorityIndex !== -1) {
            const removed = this.queue.splice(mediumPriorityIndex, 1)[0];
            console.log(`🗑️ Queue full, removed medium-priority: "${removed.text}"`);
          } else {
            break; // Don't remove high-priority messages
          }
        }
      }
    }

    console.log(`📊 Queue state: ${this.queue.length} messages | Next: "${this.queue[0]?.text || 'none'}"`);

    // Start processing if not already processing
    if (!this.isProcessing) {
      this.processQueue();
    }

    return message.id;
  }

  /**
   * Sorts queue by priority (high > medium > low)
   */
  private sortQueue(): void {
    const priorityOrder: Record<VoicePriority, number> = {
      high: 3,
      medium: 2,
      low: 1,
    };

    this.queue.sort((a, b) => {
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      // If same priority, maintain FIFO order
      return a.timestamp - b.timestamp;
    });
  }

  /**
   * Processes the message queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || !this.isEnabled) {
      console.log(`⏸️ Process queue skipped - Processing: ${this.isProcessing}, Enabled: ${this.isEnabled}`);
      return;
    }

    this.isProcessing = true;
    console.log(`▶️ Starting queue processing - ${this.queue.length} messages in queue`);

    while (this.queue.length > 0) {
      // Check rate limiting
      const now = Date.now();
      const timeSinceLastSpeak = now - this.lastSpeakTime;

      // HIGH priority messages bypass rate limiting for immediate feedback
      const nextMessage = this.queue[0];
      if (nextMessage && nextMessage.priority === 'high') {
        console.log(`⚡ HIGH priority message detected - bypassing rate limit for immediate speech`);
      } else if (timeSinceLastSpeak < this.config.minMessageInterval) {
        const waitTime = this.config.minMessageInterval - timeSinceLastSpeak;
        console.log(`⏱️ Rate limiting: waiting ${waitTime}ms before next message`);
        // Wait for rate limit cooldown
        await this.sleep(waitTime);
      }

      // Get next message
      const message = this.queue.shift();
      if (!message) break;

      // Skip low-priority messages if queue is busy
      if (message.priority === 'low' && this.queue.length > 2) {
        console.log(`⏭️ Skipping low-priority message (queue busy): "${message.text}"`);
        continue;
      }

      // Speak the message
      try {
        console.log(`🔊 SPEAKING NOW [${message.priority}]: "${message.text}" | Queue remaining: ${this.queue.length} | Time since last: ${timeSinceLastSpeak}ms`);
        this.isSpeaking = true;
        const speakStartTime = Date.now();
        this.lastSpeakTime = speakStartTime;

        await this.provider.speak(message.text);

        const speakDuration = Date.now() - speakStartTime;
        console.log(`✅ Finished speaking: "${message.text}" | Duration: ${speakDuration}ms`);
      } catch (error) {
        console.error(`❌ Error speaking message "${message.text}":`, error);
      } finally {
        this.isSpeaking = false;
      }
    }

    this.isProcessing = false;
    console.log(`⏹️ Queue processing complete`);
  }

  /**
   * Helper function to sleep for a given duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Sets the voice provider
   */
  setProvider(provider: IVoiceFeedback): void {
    // Stop current speech
    this.provider.stop();
    this.provider = provider;
  }

  /**
   * Enables voice feedback
   */
  enable(): void {
    this.isEnabled = true;
    if (!this.isProcessing && this.queue.length > 0) {
      this.processQueue();
    }
  }

  /**
   * Disables voice feedback
   */
  disable(): void {
    this.isEnabled = false;
    this.provider.stop();
    this.isSpeaking = false;
  }

  /**
   * Toggles voice feedback on/off
   */
  toggle(): boolean {
    if (this.isEnabled) {
      this.disable();
    } else {
      this.enable();
    }
    return this.isEnabled;
  }

  /**
   * Sets the volume
   */
  setVolume(volume: number): void {
    this.provider.setVolume(volume);
  }

  /**
   * Clears the message queue
   */
  clearQueue(): void {
    this.queue = [];
  }

  /**
   * Removes all rep count messages from the queue
   * Rep count messages are identified by containing only numbers or number words
   */
  clearRepCountMessages(): void {
    const repCountPatterns = [
      /^(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)$/i,
      /^\d+$/,
      /^(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)[\s-]?(one|two|three|four|five|six|seven|eight|nine)?$/i,
      /^(one|a)\s+hundred/i,
    ];

    this.queue = this.queue.filter((message) => {
      const text = message.text.trim().toLowerCase();
      // Check if message matches any rep count pattern
      const isRepCount = repCountPatterns.some((pattern) => pattern.test(text));
      return !isRepCount; // Keep messages that are NOT rep counts
    });
  }

  /**
   * Stops current speech and clears queue
   */
  stopAndClear(): void {
    this.provider.stop();
    this.isSpeaking = false;
    this.clearQueue();
  }

  /**
   * Gets the current queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Checks if voice feedback is enabled
   */
  isVoiceEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Checks if currently speaking
   */
  isSpeakingNow(): boolean {
    return this.isSpeaking;
  }

  /**
   * Updates configuration
   */
  updateConfig(config: Partial<VoiceFeedbackManagerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Gets the underlying voice provider
   */
  getProvider(): IVoiceFeedback {
    return this.provider;
  }
}
