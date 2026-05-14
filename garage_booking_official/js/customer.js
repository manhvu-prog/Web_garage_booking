// =====================================================
// customer.js – Logic trang Khách hàng
// =====================================================

let historyStatusFilter = 'all';
let invoiceCustFilter   = 'all';
let cancelApptId        = null;
let _cars = [], _services = [], _slots = [];
const CUSTOMER_LAST_PAGE_KEY = 'customer:lastPage';

const booking = {
  step: 1, slotId: null, carId: null, serviceIds: [], total: 0,
};

// -------------------------------------------------------
// KHỞI ĐỘNG
// -------------------------------------------------------
(async function init() {
  if (!Auth.isLoggedIn()) { window.location.href = 'login.html'; return; }
  const user = Auth.getUser();
  if (user) {
    const nameEl = document.getElementById('user-name');
    if (nameEl) nameEl.textContent = user.ho_ten;
    const avatarEl = document.getElementById('user-avatar');
    if (avatarEl) avatarEl.textContent = (user.ho_ten || 'U')[0].toUpperCase();
  }
  const savedPage = localStorage.getItem(CUSTOMER_LAST_PAGE_KEY);
  const initialPage = ['dashboard', 'my-cars', 'booking', 'history', 'invoices'].includes(savedPage)
    ? savedPage
    : 'dashboard';
  showPage(initialPage);
})();

function doLogout() { Auth.clearSession(); window.location.href = 'login.html'; }

// -------------------------------------------------------
// ĐIỀU HƯỚNG
// -------------------------------------------------------
function filterHistory(status, btn) {
  historyStatusFilter = status;
  document.querySelectorAll('#page-history .tab-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderHistory();
}
function filterInvoiceCustomer(status, btn) {
  invoiceCustFilter = status;
  document.querySelectorAll('#page-invoices .tab-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderInvoices();
}

function showPage(id) {
  localStorage.setItem(CUSTOMER_LAST_PAGE_KEY, id);
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const page = document.getElementById('page-' + id);
  if (page) page.classList.add('active');
  const navMap = { dashboard: 0, 'my-cars': 1, booking: 2, history: 3, invoices: 4 };
  const items  = document.querySelectorAll('.nav-item');
  if (navMap[id] !== undefined && items[navMap[id]]) items[navMap[id]].classList.add('active');
  if (id === 'dashboard') renderDashboard();
  if (id === 'my-cars')   renderCars();
  if (id === 'booking')   renderBooking();
  if (id === 'history')   renderHistory();
  if (id === 'invoices')  renderInvoices();
  const hSearch = document.getElementById('history-search');
  if (hSearch) hSearch.value = '';
}

// -------------------------------------------------------
// DASHBOARD
// -------------------------------------------------------
async function renderDashboard() {
  try {
    const [dash, cars, unpaidInvoices] = await Promise.all([
      API.getDashboardKhachHang(),
      API.getCars(),
      API.getHoaDon({ trang_thai: 'chua_thanh_toan' })
    ]);
    _cars = cars;

    // dashboard/khach-hang trả về: { lich_hen_sap_toi, xe_cua_toi, tong_lich_hen }
    // lich_hen_sap_toi: mỗi item có bien_so_xe, hang_xe, dong_xe, ngay, gio_bat_dau, gio_ket_thuc, trang_thai, dich_vu[]
    const appts = dash.lich_hen_sap_toi || [];
    const tbody = document.getElementById('upcoming-tbody');
    if (tbody) tbody.innerHTML = appts.length
      ? appts.slice(0,5).map(a => `<tr>
          <td><b>${a.bien_so_xe || '–'}</b><br>
              <span class="text-secondary fs-sm">${a.hang_xe} – ${a.dong_xe}</span></td>
          <td>${formatTime(a.gio_bat_dau)} – ${formatTime(a.gio_ket_thuc)}<br>
              <span class="text-secondary fs-sm">${formatDate(a.ngay)}</span></td>
          <td style="max-width:160px">${(a.dich_vu||[]).join(', ')}</td>
          <td>${getStatusBadge(a.trang_thai)}</td>
          <td><button class="btn btn-outline btn-sm" onclick="showPage('history')">Chi tiết</button></td>
        </tr>`).join('')
      : `<tr><td colspan="5" style="text-align:center;padding:24px;color:#94a3b8">Không có lịch hẹn sắp tới</td></tr>`;

    const miniEl = document.getElementById('my-cars-mini');
    if (miniEl) miniEl.innerHTML = cars.slice(0,3).map(c => `
      <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #f1f5f9">
        <div class="car-icon"><i class="bi bi-car-front"></i></div>
        <div><div class="fw-bold">${c.bien_so_xe}</div>
             <div class="text-secondary fs-sm">${c.hang_xe} – ${c.dong_xe}</div></div>
      </div>`).join('')
      + `<button class="btn btn-outline btn-sm mt-3" style="width:100%" onclick="showPage('my-cars')">Quản lý xe</button>`;

    // Update stat counters
    const statCars = document.getElementById('stat-cars');
    if (statCars) statCars.textContent = cars.length;

    const statUpcoming = document.getElementById('stat-upcoming');
    if (statUpcoming) statUpcoming.textContent = appts.length;

    const statMaintenance = document.getElementById('stat-maintenance');
    if (statMaintenance) {
      const total =
        (typeof dash?.tong_lich_hen === 'number') ? dash.tong_lich_hen :
        (typeof dash?.hoan_thanh === 'number') ? dash.hoan_thanh :
        null;
      statMaintenance.textContent = total ?? '–';
    }

    const statUnpaid = document.getElementById('stat-unpaid');
    if (statUnpaid) statUnpaid.textContent = unpaidInvoices?.length ?? 0;
  } catch (e) { showToast('Lỗi tải dashboard: ' + e.message, 'danger'); }
}

// -------------------------------------------------------
// XE CỦA TÔI
// -------------------------------------------------------
async function renderCars() {
  const kw = (document.getElementById('cars-search')?.value || '').trim();
  try {
    _cars = await API.getCars(kw ? { q: kw } : {});
    document.getElementById('cars-grid').innerHTML = _cars.map(c => `
      <div class="card" style="padding:20px">
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:14px">
          <div class="car-icon" style="width:48px;height:48px;font-size:22px">
            <i class="bi bi-car-front-fill"></i></div>
          <div><div class="car-plate" style="font-size:17px">${c.bien_so_xe}</div>
               <div class="car-model">${c.hang_xe} – ${c.dong_xe}</div></div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-primary btn-sm" style="flex:1" onclick="showPage('booking')">
            <i class="bi bi-calendar-plus"></i> Đặt lịch</button>
          <button class="btn btn-outline btn-sm" onclick="deleteCar(${c.id})">
            <i class="bi bi-trash"></i></button>
        </div>
      </div>`).join('')
      || `<div class="empty-state"><div class="empty-icon"><i class="bi bi-car-front"></i></div>
          <div class="empty-title">${kw ? 'Không tìm thấy xe nào' : 'Chưa có xe nào'}</div>
          <div class="empty-desc">${kw ? 'Thử từ khóa khác' : 'Thêm xe để bắt đầu'}</div></div>`;
  } catch (e) { showToast('Lỗi tải xe: ' + e.message, 'danger'); }
}

async function addCar() {
  const plate = document.getElementById('car-plate').value.trim();
  const brand = document.getElementById('car-brand').value.trim();
  const model = document.getElementById('car-model-input').value.trim();
  if (!plate) { showToast('Vui lòng nhập biển số xe', 'danger'); return; }
  try {
    await API.createCar(plate, brand, model);
    closeModal('modal-add-car');
    ['car-plate','car-brand','car-model-input'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
    showToast('Đã thêm xe ' + plate);
    renderCars();
  } catch (e) { showToast(e.message, 'danger'); }
}

async function deleteCar(id) {
  if (!confirm('Xóa xe này?')) return;
  try {
    await API.deleteCar(id);
    showToast('Đã xóa xe');
    renderCars();
  } catch (e) { showToast(e.message, 'danger'); }
}

// -------------------------------------------------------
// ĐẶT LỊCH
// -------------------------------------------------------
async function renderBooking() {
  booking.step = 1; booking.slotId = null;
  booking.carId = null; booking.serviceIds = []; booking.total = 0;
  updateBookingSteps(); updateSummary();
  document.getElementById('booking-step1').style.display = 'block';
  document.getElementById('booking-step2').style.display = 'none';
  document.getElementById('booking-step3').style.display = 'none';
  document.getElementById('btn-prev').style.display = 'none';
  document.getElementById('btn-next').disabled = true;
  document.getElementById('btn-next').innerHTML = 'Tiếp theo <i class="bi bi-arrow-right"></i>';
  await renderSlots();
}

// ---- Calendar state ----
let _calYear = new Date().getFullYear();
let _calMonth = new Date().getMonth(); // 0-based
let _calSelectedDate = null; // 'YYYY-MM-DD'

async function renderSlots() {
  document.getElementById('slots-container').innerHTML =
    `<div style="text-align:center;padding:32px;color:#94a3b8"><i class="bi bi-hourglass-split"></i> Đang tải...</div>`;
  try {
    _slots = await API.getKhungGio();
    // Init calendar to current month
    const today = new Date();
    _calYear = today.getFullYear();
    _calMonth = today.getMonth();
    _calSelectedDate = null;
    renderCalendar();
  } catch (e) {
    document.getElementById('slots-container').innerHTML =
      `<div class="alert alert-danger">Lỗi tải khung giờ: ${e.message}</div>`;
  }
}

function renderCalendar() {
  // Build set of dates that have slots
  const slotDates = new Set(_slots.map(s => s.ngay));

  const year = _calYear, month = _calMonth;
  const monthNames = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6',
                      'Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];
  const dayNames = ['CN','T2','T3','T4','T5','T6','T7'];

  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();

  const todayStr = new Date().toISOString().split('T')[0];

  let dayCells = '';
  // Padding from previous month
  for (let i = firstDay - 1; i >= 0; i--) {
    dayCells += `<div class="cal-day other-month">${prevDays - i}</div>`;
  }
  // Days of current month
  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    const dateStr = `${year}-${mm}-${dd}`;
    const isPast = dateStr < todayStr;
    const isToday = dateStr === todayStr;
    const isSelected = dateStr === _calSelectedDate;
    const hasSlot = slotDates.has(dateStr);
    let cls = 'cal-day';
    if (isPast) cls += ' disabled';
    if (isToday && !isSelected) cls += ' today';
    if (isSelected) cls += ' selected';
    if (hasSlot) cls += ' has-slot';
    const onclick = (!isPast && hasSlot) ? `onclick="calSelectDate('${dateStr}')"` : '';
    dayCells += `<div class="${cls}" ${onclick}>${d}</div>`;
  }
  // Padding for next month
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  let nextD = 1;
  for (let i = firstDay + daysInMonth; i < totalCells; i++, nextD++) {
    dayCells += `<div class="cal-day other-month">${nextD}</div>`;
  }

  // Build slot HTML for selected date
  let slotHtml = '';
  if (_calSelectedDate) {
    const daySlots = _slots.filter(s => s.ngay === _calSelectedDate);
    if (daySlots.length === 0) {
      slotHtml = `<div class="slot-section-title">Khung giờ ngày ${formatDate(_calSelectedDate)}</div>
        <div class="empty-state" style="padding:16px 0"><div class="empty-title" style="font-size:14px">Không có khung giờ cho ngày này</div></div>`;
    } else {
      slotHtml = `<div class="slot-section-title">Khung giờ ngày ${formatDate(_calSelectedDate)}</div>
        <div class="slot-grid">`;
      daySlots.forEach(s => {
        const avail = s.con_trong ?? Math.max(0, s.so_luong_slot - (s.da_dat||0));
        const full = avail <= 0;
        slotHtml += `<div class="slot-card ${full?'disabled':''}" id="slot-${s.id}"
          onclick="${full?'':'selectSlot('+s.id+')'}">
          <div class="slot-time">${formatTime(s.gio_bat_dau)} – ${formatTime(s.gio_ket_thuc)}</div>
          <div class="slot-count">${s.da_dat||0}/${s.so_luong_slot}</div>
          <div class="slot-avail ${full?'red':'green'}">${full?'Đã đầy':'Còn '+avail+' slot'}</div>
        </div>`;
      });
      slotHtml += '</div>';
    }
  }

  document.getElementById('slots-container').innerHTML = `
    <div class="booking-calendar-wrap">
      <div class="cal-header">
        <button class="cal-nav-btn" onclick="calPrevMonth()"><i class="bi bi-chevron-left"></i></button>
        <div class="cal-title">${monthNames[month]}, ${year}</div>
        <button class="cal-nav-btn" onclick="calNextMonth()"><i class="bi bi-chevron-right"></i></button>
      </div>
      <div class="cal-grid">
        ${dayNames.map(d => `<div class="cal-day-name">${d}</div>`).join('')}
        ${dayCells}
      </div>
      ${slotHtml}
    </div>`;
}

function calPrevMonth() {
  _calMonth--;
  if (_calMonth < 0) { _calMonth = 11; _calYear--; }
  renderCalendar();
}
function calNextMonth() {
  _calMonth++;
  if (_calMonth > 11) { _calMonth = 0; _calYear++; }
  renderCalendar();
}
function calSelectDate(dateStr) {
  _calSelectedDate = dateStr;
  // Reset slot selection if date changed
  booking.slotId = null;
  document.getElementById('btn-next').disabled = true;
  document.getElementById('sum-slot').textContent = 'Chưa chọn';
  renderCalendar();
}

function selectSlot(id) {
  booking.slotId = id;
  document.querySelectorAll('.slot-card').forEach(el => el.classList.remove('selected'));
  document.getElementById('slot-'+id)?.classList.add('selected');
  const s = _slots.find(s => s.id === id);
  document.getElementById('sum-slot').textContent = `${formatTime(s.gio_bat_dau)}–${formatTime(s.gio_ket_thuc)}, ${formatDate(s.ngay)}`;
  document.getElementById('btn-next').disabled = false;
}

async function renderStep2() {
  try {
    [_cars, _services] = await Promise.all([API.getCars(), API.getDichVu()]);
    document.getElementById('car-select-list').innerHTML = _cars.map(c => `
      <div class="car-card" id="car-sel-${c.id}" onclick="selectCar(${c.id})">
        <div class="car-icon"><i class="bi bi-car-front"></i></div>
        <div><div class="fw-bold">${c.bien_so_xe}</div>
             <div class="text-secondary fs-sm">${c.hang_xe} – ${c.dong_xe}</div></div>
      </div>`).join('') || `<div class="text-secondary" style="padding:20px">Bạn chưa có xe nào. <a onclick="showPage('my-cars')" style="cursor:pointer;color:var(--primary)">Thêm xe</a></div>`;

    document.getElementById('service-select-grid').innerHTML = _services.map(s => `
      <div class="service-item" id="svc-${s.id}" onclick="toggleService(${s.id})">
        <div class="service-name">${s.ten_dich_vu}</div>
        <div class="service-price">${formatPrice(s.gia_tien)}</div>
        <div class="service-time"><i class="bi bi-clock"></i> ${s.thoi_gian_uoc_tinh} phút</div>
      </div>`).join('');
  } catch (e) { showToast('Lỗi tải dữ liệu: '+e.message,'danger'); }
}

function selectCar(id) {
  booking.carId = id;
  document.querySelectorAll('.car-card').forEach(el => el.classList.remove('selected'));
  document.getElementById('car-sel-'+id)?.classList.add('selected');
  const c = _cars.find(c => c.id === id);
  document.getElementById('sum-car').textContent = `${c.bien_so_xe} – ${c.dong_xe}`;
  checkStep2Valid();
}

function toggleService(id) {
  const idx = booking.serviceIds.indexOf(id);
  if (idx===-1) booking.serviceIds.push(id); else booking.serviceIds.splice(idx,1);
  document.getElementById('svc-'+id)?.classList.toggle('selected', booking.serviceIds.includes(id));
  booking.total = booking.serviceIds.reduce((sum,sid)=>sum+(_services.find(s=>s.id===sid)?.gia_tien||0),0);
  updateSummary();
  checkStep2Valid();
}

function checkStep2Valid() {
  document.getElementById('btn-next').disabled = !(booking.carId && booking.serviceIds.length>0);
}

function updateSummary() {
  const names = booking.serviceIds.map(id=>_services.find(s=>s.id===id)?.ten_dich_vu);
  document.getElementById('sum-svc-label').textContent = `Dịch vụ (${booking.serviceIds.length})`;
  document.getElementById('sum-services').textContent  = names.join(', ') || 'Chưa chọn';
  document.getElementById('sum-total').textContent     = formatPrice(booking.total);
}

function renderStep3() {
  const slot = _slots.find(s=>s.id===booking.slotId);
  const car  = _cars.find(c=>c.id===booking.carId);
  const svcs = booking.serviceIds.map(id=>_services.find(s=>s.id===id));
  document.getElementById('confirm-detail').innerHTML = `
    <div style="display:grid;gap:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:14px;background:var(--bg-light);border-radius:10px">
        <div><div class="text-secondary fs-sm">Khung giờ</div>
             <div class="fw-bold">${formatTime(slot?.gio_bat_dau)} – ${formatTime(slot?.gio_ket_thuc)}</div>
             <div class="text-secondary fs-sm">${formatDate(slot?.ngay)}</div></div>
        <i class="bi bi-calendar-event text-primary" style="font-size:22px"></i>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:14px;background:var(--bg-light);border-radius:10px">
        <div><div class="text-secondary fs-sm">Xe</div>
             <div class="fw-bold">${car?.bien_so_xe}</div>
             <div class="text-secondary fs-sm">${car?.hang_xe} – ${car?.dong_xe}</div></div>
        <i class="bi bi-car-front text-primary" style="font-size:22px"></i>
      </div>
      <div style="padding:14px;background:var(--bg-light);border-radius:10px">
        <div class="text-secondary fs-sm mb-2">Dịch vụ</div>
        ${svcs.map(s=>`<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #e2e8f0">
          <span>${s?.ten_dich_vu}</span><span class="text-primary fw-bold">${formatPrice(s?.gia_tien)}</span></div>`).join('')}
        <div style="display:flex;justify-content:space-between;padding-top:10px;font-weight:800">
          <span>Tổng cộng</span><span style="color:var(--primary)">${formatPrice(booking.total)}</span></div>
      </div>
      <div>
        <label class="form-label">Ghi chú (không bắt buộc)</label>
        <textarea class="form-control" id="booking-note" rows="2"
          placeholder="VD: Xe bị rò dầu, cần kiểm tra..."></textarea>
      </div>
    </div>`;
}

function updateBookingSteps() {
  for (let i=1;i<=3;i++) {
    const el = document.getElementById('step-'+i);
    if (!el) continue;
    el.classList.remove('active','done');
    if (i < booking.step) el.classList.add('done');
    else if (i === booking.step) el.classList.add('active');
  }
}

async function bookingNext() {
  if (booking.step===1 && !booking.slotId) return;
  if (booking.step===3) { await confirmBooking(); return; }
  booking.step++; updateBookingSteps();
  if (booking.step===2) {
    document.getElementById('booking-step1').style.display='none';
    document.getElementById('booking-step2').style.display='block';
    document.getElementById('booking-step3').style.display='none';
    document.getElementById('btn-prev').style.display='';
    document.getElementById('btn-next').disabled=true;
    document.getElementById('btn-next').innerHTML='Tiếp theo <i class="bi bi-arrow-right"></i>';
    await renderStep2();
  } else if (booking.step===3) {
    document.getElementById('booking-step2').style.display='none';
    document.getElementById('booking-step3').style.display='block';
    document.getElementById('btn-next').innerHTML='<i class="bi bi-check-lg"></i> Xác nhận đặt lịch';
    document.getElementById('btn-next').disabled=false;
    renderStep3();
  }
}

function bookingPrev() {
  if (booking.step===1) return;
  booking.step--; updateBookingSteps();
  if (booking.step===1) {
    document.getElementById('btn-prev').style.display='none';
    document.getElementById('booking-step1').style.display='block';
    document.getElementById('booking-step2').style.display='none';
    document.getElementById('btn-next').innerHTML='Tiếp theo <i class="bi bi-arrow-right"></i>';
    document.getElementById('btn-next').disabled=!booking.slotId;
  } else if (booking.step===2) {
    document.getElementById('booking-step2').style.display='block';
    document.getElementById('booking-step3').style.display='none';
    document.getElementById('btn-next').innerHTML='Tiếp theo <i class="bi bi-arrow-right"></i>';
    checkStep2Valid();
  }
}

async function confirmBooking() {
  const note = document.getElementById('booking-note')?.value||'';
  const btn  = document.getElementById('btn-next');
  btn.disabled=true; btn.innerHTML='<i class="bi bi-hourglass-split"></i> Đang đặt...';
  try {
    await API.createLichHen(booking.slotId, booking.carId, booking.serviceIds, note);
    btn.innerHTML='<i class="bi bi-check-circle-fill"></i> Đặt lịch thành công!';
    btn.style.background='var(--success,#16a34a)';
    showToast('Đặt lịch thành công! 🎉');
    setTimeout(() => { btn.style.background=''; showPage('history'); }, 1200);
  } catch (e) {
    showToast(e.message,'danger');
    btn.disabled=false;
    btn.innerHTML='<i class="bi bi-check-lg"></i> Xác nhận đặt lịch';
  }
}

// -------------------------------------------------------
// HỦY LỊCH
// -------------------------------------------------------
async function openCancelConfirm(apptId) {
  cancelApptId = apptId;
  try {
    // Detail endpoint trả nested: a.khung_gio.ngay, a.xe.bien_so_xe, a.dich_vu[]
    const a = await API.getLichHenDetail(apptId);
    document.getElementById('cancel-appt-info').innerHTML = `
      <div style="display:flex;gap:12px;align-items:center;margin-bottom:12px">
        <div class="car-icon"><i class="bi bi-car-front-fill"></i></div>
        <div><div class="fw-bold" style="font-size:15px">${a.xe?.bien_so_xe}</div>
             <div class="text-secondary fs-sm">${a.xe?.hang_xe} – ${a.xe?.dong_xe}</div></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px">
        <div><span class="text-secondary">Khung giờ: </span><b>${formatTime(a.khung_gio?.gio_bat_dau)} – ${formatTime(a.khung_gio?.gio_ket_thuc)}</b></div>
        <div><span class="text-secondary">Ngày: </span><b>${formatDate(a.khung_gio?.ngay)}</b></div>
      </div>
      <div style="margin-top:8px;font-size:13px">
        <span class="text-secondary">Dịch vụ: </span>${(a.dich_vu||[]).map(s=>s.ten_dich_vu).join(', ')}
      </div>`;
    document.getElementById('btn-do-cancel').onclick = doCancel;
    document.getElementById('cancel-reason').value = '';
    openModal('modal-cancel-confirm');
  } catch (e) { showToast(e.message,'danger'); }
}

async function doCancel() {
  try {
    await API.huyLichHen(cancelApptId);
    closeModal('modal-cancel-confirm');
    showToast('Đã hủy lịch hẹn thành công');
    renderHistory();
  } catch (e) { showToast(e.message,'danger'); }
}

// -------------------------------------------------------
// LỊCH SỬ
// List /lich-hen trả flat: a.ngay, a.gio_bat_dau, a.bien_so_xe, a.ten_kh
// -------------------------------------------------------
async function renderHistory() {
  const kw = (document.getElementById('history-search')?.value||'').trim();
  try {
    const params = {};
    if (historyStatusFilter!=='all') params.trang_thai = historyStatusFilter;
    if (kw) params.q = kw;
    const appts = await API.getLichHen(params);

    document.getElementById('history-tbody').innerHTML = appts.length
      ? appts.map(a => {
          const cancelBtn = a.trang_thai==='cho_thuc_hien'
            ? `<button class="btn btn-danger btn-sm" onclick="openCancelConfirm(${a.id})"><i class="bi bi-x-circle"></i> Hủy</button>`
            : `<span style="color:#94a3b8;font-size:12px">–</span>`;
          return `<tr>
            <td>${formatDate(a.ngay)}<br>
                <span class="text-secondary fs-sm">${formatTime(a.gio_bat_dau)}–${formatTime(a.gio_ket_thuc)}</span></td>
            <td>${a.bien_so_xe||'–'}</td>
            <td style="max-width:150px;font-size:12.5px">${(a.dich_vu||[]).map(s=>s.ten_dich_vu).join(', ')}</td>
            <td>${getStatusBadge(a.trang_thai)}</td>
            <td>${cancelBtn}</td>
          </tr>`;
        }).join('')
      : `<tr><td colspan="5" style="text-align:center;padding:24px;color:#94a3b8">Chưa có lịch hẹn nào</td></tr>`;

    document.getElementById('history-timeline').innerHTML = [...appts].reverse().map(a => `
      <div class="record-item"><div class="record-dot"></div>
        <div>
          <div class="record-date">${formatDate(a.ngay)} · ${formatTime(a.gio_bat_dau)}</div>
          <div class="record-plate">${a.bien_so_xe}</div>
          <div class="record-services">${(a.dich_vu||[]).map(s=>s.ten_dich_vu).join(', ')}</div>
          <div class="mt-1">${getStatusBadge(a.trang_thai)}</div>
        </div>
      </div>`).join('');
  } catch (e) { showToast('Lỗi tải lịch sử: '+e.message,'danger'); }
}

// -------------------------------------------------------
// HÓA ĐƠN
// List /hoa-don trả: inv.lich_hen.bien_so_xe, inv.lich_hen.dong_xe, inv.lich_hen.ngay, inv.dich_vu[]
// -------------------------------------------------------
async function renderInvoices() {
  const kw = (document.getElementById('invoice-search')?.value||'').trim();
  try {
    const params = {};
    if (invoiceCustFilter!=='all') params.trang_thai = invoiceCustFilter;
    if (kw) params.q = kw;
    const invoices = await API.getHoaDon(params);

    document.getElementById('invoice-list').innerHTML = invoices.length
      ? invoices.map(inv => {
          const lh = inv.lich_hen;
          const isCancelled = inv.trang_thai==='da_huy';
          return `<div class="card" style="${isCancelled?'opacity:0.65;':''}">
            <div style="display:flex;align-items:center;padding:16px 20px;gap:16px;flex-wrap:wrap">
              <div style="flex:1;min-width:200px">
                <div style="font-weight:700;font-size:15px;${isCancelled?'text-decoration:line-through;color:#94a3b8;':''}">
                  Hóa đơn #INV-${String(inv.id).padStart(3,'0')}</div>
                <div class="text-secondary fs-sm mt-1">${lh?.bien_so_xe||'–'} – ${lh?.dong_xe||''} · ${formatDate(lh?.ngay)}</div>
                <div class="text-secondary fs-sm">${(inv.dich_vu||[]).map(s=>s.ten_dich_vu).join(', ')}</div>
                ${isCancelled?`<div style="font-size:12px;color:#dc2626;margin-top:4px"><i class="bi bi-x-circle-fill"></i> Hóa đơn đã hủy</div>`:''}
              </div>
              <div style="text-align:right">
                <div style="font-size:20px;font-weight:800;color:${isCancelled?'#94a3b8':'var(--primary)'};${isCancelled?'text-decoration:line-through;':''}">${formatPrice(inv.tong_tien)}</div>
                <div class="mt-1">${getStatusBadge(inv.trang_thai)}</div>
              </div>
              <div><button class="btn btn-outline btn-sm" onclick="viewInvoice(${inv.id})"><i class="bi bi-eye"></i> Xem</button></div>
            </div>
          </div>`;
        }).join('')
      : `<div class="empty-state"><div class="empty-icon"><i class="bi bi-receipt"></i></div>
         <div class="empty-title">Chưa có hóa đơn nào</div></div>`;
  } catch (e) { showToast('Lỗi tải hóa đơn: '+e.message,'danger'); }
}

async function viewInvoice(invId) {
  try {
    const all = await API.getHoaDon();
    const inv = all.find(i=>i.id===invId); if (!inv) return;
    const lh = inv.lich_hen;
    const user = Auth.getUser();
    
    let actionButtons = '';
    if (inv.trang_thai === 'chua_thanh_toan') {
        actionButtons = `
            <div style="margin-top: 15px; display: flex; gap: 10px;">
                <button class="btn btn-primary" style="flex: 1" onclick="payWithVNPay(${inv.id})"><i class="bi bi-credit-card-fill"></i> Thanh toán VNPay</button>
            </div>
        `;
    }

    document.getElementById('modal-invoice-body').innerHTML = `
      <div style="background:var(--primary);color:white;padding:20px;border-radius:8px;margin-bottom:20px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div><div style="font-size:12px;opacity:.7;text-transform:uppercase">AutoCare Garage</div>
               <div style="font-size:20px;font-weight:800;margin-top:4px">Hóa đơn #INV-${String(inv.id).padStart(3,'0')}</div></div>
          <div>${getStatusBadge(inv.trang_thai)}</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px;font-size:12px;opacity:.85">
          <div>📅 ${formatDate(lh?.ngay)} · ${formatTime(lh?.gio_bat_dau)}–${formatTime(lh?.gio_ket_thuc)}</div>
          <div>👤 ${user?.ho_ten||''}</div>
          <div>🚗 ${lh?.bien_so_xe||''} – ${lh?.dong_xe||''}</div>
        </div>
      </div>
      <div><div style="font-weight:700;font-size:13px;margin-bottom:10px">Dịch vụ</div>
        ${(inv.dich_vu||[]).map(s=>`
          <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f1f5f9">
            <span>${s.ten_dich_vu}</span><span class="fw-bold">${formatPrice(s.gia_tien)}</span></div>`).join('')}
        <div style="display:flex;justify-content:space-between;padding:14px 0;font-size:16px;font-weight:800;border-top:2px solid var(--border);margin-top:8px">
          <span>Tổng cộng</span><span style="color:var(--primary)">${formatPrice(inv.tong_tien)}</span></div>
      </div>
      ${inv.trang_thai==='chua_thanh_toan'
        ?'<div class="alert alert-info mt-2"><i class="bi bi-info-circle"></i> Vui lòng thanh toán trực tuyến hoặc tại quầy</div>'
        :inv.trang_thai==='da_huy'
          ?'<div class="alert alert-danger mt-2"><i class="bi bi-x-circle-fill"></i> Hóa đơn đã hủy</div>'
          :'<div class="alert alert-success mt-2"><i class="bi bi-check-circle"></i> Đã thanh toán – Cảm ơn bạn!</div>'}
      ${actionButtons}
    `;
    openModal('modal-invoice');
  } catch (e) { showToast(e.message,'danger'); }
}

async function payWithVNPay(invId) {
    try {
        const token = Auth.getToken();
        if (!token) throw new Error('Vui lòng đăng nhập lại');
        
        // Tự động lấy Origin của Frontend (ví dụ http://localhost:5500)
        const frontendOrigin = window.location.origin;
        
        const res = await fetch(`${API_BASE}/payment/create-vnpay-url/${invId}?return_url=${encodeURIComponent(frontendOrigin)}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Lỗi khi tạo URL thanh toán');
        
        // Mở popup thanh toán
        const w = 800;
        const h = 700;
        const left = (screen.width/2)-(w/2);
        const top = (screen.height/2)-(h/2);
        const popup = window.open(data.url, 'VNPay', `width=${w},height=${h},top=${top},left=${left}`);
        
        // Lắng nghe thông báo từ popup (payment_result.html gửi về)
        const handleMessage = (event) => {
            if (event.data && event.data.type === 'PAYMENT_COMPLETED') {
                window.removeEventListener('message', handleMessage);
                if (event.data.status === 'success') {
                    showToast('Thanh toán hoàn tất, đang tải lại dữ liệu...', 'success');
                } else {
                    showToast('Thanh toán chưa thành công hoặc đã bị hủy.', 'warning');
                }
                
                closeModal('modal-invoice'); // Đóng modal hóa đơn
                
                // Đợi 1 chút để IPN phía Backend kịp cập nhật DB, sau đó tải lại Dashboard
                setTimeout(() => {
                    renderDashboard();
                }, 1000);
            }
        };
        window.addEventListener('message', handleMessage);
        
    } catch (e) {
        showToast(e.message, 'danger');
    }
}
