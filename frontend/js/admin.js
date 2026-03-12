let calDate         = new Date(2026, 2, 1); 
let selectedCalDate = null;                  

// -------------------------------------------------------
// ĐIỀU HƯỚNG TRANG
// -------------------------------------------------------
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');

  const map   = { dashboard: 0, users: 1, services: 2, schedule: 3, invoices: 4 };
  const items = document.querySelectorAll('.nav-item');
  if (map[id] !== undefined) items[map[id]].classList.add('active');

  if (id === 'dashboard') renderDashboard();
  if (id === 'users')     renderUsers('all');
  if (id === 'services')  renderServices();
  if (id === 'schedule')  { renderCalendar(); renderDaySlots(null); }
  if (id === 'invoices')  renderInvoices('all');
}

// -------------------------------------------------------
// DASHBOARD ADMIN
// -------------------------------------------------------
function renderDashboard() {
  const todayAppts = AppData.appointments.filter(a => {
    const slot = AppData.slots.find(s => s.id === a.slotId);
    return slot?.date === '2026-03-10';
  });

  // Cập nhật các ô thống kê
  document.getElementById('stat-appts').textContent   = todayAppts.length;
  document.getElementById('stat-users').textContent   = AppData.users.length;

  const paidToday = AppData.invoices.filter(inv => {
    const appt = AppData.appointments.find(a => a.id === inv.apptId);
    const slot  = AppData.slots.find(s => s.id === appt?.slotId);
    return slot?.date === '2026-03-10' && inv.status === 'da_thanh_toan';
  });
  const revenue = paidToday.reduce((s, inv) => s + inv.total, 0);
  document.getElementById('stat-revenue').textContent = (revenue / 1000).toFixed(0) + 'k';

  const unpaid = AppData.invoices.filter(i => i.status === 'chua_thanh_toan');
  document.getElementById('stat-pending').textContent = unpaid.length;

  // Bảng lịch hẹn mới nhất
  document.getElementById('admin-appts-tbody').innerHTML = todayAppts.slice(0, 5).map(a => {
    const car      = AppData.cars.find(c => c.id === a.carId);
    const customer = AppData.users.find(u => u.id === a.userId);
    const slot     = AppData.slots.find(s => s.id === a.slotId);
    return `<tr>
      <td><b>${car?.plate}</b></td>
      <td>${customer?.name}</td>
      <td>${slot?.start}–${slot?.end}</td>
      <td>${getStatusBadge(a.status)}</td>
    </tr>`;
  }).join('');

  // Danh sách chưa thanh toán
  document.getElementById('admin-unpaid-list').innerHTML = unpaid.map(inv => {
    const appt     = AppData.appointments.find(a => a.id === inv.apptId);
    const car      = AppData.cars.find(c => c.id === appt?.carId);
    const customer = AppData.users.find(u => u.id === appt?.userId);
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f1f5f9">
      <div>
        <div class="fw-bold fs-sm">${car?.plate}</div>
        <div class="text-secondary fs-sm">${customer?.name}</div>
      </div>
      <div style="text-align:right">
        <div class="fw-bold text-primary">${formatPrice(inv.total)}</div>
        <button class="btn btn-success btn-sm mt-1" style="padding:3px 10px;font-size:11.5px"
                onclick="openConfirmPay(${inv.id})">Thu tiền</button>
      </div>
    </div>`;
  }).join('') || `<div class="text-secondary" style="text-align:center;padding:20px">
    Không có hóa đơn tồn đọng ✅
  </div>`;
}

// -------------------------------------------------------
// QUẢN LÝ NGƯỜI DÙNG
// -------------------------------------------------------
let userFilter = 'all';

function filterUsers(role, btn) {
  userFilter = role;
  document.querySelectorAll('#page-users .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderUsers(role);
}

function renderUsers(role) {
  const list = role === 'all' ? AppData.users : AppData.users.filter(u => u.role === role);
  document.getElementById('users-tbody').innerHTML = list.map(u => `
    <tr>
      <td>${u.id}</td>
      <td>
        <div class="d-flex align-center gap-2">
          <div style="width:30px;height:30px;background:var(--primary-light);border-radius:7px;
                      display:flex;align-items:center;justify-content:center;font-size:13px;
                      font-weight:700;color:var(--primary)">${u.name[0]}</div>
          <span class="fw-semibold">${u.name}</span>
        </div>
      </td>
      <td>${u.email}</td>
      <td>${u.phone}</td>
      <td><span class="badge badge-info">${getRoleLabel(u.role)}</span></td>
      <td>${getStatusBadge(u.status)}</td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="toggleUserStatus(${u.id})" title="${u.status === 'hoat_dong' ? 'Khóa' : 'Mở khóa'}">
          <i class="bi bi-${u.status === 'hoat_dong' ? 'lock' : 'unlock'}"></i>
        </button>
        <button class="btn btn-danger btn-sm" onclick="deleteUser(${u.id})" title="Xóa">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    </tr>`).join('');
}

function addUser() {
  const name  = document.getElementById('u-name').value.trim();
  const email = document.getElementById('u-email').value.trim();
  const phone = document.getElementById('u-phone').value.trim();
  const role  = document.getElementById('u-role').value;
  if (!name || !email || !phone) { showToast('Vui lòng điền đầy đủ thông tin', 'danger'); return; }
  AppData.users.push({ id: AppData.users.length + 1, name, email, phone, role, status: 'hoat_dong' });
  closeModal('modal-add-user');
  renderUsers(userFilter);
  showToast('Đã thêm người dùng ' + name);
  ['u-name','u-email','u-phone'].forEach(id => document.getElementById(id).value = '');
}

function toggleUserStatus(id) {
  const u = AppData.users.find(u => u.id === id);
  if (!u) return;
  u.status = u.status === 'hoat_dong' ? 'tam_khoa' : 'hoat_dong';
  renderUsers(userFilter);
  showToast(`Đã ${u.status === 'hoat_dong' ? 'mở khóa' : 'khóa'} tài khoản`);
}

function deleteUser(id) {
  if (confirm('Xóa người dùng này?')) {
    AppData.users = AppData.users.filter(u => u.id !== id);
    renderUsers(userFilter);
    showToast('Đã xóa người dùng');
  }
}

// -------------------------------------------------------
// QUẢN LÝ DỊCH VỤ
// -------------------------------------------------------
function renderServices() {
  document.getElementById('services-tbody').innerHTML = AppData.services.map(s => `
    <tr>
      <td>${s.id}</td>
      <td class="fw-semibold">${s.name}</td>
      <td class="fw-bold text-primary">${formatPrice(s.price)}</td>
      <td>${s.duration} phút</td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="editService(${s.id})" title="Sửa">
          <i class="bi bi-pencil"></i>
        </button>
        <button class="btn btn-danger btn-sm" onclick="deleteService(${s.id})" title="Xóa">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    </tr>`).join('');
}

function addService() {
  const name     = document.getElementById('svc-name').value.trim();
  const price    = parseFloat(document.getElementById('svc-price').value);
  const duration = parseInt(document.getElementById('svc-duration').value);
  if (!name || isNaN(price) || isNaN(duration)) { showToast('Vui lòng điền đầy đủ', 'danger'); return; }
  AppData.services.push({ id: AppData.services.length + 1, name, price, duration });
  closeModal('modal-add-svc');
  renderServices();
  showToast('Đã thêm dịch vụ ' + name);
}

function editService(id) {
  const s = AppData.services.find(s => s.id === id);
  document.getElementById('svc-name').value     = s.name;
  document.getElementById('svc-price').value    = s.price;
  document.getElementById('svc-duration').value = s.duration;
  openModal('modal-add-svc');
}

function deleteService(id) {
  if (confirm('Xóa dịch vụ này?')) {
    AppData.services = AppData.services.filter(s => s.id !== id);
    renderServices();
    showToast('Đã xóa dịch vụ');
  }
}

// -------------------------------------------------------
// LỊCH (CALENDAR) – Quản lý khung giờ
// -------------------------------------------------------
function renderCalendar() {
  const months = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6',
                  'Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];
  const days   = ['CN','T2','T3','T4','T5','T6','T7'];

  document.getElementById('cal-month-title').textContent =
    `${months[calDate.getMonth()]}, ${calDate.getFullYear()}`;

  const grid = document.getElementById('cal-grid');
  // Header ngày trong tuần
  grid.innerHTML = days.map(d => `<div class="cal-day-header">${d}</div>`).join('');

  const firstDay    = new Date(calDate.getFullYear(), calDate.getMonth(), 1).getDay();
  const daysInMonth = new Date(calDate.getFullYear(), calDate.getMonth() + 1, 0).getDate();

  // Ô trống đầu tháng
  for (let i = 0; i < firstDay; i++) grid.innerHTML += `<div class="cal-day empty"></div>`;

  // Các ngày trong tháng
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr  = `${calDate.getFullYear()}-${String(calDate.getMonth()+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isSelect = selectedCalDate === dateStr;
    const isToday  = dateStr === '2026-03-10';
    const hasSlots = AppData.slots.some(s => s.date === dateStr);
    grid.innerHTML += `
      <div class="cal-day ${isSelect ? 'selected' : ''} ${isToday && !isSelect ? 'today' : ''}"
           onclick="selectCalDay('${dateStr}')">
        ${d}
        ${hasSlots && !isSelect
          ? '<span style="display:block;width:4px;height:4px;background:var(--primary);border-radius:50%;margin:1px auto 0"></span>'
          : ''}
      </div>`;
  }
}

function changeMonth(dir) {
  calDate.setMonth(calDate.getMonth() + dir);
  renderCalendar();
}

function selectCalDay(dateStr) {
  selectedCalDate = dateStr;
  document.getElementById('selected-date-label').textContent = formatDate(dateStr);
  renderCalendar();
  renderDaySlots(dateStr);
}

// Hiển thị các slot trong ngày đã chọn
function renderDaySlots(dateStr) {
  if (!dateStr) {
    document.getElementById('day-slots-title').textContent = 'Chọn ngày để xem khung giờ';
    document.getElementById('day-slots-list').innerHTML    = '';
    return;
  }
  document.getElementById('day-slots-title').textContent = `Khung giờ ngày ${formatDate(dateStr)}`;
  const slots = AppData.slots.filter(s => s.date === dateStr);
  if (!slots.length) {
    document.getElementById('day-slots-list').innerHTML = '<div class="text-secondary fs-sm">Chưa có khung giờ nào</div>';
    return;
  }
  document.getElementById('day-slots-list').innerHTML = slots.map(s => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;
                background:var(--bg-light);border-radius:8px;margin-bottom:8px">
      <div>
        <span class="fw-semibold">${s.start} – ${s.end}</span>
        <span class="text-secondary fs-sm" style="margin-left:8px">${s.booked}/${s.capacity} xe</span>
      </div>
      <button class="btn btn-danger btn-sm" onclick="deleteSlot(${s.id})">
        <i class="bi bi-trash"></i>
      </button>
    </div>`).join('');
}

function addSlot() {
  if (!selectedCalDate) { showToast('Vui lòng chọn ngày trước', 'danger'); return; }
  const start    = document.getElementById('slot-start').value;
  const end      = document.getElementById('slot-end').value;
  const capacity = parseInt(document.getElementById('slot-capacity').value);
  if (!start || !end || isNaN(capacity)) { showToast('Vui lòng điền đầy đủ', 'danger'); return; }
  if (start >= end) { showToast('Giờ kết thúc phải sau giờ bắt đầu', 'danger'); return; }
  if (AppData.slots.find(s => s.date === selectedCalDate && s.start === start)) {
    showToast('Khung giờ này đã tồn tại', 'danger'); return;
  }
  const newId = Math.max(...AppData.slots.map(s => s.id)) + 1;
  AppData.slots.push({ id: newId, date: selectedCalDate, start, end, capacity, booked: 0 });
  renderDaySlots(selectedCalDate);
  renderCalendar();
  showToast(`Đã thêm khung giờ ${start}–${end}`);
}

function deleteSlot(id) {
  if (confirm('Xóa khung giờ này?')) {
    AppData.slots = AppData.slots.filter(s => s.id !== id);
    renderDaySlots(selectedCalDate);
    renderCalendar();
    showToast('Đã xóa khung giờ');
  }
}

// -------------------------------------------------------
// QUẢN LÝ HÓA ĐƠN – Xác nhận thanh toán (quyền Admin)
// -------------------------------------------------------
let invoiceFilter = 'all';

function filterInvoices(status, btn) {
  invoiceFilter = status;
  document.querySelectorAll('#invoice-tabs .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderInvoices(status);
}

function renderInvoices(status) {
  const filtered = status === 'all'
    ? AppData.invoices
    : AppData.invoices.filter(i => i.status === status);

  document.getElementById('admin-invoices-tbody').innerHTML = filtered.map(inv => {
    const appt     = AppData.appointments.find(a => a.id === inv.apptId);
    const car      = AppData.cars.find(c => c.id === appt?.carId);
    const customer = AppData.users.find(u => u.id === appt?.userId);
    const svcs     = (appt?.services || []).map(id => AppData.services.find(s => s.id === id)?.name).join(', ');
    return `<tr>
      <td class="fw-bold">#INV-00${inv.id}</td>
      <td>${customer?.name}</td>
      <td>${car?.plate}<br><span class="text-secondary fs-sm">${car?.brand}–${car?.model}</span></td>
      <td style="max-width:150px;font-size:12px">${svcs}</td>
      <td class="fw-bold text-primary">${formatPrice(inv.total)}</td>
      <td>${getStatusBadge(inv.status)}</td>
      <td>
        ${inv.status === 'chua_thanh_toan'
          ? `<button class="btn btn-success btn-sm" onclick="openConfirmPay(${inv.id})">
               <i class="bi bi-check-lg"></i> Thu tiền
             </button>`
          : `<span class="text-secondary fs-sm">✓ Đã thanh toán</span>`}
      </td>
    </tr>`;
  }).join('');
}

// Mở modal xác nhận thu tiền
function openConfirmPay(invId) {
  const inv      = AppData.invoices.find(i => i.id === invId);
  const appt     = AppData.appointments.find(a => a.id === inv.apptId);
  const car      = AppData.cars.find(c => c.id === appt?.carId);
  const customer = AppData.users.find(u => u.id === appt?.userId);
  const svcs     = (appt?.services || []).map(id => AppData.services.find(s => s.id === id));

  document.getElementById('confirm-pay-body').innerHTML = `
    <div class="alert alert-info">
      <i class="bi bi-cash-coin"></i> Xác nhận đã nhận tiền mặt hoặc chuyển khoản
    </div>
    <div style="background:var(--bg-light);border-radius:10px;padding:16px;margin-top:12px">
      <div style="display:flex;justify-content:space-between;margin-bottom:10px">
        <span class="text-secondary">Khách hàng</span>
        <span class="fw-bold">${customer?.name}</span>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:10px">
        <span class="text-secondary">Xe</span>
        <span class="fw-bold">${car?.plate} – ${car?.model}</span>
      </div>
      ${svcs.map(s => `
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-top:1px solid #e2e8f0">
          <span>${s?.name}</span>
          <span>${formatPrice(s?.price)}</span>
        </div>`).join('')}
      <div style="display:flex;justify-content:space-between;padding:12px 0 0;border-top:2px solid #e2e8f0;font-size:16px;font-weight:800">
        <span>Tổng</span>
        <span style="color:var(--primary)">${formatPrice(inv.total)}</span>
      </div>
    </div>`;

  document.getElementById('btn-confirm-pay').onclick = () => confirmPayment(invId);
  openModal('modal-confirm-pay');
}

// Xác nhận thanh toán – đổi trạng thái hóa đơn
function confirmPayment(invId) {
  const inv  = AppData.invoices.find(i => i.id === invId);
  inv.status = 'da_thanh_toan';
  closeModal('modal-confirm-pay');
  renderInvoices(invoiceFilter);
  renderDashboard(); // Cập nhật lại thống kê
  showToast(`Đã xác nhận thanh toán hóa đơn #INV-00${invId} ✅`);
}

// -------------------------------------------------------
// KHỞI ĐỘNG
// -------------------------------------------------------
renderDashboard();
