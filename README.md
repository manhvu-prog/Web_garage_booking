# 🚗 AutoCare - Hệ thống Quản lý Garage & Đặt Lịch Bảo Dưỡng

AutoCare là một hệ thống ứng dụng web giúp khách hàng dễ dàng đặt lịch hẹn bảo dưỡng, sửa chữa xe và thanh toán trực tuyến qua VNPAY. Hệ thống cung cấp bảng điều khiển (Dashboard) dành cho Khách hàng, Nhân viên kỹ thuật và Quản trị viên.

## 🛠 Công nghệ sử dụng
- **Backend**: Python (FastAPI), MySQL.
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla), Chart.js (Biểu đồ), ExcelJS (Xuất file Excel).
- **Thanh toán**: Tích hợp cổng thanh toán trực tuyến **VNPAY Sandbox**.

---

## 📋 Yêu cầu hệ thống
1. **Python 3.8+** đã được cài đặt.
2. **MySQL Server** đang hoạt động.
3. Extension **Live Server** trên VS Code (hoặc một http-server đơn giản) để chạy Frontend.

---

## 🚀 Hướng dẫn Cài đặt & Chạy dự án

### Bước 1: Cấu hình Cơ sở dữ liệu (MySQL)
Mở ứng dụng MySQL (ví dụ: XAMPP, MySQL Workbench) và khởi động MySQL Server. Hệ thống sẽ **tự động tạo Database, cấu trúc bảng và dữ liệu mẫu** (seed data) trong lần đầu tiên chạy Backend.

Bạn chỉ cần tạo file cấu hình `.env`:
1. Di chuyển vào thư mục `backend`.
2. Mở file `.env` (hoặc copy từ file mẫu nếu có) và cập nhật thông tin kết nối Database của máy bạn:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=Mật_Khẩu_MySQL_Của_Bạn
DB_NAME=garage_booking
```

### Bước 2: Cài đặt và Chạy Backend (FastAPI)

1. Mở Terminal / Command Prompt và di chuyển vào thư mục `backend`:
   ```bash
   cd backend
   ```

2. Tạp môi trường ảo (Virtual Environment) và kích hoạt nó:
   ```bash
   python -m venv .venv
   # Windows:
   .venv\Scripts\activate
   # macOS/Linux:
   source .venv/bin/activate
   ```

3. Cài đặt các thư viện cần thiết:
   ```bash
   pip install -r requirements.txt
   ```

4. Khởi chạy Server Backend:
   ```bash
   uvicorn main:app --reload --port 8080
   ```
   *Lúc này, Backend sẽ chạy tại: http://localhost:8080. Bạn có thể xem tài liệu API tại http://localhost:8080/docs.*

### Bước 3: Cấu hình cổng thanh toán VNPAY
Đảm bảo bạn đã thêm các thông số cấu hình Sandbox của VNPAY vào file `backend/.env`. 

**Cách đăng ký và lấy API VNPAY Sandbox:**
1. Truy cập trang web VNPAY Sandbox: [https://sandbox.vnpayment.vn/devreg/](https://sandbox.vnpayment.vn/devreg/)
2. Điền thông tin để đăng ký một tài khoản Merchant (Môi trường test).
3. Đăng nhập vào Email để nhận thông tin **Terminal ID (vnp_TmnCode)** và **Secret Key (vnp_HashSecret)**.
4. Quét email tìm các thông số này và điền vào file `backend/.env`.

Nội dung cấu hình chuẩn trong `.env` như sau:
```env
VNP_TMN_CODE=IBUCVH29
VNP_HASH_SECRET=HV0BINCSL7LGY5UPT5U9WJJHFROHWLQX
VNP_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNP_RETURN_URL=http://localhost:8080/payment/vnpay-return
VNP_API_URL=https://sandbox.vnpayment.vn/merchant_webapi/api/transaction
```
*(Thay thế giá trị TMN_CODE và HASH_SECRET bằng thông tin cấp từ VNPAY Sandbox của bạn).*

### Bước 4: Chạy Frontend (Giao diện Web)
Giao diện được code hoàn toàn bằng HTML/CSS/JS thuần, bạn có thể chạy bằng cách:
1. Mở toàn bộ thư mục dự án (chứa file `index.html`, `login.html`, `admin.html`,...) trong **Visual Studio Code**.
2. Cài đặt Extension **Live Server** (của Ritwick Dey).
3. Nhấp chuột phải vào file `index.html` hoặc `login.html` và chọn **"Open with Live Server"**.
4. Trình duyệt sẽ tự động mở trang web (thường là http://127.0.0.1:5500).

---

## 🔑 Tài khoản đăng nhập mẫu (Demo)

Hệ thống đã tự động tạo sẵn một số tài khoản sau để bạn test:

| Vai trò | Email đăng nhập | Mật khẩu |
|---------|-----------------|----------|
| **Quản trị viên** (Admin) | `admin@autocare.vn` | `admin123` |
| **Khách hàng** | `a@gmail.com` | `123456` |
| **Nhân viên** | `b@gmail.com` | `123456` |

---

## 💳 Hướng dẫn test luồng thanh toán VNPAY
1. Đăng nhập với tài khoản **Khách hàng** (`a@gmail.com`).
2. Tiến hành đặt lịch hẹn một dịch vụ bất kỳ.
3. Chuyển sang tài khoản **Nhân viên** (`b@gmail.com` hoặc Admin), xác nhận chuyển lịch hẹn sang trạng thái **Đang thực hiện** rồi **Hoàn thành**. (Hoặc hệ thống tự động sinh Hóa Đơn).
4. Khách hàng xem danh sách Hóa đơn chưa thanh toán trên Dashboard, bấm **"Thanh toán VNPAY"**.
5. Giao diện sẽ chuyển hướng sang trang thanh toán của VNPAY. Dùng tài khoản thẻ Test của VNPAY Sandbox:
   - Ngân hàng: **NCB**
   - Số thẻ: `9704198526191432198`
   - Tên chủ thẻ: `NGUYEN VAN A`
   - Ngày phát hành: `07/15`
   - Mật khẩu OTP: `123456`
6. Sau khi thanh toán thành công, hệ thống chuyển hướng về lại giao diện Garage và cập nhật trạng thái Hóa đơn là **Đã thanh toán**.

---
*Cảm ơn bạn đã sử dụng AutoCare! Chúc bạn thao tác thành công!*

