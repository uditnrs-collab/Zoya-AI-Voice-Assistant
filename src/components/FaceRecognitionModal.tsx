import React, { useState, useEffect, useRef } from "react";
import {
  enrollOwnerFace,
  verifyOwnerFace,
  isFaceEnrolled,
  getEnrolledFaceProfile,
  deleteOwnerFaceProfile,
  extractFacialFeatureVector,
  isOwnerRecognized,
  FaceProfile,
} from "../services/faceRecognitionService";

interface FaceRecognitionModalProps {
  isOpen: boolean;
  initialMode?: "enroll" | "verify" | "manage";
  onClose: () => void;
  onVerificationComplete?: (isMatch: boolean, message: string) => void;
  showToast?: (toast: { type: "action"; title: string }) => void;
}

const ENROLL_STEPS = [
  { title: "Look Straight", subtitle: "Align your face in the center ring", icon: "👤" },
  { title: "Turn Slightly Left", subtitle: "Turn your head gently to the left", icon: "👈" },
  { title: "Turn Slightly Right", subtitle: "Turn your head gently to the right", icon: "👉" },
  { title: "Natural Expression", subtitle: "Smile naturally into the camera", icon: "😊" },
];

export default function FaceRecognitionModal({
  isOpen,
  initialMode = "verify",
  onClose,
  onVerificationComplete,
  showToast,
}: FaceRecognitionModalProps) {
  const [mode, setMode] = useState<"enroll" | "verify" | "manage">(initialMode);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [autoScanEnabled, setAutoScanEnabled] = useState(true);

  // Enrollment State
  const [currentStep, setCurrentStep] = useState(0);
  const [capturedVectors, setCapturedVectors] = useState<number[][]>([]);
  const [enrollProgress, setEnrollProgress] = useState<string>("");
  const [enrollSuccess, setEnrollSuccess] = useState(false);

  // Verification State
  const [verifyResult, setVerifyResult] = useState<{
    isMatch: boolean;
    confidence: number;
    message: string;
  } | null>(null);

  const [profile, setProfile] = useState<FaceProfile | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const isScanningRef = useRef(false);
  const verifyResultRef = useRef(verifyResult);
  verifyResultRef.current = verifyResult;

  useEffect(() => {
    if (isOpen) {
      setProfile(getEnrolledFaceProfile());
      setMode(initialMode);
      setCameraError(null);
      setVerifyResult(null);
      setEnrollSuccess(false);
      setCurrentStep(0);
      setCapturedVectors([]);
      if (initialMode === "enroll" || initialMode === "verify") {
        startCamera();
      }
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, initialMode]);

  // Automatic scanning effect for verification mode
  useEffect(() => {
    let initialTimeout: NodeJS.Timeout | null = null;
    let autoScanInterval: NodeJS.Timeout | null = null;

    if (
      isOpen &&
      mode === "verify" &&
      stream &&
      autoScanEnabled &&
      !verifyResult?.isMatch
    ) {
      // 1. Initial trigger after 700ms camera warmup
      initialTimeout = setTimeout(() => {
        triggerAutoVerify();
      }, 700);

      // 2. Periodic scan every 1.8s until match is found
      autoScanInterval = setInterval(() => {
        if (!isScanningRef.current && !verifyResultRef.current?.isMatch) {
          triggerAutoVerify();
        }
      }, 1800);
    }

    return () => {
      if (initialTimeout) clearTimeout(initialTimeout);
      if (autoScanInterval) clearInterval(autoScanInterval);
    };
  }, [isOpen, mode, stream, autoScanEnabled, verifyResult?.isMatch]);

  // Safe video stream attachment effect
  useEffect(() => {
    const video = videoRef.current;
    if (video && stream && (mode === "enroll" || mode === "verify")) {
      video.srcObject = stream;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          // Gracefully swallow play promise cancellation/interruption on unmount or tab switch
          if (err.name !== "AbortError" && !err.message?.includes("interrupted")) {
            console.warn("Video play error:", err);
          }
        });
      }
    }
  }, [stream, mode]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
          audio: false,
        });
        setStream(mediaStream);
      } else {
        setCameraError("Camera API is not supported on this device/browser.");
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      setCameraError("Camera permission denied or camera device is unavailable.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      } catch (e) {
        // Ignore video pause errors
      }
    }
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const handleModeChange = (newMode: "enroll" | "verify" | "manage") => {
    setMode(newMode);
    setVerifyResult(null);
    setEnrollSuccess(false);
    setCurrentStep(0);
    setCapturedVectors([]);
    if (newMode === "enroll" || newMode === "verify") {
      startCamera();
    } else {
      stopCamera();
    }
  };

  // Internal function for automated verification execution
  const triggerAutoVerify = () => {
    if (!videoRef.current || isScanningRef.current) return;
    const enrolled = getEnrolledFaceProfile();
    if (!enrolled) return; // Not enrolled yet

    isScanningRef.current = true;
    setIsScanning(true);

    setTimeout(() => {
      if (!videoRef.current) {
        isScanningRef.current = false;
        setIsScanning(false);
        return;
      }

      const result = verifyOwnerFace(videoRef.current);
      isScanningRef.current = false;
      setIsScanning(false);
      setVerifyResult(result);

      if (result.isMatch) {
        if (showToast) {
          showToast({
            type: "action",
            title: "FACE VERIFIED: BOSS UDIT",
          });
        }
        if (onVerificationComplete) {
          onVerificationComplete(true, result.message);
        }
      }
    }, 500);
  };

  // Manual trigger for Verification
  const executeVerification = () => {
    if (!videoRef.current || isScanningRef.current) return;
    isScanningRef.current = true;
    setIsScanning(true);

    setTimeout(() => {
      if (!videoRef.current) {
        isScanningRef.current = false;
        setIsScanning(false);
        return;
      }

      const result = verifyOwnerFace(videoRef.current);
      isScanningRef.current = false;
      setIsScanning(false);
      setVerifyResult(result);

      if (showToast) {
        showToast({
          type: "action",
          title: result.isMatch ? "FACE VERIFIED: BOSS UDIT" : "UNRECOGNIZED FACE",
        });
      }

      if (onVerificationComplete) {
        onVerificationComplete(result.isMatch, result.message);
      }
    }, 500);
  };

  // Capture single sample step for Enrollment
  const captureEnrollSample = () => {
    if (!videoRef.current || isScanningRef.current) return;
    isScanningRef.current = true;
    setIsScanning(true);
    setEnrollProgress("Analyzing facial features...");

    setTimeout(() => {
      if (!videoRef.current) {
        isScanningRef.current = false;
        setIsScanning(false);
        return;
      }

      const vector = extractFacialFeatureVector(videoRef.current);
      if (!vector) {
        setEnrollProgress("No clear face detected! Position your face in center ring.");
        isScanningRef.current = false;
        setIsScanning(false);
        return;
      }

      const updated = [...capturedVectors, vector];
      setCapturedVectors(updated);
      isScanningRef.current = false;

      if (currentStep < ENROLL_STEPS.length - 1) {
        setCurrentStep((prev) => prev + 1);
        setEnrollProgress(`Sample ${currentStep + 1} captured! Proceed to next angle.`);
        setIsScanning(false);
      } else {
        // All 4 samples captured! Finish Enrollment
        setEnrollProgress("Finalizing secure face profile for Udit...");
        const savedProfile = enrollOwnerFace(updated);
        setIsScanning(false);
        if (savedProfile) {
          setEnrollSuccess(true);
          setProfile(savedProfile);
          if (showToast) {
            showToast({ type: "action", title: "OWNER FACE ENROLLED: UDIT" });
          }
          if (onVerificationComplete) {
            onVerificationComplete(true, "Welcome back, boss Udit.");
          }
        } else {
          setEnrollProgress("Failed to save face profile. Please try again.");
        }
      }
    }, 500);
  };

  const handleDeleteProfile = () => {
    if (window.confirm("Are you sure you want to delete the enrolled face profile for Udit?")) {
      deleteOwnerFaceProfile();
      setProfile(null);
      setMode("enroll");
      startCamera();
      if (showToast) {
        showToast({ type: "action", title: "ENROLLED FACE PROFILE DELETED" });
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
    >
      <div className="relative w-full max-w-lg bg-[#080C14] border border-[#00E5FF]/40 rounded-2xl shadow-[0_0_40px_rgba(0,229,255,0.25)] text-white overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#00E5FF]/20 bg-black/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#00E5FF]/10 border border-[#00E5FF]/50 flex items-center justify-center text-[#00E5FF]">
              👁️
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-widest text-[#00E5FF] uppercase font-mono">
                ZOYA Face Security
              </h2>
              <p className="text-[11px] text-gray-400">On-Device Owner Face Verification (Udit)</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex border-b border-gray-800 bg-black/20">
          <button
            onClick={() => handleModeChange("verify")}
            className={`flex-1 py-2.5 text-xs font-mono font-bold uppercase transition-all border-b-2 cursor-pointer ${
              mode === "verify"
                ? "border-[#00E5FF] text-[#00E5FF] bg-[#00E5FF]/10"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            Verify Face
          </button>
          <button
            onClick={() => handleModeChange("enroll")}
            className={`flex-1 py-2.5 text-xs font-mono font-bold uppercase transition-all border-b-2 cursor-pointer ${
              mode === "enroll"
                ? "border-[#00E5FF] text-[#00E5FF] bg-[#00E5FF]/10"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            Enroll Owner
          </button>
          <button
            onClick={() => handleModeChange("manage")}
            className={`flex-1 py-2.5 text-xs font-mono font-bold uppercase transition-all border-b-2 cursor-pointer ${
              mode === "manage"
                ? "border-[#00E5FF] text-[#00E5FF] bg-[#00E5FF]/10"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            Status
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex flex-col items-center gap-4 min-h-[340px] justify-center">
          {/* CAMERA VIEW (For Enroll or Verify) */}
          {(mode === "enroll" || mode === "verify") && (
            <div className="w-full flex flex-col items-center">
              {cameraError ? (
                <div className="p-6 text-center rounded-xl bg-red-950/30 border border-red-500/40 text-red-200 text-xs my-4">
                  <p className="font-bold mb-1">Camera Error</p>
                  <p>{cameraError}</p>
                  <button
                    onClick={startCamera}
                    className="mt-3 px-4 py-1.5 rounded-lg bg-red-800/50 hover:bg-red-800 text-white font-mono text-xs transition-all cursor-pointer"
                  >
                    Retry Camera
                  </button>
                </div>
              ) : (
                <div className="relative w-full max-w-[320px] aspect-[4/3] bg-black rounded-xl overflow-hidden border border-[#00E5FF]/50 shadow-[0_0_20px_rgba(0,229,255,0.2)]">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover transform -scale-x-100"
                  />

                  {/* Laser Scan Line effect when scanning */}
                  {isScanning && (
                    <div className="absolute inset-x-0 h-1 bg-[#00E5FF] shadow-[0_0_15px_#00E5FF] animate-pulse top-1/2 -translate-y-1/2 pointer-events-none" />
                  )}

                  {/* Futuristic HUD Reticle */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div
                      className={`w-40 h-40 rounded-full border-2 border-dashed transition-all duration-300 ${
                        isScanning
                          ? "border-cyan-400 animate-spin"
                          : verifyResult?.isMatch
                          ? "border-green-400 shadow-[0_0_25px_rgba(74,222,128,0.7)]"
                          : "border-[#00E5FF]/70 shadow-[0_0_20px_rgba(0,229,255,0.5)]"
                      }`}
                    />
                    <div className="absolute w-48 h-48 border border-[#00E5FF]/20 rounded-xl" />
                    {/* Target Crosshairs */}
                    <div className="absolute w-4 h-[2px] bg-[#00E5FF] top-1/2 left-4 -translate-y-1/2" />
                    <div className="absolute w-4 h-[2px] bg-[#00E5FF] top-1/2 right-4 -translate-y-1/2" />
                    <div className="absolute h-4 w-[2px] bg-[#00E5FF] left-1/2 top-4 -translate-x-1/2" />
                    <div className="absolute h-4 w-[2px] bg-[#00E5FF] left-1/2 bottom-4 -translate-x-1/2" />
                  </div>

                  {/* Camera & Auto-Scan Indicator */}
                  <div className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full bg-black/80 border border-cyan-500/50 text-[10px] font-mono text-cyan-300 flex items-center gap-1.5 shadow-md">
                    <span className="w-2 h-2 rounded-full bg-[#00E5FF] animate-ping" />
                    {mode === "verify" && autoScanEnabled && !verifyResult?.isMatch
                      ? "ZOYA AUTO-SCANNING..."
                      : "CAMERA LIVE"}
                  </div>
                </div>
              )}

              {/* ENROLLMENT STEPS & ACTION */}
              {mode === "enroll" && (
                <div className="w-full mt-4 flex flex-col items-center">
                  {!enrollSuccess ? (
                    <>
                      <div className="w-full bg-gray-900/80 rounded-xl p-3 border border-gray-800 text-center mb-3">
                        <div className="text-xl mb-1">{ENROLL_STEPS[currentStep].icon}</div>
                        <h3 className="text-xs font-bold text-[#00E5FF] uppercase font-mono">
                          Step {currentStep + 1} of 4: {ENROLL_STEPS[currentStep].title}
                        </h3>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {ENROLL_STEPS[currentStep].subtitle}
                        </p>
                      </div>

                      {enrollProgress && (
                        <p className="text-[11px] font-mono text-cyan-300 mb-2 animate-pulse">
                          {enrollProgress}
                        </p>
                      )}

                      <button
                        onClick={captureEnrollSample}
                        disabled={isScanning || !stream}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#00E5FF] to-cyan-600 text-black font-mono font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-all shadow-[0_0_20px_rgba(0,229,255,0.4)] disabled:opacity-50 cursor-pointer"
                      >
                        {isScanning ? "Processing Sample..." : `Capture Sample (${currentStep + 1}/4)`}
                      </button>
                    </>
                  ) : (
                    <div className="p-4 text-center rounded-xl bg-cyan-950/40 border border-[#00E5FF]/60 w-full animate-scale-up">
                      <div className="text-3xl mb-1">🎉</div>
                      <h3 className="text-sm font-bold text-[#00E5FF] uppercase font-mono">
                        Enrollment Complete!
                      </h3>
                      <p className="text-xs text-gray-300 mt-1">
                        Encrypted face profile for <span className="text-[#00E5FF] font-bold">Boss Udit</span> stored locally on device.
                      </p>
                      <button
                        onClick={() => handleModeChange("verify")}
                        className="mt-3 px-5 py-2 rounded-lg bg-[#00E5FF] text-black font-mono font-bold text-xs uppercase cursor-pointer"
                      >
                        Verify Face Now
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* VERIFICATION ACTION & FEEDBACK */}
              {mode === "verify" && (
                <div className="w-full mt-3 flex flex-col items-center">
                  {!profile ? (
                    <div className="p-3 mb-2 rounded-lg bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs text-center w-full">
                      ⚠️ Owner face profile not enrolled yet. Click &apos;Enroll Owner&apos; tab to set up face security for Boss Udit.
                    </div>
                  ) : (
                    <div className="w-full mb-2 flex items-center justify-between px-2">
                      <span className="text-[11px] font-mono text-gray-400">
                        Auto-Scan: <span className="text-cyan-400 font-bold">ENABLED</span>
                      </span>
                      <button
                        onClick={() => setAutoScanEnabled(!autoScanEnabled)}
                        className="text-[10px] font-mono text-[#00E5FF] underline hover:text-white cursor-pointer"
                      >
                        {autoScanEnabled ? "Pause Auto-Scan" : "Enable Auto-Scan"}
                      </button>
                    </div>
                  )}

                  {verifyResult && (
                    <div
                      className={`p-3.5 mb-3 rounded-xl border text-center w-full transition-all ${
                        verifyResult.isMatch
                          ? "bg-cyan-950/60 border-[#00E5FF] text-cyan-200 shadow-[0_0_25px_rgba(0,229,255,0.4)]"
                          : "bg-red-950/50 border-red-500 text-red-200"
                      }`}
                    >
                      <div className="text-base font-bold font-mono flex items-center justify-center gap-2">
                        {verifyResult.isMatch ? "✅ MATCH VERIFIED" : "❌ UNRECOGNIZED"}
                      </div>
                      <p className="text-xs mt-1 font-mono">{verifyResult.message}</p>
                      {verifyResult.isMatch && (
                        <p className="text-[11px] text-cyan-400 mt-1 font-mono font-bold">
                          Match Confidence: {verifyResult.confidence}%
                        </p>
                      )}
                    </div>
                  )}

                  <button
                    onClick={executeVerification}
                    disabled={isScanning || !stream || !profile}
                    className="w-full py-2.5 rounded-xl bg-[#00E5FF] text-black font-mono font-bold text-xs uppercase tracking-wider hover:bg-cyan-300 transition-all shadow-[0_0_20px_rgba(0,229,255,0.4)] disabled:opacity-50 cursor-pointer"
                  >
                    {isScanning
                      ? "Scanning Face Frame..."
                      : verifyResult?.isMatch
                      ? "Re-Verify Owner Face"
                      : "Force Manual Rescan"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STATUS & PROFILE MANAGEMENT */}
          {mode === "manage" && (
            <div className="w-full flex flex-col items-center gap-3 py-2">
              <div className="w-full bg-gray-900/80 rounded-xl p-4 border border-gray-800 text-left">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-mono font-bold text-[#00E5FF] uppercase">
                    Owner Profile Status
                  </h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                      profile ? "bg-green-950 text-green-400 border border-green-500" : "bg-gray-800 text-gray-400"
                    }`}
                  >
                    {profile ? "ENROLLED" : "NOT ENROLLED"}
                  </span>
                </div>

                {profile ? (
                  <div className="space-y-1.5 text-xs text-gray-300 font-mono">
                    <p>
                      <span className="text-gray-500">Owner Name:</span>{" "}
                      <span className="text-[#00E5FF] font-bold">{profile.ownerName}</span>
                    </p>
                    <p>
                      <span className="text-gray-500">Enrolled On:</span>{" "}
                      {new Date(profile.enrolledAt).toLocaleString()}
                    </p>
                    <p>
                      <span className="text-gray-500">Multi-Angle Samples:</span> {profile.sampleCount}
                    </p>
                    <p>
                      <span className="text-gray-500">Session Verified:</span>{" "}
                      <span className={isOwnerRecognized() ? "text-green-400 font-bold" : "text-gray-400"}>
                        {isOwnerRecognized() ? "Yes (Welcome back, boss Udit)" : "No"}
                      </span>
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 font-mono">
                    No face profile stored on this device. Click &apos;Enroll Owner&apos; to create one.
                  </p>
                )}
              </div>

              {/* Security Privacy Notice */}
              <div className="w-full bg-cyan-950/20 border border-[#00E5FF]/30 rounded-xl p-3 text-[11px] text-gray-300">
                <p className="font-bold text-[#00E5FF] font-mono mb-1">🔒 Local Privacy & Security Assurance</p>
                <p>
                  Facial features are converted locally to a 128-dimensional encrypted numerical vector. No raw photos or camera feeds leave your device or get sent to external servers.
                </p>
              </div>

              {profile && (
                <button
                  onClick={handleDeleteProfile}
                  className="w-full py-2 rounded-xl bg-red-950/80 border border-red-600/60 text-red-300 font-mono font-bold text-xs uppercase hover:bg-red-900 transition-all cursor-pointer mt-2"
                >
                  Delete Enrolled Face Profile
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
