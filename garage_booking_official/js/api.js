
const API_BASE = 'http://localhost:8080';

// -------------------------------------------------------
// Auth – lưu token & user trong sessionStorage
// -------------------------------------------------------
const Auth = {
  getToken() { return sessionStorage.getItem('access_token'); },
  getUser() { const u = sessionStorage.getItem('user'); return u ? JSON.parse(u) : null; },
  setSession(token, user) { sessionStorage.setItem('access_token', token); sessionStorage.setItem('user', JSON.stringify(user)); },
  clearSession() { sessionStorage.removeItem('access_token'); sessionStorage.removeItem('user'); },
  isLoggedIn() { return !!this.getToken(); },
};

// -------------------------------------------------------
// Hàm gọi API chung
// -------------------------------------------------------
async function apiRequest(method, path, body = null, requireAuth = true) {
  const headers = { 'Content-Type': 'application/json' };
  if (requireAuth) {
    const token = Auth.getToken();
    if (!token) { window.location.href = 'login.html'; return; }
    headers['Authorization'] = `Bearer ${token}`;
  }
  const options = { method, headers };
  if (body !== null) options.body = JSON.stringify(body);
  const res = await fetch(API_BASE + path, options);
  if (res.status === 401) { Auth.clearSession(); window.location.href = 'login.html'; return; }
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || `Lỗi ${res.status}`);
  return data;
}

const API = {
  // AUTH
  async login(email, mat_khau) { return apiRequest('POST', '/auth/login', { email, mat_khau }, false); },
  async register(ho_ten, email, so_dien_thoai, mat_khau) { return apiRequest('POST', '/auth/register', { ho_ten, email, so_dien_thoai, mat_khau }, false); },
  async getMe() { return apiRequest('GET', '/auth/me'); },

  // XE
  async getCars(params = {}) { const q = new URLSearchParams(params).toString(); return apiRequest('GET', `/xe${q ? '?' + q : ''}`); },
  async createCar(bien_so_xe, hang_xe, dong_xe) { return apiRequest('POST', '/xe', { bien_so_xe, hang_xe, dong_xe }); },
  async deleteCar(id) { return apiRequest('DELETE', `/xe/${id}`); },
  async updateCar(id, data) { return apiRequest('PUT', `/xe/${id}`, data); },

  // DỊCH VỤ – backend dùng thoi_gian_uoc_tinh
  async getDichVu(q = '') { return apiRequest('GET', `/dich-vu${q ? '?q=' + encodeURIComponent(q) : ''}`); },
  async createDichVu(ten_dich_vu, gia_tien, thoi_gian_uoc_tinh) { return apiRequest('POST', '/dich-vu', { ten_dich_vu, gia_tien, thoi_gian_uoc_tinh }); },
  async updateDichVu(id, data) { return apiRequest('PUT', `/dich-vu/${id}`, data); },
  async deleteDichVu(id) { return apiRequest('DELETE', `/dich-vu/${id}`); },

  // KHUNG GIỜ
  async getKhungGio(params = {}) { const q = new URLSearchParams(params).toString(); return apiRequest('GET', `/khung-gio${q ? '?' + q : ''}`); },
  async createKhungGio(ngay, gio_bat_dau, gio_ket_thuc, so_luong_slot) { return apiRequest('POST', '/khung-gio', { ngay, gio_bat_dau, gio_ket_thuc, so_luong_slot }); },
  async deleteKhungGio(id) { return apiRequest('DELETE', `/khung-gio/${id}`); },

  // LỊCH HẸN
  async getLichHen(params = {}) { const q = new URLSearchParams(params).toString(); return apiRequest('GET', `/lich-hen${q ? '?' + q : ''}`); },
  async getLichHenDetail(id) { return apiRequest('GET', `/lich-hen/${id}`); },
  async createLichHen(khung_gio_id, xe_id, dich_vu_ids, ghi_chu = '') { return apiRequest('POST', '/lich-hen', { khung_gio_id, xe_id, dich_vu_ids, ghi_chu }); },
  // Backend: PUT với body trang_thai=da_huy
  async huyLichHen(id) { return apiRequest('PUT', `/lich-hen/${id}`, { trang_thai: 'da_huy' }); },
  // Backend: POST /lich-hen/{id}/nhan-xe
  async nhanXe(id) { return apiRequest('POST', `/lich-hen/${id}/nhan-xe`); },
  // Backend: POST /lich-hen/{id}/hoan-thanh?ghi_chu=...  (query param, không phải body)
  async hoanThanh(id, ghi_chu = '') { const q = ghi_chu ? '?ghi_chu=' + encodeURIComponent(ghi_chu) : ''; return apiRequest('POST', `/lich-hen/${id}/hoan-thanh${q}`); },

  // HÓA ĐƠN
  async getHoaDon(params = {}) { const q = new URLSearchParams(params).toString(); return apiRequest('GET', `/hoa-don${q ? '?' + q : ''}`); },
  // Backend: POST /hoa-don/{id}/thanh-toan
  async thanhToanHoaDon(id) { return apiRequest('POST', `/hoa-don/${id}/thanh-toan`); },

  // NGƯỜI DÙNG
  async getNguoiDung(params = {}) { const q = new URLSearchParams(params).toString(); return apiRequest('GET', `/nguoi-dung${q ? '?' + q : ''}`); },
  async getNhanVien() { return apiRequest('GET', '/nguoi-dung/nhan-vien'); },
  async createNguoiDung(data) { return apiRequest('POST', '/nguoi-dung', data); },
  async updateNguoiDung(id, data) { return apiRequest('PUT', `/nguoi-dung/${id}`, data); },
  async deleteNguoiDung(id) { return apiRequest('DELETE', `/nguoi-dung/${id}`); },

  // DASHBOARD
  async getDashboardAdmin() { return apiRequest('GET', '/dashboard/admin'); },
  async getDashboardKhachHang() { return apiRequest('GET', '/dashboard/khach-hang'); },
  async getDashboardNhanVien() { return apiRequest('GET', '/dashboard/nhan-vien'); },

  // BÁO CÁO
  async getBaoCaoDoanhThu(nam) { return apiRequest('GET', `/dashboard/bao-cao-doanh-thu?nam=${nam}`); },
  async getBaoCaoDichVu(nam, thang) { return apiRequest('GET', `/dashboard/bao-cao-dich-vu?nam=${nam}&thang=${thang}`); },
};
