let extractor: any = null;
let isInitializing = false;
let initPromise: Promise<void> | null = null;

export async function initEmbeddingModel() {
  if (extractor) return;
  if (isInitializing && initPromise) return initPromise;
  
  isInitializing = true;
  // The embedding runtime is large and also downloads model weights. Loading
  // it eagerly made every Browse visit compete with the catalogue itself,
  // particularly on phones. Keep the AI feature on demand and in its own
  // Vite chunk instead of making it part of the app's initial JavaScript.
  initPromise = (async () => {
    try {
      const { pipeline, env } = await import('@xenova/transformers');
      // Skip local lookup and use the model CDN when semantic search is used.
      env.allowLocalModels = false;
      console.log('Loading AI embedding model...');
      extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
        quantized: true
      });
      console.log('AI model loaded successfully!');
    } catch (e) {
      console.error('Failed to load AI model:', e);
      // Allow a future search to retry after a temporary connectivity issue.
      initPromise = null;
      throw e;
    } finally {
      isInitializing = false;
    }
  })();
  
  return initPromise;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  await initEmbeddingModel();
  
  const output = await extractor(text, { pooling: 'mean', normalize: true });
  // Convert Float32Array to standard JS Array of numbers
  return Array.from(output.data);
}
