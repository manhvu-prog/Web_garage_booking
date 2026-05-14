// =====================================================
// admin.js – Logic trang Quản trị viên
// =====================================================

let calDate         = new Date();
let selectedCalDate = null;
let adminSearchKw   = '';
let adminCurrentPage = 'dashboard';
let userFilter      = 'all';
let invoiceFilter   = 'all';
const ADMIN_LAST_PAGE_KEY = 'admin:lastPage';

(async function init() {
  if (!Auth.isLoggedIn()) { window.location.href = 'login.html'; return; }
  const user = Auth.getUser();
  if (user) {
    const nameEl = document.getElementById('user-name');
    if (nameEl) nameEl.textContent = user.ho_ten;
    const avatarEl = document.getElementById('user-avatar');
    if (avatarEl) avatarEl.textContent = (user.ho_ten||'A')[0].toUpperCase();
  }
  initAdminSearch();
  const savedPage = localStorage.getItem(ADMIN_LAST_PAGE_KEY);
  const initialPage = ['dashboard', 'users', 'services', 'schedule', 'invoices'].includes(savedPage)
    ? savedPage
    : 'dashboard';
  showPage(initialPage);
})();

function doLogout() { Auth.clearSession(); window.location.href = 'login.html'; }

function initAdminSearch() {
  const inputMap = {
    users: 'admin-users-search',
    services: 'admin-services-search',
    invoices: 'admin-invoices-search',
  };
  Object.entries(inputMap).forEach(([page, id]) => {
    const input = document.getElementById(id);
    if (!input) return;
    input.addEventListener('input', function () {
      onAdminPageSearch(page, this.value);
    });
  });
}

function onAdminPageSearch(page, value) {
  adminSearchKw = (value || '').trim();
  if (page==='users' && adminCurrentPage==='users') renderUsers(userFilter);
  if (page==='services' && adminCurrentPage==='services') renderServices();
  if (page==='invoices' && adminCurrentPage==='invoices') renderInvoices(invoiceFilter);
}

function showPage(id) {
  adminCurrentPage = id; adminSearchKw = '';
  localStorage.setItem(ADMIN_LAST_PAGE_KEY, id);
  ['admin-users-search', 'admin-services-search', 'admin-invoices-search', 'slot-search'].forEach((inputId) => {
    const input = document.getElementById(inputId);
    if (input) input.value = '';
  });
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  document.getElementById('page-'+id).classList.add('active');
  const map = { dashboard:0, users:1, services:2, schedule:3, invoices:4 };
  const items = document.querySelectorAll('.nav-item');
  if (map[id]!==undefined) items[map[id]].classList.add('active');
  if (id==='dashboard') renderDashboard();
  if (id==='users')     renderUsers('all');
  if (id==='services')  renderServices();
  if (id==='schedule')  { renderCalendar(); renderDaySlots(null); }
  if (id==='invoices')  renderInvoices('all');
}

// -------------------------------------------------------
// DASHBOARD
// dashboard/admin trả: tong_lich_hen_hom_nay, tong_nguoi_dung, doanh_thu_hom_nay,
//   hoa_don_chua_thanh_toan, lich_hen_hom_nay[], hoa_don_chua_thu[]
// lich_hen_hom_nay item: ten_kh, bien_so_xe, gio_bat_dau, gio_ket_thuc, trang_thai
// hoa_don_chua_thu item: id, tong_tien, ten_kh, bien_so_xe
// -------------------------------------------------------
async function renderDashboard() {
  try {
    const stats = await API.getDashboardAdmin();
    const el = (id) => document.getElementById(id);
    if (el('stat-appts'))   el('stat-appts').textContent   = stats.tong_lich_hen_hom_nay ?? '–';
    if (el('stat-users'))   el('stat-users').textContent   = stats.tong_nguoi_dung ?? '–';
    if (el('stat-revenue')) el('stat-revenue').textContent = stats.doanh_thu_hom_nay
      ? ((stats.doanh_thu_hom_nay)/1000).toFixed(0)+'k' : '0k';
    if (el('stat-pending')) el('stat-pending').textContent = stats.hoa_don_chua_thanh_toan ?? '–';

    // Doanh thu theo tháng
    if (el('stat-month-revenue')) {
      el('stat-month-revenue').textContent = formatPrice(stats.doanh_thu_thang_nay ?? 0);
    }
    if (el('stat-month-growth')) {
      const truoc = stats.doanh_thu_thang_truoc || 0;
      const nay   = stats.doanh_thu_thang_nay || 0;
      let growth;
      if (truoc > 0) {
        const pct = ((nay - truoc) / truoc * 100).toFixed(1);
        growth = `${pct}%`;
        el('stat-month-growth').style.color = pct >= 0 ? 'var(--success, #22c55e)' : 'var(--danger, #ef4444)';
      } else if (nay > 0) {
        growth = 'Mới phát sinh';
        el('stat-month-growth').style.color = 'var(--success, #22c55e)';
      } else {
        growth = 'Chưa có dữ liệu';
        el('stat-month-growth').style.color = '#94a3b8';
      }
      el('stat-month-growth').textContent = growth;
    }
    if (el('monthly-revenue-tbody')) {
      const data = stats.doanh_thu_theo_thang || [];
      el('monthly-revenue-tbody').innerHTML = data.length
        ? data.map(m => {
            const p = m.thang.split('-');
            const label = `Tháng ${parseInt(p[1])}/${p[0]}`;
            return `<tr>
              <td class="fw-semibold">${label}</td>
              <td class="fw-bold text-primary">${formatPrice(m.da_thu)}</td>
              <td class="text-secondary">${formatPrice(m.chua_thu)}</td>
              <td>${m.tong_hoa_don}</td>
            </tr>`;
          }).join('')
        : `<tr><td colspan="4" style="text-align:center;padding:20px;color:#94a3b8">Chưa có dữ liệu</td></tr>`;
    }

    // Lịch hẹn hôm nay – flat fields từ dashboard
    if (el('admin-appts-tbody')) {
      el('admin-appts-tbody').innerHTML = (stats.lich_hen_hom_nay||[]).slice(0,5).map(a=>`<tr>
        <td><b>${a.bien_so_xe||'–'}</b></td>
        <td>${a.ten_kh||'–'}</td>
        <td>${formatTime(a.gio_bat_dau)}–${formatTime(a.gio_ket_thuc)}</td>
        <td>${getStatusBadge(a.trang_thai)}</td>
      </tr>`).join('') || `<tr><td colspan="4" style="text-align:center;color:#94a3b8;padding:20px">Không có lịch hôm nay</td></tr>`;
    }

    // Hóa đơn chưa thanh toán – flat fields từ dashboard
    if (el('admin-unpaid-list')) {
      el('admin-unpaid-list').innerHTML = (stats.hoa_don_chua_thu||[]).map(inv=>`
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f1f5f9">
          <div>
            <div class="fw-bold fs-sm">${inv.bien_so_xe||'–'}</div>
            <div class="text-secondary fs-sm">${inv.ten_kh||'–'}</div>
          </div>
          <div style="text-align:right">
            <div class="fw-bold text-primary">${formatPrice(inv.tong_tien)}</div>
            <button class="btn btn-outline btn-sm mt-1" style="padding:3px 10px;font-size:11.5px"
                    onclick="openConfirmPay(${inv.id})"><i class="bi bi-cash-coin"></i> Tiền mặt</button>
          </div>
        </div>`).join('')
        || `<div class="text-secondary" style="text-align:center;padding:20px">Không có hóa đơn tồn đọng ✅</div>`;
    }
  } catch (e) { showToast('Lỗi tải dashboard: '+e.message,'danger'); }

  // Khởi tạo và render biểu đồ báo cáo
  initReportFilters();
  const nam   = parseInt(document.getElementById('filter-nam')?.value  || new Date().getFullYear());
  const thang = parseInt(document.getElementById('filter-thang')?.value || new Date().getMonth() + 1);
  renderBarChart(nam, thang);
  renderPieChart(nam, thang);
}

// -------------------------------------------------------
// NGƯỜI DÙNG
// -------------------------------------------------------
function filterUsers(role, btn) {
  userFilter = role;
  document.querySelectorAll('#user-tabs .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderUsers(role);
}

async function renderUsers(role) {
  try {
    const params = {};
    if (role && role!=='all') params.vai_tro = role;
    if (adminSearchKw) params.q = adminSearchKw;
    const list = await API.getNguoiDung(params);
    document.getElementById('users-tbody').innerHTML = list.length
      ? list.map(u=>`<tr>
          <td>${u.id}</td>
          <td><div class="d-flex align-center gap-2">
            <div style="width:30px;height:30px;background:var(--primary-light);border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:var(--primary)">${(u.ho_ten||'U')[0]}</div>
            <span class="fw-semibold">${u.ho_ten}</span></div></td>
          <td>${u.email}</td>
          <td>${u.so_dien_thoai}</td>
          <td><span class="badge badge-info">${getRoleLabel(u.vai_tro)}</span></td>
          <td>${getStatusBadge(u.trang_thai)}</td>
          <td>
            <button class="btn btn-outline btn-sm" onclick="toggleUserStatus(${u.id},'${u.trang_thai}')" title="${u.trang_thai==='hoat_dong'?'Khóa':'Mở khóa'}">
              <i class="bi bi-${u.trang_thai==='hoat_dong'?'lock':'unlock'}"></i></button>
            <button class="btn btn-danger btn-sm" onclick="deleteUser(${u.id})" title="Xóa">
              <i class="bi bi-trash"></i></button>
          </td>
        </tr>`).join('')
      : `<tr><td colspan="7" style="text-align:center;padding:32px;color:#94a3b8">Không có dữ liệu</td></tr>`;
  } catch (e) { showToast('Lỗi: '+e.message,'danger'); }
}

async function addUser() {
  const ho_ten        = document.getElementById('u-name').value.trim();
  const email         = document.getElementById('u-email').value.trim();
  const so_dien_thoai = document.getElementById('u-phone').value.trim();
  const vai_tro       = document.getElementById('u-role').value;
  const mat_khau      = document.getElementById('u-password')?.value || '123456';
  if (!ho_ten||!email||!so_dien_thoai) { showToast('Vui lòng điền đầy đủ','danger'); return; }
  try {
    await API.createNguoiDung({ ho_ten, email, so_dien_thoai, vai_tro, mat_khau });
    closeModal('modal-add-user');
    showToast('Đã thêm người dùng '+ho_ten);
    renderUsers(userFilter);
    ['u-name','u-email','u-phone'].forEach(id=>{ const el=document.getElementById(id); if(el)el.value=''; });
  } catch (e) { showToast(e.message,'danger'); }
}

async function toggleUserStatus(id, currentStatus) {
  const newStatus = currentStatus==='hoat_dong' ? 'tam_khoa' : 'hoat_dong';
  try {
    await API.updateNguoiDung(id, { trang_thai: newStatus });
    renderUsers(userFilter);
    showToast(`Đã ${newStatus==='hoat_dong'?'mở khóa':'khóa'} tài khoản`);
  } catch (e) { showToast(e.message,'danger'); }
}

async function deleteUser(id) {
  if (!confirm('Xóa người dùng này?')) return;
  try {
    await API.deleteNguoiDung(id);
    renderUsers(userFilter);
    showToast('Đã xóa người dùng');
  } catch (e) { showToast(e.message,'danger'); }
}

// -------------------------------------------------------
// DỊCH VỤ – backend field: thoi_gian_uoc_tinh
// -------------------------------------------------------
async function renderServices() {
  try {
    const list = await API.getDichVu(adminSearchKw);
    document.getElementById('services-tbody').innerHTML = list.length
      ? list.map(s=>`<tr>
          <td>${s.id}</td>
          <td class="fw-semibold">${s.ten_dich_vu}</td>
          <td class="fw-bold text-primary">${formatPrice(s.gia_tien)}</td>
          <td>${s.thoi_gian_uoc_tinh} phút</td>
          <td>
            <button class="btn btn-outline btn-sm" onclick="editService(${s.id})"><i class="bi bi-pencil"></i></button>
            <button class="btn btn-danger btn-sm" onclick="deleteService(${s.id})"><i class="bi bi-trash"></i></button>
          </td>
        </tr>`).join('')
      : `<tr><td colspan="5" style="text-align:center;padding:32px;color:#94a3b8">Không có dữ liệu</td></tr>`;
  } catch (e) { showToast('Lỗi: '+e.message,'danger'); }
}

let _editServiceId = null;

async function addService() {
  const ten_dich_vu      = document.getElementById('svc-name').value.trim();
  const gia_tien         = parseFloat(document.getElementById('svc-price').value);
  const thoi_gian_uoc_tinh = parseInt(document.getElementById('svc-duration').value);
  if (!ten_dich_vu||isNaN(gia_tien)||isNaN(thoi_gian_uoc_tinh)) { showToast('Vui lòng điền đầy đủ','danger'); return; }
  try {
    if (_editServiceId) {
      await API.updateDichVu(_editServiceId, { ten_dich_vu, gia_tien, thoi_gian_uoc_tinh });
      showToast('Đã cập nhật dịch vụ');
    } else {
      await API.createDichVu(ten_dich_vu, gia_tien, thoi_gian_uoc_tinh);
      showToast('Đã thêm dịch vụ '+ten_dich_vu);
    }
    _editServiceId = null;
    closeModal('modal-add-svc');
    renderServices();
  } catch (e) { showToast(e.message,'danger'); }
}

async function editService(id) {
  try {
    const svcs = await API.getDichVu();
    const s = svcs.find(s=>s.id===id); if (!s) return;
    _editServiceId = id;
    document.getElementById('svc-name').value     = s.ten_dich_vu;
    document.getElementById('svc-price').value    = s.gia_tien;
    document.getElementById('svc-duration').value = s.thoi_gian_uoc_tinh;
    openModal('modal-add-svc');
  } catch (e) { showToast(e.message,'danger'); }
}

async function deleteService(id) {
  if (!confirm('Xóa dịch vụ này?')) return;
  try {
    await API.deleteDichVu(id);
    renderServices();
    showToast('Đã xóa dịch vụ');
  } catch (e) { showToast(e.message,'danger'); }
}

// -------------------------------------------------------
// LỊCH / KHUNG GIỜ
// -------------------------------------------------------
async function renderCalendar() {
  const months = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6',
                  'Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];
  const days   = ['CN','T2','T3','T4','T5','T6','T7'];
  document.getElementById('cal-month-title').textContent =
    `${months[calDate.getMonth()]}, ${calDate.getFullYear()}`;

  const grid = document.getElementById('cal-grid');
  grid.innerHTML = days.map(d=>`<div class="cal-day-header">${d}</div>`).join('');

  let allSlots = [];
  try { allSlots = await API.getKhungGio(); } catch(e) {}

  const firstDay    = new Date(calDate.getFullYear(),calDate.getMonth(),1).getDay();
  const daysInMonth = new Date(calDate.getFullYear(),calDate.getMonth()+1,0).getDate();
  const todayStr    = new Date().toISOString().split('T')[0];

  for (let i=0;i<firstDay;i++) grid.innerHTML += `<div class="cal-day empty"></div>`;
  for (let d=1;d<=daysInMonth;d++) {
    const dateStr  = `${calDate.getFullYear()}-${String(calDate.getMonth()+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isSelect = selectedCalDate===dateStr;
    const isToday  = dateStr===todayStr;
    const hasSlots = allSlots.some(s=>s.ngay===dateStr);
    grid.innerHTML += `<div class="cal-day ${isSelect?'selected':''} ${isToday&&!isSelect?'today':''}"
         onclick="selectCalDay('${dateStr}')">
      ${d}
      ${hasSlots&&!isSelect?'<span style="display:block;width:4px;height:4px;background:var(--primary);border-radius:50%;margin:1px auto 0"></span>':''}
    </div>`;
  }
}

function changeMonth(dir) { calDate.setMonth(calDate.getMonth()+dir); renderCalendar(); }

function selectCalDay(dateStr) {
  selectedCalDate = dateStr;
  document.getElementById('selected-date-label').textContent = formatDate(dateStr);
  const slotSearch = document.getElementById('slot-search');
  if (slotSearch) slotSearch.value = '';
  renderCalendar();
  renderDaySlots(dateStr);
}

async function renderDaySlots(dateStr) {
  const title     = document.getElementById('day-slots-title');
  const list      = document.getElementById('day-slots-list');
  if (!dateStr) {
    if (title) title.textContent = 'Chọn ngày để xem khung giờ';
    if (list) list.innerHTML = '';
    return;
  }
  if (title) title.textContent = `Khung giờ ngày ${formatDate(dateStr)}`;
  await filterDaySlots();
}

async function filterDaySlots() {
  if (!selectedCalDate) return;
  const kwRaw = (document.getElementById('slot-search')?.value||'').trim();
  const kw    = normalizeSearchText(kwRaw);
  const list = document.getElementById('day-slots-list');
  try {
    const slots = await API.getKhungGio({ ngay: selectedCalDate });
    const filtered = kw
      ? slots.filter(s =>
          normalizeSearchText(s.gio_bat_dau).includes(kw) ||
          normalizeSearchText(s.gio_ket_thuc).includes(kw))
      : slots;
    if (!slots.length) {
      list.innerHTML='<div class="text-secondary fs-sm">Chưa có khung giờ nào</div>'; return;
    }
    if (!filtered.length) {
      list.innerHTML=`<div class="text-secondary fs-sm">Không tìm thấy "<b>${escapeHtml(kwRaw)}</b>"</div>`; return;
    }
    list.innerHTML = filtered.map(s=>`
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:var(--bg-light);border-radius:8px;margin-bottom:8px">
        <div>
          <span class="fw-semibold">${formatTime(s.gio_bat_dau)} – ${formatTime(s.gio_ket_thuc)}</span>
          <span class="text-secondary fs-sm" style="margin-left:8px">${s.da_dat||0}/${s.so_luong_slot} xe</span>
        </div>
        <button class="btn btn-danger btn-sm" onclick="deleteSlot(${s.id})"><i class="bi bi-trash"></i></button>
      </div>`).join('');
  } catch (e) { list.innerHTML=`<div class="alert alert-danger">Lỗi: ${e.message}</div>`; }
}

async function addSlot() {
  if (!selectedCalDate) { showToast('Vui lòng chọn ngày trước','danger'); return; }
  const start    = document.getElementById('slot-start').value;
  const end      = document.getElementById('slot-end').value;
  const capacity = parseInt(document.getElementById('slot-capacity').value);
  if (!start||!end||isNaN(capacity)) { showToast('Vui lòng điền đầy đủ','danger'); return; }
  if (start>=end) { showToast('Giờ kết thúc phải sau giờ bắt đầu','danger'); return; }
  try {
    await API.createKhungGio(selectedCalDate, start, end, capacity);
    renderDaySlots(selectedCalDate);
    renderCalendar();
    showToast(`Đã thêm khung giờ ${start}–${end}`);
  } catch (e) { showToast(e.message,'danger'); }
}

async function deleteSlot(id) {
  if (!confirm('Xóa khung giờ này?')) return;
  try {
    await API.deleteKhungGio(id);
    renderDaySlots(selectedCalDate);
    renderCalendar();
    showToast('Đã xóa khung giờ');
  } catch (e) { showToast(e.message,'danger'); }
}

// -------------------------------------------------------
// HÓA ĐƠN ADMIN
// List /hoa-don: inv.lich_hen.ten_kh, inv.lich_hen.bien_so_xe, inv.lich_hen.hang_xe, inv.lich_hen.dong_xe
// -------------------------------------------------------
function filterInvoices(status, btn) {
  invoiceFilter = status;
  document.querySelectorAll('#invoice-tabs .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderInvoices(status);
}

async function renderInvoices(status) {
  try {
    const params = {};
    if (status && status!=='all') params.trang_thai = status;
    if (adminSearchKw) params.q = adminSearchKw;
    const list = await API.getHoaDon(params);
    document.getElementById('admin-invoices-tbody').innerHTML = list.length
      ? list.map(inv=>{
          const lh = inv.lich_hen;
          return `<tr>
            <td class="fw-bold">#INV-${String(inv.id).padStart(3,'0')}</td>
            <td>${lh?.ten_kh||'–'}</td>
            <td>${lh?.bien_so_xe||'–'}<br><span class="text-secondary fs-sm">${lh?.hang_xe||''}–${lh?.dong_xe||''}</span></td>
            <td style="max-width:150px;font-size:12px">${(inv.dich_vu||[]).map(s=>s.ten_dich_vu).join(', ')}</td>
            <td class="fw-bold text-primary">${formatPrice(inv.tong_tien)}</td>
            <td>${getStatusBadge(inv.trang_thai)}</td>
            <td>
              ${inv.trang_thai==='chua_thanh_toan'
                ?`<button class="btn btn-outline btn-sm" onclick="openConfirmPay(${inv.id})" title="Xác nhận khách đã trả tiền mặt">
                    <i class="bi bi-cash-coin"></i> Tiền mặt
                  </button>`
                :inv.trang_thai==='da_thanh_toan'
                  ?`<span class="text-secondary fs-sm">✓ Đã thanh toán</span>`
                  :`<span class="text-secondary fs-sm">–</span>`}
            </td>
          </tr>`;
        }).join('')
      : `<tr><td colspan="7" style="text-align:center;padding:32px;color:#94a3b8">Không có dữ liệu</td></tr>`;
  } catch (e) { showToast('Lỗi: '+e.message,'danger'); }
}

let _payInvId = null;

async function openConfirmPay(invId) {
  _payInvId = invId;
  try {
    const all = await API.getHoaDon();
    const inv = all.find(i=>i.id===invId); if (!inv) return;
    const lh  = inv.lich_hen;
    document.getElementById('confirm-pay-body').innerHTML = `
      <div class="alert alert-warning" style="display:flex;align-items:center;gap:8px">
        <i class="bi bi-cash-coin" style="font-size:20px"></i>
        <div>
          <div class="fw-bold">Xác nhận thanh toán tiền mặt</div>
          <div style="font-size:12px;opacity:.8">Chỉ dùng khi khách hàng thanh toán trực tiếp tại quầy</div>
        </div>
      </div>
      <div style="background:var(--bg-light);border-radius:10px;padding:16px;margin-top:12px">
        <div style="display:flex;justify-content:space-between;margin-bottom:10px">
          <span class="text-secondary">Khách hàng</span><span class="fw-bold">${lh?.ten_kh||'–'}</span></div>
        <div style="display:flex;justify-content:space-between;margin-bottom:10px">
          <span class="text-secondary">Xe</span><span class="fw-bold">${lh?.bien_so_xe||'–'} – ${lh?.dong_xe||''}</span></div>
        ${(inv.dich_vu||[]).map(s=>`
          <div style="display:flex;justify-content:space-between;padding:6px 0;border-top:1px solid #e2e8f0">
            <span>${s.ten_dich_vu}</span><span>${formatPrice(s.gia_tien)}</span></div>`).join('')}
        <div style="display:flex;justify-content:space-between;padding:12px 0 0;border-top:2px solid #e2e8f0;font-size:16px;font-weight:800">
          <span>Tổng</span><span style="color:var(--primary)">${formatPrice(inv.tong_tien)}</span></div>
      </div>`;
    document.getElementById('btn-confirm-pay').onclick = () => confirmPayment(invId);
    openModal('modal-confirm-pay');
  } catch (e) { showToast(e.message,'danger'); }
}

async function confirmPayment(invId) {
  try {
    await API.thanhToanHoaDon(invId);
    closeModal('modal-confirm-pay');
    renderInvoices(invoiceFilter);
    renderDashboard();
    showToast(`Đã xác nhận thanh toán hóa đơn #INV-${String(invId).padStart(3,'0')} ✅`);
  } catch (e) { showToast(e.message,'danger'); }
}

// =======================================================
// BÁO CÁO BIỂU ĐỒ DOANH THU & DỊCH VỤ (Chart.js)
// =======================================================

let _chartBar = null;
let _chartPie = null;
let _reportDataDoanhThu = [];
let _reportDataDichVu = [];

// Bảng màu cho biểu đồ tròn
const PIE_COLORS = [
  '#6366f1','#f59e0b','#10b981','#ef4444','#3b82f6',
  '#ec4899','#14b8a6','#f97316','#8b5cf6','#06b6d4',
];

/** Khởi tạo dropdown năm (5 năm gần nhất) và tháng mặc định */
function initReportFilters() {
  const now = new Date();
  const curYear  = now.getFullYear();
  const curMonth = now.getMonth() + 1;

  const selNam = document.getElementById('filter-nam');
  if (!selNam) return;
  selNam.innerHTML = '';
  for (let y = curYear; y >= curYear - 4; y--) {
    const opt = document.createElement('option');
    opt.value = y; opt.textContent = y;
    selNam.appendChild(opt);
  }
  selNam.value = curYear;

  const selThang = document.getElementById('filter-thang');
  if (selThang) selThang.value = curMonth;
}

/** Gọi khi người dùng thay đổi bộ lọc */
async function onReportFilterChange() {
  const nam   = parseInt(document.getElementById('filter-nam')?.value  || new Date().getFullYear());
  const thang = parseInt(document.getElementById('filter-thang')?.value || new Date().getMonth() + 1);
  await Promise.all([
    renderBarChart(nam, thang),
    renderPieChart(nam, thang),
  ]);
}

/** Render biểu đồ cột doanh thu theo tháng trong năm `nam`, highlight tháng `thang` */
async function renderBarChart(nam, thang) {
  try {
    const data = await API.getBaoCaoDoanhThu(nam);
    _reportDataDoanhThu = data || [];
    
    const wrap = document.getElementById('bar-chart-wrap');
    const pillsEl = document.getElementById('bar-chart-pills');

    if (!_reportDataDoanhThu.length) {
      wrap.innerHTML = `<div class="chart-empty"><i class="bi bi-bar-chart"></i>Không có dữ liệu doanh thu năm ${nam}</div>`;
      if (pillsEl) pillsEl.innerHTML = '';
      if (_chartBar) { _chartBar.destroy(); _chartBar = null; }
      return;
    }

    // Khôi phục canvas nếu đã bị thay bởi div empty
    if (!wrap.querySelector('canvas')) {
      wrap.innerHTML = '<canvas id="chart-doanh-thu" height="210"></canvas>';
    }

    const labels   = _reportDataDoanhThu.map(d => `Th.${d.thang}`);
    const revenues = _reportDataDoanhThu.map(d => Number(d.tong_tien));
    const counts   = _reportDataDoanhThu.map(d => d.so_hoa_don);

    const barColors  = _reportDataDoanhThu.map(d => d.thang === thang ? '#6366f1' : 'rgba(99,102,241,0.32)');
    const barBorders = _reportDataDoanhThu.map(d => d.thang === thang ? '#4338ca' : 'rgba(99,102,241,0.55)');

    const ctx = document.getElementById('chart-doanh-thu');
    if (!ctx) return;
    if (_chartBar) _chartBar.destroy();

    _chartBar = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            type: 'bar',
            label: 'Doanh thu (VNĐ)',
            data: revenues,
            backgroundColor: barColors,
            borderColor: barBorders,
            borderWidth: 2,
            borderRadius: 7,
            borderSkipped: false,
            order: 2,
          },
          {
            type: 'line',
            label: 'Xu hướng',
            data: revenues,
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245,158,11,0.08)',
            borderWidth: 2.5,
            pointBackgroundColor: '#f59e0b',
            pointRadius: 4,
            pointHoverRadius: 6,
            fill: true,
            tension: 0.4,
            order: 1,
          }
        ]
      },
      options: {
        responsive: true,
        animation: { duration: 0 }, // Render ngay để có thể lấy ảnh xuất Excel ngay lập tức
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: true, position: 'top',
            labels: { font: { size: 12 }, usePointStyle: true, boxWidth: 10 }
          },
          tooltip: {
            callbacks: {
              label(ctx) {
                if (ctx.datasetIndex === 0) {
                  const idx = ctx.dataIndex;
                  return [
                    ` Doanh thu: ${formatPrice(ctx.parsed.y)}`,
                    ` Số hóa đơn: ${counts[idx]}`,
                  ];
                }
                return ` Xu hướng: ${formatPrice(ctx.parsed.y)}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: v => v >= 1000000
                ? (v/1000000).toFixed(1)+'M'
                : v >= 1000 ? (v/1000).toFixed(0)+'k' : v,
              font: { size: 11 }
            },
            grid: { color: 'rgba(0,0,0,0.05)' }
          },
          x: { ticks: { font: { size: 12 } }, grid: { display: false } }
        }
      }
    });

    // Summary pills
    const total = revenues.reduce((a, b) => a + b, 0);
    const best  = _reportDataDoanhThu.reduce((a, b) => (Number(b.tong_tien) > Number(a.tong_tien) ? b : a), _reportDataDoanhThu[0]);
    if (pillsEl) {
      pillsEl.innerHTML = `
        <div class="chart-pill">Tổng năm: <span>${formatPrice(total)}</span></div>
        <div class="chart-pill">Cao nhất: <span>Th.${best.thang} – ${formatPrice(best.tong_tien)}</span></div>
        <div class="chart-pill">Số tháng: <span>${_reportDataDoanhThu.length}</span></div>
      `;
    }
    const sub = document.getElementById('bar-chart-sub');
    if (sub) sub.textContent = `Doanh thu theo từng tháng – Năm ${nam} (tháng ${thang} được làm nổi bật)`;

  } catch (e) { console.error('renderBarChart:', e); }
}

/** Render biểu đồ tròn tỷ lệ dịch vụ tháng `thang`/`nam` */
async function renderPieChart(nam, thang) {
  try {
    const data = await API.getBaoCaoDichVu(nam, thang);
    _reportDataDichVu = data || [];
    
    const wrap    = document.getElementById('pie-chart-wrap');
    const pillsEl = document.getElementById('pie-chart-pills');

    if (!_reportDataDichVu.length) {
      wrap.innerHTML = `<div class="chart-empty"><i class="bi bi-pie-chart"></i>Không có dịch vụ nào trong Tháng ${thang}/${nam}</div>`;
      if (pillsEl) pillsEl.innerHTML = '';
      if (_chartPie) { _chartPie.destroy(); _chartPie = null; }
      return;
    }

    // Gộp "Khác" nếu > 7 loại
    const MAX_SLICES = 7;
    let displayData = _reportDataDichVu;
    if (_reportDataDichVu.length > MAX_SLICES) {
      const top    = _reportDataDichVu.slice(0, MAX_SLICES);
      const others = _reportDataDichVu.slice(MAX_SLICES).reduce((s, d) => s + d.so_luot, 0);
      displayData  = [...top, { ten_dich_vu: 'Khác', so_luot: others }];
    }

    // Khôi phục canvas nếu cần
    if (!wrap.querySelector('canvas')) {
      wrap.innerHTML = '<canvas id="chart-dich-vu" height="210"></canvas>';
    }

    const labels = displayData.map(d => d.ten_dich_vu);
    const values = displayData.map(d => d.so_luot);
    const total  = values.reduce((a, b) => a + b, 0);
    const colors = labels.map((_, i) => PIE_COLORS[i % PIE_COLORS.length]);

    const ctx = document.getElementById('chart-dich-vu');
    if (!ctx) return;
    if (_chartPie) _chartPie.destroy();

    _chartPie = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: colors,
          borderColor: '#fff',
          borderWidth: 3,
          hoverOffset: 8,
        }]
      },
      options: {
        responsive: true,
        animation: { duration: 0 }, // Render ngay
        plugins: {
          legend: {
            display: true, position: 'bottom',
            labels: { font: { size: 11.5 }, padding: 10, usePointStyle: true, boxWidth: 10 }
          },
          tooltip: {
            callbacks: {
              label(ctx) {
                const pct = ((ctx.parsed / total) * 100).toFixed(1);
                return ` ${ctx.label}: ${ctx.parsed} lượt (${pct}%)`;
              }
            }
          }
        },
        cutout: '55%',
      }
    });

    if (pillsEl) {
      pillsEl.innerHTML = `
        <div class="chart-pill">Tổng lượt: <span>${total}</span></div>
        <div class="chart-pill">Phổ biến nhất: <span>${displayData[0]?.ten_dich_vu}</span></div>
      `;
    }
    const sub = document.getElementById('pie-chart-sub');
    if (sub) sub.textContent = `Số lượt thực hiện từng dịch vụ – Tháng ${thang}/${nam}`;

  } catch (e) { console.error('renderPieChart:', e); }
}

/** Xuất báo cáo Excel kèm hình ảnh biểu đồ */
async function exportReportExcel() {
  if (!_chartBar || !_chartPie) {
    showToast('Chưa có đủ dữ liệu biểu đồ để xuất báo cáo', 'warning');
    return;
  }

  const nam = document.getElementById('filter-nam').value;
  const thang = document.getElementById('filter-thang').value;

  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'AutoCare Admin';
    workbook.created = new Date();

    // ── SHEET 1: DOANH THU THEO THÁNG ──
    const sheet1 = workbook.addWorksheet(`Doanh Thu ${nam}`);
    
    // Set độ rộng cột
    sheet1.columns = [
      { header: 'Tháng', key: 'thang', width: 15 },
      { header: 'Doanh thu (VNĐ)', key: 'tong_tien', width: 20 },
      { header: 'Số hóa đơn', key: 'so_hoa_don', width: 15 }
    ];
    
    // Style header
    sheet1.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet1.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6366F1' } };
    sheet1.getRow(1).alignment = { horizontal: 'center' };

    let totalRev = 0;
    let totalInv = 0;
    _reportDataDoanhThu.forEach(d => {
      sheet1.addRow({
        thang: `Tháng ${d.thang}`,
        tong_tien: Number(d.tong_tien),
        so_hoa_don: d.so_hoa_don
      });
      totalRev += Number(d.tong_tien);
      totalInv += d.so_hoa_don;
    });

    // Row tổng cộng
    const lastRow1 = sheet1.addRow({
      thang: 'Tổng cộng năm',
      tong_tien: totalRev,
      so_hoa_don: totalInv
    });
    lastRow1.font = { bold: true };
    lastRow1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };

    // Format tiền tệ cột 2
    sheet1.getColumn(2).numFmt = '#,##0';

    // Thêm ảnh biểu đồ cột doanh thu (bên phải bảng dữ liệu)
    const barBase64 = _chartBar.toBase64Image();
    const barImageId = workbook.addImage({ base64: barBase64, extension: 'png' });
    sheet1.addImage(barImageId, {
      tl: { col: 4, row: 0 },
      ext: { width: 550, height: 260 }
    });

    // ── SHEET 2: DỊCH VỤ TRONG THÁNG ──
    const sheet2 = workbook.addWorksheet(`Dịch Vụ T${thang}-${nam}`);
    
    sheet2.columns = [
      { header: 'Tên dịch vụ', key: 'ten_dich_vu', width: 35 },
      { header: 'Số lượt thực hiện', key: 'so_luot', width: 20 },
    ];
    
    sheet2.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet2.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF59E0B' } };
    sheet2.getRow(1).alignment = { horizontal: 'center' };

    let totalLuot = 0;
    _reportDataDichVu.forEach(d => {
      sheet2.addRow({
        ten_dich_vu: d.ten_dich_vu,
        so_luot: d.so_luot
      });
      totalLuot += d.so_luot;
    });
    
    const lastRow2 = sheet2.addRow({
      ten_dich_vu: 'Tổng lượt trong tháng',
      so_luot: totalLuot
    });
    lastRow2.font = { bold: true };
    lastRow2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };

    // Thêm ảnh biểu đồ tròn dịch vụ
    const pieBase64 = _chartPie.toBase64Image();
    const pieImageId = workbook.addImage({ base64: pieBase64, extension: 'png' });
    sheet2.addImage(pieImageId, {
      tl: { col: 3, row: 0 },
      ext: { width: 350, height: 350 }
    });

    // Xuất file và tải về
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Bao_Cao_AutoCare_T${thang}_${nam}.xlsx`);

    showToast('Đã tải xuống báo cáo Excel! ✅');
  } catch (e) {
    console.error('Lỗi khi xuất Excel:', e);
    showToast('Lỗi khi xuất báo cáo: ' + e.message, 'danger');
  }
}

