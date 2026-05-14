"""
routers/dashboard.py – Dashboard thống kê + Hồ sơ bảo dưỡng
"""
from datetime import date
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from database import get_db
from auth import get_current_user, require_role
from schemas import CreateHoSoBaoDuongRequest

router = APIRouter(tags=["Dashboard & Hồ sơ"])


# ─────────────────────────────────────────────────────────
# DASHBOARD
# ─────────────────────────────────────────────────────────

@router.get("/dashboard/admin")
def dashboard_admin(
    ngay: Optional[str] = Query(None, description="Ngày thống kê, mặc định hôm nay"),
    _=Depends(require_role("quan_tri")),
):
    target = ngay or date.today().isoformat()
    conn = get_db()

    appts_today = conn.execute("""
        SELECT COUNT(*) FROM lich_hen lh
        JOIN khung_gio kg ON kg.id = lh.khung_gio_id
        WHERE kg.ngay = ? AND lh.trang_thai != 'da_huy'
    """, (target,)).fetchone()[0]

    total_users = conn.execute(
        "SELECT COUNT(*) FROM nguoi_dung WHERE trang_thai != 'da_xoa'"
    ).fetchone()[0]

    doanh_thu = conn.execute("""
        SELECT COALESCE(SUM(hd.tong_tien), 0) FROM hoa_don hd
        JOIN lich_hen lh ON lh.id = hd.lich_hen_id
        JOIN khung_gio kg ON kg.id = lh.khung_gio_id
        WHERE kg.ngay = ? AND hd.trang_thai = 'da_thanh_toan'
    """, (target,)).fetchone()[0]

    doanh_thu_thang_nay = conn.execute("""
        SELECT COALESCE(SUM(hd.tong_tien), 0) FROM hoa_don hd
        JOIN lich_hen lh ON lh.id = hd.lich_hen_id
        JOIN khung_gio kg ON kg.id = lh.khung_gio_id
        WHERE DATE_FORMAT(kg.ngay, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m')
          AND hd.trang_thai = 'da_thanh_toan'
    """).fetchone()[0]

    doanh_thu_thang_truoc = conn.execute("""
        SELECT COALESCE(SUM(hd.tong_tien), 0) FROM hoa_don hd
        JOIN lich_hen lh ON lh.id = hd.lich_hen_id
        JOIN khung_gio kg ON kg.id = lh.khung_gio_id
        WHERE DATE_FORMAT(kg.ngay, '%Y-%m') = DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 MONTH), '%Y-%m')
          AND hd.trang_thai = 'da_thanh_toan'
    """).fetchone()[0]

    doanh_thu_theo_thang = conn.execute("""
        SELECT DATE_FORMAT(kg.ngay, '%Y-%m') AS thang,
               COUNT(hd.id) AS tong_hoa_don,
               COALESCE(SUM(CASE WHEN hd.trang_thai='da_thanh_toan' THEN hd.tong_tien ELSE 0 END), 0) AS da_thu,
               COALESCE(SUM(CASE WHEN hd.trang_thai='chua_thanh_toan' THEN hd.tong_tien ELSE 0 END), 0) AS chua_thu
        FROM hoa_don hd
        JOIN lich_hen lh ON lh.id = hd.lich_hen_id
        JOIN khung_gio kg ON kg.id = lh.khung_gio_id
        WHERE kg.ngay >= DATE_SUB(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 6 MONTH)
          AND hd.trang_thai != 'da_huy'
        GROUP BY DATE_FORMAT(kg.ngay, '%Y-%m')
        ORDER BY thang
    """).fetchall()

    chua_tt = conn.execute(
        "SELECT COUNT(*) FROM hoa_don WHERE trang_thai='chua_thanh_toan'"
    ).fetchone()[0]

    # Lịch hẹn hôm nay (top )
    appts = conn.execute("""
        SELECT lh.id, lh.trang_thai, nd.ho_ten AS ten_kh, xe.bien_so_xe,
               kg.gio_bat_dau, kg.gio_ket_thuc, nv.ho_ten AS ten_nv
        FROM lich_hen lh
        JOIN nguoi_dung nd ON nd.id = lh.nguoi_dung_id
        JOIN xe ON xe.id = lh.xe_id
        JOIN khung_gio kg ON kg.id = lh.khung_gio_id
        LEFT JOIN nguoi_dung nv ON nv.id = lh.nhan_vien_phu_trach_id
        WHERE kg.ngay = ? AND lh.trang_thai != 'da_huy'
        ORDER BY kg.gio_bat_dau LIMIT 10
    """, (target,)).fetchall()

    # Hóa đơn chưa thanh toán
    unpaid = conn.execute("""
        SELECT hd.id, hd.tong_tien, nd.ho_ten AS ten_kh, xe.bien_so_xe
        FROM hoa_don hd
        JOIN lich_hen lh ON lh.id = hd.lich_hen_id
        JOIN nguoi_dung nd ON nd.id = lh.nguoi_dung_id
        JOIN xe ON xe.id = lh.xe_id
        WHERE hd.trang_thai = 'chua_thanh_toan'
        ORDER BY hd.id LIMIT 10
    """).fetchall()

    conn.close()
    return {
        "ngay": target,
        "tong_lich_hen_hom_nay": appts_today,
        "tong_nguoi_dung": total_users,
        "doanh_thu_hom_nay": doanh_thu,
        "hoa_don_chua_thanh_toan": chua_tt,
        "lich_hen_hom_nay": [dict(r) for r in appts],
        "hoa_don_chua_thu": [dict(r) for r in unpaid],
        "doanh_thu_thang_nay": doanh_thu_thang_nay,
        "doanh_thu_thang_truoc": doanh_thu_thang_truoc,
        "doanh_thu_theo_thang": [dict(r) for r in doanh_thu_theo_thang],
    }



# ─────────────────────────────────────────────────────────
# BÁO CÁO DOANH THU THEO NĂM (biểu đồ cột)
# ─────────────────────────────────────────────────────────

@router.get("/dashboard/bao-cao-doanh-thu")
def bao_cao_doanh_thu(
    nam: int = Query(..., description="Năm cần báo cáo, ví dụ: 2026"),
    _=Depends(require_role("quan_tri")),
):
   
    conn = get_db()
    try:
        rows = conn.execute("""
            SELECT
                MONTH(kg.ngay)           AS thang,
                COALESCE(SUM(hd.tong_tien), 0) AS tong_tien,
                COUNT(hd.id)             AS so_hoa_don
            FROM hoa_don hd
            JOIN lich_hen lh ON lh.id = hd.lich_hen_id
            JOIN khung_gio kg ON kg.id = lh.khung_gio_id
            WHERE YEAR(kg.ngay) = %s
              AND hd.trang_thai = 'da_thanh_toan'
            GROUP BY MONTH(kg.ngay)
            ORDER BY thang
        """, (nam,)).fetchall()
    finally:
        conn.close()
    return [dict(r) for r in rows]


# ─────────────────────────────────────────────────────────
# BÁO CÁO DỊCH VỤ THEO THÁNG (biểu đồ tròn)
# ─────────────────────────────────────────────────────────

@router.get("/dashboard/bao-cao-dich-vu")
def bao_cao_dich_vu(
    nam: int = Query(..., description="Năm"),
    thang: int = Query(..., description="Tháng (1-12)"),
    _=Depends(require_role("quan_tri")),
):
    """
    Trả về số lượt thực hiện từng dịch vụ trong tháng `thang`/`nam`,
    chỉ tính hóa đơn đã thanh toán.
    """
    conn = get_db()
    try:
        rows = conn.execute("""
            SELECT
                dv.ten_dich_vu,
                COUNT(ct.dich_vu_id) AS so_luot
            FROM chi_tiet_lich_hen ct
            JOIN dich_vu dv ON dv.id = ct.dich_vu_id
            JOIN lich_hen lh ON lh.id = ct.lich_hen_id
            JOIN hoa_don hd ON hd.lich_hen_id = lh.id
            JOIN khung_gio kg ON kg.id = lh.khung_gio_id
            WHERE YEAR(kg.ngay) = %s
              AND MONTH(kg.ngay) = %s
              AND hd.trang_thai = 'da_thanh_toan'
            GROUP BY dv.id, dv.ten_dich_vu
            ORDER BY so_luot DESC
        """, (nam, thang)).fetchall()
    finally:
        conn.close()
    return [dict(r) for r in rows]


@router.get("/dashboard/khach-hang")
def dashboard_khach_hang(current_user=Depends(get_current_user)):
    uid = int(current_user["sub"])
    conn = get_db()

    sap_toi = conn.execute("""
        SELECT lh.id, lh.trang_thai, xe.bien_so_xe, xe.hang_xe, xe.dong_xe,
               kg.ngay, kg.gio_bat_dau, kg.gio_ket_thuc
        FROM lich_hen lh
        JOIN xe ON xe.id = lh.xe_id
        JOIN khung_gio kg ON kg.id = lh.khung_gio_id
        WHERE lh.nguoi_dung_id = ?
          AND lh.trang_thai NOT IN ('hoan_thanh', 'da_huy')
        ORDER BY kg.ngay, kg.gio_bat_dau
    """, (uid,)).fetchall()

    # Dịch vụ cho mỗi lịch hẹn
    sap_toi_list = []
    for r in sap_toi:
        d = dict(r)
        dv = conn.execute("""
            SELECT d.ten_dich_vu FROM dich_vu d
            JOIN chi_tiet_lich_hen ct ON ct.dich_vu_id = d.id
            WHERE ct.lich_hen_id = ?
        """, (d["id"],)).fetchall()
        d["dich_vu"] = [x["ten_dich_vu"] for x in dv]
        sap_toi_list.append(d)

    xe = conn.execute("SELECT * FROM xe WHERE nguoi_dung_id=?", (uid,)).fetchall()

    tong_lich_hen = conn.execute(
        "SELECT COUNT(*) FROM lich_hen WHERE nguoi_dung_id=?", (uid,)
    ).fetchone()[0]

    conn.close()
    return {
        "lich_hen_sap_toi": sap_toi_list,
        "xe_cua_toi": [dict(r) for r in xe],
        "tong_lich_hen": tong_lich_hen,
    }


@router.get("/dashboard/nhan-vien")
def dashboard_nhan_vien(
    ngay: Optional[str] = Query(None),
    current_user=Depends(require_role("nhan_vien", "quan_tri")),
):
    uid = int(current_user["sub"])
    target = ngay or date.today().isoformat()
    conn = get_db()

    # Lịch hẹn hôm nay
    chua_nhan = conn.execute("""
        SELECT COUNT(*) FROM lich_hen lh
        JOIN khung_gio kg ON kg.id = lh.khung_gio_id
        WHERE kg.ngay = ? AND lh.trang_thai = 'cho_thuc_hien'
    """, (target,)).fetchone()[0]

    cua_minh = conn.execute("""
        SELECT COUNT(*) FROM lich_hen lh
        JOIN khung_gio kg ON kg.id = lh.khung_gio_id
        WHERE kg.ngay = ? AND lh.nhan_vien_phu_trach_id = ? AND lh.trang_thai = 'dang_thuc_hien'
    """, (target, uid)).fetchone()[0]

    conn.close()
    return {
        "ngay": target,
        "lich_hen_chua_nhan": chua_nhan,
        "lich_hen_dang_phu_trach": cua_minh,
    }


# ─────────────────────────────────────────────────────────
# HỒ SƠ BẢO DƯỠNG
# ─────────────────────────────────────────────────────────

@router.get("/ho-so-bao-duong")
def list_ho_so(
    nguoi_dung_id: Optional[int] = Query(None),
    xe_id: Optional[int] = Query(None),
    current_user=Depends(get_current_user),
):
    uid = int(current_user["sub"])
    role = current_user["role"]
    conn = get_db()

    sql = """
        SELECT hs.*, nd.ho_ten AS ten_kh, xe.bien_so_xe,
               nv.ho_ten AS ten_ky_thuat_vien,
               kg.ngay, kg.gio_bat_dau
        FROM ho_so_bao_duong hs
        JOIN lich_hen lh ON lh.id = hs.lich_hen_id
        JOIN nguoi_dung nd ON nd.id = lh.nguoi_dung_id
        JOIN xe ON xe.id = lh.xe_id
        JOIN khung_gio kg ON kg.id = lh.khung_gio_id
        LEFT JOIN nguoi_dung nv ON nv.id = hs.ky_thuat_vien_id
        WHERE 1=1
    """
    params = []
    if role == "khach_hang":
        sql += " AND lh.nguoi_dung_id=?"; params.append(uid)
    elif nguoi_dung_id:
        sql += " AND lh.nguoi_dung_id=?"; params.append(nguoi_dung_id)
    if xe_id:
        sql += " AND lh.xe_id=?"; params.append(xe_id)

    sql += " ORDER BY hs.ngay_thuc_hien DESC"
    rows = conn.execute(sql, params).fetchall()

    # Gắn dịch vụ vào mỗi hồ sơ
    result = []
    for r in rows:
        d = dict(r)
        dv = conn.execute("""
            SELECT dv.ten_dich_vu FROM dich_vu dv
            JOIN chi_tiet_lich_hen ct ON ct.dich_vu_id = dv.id
            WHERE ct.lich_hen_id = ?
        """, (d["lich_hen_id"],)).fetchall()
        d["dich_vu"] = [x["ten_dich_vu"] for x in dv]
        result.append(d)

    conn.close()
    return result


@router.get("/ho-so-bao-duong/{hs_id}")
def get_ho_so(hs_id: int, current_user=Depends(get_current_user)):
    conn = get_db()
    row = conn.execute("SELECT * FROM ho_so_bao_duong WHERE id=?", (hs_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Hồ sơ không tồn tại")
    return dict(row)


@router.put("/ho-so-bao-duong/{hs_id}")
def update_ho_so(
    hs_id: int,
    body: CreateHoSoBaoDuongRequest,
    _=Depends(require_role("nhan_vien", "quan_tri")),
):
    conn = get_db()
    try:
        row = conn.execute("SELECT * FROM ho_so_bao_duong WHERE id=?", (hs_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Hồ sơ không tồn tại")
        conn.execute(
            "UPDATE ho_so_bao_duong SET ky_thuat_vien_id=?, ngay_thuc_hien=?, ghi_chu=? WHERE id=?",
            (body.ky_thuat_vien_id, body.ngay_thuc_hien, body.ghi_chu, hs_id),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM ho_so_bao_duong WHERE id=?", (hs_id,)).fetchone()
    finally:
        conn.close()
    return dict(row)
