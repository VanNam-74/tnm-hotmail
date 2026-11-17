# TNM Hotmail UI — API cần làm thêm

Bản giao diện mới **không đổi** `src/lib/api.js` và `src/lib/auth.jsx`. Mọi màn hình chạy được ngay với backend hiện tại.
Các mục dưới đây là phần giao diện **đang tạm ẩn, tạm làm phía client, hoặc chỉ hiện khi backend trả thêm field**.
Mỗi mục có: chức năng, endpoint đề xuất, request/response, và chỗ cần nối trong frontend.

Tất cả đều là đề xuất, đặt tên theo cùng kiểu `/api/...` đang dùng; đổi tên tùy bạn.

---

## Ưu tiên cao

### 1. Thông báo (chuông ở Overview)
**Hiện tại:** nút chuông chỉ hiển thị, không có chấm báo, không mở được gì.
**Chức năng:** báo khi job Get Token / Import xong, khi máy khác pull dữ liệu qua Share, khi account đổi sang Suspended / Ter.

```
GET  /api/notifications?unread=1&limit=20
→ { "unread": 3, "data": [ { "id": 12, "kind": "run_done|import_done|share_pull|status_change",
      "title": "Run finished", "message": "8 ok · 1 failed", "created_at": "2026-11-17T09:12:05", "read": false } ] }

POST /api/notifications/read      body: { "ids": [12, 13] }   // hoặc { "all": true }
→ { "ok": true }
```
**Nối vào:** `Overview.jsx` (chỗ `TODO(API)`). Gọi lúc mở trang + polling khoảng 15–30s, hiện `.badge` khi `unread > 0`, mở `.tnm-menu` liệt kê.

### 2. Trạng thái Share server
**Hiện tại:** pill ở header Overview và trang Share chỉ hiện `IP : port` với chấm xám (không biết server có đang chạy không).
**Chức năng:** chấm xanh khi server Share đang lắng nghe, đỏ khi tắt / lỗi bind port; số key đang có máy kết nối.

```
GET /api/share/status
→ { "running": true, "url": "http://192.168.1.30:8790", "port": 8790,
    "active_keys": 2, "last_pull_at": "2026-11-17T09:20:11", "error": null }
```
**Nối vào:** `Overview.jsx` (Pill trong header), `Share.jsx` (Pill trong PageHead), `Settings.jsx` (ô thứ 3 trong `tnm-sysrow`, đổi "Share URL" thành "Share server · Running").

### 3. Export toàn bộ kết quả Filter
**Hiện tại:** nút **Export page** chỉ xuất 25 dòng đang hiển thị; bulk **Export** chỉ xuất các dòng đã chọn. Cả hai làm phía client.
**Chức năng:** xuất CSV toàn bộ kết quả theo bộ lọc đang áp (có thể hàng nghìn dòng).

```
POST /api/filter/export          body: giống /api/filter/search (emails, account_ids, status, date_range)
→ text/csv (Content-Disposition: attachment; filename="tnm-accounts.csv")
```
**Nối vào:** `Filter.jsx` → thêm `api.filterExport(payload)` (fetch → blob → download), đổi nút "Export page" thành "Export CSV".

---

## Ưu tiên trung bình

### 4. Thêm field cho key đã cấp (Share → Issued keys)
**Hiện tại:** thẻ key hiện tên, số account, trạng thái. Code **đã sẵn** chỗ hiện `Created_at` và `Last_pull_at`, sẽ tự hiện khi backend trả về.
**Chức năng:** biết key tạo lúc nào, máy nhận pull lần cuối khi nào, đã pull bao nhiêu lần.

```
GET /api/share/list   (mở rộng response hiện có, không đổi field cũ)
→ { "data": [ { "Key": "...", "Label": "PC-02", "Allowed_emails": [...], "Revoked": false,
                "Created_at": "2026-11-17T09:20:00", "Last_pull_at": "2026-11-17T09:41:02", "Pull_count": 4 } ] }
```
**Nối vào:** không cần sửa frontend cho 2 field đầu; `Pull_count` thêm vào `tnm-meta` trong `KeyCard` (Share.jsx).

### 5. Re-check account đã chọn (bulk action trong Filter)
**Hiện tại:** thanh bulk có Share / Export / Clear. Chưa có Re-check.
**Chức năng:** đọc lại mail + phân loại lại KDP cho các account đã chọn mà không phải chạy cả lô Get Token.

```
POST /api/gettoken/recheck        body: { "ids": [73833, 73829] }
→ { "ok": true, "message": "Queued 2 accounts" }
// tiến trình dùng lại GET /api/gettoken/progress
```
**Nối vào:** `Filter.jsx` → thêm nút `Re-check` (variant `invert`) vào `.tnm-bulkbar`, gọi xong thì `toast.info` + chuyển sang `/app/gettoken` để xem tiến trình.

### 6. Lịch sử / lần chạy cuối của Get Token
**Hiện tại:** Run panel hiện tiến trình job hiện tại + OK / Failed của job gần nhất; log chỉ tồn tại trong phiên (mất khi rời trang).
**Chức năng:** hiện "Last run 09:12 · 8 ok · 1 failed" và log của lần chạy gần nhất kể cả sau khi mở lại app.

```
GET /api/gettoken/history?limit=10
→ { "data": [ { "kind": "run|import", "started_at": "...", "finished_at": "...",
                "total": 9, "ok": 8, "failed": 1, "errors": ["..."] } ] }

// hoặc gọn hơn: thêm vào /api/gettoken/progress
→ { ..., "started_at": "...", "finished_at": "...", "log": ["09:12:04 Imported 1 row", "..."] }
```
**Nối vào:** `GetToken.jsx` → ô thứ 2 trong `tnm-kv` đổi thành "Last run"; khởi tạo `log` từ response thay vì mảng rỗng.

### 7. Dừng job đang chạy
**Hiện tại:** khi Run đang chạy chỉ có thể chờ.
**Chức năng:** nút **Stop** trong Run panel thay cho nút Run khi `running = true`.

```
POST /api/gettoken/stop    → { "ok": true, "message": "Stopping after current account" }
POST /api/gettoken/import/stop  (tùy chọn)
```
**Nối vào:** `GetToken.jsx` → khi `prog.running` hiển thị `<Button variant="invert" icon="x">Stop</Button>`.

---

## Ưu tiên thấp

### 8. Khởi động lại server sau khi đổi port
**Hiện tại:** đổi UI port / Share port → toast nhắc "needs a restart"; người dùng tự khởi động lại app.
```
POST /api/server/restart   body: { "target": "ui|share" }   → { "ok": true }
```
**Nối vào:** `Settings.jsx` → sau khi lưu port, toast kèm nút "Restart now"; với UI port thì sau restart chuyển `window.location` sang port mới.

### 9. Kiểm tra kết nối eOffice
**Chức năng:** nút **Test** cạnh ô Host trong Settings, giống nút Test ở Share → Receive.
```
POST /api/settings/test-eoffice   body: { "host": "http://192.168.1.91", "timeout": 30 }
→ { "ok": true, "latency_ms": 42, "message": "Connected" }
```
**Nối vào:** `Settings.jsx` → section eOffice.

### 10. Thống kê Overview gọn trong 1 request
**Hiện tại:** Overview gọi 4 API có sẵn (`profiles(1,1)`, `shareList`, `peers`, `settings`) để lấy số liệu. Chạy ổn; chỉ cần nếu muốn nhẹ hơn.
```
GET /api/overview
→ { "accounts": 128, "status": [ {"status":"Active","count":112}, ... ],
    "pending_accounts": 1, "active_keys": 2, "sources": 1, "share": { "running": true, "url": "..." } }
```

---

## Những gì đã làm hoàn toàn phía client (không cần API)

- Trạng thái **Saved / Unsaved** và nút Reset ở Get Token; **save bar** và Discard ở Settings (Settings giờ chỉ gửi các field thực sự đổi, vẫn qua `/api/settings/update`).
- Tự **nối lại polling** khi mở Get Token lúc job đang chạy (gọi `/api/gettoken/progress` và `/api/gettoken/import/progress` một lần khi vào trang).
- Log hoạt động trong phiên ở Run panel.
- Chip bộ lọc đang áp, segmented lọc nhanh theo status, chọn nhiều account giữ qua các trang.
- Bulk **Share**: chuyển sang trang Share với các email đã chọn được tick sẵn.
- Export CSV trang hiện tại / dòng đã chọn.
- Ô lọc email + chọn tất cả trong Share → Provide; key ẩn bớt ký tự kèm nút hiện / Copy; key đã revoke gom vào mục thu gọn.
- Phím tắt Ctrl+1…4 ở Overview.
