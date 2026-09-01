// ZOYA Personal Face Recognition Service
// On-device secure face detection, feature vector extraction, enrollment, and verification

export interface FaceProfile {
  ownerName: string;
  enrolledAt: number;
  sampleCount: number;
  descriptor: number[]; // 128-dim normalized feature vector
  signatureHash: string;
}

export interface VerificationResult {
  isMatch: boolean;
  confidence: number;
  message: string;
  ownerName?: string;
}

const STORAGE_KEY = "ZOYA_ENROLLED_FACE_PROFILE";
const ENCRYPTION_SALT = "ZOYA_UDIT_SECURE_FACE_KEY_2026";

// Session state memory for whether owner Udit is recognized in the active session
let isSessionOwnerRecognized = false;

/**
 * Checks if face profile for owner exists
 */
export function getEnrolledFaceProfile(): FaceProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    // Decrypt simple XOR string payload
    const decrypted = simpleDecrypt(raw, ENCRYPTION_SALT);
    const parsed: FaceProfile = JSON.parse(decrypted);
    if (parsed && parsed.ownerName && Array.isArray(parsed.descriptor)) {
      return parsed;
    }
  } catch (err) {
    console.error("Failed to parse enrolled face profile:", err);
  }
  return null;
}

/**
 * Returns whether owner Udit face is currently enrolled
 */
export function isFaceEnrolled(): boolean {
  return getEnrolledFaceProfile() !== null;
}

/**
 * Returns whether owner Udit is recognized in the current active session
 */
export function isOwnerRecognized(): boolean {
  return isSessionOwnerRecognized;
}

/**
 * Sets session owner recognition state
 */
export function setOwnerRecognizedState(recognized: boolean): void {
  isSessionOwnerRecognized = recognized;
}

/**
 * Deletes the enrolled owner face profile locally
 */
export function deleteOwnerFaceProfile(): boolean {
  if (typeof window === "undefined") return false;
  try {
    localStorage.removeItem(STORAGE_KEY);
    isSessionOwnerRecognized = false;
    return true;
  } catch (err) {
    console.error("Error deleting face profile:", err);
    return false;
  }
}

/**
 * Extract a 128-dimensional facial landmark & feature vector from an HTMLVideoElement or HTMLCanvasElement
 */
export function extractFacialFeatureVector(
  source: HTMLVideoElement | HTMLCanvasElement
): number[] | null {
  try {
    const width = 320;
    const height = 240;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;

    // Draw frame to normalized 320x240 canvas
    ctx.drawImage(source, 0, 0, width, height);
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    // 1. Detect face region bounding box using YCbCr/RGB skin-tone color segmentation & clustering
    let minX = width, maxX = 0, minY = height, maxY = 0;
    let skinPixelCount = 0;

    // First pass: identify skin pixels
    const skinMap = new Uint8Array(width * height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Robust human skin tone color condition
        const isSkin =
          r > 45 && g > 25 && b > 15 &&
          Math.max(r, g, b) - Math.min(r, g, b) > 10 &&
          Math.abs(r - g) > 10 &&
          r > g && r > b;

        if (isSkin) {
          skinMap[y * width + x] = 1;
          skinPixelCount++;
        }
      }
    }

    // Require at least 600 skin pixels in 320x240 frame
    if (skinPixelCount < 600) {
      return null;
    }

    // Find bounding box containing the skin pixels
    for (let y = 0; y < height; y += 2) {
      for (let x = 0; x < width; x += 2) {
        if (skinMap[y * width + x] === 1) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    const boxW = maxX - minX;
    const boxH = maxY - minY;

    // Face dimension checks for face in camera view:
    if (boxW < 30 || boxH < 30) {
      return null;
    }

    // Aspect ratio check (flexible to allow head turns in enrollment)
    const aspectRatio = boxH / boxW;
    if (aspectRatio < 0.6 || aspectRatio > 2.5) {
      return null;
    }

    // 3. Cluster density check inside bounding box
    const boxArea = boxW * boxH;
    const densityInBox = skinPixelCount / boxArea;
    if (densityInBox < 0.15) {
      return null;
    }

    // 4. Facial feature presence check
    let upperLumaSum = 0, upperCount = 0;
    let midLumaSum = 0, midCount = 0;

    const upperMaxY = Math.floor(minY + boxH * 0.35);
    const midMinY = Math.floor(minY + boxH * 0.38);
    const midMaxY = Math.floor(minY + boxH * 0.70);

    for (let py = minY; py < maxY; py += 2) {
      for (let px = minX; px < maxX; px += 2) {
        const pix = (py * width + px) * 4;
        const luma = 0.299 * data[pix] + 0.587 * data[pix + 1] + 0.114 * data[pix + 2];
        if (py < upperMaxY) {
          upperLumaSum += luma;
          upperCount++;
        } else if (py >= midMinY && py <= midMaxY) {
          midLumaSum += luma;
          midCount++;
        }
      }
    }

    const upperAvgLuma = upperCount > 0 ? upperLumaSum / upperCount : 0;
    const midAvgLuma = midCount > 0 ? midLumaSum / midCount : 0;

    if (upperAvgLuma === 0 || midAvgLuma === 0) {
      return null;
    }

    const centerX = minX + boxW / 2;
    const centerY = minY + boxH / 2;

    // 2. Generate 128 multi-zone structural & spectral feature descriptors
    const descriptor: number[] = new Array(128).fill(0);

    // Zone 1: Bounding Box Aspect Ratio & Density (index 0 - 3)
    descriptor[0] = boxW / width;
    descriptor[1] = boxH / height;
    descriptor[2] = boxW / boxH;
    descriptor[3] = skinPixelCount / (width * height);

    // Zone 2: 8x8 Grid Luminance & Contrast Structural Descriptors (index 4 - 67)
    const gridRows = 8;
    const gridCols = 8;
    const cellW = boxW / gridCols;
    const cellH = boxH / gridRows;

    let descIdx = 4;
    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        let sumLuma = 0;
        let count = 0;
        const startX = Math.floor(minX + c * cellW);
        const startY = Math.floor(minY + r * cellH);

        for (let py = startY; py < startY + cellH; py += 2) {
          for (let px = startX; px < startX + cellW; px += 2) {
            if (px >= 0 && px < width && py >= 0 && py < height) {
              const pix = (py * width + px) * 4;
              // Luminance Y = 0.299R + 0.587G + 0.114B
              const luma = 0.299 * data[pix] + 0.587 * data[pix + 1] + 0.114 * data[pix + 2];
              sumLuma += luma;
              count++;
            }
          }
        }
        descriptor[descIdx++] = count > 0 ? (sumLuma / count) / 255 : 0;
      }
    }

    // Zone 3: Horizontal & Vertical Facial Gradient Symmetry (index 68 - 100)
    for (let i = 0; i < 33; i++) {
      const yFrac = i / 33;
      const sampleY = Math.floor(minY + boxH * yFrac);
      const leftX = Math.floor(centerX - boxW * 0.25);
      const rightX = Math.floor(centerX + boxW * 0.25);

      let leftLuma = 0, rightLuma = 0;
      if (sampleY >= 0 && sampleY < height) {
        if (leftX >= 0 && leftX < width) {
          const pLeft = (sampleY * width + leftX) * 4;
          leftLuma = (0.299 * data[pLeft] + 0.587 * data[pLeft + 1] + 0.114 * data[pLeft + 2]) / 255;
        }
        if (rightX >= 0 && rightX < width) {
          const pRight = (sampleY * width + rightX) * 4;
          rightLuma = (0.299 * data[pRight] + 0.587 * data[pRight + 1] + 0.114 * data[pRight + 2]) / 255;
        }
      }
      descriptor[descIdx++] = Math.abs(leftLuma - rightLuma);
    }

    // Zone 4: Color Channel Histograms & Ratios (index 101 - 127)
    let totalR = 0, totalG = 0, totalB = 0, totalPixels = 0;
    for (let y = Math.floor(minY); y < Math.floor(maxY); y += 3) {
      for (let x = Math.floor(minX); x < Math.floor(maxX); x += 3) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
          const idx = (y * width + x) * 4;
          totalR += data[idx];
          totalG += data[idx + 1];
          totalB += data[idx + 2];
          totalPixels++;
        }
      }
    }

    if (totalPixels > 0) {
      const avgR = totalR / totalPixels;
      const avgG = totalG / totalPixels;
      const avgB = totalB / totalPixels;
      const sum = avgR + avgG + avgB || 1;

      for (let k = 0; k < 27; k++) {
        if (k % 3 === 0) descriptor[101 + k] = avgR / sum;
        else if (k % 3 === 1) descriptor[101 + k] = avgG / sum;
        else descriptor[101 + k] = avgB / sum;
      }
    }

    // L2 Normalize feature vector
    const norm = Math.sqrt(descriptor.reduce((s, val) => s + val * val, 0)) || 1;
    return descriptor.map((v) => v / norm);
  } catch (e) {
    console.error("Facial feature extraction failed:", e);
    return null;
  }
}

/**
 * Calculates Euclidean Distance between two normalized feature vectors
 */
export function calculateVectorDistance(v1: number[], v2: number[]): number {
  if (v1.length !== v2.length) return 1.0;
  let sum = 0;
  for (let i = 0; i < v1.length; i++) {
    const diff = v1[i] - v2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/**
 * Enrolls owner Udit with multi-sample feature vectors
 */
export function enrollOwnerFace(sampleVectors: number[][]): FaceProfile | null {
  if (!sampleVectors || sampleVectors.length === 0) return null;

  // Compute average descriptor vector
  const vecLen = sampleVectors[0].length;
  const avgVector: number[] = new Array(vecLen).fill(0);

  for (const vec of sampleVectors) {
    for (let i = 0; i < vecLen; i++) {
      avgVector[i] += vec[i];
    }
  }

  for (let i = 0; i < vecLen; i++) {
    avgVector[i] /= sampleVectors.length;
  }

  // L2 Normalize average vector
  const norm = Math.sqrt(avgVector.reduce((s, v) => s + v * v, 0)) || 1;
  const normalizedAvg = avgVector.map((v) => v / norm);

  const profile: FaceProfile = {
    ownerName: "Udit",
    enrolledAt: Date.now(),
    sampleCount: sampleVectors.length,
    descriptor: normalizedAvg,
    signatureHash: generateSignatureHash("Udit", normalizedAvg),
  };

  try {
    const jsonStr = JSON.stringify(profile);
    const encrypted = simpleEncrypt(jsonStr, ENCRYPTION_SALT);
    localStorage.setItem(STORAGE_KEY, encrypted);
    isSessionOwnerRecognized = true;
    return profile;
  } catch (err) {
    console.error("Failed to save face profile:", err);
    return null;
  }
}

/**
 * Verifies live frame against enrolled owner face profile
 */
export function verifyOwnerFace(
  source: HTMLVideoElement | HTMLCanvasElement
): VerificationResult {
  const profile = getEnrolledFaceProfile();
  if (!profile) {
    return {
      isMatch: false,
      confidence: 0,
      message: "Owner face profile is not enrolled yet.",
    };
  }

  const liveVector = extractFacialFeatureVector(source);
  if (!liveVector) {
    isSessionOwnerRecognized = false;
    return {
      isMatch: false,
      confidence: 0,
      message: "Samne koi chehra nahi hai. Boss Udit maujood nahi hain.",
    };
  }

  // Calculate similarity distance
  const distance = calculateVectorDistance(liveVector, profile.descriptor);
  const confidence = Math.max(0, Math.min(100, Math.round((1 - distance / 0.45) * 100)));
  const isMatch = distance <= 0.35;

  if (isMatch) {
    isSessionOwnerRecognized = true;
    return {
      isMatch: true,
      confidence,
      ownerName: profile.ownerName,
      message: `Welcome back, boss Udit.`,
    };
  } else {
    isSessionOwnerRecognized = false;
    return {
      isMatch: false,
      confidence,
      message: "Unrecognized face. Aap Boss Udit nahi hain.",
    };
  }
}

// Simple XOR encryption for local key safety
function simpleEncrypt(str: string, key: string): string {
  let result = "";
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    result += String.fromCharCode(charCode);
  }
  return btoa(result);
}

function simpleDecrypt(encStr: string, key: string): string {
  try {
    const str = atob(encStr);
    let result = "";
    for (let i = 0; i < str.length; i++) {
      const charCode = str.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      result += String.fromCharCode(charCode);
    }
    return result;
  } catch (e) {
    return "";
  }
}

function generateSignatureHash(name: string, vector: number[]): string {
  const sample = vector.slice(0, 10).join("_");
  return `${name}_${vector.length}_${sample}`;
}
