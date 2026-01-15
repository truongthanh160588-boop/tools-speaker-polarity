# HƯỚNG DẪN PUSH LÊN GITHUB VÀ DEPLOY VERCEL

## ✅ ĐÃ HOÀN THÀNH

1. ✅ Git repository đã được khởi tạo
2. ✅ Code đã được commit
3. ✅ File `vercel.json` đã được tạo (fix SPA routing)
4. ✅ Icons và manifest đã sẵn sàng
5. ✅ `.gitignore` đã được cập nhật

## 📋 BƯỚC TIẾP THEO

### BƯỚC 1: TẠO REPO TRÊN GITHUB

1. Truy cập: https://github.com/new
2. Tạo repo mới:
   - **Repository name:** `tools-speaker-polarity`
   - **Visibility:** Public hoặc Private
   - **KHÔNG** check "Initialize this repository with a README"
3. Click **"Create repository"**

### BƯỚC 2: PUSH CODE LÊN GITHUB

Sau khi tạo repo, chạy lệnh sau trong terminal:

```bash
cd /Users/truongthanh/Desktop/ToolsSpeakerPolarity

# Kiểm tra remote đã được thêm chưa
git remote -v

# Nếu chưa có, thêm remote:
git remote add origin https://github.com/TRUONGTHANH/tools-speaker-polarity.git

# Push lên GitHub
git push -u origin main
```

**Lưu ý:** Nếu repo trên GitHub chưa tồn tại, bạn cần tạo trước.

### BƯỚC 3: DEPLOY TRÊN VERCEL

1. Đăng nhập Vercel: https://vercel.com
2. Click **"Add New"** → **"Project"**
3. Chọn **"Import Git Repository"**
4. Tìm và chọn repo: **`tools-speaker-polarity`**
5. Vercel sẽ tự nhận:
   - **Framework Preset:** Vite ✅
   - **Build Command:** `npm run build` ✅
   - **Output Directory:** `dist` ✅
   - **Install Command:** `npm install` ✅
6. Click **"Deploy"**
7. Đợi ~30–60 giây

### BƯỚC 4: KIỂM TRA

Sau khi deploy xong:

1. **Link production:** `https://tools-speaker-polarity.vercel.app`
2. **Test trên iPhone:**
   - Mở link trên Safari
   - Share → Add to Home Screen
   - Icon sẽ hiển thị đúng (từ LOGO.png)
3. **Kiểm tra SPA routing:** Refresh trang không bị lỗi 404

## 🔧 CẤU HÌNH ĐÃ THIẾT LẬP

### vercel.json
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/"
    }
  ]
}
```
→ Fix SPA routing, tất cả routes đều trỏ về `/`

### Icons & Manifest
- ✅ `public/icon-192.png`
- ✅ `public/icon-512.png`
- ✅ `public/apple-touch-icon.png`
- ✅ `public/manifest.webmanifest`
- ✅ `index.html` đã có đầy đủ links

### .gitignore
- ✅ `node_modules`
- ✅ `dist`
- ✅ `.env`
- ✅ `.vercel`

## 🚀 TỰ ĐỘNG DEPLOY

Sau khi setup xong, mỗi khi bạn:
- Push code lên GitHub (branch `main`)
- Vercel sẽ tự động build và deploy lại

## ❓ TROUBLESHOOTING

### Nếu push bị lỗi "remote origin already exists":
```bash
git remote remove origin
git remote add origin https://github.com/TRUONGTHANH/tools-speaker-polarity.git
```

### Nếu build fail trên Vercel:
- Kiểm tra Build Logs trong Vercel Dashboard
- Đảm bảo: Build Command = `npm run build`, Output = `dist`

### Nếu icon không hiển thị:
- Đảm bảo các file trong `public/` đã được commit
- Kiểm tra `index.html` có link đúng

---

**Chúc bạn deploy thành công! 🎉**
