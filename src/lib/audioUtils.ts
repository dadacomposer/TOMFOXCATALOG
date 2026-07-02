export const parseWaveform = (wd: any): number[] | null => {
  if (!wd) return null;
  if (typeof wd === 'string') {
    try { return JSON.parse(wd); } catch { return null; }
  }
  if (Array.isArray(wd)) return wd;
  return null;
};

export const getPreviewTimings = (track: any) => {
  const wd = parseWaveform(track.waveform_data);
  if (!wd || wd.length === 0 || !track.duration) {
    return null;
  }

  const durationNum = typeof track.duration === 'number' ? track.duration : parseFloat(track.duration as string);
  
  if (durationNum < 35) {
    return {
      start: 0,
      end: durationNum,
      startPct: 0,
      endPct: 100
    };
  }
  
  if (durationNum < 55) {
    let maxIdx = -1;
    let maxVal = -1;
    wd.forEach((val: number, idx: number) => {
      if (val > maxVal) {
        maxVal = val;
        maxIdx = idx;
      }
    });
    const peakTime = maxIdx !== -1 ? (maxIdx / wd.length) * durationNum : durationNum / 2;
    let start = Math.max(0, peakTime - 15);
    let end = start + 30;
    if (end > durationNum) {
      end = durationNum;
      start = Math.max(0, end - 30);
    }
    return {
      start,
      end,
      startPct: (start / durationNum) * 100,
      endPct: Math.min(100, (end / durationNum) * 100)
    };
  }

  const minPeakTime = durationNum / 6;
  const maxPeakTime = 5 * (durationNum / 6);

  let maxIdx = -1;
  let maxVal = -1;
  wd.forEach((val: number, idx: number) => {
    const time = (idx / wd.length) * durationNum;
    if (time >= minPeakTime && time <= maxPeakTime) {
      if (val > maxVal) {
        maxVal = val;
        maxIdx = idx;
      }
    }
  });

  const peakTime = maxIdx !== -1 ? (maxIdx / wd.length) * durationNum : durationNum / 2;
  const idealStart = peakTime - 15; // Center the 30s preview around the peak
  
  const minStart = durationNum / 6;
  const maxEnd = 5 * (durationNum / 6);
  
  let start = idealStart;
  let end = start + 30;
  
  // Shift left if it crosses the right boundary
  if (end > maxEnd) {
    end = maxEnd;
    start = end - 30;
  }
  
  // Shift right if it crosses the left boundary (won't cross right again because duration >= 55s means available space is >= 36.6s)
  if (start < minStart) {
    start = minStart;
    end = start + 30;
  }
  
  return {
    start,
    end,
    startPct: (start / durationNum) * 100,
    endPct: Math.min(100, (end / durationNum) * 100)
  };
};
