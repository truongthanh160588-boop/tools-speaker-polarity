# ToolsSpeakerPolarity

Web App để kiểm tra Polarity (+ / -) và Phase Left / Right của loa, hoạt động tương tự app "Speaker Pop – Polarity" trên iPhone.

## Stack

- **Vite** - Build tool
- **React** - UI framework
- **TypeScript** - Type safety
- **Web Audio API** - Audio processing (không dùng thư viện DSP ngoài)

## Cài đặt

```bash
npm install
```

## Chạy Development Server

```bash
npm run dev
```

App sẽ chạy tại `http://localhost:5173`

## Build Production

```bash
npm run build
```

## Tính năng

- ✅ Thu âm từ microphone
- ✅ Phát test signal 220 Hz (16ms burst với fade in/out 2ms)
- ✅ Band-pass filter 80-800 Hz
- ✅ Hiển thị Signal Strength (Low / Good / High)
- ✅ Detect Polarity (+ / -) với majority vote (3 lần test)
- ✅ Detect Phase Left/Right (so sánh polarity của 2 kênh)
- ✅ Hỗ trợ iOS Safari (resume AudioContext bằng user gesture)

## Cách sử dụng

1. Click **"Start Mic"** để bật microphone
2. Bật **"Test Signal Output"** để cho phép phát test signal
3. Đặt microphone gần loa
4. Click **"Test LEFT"**, **"Test RIGHT"**, hoặc **"Test BOTH"** để kiểm tra
5. Kết quả sẽ hiển thị:
   - Dấu **+** hoặc **-** ở giữa màn hình
   - Status phase ở footer: "Left and right in phase" hoặc "Out of phase"

## Lưu ý

- Cần quyền truy cập microphone
- Test signal sẽ chỉ phát khi toggle "Test Signal Output" được bật
- Mỗi lần test sẽ chạy 3 lần và lấy kết quả majority vote
- Detection window: 150-900ms sau khi phát burst
