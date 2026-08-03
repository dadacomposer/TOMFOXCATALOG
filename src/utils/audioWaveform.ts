export const extractWaveformFromFile = async (file: File, numPoints: number = 100): Promise<{ waveform: number[], duration: number, audioBuffer?: AudioBuffer }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        
        // We use an OfflineAudioContext just to decode the audio data
        // The sample rate 44100 is standard, though decodeAudioData will resample if needed
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        
        // Downmix to mono by averaging all channels
        const numChannels = audioBuffer.numberOfChannels;
        const length = audioBuffer.length;
        const monoSamples = new Float32Array(length);
        
        const channelData = [];
        for (let c = 0; c < numChannels; c++) {
          channelData.push(audioBuffer.getChannelData(c));
        }
        
        for (let i = 0; i < length; i++) {
          let sum = 0;
          for (let c = 0; c < numChannels; c++) {
            sum += channelData[c][i];
          }
          monoSamples[i] = sum / numChannels;
        }
        
        // Chunk and find max peak per chunk
        const chunkSize = Math.floor(length / numPoints);
        if (chunkSize === 0) {
          resolve({ waveform: [], duration: audioBuffer.duration, audioBuffer });
          return;
        }
        
        const peaks: number[] = [];
        let maxGlobalPeak = 0;
        
        for (let i = 0; i < numPoints; i++) {
          const start = i * chunkSize;
          const end = Math.min(start + chunkSize, length);
          
          let maxLocalPeak = 0;
          for (let j = start; j < end; j++) {
            const val = Math.abs(monoSamples[j]);
            if (val > maxLocalPeak) {
              maxLocalPeak = val;
            }
          }
          peaks.push(maxLocalPeak);
          if (maxLocalPeak > maxGlobalPeak) {
            maxGlobalPeak = maxLocalPeak;
          }
        }
        
        // Normalize 0-100
        const normalizedPeaks = peaks.map(p => {
          if (maxGlobalPeak === 0) return 0;
          return Math.floor((p / maxGlobalPeak) * 100);
        });
        
        resolve({ waveform: normalizedPeaks, duration: audioBuffer.duration, audioBuffer });
      } catch (err) {
        console.error('Error decoding audio:', err);
        reject(err);
      }
    };
    
    reader.onerror = (err) => {
      console.error('FileReader error:', err);
      reject(err);
    };
    
    reader.readAsArrayBuffer(file);
  });
};
