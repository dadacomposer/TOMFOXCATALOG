import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;
let isLoaded = false;
let watermarkLoaded = false;

export async function getFFmpeg(onProgress?: (progress: number) => void): Promise<FFmpeg> {
  if (!ffmpeg) {
    ffmpeg = new FFmpeg();
  }

  if (onProgress) {
    // Remove previous listeners to avoid duplicates if called multiple times
    ffmpeg.off('progress', () => {});
    ffmpeg.on('progress', ({ progress }) => {
      onProgress(progress);
    });
  }

  if (isLoaded) return ffmpeg;

  const baseURL = window.location.origin;
  
  try {
    await ffmpeg.load({
      coreURL: `${baseURL}/ffmpeg-core.js`,
      wasmURL: `${baseURL}/ffmpeg-core.wasm`,
    });
    isLoaded = true;
  } catch (error: any) {
    console.error("Failed to load FFmpeg", error);
    throw new Error(`Could not initialize audio processor: ${error.message || String(error)}`);
  }

  return ffmpeg;
}

let processQueue = Promise.resolve();

export function processAudioFormats(
  mainFile: File,
  options: {
    generateMp3: boolean;
    generateWatermarked: boolean;
    generateWav?: boolean;
    generateAiff?: boolean;
    onProgress?: (status: string, percent: number) => void;
  }
): Promise<{ mp3File?: File; watermarkedFile?: File; wavFile?: File; aiffFile?: File }> {
  return new Promise((resolve, reject) => {
    // Add to the queue
    processQueue = processQueue.then(async () => {
      try {
        options.onProgress?.("Waiting in queue...", 0);
        const results = await _processAudioFormatsCore(mainFile, options);
        resolve(results);
      } catch (err) {
        reject(err);
      }
    });
  });
}

async function _processAudioFormatsCore(
  mainFile: File,
  options: {
    generateMp3: boolean;
    generateWatermarked: boolean;
    generateWav?: boolean;
    generateAiff?: boolean;
    onProgress?: (status: string, percent: number) => void;
  }
): Promise<{ mp3File?: File; watermarkedFile?: File; wavFile?: File; aiffFile?: File }> {
  const ffmpeg = await getFFmpeg();
  
  const results: { mp3File?: File; watermarkedFile?: File; wavFile?: File; aiffFile?: File } = {};
  
  // Write main file to memory
  const inputExt = mainFile.name.split('.').pop()?.toLowerCase();
  const inputName = `input.${inputExt}`;
  
  options.onProgress?.("Writing file to memory", 0);
  await ffmpeg.writeFile(inputName, await fetchFile(mainFile));

  let mp3Name = 'input.mp3';
  const originalBaseName = mainFile.name.replace(/\.[^/.]+$/, "");

  // Generate WAV if requested
  if (options.generateWav && inputExt !== 'wav') {
    options.onProgress?.("Generating HD WAV...", 5);
    const wavName = 'output.wav';
    await ffmpeg.exec(['-y', '-i', inputName, wavName]);
    const wavData = await ffmpeg.readFile(wavName);
    const wavBlob = new Blob([wavData as any], { type: 'audio/wav' });
    results.wavFile = new File([wavBlob], `${originalBaseName}.wav`, { type: 'audio/wav' });
    await ffmpeg.deleteFile(wavName);
  }

  // Generate AIFF if requested
  if (options.generateAiff && inputExt !== 'aiff' && inputExt !== 'aif') {
    options.onProgress?.("Generating HD AIFF...", 8);
    const aiffName = 'output.aiff';
    await ffmpeg.exec(['-y', '-i', inputName, aiffName]);
    const aiffData = await ffmpeg.readFile(aiffName);
    const aiffBlob = new Blob([aiffData as any], { type: 'audio/aiff' });
    results.aiffFile = new File([aiffBlob], `${originalBaseName}.aiff`, { type: 'audio/aiff' });
    await ffmpeg.deleteFile(aiffName);
  }

  // 1. Convert to MP3 if needed
  if (options.generateMp3) {
    options.onProgress?.("Converting to MP3...", 10);
    
    // Set up progress tracking specifically for MP3
    ffmpeg.on('progress', ({ progress }) => {
       options.onProgress?.("Converting to MP3...", 10 + (progress * 40));
    });

    // Run conversion (192k for high quality standard streaming)
    await ffmpeg.exec(['-y', '-i', inputName, '-c:a', 'libmp3lame', '-b:a', '192k', mp3Name]);
    
    const mp3Data = await ffmpeg.readFile(mp3Name);
    const mp3Blob = new Blob([mp3Data as any], { type: 'audio/mpeg' });
    results.mp3File = new File([mp3Blob], `${originalBaseName}.mp3`, { type: 'audio/mpeg' });
  } else if (inputExt === 'mp3') {
    // If it's already an MP3 and we don't need to generate one, just use the input name
    mp3Name = inputName;
  }

  // 2. Generate Watermark if needed
  if (options.generateWatermarked) {
    options.onProgress?.("Applying watermark...", 50);

    // We must ensure the watermark file is loaded into FFmpeg memory
    if (!watermarkLoaded) {
      options.onProgress?.("Loading watermark file...", 55);
      // Fetch the watermark file from our public folder
      const wmUrl = window.location.origin + '/watermark.mp3';
      try {
        await ffmpeg.writeFile('watermark.mp3', await fetchFile(wmUrl));
        
        // Pad the watermark with 12 seconds of silence (just like Python script did)
        options.onProgress?.("Padding watermark...", 60);
        await ffmpeg.exec([
          '-y', '-i', 'watermark.mp3', 
          '-af', 'apad=pad_dur=12', 
          '-c:a', 'libmp3lame',
          'padded_watermark.mp3'
        ]);
        watermarkLoaded = true;
      } catch (err) {
        console.error("Failed to fetch/pad watermark", err);
        throw new Error("Failed to prepare watermark audio");
      }
    }

    // Set up progress tracking for watermarking
    ffmpeg.off('progress', () => {});
    ffmpeg.on('progress', ({ progress }) => {
       options.onProgress?.("Applying watermark...", 60 + (progress * 40));
    });

    const watermarkedName = 'watermarked.mp3';
    
    // Mix the mp3 file with the looping padded watermark
    // -stream_loop -1 loops the watermark. amix mixes them. duration=first ensures it stops when main track ends.
    await ffmpeg.exec([
      '-y', 
      '-i', mp3Name,
      '-stream_loop', '-1', '-i', 'padded_watermark.mp3',
      '-filter_complex', '[0:a]volume=0.85[main];[1:a]volume=1.0[wm];[main][wm]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[out]',
      '-map', '[out]',
      '-c:a', 'libmp3lame', '-b:a', '128k', // 128k is plenty for watermarked preview
      watermarkedName
    ]);

    const watermarkedData = await ffmpeg.readFile(watermarkedName);
    const watermarkedBlob = new Blob([watermarkedData as any], { type: 'audio/mpeg' });
    const originalBaseName = mainFile.name.replace(/\.[^/.]+$/, "");
    results.watermarkedFile = new File([watermarkedBlob], `${originalBaseName}.mp3`, { type: 'audio/mpeg' }); // use .mp3 extension for standard audio preview
  }

  // Cleanup memory
  await ffmpeg.deleteFile(inputName);
  if (options.generateMp3) await ffmpeg.deleteFile(mp3Name);
  if (options.generateWatermarked) await ffmpeg.deleteFile('watermarked.mp3');

  options.onProgress?.("Processing complete!", 100);
  return results;
}
