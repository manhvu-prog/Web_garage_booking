"""
main.py – Điểm vào ứng dụng FastAPI AutoCare Garage
Chạy: uvicorn main:app --reload --port 8000
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import init_db
from routers import auth, nguoi_dung, xe, dich_vu, khung_gio, lich_hen, hoa_don, dashboard, search, payment

# ── Khởi tạo DB và seed dữ liệu mẫu khi start ──────────
init_db()

app = FastAPI(
    title="AutoCare Garage API",
    description="""
## 🔧 Hệ thống đặt lịch bảo dưỡng xe AutoCare

### Phân quyền
| Vai trò | Ký hiệu |
|---------|---------|
| Khách hàng | `khach_hang` |
| Nhân viên | `nhan_vien` |
| Quản trị viên | `quan_tri` |

### Tài khoản mẫu
| Email | Mật khẩu | Vai trò |
|-------|----------|---------|
| a@gmail.com | 123456 | Khách hàng |
| b@gmail.com | 123456 | Nhân viên |
| admin@autocare.vn | admin123 | Quản trị |
    """,
    version="1.0.0",
)

# ── CORS – cho phép frontend gọi API ────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # Production: thay bằng domain cụ thể
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Đăng ký tất cả router ────────────────────────────────
app.include_router(auth.router)
app.include_router(nguoi_dung.router)
app.include_router(xe.router)
app.include_router(dich_vu.router)
app.include_router(khung_gio.router)
app.include_router(lich_hen.router)
app.include_router(hoa_don.router)
app.include_router(dashboard.router)
app.include_router(search.router)
app.include_router(payment.router)


@app.get("/", tags=["Root"])
def root():
    return {
        "message": "AutoCare Garage API đang hoạt động 🚗",
        "docs": "/docs",
        "redoc": "/redoc",
        "version": "1.0.0",
    }


@app.get("/health", tags=["Root"])
def health():
    from database import get_db
    try:
        conn = get_db()
        conn.execute("SELECT 1").fetchone()
        conn.close()
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        return {"status": "error", "detail": str(e)}
