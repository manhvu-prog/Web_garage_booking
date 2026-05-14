"""
routers/auth.py – Đăng nhập, đăng ký, thông tin cá nhân
"""
from fastapi import APIRouter, HTTPException, Depends
from database import get_db
from auth import hash_password, verify_password, create_access_token, get_current_user
from schemas import LoginRequest, RegisterRequest, TokenResponse, ChangePasswordRequest

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest):
    conn = get_db()
    user = conn.execute(
        "SELECT * FROM nguoi_dung WHERE email = ?", (body.email,)
    ).fetchone()
    conn.close()

    if not user or not verify_password(body.mat_khau, user["mat_khau_hash"]):
        raise HTTPException(status_code=401, detail="Email hoặc mật khẩu không đúng")
    if user["trang_thai"] != "hoat_dong":
        raise HTTPException(status_code=403, detail="Tài khoản đã bị khóa hoặc xóa")

    token = create_access_token({
        "sub": str(user["id"]),
        "role": user["vai_tro"],
        "email": user["email"],
    })
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "ho_ten": user["ho_ten"],
            "email": user["email"],
            "so_dien_thoai": user["so_dien_thoai"],
            "vai_tro": user["vai_tro"],
        },
    }


@router.post("/register", response_model=TokenResponse, status_code=201)
def register(body: RegisterRequest):
    conn = get_db()
    try:
        # Kiểm tra trùng email/SĐT
        exists = conn.execute(
            "SELECT id FROM nguoi_dung WHERE email=? OR so_dien_thoai=?",
            (body.email, body.so_dien_thoai),
        ).fetchone()
        if exists:
            raise HTTPException(status_code=409, detail="Email hoặc số điện thoại đã được sử dụng")

        conn.execute(
            "INSERT INTO nguoi_dung (ho_ten, email, so_dien_thoai, mat_khau_hash, vai_tro) VALUES (?,?,?,?,?)",
            (body.ho_ten, body.email, body.so_dien_thoai, hash_password(body.mat_khau), "khach_hang"),
        )
        conn.commit()
        user = conn.execute("SELECT * FROM nguoi_dung WHERE email=?", (body.email,)).fetchone()
    finally:
        conn.close()

    token = create_access_token({"sub": str(user["id"]), "role": user["vai_tro"], "email": user["email"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "ho_ten": user["ho_ten"],
            "email": user["email"],
            "so_dien_thoai": user["so_dien_thoai"],
            "vai_tro": user["vai_tro"],
        },
    }


@router.get("/me")
def get_me(current_user=Depends(get_current_user)):
    conn = get_db()
    user = conn.execute(
        "SELECT id, ho_ten, email, so_dien_thoai, vai_tro, trang_thai, ngay_tao FROM nguoi_dung WHERE id=?",
        (int(current_user["sub"]),),
    ).fetchone()
    conn.close()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
    return dict(user)


@router.put("/me/password")
def change_password(body: ChangePasswordRequest, current_user=Depends(get_current_user)):
    uid = int(current_user["sub"])
    conn = get_db()
    try:
        user = conn.execute("SELECT * FROM nguoi_dung WHERE id=?", (uid,)).fetchone()
        if not verify_password(body.mat_khau_cu, user["mat_khau_hash"]):
            raise HTTPException(status_code=400, detail="Mật khẩu cũ không đúng")
        conn.execute(
            "UPDATE nguoi_dung SET mat_khau_hash=? WHERE id=?",
            (hash_password(body.mat_khau_moi), uid),
        )
        conn.commit()
    finally:
        conn.close()
    return {"message": "Đổi mật khẩu thành công"}
