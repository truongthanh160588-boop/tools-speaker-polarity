# HƯỚNG DẪN DEPLOY LÊN VERCEL

## BƯỚC 1: TẠO REPO GITHUB

### Nếu chưa có repo trên GitHub:

1. Truy cập: https://github.com/new
2. Tạo repo mới:
   - **Repository name:** `tools-speaker-polarity`
   - **Visibility:** Public hoặc Private (tùy chọn)
   - **KHÔNG** check "Initialize this repository with a README"
3. Click "Create repository"

### Sau khi tạo repo, chạy các lệnh sau trong terminal:

```bash
cd /Users/truongthanh/Desktop/ToolsSpeakerPolarity

# Kiểm tra git đã được khởi tạo chưa
git status

# Nếu chưa có git, chạy:
git init
git add .
git commit -m "Initial commit ToolsSpeakerPolarity"
git branch -M main

# Thêm remote (thay <USERNAME> bằng username GitHub của bạn)
git remote add origin https://github.com/<USERNAME>/tools-speaker-polarity.git

# Push lên GitHub
git push -u origin main
```

**Lưu ý:** Thay `<USERNAME>` bằng username GitHub thực tế của bạn.

---

## BƯỚC 2: CONNECT GIT REPOSITORY TRÊN VERCEL

1. Đăng nhập vào Vercel: https://vercel.com
2. Click **"Add New"** → **"Project"**
3. Chọn **"Import Git Repository"**
4. Tìm và chọn repo: **`tools-speaker-polarity`**
5. Vercel sẽ tự nhận:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
6. Click **"Deploy"**
7. Đợi ~30–60 giây để build xong

---

## BƯỚC 3: KIỂM TRA BUILD SETTING

Sau khi deploy xong:

1. Vào project vừa tạo trên Vercel
2. Click **"Settings"** → **"General"**
3. Kiểm tra đúng các setting:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
4. Nếu sai, sửa lại rồi click **"Redeploy"**

---

## BƯỚC 4: KIỂM TRA TRÊN ĐIỆN THOẠI

Sau khi deploy xong, bạn sẽ có link dạng:
```
https://tools-speaker-polarity.vercel.app
```

### Test trên iPhone:

1. Mở link trên iPhone Safari
2. Click **Share** (nút chia sẻ)
3. Chọn **"Add to Home Screen"**
4. Icon app sẽ hiển thị đúng (từ LOGO.png)
5. Mở app từ Home Screen và test chức năng

---

## TỰ ĐỘNG UPDATE

Sau khi setup xong, mỗi khi bạn:
- Push code lên GitHub (branch `main`)
- Vercel sẽ tự động build và deploy lại

---

## TROUBLESHOOTING

### Nếu build fail trên Vercel:

1. Kiểm tra **Build Logs** trong Vercel Dashboard
2. Đảm bảo:
   - `package.json` có đầy đủ dependencies
   - Build command: `npm run build`
   - Output directory: `dist`
3. Nếu vẫn lỗi, check console logs để xem lỗi cụ thể

### Nếu icon không hiển thị:

1. Đảm bảo các file icon đã được commit vào Git:
   - `public/icon-192.png`
   - `public/icon-512.png`
   - `public/apple-touch-icon.png`
   - `public/manifest.webmanifest`
2. Kiểm tra `index.html` có link đúng đến các file icon

---

**Chúc bạn deploy thành công! 🚀**
