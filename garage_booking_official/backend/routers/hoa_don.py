"""
routers/hoa_don.py – Quản lý hóa đơn
Admin: xem tất cả, xác nhận thanh toán
Khách hàng: xem hóa đơn của mình
"""
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from database import get_db
from auth import get_current_user, require_role
from text_normalize import normalize_search_text

router = APIRouter(prefix="/hoa-don", tags=["Hóa đơn"])


def _enrich_invoice(conn, row: dict) -> dict:
    """Bổ sung thông tin lịch hẹn, khách hàng, xe vào hóa đơn."""
    lh = conn.execute("""
        SELECT lh.*, nd.ho_ten AS ten_kh, xe.bien_so_xe, xe.hang_xe, xe.dong_xe,
               kg.ngay, kg.gio_bat_dau, kg.gio_ket_thuc
        FROM lich_hen lh
        JOIN nguoi_dung nd ON nd.id = lh.nguoi_dung_id
        JOIN xe ON xe.id = lh.xe_id
        JOIN khung_gio kg ON kg.id = lh.khung_gio_id
        WHERE lh.id = ?
    """, (row["lich_hen_id"],)).fetchone()

    dv = conn.execute("""
        SELECT d.ten_dich_vu, d.gia_tien FROM dich_vu d
        JOIN chi_tiet_lich_hen ct ON ct.dich_vu_id = d.id
        WHERE ct.lich_hen_id = ?
    """, (row["lich_hen_id"],)).fetchall()

    return {
        **row,
        "lich_hen": dict(lh) if lh else None,
        "dich_vu": [dict(d) for d in dv],
    }


@router.get("")
def list_hoa_don(
    trang_thai: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    current_user=Depends(get_current_user),
):
    conn = get_db()
    uid = int(current_user["sub"])
    role = current_user["role"]

    sql = """
        SELECT hd.* FROM hoa_don hd
        JOIN lich_hen lh ON lh.id = hd.lich_hen_id
        JOIN nguoi_dung nd ON nd.id = lh.nguoi_dung_id
        JOIN xe ON xe.id = lh.xe_id
        WHERE 1=1
    """
    params = []

    if role == "khach_hang":
        sql += " AND lh.nguoi_dung_id=?"; params.append(uid)

    if trang_thai:
        sql += " AND hd.trang_thai=?"; params.append(trang_thai)

    if q:
        kw = f"%{normalize_search_text(q)}%"
        sql += """ AND (
            search_norm(CAST(hd.id AS TEXT)) LIKE ? OR
            search_norm(nd.ho_ten) LIKE ? OR
            search_norm(xe.bien_so_xe) LIKE ?
        )"""
        params += [kw, kw, kw]

    sql += " ORDER BY hd.id DESC"
    rows = conn.execute(sql, params).fetchall()
    result = [_enrich_invoice(conn, dict(r)) for r in rows]
    conn.close()
    return result


@router.get("/{hd_id}")
def get_hoa_don(hd_id: int, current_user=Depends(get_current_user)):
    conn = get_db()
    row = conn.execute("SELECT * FROM hoa_don WHERE id=?", (hd_id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Hóa đơn không tồn tại")

    uid = int(current_user["sub"])
    role = current_user["role"]

    if role == "khach_hang":
        lh = conn.execute("SELECT nguoi_dung_id FROM lich_hen WHERE id=?", (row["lich_hen_id"],)).fetchone()
        if not lh or lh["nguoi_dung_id"] != uid:
            conn.close()
            raise HTTPException(status_code=403, detail="Không có quyền truy cập")

    result = _enrich_invoice(conn, dict(row))
    conn.close()
    return result


@router.post("/{hd_id}/thanh-toan")
def xac_nhan_thanh_toan(hd_id: int, _=Depends(require_role("quan_tri", "nhan_vien"))):
    """Admin/Nhân viên xác nhận thanh toán hóa đơn."""
    conn = get_db()
    try:
        row = conn.execute("SELECT * FROM hoa_don WHERE id=?", (hd_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Hóa đơn không tồn tại")
        if row["trang_thai"] == "da_thanh_toan":
            raise HTTPException(status_code=400, detail="Hóa đơn đã được thanh toán rồi")
        if row["trang_thai"] == "da_huy":
            raise HTTPException(status_code=400, detail="Hóa đơn đã bị hủy")

        conn.execute("UPDATE hoa_don SET trang_thai='da_thanh_toan' WHERE id=?", (hd_id,))
        conn.commit()
        row = conn.execute("SELECT * FROM hoa_don WHERE id=?", (hd_id,)).fetchone()
        result = _enrich_invoice(conn, dict(row))
    finally:
        conn.close()
    return result


@router.get("/thong-ke/doanh-thu")
def doanh_thu(
    tu_ngay: Optional[str] = Query(None),
    den_ngay: Optional[str] = Query(None),
    _=Depends(require_role("quan_tri")),
):
    """Thống kê doanh thu theo khoảng thời gian."""
    conn = get_db()
    sql = """
        SELECT
            kg.ngay,
            COUNT(hd.id) AS so_hoa_don,
            SUM(CASE WHEN hd.trang_thai='da_thanh_toan' THEN hd.tong_tien ELSE 0 END) AS doanh_thu,
            SUM(CASE WHEN hd.trang_thai='chua_thanh_toan' THEN hd.tong_tien ELSE 0 END) AS chua_thu
        FROM hoa_don hd
        JOIN lich_hen lh ON lh.id = hd.lich_hen_id
        JOIN khung_gio kg ON kg.id = lh.khung_gio_id
        WHERE hd.trang_thai != 'da_huy'
    """
    params = []
    if tu_ngay:
        sql += " AND kg.ngay >= ?"; params.append(tu_ngay)
    if den_ngay:
        sql += " AND kg.ngay <= ?"; params.append(den_ngay)
    sql += " GROUP BY kg.ngay ORDER BY kg.ngay"

    rows = conn.execute(sql, params).fetchall()

    tong = conn.execute("""
        SELECT
            SUM(CASE WHEN hd.trang_thai='da_thanh_toan' THEN hd.tong_tien ELSE 0 END) AS tong_doanh_thu,
            SUM(CASE WHEN hd.trang_thai='chua_thanh_toan' THEN hd.tong_tien ELSE 0 END) AS tong_chua_thu,
            COUNT(CASE WHEN hd.trang_thai='da_thanh_toan' THEN 1 END) AS da_thanh_toan,
            COUNT(CASE WHEN hd.trang_thai='chua_thanh_toan' THEN 1 END) AS chua_thanh_toan
        FROM hoa_don hd
        JOIN lich_hen lh ON lh.id = hd.lich_hen_id
        JOIN khung_gio kg ON kg.id = lh.khung_gio_id
        WHERE hd.trang_thai != 'da_huy'
    """).fetchone()

    conn.close()
    return {
        "theo_ngay": [dict(r) for r in rows],
        "tong_hop": dict(tong),
    }
