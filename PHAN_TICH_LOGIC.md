# PHÂN TÍCH LOGIC PHÁT/THU VÀ VẤN ĐỀ ĐỘ CHÍNH XÁC

## 🔍 CÁC VẤN ĐỀ PHÁT HIỆN

### 1. **VẤN ĐỀ: Polarity Detection không chính xác**

**Vị trí:** `src/audio/engine.ts:414`
```typescript
const sign: '+' | '-' = corrResult.peakValue > 0 ? '+' : '-';
```

**Vấn đề:**
- `peakValue` được lấy từ `rec[peakIdx]` với `peakIdx = bestLag + Math.floor(ref.length / 2)`
- Điều này **KHÔNG chính xác** vì:
  - `bestLag` là vị trí bắt đầu của correlation match
  - `ref.length / 2` là giữa reference signal, không phải vị trí peak thực sự
  - Nên tìm **peak thực sự** trong recorded signal tại vùng arrival

**Giải pháp:**
- Sau khi tìm được `arrivalIndex` từ correlation, tìm peak thực sự trong recorded signal
- Tìm trong cửa sổ nhỏ (ví dụ: ±10ms) quanh `arrivalIndex`
- Lấy dấu từ peak thực sự đó

---

### 2. **VẤN ĐỀ: Signal Window quá dài**

**Vị trí:** `src/audio/engine.ts:74, 387-395`
```typescript
private readonly SIGNAL_WINDOW_MS = 80; // 80ms sau arrival
```

**Vấn đề:**
- 80ms quá dài, có thể bao gồm echo/reverb
- Nên chỉ tính trong khoảng ngắn hơn (20-30ms) để lấy direct arrival

**Giải pháp:**
- Giảm `SIGNAL_WINDOW_MS` xuống 20-30ms
- Hoặc tìm peak trong cửa sổ nhỏ quanh arrival, rồi tính RMS trong cửa sổ nhỏ hơn

---

### 3. **VẤN ĐỀ: Noise Window có thể không đủ**

**Vị trí:** `src/audio/engine.ts:73, 378-384`
```typescript
private readonly NOISE_WINDOW_END = 0.120; // 120ms
const noiseEndSample = Math.min(Math.floor(this.NOISE_WINDOW_END * sampleRate), arrivalIndex);
```

**Vấn đề:**
- Nếu arrival sớm (< 120ms), noise window bị cắt ngắn
- Nếu arrival muộn, noise window có thể bao gồm cả signal

**Giải pháp:**
- Đảm bảo noise window luôn đủ dài (ít nhất 50-100ms)
- Nếu `arrivalIndex < 150ms`, dùng toàn bộ từ 0 đến arrivalIndex
- Nếu `arrivalIndex >= 150ms`, dùng 100ms trước arrivalIndex

---

### 4. **VẤN ĐỀ: Correlation threshold có thể không phù hợp**

**Vị trí:** `src/audio/engine.ts:366`
```typescript
if (correlationPeak < 0.3) {
  // Invalid
}
```

**Vấn đề:**
- Threshold 0.3 có thể quá thấp (dễ false positive) hoặc quá cao (bỏ sót signal yếu)
- Nên điều chỉnh dựa trên thực tế

**Giải pháp:**
- Thử giảm xuống 0.2 hoặc tăng lên 0.4
- Hoặc kết hợp với SNR threshold

---

### 5. **VẤN ĐỀ: Timing synchronization**

**Vị trí:** `src/audio/engine.ts:476-482`
```typescript
const recordingPromise = this.recordPulse();
await new Promise((resolve) => setTimeout(resolve, 50));
await this.playPulse(band);
```

**Vấn đề:**
- `setTimeout(50ms)` không chính xác, có thể bị delay
- Recording bắt đầu trước khi phát, nhưng không có cách nào biết chính xác khi nào phát

**Giải pháp:**
- Có thể cải thiện bằng cách dùng `audioContext.currentTime` để sync chính xác hơn
- Hoặc phát trước, rồi bắt đầu ghi ngay sau đó

---

## ✅ ĐỀ XUẤT SỬA CHỮA

### Sửa 1: Tìm peak thực sự để detect polarity

```typescript
// Sau khi tìm được arrivalIndex từ correlation
// Tìm peak thực sự trong cửa sổ nhỏ quanh arrival
const searchWindowMs = 20; // ±20ms
const searchStart = Math.max(0, arrivalIndex - Math.floor(searchWindowMs * sampleRate / 1000));
const searchEnd = Math.min(recorded.length, arrivalIndex + Math.floor(searchWindowMs * sampleRate / 1000));

let peakValue = 0;
let peakIndex = arrivalIndex;
for (let i = searchStart; i < searchEnd; i++) {
  if (Math.abs(recorded[i]) > Math.abs(peakValue)) {
    peakValue = recorded[i];
    peakIndex = i;
  }
}

// Detect polarity từ peak thực sự
const sign: '+' | '-' = peakValue > 0 ? '+' : '-';
```

### Sửa 2: Giảm Signal Window

```typescript
private readonly SIGNAL_WINDOW_MS = 25; // Giảm từ 80ms xuống 25ms
```

### Sửa 3: Cải thiện Noise Window

```typescript
// Đảm bảo noise window đủ dài
const noiseWindowMs = Math.min(100, arrivalIndex / sampleRate * 1000);
const noiseStartSample = Math.max(0, arrivalIndex - Math.floor(noiseWindowMs * sampleRate / 1000));
const noiseRms = calculateRmsRange(recorded, noiseStartSample, arrivalIndex);
```

### Sửa 4: Tăng Correlation Threshold

```typescript
if (correlationPeak < 0.4) { // Tăng từ 0.3 lên 0.4
  // Invalid
}
```

---

## 📊 THỨ TỰ ƯU TIÊN SỬA

1. **QUAN TRỌNG NHẤT:** Sửa 1 - Tìm peak thực sự để detect polarity
2. **QUAN TRỌNG:** Sửa 2 - Giảm Signal Window
3. **NÊN SỬA:** Sửa 3 - Cải thiện Noise Window
4. **CÓ THỂ THỬ:** Sửa 4 - Tăng Correlation Threshold

---

## 🧪 TEST SAU KHI SỬA

1. Test với loa đã biết polarity (dương/âm)
2. Kiểm tra độ chính xác: 5/5 pulses phải cho cùng kết quả
3. Test ở khoảng cách khác nhau (0.5m, 1m, 2m)
4. Test với volume khác nhau
