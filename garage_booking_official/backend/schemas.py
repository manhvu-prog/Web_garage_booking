"""
schemas.py – Pydantic models cho request & response
"""
from typing import List, Optional
from pydantic import BaseModel, EmailStr, field_validator


# ────────────────────────────────────────────────────────
# AUTH
# ────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    email: str
    mat_khau: str


class RegisterRequest(BaseModel):
    ho_ten: str
    email: str
    so_dien_thoai: str
    mat_khau: str

    @field_validator("mat_khau")
    @classmethod
    def pw_min_len(cls, v):
        if len(v) < 6:
            raise ValueError("Mật khẩu tối thiểu 6 ký tự")
        return v


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


# ────────────────────────────────────────────────────────
# NGƯỜI DÙNG
# ────────────────────────────────────────────────────────
class NguoiDungResponse(BaseModel):
    id: int
    ho_ten: str
    email: str
    so_dien_thoai: str
    vai_tro: str
    trang_thai: str
    ngay_tao: Optional[str] = None


class CreateNguoiDungRequest(BaseModel):
    ho_ten: str
    email: str
    so_dien_thoai: str
    mat_khau: str
    vai_tro: str = "khach_hang"


class UpdateNguoiDungRequest(BaseModel):
    ho_ten: Optional[str] = None
    so_dien_thoai: Optional[str] = None
    vai_tro: Optional[str] = None
    trang_thai: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    mat_khau_cu: str
    mat_khau_moi: str

    @field_validator("mat_khau_moi")
    @classmethod
    def pw_min_len(cls, v):
        if len(v) < 6:
            raise ValueError("Mật khẩu tối thiểu 6 ký tự")
        return v


# ────────────────────────────────────────────────────────
# XE
# ────────────────────────────────────────────────────────
class XeResponse(BaseModel):
    id: int
    nguoi_dung_id: int
    bien_so_xe: str
    hang_xe: Optional[str]
    dong_xe: Optional[str]


class CreateXeRequest(BaseModel):
    bien_so_xe: str
    hang_xe: Optional[str] = None
    dong_xe: Optional[str] = None


class UpdateXeRequest(BaseModel):
    hang_xe: Optional[str] = None
    dong_xe: Optional[str] = None


# ────────────────────────────────────────────────────────
# DỊCH VỤ
# ────────────────────────────────────────────────────────
class DichVuResponse(BaseModel):
    id: int
    ten_dich_vu: str
    gia_tien: float
    thoi_gian_uoc_tinh: int


class CreateDichVuRequest(BaseModel):
    ten_dich_vu: str
    gia_tien: float
    thoi_gian_uoc_tinh: int

    @field_validator("gia_tien")
    @classmethod
    def gia_khong_am(cls, v):
        if v < 0:
            raise ValueError("Giá tiền không được âm")
        return v

    @field_validator("thoi_gian_uoc_tinh")
    @classmethod
    def tg_duong(cls, v):
        if v <= 0:
            raise ValueError("Thời gian ước tính phải > 0")
        return v


class UpdateDichVuRequest(BaseModel):
    ten_dich_vu: Optional[str] = None
    gia_tien: Optional[float] = None
    thoi_gian_uoc_tinh: Optional[int] = None


# ────────────────────────────────────────────────────────
# KHUNG GIỜ
# ────────────────────────────────────────────────────────
class KhungGioResponse(BaseModel):
    id: int
    ngay: str
    gio_bat_dau: str
    gio_ket_thuc: str
    so_luong_slot: int
    da_dat: int  # số lịch hẹn đang hoạt động
    con_trong: int


class CreateKhungGioRequest(BaseModel):
    ngay: str
    gio_bat_dau: str
    gio_ket_thuc: str
    so_luong_slot: int = 3


class UpdateKhungGioRequest(BaseModel):
    so_luong_slot: Optional[int] = None


# ────────────────────────────────────────────────────────
# LỊCH HẸN
# ────────────────────────────────────────────────────────
class CreateLichHenRequest(BaseModel):
    xe_id: int
    khung_gio_id: int
    dich_vu_ids: List[int]
    ghi_chu: Optional[str] = None


class UpdateLichHenRequest(BaseModel):
    trang_thai: Optional[str] = None
    nhan_vien_phu_trach_id: Optional[int] = None
    ghi_chu: Optional[str] = None


class LichHenBriefResponse(BaseModel):
    id: int
    nguoi_dung_id: int
    xe_id: int
    khung_gio_id: int
    nhan_vien_phu_trach_id: Optional[int]
    trang_thai: str
    ghi_chu: Optional[str]
    ngay_tao: Optional[str]


class LichHenDetailResponse(BaseModel):
    id: int
    trang_thai: str
    ghi_chu: Optional[str]
    ngay_tao: Optional[str]
    khach_hang: Optional[dict]
    xe: Optional[dict]
    khung_gio: Optional[dict]
    nhan_vien: Optional[dict]
    dich_vu: List[dict]
    hoa_don: Optional[dict]


# ────────────────────────────────────────────────────────
# HỒ SƠ BẢO DƯỠNG
# ────────────────────────────────────────────────────────
class CreateHoSoBaoDuongRequest(BaseModel):
    ky_thuat_vien_id: Optional[int] = None
    ngay_thuc_hien: Optional[str] = None
    ghi_chu: Optional[str] = None


class HoSoBaoDuongResponse(BaseModel):
    id: int
    lich_hen_id: int
    ky_thuat_vien_id: Optional[int]
    ngay_thuc_hien: Optional[str]
    ghi_chu: Optional[str]


# ────────────────────────────────────────────────────────
# HÓA ĐƠN
# ────────────────────────────────────────────────────────
class HoaDonResponse(BaseModel):
    id: int
    lich_hen_id: int
    tong_tien: float
    trang_thai: str
    ngay_tao: Optional[str]


# ────────────────────────────────────────────────────────
# DASHBOARD
# ────────────────────────────────────────────────────────
class DashboardAdminResponse(BaseModel):
    tong_lich_hen_hom_nay: int
    tong_nguoi_dung: int
    doanh_thu_hom_nay: float
    hoa_don_chua_thanh_toan: int


class DashboardKhachHangResponse(BaseModel):
    lich_hen_sap_toi: List[dict]
    xe_cua_toi: List[dict]
    tong_lich_hen: int
