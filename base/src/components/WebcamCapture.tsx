"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, CameraOff, Loader2, Target, User, Activity, ArrowUp, ArrowDown } from "lucide-react";

interface WebcamCaptureProps {
  onPoseDetected?: (landmarks: any) => void;
  isActive: boolean;
  className?: string;
  currentAngles?: { left: number; right: number } | null;
  onCameraStateChange?: (active: boolean) => void;
  cameraCommand?: 'start' | 'stop' | null;
  formValidation?: {
    bodyHeightRatio?: number;
    backAngle?: number;
    leftArmScore?: number;
    rightArmScore?: number;
    leftLegScore?: number;
    rightLegScore?: number;
  } | null;
  metricsOverlay?: {
    reps: number;
    formScore: number;
    postureScore: number;
    armMetricLabel: string;
    armMetricScore: number;
    leftAngleLabel: string;
    leftAngleValue: number;
    rightAngleLabel: string;
    rightAngleValue: number;
    phaseLabel: string;
  } | null;
}

export function WebcamCapture({ onPoseDetected, isActive, className = "", currentAngles = null, onCameraStateChange, cameraCommand, formValidation = null, metricsOverlay = null }: WebcamCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const poseRef = useRef<any>(null); // ONLY ref-based pose storage to prevent re-render issues
  const cameraRef = useRef<any>(null);
  const isInitializingRef = useRef(false);
  const isMountedRef = useRef(true); // Track if component is still mounted/active
  const cameraActiveRef = useRef(false); // Ref for immediate camera state (no async state delay)
  const onPoseDetectedRef = useRef(onPoseDetected);
  const formValidationRef = useRef(formValidation);

  useEffect(() => {
    onPoseDetectedRef.current = onPoseDetected;
  }, [onPoseDetected]);

  useEffect(() => {
    formValidationRef.current = formValidation;
  }, [formValidation]);

  // Draw landmarks on canvas (defined first to avoid initialization issues)
  const drawLandmarks = useCallback((ctx: CanvasRenderingContext2D, landmarks: any[], width: number, height: number) => {
    // Only draw core body landmarks (exclude hands/feet details)
    const landmarksToDraw = [
      0,  // Nose
      1,  // Left eye inner
      2,  // Left eye
      4,  // Right eye inner
      5,  // Right eye
      11, // Left shoulder
      12, // Right shoulder
      13, // Left elbow
      14, // Right elbow
      15, // Left wrist
      16, // Right wrist
      23, // Left hip
      24, // Right hip
      25, // Left knee
      26, // Right knee
      27, // Left ankle
      28, // Right ankle
    ];

    landmarksToDraw.forEach((index) => {
      const landmark = landmarks[index];
      if (!landmark) return;

      const x = landmark.x * width;
      const y = landmark.y * height;

      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = "#00ff88";
      ctx.fill();
      ctx.strokeStyle = "#00d9ff";
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }, []);

  // Helper function to calculate angle between three points
  const calculateAngle = useCallback((a: any, b: any, c: any): number => {
    if (!a || !b || !c) return 0;

    const angle1 = Math.atan2(a.y - b.y, a.x - b.x);
    const angle2 = Math.atan2(c.y - b.y, c.x - b.x);
    const radians = angle2 - angle1;

    let angle = Math.abs(radians * (180 / Math.PI));

    if (angle > 180.0) {
      angle = 360 - angle;
    }

    return angle;
  }, []);

  // Draw connections between landmarks (skeleton)
  const drawConnections = useCallback((ctx: CanvasRenderingContext2D, landmarks: any[], width: number, height: number, formValidation: any) => {
    // Define connection groups with their validation logic
    const postureConnections = [
      [11, 23], // Left shoulder to left hip
      [12, 24], // Right shoulder to right hip
    ];

    const leftArmConnections = [
      [11, 13], // Left shoulder to left elbow
      [13, 15], // Left elbow to left wrist
    ];

    const rightArmConnections = [
      [12, 14], // Right shoulder to right elbow
      [14, 16], // Right elbow to right wrist
    ];

    const torsoConnections = [
      [11, 12], // Shoulders
      [23, 24], // Hips
    ];

    const leftLegConnections = [
      [23, 25], // Left hip to left knee
      [25, 27], // Left knee to left ankle
    ];

    const rightLegConnections = [
      [24, 26], // Right hip to right knee
      [26, 28], // Right knee to right ankle
    ];

    ctx.lineWidth = 3;

    // Calculate bodyHeightRatio from landmarks (head to ankles)
    const nose = landmarks[0];
    const leftAnkle = landmarks[27];
    const rightAnkle = landmarks[28];
    let bodyHeightRatio = 0;

    if (nose && leftAnkle && rightAnkle) {
      const headY = nose.y;
      const avgAnkleY = (leftAnkle.y + rightAnkle.y) / 2;
      bodyHeightRatio = Math.abs(avgAnkleY - headY);
    }

    // Calculate back angle (shoulder-hip-knee angle)
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    const leftKnee = landmarks[25];
    const rightKnee = landmarks[26];

    const leftBackAngle = calculateAngle(leftShoulder, leftHip, leftKnee);
    const rightBackAngle = calculateAngle(rightShoulder, rightHip, rightKnee);
    const backAngle = (leftBackAngle + rightBackAngle) / 2;

    // PRIORITY 1: Check if user is too close to camera (bodyHeightRatio > 0.8)
    // If too close, make ENTIRE skeleton RED
    const isTooClose = bodyHeightRatio > 0.8;

    if (isTooClose) {
      // Make ENTIRE skeleton RED when too close
      const redColor = "rgba(255, 0, 0, 0.7)";
      ctx.strokeStyle = redColor;

      // Draw all connections in red
      [...postureConnections, ...leftArmConnections, ...rightArmConnections, ...torsoConnections, ...leftLegConnections, ...rightLegConnections].forEach(([startIdx, endIdx]) => {
        const start = landmarks[startIdx];
        const end = landmarks[endIdx];
        if (start && end) {
          ctx.beginPath();
          ctx.moveTo(start.x * width, start.y * height);
          ctx.lineTo(end.x * width, end.y * height);
          ctx.stroke();
        }
      });
      return; // Exit early - don't apply individual validation colors
    }

    // PRIORITY 2: Individual line validation (only if NOT too close)

    // Posture lines (shoulder-to-hip): RED if backAngle < 170°, GREEN if >= 170°
    const postureGood = backAngle >= 170;
    const postureColor = postureGood ? "rgba(0, 255, 0, 0.6)" : "rgba(255, 0, 0, 0.7)";
    ctx.strokeStyle = postureColor;
    postureConnections.forEach(([startIdx, endIdx]) => {
      const start = landmarks[startIdx];
      const end = landmarks[endIdx];
      if (start && end) {
        ctx.beginPath();
        ctx.moveTo(start.x * width, start.y * height);
        ctx.lineTo(end.x * width, end.y * height);
        ctx.stroke();
      }
    });

    // Left arm lines: RED if score < 50%, GREEN if >= 50%
    // Use formValidation if provided, otherwise default to green (no validation)
    const leftArmScore = formValidation?.leftArmScore ?? 100;
    const leftArmGood = leftArmScore >= 50;
    const leftArmColor = leftArmGood ? "rgba(0, 255, 0, 0.6)" : "rgba(255, 0, 0, 0.7)";
    ctx.strokeStyle = leftArmColor;
    leftArmConnections.forEach(([startIdx, endIdx]) => {
      const start = landmarks[startIdx];
      const end = landmarks[endIdx];
      if (start && end) {
        ctx.beginPath();
        ctx.moveTo(start.x * width, start.y * height);
        ctx.lineTo(end.x * width, end.y * height);
        ctx.stroke();
      }
    });

    // Right arm lines: RED if score < 50%, GREEN if >= 50%
    // Use formValidation if provided, otherwise default to green (no validation)
    const rightArmScore = formValidation?.rightArmScore ?? 100;
    const rightArmGood = rightArmScore >= 50;
    const rightArmColor = rightArmGood ? "rgba(0, 255, 0, 0.6)" : "rgba(255, 0, 0, 0.7)";
    ctx.strokeStyle = rightArmColor;
    rightArmConnections.forEach(([startIdx, endIdx]) => {
      const start = landmarks[startIdx];
      const end = landmarks[endIdx];
      if (start && end) {
        ctx.beginPath();
        ctx.moveTo(start.x * width, start.y * height);
        ctx.lineTo(end.x * width, end.y * height);
        ctx.stroke();
      }
    });

    // Torso connector lines (shoulder bar, hip bar): Always GREEN
    ctx.strokeStyle = "rgba(0, 255, 0, 0.6)";
    torsoConnections.forEach(([startIdx, endIdx]) => {
      const start = landmarks[startIdx];
      const end = landmarks[endIdx];
      if (start && end) {
        ctx.beginPath();
        ctx.moveTo(start.x * width, start.y * height);
        ctx.lineTo(end.x * width, end.y * height);
        ctx.stroke();
      }
    });

    // Left leg lines: RED if score < 50%, GREEN if >= 50%
    const leftLegScore = formValidation?.leftLegScore ?? 100;
    const leftLegGood = leftLegScore >= 50;
    const leftLegColor = leftLegGood ? "rgba(0, 255, 0, 0.6)" : "rgba(255, 0, 0, 0.7)";
    ctx.strokeStyle = leftLegColor;
    leftLegConnections.forEach(([startIdx, endIdx]) => {
      const start = landmarks[startIdx];
      const end = landmarks[endIdx];
      if (start && end) {
        ctx.beginPath();
        ctx.moveTo(start.x * width, start.y * height);
        ctx.lineTo(end.x * width, end.y * height);
        ctx.stroke();
      }
    });

    // Right leg lines: RED if score < 50%, GREEN if >= 50%
    const rightLegScore = formValidation?.rightLegScore ?? 100;
    const rightLegGood = rightLegScore >= 50;
    const rightLegColor = rightLegGood ? "rgba(0, 255, 0, 0.6)" : "rgba(255, 0, 0, 0.7)";
    ctx.strokeStyle = rightLegColor;
    rightLegConnections.forEach(([startIdx, endIdx]) => {
      const start = landmarks[startIdx];
      const end = landmarks[endIdx];
      if (start && end) {
        ctx.beginPath();
        ctx.moveTo(start.x * width, start.y * height);
        ctx.lineTo(end.x * width, end.y * height);
        ctx.stroke();
      }
    });
  }, [calculateAngle]);

  // Draw all major joint angles near their joint vertices
  const drawJointAngles = useCallback((ctx: CanvasRenderingContext2D, landmarks: any[], width: number, height: number) => {
    type AngleSpec = {
      label: string;
      a: number;
      b: number; // vertex
      c: number;
      dx?: number;
      dy?: number;
    };

    // Core joint angles:
    // SEW: Shoulder-Elbow-Wrist (elbow bend)
    // ESH: Elbow-Shoulder-Hip (shoulder elevation alignment)
    // SHK: Shoulder-Hip-Knee (posture/hip hinge)
    // HKA: Hip-Knee-Ankle (knee bend)
    const angleSpecs: AngleSpec[] = [
      { label: "L-SEW", a: 11, b: 13, c: 15, dx: -14, dy: -10 },
      { label: "R-SEW", a: 12, b: 14, c: 16, dx: 8, dy: -10 },
      { label: "L-ESH", a: 13, b: 11, c: 23, dx: -14, dy: -10 },
      { label: "R-ESH", a: 14, b: 12, c: 24, dx: 8, dy: -10 },
      { label: "L-SHK", a: 11, b: 23, c: 25, dx: -14, dy: -10 },
      { label: "R-SHK", a: 12, b: 24, c: 26, dx: 8, dy: -10 },
      { label: "L-HKA", a: 23, b: 25, c: 27, dx: -14, dy: -10 },
      { label: "R-HKA", a: 24, b: 26, c: 28, dx: 8, dy: -10 },
    ];

    // Angle text style
    ctx.font = "13px monospace";
    ctx.lineWidth = 2;
    ctx.textBaseline = "middle";

    // Canvas is mirrored via CSS (scale-x-[-1]).
    // Mirror text around its own anchor point so glyphs stay readable
    // while label position still follows the mirrored skeleton.
    const drawReadableText = (text: string, x: number, y: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(-1, 1);
      ctx.textAlign = "left";
      ctx.strokeStyle = "rgba(0, 0, 0, 0.85)";
      ctx.strokeText(text, 0, 0);
      ctx.fillStyle = "#00d9ff";
      ctx.fillText(text, 0, 0);
      ctx.restore();
    };

    for (const spec of angleSpecs) {
      const pA = landmarks[spec.a];
      const pB = landmarks[spec.b];
      const pC = landmarks[spec.c];
      if (!pA || !pB || !pC) continue;

      const angle = Math.ceil(calculateAngle(pA, pB, pC)); // Round up
      const x = pB.x * width + (spec.dx ?? 0);
      const y = pB.y * height + (spec.dy ?? 0);
      const text = `${spec.label}: ${angle}°`;
      drawReadableText(text, x, y);
    }
  }, [calculateAngle]);

  // Handle pose detection results (using handleResults to avoid naming conflicts)
  const handleResults = useCallback(
    (results: any) => {
      // Check if component is still mounted and camera is active
      // This prevents using the pose instance after it's been destroyed
      // CRITICAL: Use cameraActiveRef.current instead of cameraActive state to avoid async state delay
      if (!isMountedRef.current || !cameraActiveRef.current) {
        console.log("Skipping results - component not active");
        return;
      }

      if (!canvasRef.current || !videoRef.current) {
        console.log("Skipping results - canvas or video not available");
        return;
      }

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        console.log("Skipping results - no canvas context");
        return;
      }

      canvas.width = videoRef.current.videoWidth || 1280;
      canvas.height = videoRef.current.videoHeight || 720;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (results.poseLandmarks) {
        console.log("Drawing pose landmarks on canvas!");
        // Draw skeleton on canvas when pose detected (with dynamic colors based on form)
        drawConnections(ctx, results.poseLandmarks, canvas.width, canvas.height, formValidationRef.current);
        drawLandmarks(ctx, results.poseLandmarks, canvas.width, canvas.height);
        drawJointAngles(ctx, results.poseLandmarks, canvas.width, canvas.height);

        // Call the callback prop if provided
        if (onPoseDetectedRef.current) {
          onPoseDetectedRef.current(results.poseLandmarks);
        }
      } else {
        console.log("No pose landmarks detected in this frame");
      }
    },
    [drawConnections, drawLandmarks, drawJointAngles]
  );

  // Initialize MediaPipe Pose when camera starts
  const initializePose = useCallback(async () => {
    if (typeof window === "undefined") return;

    // Guard against concurrent initialization attempts
    if (isInitializingRef.current) {
      console.log("Initialization already in progress, skipping...");
      return;
    }

    try {
      isInitializingRef.current = true;
      setIsLoading(true);
      setError(null);
      console.log("Starting camera initialization...");

      // CRITICAL: Clean up existing instances BEFORE creating new ones
      // This prevents memory leaks from accumulating pose instances
      console.log("Cleaning up existing instances before initialization...");

      // Step 1: Stop camera first to prevent new frames
      if (cameraRef.current) {
        try {
          cameraRef.current.stop();
          console.log("Stopped existing camera");
        } catch (err) {
          console.log("No active camera to stop");
        }
        cameraRef.current = null;
      }

      // Step 2: Close existing pose instance
      if (poseRef.current) {
        try {
          poseRef.current.close();
          console.log("Closed existing pose instance");
        } catch (err) {
          console.log("No active pose to close");
        }
        poseRef.current = null;
      }

      // Step 3: Stop existing video tracks
      const video = videoRef.current;
      if (video && video.srcObject) {
        const tracks = (video.srcObject as MediaStream).getTracks();
        tracks.forEach((track) => {
          track.stop();
          console.log("Stopped existing video track");
        });
        video.srcObject = null;
      }

      // Step 4: Wait for cleanup to complete and memory to be released
      console.log("Waiting for cleanup to complete...");
      await new Promise(resolve => setTimeout(resolve, 200));

      // Now proceed with initialization
      isMountedRef.current = true; // Set mounted flag when starting camera

      // Get camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        console.log("Video stream started");
      }

      // Load MediaPipe
      const { Pose } = await import("@mediapipe/pose");
      const { Camera: MediaPipeCamera } = await import("@mediapipe/camera_utils");

      console.log("Creating Pose instance...");

      // Fix for WASM Module.arguments error - set up global environment
      if (typeof (window as any).Module === 'undefined') {
        (window as any).Module = {};
      }

      const poseInstance = new Pose({
        locateFile: (file) => {
          // Use unpkg CDN with specific version for better compatibility
          return `https://unpkg.com/@mediapipe/pose@0.5.1675469404/${file}`;
        },
      });

      console.log("Setting Pose options...");
      poseInstance.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      // Store pose instance in ref BEFORE setting up camera
      // This ensures poseRef.current is available when onFrame starts calling
      poseRef.current = poseInstance;

      // Use handleResults as the callback
      poseInstance.onResults(handleResults);

      // CRITICAL: Set camera active flags BEFORE starting camera
      // This ensures handleResults doesn't skip results due to async state updates
      cameraActiveRef.current = true;
      setCameraActive(true);
      if (onCameraStateChange) onCameraStateChange(true);
      console.log("Camera flags set - ready to process results");

      if (videoRef.current) {
        const camera = new MediaPipeCamera(videoRef.current, {
          onFrame: async () => {
            // CRITICAL: Check if pose instance exists before sending frames
            // This prevents "Cannot pass deleted object" error
            if (poseRef.current && videoRef.current && isMountedRef.current) {
              try {
                console.log("Sending frame to pose detection...");
                await poseRef.current.send({ image: videoRef.current });
              } catch (err) {
                console.error("Error sending frame:", err);
                // Don't throw - just log and continue to next frame
              }
            }
          },
          width: 1280,
          height: 720,
        });
        await camera.start();
        cameraRef.current = camera;
        console.log("MediaPipe camera started, sending frames...");
      }

      setIsLoading(false);
      isInitializingRef.current = false;
      console.log("Initialization complete!");
    } catch (err) {
      console.error("Error:", err);
      setError(`Failed to initialize camera: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsLoading(false);
      isInitializingRef.current = false;

      // Clean up on error to prevent partial initialization
      if (poseRef.current) {
        try {
          poseRef.current.close();
        } catch (e) {
          console.log("Error closing pose on initialization failure");
        }
        poseRef.current = null;
      }
      if (cameraRef.current) {
        try {
          cameraRef.current.stop();
        } catch (e) {
          console.log("Error stopping camera on initialization failure");
        }
        cameraRef.current = null;
      }
    }
  }, [handleResults, onCameraStateChange]);

  // Clean up resources properly when camera stops
  const stopCamera = useCallback(async () => {
    console.log("stopCamera called - beginning cleanup...");

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      // Step 1: Set flags to false to prevent handleResults from processing frames
      isMountedRef.current = false;
      cameraActiveRef.current = false;
      setCameraActive(false);
      if (onCameraStateChange) onCameraStateChange(false);
      console.log("Camera flags set to false");

      // Step 2: Stop MediaPipe camera first (stops sending new frames)
      if (cameraRef.current) {
        try {
          cameraRef.current.stop();
          console.log("MediaPipe camera stopped");
        } catch (err) {
          console.log("Camera already stopped or error stopping:", err);
        }
        cameraRef.current = null;
      }

      // Step 3: Wait briefly for any pending frames to finish processing
      console.log("Waiting for pending frames to complete...");
      await new Promise(resolve => setTimeout(resolve, 100));

      // Step 4: Close pose instance (safe now that no frames are being sent)
      if (poseRef.current) {
        try {
          poseRef.current.close();
          console.log("Pose instance closed successfully");
        } catch (err) {
          console.log("Pose already closed or error closing:", err);
        }
        poseRef.current = null;
      }

      // Step 5: Stop video tracks and clear srcObject
      if (video && video.srcObject) {
        try {
          const tracks = (video.srcObject as MediaStream).getTracks();
          tracks.forEach((track) => {
            track.stop();
            console.log("Video track stopped");
          });
          video.srcObject = null;
          console.log("Video srcObject cleared");
        } catch (err) {
          console.log("Error stopping video tracks:", err);
        }
      }

      // Step 6: Clear canvas
      if (canvas) {
        try {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            console.log("Canvas cleared");
          }
        } catch (err) {
          console.log("Error clearing canvas:", err);
        }
      }

      // Step 7: Reset initialization flag
      isInitializingRef.current = false;
      console.log("stopCamera cleanup complete");
    } catch (err) {
      console.error("Error during stopCamera cleanup:", err);
      // Ensure refs are null even if there's an error
      poseRef.current = null;
      cameraRef.current = null;
      isInitializingRef.current = false;
    }
  }, [onCameraStateChange]);

  // Toggle camera (Turn On Camera / Stop Camera)
  const toggleCamera = () => {
    if (cameraActive) {
      stopCamera();
    } else {
      initializePose();
    }
  };

  // NOTE: Camera should NOT auto-start. User must click "Turn On Camera" button.
  // The isActive prop is used for tracking exercise state, not camera state.
  // Removed auto-start effect to prevent unwanted camera activation.

  // Handle camera commands from parent
  useEffect(() => {
    if (cameraCommand === 'start' && !cameraActive) {
      initializePose();
    } else if (cameraCommand === 'stop' && cameraActive) {
      stopCamera();
    }
  }, [cameraCommand, cameraActive, initializePose, stopCamera]);

  // Cleanup on unmount - ensures camera is stopped when navigating away
  // CRITICAL: Empty dependency array [] ensures cleanup ONLY runs on actual component unmount,
  // not when state changes (like setPose). This prevents the camera from being destroyed
  // immediately after initialization.
  useEffect(() => {
    // Set mounted flag to true when component mounts
    isMountedRef.current = true;

    return () => {
      console.log("Component unmounting - cleaning up camera resources");

      try {
        // Step 1: Set flags to false to prevent handleResults from processing frames
        isMountedRef.current = false;
        cameraActiveRef.current = false;

        // Step 2: Stop MediaPipe camera first (stops sending new frames)
        if (cameraRef.current) {
          try {
            cameraRef.current.stop();
            console.log("Unmount: Stopped MediaPipe camera");
          } catch (err) {
            console.log("Unmount: Camera already stopped or error:", err);
          }
          cameraRef.current = null;
        }

        // Step 3: Small delay to let pending frames finish (synchronous in cleanup)
        // Note: We can't use async/await in cleanup, but the stop() above should prevent new frames

        // Step 4: Close pose instance (safe now that camera is stopped)
        // Access pose from ref to get current value (not closure)
        if (poseRef.current) {
          try {
            poseRef.current.close();
            console.log("Unmount: Closed pose instance");
          } catch (err) {
            console.log("Unmount: Pose already closed or error:", err);
          }
          poseRef.current = null;
        }

        // Step 5: Stop video tracks and clear srcObject
        const video = videoRef.current;
        if (video && video.srcObject) {
          try {
            const tracks = (video.srcObject as MediaStream).getTracks();
            tracks.forEach((track) => {
              track.stop();
              console.log("Unmount: Stopped video track");
            });
            video.srcObject = null;
            console.log("Unmount: Cleared video srcObject");
          } catch (err) {
            console.log("Unmount: Error stopping video tracks:", err);
          }
        }

        // Step 6: Reset initialization flag
        isInitializingRef.current = false;
        console.log("Unmount: Cleanup complete");
      } catch (err) {
        console.error("Unmount: Error during cleanup:", err);
        // Ensure refs are null even if there's an error
        poseRef.current = null;
        cameraRef.current = null;
        isInitializingRef.current = false;
      }
    };
  }, []); // Empty array - cleanup ONLY runs on actual unmount, NOT on state changes

  return (
    <div className={`relative max-w-full ${className}`}>
      {/* Video Container - Removed aspect-video to allow full height */}
      <div className="relative w-full bg-doom-bg rounded-xl overflow-hidden border-2 border-doom-primary/30 max-w-full" style={{ height: '100%' }}>
        {/* Video Element - Changed to object-contain to show full body without cropping */}
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-contain scale-x-[-1]"
          playsInline
          muted
          autoPlay
          style={{ display: cameraActive ? 'block' : 'none' }}
        />

        {/* Canvas for pose overlay - Changed to object-contain to match video */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-contain scale-x-[-1] z-10"
          style={{ display: cameraActive ? 'block' : 'none' }}
        />

        {/* In-canvas metrics HUD */}
        {cameraActive && metricsOverlay && (
          <div className="absolute inset-0 z-[15] pointer-events-none text-doom-text">
            <div className="absolute left-2 top-2 rounded-md bg-black/70 border-2 border-doom-primary/50 px-3 py-2 text-xs sm:text-sm shadow-lg max-w-[140px]">
              <div className="text-doom-primary font-semibold truncate">{metricsOverlay.leftAngleLabel}</div>
              <div className="font-bold">{Math.round(metricsOverlay.leftAngleValue)}°</div>
            </div>

            <div className="absolute right-2 top-2 rounded-md bg-black/70 border-2 border-doom-primary/50 px-3 py-2 text-xs sm:text-sm text-right shadow-lg max-w-[140px]">
              <div className="text-doom-primary font-semibold truncate">{metricsOverlay.rightAngleLabel}</div>
              <div className="font-bold">{Math.round(metricsOverlay.rightAngleValue)}°</div>
            </div>

            {/* Enhanced Form Analysis Panel */}
            <div className="form-analysis-panel">
              {/* Form Score */}
              <div className="metric-card" style={{
                background: `linear-gradient(135deg, ${
                  metricsOverlay.formScore >= 80 ? 'rgba(0, 255, 136, 0.15)' :
                  metricsOverlay.formScore >= 50 ? 'rgba(255, 184, 0, 0.15)' :
                  'rgba(255, 0, 68, 0.15)'
                }, rgba(0, 0, 0, 0.5))`,
                borderColor: metricsOverlay.formScore >= 80 ? '#00ff88' :
                  metricsOverlay.formScore >= 50 ? '#FFB800' : '#FF0044',
                boxShadow: metricsOverlay.formScore >= 80 ? '0 0 15px rgba(0, 255, 136, 0.3)' : 'none'
              }}>
                <div className="metric-header">
                  <Target className="metric-icon" style={{
                    color: metricsOverlay.formScore >= 80 ? '#00ff88' :
                      metricsOverlay.formScore >= 50 ? '#FFB800' : '#FF0044'
                  }} />
                  <div className="metric-info">
                    <div className="metric-label-text">Form</div>
                    <div className="metric-percentage" style={{
                      color: metricsOverlay.formScore >= 80 ? '#00ff88' :
                        metricsOverlay.formScore >= 50 ? '#FFB800' : '#FF0044'
                    }}>
                      {metricsOverlay.formScore}%
                    </div>
                  </div>
                </div>
                <div className="progress-bar-container">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${metricsOverlay.formScore}%`,
                      background: metricsOverlay.formScore >= 80
                        ? 'linear-gradient(90deg, #00ff88, #00d9ff)'
                        : metricsOverlay.formScore >= 50
                        ? 'linear-gradient(90deg, #FFB800, #FFA500)'
                        : 'linear-gradient(90deg, #FF0044, #CC0033)'
                    }}
                  />
                </div>
              </div>

              {/* Posture Score */}
              <div className="metric-card" style={{
                background: `linear-gradient(135deg, ${
                  metricsOverlay.postureScore >= 80 ? 'rgba(0, 255, 136, 0.15)' :
                  metricsOverlay.postureScore >= 50 ? 'rgba(255, 184, 0, 0.15)' :
                  'rgba(255, 0, 68, 0.15)'
                }, rgba(0, 0, 0, 0.5))`,
                borderColor: metricsOverlay.postureScore >= 80 ? '#00ff88' :
                  metricsOverlay.postureScore >= 50 ? '#FFB800' : '#FF0044',
                boxShadow: metricsOverlay.postureScore >= 80 ? '0 0 15px rgba(0, 255, 136, 0.3)' : 'none'
              }}>
                <div className="metric-header">
                  <User className="metric-icon" style={{
                    color: metricsOverlay.postureScore >= 80 ? '#00ff88' :
                      metricsOverlay.postureScore >= 50 ? '#FFB800' : '#FF0044'
                  }} />
                  <div className="metric-info">
                    <div className="metric-label-text">Posture</div>
                    <div className="metric-percentage" style={{
                      color: metricsOverlay.postureScore >= 80 ? '#00ff88' :
                        metricsOverlay.postureScore >= 50 ? '#FFB800' : '#FF0044'
                    }}>
                      {metricsOverlay.postureScore}%
                    </div>
                  </div>
                </div>
                <div className="progress-bar-container">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${metricsOverlay.postureScore}%`,
                      background: metricsOverlay.postureScore >= 80
                        ? 'linear-gradient(90deg, #00ff88, #00d9ff)'
                        : metricsOverlay.postureScore >= 50
                        ? 'linear-gradient(90deg, #FFB800, #FFA500)'
                        : 'linear-gradient(90deg, #FF0044, #CC0033)'
                    }}
                  />
                </div>
              </div>

              {/* Arm Position Score */}
              <div className="metric-card" style={{
                background: `linear-gradient(135deg, ${
                  metricsOverlay.armMetricScore >= 80 ? 'rgba(0, 255, 136, 0.15)' :
                  metricsOverlay.armMetricScore >= 50 ? 'rgba(255, 184, 0, 0.15)' :
                  'rgba(255, 0, 68, 0.15)'
                }, rgba(0, 0, 0, 0.5))`,
                borderColor: metricsOverlay.armMetricScore >= 80 ? '#00ff88' :
                  metricsOverlay.armMetricScore >= 50 ? '#FFB800' : '#FF0044',
                boxShadow: metricsOverlay.armMetricScore >= 80 ? '0 0 15px rgba(0, 255, 136, 0.3)' : 'none'
              }}>
                <div className="metric-header">
                  <Activity className="metric-icon" style={{
                    color: metricsOverlay.armMetricScore >= 80 ? '#00ff88' :
                      metricsOverlay.armMetricScore >= 50 ? '#FFB800' : '#FF0044'
                  }} />
                  <div className="metric-info">
                    <div className="metric-label-text">{metricsOverlay.armMetricLabel}</div>
                    <div className="metric-percentage" style={{
                      color: metricsOverlay.armMetricScore >= 80 ? '#00ff88' :
                        metricsOverlay.armMetricScore >= 50 ? '#FFB800' : '#FF0044'
                    }}>
                      {metricsOverlay.armMetricScore}%
                    </div>
                  </div>
                </div>
                <div className="progress-bar-container">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${metricsOverlay.armMetricScore}%`,
                      background: metricsOverlay.armMetricScore >= 80
                        ? 'linear-gradient(90deg, #00ff88, #00d9ff)'
                        : metricsOverlay.armMetricScore >= 50
                        ? 'linear-gradient(90deg, #FFB800, #FFA500)'
                        : 'linear-gradient(90deg, #FF0044, #CC0033)'
                    }}
                  />
                </div>
              </div>

              {/* Phase Indicator */}
              <div className="metric-card phase-card" style={{
                background: 'linear-gradient(135deg, rgba(0, 217, 255, 0.15), rgba(0, 0, 0, 0.5))',
                borderColor: '#00d9ff',
                animation: 'pulse 2s ease-in-out infinite'
              }}>
                <div className="metric-header">
                  {metricsOverlay.phaseLabel.toLowerCase().includes('up') ? (
                    <ArrowUp className="metric-icon" style={{ color: '#00d9ff' }} />
                  ) : (
                    <ArrowDown className="metric-icon" style={{ color: '#00d9ff' }} />
                  )}
                  <div className="metric-info">
                    <div className="metric-label-text">Phase</div>
                    <div className="metric-phase-value" style={{ color: '#00d9ff' }}>
                      {metricsOverlay.phaseLabel}
                    </div>
                  </div>
                </div>
              </div>

              {/* Reps Counter - Moved from bottom center to right panel */}
              <div className="metric-card" style={{
                background: 'linear-gradient(135deg, rgba(0, 255, 136, 0.2), rgba(0, 0, 0, 0.6))',
                borderColor: '#00ff88',
                padding: '1rem'
              }}>
                <div className="text-doom-primary font-semibold text-sm mb-1">Reps Completed</div>
                <div className="font-black text-4xl text-doom-primary text-center">{metricsOverlay.reps}</div>
              </div>
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-doom-bg/80 z-20">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-doom-primary animate-spin mx-auto mb-4" />
              <p className="text-doom-text">Initializing camera...</p>
            </div>
          </div>
        )}

        {/* Error Overlay */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-doom-bg/80 z-20">
            <div className="text-center p-6 max-w-md">
              <CameraOff className="w-12 h-12 text-doom-secondary mx-auto mb-4" />
              <p className="text-doom-text mb-4">{error}</p>
              <button
                onClick={initializePose}
                className="px-6 py-2 bg-doom-primary text-doom-bg rounded-lg hover:scale-105 transition-transform"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Camera Inactive Overlay */}
        {!cameraActive && !isLoading && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-doom-bg/80 z-20">
            <div className="text-center">
              <Camera className="w-16 h-16 text-doom-primary mx-auto mb-4" />
              <p className="text-doom-text mb-4">Camera is off</p>
              <button
                onClick={toggleCamera}
                className="px-6 py-2 bg-doom-primary text-doom-bg rounded-lg hover:scale-105 transition-transform font-semibold"
              >
                Turn On Camera
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
