# CHECKLIST KIỂM TRA TRƯỚC KHI DEPLOY LÊN VERCEL

## ✅ ĐÃ KIỂM TRA

### 1. Code Quality
- ✅ Không có lỗi TypeScript
- ✅ Không có lỗi linter
- ✅ Không còn code Bluetooth trong UI (đã xóa)

### 2. Logic Cải Thiện
- ✅ **Polarity Detection:** Tìm peak thực sự trong ±20ms quanh arrival (chính xác hơn)
- ✅ **Signal Window:** Giảm từ 80ms → 25ms (tránh echo/reverb)
- ✅ **Noise Window:** Dynamic, đảm bảo ít nhất 100ms trước arrival
- ✅ **Correlation Threshold:** Tăng từ 0.3 → 0.35 (giảm false positive)

### 3. Files Quan Trọng
- ✅ `vercel.json` - Có rewrites cho SPA routing
- ✅ `index.html` - Có đầy đủ icon links và manifest
- ✅ `public/manifest.webmanifest` - PWA manifest
- ✅ `public/icon-*.png` - Icons cho PWA
- ✅ `.gitignore` - Đã ignore node_modules, dist, .env, .vercel

### 4. UI/UX
- ✅ Không còn nút Bluetooth
- ✅ Status info chỉ hiển thị Mic và Output
- ✅ Báo cáo và khuyến nghị hiển thị đúng

## 📋 CÁC THAY ĐỔI CHÍNH

### Logic Engine (`src/audio/engine.ts`)
1. **Tìm peak thực sự:**
   ```typescript
   // Tìm peak trong ±20ms quanh arrival
   const peakSearchWindowSamples = Math.floor((this.PEAK_SEARCH_WINDOW_MS / 1000) * sampleRate);
   // Detect polarity từ peak thực sự
   const sign: '+' | '-' = peakValue > 0 ? '+' : '-';
   ```

2. **Signal window ngắn hơn:**
   ```typescript
   private readonly SIGNAL_WINDOW_MS = 25; // Giảm từ 80ms
   ```

3. **Noise window cải thiện:**
   ```typescript
   const noiseWindowMs = Math.min(100, (arrivalIndex / sampleRate) * 1000);
   ```

4. **Correlation threshold cao hơn:**
   ```typescript
   if (correlationPeak < 0.35) { // Tăng từ 0.3
   ```

### UI (`src/App.tsx`)
- ✅ Đã xóa toàn bộ Bluetooth feature
- ✅ Không còn state `bluetoothMode`, `showBluetoothSection`
- ✅ Không còn function `handleToggleBluetoothMode`
- ✅ Không còn nút Bluetooth và section Bluetooth

## 🚀 DEPLOY STEPS

1. **Commit changes:**
   ```bash
   git add .
   git commit -m "Improve polarity detection accuracy + remove Bluetooth feature"
   ```

2. **Push to GitHub:**
   ```bash
   git push
   ```

3. **Vercel sẽ tự động deploy** (nếu đã connect GitHub)

   Hoặc deploy thủ công:
   ```bash
   npx vercel --prod
   ```

## 🧪 TEST SAU KHI DEPLOY

1. **Test trên iPhone Safari:**
   - Mở https://tools-speaker-polarity.vercel.app
   - Bật Mic và Output
   - Test LOW/MID/HI
   - Kiểm tra độ chính xác: 5/5 pulses phải cho cùng kết quả

2. **Test Add to Home Screen:**
   - Share → Add to Home Screen
   - Icon hiển thị đúng
   - App chạy như native app

3. **Test SPA Routing:**
   - Refresh trang không bị 404
   - Direct URL access hoạt động

## ⚠️ LƯU Ý

- Console logs vẫn còn (để debug) - có thể xóa sau nếu cần
- Logic Bluetooth trong `engine.ts` vẫn còn nhưng không được gọi (không ảnh hưởng)
- Styles Bluetooth trong `styles.css` vẫn còn nhưng không được dùng

---

**Sẵn sàng deploy! ✅**
