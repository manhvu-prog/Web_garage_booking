"""
Chuẩn hóa chuỗi để tìm kiếm tiếng Việt không phân biệt dấu (ASCII thường).
"""
import unicodedata
from typing import Optional


def normalize_search_text(value: Optional[str]) -> str:
    if value is None:
        return ""
    s = unicodedata.normalize("NFD", str(value))
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = s.replace("đ", "d").replace("Đ", "D")
    return s.lower()
