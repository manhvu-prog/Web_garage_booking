
import os
import re
import hashlib
from collections.abc import Mapping

import mysql.connector
from mysql.connector import Error
from dotenv import load_dotenv

from text_normalize import normalize_search_text

# ── Load biến môi trường ──────────────────────────────────────────
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

DB_CONFIG = {
    "host":     os.getenv("DB_HOST", "localhost"),
    "port":     int(os.getenv("DB_PORT", 3306)),
    "user":     os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "database": os.getenv("DB_NAME", "garage_booking"),
    "charset":  "utf8mb4",
    "use_unicode": True,
    "autocommit": False,
}

# ── Helper: chuẩn hoá tìm kiếm tiếng Việt bằng SQL REPLACE ──────
# Dùng NFD decomposition: âm tiết → ký tự cơ bản + combining marks.
# MySQL REPLACE không xử lý Unicode combining, nên liệt kê tường minh.
_VIET_REPLACEMENTS = [
    # a
    ("ắ","a"),("ặ","a"),("ằ","a"),("ẳ","a"),("ẵ","a"),
    ("ấ","a"),("ậ","a"),("ầ","a"),("ẩ","a"),("ẫ","a"),
    ("á","a"),("à","a"),("ả","a"),("ã","a"),("ạ","a"),
    ("ă","a"),("â","a"),
    # e
    ("ế","e"),("ệ","e"),("ề","e"),("ể","e"),("ễ","e"),
    ("é","e"),("è","e"),("ẻ","e"),("ẽ","e"),("ẹ","e"),("ê","e"),
    # i
    ("í","i"),("ì","i"),("ỉ","i"),("ĩ","i"),("ị","i"),
    # o
    ("ố","o"),("ộ","o"),("ồ","o"),("ổ","o"),("ỗ","o"),
    ("ớ","o"),("ợ","o"),("ờ","o"),("ở","o"),("ỡ","o"),
    ("ó","o"),("ò","o"),("ỏ","o"),("õ","o"),("ọ","o"),
    ("ô","o"),("ơ","o"),
    # u
    ("ứ","u"),("ự","u"),("ừ","u"),("ử","u"),("ữ","u"),
    ("ú","u"),("ù","u"),("ủ","u"),("ũ","u"),("ụ","u"),("ư","u"),
    # y
    ("ý","y"),("ỳ","y"),("ỷ","y"),("ỹ","y"),("ỵ","y"),
    # d
    ("đ","d"),
]


def sql_search_norm(col: str) -> str:
    """
    Tạo chuỗi SQL REPLACE lồng nhau để chuẩn hoá tìm kiếm không dấu.
    Tương đương normalize_search_text() nhưng chạy phía MySQL.
    """
    expr = f"LOWER({col})"
    for src, dst in _VIET_REPLACEMENTS:
        expr = f"REPLACE({expr}, '{src}', '{dst}')"
    return expr


# ── RowProxy: mô phỏng sqlite3.Row (hỗ trợ cả [int] lẫn ['col']) ──
class RowProxy(Mapping):
    """Dict-row tương thích với sqlite3.Row API."""

    __slots__ = ("_data", "_keys")

    def __init__(self, data: dict):
        self._data = data
        self._keys = list(data.keys())

    # Hỗ trợ row[0] (int index) và row["col"] (str key)
    def __getitem__(self, key):
        if isinstance(key, int):
            return self._data[self._keys[key]]
        return self._data[key]

    def __iter__(self):
        return iter(self._data)

    def __len__(self):
        return len(self._data)

    def keys(self):
        return self._data.keys()

    def get(self, key, default=None):
        return self._data.get(key, default)

    def __repr__(self):
        return f"RowProxy({self._data!r})"


# ── MySQLCursorWrapper: trả về RowProxy từ fetch* ─────────────────
class MySQLCursorWrapper:
    """Bọc MySQL cursor để trả về RowProxy thay vì dict thuần."""

    __slots__ = ("_cur",)

    def __init__(self, cur):
        self._cur = cur

    def fetchone(self):
        row = self._cur.fetchone()
        return RowProxy(row) if row else None

    def fetchall(self):
        return [RowProxy(r) for r in (self._cur.fetchall() or [])]

    @property
    def lastrowid(self):
        return self._cur.lastrowid


# ── Regex patterns dùng cho _fix_sql ─────────────────────────────
_RE_SEARCH_NORM   = re.compile(r"search_norm\s*\(([^)]+)\)")
_RE_INSERT_IGNORE = re.compile(r"INSERT\s+OR\s+IGNORE", re.IGNORECASE)
_RE_CAST_TEXT     = re.compile(r"CAST\s*\(([^)]+)\s+AS\s+TEXT\)", re.IGNORECASE)
_RE_LAST_ROW      = re.compile(r"\blast_insert_rowid\s*\(\)", re.IGNORECASE)


def _fix_sql(sql: str) -> str:
    """Chuyển đổi SQLite SQL → MySQL SQL tự động."""
    sql = sql.replace("?", "%s")
    sql = _RE_SEARCH_NORM.sub(lambda m: sql_search_norm(m.group(1).strip()), sql)
    sql = _RE_INSERT_IGNORE.sub("INSERT IGNORE", sql)
    sql = _RE_CAST_TEXT.sub(r"CAST(\1 AS CHAR)", sql)
    sql = _RE_LAST_ROW.sub("LAST_INSERT_ID()", sql)
    return sql


# ── MySQLConnectionWrapper: API giống sqlite3.Connection ──────────
class MySQLConnectionWrapper:
    """
    Bọc mysql.connector.connection để các router dùng được API SQLite
    (conn.execute / conn.executemany / conn.commit / conn.close).
    """

    __slots__ = ("_conn", "_cur")

    def __init__(self, conn):
        self._conn = conn
        # buffered=True: kết quả được đọc hết ngay → tránh InternalError
        self._cur = conn.cursor(dictionary=True, buffered=True)

    def execute(self, sql: str, params=None) -> MySQLCursorWrapper:
        self._cur.execute(_fix_sql(sql), params or ())
        return MySQLCursorWrapper(self._cur)

    def executemany(self, sql: str, params_list) -> MySQLCursorWrapper:
        self._cur.executemany(_fix_sql(sql), params_list)
        return MySQLCursorWrapper(self._cur)

    def commit(self):
        self._conn.commit()

    def rollback(self):
        self._conn.rollback()

    def close(self):
        try:
            self._cur.close()
        except Exception:
            pass
        try:
            self._conn.close()
        except Exception:
            pass

    @property
    def lastrowid(self):
        return self._cur.lastrowid


# ── get_db: dùng trong mọi router ────────────────────────────────
def get_db() -> MySQLConnectionWrapper:
    conn = mysql.connector.connect(**DB_CONFIG)
    return MySQLConnectionWrapper(conn)


# ── init_db: tạo database + bảng + trigger + seed ────────────────
def init_db():
    """Tạo database, bảng, trigger (nếu chưa có), rồi seed dữ liệu mẫu."""

    db_name = DB_CONFIG["database"]

    # Bước 1: tạo database nếu chưa tồn tại
    cfg_no_db = {k: v for k, v in DB_CONFIG.items() if k != "database"}
    raw = mysql.connector.connect(**cfg_no_db)
    cur = raw.cursor()
    cur.execute(
        f"CREATE DATABASE IF NOT EXISTS `{db_name}` "
        f"CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
    )
    raw.commit()
    cur.close()
    raw.close()

    # Bước 2: kết nối vào database, tạo bảng & trigger
    raw = mysql.connector.connect(**DB_CONFIG)
    cur = raw.cursor()

    cur.execute("SET FOREIGN_KEY_CHECKS = 0")

    # ── NGƯỜI DÙNG ───────────────────────────────────────────────
    cur.execute("""
    CREATE TABLE IF NOT EXISTS nguoi_dung (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        ho_ten        VARCHAR(255) NOT NULL,
        email         VARCHAR(255) UNIQUE NOT NULL,
        so_dien_thoai VARCHAR(20)  UNIQUE NOT NULL,
        mat_khau_hash VARCHAR(255) NOT NULL,
        vai_tro  ENUM('khach_hang','nhan_vien','quan_tri') DEFAULT 'khach_hang',
        trang_thai ENUM('hoat_dong','tam_khoa','da_xoa')  DEFAULT 'hoat_dong',
        ngay_tao  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """)

    # ── XE ───────────────────────────────────────────────────────
    cur.execute("""
    CREATE TABLE IF NOT EXISTS xe (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        nguoi_dung_id INT NOT NULL,
        bien_so_xe    VARCHAR(20) UNIQUE NOT NULL,
        hang_xe       VARCHAR(100),
        dong_xe       VARCHAR(100),
        FOREIGN KEY (nguoi_dung_id) REFERENCES nguoi_dung(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """)

    # ── DỊCH VỤ ──────────────────────────────────────────────────
    cur.execute("""
    CREATE TABLE IF NOT EXISTS dich_vu (
        id                  INT AUTO_INCREMENT PRIMARY KEY,
        ten_dich_vu         VARCHAR(255) NOT NULL,
        gia_tien            DECIMAL(15,2) CHECK(gia_tien >= 0),
        thoi_gian_uoc_tinh  INT          CHECK(thoi_gian_uoc_tinh > 0)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """)

    # ── KHUNG GIỜ ────────────────────────────────────────────────
    cur.execute("""
    CREATE TABLE IF NOT EXISTS khung_gio (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        ngay          DATE NOT NULL,
        gio_bat_dau   TIME NOT NULL,
        gio_ket_thuc  TIME NOT NULL,
        so_luong_slot INT  NOT NULL CHECK(so_luong_slot > 0),
        UNIQUE KEY uq_ngay_gio (ngay, gio_bat_dau),
        CONSTRAINT chk_gio CHECK(gio_ket_thuc > gio_bat_dau)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """)

    # ── LỊCH HẸN ─────────────────────────────────────────────────
    cur.execute("""
    CREATE TABLE IF NOT EXISTS lich_hen (
        id                     INT AUTO_INCREMENT PRIMARY KEY,
        nguoi_dung_id          INT NOT NULL,
        xe_id                  INT NOT NULL,
        khung_gio_id           INT NOT NULL,
        nhan_vien_phu_trach_id INT DEFAULT NULL,
        trang_thai ENUM('cho_thuc_hien','dang_thuc_hien','hoan_thanh','da_huy')
                   DEFAULT 'cho_thuc_hien',
        ghi_chu    TEXT,
        ngay_tao   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (nguoi_dung_id)          REFERENCES nguoi_dung(id),
        FOREIGN KEY (xe_id)                  REFERENCES xe(id),
        FOREIGN KEY (khung_gio_id)           REFERENCES khung_gio(id),
        FOREIGN KEY (nhan_vien_phu_trach_id) REFERENCES nguoi_dung(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """)

    # ── CHI TIẾT LỊCH HẸN ────────────────────────────────────────
    cur.execute("""
    CREATE TABLE IF NOT EXISTS chi_tiet_lich_hen (
        lich_hen_id INT NOT NULL,
        dich_vu_id  INT NOT NULL,
        PRIMARY KEY (lich_hen_id, dich_vu_id),
        FOREIGN KEY (lich_hen_id) REFERENCES lich_hen(id) ON DELETE CASCADE,
        FOREIGN KEY (dich_vu_id)  REFERENCES dich_vu(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """)

    # ── HỒ SƠ BẢO DƯỠNG ─────────────────────────────────────────
    cur.execute("""
    CREATE TABLE IF NOT EXISTS ho_so_bao_duong (
        id               INT AUTO_INCREMENT PRIMARY KEY,
        lich_hen_id      INT UNIQUE,
        ky_thuat_vien_id INT,
        ngay_thuc_hien   DATE,
        ghi_chu          TEXT,
        FOREIGN KEY (lich_hen_id)      REFERENCES lich_hen(id),
        FOREIGN KEY (ky_thuat_vien_id) REFERENCES nguoi_dung(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """)

    # ── HÓA ĐƠN ─────────────────────────────────────────────────
    cur.execute("""
    CREATE TABLE IF NOT EXISTS hoa_don (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        lich_hen_id INT UNIQUE,
        tong_tien   DECIMAL(15,2) DEFAULT 0,
        trang_thai  ENUM('chua_thanh_toan','da_thanh_toan','da_huy')
                    DEFAULT 'chua_thanh_toan',
        ngay_tao    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (lich_hen_id) REFERENCES lich_hen(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """)

    cur.execute("SET FOREIGN_KEY_CHECKS = 1")
    raw.commit()

    # ── TRIGGER: Chống overbooking ───────────────────────────────
    cur.execute("DROP TRIGGER IF EXISTS trg_slot_limit_insert")
    cur.execute("""
    CREATE TRIGGER trg_slot_limit_insert
    BEFORE INSERT ON lich_hen
    FOR EACH ROW
    BEGIN
        DECLARE v_count INT DEFAULT 0;
        DECLARE v_max   INT DEFAULT 0;
        SELECT COUNT(*) INTO v_count
          FROM lich_hen
         WHERE khung_gio_id = NEW.khung_gio_id
           AND trang_thai != 'da_huy';
        SELECT so_luong_slot INTO v_max
          FROM khung_gio
         WHERE id = NEW.khung_gio_id;
        IF v_count >= v_max THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Khung giờ đã đầy';
        END IF;
    END
    """)

    # ── TRIGGER: Tự động tạo hóa đơn ────────────────────────────
    cur.execute("DROP TRIGGER IF EXISTS trg_tao_hoa_don")
    cur.execute("""
    CREATE TRIGGER trg_tao_hoa_don
    AFTER INSERT ON lich_hen
    FOR EACH ROW
    BEGIN
        INSERT INTO hoa_don (lich_hen_id, tong_tien)
        VALUES (NEW.id, 0);
    END
    """)

    raw.commit()
    cur.close()
    raw.close()

    # Bước 3: seed dữ liệu mẫu
    wrapped = get_db()
    try:
        _seed(wrapped)
    finally:
        wrapped.close()


# ── Helpers ───────────────────────────────────────────────────────
def _hash(pw: str) -> str:
    return hashlib.sha256(pw.encode()).hexdigest()


def _seed(conn: MySQLConnectionWrapper):
    """Chèn dữ liệu mẫu nếu bảng chưa có gì."""
    if conn.execute("SELECT COUNT(*) FROM nguoi_dung").fetchone()[0] > 0:
        return  # Đã có dữ liệu, bỏ qua

    # ── Người dùng ───────────────────────────────────────────────
    users = [
        ("Nguyễn Văn A",   "a@gmail.com",        "0901234567", _hash("123456"),   "khach_hang"),
        ("Trần Thị B",     "b@gmail.com",        "0902345678", _hash("123456"),   "nhan_vien"),
        ("Nguyễn Văn Nam", "nam@gmail.com",       "0903000001", _hash("123456"),   "nhan_vien"),
        ("Lê Văn C",       "c@gmail.com",         "0903456789", _hash("123456"),   "khach_hang"),
        ("Admin",          "admin@autocare.vn",  "0900000000", _hash("admin123"), "quan_tri"),
    ]
    conn.executemany(
        "INSERT INTO nguoi_dung (ho_ten, email, so_dien_thoai, mat_khau_hash, vai_tro) "
        "VALUES (?,?,?,?,?)",
        users,
    )

    # ── Xe ───────────────────────────────────────────────────────
    cars = [
        (1, "29A-12345", "Toyota", "Camry"),
        (1, "29A-99999", "Honda",  "CR-V"),
        (2, "30B-67890", "Honda",  "Civic"),
        (4, "31C-11111", "Mazda",  "3"),
    ]
    conn.executemany(
        "INSERT INTO xe (nguoi_dung_id, bien_so_xe, hang_xe, dong_xe) VALUES (?,?,?,?)",
        cars,
    )

    # ── Dịch vụ ──────────────────────────────────────────────────
    services = [
        ("Bảo dưỡng định kỳ",      350000, 90),
        ("Thay dầu máy",            180000, 45),
        ("Kiểm tra hệ thống phanh", 120000, 60),
        ("Rửa xe",                   80000, 30),
        ("Thay lốc máy",            500000, 120),
        ("Sửa điều hòa",            200000, 60),
        ("Kiểm tra hệ thống điện",  150000, 45),
        ("Thay má phanh",           250000, 60),
    ]
    conn.executemany(
        "INSERT INTO dich_vu (ten_dich_vu, gia_tien, thoi_gian_uoc_tinh) VALUES (?,?,?)",
        services,
    )

    # ── Khung giờ ────────────────────────────────────────────────
    slots = [
        ("2026-04-10", "08:00", "09:30", 3),
        ("2026-04-10", "10:00", "11:30", 3),
        ("2026-04-10", "13:00", "14:30", 3),
        ("2026-04-10", "15:00", "16:30", 3),
        ("2026-04-11", "08:00", "09:30", 3),
        ("2026-04-11", "10:00", "11:30", 3),
        ("2026-04-11", "13:00", "14:30", 3),
        ("2026-04-11", "15:00", "16:30", 3),
    ]
    conn.executemany(
        "INSERT INTO khung_gio (ngay, gio_bat_dau, gio_ket_thuc, so_luong_slot) VALUES (?,?,?,?)",
        slots,
    )

    conn.commit()  # commit trước khi insert lich_hen (trigger cần đọc khung_gio đã commit)

    # ── Lịch hẹn ─────────────────────────────────────────────────
    # Trigger trg_slot_limit_insert + trg_tao_hoa_don tự động chạy
    appts = [
        (1, 1, 1, 3,    "dang_thuc_hien", None),
        (2, 3, 1, 2,    "dang_thuc_hien", None),
        (4, 4, 1, None, "cho_thuc_hien",  None),
        (1, 2, 2, None, "cho_thuc_hien",  None),
        (4, 4, 2, 3,    "dang_thuc_hien", None),
        (1, 2, 3, 2,    "hoan_thanh",     None),
    ]
    # Insert từng lịch hẹn để trigger chạy đúng (executemany + trigger đôi khi xung đột)
    for appt in appts:
        conn.execute(
            "INSERT INTO lich_hen "
            "(nguoi_dung_id, xe_id, khung_gio_id, nhan_vien_phu_trach_id, trang_thai, ghi_chu) "
            "VALUES (?,?,?,?,?,?)",
            appt,
        )
    conn.commit()

    # ── Chi tiết lịch hẹn ────────────────────────────────────────
    details = [
        (1, 1), (1, 2),
        (2, 3),
        (3, 1), (3, 4),
        (4, 6), (4, 7),
        (5, 8),
        (6, 2), (6, 4),
    ]
    conn.executemany(
        "INSERT OR IGNORE INTO chi_tiet_lich_hen (lich_hen_id, dich_vu_id) VALUES (?,?)",
        details,
    )

    # Cập nhật tổng tiền
    conn.execute("""
        UPDATE hoa_don SET tong_tien = (
            SELECT COALESCE(SUM(d.gia_tien), 0)
            FROM chi_tiet_lich_hen ct
            JOIN dich_vu d ON d.id = ct.dich_vu_id
            WHERE ct.lich_hen_id = hoa_don.lich_hen_id
        )
    """)

    # Đánh dấu hóa đơn hoàn thành là đã thanh toán
    conn.execute("""
        UPDATE hoa_don SET trang_thai = 'da_thanh_toan'
        WHERE lich_hen_id IN (SELECT id FROM lich_hen WHERE trang_thai = 'hoan_thanh')
    """)

    # ── Hồ sơ bảo dưỡng ─────────────────────────────────────────
    conn.execute("""
        INSERT INTO ho_so_bao_duong (lich_hen_id, ky_thuat_vien_id, ngay_thuc_hien, ghi_chu)
        VALUES (6, 3, '2026-04-10', 'Thay dầu 5W30, rửa xe sạch sẽ')
    """)

    conn.commit()
    print("✅ Seed dữ liệu mẫu thành công!")
