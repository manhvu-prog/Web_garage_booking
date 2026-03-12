
const STAFF_ID = 2;

// -------------------------------------------------------
// ĐIỀU HƯỚNG TRANG
// -------------------------------------------------------
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');

  const items = document.querySelectorAll('.nav-item');
  if (id === 'today')      items[0].classList.add('active');
  if (id === 'my-history') items[1].classList.add('active');

  if (id === 'today')      renderToday();
  if (id === 'my-history') renderMyHistory();
}

// -------------------------------------------------------
// LỊCH LÀM VIỆC HÔM NAY
// -------------------------------------------------------
function renderToday() {
  const todayDate = '2026-03-10';
  const todaySlots = AppData.slots.filter(s => s.date === todayDate);

  let html = '';
  todaySlots.forEach(slot => {
    const appts = AppData.appointments.filter(a => a.slotId === slot.id && a.status !== 'da_huy' && a.status !== 'da_huy');
    if (!appts.length) return;

    html += `
      <div class="timeslot-header">
        <i class="bi bi-calendar2-event timeslot-icon"></i>
        <span class="timeslot-time">${slot.start} – ${slot.end}</span>
        <span class="timeslot-count">${appts.length} xe đang chờ</span>
      </div>
      <div class="appointment-grid">
        ${appts.map(a => renderApptCard(a)).join('')}
      </div>`;
  });

  document.getElementById('staff-slots-container').innerHTML = html
    || `<div class="empty-state">
          <div class="empty-icon"><i class="bi bi-calendar-x"></i></div>
          <div class="empty-title">Không có lịch hôm nay</div>
        </div>`;
}

// Render một thẻ lịch hẹn cho nhân viên
function renderApptCard(appt) {
  const car      = AppData.cars.find(c => c.id === appt.carId);
  const customer = AppData.users.find(u => u.id === appt.userId);
  const svcs     = appt.services.map(id => AppData.services.find(s => s.id === id));
  const staff    = appt.staffId ? AppData.users.find(u => u.id === appt.staffId) : null;

  // Nút hành động tùy trạng thái
  // Chỉ hiện "Nhận xe" khi: chưa có ai phụ trách (staffId === null)
  let actionBtn = '';
  if (appt.status === 'cho_thuc_hien' && appt.staffId === null) {
    actionBtn = `<button class="btn btn-primary btn-lg mt-3" onclick="openAssign(${appt.id})">
      <i class="bi bi-person-check"></i> Nhận xe
    </button>`;
  } else if (appt.status === 'dang_thuc_hien' && appt.staffId === STAFF_ID) {
    actionBtn = `<button class="btn btn-success btn-lg mt-3" onclick="openComplete(${appt.id})">
      <i class="bi bi-check-circle"></i> Hoàn thành
    </button>`;
  } else if (appt.status === 'dang_thuc_hien' && appt.staffId !== STAFF_ID) {
    actionBtn = `<div style="padding:10px;background:#f1f5f9;border-radius:8px;text-align:center;margin-top:12px;font-size:12.5px;color:#64748b">
      <i class="bi bi-person-fill" style="margin-right:4px"></i>
      Đang được <b>${staff?.name || 'nhân viên khác'}</b> phụ trách
    </div>`;
  } else if (appt.status === 'hoan_thanh') {
    actionBtn = `<div class="alert alert-success mt-3"><i class="bi bi-check-circle"></i> Đã hoàn thành</div>`;
  }

  return `<div class="appt-card" id="appt-${appt.id}">
    <div class="appt-header">
      <div>
        <div class="appt-plate">${car?.plate}</div>
        <div class="appt-model">${car?.brand} – ${car?.model}</div>
      </div>
      ${getStatusBadge(appt.status)}
    </div>
    <hr class="appt-divider">
    <div class="appt-customer-name">${customer?.name}</div>
    <div class="appt-customer-phone">${customer?.phone}</div>
    <div class="appt-services mt-2">
      <div class="appt-services-label">Dịch vụ yêu cầu:</div>
      ${svcs.map(s => `<div class="appt-service-tag">${s?.name}</div>`).join('')}
    </div>
    ${staff ? `<div class="appt-staff">Nhân viên phụ trách: <a href="#">${staff.name}</a></div>` : ''}
    ${actionBtn}
  </div>`;
}

// -------------------------------------------------------
// NHẬN XE – Mở modal xác nhận nhận phụ trách
// -------------------------------------------------------
let assignApptId = null;

function openAssign(apptId) {
  assignApptId = apptId;
  const appt     = AppData.appointments.find(a => a.id === apptId);
  const car      = AppData.cars.find(c => c.id === appt.carId);
  const customer = AppData.users.find(u => u.id === appt.userId);
  const svcs     = appt.services.map(id => AppData.services.find(s => s.id === id));

  document.getElementById('modal-assign-body').innerHTML = `
    <div class="alert alert-info">
      <i class="bi bi-info-circle"></i> Bạn muốn nhận phụ trách lịch hẹn này?
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:12px">
      <div>
        <div class="form-label">Xe</div>
        <div class="fw-bold" style="font-size:15px">${car?.plate}</div>
        <div class="text-secondary fs-sm">${car?.brand} – ${car?.model}</div>
      </div>
      <div>
        <div class="form-label">Khách hàng</div>
        <div class="fw-bold">${customer?.name}</div>
        <div class="text-secondary fs-sm">${customer?.phone}</div>
      </div>
    </div>
    <div style="margin-top:14px">
      <div class="form-label">Dịch vụ</div>
      ${svcs.map(s => `
        <div style="padding:6px 0;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between">
          <span>${s?.name}</span>
          <span class="text-primary fw-bold">${formatPrice(s?.price)}</span>
        </div>`).join('')}
    </div>`;

  document.getElementById('btn-do-assign').onclick = doAssign;
  openModal('modal-assign');
}

// Xác nhận nhận xe – đổi trạng thái sang 'dang_thuc_hien'
function doAssign() {
  const appt = AppData.appointments.find(a => a.id === assignApptId);
  appt.staffId = STAFF_ID;
  appt.status  = 'dang_thuc_hien';
  closeModal('modal-assign');
  showToast('Đã nhận phụ trách xe ' + AppData.cars.find(c => c.id === appt.carId)?.plate);
  renderToday();
}

// -------------------------------------------------------
// HOÀN THÀNH DỊCH VỤ
// -------------------------------------------------------
let completeApptId = null;

function openComplete(apptId) {
  completeApptId = apptId;
  const appt = AppData.appointments.find(a => a.id === apptId);
  const car  = AppData.cars.find(c => c.id === appt.carId);
  const svcs = appt.services.map(id => AppData.services.find(s => s.id === id));

  document.getElementById('complete-detail').innerHTML = `
    <div style="display:flex;gap:12px;align-items:center;padding:12px;background:var(--bg-light);border-radius:9px">
      <div class="car-icon"><i class="bi bi-car-front-fill"></i></div>
      <div>
        <div class="fw-bold">${car?.plate}</div>
        <div class="text-secondary fs-sm">${car?.brand} – ${car?.model}</div>
        <div class="text-secondary fs-sm">${svcs.map(s=>s?.name).join(', ')}</div>
      </div>
    </div>`;

  document.getElementById('complete-note').value = '';
  openModal('modal-complete');
}

// Xác nhận hoàn thành – đổi trạng thái + lưu hồ sơ bảo dưỡng
function doComplete() {
  const appt = AppData.appointments.find(a => a.id === completeApptId);
  appt.status = 'hoan_thanh';
  const note  = document.getElementById('complete-note').value;
  AppData.maintenance.push({
    id:     AppData.maintenance.length + 1,
    apptId: appt.id,
    techId: STAFF_ID,
    date:   '2026-03-10',
    note
  });
  closeModal('modal-complete');
  showToast('Đã hoàn thành dịch vụ! ✅');
  renderToday();
}

// -------------------------------------------------------
// LỊCH SỬ XE ĐÃ PHỤ TRÁCH
// -------------------------------------------------------
function renderMyHistory() {
  const myAppts = AppData.appointments.filter(a => a.staffId === STAFF_ID);
  document.getElementById('staff-history-tbody').innerHTML = myAppts.map(a => {
    const car      = AppData.cars.find(c => c.id === a.carId);
    const customer = AppData.users.find(u => u.id === a.userId);
    const slot     = AppData.slots.find(s => s.id === a.slotId);
    const svcs     = a.services.map(id => AppData.services.find(s => s.id === id)?.name).join(', ');
    const rec      = AppData.maintenance.find(m => m.apptId === a.id);
    return `<tr>
      <td><b>${car?.plate}</b><br><span class="text-secondary fs-sm">${car?.brand}–${car?.model}</span></td>
      <td>${customer?.name}<br><span class="text-secondary fs-sm">${customer?.phone}</span></td>
      <td>${slot ? formatDate(slot.date) : '–'}<br><span class="text-secondary fs-sm">${slot?.start}–${slot?.end}</span></td>
      <td style="max-width:150px;font-size:12.5px">${svcs}</td>
      <td>${getStatusBadge(a.status)}</td>
      <td style="font-style:italic;font-size:12px;color:#64748b">${rec?.note || '–'}</td>
    </tr>`;
  }).join('') || `<tr><td colspan="6" style="text-align:center;padding:32px;color:#94a3b8">Chưa có dữ liệu</td></tr>`;
}

// -------------------------------------------------------
// KHỞI ĐỘNG
// -------------------------------------------------------
renderToday();
