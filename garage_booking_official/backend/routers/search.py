"""
routers/search.py – API tìm kiếm đầy đủ, map 1-1 với frontend

Trang                   | Tìm theo
------------------------|--------------------------------------------
Admin > Users           | tên, email, SĐT, vai trò  + filter tab vai trò
Admin > Services        | tên dịch vụ
Admin > Invoices        | mã HĐ, tên KH, SĐT, biển số, dịch vụ + filter tab trạng thái
Admin > Schedule/Slots  | giờ bắt đầu/kết thúc (theo ngày)
Staff > Today           | biển số, hãng, tên KH, SĐT, tên dịch vụ (theo ngày + slot)
Staff > My History      | biển số, hãng, tên KH, SĐT, ngày, dịch vụ
Customer > My Cars      | biển số, hãng, dòng xe
Customer > History      | biển số, hãng, dòng xe, dịch vụ + filter tab trạng thái
Customer > Invoices     | mã HĐ, biển số, hãng, dịch vụ + filter tab trạng thái
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query
from database import get_db
from auth import get_current_user, require_role
from text_normalize import normalize_search_text

router = APIRouter(prefix="/search", tags=["Tìm kiếm"])


# ─────────────────────────────────────────────────────────────────
# ADMIN
# ─────────────────────────────────────────────────────────────────

@router.get("/admin/nguoi-dung")
def search_admin_users(
    q: Optional[str] = Query(None, description="Tìm theo tên, email, SĐT"),
    vai_tro: Optional[str] = Query(None, description="all | khach_hang | nhan_vien | quan_tri"),
    trang_thai: Optional[str] = Query(None, description="hoat_dong | tam_khoa | da_xoa"),
    _=Depends(require_role("quan_tri")),
):
    """Admin > Trang Users – topbar search + filter tab vai trò."""
    conn = get_db()
    sql = "SELECT id, ho_ten, email, so_dien_thoai, vai_tro, trang_thai, ngay_tao FROM nguoi_dung WHERE 1=1"
    params = []

    if vai_tro and vai_tro != "all":
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


@router.get("/admin/dich-vu")
def search_admin_services(
    q: Optional[str] = Query(None, description="Tìm theo tên dịch vụ"),
    _=Depends(require_role("quan_tri")),
):
    """Admin > Trang Services – topbar search."""
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


@router.get("/admin/hoa-don")
def search_admin_invoices(
    q: Optional[str] = Query(None, description="Mã HĐ, tên KH, SĐT, biển số, dịch vụ"),
    trang_thai: Optional[str] = Query(None, description="all | chua_thanh_toan | da_thanh_toan"),
    _=Depends(require_role("quan_tri")),
):
    """Admin > Trang Invoices – topbar search + filter tab trạng thái."""
    conn = get_db()
    sql = """
        SELECT hd.id, hd.tong_tien, hd.trang_thai, hd.ngay_tao,
               lh.id AS lich_hen_id,
               nd.ho_ten AS ten_kh, nd.so_dien_thoai,
               xe.bien_so_xe, xe.hang_xe, xe.dong_xe,
               kg.ngay, kg.gio_bat_dau, kg.gio_ket_thuc
        FROM hoa_don hd
        JOIN lich_hen lh ON lh.id = hd.lich_hen_id
        JOIN nguoi_dung nd ON nd.id = lh.nguoi_dung_id
        JOIN xe ON xe.id = lh.xe_id
        JOIN khung_gio kg ON kg.id = lh.khung_gio_id
        WHERE 1=1
    """
    params = []

    if trang_thai and trang_thai != "all":
        sql += " AND hd.trang_thai=?"; params.append(trang_thai)

    if q:
        kw = f"%{normalize_search_text(q)}%"
        sql += """
            AND (
                search_norm(CAST(hd.id AS TEXT)) LIKE ? OR
                search_norm(nd.ho_ten) LIKE ? OR
                search_norm(nd.so_dien_thoai) LIKE ? OR
                search_norm(xe.bien_so_xe) LIKE ? OR
                search_norm(xe.hang_xe) LIKE ? OR
                search_norm(xe.dong_xe) LIKE ? OR
                EXISTS (
                    SELECT 1 FROM chi_tiet_lich_hen ct
                    JOIN dich_vu dv ON dv.id = ct.dich_vu_id
                    WHERE ct.lich_hen_id = lh.id AND search_norm(dv.ten_dich_vu) LIKE ?
                )
            )
        """
        params += [kw, kw, kw, kw, kw, kw, kw]

    sql += " ORDER BY hd.id DESC"
    rows = conn.execute(sql, params).fetchall()

    # Gắn dịch vụ vào từng hóa đơn
    result = []
    for r in rows:
        d = dict(r)
        dv = conn.execute("""
            SELECT dv.ten_dich_vu, dv.gia_tien FROM dich_vu dv
            JOIN chi_tiet_lich_hen ct ON ct.dich_vu_id = dv.id
            WHERE ct.lich_hen_id = ?
        """, (d["lich_hen_id"],)).fetchall()
        d["dich_vu"] = [dict(x) for x in dv]
        result.append(d)

    conn.close()
    return result


@router.get("/admin/khung-gio")
def search_admin_slots(
    ngay: str = Query(..., description="Ngày cần xem YYYY-MM-DD"),
    q: Optional[str] = Query(None, description="Tìm theo giờ bắt đầu/kết thúc"),
    _=Depends(require_role("quan_tri")),
):
    """Admin > Schedule – tìm kiếm khung giờ trong ngày (inline search)."""
    conn = get_db()
    sql = """
        SELECT kg.*,
               (SELECT COUNT(*) FROM lich_hen lh
                WHERE lh.khung_gio_id = kg.id AND lh.trang_thai != 'da_huy') AS da_dat
        FROM khung_gio kg WHERE kg.ngay=?
    """
    params = [ngay]
    if q:
        kw = f"%{normalize_search_text(q)}%"
        sql += " AND (search_norm(kg.gio_bat_dau) LIKE ? OR search_norm(kg.gio_ket_thuc) LIKE ?)"
        params += [kw, kw]
    sql += " ORDER BY kg.gio_bat_dau"

    rows = conn.execute(sql, params).fetchall()
    conn.close()
    return [{**dict(r), "con_trong": max(0, r["so_luong_slot"] - r["da_dat"])} for r in rows]


# ─────────────────────────────────────────────────────────────────
# STAFF
# ─────────────────────────────────────────────────────────────────

@router.get("/staff/lich-hom-nay")
def search_staff_today(
    ngay: Optional[str] = Query(None, description="YYYY-MM-DD, mặc định hôm nay"),
    q: Optional[str] = Query(None, description="Biển số, tên KH, SĐT, tên dịch vụ"),
    current_user=Depends(require_role("nhan_vien", "quan_tri")),
):
    """Staff > Today – tìm kiếm trong lịch làm việc theo ngày."""
    from datetime import date as _date
    target = ngay or _date.today().isoformat()

    conn = get_db()
    sql = """
        SELECT lh.id, lh.trang_thai, lh.nhan_vien_phu_trach_id,
               nd.ho_ten AS ten_kh, nd.so_dien_thoai,
               xe.bien_so_xe, xe.hang_xe, xe.dong_xe,
               kg.id AS khung_gio_id, kg.ngay, kg.gio_bat_dau, kg.gio_ket_thuc,
               nv.ho_ten AS ten_nv
        FROM lich_hen lh
        JOIN nguoi_dung nd ON nd.id = lh.nguoi_dung_id
        JOIN xe ON xe.id = lh.xe_id
        JOIN khung_gio kg ON kg.id = lh.khung_gio_id
        LEFT JOIN nguoi_dung nv ON nv.id = lh.nhan_vien_phu_trach_id
        WHERE kg.ngay=? AND lh.trang_thai != 'da_huy'
    """
    params = [target]

    if q:
        kw = f"%{normalize_search_text(q)}%"
        sql += """
            AND (
                search_norm(xe.bien_so_xe) LIKE ? OR
                search_norm(xe.hang_xe) LIKE ? OR
                search_norm(xe.dong_xe) LIKE ? OR
                search_norm(nd.ho_ten) LIKE ? OR
                search_norm(nd.so_dien_thoai) LIKE ? OR
                EXISTS (
                    SELECT 1 FROM chi_tiet_lich_hen ct
                    JOIN dich_vu dv ON dv.id = ct.dich_vu_id
                    WHERE ct.lich_hen_id = lh.id AND search_norm(dv.ten_dich_vu) LIKE ?
                )
            )
        """
        params += [kw, kw, kw, kw, kw, kw]

    sql += " ORDER BY kg.gio_bat_dau"
    rows = conn.execute(sql, params).fetchall()

    result = []
    for r in rows:
        d = dict(r)
        dv = conn.execute("""
            SELECT dv.id, dv.ten_dich_vu, dv.gia_tien FROM dich_vu dv
            JOIN chi_tiet_lich_hen ct ON ct.dich_vu_id = dv.id
            WHERE ct.lich_hen_id = ?
        """, (d["id"],)).fetchall()
        d["dich_vu"] = [dict(x) for x in dv]
        result.append(d)

    conn.close()
    return result


@router.get("/staff/lich-su-cua-toi")
def search_staff_history(
    q: Optional[str] = Query(None, description="Biển số, tên KH, SĐT, ngày, dịch vụ"),
    trang_thai: Optional[str] = Query(None),
    current_user=Depends(require_role("nhan_vien", "quan_tri")),
):
    """Staff > My History – lịch sử các xe đã phụ trách."""
    uid = int(current_user["sub"])
    conn = get_db()

    sql = """
        SELECT lh.id, lh.trang_thai,
               nd.ho_ten AS ten_kh, nd.so_dien_thoai,
               xe.bien_so_xe, xe.hang_xe, xe.dong_xe,
               kg.ngay, kg.gio_bat_dau, kg.gio_ket_thuc,
               hs.ghi_chu AS ghi_chu_bao_duong
        FROM lich_hen lh
        JOIN nguoi_dung nd ON nd.id = lh.nguoi_dung_id
        JOIN xe ON xe.id = lh.xe_id
        JOIN khung_gio kg ON kg.id = lh.khung_gio_id
        LEFT JOIN ho_so_bao_duong hs ON hs.lich_hen_id = lh.id
        WHERE lh.nhan_vien_phu_trach_id=?
    """
    params = [uid]

    if trang_thai:
        sql += " AND lh.trang_thai=?"; params.append(trang_thai)

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
                EXISTS (
                    SELECT 1 FROM chi_tiet_lich_hen ct
                    JOIN dich_vu dv ON dv.id = ct.dich_vu_id
                    WHERE ct.lich_hen_id = lh.id AND search_norm(dv.ten_dich_vu) LIKE ?
                )
            )
        """
        params += [kw, kw, kw, kw, kw, kw, kw]

    sql += " ORDER BY kg.ngay DESC, kg.gio_bat_dau DESC"
    rows = conn.execute(sql, params).fetchall()

    result = []
    for r in rows:
        d = dict(r)
        dv = conn.execute("""
            SELECT dv.ten_dich_vu FROM dich_vu dv
            JOIN chi_tiet_lich_hen ct ON ct.dich_vu_id = dv.id
            WHERE ct.lich_hen_id = ?
        """, (d["id"],)).fetchall()
        d["dich_vu"] = [x["ten_dich_vu"] for x in dv]
        result.append(d)

    conn.close()
    return result


# ─────────────────────────────────────────────────────────────────
# CUSTOMER
# ─────────────────────────────────────────────────────────────────

@router.get("/customer/xe")
def search_customer_cars(
    q: Optional[str] = Query(None, description="Biển số, hãng xe, dòng xe"),
    current_user=Depends(get_current_user),
):
    """Customer > My Cars – tìm kiếm inline."""
    uid = int(current_user["sub"])
    conn = get_db()
    sql = "SELECT * FROM xe WHERE nguoi_dung_id=?"
    params = [uid]
    if q:
        kw = f"%{normalize_search_text(q)}%"
        sql += " AND (search_norm(bien_so_xe) LIKE ? OR search_norm(hang_xe) LIKE ? OR search_norm(dong_xe) LIKE ?)"
        params += [kw, kw, kw]
    rows = conn.execute(sql, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@router.get("/customer/lich-su")
def search_customer_history(
    q: Optional[str] = Query(None, description="Biển số, hãng xe, dòng xe, tên dịch vụ"),
    trang_thai: Optional[str] = Query(None, description="all | cho_thuc_hien | dang_thuc_hien | hoan_thanh | da_huy"),
    current_user=Depends(get_current_user),
):
    """Customer > History – tìm kiếm inline + filter tab trạng thái."""
    uid = int(current_user["sub"])
    conn = get_db()

    sql = """
        SELECT lh.id, lh.trang_thai, lh.ghi_chu,
               xe.bien_so_xe, xe.hang_xe, xe.dong_xe,
               kg.ngay, kg.gio_bat_dau, kg.gio_ket_thuc
        FROM lich_hen lh
        JOIN xe ON xe.id = lh.xe_id
        JOIN khung_gio kg ON kg.id = lh.khung_gio_id
        WHERE lh.nguoi_dung_id=?
    """
    params = [uid]

    if trang_thai and trang_thai != "all":
        sql += " AND lh.trang_thai=?"; params.append(trang_thai)

    if q:
        kw = f"%{normalize_search_text(q)}%"
        sql += """
            AND (
                search_norm(xe.bien_so_xe) LIKE ? OR
                search_norm(xe.hang_xe) LIKE ? OR
                search_norm(xe.dong_xe) LIKE ? OR
                EXISTS (
                    SELECT 1 FROM chi_tiet_lich_hen ct
                    JOIN dich_vu dv ON dv.id = ct.dich_vu_id
                    WHERE ct.lich_hen_id = lh.id AND search_norm(dv.ten_dich_vu) LIKE ?
                )
            )
        """
        params += [kw, kw, kw, kw]

    sql += " ORDER BY kg.ngay DESC, kg.gio_bat_dau DESC"
    rows = conn.execute(sql, params).fetchall()

    result = []
    for r in rows:
        d = dict(r)
        dv = conn.execute("""
            SELECT dv.ten_dich_vu FROM dich_vu dv
            JOIN chi_tiet_lich_hen ct ON ct.dich_vu_id = dv.id
            WHERE ct.lich_hen_id = ?
        """, (d["id"],)).fetchall()
        d["dich_vu"] = [x["ten_dich_vu"] for x in dv]
        result.append(d)

    conn.close()
    return result


@router.get("/customer/hoa-don")
def search_customer_invoices(
    q: Optional[str] = Query(None, description="Mã HĐ, biển số, hãng xe, dịch vụ"),
    trang_thai: Optional[str] = Query(None, description="all | chua_thanh_toan | da_thanh_toan | da_huy"),
    current_user=Depends(get_current_user),
):
    """Customer > Invoices – tìm kiếm inline + filter tab trạng thái."""
    uid = int(current_user["sub"])
    conn = get_db()

    sql = """
        SELECT hd.id, hd.tong_tien, hd.trang_thai, hd.ngay_tao,
               lh.id AS lich_hen_id,
               xe.bien_so_xe, xe.hang_xe, xe.dong_xe,
               kg.ngay, kg.gio_bat_dau, kg.gio_ket_thuc
        FROM hoa_don hd
        JOIN lich_hen lh ON lh.id = hd.lich_hen_id
        JOIN xe ON xe.id = lh.xe_id
        JOIN khung_gio kg ON kg.id = lh.khung_gio_id
        WHERE lh.nguoi_dung_id=?
    """
    params = [uid]

    if trang_thai and trang_thai != "all":
        sql += " AND hd.trang_thai=?"; params.append(trang_thai)

    if q:
        kw = f"%{normalize_search_text(q)}%"
        sql += """
            AND (
                search_norm(CAST(hd.id AS TEXT)) LIKE ? OR
                search_norm(xe.bien_so_xe) LIKE ? OR
                search_norm(xe.hang_xe) LIKE ? OR
                search_norm(xe.dong_xe) LIKE ? OR
                EXISTS (
                    SELECT 1 FROM chi_tiet_lich_hen ct
                    JOIN dich_vu dv ON dv.id = ct.dich_vu_id
                    WHERE ct.lich_hen_id = lh.id AND search_norm(dv.ten_dich_vu) LIKE ?
                )
            )
        """
        params += [kw, kw, kw, kw, kw]

    sql += " ORDER BY hd.id DESC"
    rows = conn.execute(sql, params).fetchall()

    result = []
    for r in rows:
        d = dict(r)
        dv = conn.execute("""
            SELECT dv.ten_dich_vu, dv.gia_tien FROM dich_vu dv
            JOIN chi_tiet_lich_hen ct ON ct.dich_vu_id = dv.id
            WHERE ct.lich_hen_id = ?
        """, (d["lich_hen_id"],)).fetchall()
        d["dich_vu"] = [dict(x) for x in dv]
        result.append(d)

    conn.close()
    return result
