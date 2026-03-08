# Voice Feedback System - Quick Start Guide

## Installation (Already Done)

The voice feedback system is already integrated into your project at `/src/lib/voice/`.

## 5-Minute Quick Start

### 1. Import the System

```typescript
import {
  VoiceFeedbackManager,
  WebSpeechVoice,
  BICEP_CURL_MESSAGES,
  getRepCountMessage
} from '@/lib/voice';
```

### 2. Initialize (in your React component)

```typescript
import { useRef, useEffect } from 'react';

export default function MyComponent() {
  const voiceManagerRef = useRef<VoiceFeedbackManager | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const voiceProvider = new WebSpeechVoice();
      voiceManagerRef.current = new VoiceFeedbackManager(voiceProvider);
    }
  }, []);

  // ... rest of component
}
```

### 3. Use It!

```typescript
// In your exercise logic
if (voiceManagerRef.current) {
  // Announce rep count
  const repMsg = getRepCountMessage(repCount);
  voiceManagerRef.current.queueMessage(repMsg.text, repMsg.priority);

  // Form correction
  if (postureScore < 70) {
    voiceManagerRef.current.queueMessage('Stand up straight', 'high');
  }
}
```

## Common Use Cases

### Rep Count Announcements

```typescript
import { getRepCountMessage } from '@/lib/voice';

// When rep count changes
if (newRepCount > lastRepCount) {
  const repMsg = getRepCountMessage(newRepCount);
  voiceManager.queueMessage(repMsg.text, repMsg.priority);
}
```

### Form Corrections

```typescript
import { BICEP_CURL_MESSAGES } from '@/lib/voice';

// Elbow position warning
if (elbowScore < 70) {
  voiceManager.queueMessage(
    BICEP_CURL_MESSAGES.ELBOWS_CLOSE.text,
    BICEP_CURL_MESSAGES.ELBOWS_CLOSE.priority
  );
}
```

### Encouragement

```typescript
import { getRandomEncouragement } from '@/lib/voice';

// Every 5 reps
if (repCount % 5 === 0) {
  const encouragement = getRandomEncouragement('bicep');
  voiceManager.queueMessage(encouragement.text, encouragement.priority);
}
```

### Mute/Unmute Button

```typescript
const [voiceEnabled, setVoiceEnabled] = useState(true);

// In your JSX
<button
  onClick={() => {
    const newState = !voiceEnabled;
    setVoiceEnabled(newState);
    if (newState) {
      voiceManager.enable();
    } else {
      voiceManager.disable();
    }
  }}
>
  {voiceEnabled ? 'Mute' : 'Unmute'}
</button>
```

## Priority Guide

| Priority | When to Use | Example |
|----------|-------------|---------|
| **high** | Safety, rep counts | "Stand straight", "Five" |
| **medium** | Form corrections | "Keep elbows close" |
| **low** | Encouragement | "Good form" |

## Rate Limiting

Prevent spam by tracking last message time:

```typescript
const lastWarningRef = useRef(0);

const now = Date.now();
if (now - lastWarningRef.current > 8000) { // 8 seconds
  voiceManager.queueMessage('Warning message', 'high');
  lastWarningRef.current = now;
}
```

## Available Message Templates

### Bicep Curls
```typescript
BICEP_CURL_MESSAGES.STAND_STRAIGHT    // Posture
BICEP_CURL_MESSAGES.ELBOWS_CLOSE      // Form
BICEP_CURL_MESSAGES.FULL_RANGE        // Range
BICEP_CURL_MESSAGES.GOOD_FORM         // Encouragement
```

### Lateral Raises
```typescript
LATERAL_RAISE_MESSAGES.STAND_STRAIGHT      // Posture
LATERAL_RAISE_MESSAGES.RAISE_TO_SHOULDER   // Height
LATERAL_RAISE_MESSAGES.TOO_HIGH            // Height
LATERAL_RAISE_MESSAGES.PERFECT_HEIGHT      // Encouragement
```

## Testing

Open browser console and run:

```typescript
import { quickTest } from '@/lib/voice/test-voice';
await quickTest();
```

## Troubleshooting

### Voice not working?

```typescript
// Check if supported
if (voiceProvider.isSupported()) {
  console.log('Voice is supported');
} else {
  console.log('Voice not supported in this browser');
}
```

### Messages not playing?

```typescript
// Check if enabled
console.log('Enabled:', voiceManager.isVoiceEnabled());

// Check queue size
console.log('Queue size:', voiceManager.getQueueSize());
```

### Too many messages?

```typescript
// Clear the queue
voiceManager.clearQueue();

// Or stop everything
voiceManager.stopAndClear();
```

## Configuration

### Change volume
```typescript
voiceManager.setVolume(0.5); // 50% volume
```

### Change speech rate
```typescript
voiceProvider.updateConfig({ rate: 0.9 }); // 90% speed
```

### Change interval
```typescript
voiceManager.updateConfig({ minMessageInterval: 5000 }); // 5 seconds
```

## Next Steps

1. **Read the full documentation**: `/src/lib/voice/README.md`
2. **Understand the architecture**: `/src/lib/voice/ARCHITECTURE.md`
3. **Run the test suite**: Import and run tests from `test-voice.ts`
4. **Customize messages**: Edit `voiceConfig.ts` for your needs
5. **Add ElevenLabs**: Complete the stub in `ElevenLabsVoice.ts`

## Need Help?

- Check the comprehensive README at `/src/lib/voice/README.md`
- Review example integration in `/src/app/fitness/page.tsx`
- Run tests to verify functionality
- Check browser console for errors

## That's It!

You now have a fully functional voice feedback system. Start adding voice feedback to your exercise tracker and enhance the user experience!
