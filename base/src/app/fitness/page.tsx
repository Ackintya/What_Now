"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { WebcamCapture } from "@/components/WebcamCapture";
import { BicepCurlAnalyzer, type BicepCurlMetrics } from "@/lib/BicepCurlAnalyzer";
import { LateralRaisesAnalyzer, type LateralRaisesMetrics } from "@/lib/LateralRaisesAnalyzer";
import { Play, Square, RotateCcw, FileText, Trash2, ChevronDown, Camera, CameraOff, Volume2, VolumeX, HelpCircle, X } from "lucide-react";
import {
  VoiceFeedbackManager,
  WebSpeechVoice,
  BICEP_CURL_MESSAGES,
  LATERAL_RAISE_MESSAGES,
  getRepCountMessage,
  getRandomEncouragement,
  SESSION_MESSAGES,
  VOICE_FEEDBACK_SETTINGS
} from "@/lib/voice";
import "./fitness.css";

type ExerciseType = 'bicep-curl' | 'lateral-raises';

// Union type for metrics
type ExerciseMetrics = BicepCurlMetrics | LateralRaisesMetrics;

export default function FitnessPage() {
  const [selectedExercise, setSelectedExercise] = useState<ExerciseType>('bicep-curl');
  const [isExerciseActive, setIsExerciseActive] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraCommand, setCameraCommand] = useState<'start' | 'stop' | null>(null);
  const isExerciseActiveRef = useRef(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [voiceVolume, setVoiceVolume] = useState(VOICE_FEEDBACK_SETTINGS.DEFAULT_VOLUME);
  const [metrics, setMetrics] = useState<ExerciseMetrics>({
    repCount: 0,
    currentAngle: { left: 180, right: 180 },
    formScore: 0,
    postureScore: 0,
    armPositionScore: 0,
    visibilityScore: 0,
    feedback: [],
    isInValidPosition: false,
    phase: 'down',
  });

  const bicepAnalyzerRef = useRef<BicepCurlAnalyzer | null>(null);
  const lateralAnalyzerRef = useRef<LateralRaisesAnalyzer | null>(null);
  const voiceManagerRef = useRef<VoiceFeedbackManager | null>(null);
  const lastRepCountRef = useRef(0);
  const lastPhaseRef = useRef<'up' | 'down' | 'neutral'>('down');
  const lastPostureWarningRef = useRef(0);
  const lastElbowWarningRef = useRef(0);
  const lastHeightWarningRef = useRef(0);
  const lastLegBendWarningRef = useRef(0);
  const lastArmsHighWarningRef = useRef(0);

  // Initialize bicep curl analyzer with logging callback
  if (!bicepAnalyzerRef.current) {
    bicepAnalyzerRef.current = new BicepCurlAnalyzer(async (message: string) => {
      try {
        await fetch('/api/log', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message }),
        });
      } catch (error) {
        console.error('Failed to send log to API:', error);
      }
    });
  }

  // Initialize lateral raises analyzer with logging callback
  if (!lateralAnalyzerRef.current) {
    lateralAnalyzerRef.current = new LateralRaisesAnalyzer(async (message: string) => {
      try {
        await fetch('/api/log', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message }),
        });
      } catch (error) {
        console.error('Failed to send log to API:', error);
      }
    });
  }

  // Initialize voice feedback manager
  useEffect(() => {
    if (typeof window !== 'undefined' && !voiceManagerRef.current) {
      console.log('🎤 Initializing voice feedback system...');

      // Check if speech synthesis is supported
      if (!('speechSynthesis' in window)) {
        console.error('❌ Speech synthesis not supported in this browser');
        alert('Voice feedback is not supported in your browser. Please use Chrome, Safari, or Edge.');
        setVoiceEnabled(false);
        return;
      }

      console.log('✅ Speech synthesis supported');

      const voiceProvider = new WebSpeechVoice({
        rate: 1.0,
        pitch: 1.0,
        volume: voiceVolume,
        language: 'en-US',
      });

      console.log(`🔧 Voice config - Volume: ${voiceVolume}, Rate: 1.0, Pitch: 1.0, Language: en-US`);

      voiceManagerRef.current = new VoiceFeedbackManager(voiceProvider, {
        minMessageInterval: VOICE_FEEDBACK_SETTINGS.MIN_MESSAGE_INTERVAL,
        maxQueueSize: VOICE_FEEDBACK_SETTINGS.MAX_QUEUE_SIZE,
        priorityInterrupts: true,
      });

      console.log(`📋 Voice manager config - Min interval: ${VOICE_FEEDBACK_SETTINGS.MIN_MESSAGE_INTERVAL}ms, Max queue: ${VOICE_FEEDBACK_SETTINGS.MAX_QUEUE_SIZE}, Priority interrupts: true`);

      if (voiceEnabled) {
        console.log('🔊 Voice feedback enabled');
        voiceManagerRef.current.enable();
      } else {
        console.log('🔇 Voice feedback disabled');
        voiceManagerRef.current.disable();
      }
    }
  }, [voiceVolume, voiceEnabled]);

  // Update voice volume when changed
  useEffect(() => {
    if (voiceManagerRef.current) {
      voiceManagerRef.current.setVolume(voiceVolume);
    }
  }, [voiceVolume]);

  // Enable/disable voice when state changes
  useEffect(() => {
    if (voiceManagerRef.current) {
      if (voiceEnabled) {
        voiceManagerRef.current.enable();
      } else {
        voiceManagerRef.current.disable();
      }
    }
  }, [voiceEnabled]);

  const handlePoseDetected = useCallback((landmarks: any) => {
    const analyzer = selectedExercise === 'bicep-curl' ? bicepAnalyzerRef.current : lateralAnalyzerRef.current;

    console.log(`🔍 handlePoseDetected called | Exercise: ${selectedExercise} | Active (ref): ${isExerciseActiveRef.current} | Analyzer exists: ${!!analyzer} | Landmarks: ${landmarks?.length || 0}`);

    if (!isExerciseActiveRef.current || !analyzer) {
      console.log(`⚠️ Skipping analysis - Exercise Active: ${isExerciseActiveRef.current}, Analyzer: ${!!analyzer}`);
      return;
    }

    console.log("✅ Calling analyzer.analyze()...");
    const newMetrics = analyzer.analyze(landmarks);
    setMetrics(newMetrics);

    // Voice feedback logic
    if (voiceManagerRef.current && voiceEnabled) {
      const now = Date.now();
      console.log(`🎙️ Voice feedback active - Rep: ${newMetrics.repCount}, Posture: ${newMetrics.postureScore}, Phase: ${newMetrics.phase}`);

      // Rep count announcements (high priority)
      if (newMetrics.repCount > lastRepCountRef.current) {
        console.log(`🎯 Rep count increased: ${lastRepCountRef.current} -> ${newMetrics.repCount}`);
        const repMessage = getRepCountMessage(newMetrics.repCount);
        if (repMessage.text) {
          // Clear any pending rep count messages from the queue before adding the new one
          // This ensures only the CURRENT rep count is announced, never stale/old reps
          voiceManagerRef.current.clearRepCountMessages();
          console.log(`📢 VOICE: Queueing rep count - "${repMessage.text}" with priority ${repMessage.priority}`);
          voiceManagerRef.current.queueMessage(repMessage.text, repMessage.priority);
        }

        // Encouragement every N reps
        if (newMetrics.repCount % VOICE_FEEDBACK_SETTINGS.ENCOURAGEMENT_EVERY_N_REPS === 0) {
          const encouragement = getRandomEncouragement(
            selectedExercise === 'bicep-curl' ? 'bicep' : 'lateral'
          );
          console.log(`📢 VOICE: Queueing encouragement - "${encouragement.text}"`);
          voiceManagerRef.current.queueMessage(encouragement.text, encouragement.priority);
        }

        lastRepCountRef.current = newMetrics.repCount;
      }

      // Posture warnings (high priority, rate limited)
      if (newMetrics.postureScore < 70 && now - lastPostureWarningRef.current > 8000) {
        const postureMessage = selectedExercise === 'bicep-curl'
          ? BICEP_CURL_MESSAGES.STAND_STRAIGHT
          : LATERAL_RAISE_MESSAGES.STAND_STRAIGHT;
        console.log(`📢 VOICE: Queueing posture warning - "${postureMessage.text}" with priority ${postureMessage.priority}`);
        voiceManagerRef.current.queueMessage(postureMessage.text, postureMessage.priority);
        lastPostureWarningRef.current = now;
      }

      // LEG BENDING DETECTION (Both exercises - HIGH priority)
      if (newMetrics.legBending && newMetrics.legBending.hasLegBend) {
        const timeSinceLastWarning = now - lastLegBendWarningRef.current;
        console.log(`🦵 LEG BEND DETECTED | Left knee: ${newMetrics.legBending.leftKneeAngle}° | Right knee: ${newMetrics.legBending.rightKneeAngle}° | Time since last warning: ${timeSinceLastWarning}ms | Rate limit: ${VOICE_FEEDBACK_SETTINGS.LEG_BEND_RATE_LIMIT}ms`);

        if (timeSinceLastWarning > VOICE_FEEDBACK_SETTINGS.LEG_BEND_RATE_LIMIT) {
          const legBendMessage = selectedExercise === 'bicep-curl'
            ? BICEP_CURL_MESSAGES.LEGS_BENT
            : LATERAL_RAISE_MESSAGES.LEGS_BENT;

          console.log(`📢 VOICE: Queueing leg bend message - "${legBendMessage.text}" with priority ${legBendMessage.priority}`);
          console.log(`🎤 Voice Manager State - Enabled: ${voiceManagerRef.current.isVoiceEnabled()}, Speaking: ${voiceManagerRef.current.isSpeakingNow()}, Queue size: ${voiceManagerRef.current.getQueueSize()}`);

          voiceManagerRef.current.queueMessage(
            legBendMessage.text,
            legBendMessage.priority
          );
          lastLegBendWarningRef.current = now;

          console.log(`✅ Leg bend message queued successfully at ${now}`);
        } else {
          console.log(`⏱️ Leg bend voice feedback RATE LIMITED | Time since last: ${timeSinceLastWarning}ms | Need to wait: ${VOICE_FEEDBACK_SETTINGS.LEG_BEND_RATE_LIMIT - timeSinceLastWarning}ms more`);
        }
      } else if (newMetrics.legBending) {
        console.log(`✅ Legs straight - Left: ${newMetrics.legBending.leftKneeAngle}° | Right: ${newMetrics.legBending.rightKneeAngle}°`);
      }

      // Exercise-specific feedback
      if (selectedExercise === 'bicep-curl') {
        const bicepMetrics = newMetrics as BicepCurlMetrics;
        // Elbow position warnings (medium priority, rate limited)
        if (bicepMetrics.armPositionScore < 70 && now - lastElbowWarningRef.current > 10000) {
          console.log(`📢 VOICE: Queueing elbow position warning - "${BICEP_CURL_MESSAGES.ELBOWS_CLOSE.text}"`);
          voiceManagerRef.current.queueMessage(
            BICEP_CURL_MESSAGES.ELBOWS_CLOSE.text,
            BICEP_CURL_MESSAGES.ELBOWS_CLOSE.priority
          );
          lastElbowWarningRef.current = now;
        }

        console.log(`📊 Metrics updated - Reps: ${bicepMetrics.repCount}, Left: ${bicepMetrics.currentAngle.left}°, Right: ${bicepMetrics.currentAngle.right}°`);
      } else {
        const lateralMetrics = newMetrics as LateralRaisesMetrics;

        // Arm height warnings (medium priority, rate limited)
        const avgEshAngle = (lateralMetrics.eshAngles.left + lateralMetrics.eshAngles.right) / 2;

        // ARMS TOO HIGH DETECTION (Lateral Raises only - HIGH priority)
        if (avgEshAngle > VOICE_FEEDBACK_SETTINGS.LATERAL_ARMS_TOO_HIGH_THRESHOLD && newMetrics.phase === 'up') {
          if (now - lastArmsHighWarningRef.current > VOICE_FEEDBACK_SETTINGS.ARMS_TOO_HIGH_RATE_LIMIT) {
            console.log(`📢 VOICE: Queueing arms too high warning - "${LATERAL_RAISE_MESSAGES.ARMS_TOO_HIGH.text}"`);
            voiceManagerRef.current.queueMessage(
              LATERAL_RAISE_MESSAGES.ARMS_TOO_HIGH.text,
              LATERAL_RAISE_MESSAGES.ARMS_TOO_HIGH.priority
            );
            lastArmsHighWarningRef.current = now;
          }
        }

        // Original height warnings (medium priority)
        if (now - lastHeightWarningRef.current > 10000) {
          if (avgEshAngle < VOICE_FEEDBACK_SETTINGS.LATERAL_MIN_ANGLE && newMetrics.phase === 'up') {
            console.log(`📢 VOICE: Queueing raise higher warning - "${LATERAL_RAISE_MESSAGES.RAISE_HIGHER.text}"`);
            voiceManagerRef.current.queueMessage(
              LATERAL_RAISE_MESSAGES.RAISE_HIGHER.text,
              LATERAL_RAISE_MESSAGES.RAISE_HIGHER.priority
            );
            lastHeightWarningRef.current = now;
          } else if (avgEshAngle > VOICE_FEEDBACK_SETTINGS.LATERAL_MAX_ANGLE) {
            console.log(`📢 VOICE: Queueing too high warning - "${LATERAL_RAISE_MESSAGES.TOO_HIGH.text}"`);
            voiceManagerRef.current.queueMessage(
              LATERAL_RAISE_MESSAGES.TOO_HIGH.text,
              LATERAL_RAISE_MESSAGES.TOO_HIGH.priority
            );
            lastHeightWarningRef.current = now;
          }
        }

        console.log(`📊 Metrics updated - Reps: ${lateralMetrics.repCount}, Left ESH: ${lateralMetrics.eshAngles.left}°, Right ESH: ${lateralMetrics.eshAngles.right}°`);
      }

      // Phase changes (optional low priority)
      if (newMetrics.phase !== lastPhaseRef.current) {
        lastPhaseRef.current = newMetrics.phase;
      }
    }
  }, [selectedExercise, voiceEnabled]);

  const startExercise = () => {
    if (!cameraActive) {
      alert('Please turn on the camera first!');
      return;
    }
    setIsExerciseActive(true);
    isExerciseActiveRef.current = true;

    // Reset appropriate analyzer
    const analyzer = selectedExercise === 'bicep-curl' ? bicepAnalyzerRef.current : lateralAnalyzerRef.current;
    if (analyzer) {
      analyzer.reset();
    }

    // Reset voice feedback tracking
    lastRepCountRef.current = 0;
    lastPhaseRef.current = 'down';
    lastPostureWarningRef.current = 0;
    lastElbowWarningRef.current = 0;
    lastHeightWarningRef.current = 0;
    lastLegBendWarningRef.current = 0;
    lastArmsHighWarningRef.current = 0;

    // Voice feedback: workout started
    if (voiceManagerRef.current && voiceEnabled) {
      voiceManagerRef.current.queueMessage(
        SESSION_MESSAGES.START.text,
        SESSION_MESSAGES.START.priority
      );
    }

    // Set initial metrics based on exercise type
    if (selectedExercise === 'bicep-curl') {
      setMetrics({
        repCount: 0,
        currentAngle: { left: 180, right: 180 },
        formScore: 0,
        postureScore: 0,
        armPositionScore: 0,
        visibilityScore: 0,
        feedback: [],
        isInValidPosition: false,
        phase: 'down',
      });
    } else {
      setMetrics({
        repCount: 0,
        eshAngles: { left: 0, right: 0 },
        formScore: 0,
        postureScore: 0,
        armElevationScore: 0,
        visibilityScore: 0,
        feedback: [],
        isInValidPosition: false,
        phase: 'down',
      });
    }

    console.log(`🏋️ ${selectedExercise === 'bicep-curl' ? 'Bicep Curl' : 'Lateral Raises'} Exercise Started - Logging to console and file`);
  };

  const stopExercise = () => {
    console.log('🛑 Stopping exercise and clearing memory...');

    setIsExerciseActive(false);
    isExerciseActiveRef.current = false;

    // Stop any ongoing voice feedback
    if (voiceManagerRef.current) {
      voiceManagerRef.current.stopAndClear();
    }

    // Memory cleanup: Reset both analyzers to clear accumulated data
    console.log('🧹 Resetting analyzers to clear accumulated data...');
    if (bicepAnalyzerRef.current) {
      bicepAnalyzerRef.current.reset();
      console.log('✅ Bicep curl analyzer reset');
    }
    if (lateralAnalyzerRef.current) {
      lateralAnalyzerRef.current.reset();
      console.log('✅ Lateral raises analyzer reset');
    }

    // Clear metrics state
    console.log('🧹 Clearing metrics state...');
    resetExercise();
    console.log('✅ Metrics cleared');

    // Trigger garbage collection hint (if available)
    if ((window as any).gc) {
      try {
        (window as any).gc();
        console.log('✅ Garbage collection triggered - memory cleared');
      } catch (e) {
        console.log('⚠️ Garbage collection failed:', e);
      }
    } else {
      console.log('ℹ️ Manual garbage collection not available (run Chrome with --js-flags="--expose-gc" to enable)');
    }

    // Voice feedback: workout paused
    if (voiceManagerRef.current && voiceEnabled) {
      voiceManagerRef.current.queueMessage(
        SESSION_MESSAGES.PAUSE.text,
        SESSION_MESSAGES.PAUSE.priority
      );
    }

    console.log('⏸️ Exercise stopped - Memory cleanup complete');
  };

  const handleCameraStateChange = (active: boolean) => {
    setCameraActive(active);
  };

  const startCamera = () => {
    setCameraCommand('start');
    setTimeout(() => setCameraCommand(null), 100);
  };

  const stopCamera = () => {
    setCameraCommand('stop');
    setTimeout(() => setCameraCommand(null), 100);
  };

  const resetExercise = () => {
    const analyzer = selectedExercise === 'bicep-curl' ? bicepAnalyzerRef.current : lateralAnalyzerRef.current;
    if (analyzer) {
      analyzer.reset();
    }

    if (selectedExercise === 'bicep-curl') {
      setMetrics({
        repCount: 0,
        currentAngle: { left: 180, right: 180 },
        formScore: 0,
        postureScore: 0,
        armPositionScore: 0,
        visibilityScore: 0,
        feedback: [],
        isInValidPosition: false,
        phase: 'down',
      });
    } else {
      setMetrics({
        repCount: 0,
        eshAngles: { left: 0, right: 0 },
        formScore: 0,
        postureScore: 0,
        armElevationScore: 0,
        visibilityScore: 0,
        feedback: [],
        isInValidPosition: false,
        phase: 'down',
      });
    }

    console.log('🔄 Exercise Reset');
  };

  const saveSession = async () => {
    try {
      const exerciseName = selectedExercise === 'bicep-curl' ? 'Bicep Curl' : 'Lateral Raises';

      let sessionData;
      if (selectedExercise === 'bicep-curl') {
        const bicepMetrics = metrics as BicepCurlMetrics;
        sessionData = {
          exercise: exerciseName,
          reps: bicepMetrics.repCount,
          duration: 0,
          formScore: bicepMetrics.formScore,
          postureScore: bicepMetrics.postureScore,
          armPositionScore: bicepMetrics.armPositionScore,
          visibilityScore: bicepMetrics.visibilityScore,
          avgElbowAngle: (bicepMetrics.currentAngle.left + bicepMetrics.currentAngle.right) / 2,
        };
      } else {
        const lateralMetrics = metrics as LateralRaisesMetrics;
        sessionData = {
          exercise: exerciseName,
          reps: lateralMetrics.repCount,
          duration: 0,
          formScore: lateralMetrics.formScore,
          postureScore: lateralMetrics.postureScore,
          armElevationScore: lateralMetrics.armElevationScore,
          visibilityScore: lateralMetrics.visibilityScore,
          avgESHAngle: (lateralMetrics.eshAngles.left + lateralMetrics.eshAngles.right) / 2,
        };
      }

      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionData),
      });

      if (response.ok) {
        if (voiceManagerRef.current && voiceEnabled) {
          voiceManagerRef.current.queueMessage(
            SESSION_MESSAGES.COMPLETE.text,
            SESSION_MESSAGES.COMPLETE.priority
          );
        }

        alert(`Session saved! Reps: ${metrics.repCount}, Form Score: ${metrics.formScore}`);
        resetExercise();
      } else {
        alert('Failed to save session. Please try again.');
      }
    } catch (error) {
      console.error('Error saving session:', error);
      alert('Failed to save session. Please try again.');
    }
  };

  const viewLogs = async () => {
    try {
      const response = await fetch('/api/log');
      const data = await response.json();

      if (data.logs && data.logs.length > 0) {
        console.log('=== EXERCISE LOGS ===');
        data.logs.forEach((log: string) => console.log(log));
        console.log('===================');
        alert(`Logs displayed in console. Total: ${data.logs.length} entries`);
      } else {
        alert('No logs found. Start exercising to generate logs!');
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
      alert('Failed to fetch logs.');
    }
  };

  const clearLogs = async () => {
    if (!confirm('Are you sure you want to clear all logs?')) {
      return;
    }

    try {
      const response = await fetch('/api/log', {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('Logs cleared successfully!');
        console.log('📝 All exercise logs have been cleared');
      } else {
        alert('Failed to clear logs.');
      }
    } catch (error) {
      console.error('Error clearing logs:', error);
      alert('Failed to clear logs.');
    }
  };

  const metricsOverlay =
    selectedExercise === 'bicep-curl'
      ? {
          reps: metrics.repCount,
          formScore: metrics.formScore,
          postureScore: metrics.postureScore,
          armMetricLabel: 'Arm Position',
          armMetricScore: 'armPositionScore' in metrics ? metrics.armPositionScore : 0,
          leftAngleLabel: 'Left Elbow',
          leftAngleValue: 'currentAngle' in metrics ? metrics.currentAngle.left : 0,
          rightAngleLabel: 'Right Elbow',
          rightAngleValue: 'currentAngle' in metrics ? metrics.currentAngle.right : 0,
          phaseLabel: metrics.phase === 'up' ? 'Curling' : 'Lowering',
        }
      : {
          reps: metrics.repCount,
          formScore: metrics.formScore,
          postureScore: metrics.postureScore,
          armMetricLabel: 'Arm Elevation',
          armMetricScore: 'armElevationScore' in metrics ? metrics.armElevationScore : 0,
          leftAngleLabel: 'Left Shoulder',
          leftAngleValue: 'eshAngles' in metrics && metrics.eshAngles ? metrics.eshAngles.left : 0,
          rightAngleLabel: 'Right Shoulder',
          rightAngleValue: 'eshAngles' in metrics && metrics.eshAngles ? metrics.eshAngles.right : 0,
          phaseLabel: metrics.phase === 'up' ? 'Raising' : 'Lowering',
        };

  return (
    <>
      {!isExerciseActive && <Navigation />}

      <main className={`min-h-screen bg-doom-bg ${!isExerciseActive ? 'pt-16' : 'pt-0'} pb-8 max-w-full overflow-x-hidden`}>
        <div className="px-3 sm:px-4 py-4 pb-8 max-w-full">

          <div className="top-bar">
            <div className="exercise-selector-container">
              <label className="exercise-selector-label">Exercise Tracker:</label>
              <div className="exercise-dropdown">
                <select
                  value={selectedExercise}
                  onChange={(e) => {
                    const newExercise = e.target.value as ExerciseType;
                    setSelectedExercise(newExercise);

                    if (newExercise === 'bicep-curl') {
                      setMetrics({
                        repCount: 0,
                        currentAngle: { left: 180, right: 180 },
                        formScore: 0,
                        postureScore: 0,
                        armPositionScore: 0,
                        visibilityScore: 0,
                        feedback: [],
                        isInValidPosition: false,
                        phase: 'down',
                      });
                    } else {
                      setMetrics({
                        repCount: 0,
                        eshAngles: { left: 0, right: 0 },
                        formScore: 0,
                        postureScore: 0,
                        armElevationScore: 0,
                        visibilityScore: 0,
                        feedback: [],
                        isInValidPosition: false,
                        phase: 'down',
                      });
                    }

                    console.log(`🔄 Exercise changed to: ${newExercise === 'bicep-curl' ? 'Bicep Curl' : 'Lateral Raises'}`);
                  }}
                  className="exercise-select"
                  disabled={isExerciseActive}
                >
                  <option value="bicep-curl">Bicep Curl</option>
                  <option value="lateral-raises">Lateral Raises</option>
                </select>
                <ChevronDown className="dropdown-icon" />
              </div>
              <button
                onClick={() => setShowInstructionsModal(true)}
                className="help-button"
                title="View setup instructions"
              >
                <HelpCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="control-buttons-horizontal">
              {!isExerciseActive ? (
                <button onClick={startExercise} className="btn-primary">
                  <Play className="w-4 h-4" />
                  <span>Start Exercise</span>
                </button>
              ) : (
                <button onClick={stopExercise} className="btn-secondary">
                  <Square className="w-4 h-4" />
                  <span>Stop Exercise</span>
                </button>
              )}

              <button onClick={resetExercise} className="btn-outline">
                <RotateCcw className="w-4 h-4" />
                <span>Reset</span>
              </button>

              {cameraActive ? (
                <button onClick={stopCamera} className="btn-outline">
                  <CameraOff className="w-4 h-4" />
                  <span className="hidden sm:inline">Stop Camera</span>
                </button>
              ) : (
                <button onClick={startCamera} className="btn-outline">
                  <Camera className="w-4 h-4" />
                  <span className="hidden sm:inline">Start Camera</span>
                </button>
              )}

              <button onClick={viewLogs} className="btn-outline" title="View logs in console">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">View Logs</span>
              </button>

              <button onClick={clearLogs} className="btn-outline" title="Clear all logs">
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Clear Logs</span>
              </button>

              <button
                onClick={() => {
                  const newVoiceState = !voiceEnabled;
                  setVoiceEnabled(newVoiceState);
                  if (voiceManagerRef.current) {
                    if (newVoiceState) {
                      voiceManagerRef.current.enable();
                    } else {
                      voiceManagerRef.current.disable();
                      voiceManagerRef.current.stopAndClear();
                    }
                  }
                }}
                className={`btn-outline ${voiceEnabled ? 'bg-green-500/20' : ''}`}
                title={voiceEnabled ? "Mute voice feedback" : "Unmute voice feedback"}
              >
                {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                <span className="hidden sm:inline">{voiceEnabled ? 'Voice On' : 'Voice Off'}</span>
              </button>
            </div>
          </div>

          <div className="camera-container">
            <WebcamCapture
              onPoseDetected={handlePoseDetected}
              isActive={isExerciseActive}
              className="w-full h-full"
              currentAngles={
                selectedExercise === 'bicep-curl' && 'currentAngle' in metrics
                  ? metrics.currentAngle
                  : undefined
              }
              onCameraStateChange={handleCameraStateChange}
              cameraCommand={cameraCommand}
              formValidation={metrics.formValidation}
              metricsOverlay={metricsOverlay}
            />
          </div>

        </div>

        {/* Instructions Modal */}
        {showInstructionsModal && (
          <div className="modal-overlay" onClick={() => setShowInstructionsModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">
                  {selectedExercise === 'bicep-curl' ? 'Bicep Curl' : 'Lateral Raises'} Setup
                </h2>
                <button
                  onClick={() => setShowInstructionsModal(false)}
                  className="modal-close"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="modal-body">
                <h3 className="modal-section-title">General Setup</h3>
                <ul className="instructions-list">
                  <li>Stand 6-8 feet away from the camera</li>
                  <li>Ensure your full body is visible in the frame</li>
                  <li>Stand straight with good posture</li>
                  <li>Good lighting helps improve accuracy</li>
                </ul>

                <h3 className="modal-section-title">Exercise-Specific</h3>
                <ul className="instructions-list">
                  {selectedExercise === 'bicep-curl' ? (
                    <>
                      <li><strong>Keep your elbows close</strong> to your sides throughout the movement</li>
                      <li><strong>Full range of motion</strong> - curl from fully extended to fully contracted</li>
                      <li><strong>Keep legs straight</strong> - no bending at the knees</li>
                      <li><strong>Control the weight</strong> - don't swing or use momentum</li>
                    </>
                  ) : (
                    <>
                      <li><strong>Start position:</strong> Arms at your sides, relaxed</li>
                      <li><strong>Raise to shoulder level</strong> - aim for 80-90 degrees</li>
                      <li><strong>Don't raise too high</strong> - avoid going above shoulder level</li>
                      <li><strong>Keep legs straight</strong> - no bending at the knees</li>
                      <li><strong>Arms slightly bent</strong> - maintain a small bend in elbows</li>
                    </>
                  )}
                </ul>

                <h3 className="modal-section-title">Tips</h3>
                <ul className="instructions-list">
                  <li>Perform movements slowly and with control</li>
                  <li>Focus on form over speed</li>
                  <li>Breathe steadily throughout each rep</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
