/**
 * Voice Feedback System Test
 * Run this in a browser console or Next.js dev environment
 */

import {
  VoiceFeedbackManager,
  WebSpeechVoice,
  ElevenLabsVoice,
  BICEP_CURL_MESSAGES,
  LATERAL_RAISE_MESSAGES,
  getRepCountMessage,
  getRandomEncouragement,
  SESSION_MESSAGES
} from './index';

/**
 * Test 1: Basic Web Speech functionality
 */
export async function testBasicVoice() {
  console.log('Test 1: Basic Web Speech');

  const provider = new WebSpeechVoice();

  if (!provider.isSupported()) {
    console.error('Web Speech API not supported in this browser');
    return;
  }

  console.log('Available voices:', provider.getAvailableVoices().length);
  console.log('Selected voice:', provider.getSelectedVoice()?.name);

  await provider.speak('Testing voice feedback system');
  console.log('Test 1 complete');
}

/**
 * Test 2: Voice Manager with Priority Queue
 */
export async function testVoiceManager() {
  console.log('Test 2: Voice Manager with Priority Queue');

  const provider = new WebSpeechVoice();
  const manager = new VoiceFeedbackManager(provider, {
    minMessageInterval: 2000,
    maxQueueSize: 10,
    priorityInterrupts: true
  });

  // Queue different priority messages
  manager.queueMessage('Low priority message', 'low');
  manager.queueMessage('Medium priority message', 'medium');
  manager.queueMessage('High priority message', 'high');

  console.log('Queue size:', manager.getQueueSize());

  // Wait for messages to complete
  await new Promise(resolve => setTimeout(resolve, 8000));
  console.log('Test 2 complete');
}

/**
 * Test 3: Rep Count Messages
 */
export async function testRepCount() {
  console.log('Test 3: Rep Count Messages');

  const provider = new WebSpeechVoice();
  const manager = new VoiceFeedbackManager(provider);

  // Announce reps 1-5
  for (let i = 1; i <= 5; i++) {
    const repMsg = getRepCountMessage(i);
    manager.queueMessage(repMsg.text, repMsg.priority);
  }

  await new Promise(resolve => setTimeout(resolve, 15000));
  console.log('Test 3 complete');
}

/**
 * Test 4: Exercise Form Corrections
 */
export async function testFormCorrections() {
  console.log('Test 4: Form Corrections');

  const provider = new WebSpeechVoice();
  const manager = new VoiceFeedbackManager(provider);

  // Bicep curl corrections
  manager.queueMessage(
    BICEP_CURL_MESSAGES.STAND_STRAIGHT.text,
    BICEP_CURL_MESSAGES.STAND_STRAIGHT.priority
  );

  await new Promise(resolve => setTimeout(resolve, 3000));

  manager.queueMessage(
    BICEP_CURL_MESSAGES.ELBOWS_CLOSE.text,
    BICEP_CURL_MESSAGES.ELBOWS_CLOSE.priority
  );

  await new Promise(resolve => setTimeout(resolve, 3000));

  // Lateral raise corrections
  manager.queueMessage(
    LATERAL_RAISE_MESSAGES.RAISE_TO_SHOULDER.text,
    LATERAL_RAISE_MESSAGES.RAISE_TO_SHOULDER.priority
  );

  await new Promise(resolve => setTimeout(resolve, 5000));
  console.log('Test 4 complete');
}

/**
 * Test 5: Encouragement Messages
 */
export async function testEncouragement() {
  console.log('Test 5: Encouragement Messages');

  const provider = new WebSpeechVoice();
  const manager = new VoiceFeedbackManager(provider);

  // Random encouragement for bicep curls
  for (let i = 0; i < 3; i++) {
    const encouragement = getRandomEncouragement('bicep');
    manager.queueMessage(encouragement.text, encouragement.priority);
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  console.log('Test 5 complete');
}

/**
 * Test 6: Volume Control
 */
export async function testVolumeControl() {
  console.log('Test 6: Volume Control');

  const provider = new WebSpeechVoice();
  const manager = new VoiceFeedbackManager(provider);

  // Test different volumes
  manager.setVolume(1.0);
  manager.queueMessage('Volume at maximum', 'medium');
  await new Promise(resolve => setTimeout(resolve, 3000));

  manager.setVolume(0.5);
  manager.queueMessage('Volume at half', 'medium');
  await new Promise(resolve => setTimeout(resolve, 3000));

  manager.setVolume(0.2);
  manager.queueMessage('Volume at low', 'medium');
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('Test 6 complete');
}

/**
 * Test 7: Enable/Disable
 */
export async function testEnableDisable() {
  console.log('Test 7: Enable/Disable');

  const provider = new WebSpeechVoice();
  const manager = new VoiceFeedbackManager(provider);

  manager.queueMessage('Voice is enabled', 'medium');
  await new Promise(resolve => setTimeout(resolve, 3000));

  manager.disable();
  manager.queueMessage('This should not be heard', 'medium');
  console.log('Voice disabled - message should be silent');
  await new Promise(resolve => setTimeout(resolve, 3000));

  manager.enable();
  manager.queueMessage('Voice is re-enabled', 'medium');
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('Test 7 complete');
}

/**
 * Test 8: Priority Interruption
 */
export async function testPriorityInterruption() {
  console.log('Test 8: Priority Interruption');

  const provider = new WebSpeechVoice();
  const manager = new VoiceFeedbackManager(provider, {
    priorityInterrupts: true
  });

  // Start a long medium priority message
  manager.queueMessage(
    'This is a long medium priority message that should be interrupted',
    'medium'
  );

  // After 1 second, interrupt with high priority
  setTimeout(() => {
    manager.queueMessage('High priority interruption', 'high');
  }, 1000);

  await new Promise(resolve => setTimeout(resolve, 8000));
  console.log('Test 8 complete');
}

/**
 * Test 9: Queue Overflow
 */
export async function testQueueOverflow() {
  console.log('Test 9: Queue Overflow');

  const provider = new WebSpeechVoice();
  const manager = new VoiceFeedbackManager(provider, {
    maxQueueSize: 5,
    minMessageInterval: 1000
  });

  // Add more messages than queue can hold
  for (let i = 1; i <= 10; i++) {
    manager.queueMessage(`Message ${i}`, i <= 3 ? 'high' : i <= 6 ? 'medium' : 'low');
  }

  console.log('Queue size (should be max 5):', manager.getQueueSize());

  await new Promise(resolve => setTimeout(resolve, 10000));
  console.log('Test 9 complete');
}

/**
 * Test 10: Provider Switching
 */
export async function testProviderSwitching() {
  console.log('Test 10: Provider Switching');

  const webSpeech = new WebSpeechVoice();
  const elevenLabs = new ElevenLabsVoice(); // Will fallback to Web Speech

  const manager = new VoiceFeedbackManager(webSpeech);

  manager.queueMessage('Using Web Speech provider', 'medium');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Switch provider (ElevenLabs will fallback to Web Speech since no API key)
  manager.setProvider(elevenLabs);
  manager.queueMessage('Switched to ElevenLabs provider, falling back to Web Speech', 'medium');
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('Test 10 complete');
}

/**
 * Run all tests sequentially
 */
export async function runAllTests() {
  console.log('=== Starting Voice Feedback System Tests ===');

  try {
    await testBasicVoice();
    await new Promise(resolve => setTimeout(resolve, 2000));

    await testVoiceManager();
    await new Promise(resolve => setTimeout(resolve, 2000));

    await testRepCount();
    await new Promise(resolve => setTimeout(resolve, 2000));

    await testFormCorrections();
    await new Promise(resolve => setTimeout(resolve, 2000));

    await testEncouragement();
    await new Promise(resolve => setTimeout(resolve, 2000));

    await testVolumeControl();
    await new Promise(resolve => setTimeout(resolve, 2000));

    await testEnableDisable();
    await new Promise(resolve => setTimeout(resolve, 2000));

    await testPriorityInterruption();
    await new Promise(resolve => setTimeout(resolve, 2000));

    await testQueueOverflow();
    await new Promise(resolve => setTimeout(resolve, 2000));

    await testProviderSwitching();

    console.log('=== All Tests Complete ===');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

/**
 * Quick test for development
 */
export async function quickTest() {
  console.log('Quick Test: Voice Feedback');

  const provider = new WebSpeechVoice();
  const manager = new VoiceFeedbackManager(provider);

  if (!provider.isSupported()) {
    console.error('Voice not supported');
    return;
  }

  manager.queueMessage('Quick test successful', 'high');
  await new Promise(resolve => setTimeout(resolve, 3000));
}

// Browser console usage:
// import { quickTest, runAllTests } from '@/lib/voice/test-voice';
// await quickTest();
// await runAllTests();
