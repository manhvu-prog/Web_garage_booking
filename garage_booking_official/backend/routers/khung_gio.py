"""
routers/khung_gio.py – Quản lý khung giờ
"""
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from database import get_db
from auth import get_current_user, require_role
from schemas import CreateKhungGioRequest, UpdateKhungGioRequest

router = APIRouter(prefix="/khung-gio", tags=["Khung giờ"])

ADMIN = require_role("quan_tri")


def _enrich(row: dict) -> dict:
    return {
        **row,
        "con_trong": max(0, row["so_luong_slot"] - row["da_dat"]),
    }


@router.get("")
def list_khung_gio(
    ngay: Optional[str] = Query(None, description="Lọc theo ngày YYYY-MM-DD"),
    chi_con_cho: bool = Query(False, description="Chỉ lấy khung giờ còn chỗ"),
    current_user=Depends(get_current_user),
):
    conn = get_db()
    sql = """
        SELECT kg.*,
               (SELECT COUNT(*) FROM lich_hen lh
                WHERE lh.khung_gio_id = kg.id AND lh.trang_thai != 'da_huy') AS da_dat
        FROM khung_gio kg WHERE 1=1
    """
    params = []
    if ngay:
        sql += " AND kg.ngay=?"; params.append(ngay)
    sql += " ORDER BY kg.ngay, kg.gio_bat_dau"

    rows = [_enrich(dict(r)) for r in conn.execute(sql, params).fetchall()]
    conn.close()

    if chi_con_cho:
        rows = [r for r in rows if r["con_trong"] > 0]
    return rows


@router.get("/{kg_id}")
def get_khung_gio(kg_id: int, current_user=Depends(get_current_user)):
    conn = get_db()
    row = conn.execute("""
        SELECT kg.*,
               (SELECT COUNT(*) FROM lich_hen lh
                WHERE lh.khung_gio_id = kg.id AND lh.trang_thai != 'da_huy') AS da_dat
        FROM khung_gio kg WHERE kg.id=?
    """, (kg_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Khung giờ không tồn tại")
    return _enrich(dict(row))


@router.post("", status_code=201)
def create_khung_gio(body: CreateKhungGioRequest, _=Depends(ADMIN)):
    if body.gio_ket_thuc <= body.gio_bat_dau:
        raise HTTPException(status_code=400, detail="Giờ kết thúc phải sau giờ bắt đầu")
    conn = get_db()
    try:
        exists = conn.execute(
            "SELECT id FROM khung_gio WHERE ngay=? AND gio_bat_dau=?",
            (body.ngay, body.gio_bat_dau),
        ).fetchone()
        if exists:
            raise HTTPException(status_code=409, detail="Khung giờ này đã tồn tại")
        conn.execute(
            "INSERT INTO khung_gio (ngay, gio_bat_dau, gio_ket_thuc, so_luong_slot) VALUES (?,?,?,?)",
            (body.ngay, body.gio_bat_dau, body.gio_ket_thuc, body.so_luong_slot),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM khung_gio ORDER BY id DESC LIMIT 1").fetchone()
    finally:
        conn.close()
    return {**dict(row), "da_dat": 0, "con_trong": row["so_luong_slot"]}


@router.put("/{kg_id}")
def update_khung_gio(kg_id: int, body: UpdateKhungGioRequest, _=Depends(ADMIN)):
    conn = get_db()
    try:
        row = conn.execute("SELECT * FROM khung_gio WHERE id=?", (kg_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Khung giờ không tồn tại")
        if body.so_luong_slot is None:
            raise HTTPException(status_code=400, detail="Không có gì để cập nhật")
        # Kiểm tra không giảm dưới số đã đặt
        da_dat = conn.execute(
            "SELECT COUNT(*) FROM lich_hen WHERE khung_gio_id=? AND trang_thai!='da_huy'", (kg_id,)
        ).fetchone()[0]
        if body.so_luong_slot < da_dat:
            raise HTTPException(
                status_code=400,
                detail=f"Không thể giảm slot xuống {body.so_luong_slot}, hiện đã có {da_dat} lịch hẹn",
            )
        conn.execute("UPDATE khung_gio SET so_luong_slot=? WHERE id=?", (body.so_luong_slot, kg_id))
        conn.commit()
        row = conn.execute("SELECT * FROM khung_gio WHERE id=?", (kg_id,)).fetchone()
    finally:
        conn.close()
    return {**dict(row), "da_dat": da_dat, "con_trong": body.so_luong_slot - da_dat}


@router.delete("/{kg_id}")
def delete_khung_gio(kg_id: int, _=Depends(ADMIN)):
    conn = get_db()
    try:
        row = conn.execute("SELECT * FROM khung_gio WHERE id=?", (kg_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Khung giờ không tồn tại")
        has_appt = conn.execute(
            "SELECT id FROM lich_hen WHERE khung_gio_id=? LIMIT 1", (kg_id,)
        ).fetchone()
        if has_appt:
            raise HTTPException(status_code=400, detail="Không thể xóa khung giờ đã có lịch hẹn")
        conn.execute("DELETE FROM khung_gio WHERE id=?", (kg_id,))
        conn.commit()
    finally:
        conn.close()
    return {"message": "Đã xóa khung giờ"}
