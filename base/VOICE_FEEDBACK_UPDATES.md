# Voice Feedback System Updates - March 7, 2026

## Summary of Changes

Complete update to the voice feedback system with reduced queue size and two new voice event types.

## 1. Queue Size Reduction

**File:** `/src/lib/voice/voiceConfig.ts` and `/src/lib/voice/VoiceFeedbackManager.ts`

- **Previous:** MAX_QUEUE_SIZE = 10 messages
- **New:** MAX_QUEUE_SIZE = 4 messages
- **Benefit:** More responsive feedback, reduced latency in voice delivery

**Default manager configuration updated:**
```typescript
maxQueueSize: config.maxQueueSize ?? 4, // Reduced from 10 to 4
```

## 2. New Voice Events

### A. Leg Bending Detection (HIGH Priority)

**Applies to:** Both Bicep Curl and Lateral Raises exercises

**Implementation:**
- **File:** `/src/lib/BicepCurlAnalyzer.ts`
- **Method:** `checkLegBending()` - calculates hip-knee-ankle angles
- **Threshold:** Knee angle < 160° triggers warning
- **Message:** "Don't bend your legs" (HIGH priority)
- **Rate Limit:** Once every 5 seconds per event
- **Metrics Export:** Added `legBending` object to BicepCurlMetrics
  ```typescript
  legBending?: {
    hasLegBend: boolean;
    leftKneeAngle: number;
    rightKneeAngle: number;
  }
  ```

**Voice Configuration:**
```typescript
BICEP_CURL_MESSAGES.LEGS_BENT = {
  text: "Don't bend your legs",
  priority: 'high' as VoicePriority,
}
```

**Integration in fitness page:**
- Added `lastLegBendWarningRef` ref for rate limiting
- Checks `bicepMetrics.legBending.hasLegBend` in handlePoseDetected
- Rate limited to 5 seconds (LEG_BEND_RATE_LIMIT)

### B. Lateral Raises - Arms Too High Detection (HIGH Priority)

**Applies to:** Lateral Raises exercise only

**Implementation:**
- **File:** `/src/app/fitness/page.tsx` (handlePoseDetected callback)
- **Detection Method:** Monitors ESH angle in "up" phase
- **Threshold:** ESH angle > 80° in "up" phase
- **Message:** "Too high, lower to shoulder level" (HIGH priority)
- **Rate Limit:** Once every 5 seconds per event
- **Previous behavior:** Used generic TOO_HIGH message
- **New behavior:** Specific ARMS_TOO_HIGH message with immediate feedback

**Voice Configuration:**
```typescript
LATERAL_RAISE_MESSAGES.ARMS_TOO_HIGH = {
  text: "Too high, lower to shoulder level",
  priority: 'high' as VoicePriority,
}
```

**Settings in voiceConfig:**
```typescript
LATERAL_ARMS_TOO_HIGH_THRESHOLD: 80, // ESH threshold for "arms too high" warning
ARMS_TOO_HIGH_RATE_LIMIT: 5000, // Once every 5 seconds
```

## 3. Updated Configuration Settings

**File:** `/src/lib/voice/voiceConfig.ts`

New settings added:
```typescript
// Leg bend angle thresholds
LEG_BEND_MIN_ANGLE: 160, // Hip-knee-ankle angle (bent if < 160)

// Voice event rate limiting (in milliseconds)
ARMS_TOO_HIGH_RATE_LIMIT: 5000, // Once every 5 seconds
LEG_BEND_RATE_LIMIT: 5000, // Once every 5 seconds

// Lateral raise specific threshold
LATERAL_ARMS_TOO_HIGH_THRESHOLD: 80, // ESH threshold for "arms too high" warning
```

## 4. Fitness Page Integration

**File:** `/src/app/fitness/page.tsx`

Added tracking refs:
```typescript
const lastLegBendWarningRef = useRef(0);
const lastArmsHighWarningRef = useRef(0);
```

Enhanced handlePoseDetected callback:
- Detects leg bending for both exercises (HIGH priority feedback)
- Detects arms too high for lateral raises (HIGH priority feedback)
- Both with 5-second rate limiting
- Proper queue integration with high-priority interruption

Updated startExercise:
- Resets both new warning refs when exercise begins

Updated instructions:
- Added "Keep your legs straight, no bending at the knees" to both exercises
- Clarified for lateral raises: "Do not raise arms above shoulder level"

## 5. Voice Priority Strategy

### HIGH Priority (Immediate, Interrupts current speech)
- Rep counts ("One", "Two", etc.)
- Safety warnings (too close, posture issues)
- **NEW:** Leg bending detection
- **NEW:** Lateral raises arms too high

### MEDIUM Priority (Queued, no interrupt)
- Form corrections (elbows, arm height)
- Technique guidance

### LOW Priority (Skipped if busy)
- Encouragement messages
- Phase transitions

## 6. Testing Recommendations

1. **Leg Bending Detection:**
   - Start bicep curl or lateral raises exercise
   - Intentionally bend knees while performing reps
   - Verify "Don't bend your legs" is announced (HIGH priority)
   - Confirm 5-second rate limiting (not too frequent)

2. **Arms Too High (Lateral Raises):**
   - Perform lateral raises with arms raised above shoulder
   - Verify "Too high, lower to shoulder level" is announced (HIGH priority)
   - Confirm triggers during "up" phase only
   - Verify 5-second rate limiting

3. **Queue Performance:**
   - Run exercise with voice enabled
   - Monitor console for queue size
   - Should see reduced latency with 4-message max queue

## 7. Backward Compatibility

All changes are backward compatible:
- Existing voice feedback continues to work
- New messages are additions to existing templates
- Rate limiting is configurable via VOICE_FEEDBACK_SETTINGS
- Queue size change is transparent to consumers

## 8. Files Modified

1. `/src/lib/voice/voiceConfig.ts` - Added messages, reduced queue size, new settings
2. `/src/lib/voice/VoiceFeedbackManager.ts` - Changed default maxQueueSize from 10 to 4
3. `/src/lib/BicepCurlAnalyzer.ts` - Added checkLegBending() method, exported leg bending data
4. `/src/app/fitness/page.tsx` - Added leg bend and arms too high detection with voice feedback

## 9. Message Flow Example

### Leg Bending Event:
1. User bends knees during exercise
2. Analyzer detects knee angle < 160°
3. Sets legBending.hasLegBend = true in metrics
4. Fitness page detects in handlePoseDetected
5. Checks rate limit (5 seconds)
6. Queues HIGH priority message: "Don't bend your legs"
7. Voice manager interrupts current speech if needed
8. Message is spoken immediately

### Arms Too High Event (Lateral Raises):
1. User raises arms above shoulder in "up" phase
2. Average ESH angle > 80°
3. Fitness page detects in handlePoseDetected
4. Checks rate limit (5 seconds)
5. Queues HIGH priority message: "Too high, lower to shoulder level"
6. Voice manager interrupts current speech if needed
7. Message is spoken immediately

## Summary

The voice feedback system is now more responsive (4-message queue) and provides critical safety feedback for leg bending and arm height during exercises. Both new events use HIGH priority for immediate user awareness, with 5-second rate limiting to prevent message spam while ensuring users get timely feedback on form issues.
