"""
routers/nguoi_dung.py – CRUD người dùng (Admin + cá nhân)
"""
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from database import get_db
from auth import get_current_user, require_role, hash_password
from text_normalize import normalize_search_text
from schemas import CreateNguoiDungRequest, UpdateNguoiDungRequest

router = APIRouter(prefix="/nguoi-dung", tags=["Người dùng"])

ADMIN = require_role("quan_tri")


@router.get("")
def list_users(
    vai_tro: Optional[str] = Query(None),
    trang_thai: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    _=Depends(ADMIN),
):
    conn = get_db()
    sql = "SELECT id, ho_ten, email, so_dien_thoai, vai_tro, trang_thai, ngay_tao FROM nguoi_dung WHERE 1=1"
    params = []
    if vai_tro:
        sql += " AND vai_tro=?"; params.append(vai_tro)
    if trang_thai:
        sql += " AND trang_thai=?"; params.append(trang_thai)
    if q:
        kw = f"%{normalize_search_text(q)}%"
        sql += " AND (search_norm(ho_ten) LIKE ? OR search_norm(email) LIKE ? OR search_norm(so_dien_thoai) LIKE ?)"
        params += [kw, kw, kw]
    sql += " ORDER BY id"
    rows = conn.execute(sql, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@router.get("/nhan-vien")
def list_staff(_=Depends(require_role("quan_tri", "nhan_vien"))):
    """Danh sách nhân viên – dùng để gán phụ trách lịch hẹn."""
    conn = get_db()
    rows = conn.execute(
        "SELECT id, ho_ten, vai_tro FROM nguoi_dung WHERE vai_tro IN ('nhan_vien','quan_tri') AND trang_thai='hoat_dong'"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@router.get("/{uid}")
def get_user(uid: int, current_user=Depends(get_current_user)):
    # Chỉ admin hoặc chính chủ mới xem được
    if current_user["role"] != "quan_tri" and str(uid) != current_user["sub"]:
        raise HTTPException(status_code=403, detail="Không có quyền truy cập")
    conn = get_db()
    row = conn.execute(
        "SELECT id, ho_ten, email, so_dien_thoai, vai_tro, trang_thai, ngay_tao FROM nguoi_dung WHERE id=?", (uid,)
    ).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Người dùng không tồn tại")
    return dict(row)


@router.post("", status_code=201)
def create_user(body: CreateNguoiDungRequest, _=Depends(ADMIN)):
    conn = get_db()
    try:
        exists = conn.execute(
            "SELECT id FROM nguoi_dung WHERE email=? OR so_dien_thoai=?",
            (body.email, body.so_dien_thoai),
        ).fetchone()
        if exists:
            raise HTTPException(status_code=409, detail="Email hoặc SĐT đã tồn tại")
        conn.execute(
            "INSERT INTO nguoi_dung (ho_ten, email, so_dien_thoai, mat_khau_hash, vai_tro) VALUES (?,?,?,?,?)",
            (body.ho_ten, body.email, body.so_dien_thoai, hash_password(body.mat_khau), body.vai_tro),
        )
        conn.commit()
        row = conn.execute("SELECT id, ho_ten, email, so_dien_thoai, vai_tro, trang_thai FROM nguoi_dung WHERE email=?",
                           (body.email,)).fetchone()
    finally:
        conn.close()
    return dict(row)


@router.put("/{uid}")
def update_user(uid: int, body: UpdateNguoiDungRequest, current_user=Depends(get_current_user)):
    is_admin = current_user["role"] == "quan_tri"
    is_self  = str(uid) == current_user["sub"]
    if not is_admin and not is_self:
        raise HTTPException(status_code=403, detail="Không có quyền chỉnh sửa")

    fields, params = [], []
    if body.ho_ten is not None:
        fields.append("ho_ten=?"); params.append(body.ho_ten)
    if body.so_dien_thoai is not None:
        fields.append("so_dien_thoai=?"); params.append(body.so_dien_thoai)
    # Chỉ admin mới được đổi vai trò & trạng thái
    if is_admin:
        if body.vai_tro is not None:
            fields.append("vai_tro=?"); params.append(body.vai_tro)
        if body.trang_thai is not None:
            fields.append("trang_thai=?"); params.append(body.trang_thai)

    if not fields:
        raise HTTPException(status_code=400, detail="Không có trường nào để cập nhật")

    params.append(uid)
    conn = get_db()
    try:
        conn.execute(f"UPDATE nguoi_dung SET {', '.join(fields)} WHERE id=?", params)
        conn.commit()
        row = conn.execute(
            "SELECT id, ho_ten, email, so_dien_thoai, vai_tro, trang_thai FROM nguoi_dung WHERE id=?", (uid,)
        ).fetchone()
    finally:
        conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Người dùng không tồn tại")
    return dict(row)


@router.delete("/{uid}")
def delete_user(uid: int, _=Depends(ADMIN)):
    conn = get_db()
    try:
        row = conn.execute("SELECT id FROM nguoi_dung WHERE id=?", (uid,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Người dùng không tồn tại")
        # Soft delete
        conn.execute("UPDATE nguoi_dung SET trang_thai='da_xoa' WHERE id=?", (uid,))
        conn.commit()
    finally:
        conn.close()
    return {"message": "Đã xóa người dùng"}
