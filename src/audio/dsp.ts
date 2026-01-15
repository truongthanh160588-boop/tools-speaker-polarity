/**
 * DSP Utilities - Xử lý tín hiệu số
 * Không dùng thư viện ngoài, chỉ dùng Web Audio API
 */

/**
 * Tính RMS (Root Mean Square) của buffer
 * @param buffer AudioBuffer hoặc Float32Array
 * @param startIndex Bắt đầu từ sample nào
 * @param length Số sample cần tính
 * @returns Giá trị RMS
 */
export function calculateRMS(
  buffer: Float32Array,
  startIndex: number = 0,
  length?: number
): number {
  const endIndex = length !== undefined ? startIndex + length : buffer.length;
  let sum = 0;
  let count = 0;

  for (let i = startIndex; i < endIndex && i < buffer.length; i++) {
    sum += buffer[i] * buffer[i];
    count++;
  }

  if (count === 0) return 0;
  return Math.sqrt(sum / count);
}

/**
 * Tính RMS trong một khoảng cụ thể
 * @param buffer Float32Array
 * @param startIndex Bắt đầu từ sample nào
 * @param endIndex Kết thúc tại sample nào
 * @returns Giá trị RMS
 */
export function calculateRmsRange(
  buffer: Float32Array,
  startIndex: number,
  endIndex: number
): number {
  return calculateRMS(buffer, startIndex, endIndex - startIndex);
}

/**
 * Clamp giá trị trong khoảng [0, 1]
 * @param x Giá trị cần clamp
 * @returns Giá trị đã clamp
 */
export function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/**
 * Tính tỷ lệ dB: 20 * log10(a / (b + eps))
 * @param a Tử số
 * @param b Mẫu số
 * @param eps Epsilon để tránh chia cho 0 (mặc định 1e-10)
 * @returns Giá trị dB
 */
export function calculateDbRatio(a: number, b: number, eps: number = 1e-10): number {
  if (b + eps <= 0) return -Infinity;
  return 20 * Math.log10(a / (b + eps));
}

/**
 * Moving average của giá trị tuyệt đối (envelope smoothing)
 * @param buffer Float32Array gốc
 * @param windowSamples Số sample trong cửa sổ moving average (tương đương 2-3ms)
 * @returns Float32Array đã được smooth
 */
export function movingAverageAbs(
  buffer: Float32Array,
  windowSamples: number
): Float32Array {
  const result = new Float32Array(buffer.length);
  const halfWindow = Math.floor(windowSamples / 2);

  for (let i = 0; i < buffer.length; i++) {
    let sum = 0;
    let count = 0;

    const start = Math.max(0, i - halfWindow);
    const end = Math.min(buffer.length, i + halfWindow + 1);

    for (let j = start; j < end; j++) {
      sum += Math.abs(buffer[j]);
      count++;
    }

    result[i] = count > 0 ? sum / count : 0;
  }

  return result;
}

/**
 * Tìm peak (điểm cực đại theo giá trị tuyệt đối) trong buffer
 * @param buffer Float32Array gốc
 * @param startIndex Bắt đầu từ sample nào
 * @param endIndex Kết thúc tại sample nào
 * @param envelope Optional: envelope đã smooth (dùng để tìm peak, nhưng value lấy từ buffer gốc)
 * @returns { index: số thứ tự sample, value: giá trị tại đó, absValue: |value| }
 */
export function findPeak(
  buffer: Float32Array,
  startIndex: number,
  endIndex: number,
  envelope?: Float32Array
): { index: number; value: number; absValue: number } {
  let maxAbs = 0;
  let peakIndex = startIndex;
  let peakValue = 0;

  // Nếu có envelope, tìm peak dựa trên envelope
  const searchBuffer = envelope || buffer;

  for (let i = startIndex; i < endIndex && i < searchBuffer.length; i++) {
    const abs = envelope ? searchBuffer[i] : Math.abs(searchBuffer[i]);
    if (abs > maxAbs) {
      maxAbs = abs;
      peakIndex = i;
      // Value luôn lấy từ buffer gốc
      peakValue = buffer[i];
    }
  }

  return {
    index: peakIndex,
    value: peakValue,
    absValue: Math.abs(peakValue),
  };
}

/**
 * Tạo band-pass filter node
 * @param audioContext AudioContext
 * @param lowFreq Tần số thấp (Hz)
 * @param highFreq Tần số cao (Hz)
 * @returns BiquadFilterNode đã cấu hình
 */
export function createBandPassFilter(
  audioContext: AudioContext,
  lowFreq: number = 80,
  highFreq: number = 800
): BiquadFilterNode {
  const filter = audioContext.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = (lowFreq + highFreq) / 2; // Center frequency
  filter.Q.value = (lowFreq + highFreq) / (highFreq - lowFreq); // Q factor
  return filter;
}

/**
 * Normalize buffer về [-1, 1]
 * @param buffer Float32Array
 * @returns Float32Array đã normalize
 */
export function normalizeBuffer(buffer: Float32Array): Float32Array {
  let maxAbs = 0;
  for (let i = 0; i < buffer.length; i++) {
    maxAbs = Math.max(maxAbs, Math.abs(buffer[i]));
  }
  if (maxAbs === 0) return buffer;
  const result = new Float32Array(buffer.length);
  for (let i = 0; i < buffer.length; i++) {
    result[i] = buffer[i] / maxAbs;
  }
  return result;
}

/**
 * Cross-correlation giữa reference và recorded signal
 * Tìm lag có correlation peak cao nhất (direct arrival)
 * @param ref Reference signal (tín hiệu phát)
 * @param rec Recorded signal (tín hiệu thu)
 * @param maxLag Maximum lag to search (samples)
 * @returns { bestLag: lag có peak cao nhất, peak: giá trị correlation peak, peakValue: giá trị tại peak trong rec }
 */
export function crossCorrelation(
  ref: Float32Array,
  rec: Float32Array,
  maxLag: number
): { bestLag: number; peak: number; peakValue: number } {
  let maxCorr = -Infinity;
  let bestLag = 0;
  let peakValue = 0;

  // Normalize ref để correlation ổn định
  const refNorm = normalizeBuffer(ref);
  const refEnergy = refNorm.reduce((sum, x) => sum + x * x, 0);

  // Tìm correlation cho mỗi lag
  for (let lag = 0; lag < maxLag && lag < rec.length - ref.length; lag++) {
    let corr = 0;

    // Tính correlation tại lag này
    for (let i = 0; i < ref.length && lag + i < rec.length; i++) {
      corr += refNorm[i] * rec[lag + i];
    }

    // Normalize correlation (chia cho sqrt của energy)
    const recSegment = rec.subarray(lag, lag + ref.length);
    const recEnergy = recSegment.reduce((sum, x) => sum + x * x, 0);
    const normFactor = Math.sqrt(refEnergy * recEnergy);
    if (normFactor > 0) {
      corr = corr / normFactor;
    }

    if (corr > maxCorr) {
      maxCorr = corr;
      bestLag = lag;
      // Lấy giá trị tại peak trong rec (tại vị trí bestLag + một offset trong ref)
      const peakIdx = bestLag + Math.floor(ref.length / 2);
      if (peakIdx < rec.length) {
        peakValue = rec[peakIdx];
      }
    }
  }

  return {
    bestLag,
    peak: maxCorr,
    peakValue,
  };
}

/**
 * Tạo band-limited chirp (sweep) trong dải tần - chuẩn cho test cực loa
 * Chirp quét từ lowFreq đến highFreq trong thời gian duration
 * @param lowFreq Tần số thấp (Hz)
 * @param highFreq Tần số cao (Hz)
 * @param duration Độ dài (seconds)
 * @param sampleRate Sample rate
 * @returns Float32Array chứa tín hiệu test (chirp)
 */
export function createBandLimitedBurst(
  lowFreq: number,
  highFreq: number,
  duration: number,
  sampleRate: number
): Float32Array {
  const length = Math.floor(duration * sampleRate);
  const buffer = new Float32Array(length);
  const bandwidth = highFreq - lowFreq;

  // Tạo chirp (linear frequency sweep)
  // Tần số quét từ lowFreq đến highFreq trong thời gian duration
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    
    // Phase tích lũy (integral của frequency)
    // f(t) = lowFreq + (bandwidth * t / duration)
    // Phase = 2π * ∫f(t)dt = 2π * (lowFreq*t + bandwidth*t²/(2*duration))
    const phase = 2 * Math.PI * (lowFreq * t + (bandwidth * t * t) / (2 * duration));
    
    // Tạo sine wave với phase tích lũy
    buffer[i] = Math.sin(phase);
  }

  // Fade in/out 2ms để tránh click
  const fadeSamples = Math.floor(0.002 * sampleRate);
  for (let i = 0; i < fadeSamples; i++) {
    const fade = i / fadeSamples;
    buffer[i] *= fade;
    buffer[length - 1 - i] *= fade;
  }

  // Normalize về [-1, 1]
  return normalizeBuffer(buffer);
}

/**
 * Alias cho calculateDbRatio (db20)
 */
export function db20(a: number, b: number, eps: number = 1e-10): number {
  return calculateDbRatio(a, b, eps);
}
