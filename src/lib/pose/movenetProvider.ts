/**
 * MoveNet Provider for 67Ranked
 * 
 * Loads MoveNet model directly from TFHub using tfjs-converter,
 * avoiding the pose-detection package's MediaPipe dependencies.
 * Uses SINGLEPOSE_LIGHTNING for optimal performance.
 * 
 * KEY FEATURES:
 * - Lazy loading (only loads when needed)
 * - Warmup step to prevent cold-start jank
 * - Adaptive frame skipping for performance
 * - Reusable buffers to minimize GC pressure
 */

// ============================================================================
// KEYPOINT INDICES (COCO format used by MoveNet)
// ============================================================================
const MOVENET_LEFT_WRIST = 9;
const MOVENET_RIGHT_WRIST = 10;
const MOVENET_LEFT_ELBOW = 7;
const MOVENET_RIGHT_ELBOW = 8;
const MOVENET_LEFT_SHOULDER = 5;
const MOVENET_RIGHT_SHOULDER = 6;

export const KeypointIndices = {
  LEFT_WRIST: MOVENET_LEFT_WRIST,
  RIGHT_WRIST: MOVENET_RIGHT_WRIST,
  LEFT_ELBOW: MOVENET_LEFT_ELBOW,
  RIGHT_ELBOW: MOVENET_RIGHT_ELBOW,
  LEFT_SHOULDER: MOVENET_LEFT_SHOULDER,
  RIGHT_SHOULDER: MOVENET_RIGHT_SHOULDER,
};

// ============================================================================
// TYPES
// ============================================================================
export interface NormalizedLandmark {
  x: number;      // 0-1, normalized to video width
  y: number;      // 0-1, normalized to video height
  z: number;      // Always 0 for MoveNet (2D only)
  visibility?: number;  // Mapped from MoveNet score (0-1)
}

export type NormalizedLandmarkList = NormalizedLandmark[];

export interface PoseFrame {
  poseLandmarks: NormalizedLandmarkList | null;
  timestamp: number;
}

export type BackendType = 'webgl' | 'cpu' | 'none';

export type InitState = 'idle' | 'loading' | 'warming_up' | 'ready' | 'error';

// ============================================================================
// CONFIGURATION
// ============================================================================
const MOVENET_LIGHTNING_URL = 'https://tfhub.dev/google/tfjs-model/movenet/singlepose/lightning/4';
const INPUT_SIZE = 192; // MoveNet Lightning input size

// Warmup: run dummy inferences to prime the GPU pipeline
const WARMUP_RUNS = 3;

// Frame skipping thresholds
const FPS_CHECK_INTERVAL = 2000; // Check FPS every 2 seconds
const LOW_FPS_THRESHOLD = 20;
const TARGET_INFERENCE_FPS = 30; // Target 30fps inference on mobile

// ============================================================================
// MODULE STATE
// ============================================================================
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let model: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let tf: any = null;
let currentBackend: BackendType = 'none';
let initState: InitState = 'idle';
let backendWarningShown = false;

// Reusable landmark array to reduce GC pressure (17 keypoints)
const landmarkBuffer: NormalizedLandmark[] = Array.from({ length: 17 }, () => ({
  x: 0,
  y: 0,
  z: 0,
  visibility: 0,
}));

// Frame skipping for weak devices
let frameCount = 0;
let lastPoseFrame: PoseFrame | null = null;
let skipFrames = 0; // 0 = process every frame, 1 = every other, etc.
let lastFpsCheck = 0;
let framesSinceCheck = 0;
let isMobile = false;

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize TensorFlow.js and MoveNet model with warmup.
 * Call this when the user hits "Start" to lazy-load.
 * 
 * @param onProgress - Optional callback for progress updates
 * @returns Backend type and final state
 */
export async function initPose(
  onProgress?: (state: InitState, message: string) => void
): Promise<{ backend: BackendType; state: InitState }> {
  if (initState === 'ready' && model) {
    return { backend: currentBackend, state: 'ready' };
  }

  // Check if we're in browser
  if (typeof window === 'undefined') {
    throw new Error('MoveNet can only be initialized in browser');
  }

  initState = 'loading';
  onProgress?.('loading', 'Loading tracking model...');

  // Detect mobile for frame skipping
  isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  try {
    // Dynamic imports to avoid SSR issues
    const tfCore = await import('@tensorflow/tfjs-core');
    await import('@tensorflow/tfjs-backend-webgl');
    const tfConverter = await import('@tensorflow/tfjs-converter');
    tf = tfCore;

    // Try WebGL first, then fall back to CPU
    try {
      await tf.setBackend('webgl');
      await tf.ready();
      currentBackend = 'webgl';
      console.log('[MoveNet] Using WebGL backend');
    } catch (webglError) {
      console.warn('[MoveNet] WebGL failed, falling back to CPU:', webglError);
      try {
        await tf.setBackend('cpu');
        await tf.ready();
        currentBackend = 'cpu';
        console.log('[MoveNet] Using CPU backend (slower)');
      } catch (cpuError) {
        console.error('[MoveNet] Failed to initialize any backend:', cpuError);
        currentBackend = 'none';
        initState = 'error';
        throw new Error('Failed to initialize TensorFlow.js backend');
      }
    }

    // Load MoveNet model directly from TFHub
    console.log('[MoveNet] Loading model from TFHub...');
    model = await tfConverter.loadGraphModel(MOVENET_LIGHTNING_URL, { fromTFHub: true });
    console.log('[MoveNet] Model loaded successfully');

    // Warmup phase - run dummy inferences to prime GPU pipeline
    initState = 'warming_up';
    onProgress?.('warming_up', 'Initializing tracking...');
    await performWarmup();

    // Reset frame skip state
    frameCount = 0;
    // On mobile or CPU, start with frame skipping to maintain render FPS
    skipFrames = (isMobile || currentBackend === 'cpu') ? 1 : 0;
    lastFpsCheck = performance.now();
    framesSinceCheck = 0;

    initState = 'ready';
    onProgress?.('ready', 'Ready');
    console.log('[MoveNet] Warmup complete, ready for tracking');

    return { backend: currentBackend, state: 'ready' };
  } catch (error) {
    initState = 'error';
    throw error;
  }
}

/**
 * Perform warmup inferences to eliminate cold-start latency.
 * Creates a small dummy canvas and runs inference on it.
 */
async function performWarmup(): Promise<void> {
  if (!model || !tf) return;

  // Create a small dummy canvas for warmup
  const dummyCanvas = document.createElement('canvas');
  dummyCanvas.width = INPUT_SIZE;
  dummyCanvas.height = INPUT_SIZE;
  const ctx = dummyCanvas.getContext('2d');
  if (!ctx) return;

  // Fill with random noise to simulate real input
  const imageData = ctx.createImageData(INPUT_SIZE, INPUT_SIZE);
  for (let i = 0; i < imageData.data.length; i += 4) {
    imageData.data[i] = Math.random() * 255;     // R
    imageData.data[i + 1] = Math.random() * 255; // G
    imageData.data[i + 2] = Math.random() * 255; // B
    imageData.data[i + 3] = 255;                 // A
  }
  ctx.putImageData(imageData, 0, 0);

  // Run warmup inferences
  for (let i = 0; i < WARMUP_RUNS; i++) {
    const inputTensor = tf.tidy(() => {
      const imageTensor = tf.browser.fromPixels(dummyCanvas);
      const resized = tf.image.resizeBilinear(imageTensor, [INPUT_SIZE, INPUT_SIZE]);
      return tf.cast(tf.expandDims(resized), 'int32');
    });

    const outputTensor = model.predict(inputTensor);
    // Force synchronous execution to ensure warmup completes
    await outputTensor.data();
    
    inputTensor.dispose();
    outputTensor.dispose();
  }
}

// ============================================================================
// GETTERS
// ============================================================================

export function getBackend(): BackendType {
  return currentBackend;
}

export function getInitState(): InitState {
  return initState;
}

export function isReady(): boolean {
  return initState === 'ready' && model !== null;
}

/**
 * Check if backend warning should be shown (only once per session)
 */
export function shouldShowBackendWarning(): boolean {
  if (currentBackend === 'cpu' && !backendWarningShown) {
    backendWarningShown = true;
    return true;
  }
  return false;
}

// ============================================================================
// POSE ESTIMATION
// ============================================================================

/**
 * Estimate pose from video element.
 * Returns normalized landmarks compatible with existing code.
 * 
 * Implements adaptive frame skipping:
 * - Rendering continues at 60fps (rAF)
 * - Inference runs at ~30fps on mobile, adaptive based on actual FPS
 * - Returns cached result when skipping to maintain responsiveness
 */
export async function estimatePose(
  videoEl: HTMLVideoElement
): Promise<PoseFrame | null> {
  if (!model || initState !== 'ready' || !tf) {
    return null;
  }

  const now = performance.now();
  
  // Frame skipping for performance
  frameCount++;
  framesSinceCheck++;

  // Adaptive frame skipping based on measured FPS
  if (now - lastFpsCheck > FPS_CHECK_INTERVAL) {
    const fps = (framesSinceCheck * 1000) / (now - lastFpsCheck);
    
    // Adjust skip rate based on FPS
    if (fps < LOW_FPS_THRESHOLD && skipFrames < 2) {
      skipFrames++;
      console.log(`[MoveNet] Low FPS (${fps.toFixed(1)}), increasing frame skip to ${skipFrames}`);
    } else if (fps > LOW_FPS_THRESHOLD * 1.5 && skipFrames > 0) {
      skipFrames--;
      console.log(`[MoveNet] Good FPS (${fps.toFixed(1)}), decreasing frame skip to ${skipFrames}`);
    }
    
    lastFpsCheck = now;
    framesSinceCheck = 0;
  }

  // Skip frames if needed, return last result (maintains render smoothness)
  if (skipFrames > 0 && frameCount % (skipFrames + 1) !== 0) {
    return lastPoseFrame;
  }

  const videoWidth = videoEl.videoWidth || 640;
  const videoHeight = videoEl.videoHeight || 480;

  try {
    // Preprocess: resize to model input size and cast to int32
    const inputTensor = tf.tidy(() => {
      const imageTensor = tf.browser.fromPixels(videoEl);
      const resized = tf.image.resizeBilinear(imageTensor, [INPUT_SIZE, INPUT_SIZE]);
      return tf.cast(tf.expandDims(resized), 'int32');
    });

    // Run inference
    const outputTensor = model.predict(inputTensor);
    
    // Get keypoints from output [1, 1, 17, 3] -> [y, x, score] for each keypoint
    const keypoints = await outputTensor.array();
    
    // Clean up tensors immediately
    inputTensor.dispose();
    outputTensor.dispose();

    if (!keypoints || !keypoints[0] || !keypoints[0][0]) {
      lastPoseFrame = {
        poseLandmarks: null,
        timestamp: now,
      };
      return lastPoseFrame;
    }

    const keypointData = keypoints[0][0]; // Shape: [17, 3]

    // Convert keypoints to normalized landmarks (reuse buffer to avoid GC)
    for (let i = 0; i < keypointData.length && i < landmarkBuffer.length; i++) {
      const kp = keypointData[i]; // [y, x, score]
      // MoveNet outputs normalized coordinates (0-1)
      landmarkBuffer[i].y = kp[0];
      landmarkBuffer[i].x = kp[1];
      landmarkBuffer[i].z = 0; // MoveNet is 2D
      landmarkBuffer[i].visibility = kp[2];
    }

    lastPoseFrame = {
      poseLandmarks: landmarkBuffer,
      timestamp: now,
    };

    return lastPoseFrame;
  } catch (error) {
    console.error('[MoveNet] Pose estimation error:', error);
    return lastPoseFrame;
  }
}

// ============================================================================
// CLEANUP
// ============================================================================

/**
 * Dispose of the model and free resources
 */
export async function disposePose(): Promise<void> {
  if (model) {
    model.dispose();
    model = null;
  }
  tf = null;
  initState = 'idle';
  currentBackend = 'none';
  lastPoseFrame = null;
  backendWarningShown = false;
  frameCount = 0;
  skipFrames = 0;
}

// ============================================================================
// CONVENIENCE METHODS
// ============================================================================

/**
 * Get wrist positions directly (legacy convenience method)
 */
export function getWristPositions(frame: PoseFrame | null): {
  leftWrist: { x: number; y: number; score: number } | null;
  rightWrist: { x: number; y: number; score: number } | null;
} {
  if (!frame?.poseLandmarks) {
    return { leftWrist: null, rightWrist: null };
  }

  const landmarks = frame.poseLandmarks;
  const leftWrist = landmarks[MOVENET_LEFT_WRIST];
  const rightWrist = landmarks[MOVENET_RIGHT_WRIST];

  return {
    leftWrist: leftWrist && (leftWrist.visibility ?? 0) > 0.3
      ? { x: leftWrist.x, y: leftWrist.y, score: leftWrist.visibility ?? 0 }
      : null,
    rightWrist: rightWrist && (rightWrist.visibility ?? 0) > 0.3
      ? { x: rightWrist.x, y: rightWrist.y, score: rightWrist.visibility ?? 0 }
      : null,
  };
}
