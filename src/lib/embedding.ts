import { pipeline, env } from '@xenova/transformers';

// Skip local check to load model from CDN directly (fastest for web apps)
env.allowLocalModels = false;

let extractor: any = null;
let isInitializing = false;
let initPromise: Promise<void> | null = null;

export async function initEmbeddingModel() {
  if (extractor) return;
  if (isInitializing && initPromise) return initPromise;
  
  isInitializing = true;
  initPromise = new Promise(async (resolve, reject) => {
    try {
      console.log('Loading AI embedding model...');
      extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
        quantized: true // Use INT8 weights for speed and small bundle size (20MB)
      });
      console.log('AI model loaded successfully!');
      resolve();
    } catch (e) {
      console.error('Failed to load AI model:', e);
      reject(e);
    } finally {
      isInitializing = false;
    }
  });
  
  return initPromise;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  await initEmbeddingModel();
  
  const output = await extractor(text, { pooling: 'mean', normalize: true });
  // Convert Float32Array to standard JS Array of numbers
  return Array.from(output.data);
}
