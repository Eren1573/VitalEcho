export type Mood = 'calm' | 'happy' | 'sad' | 'fatigued' | 'distressed';

/**
 * 💡 VISION MODEL INTEGRATION INSTRUCTIONS
 * 
 * To implement true Zero-Wearable Vision Tracking using face-api.js:
 * 
 * 1. Install dependencies: \`npm install @vladmandic/face-api\`
 * 2. Download model weights (e.g. tiny_face_detector, face_expression) and place them in \`/public/models/\`
 * 3. Initialize the models:
 * 
 * \`\`\`typescript
 * import * as faceapi from '@vladmandic/face-api';
 * 
 * export async function loadVisionModels() {
 *   await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
 *   await faceapi.nets.faceExpressionNet.loadFromUri('/models');
 * }
 * \`\`\`
 * 
 * 4. Run inference on a video element:
 * \`\`\`typescript
 * export async function detectMood(videoElement: HTMLVideoElement) {
 *   const detections = await faceapi.detectSingleFace(videoElement, new faceapi.TinyFaceDetectorOptions()).withFaceExpressions();
 *   if (detections) {
 *     // Find the expression with the highest probability
 *     const expressions = detections.expressions;
 *     const dominantMood = Object.keys(expressions).reduce((a, b) => expressions[a] > expressions[b] ? a : b);
 *     return dominantMood;
 *   }
 *   return 'unknown';
 * }
 * \`\`\`
 * 
 * For this demo, we provide a mock simulation below so the app is instantly runnable end-to-end without waiting for model downloads.
 */

// Simulated Mock for Demo
export async function loadVisionModelsMock() {
  return new Promise(resolve => setTimeout(resolve, 1000));
}

const MOODS: Mood[] = ['calm', 'calm', 'calm', 'happy', 'fatigued', 'distressed'];

export async function detectMoodMock(): Promise<Mood> {
  // Simulate inference delay
  await new Promise(resolve => setTimeout(resolve, 500));
  return MOODS[Math.floor(Math.random() * MOODS.length)];
}
