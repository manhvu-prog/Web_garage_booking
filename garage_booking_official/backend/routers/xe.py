"""
routers/xe.py – Quản lý xe của khách hàng
"""
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from database import get_db
from auth import get_current_user, require_role
from text_normalize import normalize_search_text
from schemas import CreateXeRequest, UpdateXeRequest

router = APIRouter(prefix="/xe", tags=["Xe"])


@router.get("")
def list_xe(
    nguoi_dung_id: Optional[int] = Query(None),
    q: Optional[str] = Query(None),
    current_user=Depends(get_current_user),
):
    conn = get_db()
    is_admin = current_user["role"] in ("quan_tri", "nhan_vien")
    uid = int(current_user["sub"])

    if is_admin:
        sql = "SELECT xe.*, nd.ho_ten FROM xe JOIN nguoi_dung nd ON nd.id = xe.nguoi_dung_id WHERE 1=1"
        params = []
        if nguoi_dung_id:
            sql += " AND xe.nguoi_dung_id=?"; params.append(nguoi_dung_id)
        if q:
            kw = f"%{normalize_search_text(q)}%"
            sql += " AND (search_norm(xe.bien_so_xe) LIKE ? OR search_norm(xe.hang_xe) LIKE ? OR search_norm(xe.dong_xe) LIKE ?)"
            params += [kw, kw, kw]
    else:
        # Khách hàng chỉ thấy xe của mình
        sql = "SELECT * FROM xe WHERE nguoi_dung_id=?"
        params = [uid]
        if q:
            kw = f"%{normalize_search_text(q)}%"
            sql += " AND (search_norm(bien_so_xe) LIKE ? OR search_norm(hang_xe) LIKE ? OR search_norm(dong_xe) LIKE ?)"
            params += [kw, kw, kw]

    rows = conn.execute(sql, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@router.get("/{xe_id}")
def get_xe(xe_id: int, current_user=Depends(get_current_user)):
    conn = get_db()
    row = conn.execute("SELECT * FROM xe WHERE id=?", (xe_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Xe không tồn tại")
    is_admin = current_user["role"] in ("quan_tri", "nhan_vien")
    if not is_admin and row["nguoi_dung_id"] != int(current_user["sub"]):
        raise HTTPException(status_code=403, detail="Không có quyền truy cập")
    return dict(row)


@router.post("", status_code=201)
def add_xe(body: CreateXeRequest, current_user=Depends(get_current_user)):
    uid = int(current_user["sub"])
    conn = get_db()
    try:
        exists = conn.execute("SELECT id FROM xe WHERE bien_so_xe=?", (body.bien_so_xe,)).fetchone()
        if exists:
            raise HTTPException(status_code=409, detail="Biển số xe đã tồn tại trong hệ thống")
        conn.execute(
            "INSERT INTO xe (nguoi_dung_id, bien_so_xe, hang_xe, dong_xe) VALUES (?,?,?,?)",
            (uid, body.bien_so_xe.upper(), body.hang_xe, body.dong_xe),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM xe WHERE bien_so_xe=?", (body.bien_so_xe.upper(),)).fetchone()
    finally:
        conn.close()
    return dict(row)


@router.put("/{xe_id}")
def update_xe(xe_id: int, body: UpdateXeRequest, current_user=Depends(get_current_user)):
    conn = get_db()
    try:
        row = conn.execute("SELECT * FROM xe WHERE id=?", (xe_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Xe không tồn tại")
        if current_user["role"] not in ("quan_tri",) and row["nguoi_dung_id"] != int(current_user["sub"]):
            raise HTTPException(status_code=403, detail="Không có quyền")

        fields, params = [], []
        if body.hang_xe is not None:
            fields.append("hang_xe=?"); params.append(body.hang_xe)
        if body.dong_xe is not None:
            fields.append("dong_xe=?"); params.append(body.dong_xe)
        if not fields:
            raise HTTPException(status_code=400, detail="Không có gì để cập nhật")

        params.append(xe_id)
        conn.execute(f"UPDATE xe SET {', '.join(fields)} WHERE id=?", params)
        conn.commit()
        row = conn.execute("SELECT * FROM xe WHERE id=?", (xe_id,)).fetchone()
    finally:
        conn.close()
    return dict(row)


@router.delete("/{xe_id}")
def delete_xe(xe_id: int, current_user=Depends(get_current_user)):
    conn = get_db()
    try:
        row = conn.execute("SELECT * FROM xe WHERE id=?", (xe_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Xe không tồn tại")
        if current_user["role"] != "quan_tri" and row["nguoi_dung_id"] != int(current_user["sub"]):
            raise HTTPException(status_code=403, detail="Không có quyền")
        # Kiểm tra còn lịch hẹn đang hoạt động không
        active = conn.execute(
            "SELECT id FROM lich_hen WHERE xe_id=? AND trang_thai NOT IN ('hoan_thanh','da_huy')",
            (xe_id,),
        ).fetchone()
        if active:
            raise HTTPException(status_code=400, detail="Xe đang có lịch hẹn chưa hoàn thành")
        conn.execute("DELETE FROM xe WHERE id=?", (xe_id,))
        conn.commit()
    finally:
        conn.close()
    return {"message": "Đã xóa xe"}
