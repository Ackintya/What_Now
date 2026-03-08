# Voice Feedback System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Fitness Page Component                       │
│                    (fitness/page.tsx)                            │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ Uses
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   VoiceFeedbackManager                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Priority Queue                                           │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐               │  │
│  │  │   High   │  │  Medium  │  │   Low    │               │  │
│  │  │ Priority │  │ Priority │  │ Priority │               │  │
│  │  └──────────┘  └──────────┘  └──────────┘               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Features:                                                       │
│  • Rate limiting (3s interval)                                  │
│  • Message deduplication                                        │
│  • Queue overflow handling                                      │
│  • High-priority interruption                                   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ Uses (IVoiceFeedback interface)
                            ▼
        ┌───────────────────┴────────────────────┐
        │                                        │
        ▼                                        ▼
┌──────────────────┐                  ┌──────────────────┐
│ WebSpeechVoice   │                  │ ElevenLabsVoice  │
│                  │                  │                  │
│ • Browser API    │                  │ • API calls      │
│ • Voice selection│                  │ • Audio streaming│
│ • Free           │                  │ • Premium voices │
│ • Offline ready  │                  │ • Fallback to WS │
└────────┬─────────┘                  └────────┬─────────┘
         │                                     │
         ▼                                     ▼
  ┌─────────────┐                      ┌─────────────┐
  │   Browser   │                      │  ElevenLabs │
  │   Speech    │                      │     API     │
  │ Synthesis   │                      │             │
  └─────────────┘                      └─────────────┘
```

## Component Interaction Flow

```
Exercise Detection → Voice Feedback Trigger → Manager → Provider → Speech

1. User performs exercise
         ↓
2. Pose detected (landmarks)
         ↓
3. Analyzer processes metrics
         ↓
4. Metrics trigger voice feedback
         ↓
5. Manager queues message with priority
         ↓
6. Queue processes by priority
         ↓
7. Rate limiter checks interval
         ↓
8. Provider speaks message
         ↓
9. User hears feedback
```

## Message Priority Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    Message arrives                            │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
          ┌────────────────────────┐
          │  What's the priority?  │
          └────────┬───────────────┘
                   │
        ┌──────────┼──────────┐
        │          │          │
        ▼          ▼          ▼
    ┌──────┐  ┌────────┐  ┌──────┐
    │ HIGH │  │ MEDIUM │  │ LOW  │
    └──┬───┘  └────┬───┘  └──┬───┘
       │           │          │
       │           │          ▼
       │           │     Skip if queue
       │           │     size > 3?
       │           │          │
       │           │          ▼
       │           │     ┌────────┐
       │           │     │ Queue  │
       │           │     └────────┘
       │           │
       │           ▼
       │      ┌────────┐
       │      │ Queue  │
       │      └────────┘
       │
       ▼
  ┌──────────────┐
  │  Interrupt?  │ (if priorityInterrupts enabled)
  │  Add to      │
  │  front of    │
  │  queue       │
  └──────────────┘
```

## Queue Processing Algorithm

```
while (queue not empty):
    1. Check rate limit
       ↓
       Wait if needed
       ↓
    2. Get next message (highest priority)
       ↓
    3. Check if should skip (low priority + queue busy)
       ↓
       Skip or continue
       ↓
    4. Speak message
       ↓
    5. Mark timestamp
       ↓
    6. Loop
```

## Class Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      IVoiceFeedback                          │
│  (Interface)                                                 │
├─────────────────────────────────────────────────────────────┤
│  + speak(text, config): Promise<void>                       │
│  + stop(): void                                             │
│  + setVolume(volume): void                                  │
│  + isSupported(): boolean                                   │
│  + getConfig(): VoiceConfig                                 │
│  + updateConfig(config): void                               │
└──────────────────────┬──────────────────────────────────────┘
                       △
                       │ implements
           ┌───────────┴───────────┐
           │                       │
┌──────────┴──────────┐  ┌────────┴──────────┐
│  WebSpeechVoice     │  │  ElevenLabsVoice  │
├─────────────────────┤  ├───────────────────┤
│ - synthesis         │  │ - apiKey          │
│ - selectedVoice     │  │ - voiceId         │
│ - currentUtterance  │  │ - fallbackProvider│
│ - config            │  │ - config          │
├─────────────────────┤  ├───────────────────┤
│ + speak()           │  │ + speak()         │
│ + stop()            │  │ + stop()          │
│ + setVolume()       │  │ + setVolume()     │
│ + loadVoices()      │  │ + setApiKey()     │
│ + getAvailableVoices│  │ + setVoiceId()    │
└─────────────────────┘  └───────────────────┘

┌─────────────────────────────────────────────────────────────┐
│               VoiceFeedbackManager                           │
├─────────────────────────────────────────────────────────────┤
│ - provider: IVoiceFeedback                                  │
│ - queue: VoiceMessage[]                                     │
│ - isProcessing: boolean                                     │
│ - isEnabled: boolean                                        │
│ - lastSpeakTime: number                                     │
│ - config: VoiceFeedbackManagerConfig                        │
├─────────────────────────────────────────────────────────────┤
│ + queueMessage(text, priority): string                      │
│ + enable(): void                                            │
│ + disable(): void                                           │
│ + toggle(): boolean                                         │
│ + setVolume(volume): void                                   │
│ + setProvider(provider): void                               │
│ + stopAndClear(): void                                      │
│ + clearQueue(): void                                        │
│ + getQueueSize(): number                                    │
│ - processQueue(): Promise<void>                             │
│ - sortQueue(): void                                         │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

```
User Action
    │
    ▼
┌────────────────┐
│ Pose Detection │
│  (Landmarks)   │
└────────┬───────┘
         │
         ▼
┌────────────────┐
│    Analyzer    │
│  (Bicep/Lat)   │
└────────┬───────┘
         │
         ▼
┌────────────────┐
│    Metrics     │
│  repCount      │
│  postureScore  │
│  formScore     │
└────────┬───────┘
         │
         ▼
┌────────────────────┐
│ Voice Trigger      │
│ Logic              │
│ • Rep count?       │
│ • Form issue?      │
│ • Posture issue?   │
│ • Encouragement?   │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ Rate Limiter       │
│ • Check last time  │
│ • Allow/Block      │
└────────┬───────────┘
         │
         ▼ (if allowed)
┌────────────────────┐
│ Message Templates  │
│ • Select message   │
│ • Set priority     │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ Voice Manager      │
│ • Queue message    │
│ • Sort by priority │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ Queue Processor    │
│ • Wait for interval│
│ • Get next message │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ Voice Provider     │
│ • Web Speech or    │
│ • ElevenLabs       │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ Audio Output       │
│ (Speaker)          │
└────────────────────┘
         │
         ▼
┌────────────────────┐
│ User Hears         │
│ Feedback           │
└────────────────────┘
```

## State Diagram

```
┌─────────────┐
│  Disabled   │◄─────────────┐
└──────┬──────┘              │
       │                     │
       │ enable()            │ disable()
       ▼                     │
┌─────────────┐              │
│   Enabled   │──────────────┘
│   (Idle)    │
└──────┬──────┘
       │
       │ queueMessage()
       ▼
┌─────────────┐
│   Queued    │
└──────┬──────┘
       │
       │ processQueue()
       ▼
┌─────────────┐
│  Waiting    │ (rate limit)
└──────┬──────┘
       │
       │ interval passed
       ▼
┌─────────────┐
│  Speaking   │◄──────────┐
└──────┬──────┘           │
       │                  │ high priority
       │                  │ interrupt
       │ complete         │
       ▼                  │
┌─────────────┐           │
│   Enabled   │───────────┘
│   (Idle)    │
└─────────────┘
       │
       │ more in queue?
       ▼
   (loop back to Queued)
```

## Priority Queue Structure

```
┌───────────────────────────────────────────────────────────┐
│                   Message Queue                            │
├───────────────────────────────────────────────────────────┤
│                                                            │
│  HIGH PRIORITY (front of queue)                           │
│  ┌──────────────────────────────────────────────────┐    │
│  │ "Stand straight" (timestamp: 12:00:01)           │    │
│  │ "Five" (timestamp: 12:00:02)                     │    │
│  └──────────────────────────────────────────────────┘    │
│                                                            │
│  MEDIUM PRIORITY                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │ "Keep elbows close" (timestamp: 12:00:03)        │    │
│  │ "Raise to shoulder level" (timestamp: 12:00:05)  │    │
│  └──────────────────────────────────────────────────┘    │
│                                                            │
│  LOW PRIORITY                                             │
│  ┌──────────────────────────────────────────────────┐    │
│  │ "Good form" (timestamp: 12:00:06)                │    │
│  │ "Excellent" (timestamp: 12:00:08)                │    │
│  └──────────────────────────────────────────────────┘    │
│                                                            │
│  Max Size: 10 messages                                    │
│  Current Size: 6 messages                                 │
│  Overflow: Remove oldest low-priority first               │
└───────────────────────────────────────────────────────────┘
```

## Voice Provider Selection Logic

```
┌────────────────────────┐
│ Initialize Provider    │
└───────────┬────────────┘
            │
            ▼
     ┌──────────────┐
     │ Which type?  │
     └──────┬───────┘
            │
    ┌───────┴────────┐
    │                │
    ▼                ▼
┌─────────┐    ┌──────────┐
│  Web    │    │ ElevenLabs│
│ Speech  │    │           │
└────┬────┘    └─────┬────┘
     │               │
     │               ▼
     │         ┌──────────┐
     │         │ API Key? │
     │         └─────┬────┘
     │               │
     │         ┌─────┴─────┐
     │         │           │
     │         ▼ Yes       ▼ No
     │    ┌─────────┐  ┌────────┐
     │    │ Use API │  │Fallback│
     │    └─────────┘  └────┬───┘
     │                      │
     └──────────────────────┘
                │
                ▼
        ┌──────────────┐
        │   Ready to   │
        │    Speak     │
        └──────────────┘
```

## Message Template Structure

```
voiceConfig.ts
├── BICEP_CURL_MESSAGES
│   ├── High Priority
│   │   ├── MOVE_BACK
│   │   ├── STAND_STRAIGHT
│   │   └── TOO_CLOSE
│   ├── Medium Priority
│   │   ├── ELBOWS_CLOSE
│   │   ├── ELBOW_POSITION
│   │   ├── FULL_RANGE
│   │   └── CONTROL_DESCENT
│   └── Low Priority
│       ├── GOOD_FORM
│       ├── EXCELLENT
│       ├── KEEP_IT_UP
│       └── NICE_WORK
│
├── LATERAL_RAISE_MESSAGES
│   ├── High Priority
│   │   ├── MOVE_BACK
│   │   ├── STAND_STRAIGHT
│   │   └── TOO_CLOSE
│   ├── Medium Priority
│   │   ├── RAISE_TO_SHOULDER
│   │   ├── TOO_HIGH
│   │   ├── RAISE_HIGHER
│   │   ├── ARMS_STRAIGHT
│   │   ├── CONTROL_MOVEMENT
│   │   └── SHOULDER_HEIGHT
│   └── Low Priority
│       ├── GOOD_FORM
│       ├── EXCELLENT
│       ├── PERFECT_HEIGHT
│       └── NICE_WORK
│
├── REP_COUNT_MESSAGES (1-20)
├── SESSION_MESSAGES
│   ├── START
│   ├── PAUSE
│   ├── RESUME
│   └── COMPLETE
│
└── Helper Functions
    ├── getRepCountMessage(count)
    └── getRandomEncouragement(type)
```

## Integration Points

```
Fitness Page
    │
    ├── Component Mount
    │   └── Initialize VoiceFeedbackManager
    │       └── Create WebSpeechVoice provider
    │
    ├── Pose Detection Callback
    │   ├── Rep Count Change
    │   │   └── Queue rep count message (high)
    │   ├── Posture Issue
    │   │   └── Queue posture warning (high)
    │   ├── Form Issue
    │   │   └── Queue form correction (medium)
    │   └── Good Form
    │       └── Queue encouragement (low)
    │
    ├── Exercise Start
    │   └── Queue "Ready to begin" (medium)
    │
    ├── Exercise Stop
    │   ├── Stop and clear voice
    │   └── Queue "Workout paused" (medium)
    │
    ├── Session Save
    │   └── Queue "Workout complete" (medium)
    │
    └── Mute Button Click
        └── Toggle enable/disable
```

## Performance Considerations

```
┌────────────────────────────────────────────────────┐
│              Performance Optimizations              │
├────────────────────────────────────────────────────┤
│                                                     │
│  1. Rate Limiting                                  │
│     • Prevents rapid-fire messages                 │
│     • Reduces CPU/memory usage                     │
│     • Better user experience                       │
│                                                     │
│  2. Queue Size Limit                               │
│     • Prevents memory bloat                        │
│     • Removes low-priority messages                │
│     • Maintains responsiveness                     │
│                                                     │
│  3. Priority Interruption                          │
│     • Only high-priority interrupts                │
│     • Preserves medium/low messages                │
│     • Reduces wasted speech synthesis              │
│                                                     │
│  4. Message Deduplication                          │
│     • Ref-based tracking                           │
│     • Prevents repeated warnings                   │
│     • Reduces audio overlap                        │
│                                                     │
│  5. Lazy Provider Initialization                   │
│     • Only initialize when needed                  │
│     • useEffect with proper deps                   │
│     • No initialization on server                  │
│                                                     │
└────────────────────────────────────────────────────┘
```

## Error Handling Flow

```
┌───────────────┐
│ Speak Request │
└───────┬───────┘
        │
        ▼
┌───────────────┐
│ Provider      │
│ Supported?    │
└───────┬───────┘
        │
    ┌───┴───┐
    │       │
    ▼ Yes   ▼ No
┌────────┐  ┌────────────┐
│ Speak  │  │ Log warning│
└───┬────┘  │ Continue   │
    │       └────────────┘
    ▼
┌────────┐
│ Error? │
└───┬────┘
    │
┌───┴───┐
│       │
▼ Yes   ▼ No
┌──────────────┐  ┌─────────┐
│ Log error    │  │ Success │
│ Resolve (not │  └─────────┘
│ reject)      │
│ Continue     │
└──────────────┘
```

This architecture ensures a robust, scalable, and maintainable voice feedback system that enhances the exercise tracking experience without compromising performance or reliability.
