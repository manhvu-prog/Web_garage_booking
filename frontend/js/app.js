
const AppData = {

  // Người dùng hiện tại đang đăng nhập
  currentUser: { id: 1, name: 'Nguyễn Văn A', role: 'khach_hang', avatar: 'N' },

  // Bảng: nguoi_dung
  users: [
    { id: 1, name: 'Nguyễn Văn A',   email: 'a@gmail.com',          phone: '0901234567', role: 'khach_hang', status: 'hoat_dong' },
    { id: 2, name: 'Trần Thị B',     email: 'b@gmail.com',          phone: '0902345678', role: 'nhan_vien',  status: 'hoat_dong' },
    { id: 3, name: 'Nguyễn Văn Nam', email: 'nam@gmail.com',        phone: '0903000001', role: 'nhan_vien',  status: 'hoat_dong' },
    { id: 4, name: 'Lê Văn C',       email: 'c@gmail.com',          phone: '0903456789', role: 'khach_hang', status: 'hoat_dong' },
    { id: 5, name: 'Admin',          email: 'admin@autocare.vn',    phone: '0900000000', role: 'quan_tri',   status: 'hoat_dong' },
  ],

  // Bảng: xe
  cars: [
    { id: 1, userId: 1, plate: '29A-12345', brand: 'Toyota', model: 'Camry' },
    { id: 2, userId: 1, plate: '29A-99999', brand: 'Honda',  model: 'CR-V'  },
    { id: 3, userId: 2, plate: '30B-67890', brand: 'Honda',  model: 'Civic' },
    { id: 4, userId: 4, plate: '31C-11111', brand: 'Mazda',  model: '3'     },
  ],

  // Bảng: dich_vu
  services: [
    { id: 1, name: 'Bảo dưỡng định kỳ',       price: 350000, duration: 90  },
    { id: 2, name: 'Thay dầu máy',             price: 180000, duration: 45  },
    { id: 3, name: 'Kiểm tra hệ thống phanh',  price: 120000, duration: 60  },
    { id: 4, name: 'Rửa xe',                   price:  80000, duration: 30  },
    { id: 5, name: 'Thay lốc máy',             price: 500000, duration: 120 },
    { id: 6, name: 'Sửa điều hòa',             price: 200000, duration: 60  },
    { id: 7, name: 'Kiểm tra hệ thống điện',   price: 150000, duration: 45  },
    { id: 8, name: 'Thay má phanh',            price: 250000, duration: 60  },
  ],

  // Bảng: khung_gio
  slots: [
    { id: 1, date: '2026-03-10', start: '08:00', end: '09:30', capacity: 3, booked: 2 },
    { id: 2, date: '2026-03-10', start: '10:00', end: '11:30', capacity: 3, booked: 3 },
    { id: 3, date: '2026-03-10', start: '13:00', end: '14:30', capacity: 3, booked: 1 },
    { id: 4, date: '2026-03-10', start: '15:00', end: '16:30', capacity: 3, booked: 3 },
    { id: 5, date: '2026-03-11', start: '08:00', end: '09:30', capacity: 3, booked: 2 },
    { id: 6, date: '2026-03-11', start: '10:00', end: '11:30', capacity: 3, booked: 3 },
    { id: 7, date: '2026-03-11', start: '13:00', end: '14:30', capacity: 3, booked: 1 },
    { id: 8, date: '2026-03-11', start: '15:00', end: '16:30', capacity: 3, booked: 0 },
  ],

  // Bảng: lich_hen + chi_tiet_lich_hen (gộp chung để đơn giản)
  appointments: [
    // Slot 08:00–09:30
    { id: 1, userId: 1, carId: 1, slotId: 1, staffId: 3,    status: 'dang_thuc_hien', services: [1, 2] }, // đã có NV Nam phụ trách
    { id: 2, userId: 2, carId: 3, slotId: 1, staffId: 2,    status: 'dang_thuc_hien', services: [3]    }, // đang do NV B (mình) phụ trách
    { id: 3, userId: 4, carId: 4, slotId: 1, staffId: null, status: 'cho_thuc_hien',  services: [1, 4] }, // chưa ai nhận → có nút "Nhận xe"
    // Slot 10:00–11:30
    { id: 5, userId: 1, carId: 2, slotId: 2, staffId: null, status: 'cho_thuc_hien',  services: [6, 7] }, // chưa ai nhận → có nút "Nhận xe"
    { id: 6, userId: 4, carId: 4, slotId: 2, staffId: 3,    status: 'dang_thuc_hien', services: [8]    }, // đã có NV Nam phụ trách
    // Slot 13:00–14:30 – đã hoàn thành
    { id: 4, userId: 1, carId: 2, slotId: 3, staffId: 2,    status: 'hoan_thanh',     services: [2, 4] },
  ],

  // Bảng: hoa_don
  invoices: [
    { id: 1, apptId: 1, total: 530000, status: 'chua_thanh_toan' },
    { id: 2, apptId: 2, total: 120000, status: 'da_thanh_toan'   },
    { id: 3, apptId: 3, total: 430000, status: 'chua_thanh_toan' },
    { id: 4, apptId: 4, total: 260000, status: 'da_thanh_toan'   },
  ],

  // Bảng: ho_so_bao_duong
  maintenance: [
    { id: 1, apptId: 4, techId: 3, date: '2026-03-08', note: 'Thay dầu 5W30, rửa xe sạch sẽ' },
  ]
};

// -------------------------------------------------------
// HÀM TIỆN ÍCH – Định dạng & hiển thị
// -------------------------------------------------------

// Định dạng số tiền theo chuẩn Việt Nam (VD: 350.000 đ)
function formatPrice(p) {
  return new Intl.NumberFormat('vi-VN').format(p) + ' đ';
}

// Định dạng ngày từ YYYY-MM-DD → DD/MM/YYYY
function formatDate(d) {
  if (!d) return '–';
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`;
}

// Tạo HTML badge trạng thái theo từng giá trị
function getStatusBadge(status) {
  const map = {
    'cho_thuc_hien':   ['badge-warning',   'Chờ thực hiện'],
    'dang_thuc_hien':  ['badge-info',      'Đang thực hiện'],
    'hoan_thanh':      ['badge-success',   'Hoàn thành'],
    'da_huy':          ['badge-danger',    'Đã hủy'],
    'chua_thanh_toan': ['badge-warning',   'Chưa thanh toán'],
    'da_thanh_toan':   ['badge-success',   'Đã thanh toán'],
    'hoa_don_da_huy':  ['badge-danger',    'Đã hủy'],
    'hoat_dong':       ['badge-success',   'Hoạt động'],
    'tam_khoa':        ['badge-warning',   'Tạm khóa'],
  };
  const [cls, label] = map[status] || ['badge-secondary', status];
  return `<span class="badge ${cls}">${label}</span>`;
}

// Chuyển mã vai trò → tên hiển thị
function getRoleLabel(role) {
  const map = { khach_hang: 'Khách hàng', nhan_vien: 'Nhân viên', quan_tri: 'Quản trị viên' };
  return map[role] || role;
}

// -------------------------------------------------------
// HÀM GIAO DIỆN – Toast, Modal, Dropdown
// -------------------------------------------------------

// Hiển thị thông báo toast góc trên phải (tự biến mất sau 3 giây)
function showToast(msg, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `alert alert-${type}`;
  toast.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;min-width:280px;box-shadow:0 8px 24px rgba(0,0,0,0.15);animation:modalIn 0.2s ease';
  toast.innerHTML = `<i class="bi bi-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> ${msg}`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Mở modal theo id
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'flex';
}

// Đóng modal theo id
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

// Đóng modal khi click vào lớp phủ nền bên ngoài
function closeModalOuter(e, id) {
  if (e.target.classList.contains('modal-overlay')) closeModal(id);
}

// Bật/tắt dropdown menu
function toggleDropdown(id) {
  document.getElementById(id)?.classList.toggle('show');
}

// Đóng tất cả dropdown khi click ra ngoài
document.addEventListener('click', e => {
  if (!e.target.closest('.dropdown')) {
    document.querySelectorAll('.dropdown-menu').forEach(d => d.classList.remove('show'));
  }
});
