// =====================================================
// mock.js – Mock data chuẩn hóa theo field backend
// Tự động kích hoạt khi backend (localhost:8000) không phản hồi
// Load SAU api.js và app.js, TRƯỚC các file role (customer/staff/admin)
// =====================================================

// -------------------------------------------------------
// 1. MOCK DATA – field theo chuẩn backend FastAPI
// -------------------------------------------------------
const Mock = {
  // Dữ liệu runtime (có thể thay đổi trong session)
  _appointments: [
    {
      id: 1, trang_thai: 'dang_thuc_hien', ghi_chu: '',
      khung_gio: { id: 1, ngay: '2026-04-07', gio_bat_dau: '08:00', gio_ket_thuc: '09:30' },
      xe:        { id: 1, bien_so_xe: '29A-12345', hang_xe: 'Toyota', dong_xe: 'Camry' },
      khach_hang:{ id: 1, ho_ten: 'Nguyễn Văn A', so_dien_thoai: '0901234567' },
      nhan_vien: { id: 3, ho_ten: 'Nguyễn Văn Nam' },
      dich_vu:   [
        { id: 1, ten_dich_vu: 'Bảo dưỡng định kỳ',  gia_tien: 350000 },
        { id: 2, ten_dich_vu: 'Thay dầu máy',        gia_tien: 180000 },
      ],
    },
    {
      id: 2, trang_thai: 'dang_thuc_hien', ghi_chu: '',
      khung_gio: { id: 1, ngay: '2026-04-07', gio_bat_dau: '08:00', gio_ket_thuc: '09:30' },
      xe:        { id: 3, bien_so_xe: '30B-67890', hang_xe: 'Honda', dong_xe: 'Civic' },
      khach_hang:{ id: 2, ho_ten: 'Trần Thị B', so_dien_thoai: '0902345678' },
      nhan_vien: { id: 2, ho_ten: 'Trần Thị B' },
      dich_vu:   [{ id: 3, ten_dich_vu: 'Kiểm tra hệ thống phanh', gia_tien: 120000 }],
    },
    {
      id: 3, trang_thai: 'cho_thuc_hien', ghi_chu: '',
      khung_gio: { id: 1, ngay: '2026-04-07', gio_bat_dau: '08:00', gio_ket_thuc: '09:30' },
      xe:        { id: 4, bien_so_xe: '31C-11111', hang_xe: 'Mazda', dong_xe: '3' },
      khach_hang:{ id: 4, ho_ten: 'Lê Văn C', so_dien_thoai: '0903456789' },
      nhan_vien: null,
      dich_vu:   [
        { id: 1, ten_dich_vu: 'Bảo dưỡng định kỳ', gia_tien: 350000 },
        { id: 4, ten_dich_vu: 'Rửa xe',             gia_tien:  80000 },
      ],
    },
    {
      id: 4, trang_thai: 'hoan_thanh', ghi_chu: 'Thay dầu 5W30, rửa xe sạch sẽ',
      khung_gio: { id: 3, ngay: '2026-04-07', gio_bat_dau: '13:00', gio_ket_thuc: '14:30' },
      xe:        { id: 2, bien_so_xe: '29A-99999', hang_xe: 'Honda', dong_xe: 'CR-V' },
      khach_hang:{ id: 1, ho_ten: 'Nguyễn Văn A', so_dien_thoai: '0901234567' },
      nhan_vien: { id: 2, ho_ten: 'Trần Thị B' },
      dich_vu:   [
        { id: 2, ten_dich_vu: 'Thay dầu máy', gia_tien: 180000 },
        { id: 4, ten_dich_vu: 'Rửa xe',       gia_tien:  80000 },
      ],
    },
    {
      id: 5, trang_thai: 'cho_thuc_hien', ghi_chu: '',
      khung_gio: { id: 2, ngay: '2026-04-07', gio_bat_dau: '10:00', gio_ket_thuc: '11:30' },
      xe:        { id: 2, bien_so_xe: '29A-99999', hang_xe: 'Honda', dong_xe: 'CR-V' },
      khach_hang:{ id: 1, ho_ten: 'Nguyễn Văn A', so_dien_thoai: '0901234567' },
      nhan_vien: null,
      dich_vu:   [
        { id: 6, ten_dich_vu: 'Sửa điều hòa',             gia_tien: 200000 },
        { id: 7, ten_dich_vu: 'Kiểm tra hệ thống điện',   gia_tien: 150000 },
      ],
    },
    {
      id: 6, trang_thai: 'dang_thuc_hien', ghi_chu: '',
      khung_gio: { id: 2, ngay: '2026-04-07', gio_bat_dau: '10:00', gio_ket_thuc: '11:30' },
      xe:        { id: 4, bien_so_xe: '31C-11111', hang_xe: 'Mazda', dong_xe: '3' },
      khach_hang:{ id: 4, ho_ten: 'Lê Văn C', so_dien_thoai: '0903456789' },
      nhan_vien: { id: 3, ho_ten: 'Nguyễn Văn Nam' },
      dich_vu:   [{ id: 8, ten_dich_vu: 'Thay má phanh', gia_tien: 250000 }],
    },
  ],

  _invoices: [
    {
      id: 1, tong_tien: 530000, trang_thai: 'chua_thanh_toan',
      lich_hen: { id: 1, ten_kh: 'Nguyễn Văn A', bien_so_xe: '29A-12345', hang_xe: 'Toyota', dong_xe: 'Camry', ngay: '2026-04-07' },
      dich_vu: [
        { ten_dich_vu: 'Bảo dưỡng định kỳ', gia_tien: 350000 },
        { ten_dich_vu: 'Thay dầu máy',      gia_tien: 180000 },
      ],
    },
    {
      id: 2, tong_tien: 120000, trang_thai: 'da_thanh_toan',
      lich_hen: { id: 2, ten_kh: 'Trần Thị B', bien_so_xe: '30B-67890', hang_xe: 'Honda', dong_xe: 'Civic', ngay: '2026-04-07' },
      dich_vu: [{ ten_dich_vu: 'Kiểm tra hệ thống phanh', gia_tien: 120000 }],
    },
    {
      id: 3, tong_tien: 430000, trang_thai: 'chua_thanh_toan',
      lich_hen: { id: 3, ten_kh: 'Lê Văn C', bien_so_xe: '31C-11111', hang_xe: 'Mazda', dong_xe: '3', ngay: '2026-04-07' },
      dich_vu: [
        { ten_dich_vu: 'Bảo dưỡng định kỳ', gia_tien: 350000 },
        { ten_dich_vu: 'Rửa xe',            gia_tien:  80000 },
      ],
    },
    {
      id: 4, tong_tien: 260000, trang_thai: 'da_thanh_toan',
      lich_hen: { id: 4, ten_kh: 'Nguyễn Văn A', bien_so_xe: '29A-99999', hang_xe: 'Honda', dong_xe: 'CR-V', ngay: '2026-04-07' },
      dich_vu: [
        { ten_dich_vu: 'Thay dầu máy', gia_tien: 180000 },
        { ten_dich_vu: 'Rửa xe',       gia_tien:  80000 },
      ],
    },
  ],

  _slots: [
    { id: 1, ngay: '2026-04-07', gio_bat_dau: '08:00', gio_ket_thuc: '09:30', so_luong_slot: 3, da_dat: 2 },
    { id: 2, ngay: '2026-04-07', gio_bat_dau: '10:00', gio_ket_thuc: '11:30', so_luong_slot: 3, da_dat: 3 },
    { id: 3, ngay: '2026-04-07', gio_bat_dau: '13:00', gio_ket_thuc: '14:30', so_luong_slot: 3, da_dat: 1 },
    { id: 4, ngay: '2026-04-07', gio_bat_dau: '15:00', gio_ket_thuc: '16:30', so_luong_slot: 3, da_dat: 0 },
    { id: 5, ngay: '2026-04-08', gio_bat_dau: '08:00', gio_ket_thuc: '09:30', so_luong_slot: 3, da_dat: 1 },
    { id: 6, ngay: '2026-04-08', gio_bat_dau: '10:00', gio_ket_thuc: '11:30', so_luong_slot: 3, da_dat: 0 },
    { id: 7, ngay: '2026-04-08', gio_bat_dau: '13:00', gio_ket_thuc: '14:30', so_luong_slot: 3, da_dat: 2 },
    { id: 8, ngay: '2026-04-08', gio_bat_dau: '15:00', gio_ket_thuc: '16:30', so_luong_slot: 3, da_dat: 0 },
  ],

  _cars: [
    { id: 1, nguoi_dung_id: 1, bien_so_xe: '29A-12345', hang_xe: 'Toyota', dong_xe: 'Camry' },
    { id: 2, nguoi_dung_id: 1, bien_so_xe: '29A-99999', hang_xe: 'Honda',  dong_xe: 'CR-V'  },
    { id: 3, nguoi_dung_id: 2, bien_so_xe: '30B-67890', hang_xe: 'Honda',  dong_xe: 'Civic' },
    { id: 4, nguoi_dung_id: 4, bien_so_xe: '31C-11111', hang_xe: 'Mazda',  dong_xe: '3'     },
  ],

  _services: [
    { id: 1, ten_dich_vu: 'Bảo dưỡng định kỳ',       gia_tien: 350000, thoi_gian_phu_trach: 90  },
    { id: 2, ten_dich_vu: 'Thay dầu máy',             gia_tien: 180000, thoi_gian_phu_trach: 45  },
    { id: 3, ten_dich_vu: 'Kiểm tra hệ thống phanh',  gia_tien: 120000, thoi_gian_phu_trach: 60  },
    { id: 4, ten_dich_vu: 'Rửa xe',                   gia_tien:  80000, thoi_gian_phu_trach: 30  },
    { id: 5, ten_dich_vu: 'Thay lốc máy',             gia_tien: 500000, thoi_gian_phu_trach: 120 },
    { id: 6, ten_dich_vu: 'Sửa điều hòa',             gia_tien: 200000, thoi_gian_phu_trach: 60  },
    { id: 7, ten_dich_vu: 'Kiểm tra hệ thống điện',   gia_tien: 150000, thoi_gian_phu_trach: 45  },
    { id: 8, ten_dich_vu: 'Thay má phanh',            gia_tien: 250000, thoi_gian_phu_trach: 60  },
  ],

  _users: [
    { id: 1, ho_ten: 'Nguyễn Văn A',   email: 'a@gmail.com',       so_dien_thoai: '0901234567', vai_tro: 'khach_hang', trang_thai: 'hoat_dong' },
    { id: 2, ho_ten: 'Trần Thị B',     email: 'b@gmail.com',       so_dien_thoai: '0902345678', vai_tro: 'nhan_vien',  trang_thai: 'hoat_dong' },
    { id: 3, ho_ten: 'Nguyễn Văn Nam', email: 'nam@gmail.com',     so_dien_thoai: '0903000001', vai_tro: 'nhan_vien',  trang_thai: 'hoat_dong' },
    { id: 4, ho_ten: 'Lê Văn C',       email: 'c@gmail.com',       so_dien_thoai: '0903456789', vai_tro: 'khach_hang', trang_thai: 'hoat_dong' },
    { id: 5, ho_ten: 'Admin',          email: 'admin@autocare.vn', so_dien_thoai: '0900000000', vai_tro: 'quan_tri',   trang_thai: 'hoat_dong' },
  ],

  _nextId: 100,

  // -------------------------------------------------------
  // 2. HELPER – lấy currentUser từ session hoặc mặc định
  // -------------------------------------------------------
  currentUserId() {
    const u = Auth.getUser();
    return u?.id || 1;
  },

  // -------------------------------------------------------
  // 3. API HANDLERS – giả lập từng endpoint
  // -------------------------------------------------------

  login(email, mat_khau) {
    const userMap = {
      'a@gmail.com':       { id: 1, ho_ten: 'Nguyễn Văn A', vai_tro: 'khach_hang' },
      'b@gmail.com':       { id: 2, ho_ten: 'Trần Thị B',   vai_tro: 'nhan_vien'  },
      'nam@gmail.com':     { id: 3, ho_ten: 'Nguyễn Văn Nam', vai_tro: 'nhan_vien' },
      'c@gmail.com':       { id: 4, ho_ten: 'Lê Văn C',     vai_tro: 'khach_hang' },
      'admin@autocare.vn': { id: 5, ho_ten: 'Admin',         vai_tro: 'quan_tri'   },
    };
    const user = userMap[email];
    if (!user) throw new Error('Email không tồn tại');
    return { access_token: 'mock_token_' + user.id, user };
  },

  getMe() {
    const uid = this.currentUserId();
    return this._users.find(u => u.id === uid);
  },

  // XE
  getCars(params = {}) {
    const uid = params.nguoi_dung_id || this.currentUserId();
    const user = Auth.getUser();
    // Admin và nhân viên thấy tất cả xe
    if (user?.vai_tro === 'quan_tri' || user?.vai_tro === 'nhan_vien') return [...this._cars];
    return this._cars.filter(c => c.nguoi_dung_id === uid);
  },

  createCar(bien_so_xe, hang_xe, dong_xe) {
    const uid = this.currentUserId();
    const car = { id: ++this._nextId, nguoi_dung_id: uid, bien_so_xe, hang_xe, dong_xe };
    this._cars.push(car);
    return car;
  },

  deleteCar(id) {
    const i = this._cars.findIndex(c => c.id === id);
    if (i !== -1) this._cars.splice(i, 1);
    return { ok: true };
  },

  // DỊCH VỤ
  getDichVu() { return [...this._services]; },

  createDichVu(ten_dich_vu, gia_tien, thoi_gian_phu_trach) {
    const svc = { id: ++this._nextId, ten_dich_vu, gia_tien, thoi_gian_phu_trach };
    this._services.push(svc);
    return svc;
  },

  updateDichVu(id, data) {
    const i = this._services.findIndex(s => s.id === id);
    if (i !== -1) Object.assign(this._services[i], data);
    return this._services[i];
  },

  deleteDichVu(id) {
    const i = this._services.findIndex(s => s.id === id);
    if (i !== -1) this._services.splice(i, 1);
    return { ok: true };
  },

  // KHUNG GIỜ
  getKhungGio(params = {}) {
    let slots = [...this._slots];
    if (params.ngay) slots = slots.filter(s => s.ngay === params.ngay);
    return slots;
  },

  createKhungGio(ngay, gio_bat_dau, gio_ket_thuc, so_luong_slot) {
    const slot = { id: ++this._nextId, ngay, gio_bat_dau, gio_ket_thuc, so_luong_slot, da_dat: 0 };
    this._slots.push(slot);
    return slot;
  },

  deleteKhungGio(id) {
    const i = this._slots.findIndex(s => s.id === id);
    if (i !== -1) this._slots.splice(i, 1);
    return { ok: true };
  },

  // LỊCH HẸN
  getLichHen(params = {}) {
    const user = Auth.getUser();
    let list = [...this._appointments];

    // Lọc theo vai trò nếu không có params đặc biệt
    if (user?.vai_tro === 'khach_hang') {
      list = list.filter(a => a.khach_hang?.id === user.id);
    }
    if (params.nhan_vien_id) {
      list = list.filter(a => a.nhan_vien?.id === params.nhan_vien_id);
    }
    if (params.ngay) {
      list = list.filter(a => a.khung_gio?.ngay === params.ngay);
    }
    if (params.trang_thai && params.trang_thai !== 'all') {
      list = list.filter(a => a.trang_thai === params.trang_thai);
    }
    if (params.q) {
      const kw = normalizeSearchText(params.q);
      list = list.filter(a => {
        const svc = (a.dich_vu || []).map(s => normalizeSearchText(s.ten_dich_vu || '')).join(' ');
        return (
          normalizeSearchText(a.xe?.bien_so_xe).includes(kw) ||
          normalizeSearchText(a.xe?.hang_xe).includes(kw) ||
          normalizeSearchText(a.xe?.dong_xe).includes(kw) ||
          normalizeSearchText(a.khach_hang?.ho_ten).includes(kw) ||
          normalizeSearchText(a.khach_hang?.so_dien_thoai).includes(kw) ||
          normalizeSearchText(a.khung_gio?.ngay).includes(kw) ||
          normalizeSearchText(a.ghi_chu).includes(kw) ||
          svc.includes(kw)
        );
      });
    }
    return list;
  },

  getLichHenDetail(id) {
    const a = this._appointments.find(a => a.id === id);
    if (!a) throw new Error('Không tìm thấy lịch hẹn');
    return { ...a };
  },

  createLichHen(khung_gio_id, xe_id, dich_vu_ids, ghi_chu = '') {
    const user = Auth.getUser();
    const slot = this._slots.find(s => s.id === khung_gio_id);
    const xe   = this._cars.find(c => c.id === xe_id);
    const svcs = this._services.filter(s => dich_vu_ids.includes(s.id));
    if (!slot) throw new Error('Khung giờ không tồn tại');
    if (slot.da_dat >= slot.so_luong_slot) throw new Error('Khung giờ đã đầy');

    slot.da_dat++;
    const appt = {
      id: ++this._nextId,
      trang_thai: 'cho_thuc_hien',
      ghi_chu,
      khung_gio: { id: slot.id, ngay: slot.ngay, gio_bat_dau: slot.gio_bat_dau, gio_ket_thuc: slot.gio_ket_thuc },
      xe: xe ? { id: xe.id, bien_so_xe: xe.bien_so_xe, hang_xe: xe.hang_xe, dong_xe: xe.dong_xe } : null,
      khach_hang: user ? { id: user.id, ho_ten: user.ho_ten, so_dien_thoai: user.so_dien_thoai } : null,
      nhan_vien: null,
      dich_vu: svcs,
    };
    this._appointments.push(appt);

    // Tạo hóa đơn tương ứng
    const total = svcs.reduce((s, v) => s + v.gia_tien, 0);
    this._invoices.push({
      id: ++this._nextId,
      tong_tien: total,
      trang_thai: 'chua_thanh_toan',
      lich_hen: {
        id: appt.id,
        ten_kh: user?.ho_ten,
        bien_so_xe: xe?.bien_so_xe,
        hang_xe: xe?.hang_xe,
        dong_xe: xe?.dong_xe,
        ngay: slot.ngay,
      },
      dich_vu: svcs.map(s => ({ ten_dich_vu: s.ten_dich_vu, gia_tien: s.gia_tien })),
    });
    return appt;
  },

  huyLichHen(id) {
    const a = this._appointments.find(a => a.id === id);
    if (!a) throw new Error('Không tìm thấy lịch hẹn');
    if (a.trang_thai !== 'cho_thuc_hien') throw new Error('Chỉ có thể hủy lịch đang chờ thực hiện');
    a.trang_thai = 'da_huy';
    const slot = this._slots.find(s => s.id === a.khung_gio?.id);
    if (slot) slot.da_dat = Math.max(0, slot.da_dat - 1);
    const inv = this._invoices.find(i => i.lich_hen?.id === id);
    if (inv) inv.trang_thai = 'hoa_don_da_huy';
    return { ok: true };
  },

  nhanXe(id) {
    const user = Auth.getUser();
    const a = this._appointments.find(a => a.id === id);
    if (!a) throw new Error('Không tìm thấy lịch hẹn');
    if (a.trang_thai !== 'cho_thuc_hien') throw new Error('Lịch hẹn không ở trạng thái chờ');
    a.trang_thai = 'dang_thuc_hien';
    a.nhan_vien  = { id: user.id, ho_ten: user.ho_ten };
    return { ...a };
  },

  hoanThanh(id, ghi_chu = '') {
    const a = this._appointments.find(a => a.id === id);
    if (!a) throw new Error('Không tìm thấy lịch hẹn');
    if (a.trang_thai !== 'dang_thuc_hien') throw new Error('Lịch hẹn chưa được nhận');
    a.trang_thai = 'hoan_thanh';
    a.ghi_chu    = ghi_chu;
    return { ...a };
  },

  // HÓA ĐƠN
  getHoaDon(params = {}) {
    const user = Auth.getUser();
    let list = [...this._invoices];
    if (user?.vai_tro === 'khach_hang') {
      const myApptIds = this._appointments
        .filter(a => a.khach_hang?.id === user.id)
        .map(a => a.id);
      list = list.filter(i => myApptIds.includes(i.lich_hen?.id));
    }
    if (params.trang_thai && params.trang_thai !== 'all') {
      list = list.filter(i => i.trang_thai === params.trang_thai);
    }
    return list;
  },

  thanhToanHoaDon(id) {
    const inv = this._invoices.find(i => i.id === id);
    if (!inv) throw new Error('Không tìm thấy hóa đơn');
    inv.trang_thai = 'da_thanh_toan';
    return { ...inv };
  },

  // NGƯỜI DÙNG (Admin)
  getNguoiDung(params = {}) {
    let list = [...this._users];
    if (params.vai_tro) list = list.filter(u => u.vai_tro === params.vai_tro);
    if (params.q) {
      const kw = normalizeSearchText(params.q);
      list = list.filter(u =>
        normalizeSearchText(u.ho_ten).includes(kw) ||
        normalizeSearchText(u.email).includes(kw) ||
        normalizeSearchText(u.so_dien_thoai).includes(kw));
    }
    return list;
  },

  getNhanVien() {
    return this._users.filter(u => u.vai_tro === 'nhan_vien');
  },

  createNguoiDung(data) {
    const u = { id: ++this._nextId, trang_thai: 'hoat_dong', ...data };
    this._users.push(u);
    return u;
  },

  updateNguoiDung(id, data) {
    const i = this._users.findIndex(u => u.id === id);
    if (i !== -1) Object.assign(this._users[i], data);
    return this._users[i];
  },

  deleteNguoiDung(id) {
    const i = this._users.findIndex(u => u.id === id);
    if (i !== -1) this._users.splice(i, 1);
    return { ok: true };
  },

  // DASHBOARD
  getDashboardAdmin() {
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = today.substring(0, 7);
    const lastMonthDate = new Date();
    lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
    const lastMonth = lastMonthDate.toISOString().substring(0, 7);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const sixMonthsAgoStr = sixMonthsAgo.toISOString().substring(0, 7);

    const todayAppts = this._appointments.filter(a => a.khung_gio?.ngay === today);

    // Group invoices by month
    const monthlyMap = {};
    this._invoices.forEach(inv => {
      const invMonth = (inv.lich_hen?.ngay || today).substring(0, 7);
      if (invMonth < sixMonthsAgoStr) return;
      if (inv.trang_thai === 'da_huy') return;
      if (!monthlyMap[invMonth]) {
        monthlyMap[invMonth] = { thang: invMonth, da_thu: 0, chua_thu: 0, tong_hoa_don: 0 };
      }
      monthlyMap[invMonth].tong_hoa_don++;
      if (inv.trang_thai === 'da_thanh_toan') {
        monthlyMap[invMonth].da_thu += inv.tong_tien;
      } else {
        monthlyMap[invMonth].chua_thu += inv.tong_tien;
      }
    });

    const doanh_thu_thang_nay = Object.values(monthlyMap)
      .filter(m => m.thang === thisMonth)
      .reduce((s, m) => s + m.da_thu, 0);
    const doanh_thu_thang_truoc = Object.values(monthlyMap)
      .filter(m => m.thang === lastMonth)
      .reduce((s, m) => s + m.da_thu, 0);
    const doanh_thu_theo_thang = Object.values(monthlyMap).sort((a, b) => a.thang.localeCompare(b.thang));

    return {
      tong_lich_hen_hom_nay: todayAppts.length,
      cho_thuc_hien:  todayAppts.filter(a => a.trang_thai === 'cho_thuc_hien').length,
      dang_thuc_hien: todayAppts.filter(a => a.trang_thai === 'dang_thuc_hien').length,
      hoan_thanh:     todayAppts.filter(a => a.trang_thai === 'hoan_thanh').length,
      doanh_thu_hom_nay: this._invoices
        .filter(i => i.trang_thai === 'da_thanh_toan')
        .reduce((s, i) => s + i.tong_tien, 0),
      hoa_don_chua_thanh_toan: this._invoices.filter(i => i.trang_thai === 'chua_thanh_toan').length,
      tong_khach_hang: this._users.filter(u => u.vai_tro === 'khach_hang').length,
      tong_nhan_vien:  this._users.filter(u => u.vai_tro === 'nhan_vien').length,
      doanh_thu_thang_nay,
      doanh_thu_thang_truoc,
      doanh_thu_theo_thang,
    };
  },

  getDashboardKhachHang() {
    const uid   = this.currentUserId();
    const appts = this._appointments.filter(a => a.khach_hang?.id === uid);
    return {
      sap_toi:         appts.filter(a => a.trang_thai === 'cho_thuc_hien').length,
      hoan_thanh:      appts.filter(a => a.trang_thai === 'hoan_thanh').length,
      chua_thanh_toan: this._invoices.filter(i =>
        appts.map(a => a.id).includes(i.lich_hen?.id) && i.trang_thai === 'chua_thanh_toan'
      ).length,
      lich_hen_sap_toi: appts.filter(a => a.trang_thai === 'cho_thuc_hien'),
    };
  },

  getDashboardNhanVien() {
    const today = new Date().toISOString().split('T')[0];
    const uid   = this.currentUserId();
    const appts = this._appointments.filter(a => a.khung_gio?.ngay === today);
    return {
      tong_xe_hom_nay: appts.length,
      dang_phu_trach:  appts.filter(a => a.nhan_vien?.id === uid).length,
      cho_nhan:        appts.filter(a => a.trang_thai === 'cho_thuc_hien' && !a.nhan_vien).length,
    };
  },
};

// -------------------------------------------------------
// 4. OVERRIDE API – wrap mọi hàm để fallback sang Mock
// -------------------------------------------------------
(function patchAPI() {
  const orig = {};
  const wrapAsync = (name, mockFn) => {
    orig[name] = API[name].bind(API);
    API[name] = async function (...args) {
      try {
        const result = await orig[name](...args);
        return result;
      } catch (_) {
        // Backend không sẵn → dùng mock
        const r = mockFn(...args);
        return r instanceof Promise ? await r : r;
      }
    };
  };

  wrapAsync('getCars',             (...a) => Mock.getCars(...a));
  wrapAsync('createCar',           (...a) => Mock.createCar(...a));
  wrapAsync('deleteCar',           (...a) => Mock.deleteCar(...a));
  wrapAsync('getDichVu',           (...a) => Mock.getDichVu(...a));
  wrapAsync('createDichVu',        (...a) => Mock.createDichVu(...a));
  wrapAsync('updateDichVu',        (...a) => Mock.updateDichVu(...a));
  wrapAsync('deleteDichVu',        (...a) => Mock.deleteDichVu(...a));
  wrapAsync('getKhungGio',         (...a) => Mock.getKhungGio(...a));
  wrapAsync('createKhungGio',      (...a) => Mock.createKhungGio(...a));
  wrapAsync('deleteKhungGio',      (...a) => Mock.deleteKhungGio(...a));
  wrapAsync('getLichHen',          (...a) => Mock.getLichHen(...a));
  wrapAsync('getLichHenDetail',    (...a) => Mock.getLichHenDetail(...a));
  wrapAsync('createLichHen',       (...a) => Mock.createLichHen(...a));
  wrapAsync('huyLichHen',          (...a) => Mock.huyLichHen(...a));
  wrapAsync('nhanXe',              (...a) => Mock.nhanXe(...a));
  wrapAsync('hoanThanh',           (...a) => Mock.hoanThanh(...a));
  wrapAsync('getHoaDon',           (...a) => Mock.getHoaDon(...a));
  wrapAsync('thanhToanHoaDon',     (...a) => Mock.thanhToanHoaDon(...a));
  wrapAsync('getNguoiDung',        (...a) => Mock.getNguoiDung(...a));
  wrapAsync('getNhanVien',         (...a) => Mock.getNhanVien(...a));
  wrapAsync('createNguoiDung',     (...a) => Mock.createNguoiDung(...a));
  wrapAsync('updateNguoiDung',     (...a) => Mock.updateNguoiDung(...a));
  wrapAsync('deleteNguoiDung',     (...a) => Mock.deleteNguoiDung(...a));
  wrapAsync('getDashboardAdmin',   ()    => Mock.getDashboardAdmin());
  wrapAsync('getDashboardKhachHang',()   => Mock.getDashboardKhachHang());
  wrapAsync('getDashboardNhanVien', ()   => Mock.getDashboardNhanVien());
  wrapAsync('getMe',               ()    => Mock.getMe());

  // Override login riêng (không requireAuth)
  const origLogin = API.login.bind(API);
  API.login = async function (email, mat_khau) {
    try { return await origLogin(email, mat_khau); }
    catch (_) { return Mock.login(email, mat_khau); }
  };

  console.info('[mock.js] API fallback đã được kích hoạt');
})();
