/**
 * Audio Engine - Quản lý mic input, phát test signal, và detect polarity
 * Version 2.0 - 3-Band Test (LOW/MID/HI) + 5 pulses + Cross-correlation
 */

import {
  createBandPassFilter,
  calculateRmsRange,
  clamp01,
  crossCorrelation,
  createBandLimitedBurst,
  db20,
} from './dsp';

export type BandTest = 'LOW' | 'MID' | 'HI';
export type SignalStrength = 'Low' | 'Good' | 'High';

export interface PulseResult {
  valid: boolean;
  sign: '+' | '-' | '—';
  snrDb: number;
  confidence: number;
  rmsDbfs: number;
  correlationPeak: number;
}

export interface BandReport {
  band: BandTest;
  polarity: '+' | '-' | '—';
  votePlus: number;
  voteMinus: number;
  validCount: number;
  snrAvg: number;
  rmsAvgDbfs: number;
  confidenceAvg: number;
  recommendation: string;
  status: 'TỐT' | 'ĐẠT' | 'CHƯA ĐẠT';
}

export interface AudioEngineCallbacks {
  onSignalStrengthChange?: (strength: SignalStrength) => void;
  onBandReport?: (report: BandReport) => void;
  onPulseProgress?: (pulse: number, total: number, result: PulseResult | null) => void;
  onLog?: (message: string) => void;
  onError?: (error: Error) => void;
}

interface BandConfig {
  lowFreq: number;
  highFreq: number;
  pulseLenMs: number;
  pulseGapMs: number;
}

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private bandPassFilter: BiquadFilterNode | null = null;
  private analyser: AnalyserNode | null = null;
  private isTestOutputEnabled: boolean = false;
  private isRecording: boolean = false;
  private recordingBuffer: Float32Array[] = [];
  private recordingStartTime: number = 0;
  private pulseStartTimes: number[] = [];
  private callbacks: AudioEngineCallbacks;
  private bluetoothMode: boolean = false;

  // Cấu hình cố định
  private readonly SAMPLE_RATE = 48000; // Mục tiêu 48kHz
  private readonly RECORD_DURATION_NORMAL = 1.2; // Ghi 1.2s cho mỗi pulse (normal)
  private readonly RECORD_DURATION_BLUETOOTH = 2.5; // Ghi 2.5s cho mỗi pulse (Bluetooth)
  private readonly NOISE_WINDOW_END = 0.120; // 120ms cho noise baseline
  private readonly SIGNAL_WINDOW_MS = 80; // 80ms sau arrival cho signal RMS

  // Band configurations
  private readonly BAND_CONFIGS: Record<BandTest, BandConfig> = {
    LOW: { lowFreq: 30, highFreq: 120, pulseLenMs: 90, pulseGapMs: 380 },
    MID: { lowFreq: 90, highFreq: 2000, pulseLenMs: 50, pulseGapMs: 320 },
    HI: { lowFreq: 2000, highFreq: 16000, pulseLenMs: 30, pulseGapMs: 280 },
  };

  // Log buffer
  private logBuffer: string[] = [];
  private readonly MAX_LOG_LINES = 5;

  // Reference signal cho correlation
  private currentReference: Float32Array | null = null;
  private currentBand: BandTest | null = null;

  constructor(callbacks: AudioEngineCallbacks = {}) {
    this.callbacks = callbacks;
  }

  /**
   * Khởi tạo AudioContext
   */
  async initialize(): Promise<void> {
    if (this.audioContext) {
      return;
    }

    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: this.SAMPLE_RATE,
    });

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  /**
   * Bắt đầu thu âm từ microphone
   */
  async startMic(): Promise<void> {
    await this.initialize();

    if (!this.audioContext) {
      throw new Error('AudioContext chưa được khởi tạo');
    }

    this.micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });

    this.micSource = this.audioContext.createMediaStreamSource(this.micStream);

    // Tạo analyser
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.3;

    // Kết nối: mic → analyser (filter sẽ được tạo theo band)
    this.micSource.connect(this.analyser);

    this.monitorSignalStrength();
    this.pushLog('Start mic OK');
  }

  /**
   * Dừng thu âm từ microphone
   */
  stopMic(): void {
    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }

    if (this.micSource) {
      this.micSource.disconnect();
      this.micSource = null;
    }

    if (this.bandPassFilter) {
      this.bandPassFilter.disconnect();
      this.bandPassFilter = null;
    }

    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }

    this.isRecording = false;
    this.recordingBuffer = [];
    this.pushLog('Stop mic');
  }

  /**
   * Bật/tắt test signal output
   */
  setTestOutputEnabled(enabled: boolean): void {
    this.isTestOutputEnabled = enabled;
    this.pushLog(`Output: ${enabled ? 'ON' : 'OFF'}`);
  }

  /**
   * Bật/tắt chế độ Bluetooth (chịu trễ cao)
   */
  setBluetoothMode(enabled: boolean): void {
    this.bluetoothMode = enabled;
    this.pushLog(`Bluetooth Mode: ${enabled ? 'ON' : 'OFF'}`);
  }

  /**
   * Lấy record duration dựa trên mode
   */
  private getRecordDuration(): number {
    return this.bluetoothMode ? this.RECORD_DURATION_BLUETOOTH : this.RECORD_DURATION_NORMAL;
  }

  /**
   * Resume AudioContext nếu bị suspended
   */
  async ensureAudioContextResumed(): Promise<void> {
    if (!this.audioContext) {
      await this.initialize();
    }

    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  /**
   * Tạo và phát một pulse (band-limited burst)
   */
  private async playPulse(band: BandTest): Promise<void> {
    await this.ensureAudioContextResumed();

    if (!this.audioContext) {
      throw new Error('AudioContext chưa được khởi tạo');
    }

    if (!this.isTestOutputEnabled) {
      return;
    }

    const config = this.BAND_CONFIGS[band];
    const now = this.audioContext.currentTime;
    this.pulseStartTimes.push(now);

    // Tạo reference signal nếu chưa có hoặc band thay đổi
    if (!this.currentReference || this.currentBand !== band) {
      const duration = config.pulseLenMs / 1000;
      this.currentReference = createBandLimitedBurst(
        config.lowFreq,
        config.highFreq,
        duration,
        this.audioContext.sampleRate
      );
      this.currentBand = band;
    }

    // Phát qua AudioBufferSourceNode
    const buffer = this.audioContext.createBuffer(
      1,
      this.currentReference.length,
      this.audioContext.sampleRate
    );
    buffer.copyToChannel(new Float32Array(this.currentReference), 0);

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;

    const gain = this.audioContext.createGain();
    gain.gain.value = 0.7;

    source.connect(gain);
    gain.connect(this.audioContext.destination);

    source.start(now);
    source.stop(now + config.pulseLenMs / 1000 + 0.001);

    source.onended = () => {
      source.disconnect();
      gain.disconnect();
    };
  }

  /**
   * Ghi buffer từ mic (1.2s)
   */
  private async recordPulse(): Promise<Float32Array> {
    if (!this.audioContext) {
      throw new Error('AudioContext chưa được khởi tạo');
    }
    
    // Sử dụng bandPassFilter (đã được connect trong testBand) hoặc micSource
    const inputNode = this.bandPassFilter || this.micSource;
    if (!inputNode || !this.audioContext) {
      throw new Error('Mic chưa được khởi động');
    }

    return new Promise((resolve) => {
      this.isRecording = true;
      this.recordingBuffer = [];
      this.recordingStartTime = this.audioContext!.currentTime;

      const bufferSize = 4096;
      const processor = this.audioContext!.createScriptProcessor(bufferSize, 1, 1);

      processor.onaudioprocess = (e) => {
        if (!this.isRecording) {
          processor.disconnect();
          return;
        }

        const inputData = e.inputBuffer.getChannelData(0);
        const copy = new Float32Array(inputData.length);
        copy.set(inputData);
        this.recordingBuffer.push(copy);

        const elapsed = this.audioContext!.currentTime - this.recordingStartTime;
        const recordDuration = this.getRecordDuration();
        if (elapsed >= recordDuration) {
          this.isRecording = false;
          processor.disconnect();

          // Ghép buffer
          const totalLength = this.recordingBuffer.reduce((sum, buf) => sum + buf.length, 0);
          const fullBuffer = new Float32Array(totalLength);
          let offset = 0;
          for (const buf of this.recordingBuffer) {
            fullBuffer.set(buf, offset);
            offset += buf.length;
          }

          resolve(fullBuffer);
        }
      };

      // Kết nối input node → processor
      if (inputNode && this.audioContext) {
        inputNode.connect(processor);
        processor.connect(this.audioContext.destination);
      }
    });
  }

  /**
   * Xử lý một pulse: correlation, detect polarity, tính metrics
   * Note: Filter đã được apply real-time qua mic chain, nên recorded đã được filter
   */
  private processPulse(
    recorded: Float32Array,
    band: BandTest,
    pulseIndex: number
  ): PulseResult {
    const sampleRate = this.audioContext?.sampleRate || 48000;

    // Cross-correlation để tìm direct arrival
    if (!this.currentReference || !this.audioContext) {
      return {
        valid: false,
        sign: '—',
        snrDb: 0,
        confidence: 0,
        rmsDbfs: -Infinity,
        correlationPeak: 0,
      };
    }

    // Tính maxLag dựa trên mode và band
    // Normal: 1.5s, Bluetooth: 1.8s (MID/HI) hoặc 2.2s (LOW)
    let maxLagSeconds = 1.5;
    if (this.bluetoothMode) {
      maxLagSeconds = band === 'LOW' ? 2.2 : 1.8;
    }
    const maxLag = Math.floor(maxLagSeconds * sampleRate);
    
    // Tạo copy để tránh type issue
    const refCopy = new Float32Array(this.currentReference);
    const recCopy = new Float32Array(recorded);
    const corrResult = crossCorrelation(refCopy, recCopy, maxLag);

    // Tìm direct arrival từ correlation peak
    const arrivalIndex = corrResult.bestLag;
    const correlationPeak = corrResult.peak;

    // Gate: correlation peak phải đủ cao
    if (correlationPeak < 0.3) {
      this.pushLog(`Pulse ${pulseIndex + 1}: Correlation quá thấp (${correlationPeak.toFixed(2)})`);
      return {
        valid: false,
        sign: '—',
        snrDb: 0,
        confidence: 0,
        rmsDbfs: -Infinity,
        correlationPeak,
      };
    }

    // Tính noise RMS (trước arrival)
    const noiseEndSample = Math.min(
      Math.floor(this.NOISE_WINDOW_END * sampleRate),
      arrivalIndex
    );
    const noiseRms =
      noiseEndSample > 0 ? calculateRmsRange(recorded, 0, noiseEndSample) : 0.001;

    // Tính signal RMS (sau arrival, trong cửa sổ 80ms)
    const signalStartSample = arrivalIndex;
    const signalEndSample = Math.min(
      arrivalIndex + Math.floor((this.SIGNAL_WINDOW_MS / 1000) * sampleRate),
      recorded.length
    );
    const signalRms =
      signalEndSample > signalStartSample
        ? calculateRmsRange(recorded, signalStartSample, signalEndSample)
        : 0.001;

    // SNR
    const snrDb = db20(signalRms, noiseRms);

    // Gate: SNR phải >= 14 dB
    if (snrDb < 14) {
      this.pushLog(`Pulse ${pulseIndex + 1}: SNR quá thấp (${snrDb.toFixed(1)}dB)`);
      return {
        valid: false,
        sign: '—',
        snrDb,
        confidence: 0,
        rmsDbfs: db20(signalRms, 1.0), // dBFS (full scale = 1.0)
        correlationPeak,
      };
    }

    // Detect polarity từ correlation peak value
    const sign: '+' | '-' = corrResult.peakValue > 0 ? '+' : '-';

    // Confidence: (snrDb - 14) / 20, clamp 0..1, * 100
    const confidence = clamp01((snrDb - 14) / 20) * 100;

    const rmsDbfs = db20(signalRms, 1.0);

    this.pushLog(
      `Pulse ${pulseIndex + 1}: ${sign} SNR=${snrDb.toFixed(1)}dB Conf=${confidence.toFixed(0)}%`
    );

    return {
      valid: true,
      sign,
      snrDb,
      confidence,
      rmsDbfs,
      correlationPeak,
    };
  }

  /**
   * Test một band: phát 5 pulses và tổng hợp report
   */
  async testBand(band: BandTest): Promise<BandReport> {
    if (!this.audioContext || !this.micSource) {
      throw new Error('Mic chưa được khởi động');
    }

    if (!this.isTestOutputEnabled) {
      throw new Error('Test output chưa được bật');
    }

    const config = this.BAND_CONFIGS[band];

    // Cập nhật band-pass filter
    if (!this.micSource || !this.analyser) {
      throw new Error('Mic chưa được khởi động');
    }

    // Disconnect tất cả connections hiện tại
    if (this.bandPassFilter) {
      this.bandPassFilter.disconnect();
    }
    this.micSource.disconnect();

    // Tạo filter mới và reconnect
    this.bandPassFilter = createBandPassFilter(
      this.audioContext,
      config.lowFreq,
      config.highFreq
    );
    this.micSource.connect(this.bandPassFilter);
    this.bandPassFilter.connect(this.analyser);

    this.pushLog(`Test ${band} (${config.lowFreq}-${config.highFreq}Hz)`);

    const results: PulseResult[] = [];
    this.pulseStartTimes = [];

    // Phát và thu 5 pulses
    const numPulses = 5;
    for (let i = 0; i < numPulses; i++) {
      // Bắt đầu ghi
      const recordingPromise = this.recordPulse();

      // Đợi một chút rồi phát
      await new Promise((resolve) => setTimeout(resolve, 50));
      await this.playPulse(band);

      // Đợi recording xong
      const recorded = await recordingPromise;

      // Xử lý
      const result = this.processPulse(recorded, band, i);
      results.push(result);

      // Callback progress
      if (this.callbacks.onPulseProgress) {
        this.callbacks.onPulseProgress(i + 1, numPulses, result);
      }

      // Đợi giữa các pulses
      if (i < 4) {
        await new Promise((resolve) => setTimeout(resolve, config.pulseGapMs));
      }
    }

    // Tổng hợp report
    const validResults = results.filter((r) => r.valid);
    const validCount = validResults.length;

    let votePlus = 0;
    let voteMinus = 0;
    let polarity: '+' | '-' | '—' = '—';

    if (validCount >= 4) {
      // Đủ valid (>= 4/5), tính vote
      for (const r of validResults) {
        if (r.sign === '+') votePlus++;
        else if (r.sign === '-') voteMinus++;
      }
      polarity = votePlus > voteMinus ? '+' : voteMinus > votePlus ? '-' : '—';
    }

    // Tính trung bình
    const snrAvg =
      validCount > 0
        ? validResults.reduce((sum, r) => sum + r.snrDb, 0) / validCount
        : 0;
    const rmsAvgDbfs =
      validCount > 0
        ? validResults.reduce((sum, r) => sum + r.rmsDbfs, 0) / validCount
        : -Infinity;
    const confidenceAvg =
      validCount > 0
        ? validResults.reduce((sum, r) => sum + r.confidence, 0) / validCount
        : 0;

    // Đánh giá status
    let status: 'TỐT' | 'ĐẠT' | 'CHƯA ĐẠT' = 'CHƯA ĐẠT';
    let recommendation = '';

    if (snrAvg >= 24 && validCount >= 5) {
      status = 'TỐT';
      recommendation = 'Mức tín hiệu tốt, kết quả đáng tin cậy.';
    } else if (snrAvg >= 18 && validCount >= 4) {
      status = 'ĐẠT';
      recommendation = 'Mức tín hiệu đạt yêu cầu.';
    } else {
      status = 'CHƯA ĐẠT';
      if (snrAvg < 18) {
        recommendation = 'Tăng volume / đưa mic gần loa 5–20cm / tắt noise suppression.';
      } else if (validCount < 4) {
        recommendation = 'Có thể nghe lẫn 2 loa / dội nhiều / test lại từng loa.';
      } else {
        recommendation = 'Kiểm tra lại kết nối và môi trường.';
      }
    }

    const report: BandReport = {
      band,
      polarity,
      votePlus,
      voteMinus,
      validCount,
      snrAvg,
      rmsAvgDbfs,
      confidenceAvg,
      recommendation,
      status,
    };

    if (this.callbacks.onBandReport) {
      this.callbacks.onBandReport(report);
    }

    return report;
  }

  /**
   * Monitor signal strength
   */
  private monitorSignalStrength(): void {
    if (!this.analyser) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const checkStrength = () => {
      if (!this.analyser) return;

      this.analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += (dataArray[i] / 255) ** 2;
      }
      const rms = Math.sqrt(sum / bufferLength);

      let strength: SignalStrength = 'Low';
      if (rms > 0.3) {
        strength = 'High';
      } else if (rms > 0.1) {
        strength = 'Good';
      }

      if (this.callbacks.onSignalStrengthChange) {
        this.callbacks.onSignalStrengthChange(strength);
      }

      requestAnimationFrame(checkStrength);
    };

    checkStrength();
  }

  /**
   * Push log
   */
  private pushLog(message: string): void {
    const timestamp = new Date().toLocaleTimeString();
    const logLine = `[${timestamp}] ${message}`;
    this.logBuffer.push(logLine);

    if (this.logBuffer.length > this.MAX_LOG_LINES) {
      this.logBuffer.shift();
    }

    if (this.callbacks.onLog) {
      this.callbacks.onLog(logLine);
    }
  }

  getLogs(): string[] {
    return [...this.logBuffer];
  }

  isMicRunning(): boolean {
    return this.micStream !== null && this.micStream.active;
  }

  isOutputEnabled(): boolean {
    return this.isTestOutputEnabled;
  }

  /**
   * Check if Bluetooth mode is enabled
   */
  isBluetoothMode(): boolean {
    return this.bluetoothMode;
  }

  dispose(): void {
    this.stopMic();
    if (this.audioContext) {
      this.audioContext.close().catch(console.error);
      this.audioContext = null;
    }
  }
}
