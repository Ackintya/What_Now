import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CameraOff, ChevronDown } from "lucide-react";
import type { AnalysisPayload } from "./types";

interface AnalysisSectionProps {
  skinResult: AnalysisPayload | null;
  hairResult: AnalysisPayload | null;
  analyzingTarget: "skin" | "hair" | null;
  onAnalyze: (target: "skin" | "hair", file: File) => Promise<void>;
  defaultOpen?: boolean;
}

interface AnalysisTargetCardProps {
  title: string;
  target: "skin" | "hair";
  result: AnalysisPayload | null;
  analyzingTarget: "skin" | "hair" | null;
  onAnalyze: (target: "skin" | "hair", file: File) => Promise<void>;
}

function ResultCard({ title, result }: { title: string; result: AnalysisPayload }) {
  return (
    <div className="rounded-lg border border-doom-primary/20 bg-doom-bg/40 p-4 space-y-2">
      <h4 className="text-doom-text font-semibold">{title}</h4>
      {typeof result.dryness_score === "number" && <p className="text-sm">Dryness score: {result.dryness_score}</p>}
      {typeof result.oiliness_score === "number" && <p className="text-sm">Oiliness score: {result.oiliness_score}</p>}
      {typeof result.acne_like_appearance_score === "number" && (
        <p className="text-sm">Acne-like appearance score: {result.acne_like_appearance_score}</p>
      )}
      {typeof result.dark_circles_score === "number" && <p className="text-sm">Dark circles score: {result.dark_circles_score}</p>}
      {typeof result.scalp_dryness_score === "number" && <p className="text-sm">Scalp dryness score: {result.scalp_dryness_score}</p>}
      {typeof result.dandruff_like_flaking_score === "number" && (
        <p className="text-sm">Dandruff-like flaking score: {result.dandruff_like_flaking_score}</p>
      )}
      {typeof result.thinning_appearance_score === "number" && (
        <p className="text-sm">Thinning appearance score: {result.thinning_appearance_score}</p>
      )}
      <p className="text-sm text-doom-muted">{result.brief_observation}</p>
      <p className="text-xs text-doom-accent">Confidence: {result.confidence}</p>
      <p className="text-xs text-doom-muted">{result.grounding_line}</p>
    </div>
  );
}

function AnalysisTargetCard({ title, target, result, analyzingTarget, onAnalyze }: AnalysisTargetCardProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [webcamActive, setWebcamActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopWebcam = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setWebcamActive(false);
  }, []);

  useEffect(() => {
    return () => {
      stopWebcam();
    };
  }, [stopWebcam]);

  useEffect(() => {
    if (!webcamActive || !streamRef.current || !videoRef.current) {
      return;
    }

    const videoElement = videoRef.current;
    videoElement.srcObject = streamRef.current;

    const playVideo = async () => {
      try {
        await videoElement.play();
      } catch (error) {
        console.error(error);
        setCameraError("Camera stream started but preview failed to render.");
      }
    };

    void playVideo();

    return () => {
      if (videoElement.srcObject) {
        videoElement.srcObject = null;
      }
    };
  }, [webcamActive]);

  const startWebcam = useCallback(async () => {
    setCameraError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Webcam is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: target === "skin" ? "user" : { ideal: "environment" },
        },
        audio: false,
      });

      streamRef.current = stream;
      setWebcamActive(true);
    } catch (error) {
      console.error(error);
      setCameraError("Could not access webcam/camera. Check camera permissions and retry.");
      stopWebcam();
    }
  }, [stopWebcam, target]);

  const analyzeSelectedFile = async () => {
    if (!selectedFile) {
      return;
    }

    await onAnalyze(target, selectedFile);
  };

  const handlePhoneCapture: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    const file = event.target.files?.[0] || null;
    if (!file) {
      return;
    }

    await onAnalyze(target, file);
    event.target.value = "";
  };

  const captureFromWebcam = async () => {
    if (!videoRef.current) {
      return;
    }

    const video = videoRef.current;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      setCameraError("Failed to capture image frame.");
      return;
    }

    context.drawImage(video, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((captured) => resolve(captured), "image/jpeg", 0.92);
    });

    if (!blob) {
      setCameraError("Failed to capture image frame.");
      return;
    }

    const file = new File([blob], `${target}-webcam-${Date.now()}.jpg`, {
      type: "image/jpeg",
    });

    await onAnalyze(target, file);
  };

  return (
    <div className="rounded-lg border border-doom-primary/20 bg-doom-bg/40 p-4 space-y-3">
      <p className="font-semibold">{title}</p>

      <div className="space-y-2">
        <label className="text-xs text-doom-muted">Upload image</label>
        <input
          className="input-field"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
        />
        <button
          className="btn-primary w-full"
          type="button"
          disabled={!selectedFile || analyzingTarget !== null}
          onClick={analyzeSelectedFile}
        >
          {analyzingTarget === target ? "Analyzing..." : "Analyze uploaded image"}
        </button>
      </div>

      <div className="space-y-2">
        <label className="text-xs text-doom-muted">Phone camera capture (mobile browsers)</label>
        <input
          className="input-field"
          type="file"
          accept="image/*"
          capture={target === "skin" ? "user" : "environment"}
          onChange={handlePhoneCapture}
        />
      </div>

      <div className="space-y-2">
        <div className="flex gap-2">
          {webcamActive ? (
            <button type="button" className="btn-secondary" onClick={stopWebcam}>
              <CameraOff className="w-4 h-4 mr-2" />
              Stop webcam
            </button>
          ) : (
            <button type="button" className="btn-secondary" onClick={startWebcam}>
              <Camera className="w-4 h-4 mr-2" />
              Start webcam
            </button>
          )}

          {webcamActive ? (
            <button
              type="button"
              className="btn-primary"
              disabled={analyzingTarget !== null}
              onClick={captureFromWebcam}
            >
              {analyzingTarget === target ? "Analyzing..." : "Capture + analyze"}
            </button>
          ) : null}
        </div>

        {webcamActive ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-56 object-cover rounded-lg border border-doom-primary/20 bg-black/40"
          />
        ) : null}

        {cameraError ? <p className="text-xs text-red-300">{cameraError}</p> : null}
      </div>

      {result ? <ResultCard title={`${title} result`} result={result} /> : null}
    </div>
  );
}

export function AnalysisSection({
  skinResult,
  hairResult,
  analyzingTarget,
  onAnalyze,
  defaultOpen = false,
}: AnalysisSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section id="analysis" className="module-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="module-title">Analysis</h3>
          <p className="module-subtitle">
            Upload, phone-capture, or webcam-capture face/scalp images for broad visible-pattern estimation.
          </p>
        </div>

        <button type="button" className="btn-secondary" onClick={() => setIsOpen((prev) => !prev)}>
          <span>{isOpen ? "Hide" : "Open"}</span>
          <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
      </div>

      {!isOpen ? null : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
          <AnalysisTargetCard
            title="Analyze skin"
            target="skin"
            result={skinResult}
            analyzingTarget={analyzingTarget}
            onAnalyze={onAnalyze}
          />

          <AnalysisTargetCard
            title="Analyze hair/scalp"
            target="hair"
            result={hairResult}
            analyzingTarget={analyzingTarget}
            onAnalyze={onAnalyze}
          />
        </div>
      )}
    </section>
  );
}
