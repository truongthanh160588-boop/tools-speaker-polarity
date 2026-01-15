# BÁO CÁO DỰ ÁN: ToolsSpeakerPolarity
## Phần Đo và Khuyến Nghị

---

## 1. TỔNG QUAN DỰ ÁN

**Tên dự án:** ToolsSpeakerPolarity  
**Mục đích:** Web App kiểm tra Polarity (+/-) và Phase Left/Right của loa  
**Công nghệ:** Vite + React + TypeScript + Web Audio API  
**Phiên bản:** 2.0

---

## 2. HỆ THỐNG ĐO 3 BAND (LOW/MID/HI)

### 2.1. Cấu hình các Band

| Band | Tần số | Độ dài Pulse | Khoảng cách Pulse |
|------|--------|--------------|-------------------|
| **LOW** | 30–120 Hz | 40 ms | 360 ms |
| **MID** | 90 Hz–2 kHz | 16 ms | 184 ms |
| **HI** | 2 kHz–16 kHz | 30 ms | 280 ms |

### 2.2. Quy trình đo

1. **Phát tín hiệu test:**
   - Mỗi band phát **5 pulses** (chirp - tần số quét tuyến tính)
   - Tín hiệu được band-pass filter theo từng band
   - Fade in/out để tránh click

2. **Thu và xử lý:**
   - Ghi âm từ microphone (sample rate: 48 kHz)
   - Áp dụng band-pass filter tương ứng
   - Thời gian ghi: **1.2 giây** (bình thường) / **2.5 giây** (Bluetooth mode)

3. **Phát hiện polarity:**
   - Sử dụng **cross-correlation** (matched filter) để tìm direct arrival
   - Tìm peak trong cửa sổ tìm kiếm:
     - Bình thường: 150–1500 ms
     - Bluetooth LOW: 150–2200 ms
     - Bluetooth MID/HI: 150–1800 ms
   - Xác định dấu (+/-) từ giá trị peak

4. **Tính toán thông số:**
   - **SNR (Signal-to-Noise Ratio):** `peakAbs / noiseRms` (dB)
   - **Confidence:** `clamp((snrDb - 10) / 20, 0..1) * 100` (%)
   - **RMS Level:** dBFS
   - **Gate:** Nếu `snrDb < 14` hoặc `correlationPeak < 0.3` → invalid

5. **Vote và kết luận:**
   - Mỗi pulse cho kết quả: `+`, `-`, hoặc `—` (invalid)
   - Majority vote từ 5 pulses
   - Nếu `validCount >= 4/5` → có kết luận polarity

---

## 3. HỆ THỐNG KHUYẾN NGHỊ

### 3.1. Đánh giá Status

| Status | Điều kiện | Mô tả |
|--------|-----------|-------|
| **TỐT** | `SNR >= 24 dB` và `validCount >= 5/5` | Tín hiệu rất tốt, kết quả đáng tin cậy |
| **ĐẠT** | `SNR >= 18 dB` và `validCount >= 4/5` | Tín hiệu đạt yêu cầu |
| **CHƯA ĐẠT** | Còn lại | Tín hiệu yếu hoặc không đủ valid pulses |

### 3.2. Khuyến nghị theo Status

#### Status: TỐT
```
"Mức tín hiệu tốt, kết quả đáng tin cậy."
```

#### Status: ĐẠT
```
"Mức tín hiệu đạt yêu cầu."
```

#### Status: CHƯA ĐẠT
- Nếu `SNR < 18 dB`:
  ```
  "Tăng volume / đưa mic gần loa 5–20cm / tắt noise suppression."
  ```
- Nếu `validCount < 4/5`:
  ```
  "Có thể nghe lẫn 2 loa / dội nhiều / test lại từng loa."
  ```
- Còn lại:
  ```
  "Kiểm tra lại kết nối và môi trường."
  ```

---

## 4. BÁO CÁO CHI TIẾT

### 4.1. Thông tin trong báo cáo

Mỗi band sau khi đo xong sẽ có báo cáo với các thông tin:

1. **Band:** LOW / MID / HI
2. **Polarity:** `+` (dương) / `-` (âm) / `—` (không xác định)
3. **Vote:** `+X/-Y (Z/5)` - số lần vote dương/âm và số pulse hợp lệ
4. **Confidence:** 0–100% - độ tin cậy của kết quả
5. **SNR:** dB - tỷ số tín hiệu/nhiễu
6. **Level:** dBFS - mức tín hiệu
7. **Status:** TỐT / ĐẠT / CHƯA ĐẠT

### 4.2. Hiển thị UI

- **Bảng báo cáo:** Hiển thị khi có ít nhất 1 band đã đo
- **Box khuyến nghị:** Luôn hiển thị 3 dòng (LOW, MID, HI)
  - Nếu chưa đo: "Chưa đo."
  - Nếu đã đo: Hiển thị khuyến nghị tương ứng

---

## 5. CÁC TÍNH NĂNG ĐẶC BIỆT

### 5.1. Bluetooth Mode

- **Chế độ chịu trễ cao:** Dành cho kết nối Bluetooth/AirPlay
- **Thay đổi:**
  - Thời gian ghi: 1.2s → 2.5s
  - Cửa sổ tìm kiếm: Mở rộng (LOW: 2200ms, MID/HI: 1800ms)
- **Lưu ý:** Bluetooth chỉ làm trễ, không làm sai cực tính

### 5.2. Cross-Correlation (Matched Filter)

- Sử dụng để tìm direct arrival trong môi trường có echo/reverb
- Độ chính xác cao ngay cả khi đứng xa 1–2m
- Reference signal: Chirp (tần số quét tuyến tính)

### 5.3. Gate và Confidence

- **Gate:** Lọc bỏ các pulse không đủ tín hiệu
- **Confidence:** Tính từ SNR, giúp đánh giá độ tin cậy
- **Cảnh báo:** Nếu confidence < 40% → hiển thị cảnh báo

---

## 6. CẤU TRÚC CODE

### 6.1. File chính

- `src/App.tsx`: UI chính, quản lý state và hiển thị báo cáo
- `src/audio/engine.ts`: Logic đo và tính toán
- `src/audio/dsp.ts`: Các hàm DSP (cross-correlation, RMS, peak detection)
- `src/styles.css`: Styling

### 6.2. Interface và Types

```typescript
interface BandReport {
  band: BandTest;              // 'LOW' | 'MID' | 'HI'
  polarity: '+' | '-' | '—';   // Kết quả polarity
  votePlus: number;             // Số lần vote dương
  voteMinus: number;            // Số lần vote âm
  validCount: number;           // Số pulse hợp lệ (0-5)
  snrAvg: number;               // SNR trung bình (dB)
  rmsAvgDbfs: number;           // Level trung bình (dBFS)
  confidenceAvg: number;        // Confidence trung bình (0-100)
  recommendation: string;        // Khuyến nghị
  status: 'TỐT' | 'ĐẠT' | 'CHƯA ĐẠT';
}
```

---

## 7. CÁCH SỬ DỤNG

1. **Bật microphone:** Click "Start Mic"
2. **Bật test output:** Check "Tự phát tiếng kiểm tra (POP)"
3. **Chạy test:** Click các nút "Kiểm tra LOW/MID/HI"
4. **Xem kết quả:**
   - Bảng báo cáo chi tiết (nếu có band đã đo)
   - Box khuyến nghị (luôn hiển thị 3 dòng)

---

## 8. THÔNG SỐ KỸ THUẬT

- **Sample Rate:** 48 kHz
- **Số pulses mỗi test:** 5
- **Thời gian ghi:** 1.2s (bình thường) / 2.5s (Bluetooth)
- **Gate threshold:** SNR < 14 dB hoặc correlation peak < 0.3
- **Status thresholds:**
  - TỐT: SNR >= 24 dB, valid >= 5/5
  - ĐẠT: SNR >= 18 dB, valid >= 4/5
  - CHƯA ĐẠT: Còn lại

---

## 9. GHI CHÚ

- App hoạt động tốt trên iPhone Safari, Android Chrome, PC Chrome/Edge
- Cần quyền truy cập microphone
- Có thể đo chính xác từ khoảng cách 1–2m nhờ cross-correlation
- Bluetooth mode hỗ trợ kết nối không dây với độ trễ cao

---

**Ngày tạo báo cáo:** 15/01/2026  
**Phiên bản:** 2.0
