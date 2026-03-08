# Voice Feedback System

A complete, production-ready modular voice feedback system for the exercise tracker that can easily swap between Web Speech API and ElevenLabs.

## Architecture

The voice feedback system is built on a **provider pattern** with a clean interface-based architecture, making it easy to swap voice providers without changing the rest of your application.

### Core Components

```
voice/
├── IVoiceFeedback.ts          # Interface defining voice provider contract
├── WebSpeechVoice.ts          # Web Speech API implementation
├── ElevenLabsVoice.ts         # ElevenLabs API implementation (stub)
├── VoiceFeedbackManager.ts    # Queue manager with priority system
├── voiceConfig.ts             # Message templates and configuration
└── index.ts                   # Barrel exports
```

## Features

- **Modular Provider System**: Easily swap between Web Speech API and ElevenLabs
- **Priority Queue**: High, medium, and low priority messages
- **Rate Limiting**: Prevents message spam (configurable, default 3 seconds)
- **Smart Interruption**: High-priority messages can interrupt current speech
- **Message Deduplication**: Prevents repetitive warnings
- **Volume Control**: Adjustable volume with mute/unmute
- **Voice Selection**: Prefers natural, female voices for coaching
- **TypeScript**: Full type safety throughout

## Quick Start

### Basic Usage

```typescript
import { VoiceFeedbackManager, WebSpeechVoice } from '@/lib/voice';

// Initialize voice provider
const voiceProvider = new WebSpeechVoice({
  rate: 1.0,      // Speed (0.1 - 10)
  pitch: 1.0,     // Pitch (0 - 2)
  volume: 0.8,    // Volume (0 - 1)
  language: 'en-US'
});

// Create manager
const voiceManager = new VoiceFeedbackManager(voiceProvider, {
  minMessageInterval: 3000,    // 3 seconds between messages
  maxQueueSize: 10,            // Max 10 queued messages
  priorityInterrupts: true     // High priority interrupts current speech
});

// Queue messages
voiceManager.queueMessage('Stand up straight', 'high');
voiceManager.queueMessage('Keep elbows close', 'medium');
voiceManager.queueMessage('Good form', 'low');
```

### Using Message Templates

```typescript
import {
  BICEP_CURL_MESSAGES,
  LATERAL_RAISE_MESSAGES,
  getRepCountMessage,
  getRandomEncouragement
} from '@/lib/voice';

// Rep count
const repMsg = getRepCountMessage(5);
voiceManager.queueMessage(repMsg.text, repMsg.priority); // "Five"

// Form correction
voiceManager.queueMessage(
  BICEP_CURL_MESSAGES.ELBOWS_CLOSE.text,
  BICEP_CURL_MESSAGES.ELBOWS_CLOSE.priority
);

// Random encouragement
const encouragement = getRandomEncouragement('bicep');
voiceManager.queueMessage(encouragement.text, encouragement.priority);
```

## Integration with Exercise Tracker

The voice feedback system is integrated into `/src/app/fitness/page.tsx`:

### Voice Triggers

**High Priority (Immediate, interrupt current speech):**
- Rep count: "One", "Two", "Three", etc.
- "Move back from camera" (too close)
- "Stand up straight" (poor posture, back angle < 170°)

**Medium Priority (Queue, no interruption):**
- "Keep elbows close" (bicep curl - elbows spread)
- "Raise to shoulder level" (lateral raises - arms too low)
- "Too high, lower slightly" (lateral raises - arms > 90°)

**Low Priority (Skip if queue busy):**
- "Good form"
- "Excellent"
- "Perfect height"
- Encouragement messages

### Voice Feedback Logic

```typescript
// Rep completed
if (newMetrics.repCount > lastRepCountRef.current) {
  const repMessage = getRepCountMessage(newMetrics.repCount);
  voiceManager.queueMessage(repMessage.text, 'high');
}

// Posture warning (rate limited to every 8 seconds)
if (newMetrics.postureScore < 70 && now - lastPostureWarningRef.current > 8000) {
  voiceManager.queueMessage('Stand up straight', 'high');
  lastPostureWarningRef.current = now;
}

// Form corrections (rate limited to every 10 seconds)
if (bicepMetrics.armPositionScore < 70 && now - lastElbowWarningRef.current > 10000) {
  voiceManager.queueMessage('Keep elbows close', 'medium');
  lastElbowWarningRef.current = now;
}
```

## API Reference

### IVoiceFeedback Interface

```typescript
interface IVoiceFeedback {
  speak(text: string, config?: Partial<VoiceConfig>): Promise<void>;
  stop(): void;
  setVolume(volume: number): void;
  isSupported(): boolean;
  getConfig(): VoiceConfig;
  updateConfig(config: Partial<VoiceConfig>): void;
}
```

### VoiceFeedbackManager

#### Constructor
```typescript
constructor(
  provider: IVoiceFeedback,
  config?: VoiceFeedbackManagerConfig
)
```

#### Methods

**`queueMessage(text: string, priority: VoicePriority): string`**
- Queues a message to be spoken
- Returns message ID for tracking
- Priority: `'high' | 'medium' | 'low'`

**`enable() / disable()`**
- Enable or disable voice feedback
- When disabled, no messages are spoken

**`toggle(): boolean`**
- Toggles voice feedback on/off
- Returns new state

**`setVolume(volume: number)`**
- Sets volume (0 - 1)

**`setProvider(provider: IVoiceFeedback)`**
- Swaps the voice provider
- Stops current speech

**`stopAndClear()`**
- Stops current speech and clears queue

**`clearQueue()`**
- Clears message queue without stopping speech

**`getQueueSize(): number`**
- Returns number of queued messages

### WebSpeechVoice

Uses the browser's built-in Speech Synthesis API.

#### Constructor
```typescript
constructor(config?: VoiceConfig)
```

#### Features
- Automatic voice selection (prefers natural, female voices)
- Multi-language support
- Configurable rate, pitch, volume
- Error handling and graceful degradation

#### Methods
All methods from `IVoiceFeedback`, plus:

**`getAvailableVoices(): SpeechSynthesisVoice[]`**
- Returns all available voices in browser

**`getSelectedVoice(): SpeechSynthesisVoice | null`**
- Returns currently selected voice

### ElevenLabsVoice (Stub)

Future implementation for ElevenLabs API integration.

#### Constructor
```typescript
constructor(config?: ElevenLabsConfig)
```

#### Current Behavior
- Falls back to Web Speech API
- API key not implemented yet
- Ready for future integration

#### Future Implementation
Will use ElevenLabs API for high-quality voice synthesis:
- Natural-sounding AI voices
- Multiple voice options
- Streaming audio
- Rate limit handling

## Message Templates

### Bicep Curl Messages

```typescript
BICEP_CURL_MESSAGES.STAND_STRAIGHT    // "Stand up straight"
BICEP_CURL_MESSAGES.ELBOWS_CLOSE      // "Keep your elbows close to your body"
BICEP_CURL_MESSAGES.FULL_RANGE        // "Use full range of motion"
BICEP_CURL_MESSAGES.GOOD_FORM         // "Good form"
BICEP_CURL_MESSAGES.EXCELLENT         // "Excellent"
```

### Lateral Raise Messages

```typescript
LATERAL_RAISE_MESSAGES.STAND_STRAIGHT      // "Stand up straight"
LATERAL_RAISE_MESSAGES.RAISE_TO_SHOULDER   // "Raise to shoulder level"
LATERAL_RAISE_MESSAGES.TOO_HIGH            // "Too high, lower slightly"
LATERAL_RAISE_MESSAGES.RAISE_HIGHER        // "Raise your arms higher"
LATERAL_RAISE_MESSAGES.PERFECT_HEIGHT      // "Perfect height"
```

### Session Messages

```typescript
SESSION_MESSAGES.START     // "Ready to begin"
SESSION_MESSAGES.PAUSE     // "Workout paused"
SESSION_MESSAGES.RESUME    // "Resuming workout"
SESSION_MESSAGES.COMPLETE  // "Workout complete, great job"
```

## Configuration

### Default Settings

```typescript
VOICE_FEEDBACK_SETTINGS = {
  MIN_MESSAGE_INTERVAL: 3000,         // 3 seconds between messages
  MAX_QUEUE_SIZE: 10,                 // Max 10 messages in queue
  BACK_ANGLE_THRESHOLD: 170,          // Posture warning threshold
  LATERAL_MIN_ANGLE: 70,              // Lateral raise min angle
  LATERAL_TARGET_ANGLE: 90,           // Lateral raise target
  LATERAL_MAX_ANGLE: 100,             // Lateral raise max angle
  ENCOURAGEMENT_EVERY_N_REPS: 5,      // Encouragement frequency
  DEFAULT_VOLUME: 0.8,                // Default volume level
}
```

### Customization

```typescript
// Update manager configuration
voiceManager.updateConfig({
  minMessageInterval: 5000,  // 5 seconds
  maxQueueSize: 15,
  priorityInterrupts: false
});

// Update voice provider configuration
voiceProvider.updateConfig({
  rate: 0.9,    // Slower speech
  pitch: 1.1,   // Higher pitch
  volume: 0.7   // Lower volume
});
```

## Priority System

### How Priority Works

1. **High Priority**
   - Added to front of queue
   - Interrupts current speech (if configured)
   - Never removed from queue
   - Examples: Safety warnings, rep counts

2. **Medium Priority**
   - Added to queue normally
   - Not interrupted
   - Removed if queue is full
   - Examples: Form corrections

3. **Low Priority**
   - Added to queue
   - Skipped if queue is busy (>3 messages)
   - First to be removed when queue is full
   - Examples: Encouragement, phase guidance

### Queue Management

```typescript
// High priority message
voiceManager.queueMessage('Stand straight', 'high');
// Interrupts current speech, plays immediately

// Medium priority message
voiceManager.queueMessage('Keep elbows close', 'medium');
// Queued, plays after current message

// Low priority message
voiceManager.queueMessage('Good form', 'low');
// Queued, may be skipped if busy
```

## Rate Limiting

To prevent message spam, use refs to track last message time:

```typescript
const lastPostureWarningRef = useRef(0);

// In pose detection callback
const now = Date.now();
if (postureScore < 70 && now - lastPostureWarningRef.current > 8000) {
  voiceManager.queueMessage('Stand up straight', 'high');
  lastPostureWarningRef.current = now;
}
```

## Swapping Providers

### From Web Speech to ElevenLabs

```typescript
// Current provider
const webSpeechProvider = new WebSpeechVoice();
const voiceManager = new VoiceFeedbackManager(webSpeechProvider);

// Swap to ElevenLabs
const elevenLabsProvider = new ElevenLabsVoice({
  apiKey: 'your-api-key',
  voiceId: 'EXAVITQu4vr4xnSDxMaL'  // Bella voice
});
voiceManager.setProvider(elevenLabsProvider);

// That's it! All existing code continues to work
```

### Runtime Provider Switching

```typescript
function setVoiceProvider(type: 'webspeech' | 'elevenlabs') {
  const provider = type === 'webspeech'
    ? new WebSpeechVoice()
    : new ElevenLabsVoice({ apiKey: API_KEY });

  voiceManager.setProvider(provider);
}
```

## Browser Compatibility

### Web Speech API
- Chrome: Full support
- Edge: Full support
- Safari: Full support
- Firefox: Partial support (may have voice loading issues)
- Mobile: Limited support

### Checking Support

```typescript
if (voiceProvider.isSupported()) {
  console.log('Voice feedback is available');
} else {
  console.warn('Voice feedback not supported in this browser');
}
```

## Testing

### Manual Testing

```typescript
// Test voice provider
const provider = new WebSpeechVoice();
await provider.speak('Testing voice feedback');

// Test manager with different priorities
const manager = new VoiceFeedbackManager(provider);
manager.queueMessage('High priority', 'high');
manager.queueMessage('Medium priority', 'medium');
manager.queueMessage('Low priority', 'low');

// Test volume
manager.setVolume(0.5);

// Test mute/unmute
manager.disable();
manager.enable();
```

### UI Testing

The fitness page includes a voice toggle button:
- Click the speaker icon to mute/unmute
- Icon changes: Volume2 (unmuted) / VolumeX (muted)
- Green highlight when enabled

## Troubleshooting

### Voice Not Working

1. **Check browser support**
   ```typescript
   console.log(voiceProvider.isSupported());
   ```

2. **Check if voice is enabled**
   ```typescript
   console.log(voiceManager.isVoiceEnabled());
   ```

3. **Check queue size**
   ```typescript
   console.log(voiceManager.getQueueSize());
   ```

4. **Check browser console for errors**

### Voice Quality Issues

1. **Adjust speech rate**
   ```typescript
   voiceProvider.updateConfig({ rate: 0.9 });
   ```

2. **Try different voice**
   ```typescript
   const voices = voiceProvider.getAvailableVoices();
   console.log(voices);
   voiceProvider.updateConfig({ voice: voices[0].name });
   ```

### Messages Not Playing

1. **Check rate limiting**
   - Messages may be delayed due to 3-second minimum interval
   - Check lastMessageTime refs

2. **Check priority**
   - Low priority messages may be skipped when queue is busy

3. **Check queue size**
   - Queue may be full (max 10 messages)

## Future Enhancements

### ElevenLabs Integration

Complete the stub implementation:

```typescript
// In ElevenLabsVoice.ts
async speak(text: string, config?: Partial<VoiceConfig>): Promise<void> {
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

  const audioBlob = await response.blob();
  const audioUrl = URL.createObjectURL(audioBlob);
  const audio = new Audio(audioUrl);
  audio.volume = this.config.volume ?? 1.0;

  return new Promise((resolve, reject) => {
    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      resolve();
    };
    audio.onerror = reject;
    audio.play();
  });
}
```

### Additional Features

- **Audio caching**: Cache frequently used messages
- **Voice profiles**: User-selectable voice preferences
- **Multi-language**: Support for multiple languages
- **SSML support**: Advanced speech markup
- **Analytics**: Track which messages are most effective
- **A/B testing**: Test different message phrasings

## License

Part of the Wats Next exercise tracking application.
