/**
 * Test script to verify the Lateral Raises warning logic fix
 *
 * This script demonstrates that the warning logic is now correct:
 * - Arms at sides (ESH ~30-40°): NO WARNING (correct down position)
 * - Arms at shoulder level (ESH 80-90°): NO WARNING (correct raised position)
 * - Arms too high (ESH < 80°): WARNING only when phase is 'up'
 */

import { LateralRaisesAnalyzer, PoseLandmark } from './src/lib/LateralRaisesAnalyzer';

// Helper function to create mock landmarks for different arm positions
function createMockLandmarks(eshAngle: number): PoseLandmark[] {
  const landmarks: PoseLandmark[] = Array(33).fill(null).map(() => ({
    x: 0.5,
    y: 0.5,
    z: 0,
    visibility: 1.0,
  }));

  // Set specific landmarks for ESH angle calculation
  // We'll position the elbow, shoulder, and hip to create the desired angle

  // Shoulder (landmark 11 and 12)
  landmarks[11] = { x: 0.4, y: 0.3, z: 0, visibility: 1.0 }; // Left shoulder
  landmarks[12] = { x: 0.6, y: 0.3, z: 0, visibility: 1.0 }; // Right shoulder

  // Hip (landmark 23 and 24)
  landmarks[23] = { x: 0.4, y: 0.6, z: 0, visibility: 1.0 }; // Left hip
  landmarks[24] = { x: 0.6, y: 0.6, z: 0, visibility: 1.0 }; // Right hip

  // Position elbow based on desired ESH angle
  // For simplicity, we'll approximate elbow position
  const angleRad = (eshAngle * Math.PI) / 180;

  // Left elbow (landmark 13)
  landmarks[13] = {
    x: 0.4 + Math.cos(angleRad - Math.PI/2) * 0.2,
    y: 0.3 + Math.sin(angleRad - Math.PI/2) * 0.2,
    z: 0,
    visibility: 1.0,
  };

  // Right elbow (landmark 14)
  landmarks[14] = {
    x: 0.6 + Math.cos(angleRad - Math.PI/2) * 0.2,
    y: 0.3 + Math.sin(angleRad - Math.PI/2) * 0.2,
    z: 0,
    visibility: 1.0,
  };

  // Set other required landmarks
  landmarks[0] = { x: 0.5, y: 0.1, z: 0, visibility: 1.0 }; // Nose
  landmarks[15] = { x: 0.3, y: 0.4, z: 0, visibility: 1.0 }; // Left wrist
  landmarks[16] = { x: 0.7, y: 0.4, z: 0, visibility: 1.0 }; // Right wrist
  landmarks[25] = { x: 0.4, y: 0.8, z: 0, visibility: 1.0 }; // Left knee
  landmarks[26] = { x: 0.6, y: 0.8, z: 0, visibility: 1.0 }; // Right knee
  landmarks[27] = { x: 0.4, y: 0.95, z: 0, visibility: 1.0 }; // Left ankle
  landmarks[28] = { x: 0.6, y: 0.95, z: 0, visibility: 1.0 }; // Right ankle

  return landmarks;
}

console.log('=== Testing Lateral Raises Warning Logic Fix ===\n');

const analyzer = new LateralRaisesAnalyzer();

// Test 1: Arms at sides (down position) - ESH ~30°
console.log('Test 1: Arms at sides (down position) - ESH ~30°');
console.log('Expected: NO WARNING (this is correct down position)');
const landmarksDown = createMockLandmarks(30);
const resultDown = analyzer.analyze(landmarksDown);
console.log(`Result: ESH angles = ${resultDown.eshAngles.left}°, ${resultDown.eshAngles.right}°`);
console.log(`Feedback: ${resultDown.feedback.join(', ')}`);
console.log(`Phase: ${resultDown.phase}`);
const hasWarningDown = resultDown.feedback.some(f => f.includes('too high'));
console.log(`Has "too high" warning: ${hasWarningDown}`);
console.log(`✅ PASS: ${!hasWarningDown ? 'Correctly NO warning' : 'FAIL: Should not warn'}\n`);

// Test 2: Arms at shoulder level (up position) - ESH ~85°
console.log('Test 2: Arms at shoulder level (up position) - ESH ~85°');
console.log('Expected: NO WARNING (this is correct raised position)');
const landmarksUp = createMockLandmarks(85);
const resultUp = analyzer.analyze(landmarksUp);
console.log(`Result: ESH angles = ${resultUp.eshAngles.left}°, ${resultUp.eshAngles.right}°`);
console.log(`Feedback: ${resultUp.feedback.join(', ')}`);
console.log(`Phase: ${resultUp.phase}`);
const hasWarningUp = resultUp.feedback.some(f => f.includes('too high'));
console.log(`Has "too high" warning: ${hasWarningUp}`);
console.log(`✅ PASS: ${!hasWarningUp ? 'Correctly NO warning' : 'FAIL: Should not warn'}\n`);

// Test 3: Arms too high (above shoulders) - ESH ~70°
console.log('Test 3: Arms raised too high (above shoulders) - ESH ~70°');
console.log('Expected: WARNING when phase is "up"');
// First establish down phase
analyzer.reset();
const landmarksDownFirst = createMockLandmarks(150);
analyzer.analyze(landmarksDownFirst);
// Then raise to shoulder level to trigger 'up' phase
const landmarksAtShoulder = createMockLandmarks(85);
analyzer.analyze(landmarksAtShoulder);
// Now go too high
const landmarksTooHigh = createMockLandmarks(70);
const resultTooHigh = analyzer.analyze(landmarksTooHigh);
console.log(`Result: ESH angles = ${resultTooHigh.eshAngles.left}°, ${resultTooHigh.eshAngles.right}°`);
console.log(`Feedback: ${resultTooHigh.feedback.join(', ')}`);
console.log(`Phase: ${resultTooHigh.phase}`);
const hasWarningTooHigh = resultTooHigh.feedback.some(f => f.includes('too high'));
console.log(`Has "too high" warning: ${hasWarningTooHigh}`);
console.log(`✅ PASS: ${hasWarningTooHigh ? 'Correctly shows warning' : 'FAIL: Should warn'}\n`);

console.log('=== Summary ===');
console.log('The fix is successful if:');
console.log('1. Arms at sides (ESH ~30°) does NOT trigger warning ✓');
console.log('2. Arms at shoulder level (ESH 80-90°) does NOT trigger warning ✓');
console.log('3. Arms too high (ESH < 80°) DOES trigger warning when phase is "up" ✓');
