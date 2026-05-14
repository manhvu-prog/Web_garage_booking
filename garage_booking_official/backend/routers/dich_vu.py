"""
routers/dich_vu.py – Quản lý dịch vụ
"""
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from database import get_db
from auth import get_current_user, require_role
from text_normalize import normalize_search_text
from schemas import CreateDichVuRequest, UpdateDichVuRequest

router = APIRouter(prefix="/dich-vu", tags=["Dịch vụ"])

ADMIN = require_role("quan_tri")


@router.get("")
def list_dich_vu(
    q: Optional[str] = Query(None),
    current_user=Depends(get_current_user),
):
    """Tất cả người dùng đã đăng nhập đều xem được dịch vụ."""
    conn = get_db()
    sql = "SELECT * FROM dich_vu WHERE 1=1"
    params = []
    if q:
        sql += " AND search_norm(ten_dich_vu) LIKE ?"
        params.append(f"%{normalize_search_text(q)}%")
    sql += " ORDER BY id"
    rows = conn.execute(sql, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@router.get("/{dv_id}")
def get_dich_vu(dv_id: int, current_user=Depends(get_current_user)):
    conn = get_db()
    row = conn.execute("SELECT * FROM dich_vu WHERE id=?", (dv_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Dịch vụ không tồn tại")
    return dict(row)


@router.post("", status_code=201)
def create_dich_vu(body: CreateDichVuRequest, _=Depends(ADMIN)):
    conn = get_db()
    try:
        conn.execute(
            "INSERT INTO dich_vu (ten_dich_vu, gia_tien, thoi_gian_uoc_tinh) VALUES (?,?,?)",
            (body.ten_dich_vu, body.gia_tien, body.thoi_gian_uoc_tinh),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM dich_vu ORDER BY id DESC LIMIT 1").fetchone()
    finally:
        conn.close()
    return dict(row)


@router.put("/{dv_id}")
def update_dich_vu(dv_id: int, body: UpdateDichVuRequest, _=Depends(ADMIN)):
    conn = get_db()
    try:
        row = conn.execute("SELECT * FROM dich_vu WHERE id=?", (dv_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Dịch vụ không tồn tại")

        fields, params = [], []
        if body.ten_dich_vu is not None:
            fields.append("ten_dich_vu=?"); params.append(body.ten_dich_vu)
        if body.gia_tien is not None:
            if body.gia_tien < 0:
                raise HTTPException(status_code=400, detail="Giá tiền không được âm")
            fields.append("gia_tien=?"); params.append(body.gia_tien)
        if body.thoi_gian_uoc_tinh is not None:
            fields.append("thoi_gian_uoc_tinh=?"); params.append(body.thoi_gian_uoc_tinh)
        if not fields:
            raise HTTPException(status_code=400, detail="Không có gì để cập nhật")

        params.append(dv_id)
        conn.execute(f"UPDATE dich_vu SET {', '.join(fields)} WHERE id=?", params)
        conn.commit()
        row = conn.execute("SELECT * FROM dich_vu WHERE id=?", (dv_id,)).fetchone()
    finally:
        conn.close()
    return dict(row)


@router.delete("/{dv_id}")
def delete_dich_vu(dv_id: int, _=Depends(ADMIN)):
    conn = get_db()
    try:
        row = conn.execute("SELECT * FROM dich_vu WHERE id=?", (dv_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Dịch vụ không tồn tại")
        # Kiểm tra có đang được dùng không
        used = conn.execute(
            "SELECT lich_hen_id FROM chi_tiet_lich_hen WHERE dich_vu_id=? LIMIT 1", (dv_id,)
        ).fetchone()
        if used:
            raise HTTPException(status_code=400, detail="Dịch vụ đang được sử dụng, không thể xóa")
        conn.execute("DELETE FROM dich_vu WHERE id=?", (dv_id,))
        conn.commit()
    finally:
        conn.close()
    return {"message": "Đã xóa dịch vụ"}
