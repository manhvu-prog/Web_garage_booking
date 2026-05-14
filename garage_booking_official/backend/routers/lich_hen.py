"""
routers/lich_hen.py – Quản lý lịch hẹn (tính năng core)
Khách hàng: tạo, hủy lịch hẹn của mình
Nhân viên: xem, nhận xe, hoàn thành
Admin: toàn quyền
"""
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from database import get_db
from auth import get_current_user, require_role
from text_normalize import normalize_search_text
from schemas import CreateLichHenRequest, UpdateLichHenRequest

router = APIRouter(prefix="/lich-hen", tags=["Lịch hẹn"])


def _get_lich_hen_detail(conn, lh_id: int) -> dict:
    """Lấy thông tin chi tiết 1 lịch hẹn, gộp tất cả bảng liên quan."""
    lh = conn.execute("SELECT * FROM lich_hen WHERE id=?", (lh_id,)).fetchone()
    if not lh:
        return None

    kh = conn.execute(
        "SELECT id, ho_ten, email, so_dien_thoai FROM nguoi_dung WHERE id=?", (lh["nguoi_dung_id"],)
    ).fetchone()
    xe = conn.execute("SELECT * FROM xe WHERE id=?", (lh["xe_id"],)).fetchone()
    kg = conn.execute("SELECT * FROM khung_gio WHERE id=?", (lh["khung_gio_id"],)).fetchone()
    nv = conn.execute(
        "SELECT id, ho_ten FROM nguoi_dung WHERE id=?", (lh["nhan_vien_phu_trach_id"],)
    ).fetchone() if lh["nhan_vien_phu_trach_id"] else None

    dich_vu = conn.execute("""
        SELECT d.* FROM dich_vu d
        JOIN chi_tiet_lich_hen ct ON ct.dich_vu_id = d.id
        WHERE ct.lich_hen_id = ?
    """, (lh_id,)).fetchall()

    hoa_don = conn.execute("SELECT * FROM hoa_don WHERE lich_hen_id=?", (lh_id,)).fetchone()

    return {
        "id": lh["id"],
        "trang_thai": lh["trang_thai"],
        "ghi_chu": lh["ghi_chu"],
        "ngay_tao": lh["ngay_tao"],
        "khach_hang": dict(kh) if kh else None,
        "xe": dict(xe) if xe else None,
        "khung_gio": dict(kg) if kg else None,
        "nhan_vien": dict(nv) if nv else None,
        "dich_vu": [dict(d) for d in dich_vu],
        "hoa_don": dict(hoa_don) if hoa_don else None,
    }


@router.get("")
def list_lich_hen(
    trang_thai: Optional[str] = Query(None),
    khung_gio_id: Optional[int] = Query(None),
    ngay: Optional[str] = Query(None),
    nguoi_dung_id: Optional[int] = Query(None),
    nhan_vien_id: Optional[int] = Query(None),
    q: Optional[str] = Query(None, description="Tìm không dấu: biển số, KH, SĐT, ngày, dịch vụ, ghi chú"),
    current_user=Depends(get_current_user),
):
    conn = get_db()
    uid = int(current_user["sub"])
    role = current_user["role"]

    sql = """
        SELECT lh.*, nd.ho_ten AS ten_kh, xe.bien_so_xe,
               kg.ngay, kg.gio_bat_dau, kg.gio_ket_thuc,
               nv.ho_ten AS ten_nv
        FROM lich_hen lh
        JOIN nguoi_dung nd ON nd.id = lh.nguoi_dung_id
        JOIN xe ON xe.id = lh.xe_id
        JOIN khung_gio kg ON kg.id = lh.khung_gio_id
        LEFT JOIN nguoi_dung nv ON nv.id = lh.nhan_vien_phu_trach_id
        WHERE 1=1
    """
    params = []

    # Phân quyền
    if role == "khach_hang":
        sql += " AND lh.nguoi_dung_id=?"; params.append(uid)
    elif role == "nhan_vien":
        # Nhân viên xem lịch hôm nay + lịch được giao
        pass  # Có thể lọc thêm bên dưới
    # Admin xem tất cả

    if trang_thai:
        sql += " AND lh.trang_thai=?"; params.append(trang_thai)
    if khung_gio_id:
        sql += " AND lh.khung_gio_id=?"; params.append(khung_gio_id)
    if ngay:
        sql += " AND kg.ngay=?"; params.append(ngay)
    if nguoi_dung_id and role in ("quan_tri", "nhan_vien"):
        sql += " AND lh.nguoi_dung_id=?"; params.append(nguoi_dung_id)
    if nhan_vien_id:
        sql += " AND lh.nhan_vien_phu_trach_id=?"; params.append(nhan_vien_id)

    if q:
        kw = f"%{normalize_search_text(q)}%"
        sql += """
            AND (
                search_norm(xe.bien_so_xe) LIKE ? OR
                search_norm(xe.hang_xe) LIKE ? OR
                search_norm(xe.dong_xe) LIKE ? OR
                search_norm(nd.ho_ten) LIKE ? OR
                search_norm(nd.so_dien_thoai) LIKE ? OR
                search_norm(kg.ngay) LIKE ? OR
                search_norm(lh.ghi_chu) LIKE ? OR
                EXISTS (
                    SELECT 1 FROM chi_tiet_lich_hen ct
                    JOIN dich_vu dv ON dv.id = ct.dich_vu_id
                    WHERE ct.lich_hen_id = lh.id AND search_norm(dv.ten_dich_vu) LIKE ?
                )
            )
        """
        params += [kw, kw, kw, kw, kw, kw, kw, kw]

    sql += " ORDER BY kg.ngay DESC, kg.gio_bat_dau"
    rows = conn.execute(sql, params).fetchall()

    # Lấy dịch vụ cho mỗi lịch hẹn
    result = []
    for r in rows:
        d = dict(r)
        dv = conn.execute("""
            SELECT d.id, d.ten_dich_vu, d.gia_tien FROM dich_vu d
            JOIN chi_tiet_lich_hen ct ON ct.dich_vu_id = d.id
            WHERE ct.lich_hen_id = ?
        """, (d["id"],)).fetchall()
        d["dich_vu"] = [dict(x) for x in dv]
        result.append(d)

    conn.close()
    return result


@router.get("/{lh_id}")
def get_lich_hen(lh_id: int, current_user=Depends(get_current_user)):
    conn = get_db()
    detail = _get_lich_hen_detail(conn, lh_id)
    conn.close()
    if not detail:
        raise HTTPException(status_code=404, detail="Lịch hẹn không tồn tại")

    uid = int(current_user["sub"])
    role = current_user["role"]
    if role == "khach_hang" and detail["khach_hang"]["id"] != uid:
        raise HTTPException(status_code=403, detail="Không có quyền truy cập")
    return detail


@router.post("", status_code=201)
def create_lich_hen(body: CreateLichHenRequest, current_user=Depends(get_current_user)):
    uid = int(current_user["sub"])
    role = current_user["role"]

    if not body.dich_vu_ids:
        raise HTTPException(status_code=400, detail="Phải chọn ít nhất 1 dịch vụ")

    conn = get_db()
    try:
        # Kiểm tra xe thuộc về user (trừ admin)
        xe = conn.execute("SELECT * FROM xe WHERE id=?", (body.xe_id,)).fetchone()
        if not xe:
            raise HTTPException(status_code=404, detail="Xe không tồn tại")
        if role == "khach_hang" and xe["nguoi_dung_id"] != uid:
            raise HTTPException(status_code=403, detail="Xe không thuộc về bạn")

        # Kiểm tra khung giờ tồn tại
        kg = conn.execute("SELECT * FROM khung_gio WHERE id=?", (body.khung_gio_id,)).fetchone()
        if not kg:
            raise HTTPException(status_code=404, detail="Khung giờ không tồn tại")

        # Kiểm tra dịch vụ tồn tại
        for dv_id in body.dich_vu_ids:
            dv = conn.execute("SELECT id FROM dich_vu WHERE id=?", (dv_id,)).fetchone()
            if not dv:
                raise HTTPException(status_code=404, detail=f"Dịch vụ {dv_id} không tồn tại")

        # Tạo lịch hẹn (trigger sẽ chặn overbooking và tự tạo hóa đơn)
        try:
            conn.execute(
                "INSERT INTO lich_hen (nguoi_dung_id, xe_id, khung_gio_id, ghi_chu) VALUES (?,?,?,?)",
                (uid, body.xe_id, body.khung_gio_id, body.ghi_chu),
            )
        except Exception as e:
            if "đã đầy" in str(e) or "Khung giờ" in str(e):
                raise HTTPException(status_code=409, detail="Khung giờ đã đầy, vui lòng chọn khung giờ khác")
            raise

        lh_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]

        # Thêm chi tiết dịch vụ
        for dv_id in body.dich_vu_ids:
            conn.execute(
                "INSERT OR IGNORE INTO chi_tiet_lich_hen (lich_hen_id, dich_vu_id) VALUES (?,?)",
                (lh_id, dv_id),
            )

        # Cập nhật tổng tiền hóa đơn
        conn.execute("""
            UPDATE hoa_don SET tong_tien = (
                SELECT COALESCE(SUM(d.gia_tien), 0) FROM chi_tiet_lich_hen ct
                JOIN dich_vu d ON d.id = ct.dich_vu_id
                WHERE ct.lich_hen_id = ?
            ) WHERE lich_hen_id = ?
        """, (lh_id, lh_id))

        conn.commit()
        detail = _get_lich_hen_detail(conn, lh_id)
    finally:
        conn.close()
    return detail


@router.put("/{lh_id}")
def update_lich_hen(lh_id: int, body: UpdateLichHenRequest, current_user=Depends(get_current_user)):
    uid = int(current_user["sub"])
    role = current_user["role"]

    conn = get_db()
    try:
        lh = conn.execute("SELECT * FROM lich_hen WHERE id=?", (lh_id,)).fetchone()
        if not lh:
            raise HTTPException(status_code=404, detail="Lịch hẹn không tồn tại")

        # Kiểm tra quyền
        if role == "khach_hang":
            if lh["nguoi_dung_id"] != uid:
                raise HTTPException(status_code=403, detail="Không có quyền")
            # Khách hàng chỉ được hủy
            if body.trang_thai and body.trang_thai != "da_huy":
                raise HTTPException(status_code=403, detail="Bạn chỉ có thể hủy lịch hẹn")
            if lh["trang_thai"] not in ("cho_thuc_hien",):
                raise HTTPException(status_code=400, detail="Chỉ có thể hủy lịch hẹn đang chờ thực hiện")

        fields, params = [], []
        if body.trang_thai:
            fields.append("trang_thai=?"); params.append(body.trang_thai)
        if body.ghi_chu is not None:
            fields.append("ghi_chu=?"); params.append(body.ghi_chu)
        if body.nhan_vien_phu_trach_id is not None and role in ("quan_tri", "nhan_vien"):
            fields.append("nhan_vien_phu_trach_id=?"); params.append(body.nhan_vien_phu_trach_id)

        if not fields:
            raise HTTPException(status_code=400, detail="Không có gì để cập nhật")

        params.append(lh_id)
        conn.execute(f"UPDATE lich_hen SET {', '.join(fields)} WHERE id=?", params)

        # Nếu hủy lịch → cập nhật hóa đơn thành da_huy
        if body.trang_thai == "da_huy":
            conn.execute(
                "UPDATE hoa_don SET trang_thai='da_huy' WHERE lich_hen_id=?", (lh_id,)
            )
        # Nếu hoàn thành → đánh dấu cần thanh toán (giữ nguyên chua_thanh_toan)

        conn.commit()
        detail = _get_lich_hen_detail(conn, lh_id)
    finally:
        conn.close()
    return detail


@router.post("/{lh_id}/nhan-xe")
def nhan_xe(lh_id: int, current_user=Depends(require_role("nhan_vien", "quan_tri"))):
    """Nhân viên nhận lịch hẹn để phụ trách."""
    uid = int(current_user["sub"])
    conn = get_db()
    try:
        lh = conn.execute("SELECT * FROM lich_hen WHERE id=?", (lh_id,)).fetchone()
        if not lh:
            raise HTTPException(status_code=404, detail="Lịch hẹn không tồn tại")
        if lh["trang_thai"] != "cho_thuc_hien":
            raise HTTPException(status_code=400, detail="Lịch hẹn không ở trạng thái chờ thực hiện")
        if lh["nhan_vien_phu_trach_id"]:
            raise HTTPException(status_code=409, detail="Lịch hẹn đã được nhân viên khác nhận")

        conn.execute(
            "UPDATE lich_hen SET nhan_vien_phu_trach_id=?, trang_thai='dang_thuc_hien' WHERE id=?",
            (uid, lh_id),
        )
        conn.commit()
        detail = _get_lich_hen_detail(conn, lh_id)
    finally:
        conn.close()
    return detail


@router.post("/{lh_id}/hoan-thanh")
def hoan_thanh(lh_id: int, ghi_chu: Optional[str] = None, current_user=Depends(require_role("nhan_vien", "quan_tri"))):
    """Nhân viên đánh dấu hoàn thành và tạo hồ sơ bảo dưỡng."""
    uid = int(current_user["sub"])
    conn = get_db()
    try:
        lh = conn.execute("SELECT * FROM lich_hen WHERE id=?", (lh_id,)).fetchone()
        if not lh:
            raise HTTPException(status_code=404, detail="Lịch hẹn không tồn tại")
        if lh["trang_thai"] != "dang_thuc_hien":
            raise HTTPException(status_code=400, detail="Lịch hẹn phải đang thực hiện mới hoàn thành được")

        conn.execute("UPDATE lich_hen SET trang_thai='hoan_thanh' WHERE id=?", (lh_id,))

        # Tạo hồ sơ bảo dưỡng nếu chưa có
        existing = conn.execute("SELECT id FROM ho_so_bao_duong WHERE lich_hen_id=?", (lh_id,)).fetchone()
        if not existing:
            from datetime import date
            conn.execute(
                "INSERT INTO ho_so_bao_duong (lich_hen_id, ky_thuat_vien_id, ngay_thuc_hien, ghi_chu) VALUES (?,?,?,?)",
                (lh_id, uid, date.today().isoformat(), ghi_chu),
            )
        conn.commit()
        detail = _get_lich_hen_detail(conn, lh_id)
    finally:
        conn.close()
    return detail


@router.delete("/{lh_id}")
def delete_lich_hen(lh_id: int, _=Depends(require_role("quan_tri"))):
    conn = get_db()
    try:
        row = conn.execute("SELECT * FROM lich_hen WHERE id=?", (lh_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Lịch hẹn không tồn tại")
        conn.execute("DELETE FROM lich_hen WHERE id=?", (lh_id,))
        conn.commit()
    finally:
        conn.close()
    return {"message": "Đã xóa lịch hẹn"}
