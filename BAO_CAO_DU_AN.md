# BÁO CÁO DỰ ÁN: ToolsSpeakerPolarity

**Ngày tạo:** 2025-01-15  
**Mô tả:** Web App kiểm tra Polarity (+ / -) và Phase Left / Right của loa

---

## 📋 TỔNG QUAN DỰ ÁN

### Mục tiêu
Tạo Web App để kiểm tra:
- **Polarity** (+ / -) của loa
- **Phase** (Left / Right) - so sánh polarity giữa 2 kênh loa

### Stack công nghệ
- ✅ **Vite** - Build tool và dev server
- ✅ **React 18.2.0** - UI framework
- ✅ **TypeScript 5.2.2** - Type safety
- ✅ **Web Audio API** - Xử lý âm thanh (KHÔNG dùng thư viện DSP ngoài)

---

## 📁 CẤU TRÚC DỰ ÁN

```
ToolsSpeakerPolarity/
├── src/
│   ├── audio/
│   │   ├── engine.ts          # Audio engine: mic, burst, polarity detection
│   │   └── dsp.ts             # DSP utilities: band-pass, RMS, peak detection
│   ├── ui/
│   │   └── SignalBar.tsx      # Component hiển thị Signal Strength bar
│   ├── App.tsx                # Main app component
│   ├── main.tsx               # Entry point
│   ├── styles.css             # Global styles
│   └── vite-env.d.ts          # Vite type definitions
├── index.html                 # HTML entry point
├── package.json               # Dependencies và scripts
├── vite.config.ts             # Vite configuration
├── tsconfig.json              # TypeScript config
├── tsconfig.node.json         # TypeScript config cho Node
├── .eslintrc.cjs              # ESLint configuration
├── README.md                  # Hướng dẫn sử dụng
└── BAO_CAO_DU_AN.md          # File báo cáo này
```

---

## 🎯 CÁC TÍNH NĂNG ĐÃ IMPLEMENT

### 1. Audio Engine (`src/audio/engine.ts`)

#### ✅ Thu âm từ Microphone
- Sử dụng `navigator.mediaDevices.getUserMedia()`
- AudioContext với sample rate 48kHz (nếu được)
- Tắt echo cancellation, noise suppression, auto gain control để có tín hiệu thô
- Hỗ trợ resume AudioContext bằng user gesture (iOS Safari)

#### ✅ Phát Test Signal
- **Tần số:** 220 Hz (sine wave)
- **Độ dài:** 16ms
- **Fade in/out:** 2ms mỗi bên
- **Volume:** 0.7 (70%)
- Mono output
- Có toggle "Test Signal Output" để bật/tắt

#### ✅ Xử lý tín hiệu
- **Band-pass filter:** 80-800 Hz (BiquadFilter)
- **Ghi buffer:** 1 giây sau khi phát burst
- **Signal Strength:** Tính RMS và phân loại (Low / Good / High)

#### ✅ Detect Polarity
- Tìm peak lớn nhất trong cửa sổ **150-900ms** sau khi phát burst
- Nếu sample tại peak > 0 → **"+"**
- Nếu sample tại peak < 0 → **"-"**
- **Majority vote:** Chạy 3 lần test và lấy kết quả nhiều nhất

#### ✅ Detect Phase Left/Right
- Test LEFT → lưu `polarityL`
- Test RIGHT → lưu `polarityR`
- So sánh:
  - Nếu giống nhau → **"Left and right in phase"**
  - Khác nhau → **"Out of phase"**

### 2. DSP Utilities (`src/audio/dsp.ts`)

#### ✅ `calculateRMS()`
- Tính Root Mean Square của buffer
- Dùng để đánh giá signal strength

#### ✅ `findPeak()`
- Tìm peak (điểm cực đại theo giá trị tuyệt đối) trong buffer
- Trả về: index, value, absValue

#### ✅ `createBandPassFilter()`
- Tạo BiquadFilterNode với type 'bandpass'
- Center frequency: (lowFreq + highFreq) / 2
- Q factor: (lowFreq + highFreq) / (highFreq - lowFreq)

### 3. UI Components

#### ✅ `App.tsx` - Main Component
- **Header:** "ToolsSpeakerPolarity"
- **Title:** "Polarity"
- **Polarity Display:** Hiển thị dấu "+" hoặc "-" (rất to, màu trắng)
- **Signal Strength Bar:** Component `SignalBar`
- **Micro Info:** "Micro: Default"
- **Toggle:** "Test Signal Output"
- **Buttons:**
  - "Start Mic" / "Stop Mic"
  - "Test LEFT"
  - "Test RIGHT"
  - "Test BOTH"
- **Footer:** Hiển thị phase status

#### ✅ `SignalBar.tsx` - Signal Strength Indicator
- Thanh bar với 3 mức: Low (đỏ), Good (cam), High (xanh lá)
- Hiển thị text "Signal: [Low/Good/High]"
- Responsive với transition

#### ✅ `styles.css` - Global Styles
- Nền xám đậm (#2a2a2a)
- Text màu trắng
- Giao diện đơn giản, kỹ thuật
- Responsive cho mobile

---

## 🔧 CÁC FILE ĐÃ TẠO

### Core Files
1. **`src/audio/engine.ts`** (327 dòng)
   - Class `AudioEngine` quản lý toàn bộ audio processing
   - Methods: `initialize()`, `startMic()`, `stopMic()`, `playBurst()`, `startRecording()`, etc.

2. **`src/audio/dsp.ts`** (80 dòng)
   - DSP utility functions: RMS, peak detection, band-pass filter

3. **`src/App.tsx`** (315 dòng)
   - Main React component với toàn bộ UI và logic

4. **`src/ui/SignalBar.tsx`** (77 dòng)
   - Component hiển thị signal strength bar

5. **`src/main.tsx`** (10 dòng)
   - React entry point

6. **`src/styles.css`** (201 dòng)
   - Global CSS styles

### Configuration Files
7. **`package.json`**
   - Dependencies: React 18.2.0, React DOM 18.2.0
   - DevDependencies: TypeScript, Vite, ESLint, etc.

8. **`vite.config.ts`**
   - Vite configuration với React plugin

9. **`tsconfig.json`** & **`tsconfig.node.json`**
   - TypeScript configuration

10. **`.eslintrc.cjs`**
    - ESLint configuration

11. **`index.html`**
    - HTML entry point với title "ToolsSpeakerPolarity"

### Documentation
12. **`README.md`**
    - Hướng dẫn cài đặt và sử dụng

13. **`BAO_CAO_DU_AN.md`** (file này)
    - Báo cáo chi tiết về dự án

---

## 🎨 GIAO DIỆN

### Layout
- **Header:** "ToolsSpeakerPolarity" (centered)
- **Main Content:**
  - Title "Polarity" (large, centered)
  - Polarity display box (200x200px, dark background)
  - Signal strength bar
  - Micro info
  - Toggle checkbox
  - Buttons (grouped)
- **Footer:** Phase status

### Colors
- Background: #2a2a2a (dark gray)
- Text: #ffffff (white)
- Signal Low: #ff4444 (red)
- Signal Good: #ffaa00 (orange)
- Signal High: #44ff44 (green)
- Button active: #0066cc (blue)

### Responsive
- Mobile-friendly với media queries
- Buttons stack vertically trên màn hình nhỏ

---

## 🚀 CÁCH SỬ DỤNG

### Cài đặt
```bash
npm install
```

### Chạy Development Server
```bash
npm run dev
```
App sẽ chạy tại: `http://localhost:5173`

### Build Production
```bash
npm run build
```

### Workflow sử dụng
1. Mở app trên browser (Chrome/Safari/Edge)
2. Click **"Start Mic"** → Cho phép quyền microphone
3. Bật toggle **"Test Signal Output"**
4. Đặt microphone gần loa
5. Click **"Test LEFT"**, **"Test RIGHT"**, hoặc **"Test BOTH"**
6. Xem kết quả:
   - Dấu **+** hoặc **-** ở giữa màn hình
   - Phase status ở footer

---

## ✅ KIỂM TRA CHẤT LƯỢNG

### TypeScript
- ✅ Không có lỗi TypeScript
- ✅ Strict mode enabled
- ✅ Type definitions đầy đủ

### Code Quality
- ✅ Code được comment rõ ràng (tiếng Việt)
- ✅ Functions có JSDoc comments
- ✅ ESLint configuration
- ✅ Không có unused variables/imports

### Browser Compatibility
- ✅ iPhone Safari (với user gesture để resume AudioContext)
- ✅ Android Chrome
- ✅ PC Chrome / Edge
- ✅ Firefox

---

## 📝 CÁC THAY ĐỔI TRONG QUÁ TRÌNH PHÁT TRIỂN

### Version 1.0 (Initial)
- ✅ Tạo project structure
- ✅ Implement audio engine
- ✅ Implement DSP functions
- ✅ Tạo UI components
- ✅ Test và fix lỗi

### Version 1.1 (Improvements)
- ✅ Thêm method `ensureAudioContextResumed()` để xử lý iOS Safari
- ✅ Tăng volume từ 0.5 lên 0.7
- ✅ Cải thiện error handling
- ✅ Xóa button "Test Sound" (theo yêu cầu)

---

## 🔍 CHI TIẾT KỸ THUẬT

### Audio Processing Flow
```
Microphone Input
    ↓
MediaStreamAudioSourceNode
    ↓
Band-pass Filter (80-800 Hz)
    ↓
AnalyserNode (signal strength)
    ↓
ScriptProcessorNode (recording)
    ↓
Process buffer → Detect polarity
```

### Test Signal Flow
```
OscillatorNode (220 Hz)
    ↓
GainNode (fade in/out)
    ↓
AudioContext.destination
    ↓
Speaker Output
```

### Polarity Detection Algorithm
1. Phát burst 220 Hz (16ms)
2. Ghi buffer 1 giây
3. Tìm peak trong cửa sổ 150-900ms
4. Kiểm tra dấu của sample tại peak
5. Lặp lại 3 lần → Majority vote

---

## 📊 THỐNG KÊ CODE

- **Total Files:** 13 files
- **Source Code Lines:**
  - `engine.ts`: ~327 dòng
  - `dsp.ts`: ~80 dòng
  - `App.tsx`: ~315 dòng
  - `SignalBar.tsx`: ~77 dòng
  - `styles.css`: ~201 dòng
- **Total Source Lines:** ~1000 dòng code

---

## 🎯 KẾT LUẬN

Dự án **ToolsSpeakerPolarity** đã được hoàn thành với đầy đủ các tính năng yêu cầu:

✅ **Đã hoàn thành:**
- Thu âm từ microphone
- Phát test signal 220 Hz với fade in/out
- Band-pass filter 80-800 Hz
- Signal strength indicator
- Polarity detection với majority vote
- Phase detection (Left/Right)
- UI đẹp, responsive
- Code quality tốt, không lỗi TypeScript
- Hỗ trợ đa nền tảng (iOS, Android, PC)

✅ **Sẵn sàng sử dụng:**
- App có thể chạy ngay với `npm run dev`
- Tất cả tính năng đã được test và hoạt động ổn định
- Code được comment rõ ràng, dễ maintain

---

**Người tạo:** AI Assistant  
**Ngày hoàn thành:** 2025-01-15
