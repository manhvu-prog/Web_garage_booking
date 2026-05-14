import urllib.request, json

BASE = "http://localhost:8000"

# 1. Login admin
login_data = json.dumps({"email": "admin@autocare.vn", "mat_khau": "admin123"}).encode()
req = urllib.request.Request(f"{BASE}/auth/login", data=login_data,
                              headers={"Content-Type": "application/json"}, method="POST")
with urllib.request.urlopen(req) as r:
    token = json.loads(r.read())["access_token"]
print("LOGIN OK, token:", token[:30], "...")

def get(path):
    req = urllib.request.Request(f"{BASE}{path}",
                                  headers={"Authorization": f"Bearer {token}"})
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

# 2. Danh sach dich vu
dvs = get("/dich-vu")
print(f"\n/dich-vu: {len(dvs)} services")
for d in dvs:
    print(f"  [{d['id']}] {d['ten_dich_vu']} - {d['gia_tien']:,.0f} dong")

# 3. Search khong dau
r3 = get("/dich-vu?q=dau")
print(f"\n/dich-vu?q=dau: {len(r3)} results -> {[x['ten_dich_vu'] for x in r3]}")

r4 = get("/dich-vu?q=kiem tra")
print(f"/dich-vu?q=kiem tra: {len(r4)} results -> {[x['ten_dich_vu'] for x in r4]}")

# 4. Danh sach nguoi dung
users = get("/nguoi-dung")
print(f"\n/nguoi-dung: {len(users)} users")
for u in users:
    print(f"  [{u['id']}] {u['ho_ten']} ({u['vai_tro']})")

# 5. Lich hen
lh = get("/lich-hen")
print(f"\n/lich-hen: {len(lh)} appointments")
for l in lh[:3]:
    print(f"  [{l['id']}] {l['trang_thai']} - {l['bien_so_xe']} - {l['ngay']}")

# 6. Dashboard admin
dash = get("/dashboard/admin")
print(f"\n/dashboard/admin:")
print(f"  Lich hen hom nay: {dash['tong_lich_hen_hom_nay']}")
print(f"  Tong nguoi dung: {dash['tong_nguoi_dung']}")
print(f"  Hoa don chua tt: {dash['hoa_don_chua_thanh_toan']}")

# 7. Search admin users
su = get("/search/admin/nguoi-dung?q=nguyen")
print(f"\n/search/admin/nguoi-dung?q=nguyen: {len(su)} users -> {[x['ho_ten'] for x in su]}")

print("\n✅ ALL TESTS PASSED!")
