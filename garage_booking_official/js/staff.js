// =====================================================
// staff.js – Logic trang Nhân viên
// =====================================================

let selectedDate  = new Date().toISOString().split('T')[0];
let searchKeyword = '';
let currentPage   = 'today';
let STAFF_ID      = null;
let STAFF_NAME    = null;
let assignApptId  = null;
let completeApptId = null;
const STAFF_LAST_PAGE_KEY = 'staff:lastPage';
let todayApptById = new Map();

(async function init() {
  if (!Auth.isLoggedIn()) { window.location.href = 'login.html'; return; }
  const user = Auth.getUser();
  if (user) {
    STAFF_ID = user.id;
    STAFF_NAME = user.ho_ten || user.name || null;
    const nameEl = document.getElementById('user-name');
    if (nameEl) nameEl.textContent = user.ho_ten;
    const avatarEl = document.getElementById('user-avatar');
    if (avatarEl) avatarEl.textContent = (user.ho_ten||'U')[0].toUpperCase();
  }
  initSearch();
  const savedPage = localStorage.getItem(STAFF_LAST_PAGE_KEY);
  const initialPage = ['today', 'my-history'].includes(savedPage) ? savedPage : 'today';
  showPage(initialPage);
})();

function doLogout() { Auth.clearSession(); window.location.href = 'login.html'; }

function initSearch() {
  const input = document.getElementById('staff-today-search');
  if (!input) return;
  input.addEventListener('input', function () {
    searchKeyword = this.value.trim();
    if (currentPage==='today') renderToday();
  });
}

function onStaffTodaySearch(value) {
  searchKeyword = (value || '').trim();
  if (currentPage === 'today') renderToday();
}

function onStaffHistorySearch(value) {
  searchKeyword = (value || '').trim();
  if (currentPage === 'my-history') renderMyHistory();
}

function showPage(id) {
  currentPage = id; searchKeyword = '';
  localStorage.setItem(STAFF_LAST_PAGE_KEY, id);
  const todayInput = document.getElementById('staff-today-search');
  if (todayInput) todayInput.value = '';
  const historyInput = document.getElementById('staff-history-search');
  if (historyInput) historyInput.value = '';
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-'+id).classList.add('active');
  const items = document.querySelectorAll('.nav-item');
  if (id==='today')      items[0].classList.add('active');
  if (id==='my-history') items[1].classList.add('active');
  if (id==='today')      renderToday();
  if (id==='my-history') renderMyHistory();
}

function changeSelectedDate(dateStr) { selectedDate = dateStr; renderToday(); }

function buildDatePicker() {
  return `<div class="date-picker-bar" style="display:flex;align-items:center;gap:8px;margin-bottom:20px">
    <i class="bi bi-calendar3" style="color:var(--primary);font-size:16px;flex-shrink:0"></i>
    <input type="date" onchange="changeSelectedDate(this.value)" value="${selectedDate}"
      style="border:1.5px solid #e2e8f0;border-radius:8px;padding:6px 10px;font-size:13px;color:#475569;cursor:pointer;background:#fff;outline:none;">
  </div>`;
}

// -------------------------------------------------------
// LỊCH HÔM NAY
// List /lich-hen?ngay=... trả flat: a.bien_so_xe, a.hang_xe, a.dong_xe,
//   a.ten_kh, a.gio_bat_dau, a.gio_ket_thuc, a.khung_gio_id, a.nhan_vien_phu_trach_id,
//   a.ten_nv, a.trang_thai, a.dich_vu[]
// -------------------------------------------------------
/**
 * @param {{ soft?: boolean, scrollAnchorId?: number|null }} [options]
 *   soft: không chèn màn hình "Đang tải", giữ danh sách cũ cho đến khi có dữ liệu mới (sau nhận xe / hoàn thành).
 *   scrollAnchorId: sau khi vẽ lại, cuộn tới thẻ #appt-{id} để giữ ngữ cảnh như trước khi mở modal.
 */
async function renderToday(options = {}) {
  const soft = options.soft === true;
  const scrollAnchorId = options.scrollAnchorId != null ? options.scrollAnchorId : null;

  const subtitleEl = document.querySelector('#page-today .page-subtitle');
  if (subtitleEl) {
    const [y,m,d] = selectedDate.split('-');
    const jsDate  = new Date(y,m-1,d);
    const dow = ['Chủ Nhật','Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy'][jsDate.getDay()];
    subtitleEl.textContent = `${dow}, ${d}/${m}/${y}`;
  }

  const container = document.getElementById('staff-slots-container');
  if (!soft) {
    container.innerHTML = buildDatePicker() +
      `<div style="text-align:center;padding:32px;color:#94a3b8"><i class="bi bi-hourglass-split"></i> Đang tải...</div>`;
  }

  try {
    const appts = await API.getLichHen({ ngay: selectedDate });
    todayApptById = new Map(appts.map(a => [a.id, a]));
    const kwRaw = searchKeyword;
    const kw    = normalizeSearchText(kwRaw);

    // Nhóm theo khung_gio_id – dùng flat fields
    const grouped = {};
    appts.filter(a => a.trang_thai !== 'da_huy').forEach(a => {
      const kg = a.khung_gio_id || 'other';
      if (!grouped[kg]) grouped[kg] = {
        gio_bat_dau: a.gio_bat_dau,
        gio_ket_thuc: a.gio_ket_thuc,
        appts: []
      };
      grouped[kg].appts.push(a);
    });

    let html = buildDatePicker();
    let hasContent = false;

    for (const { gio_bat_dau, gio_ket_thuc, appts: slotAppts } of Object.values(grouped)) {
      let filtered = slotAppts;
      if (kw) {
        const svcJoin = (a.dich_vu || []).map(s => normalizeSearchText(s.ten_dich_vu || '')).join(' ');
        filtered = filtered.filter(a =>
          normalizeSearchText(a.bien_so_xe).includes(kw) ||
          normalizeSearchText(a.hang_xe).includes(kw) ||
          normalizeSearchText(a.dong_xe).includes(kw) ||
          normalizeSearchText(a.ten_kh).includes(kw) ||
          normalizeSearchText(a.so_dien_thoai).includes(kw) ||
          svcJoin.includes(kw)
        );
      }
      if (!filtered.length) continue;
      hasContent = true;
      html += `<div class="timeslot-header">
        <i class="bi bi-calendar2-event timeslot-icon"></i>
        <span class="timeslot-time">${formatTime(gio_bat_dau)} – ${formatTime(gio_ket_thuc)}</span>
        <span class="timeslot-count">${filtered.length} xe</span>
      </div>
      <div class="appointment-grid">${filtered.map(a=>renderApptCard(a)).join('')}</div>`;
    }

    if (!hasContent) {
      html += kw
        ? `<div class="empty-state"><div class="empty-icon"><i class="bi bi-search"></i></div><div class="empty-title">Không tìm thấy "<b>${escapeHtml(kwRaw)}</b>"</div></div>`
        : `<div class="empty-state"><div class="empty-icon"><i class="bi bi-calendar-x"></i></div><div class="empty-title">Không có lịch ngày này</div></div>`;
    }
    container.innerHTML = html;
    if (scrollAnchorId != null) {
      requestAnimationFrame(() => {
        const el = document.getElementById('appt-' + scrollAnchorId);
        if (el) el.scrollIntoView({ block: 'nearest', behavior: 'auto' });
      });
    }
  } catch (e) {
    if (soft) {
      showToast('Lỗi tải dữ liệu: ' + e.message, 'danger');
    } else {
      container.innerHTML = buildDatePicker() +
        `<div class="alert alert-danger">Lỗi tải dữ liệu: ${e.message}</div>`;
    }
  }
}

// Render card dùng flat fields từ list endpoint
// Để nhận xe / hoàn thành: cần gọi detail endpoint (nested)
function renderApptCard(a) {
  // a.nhan_vien_phu_trach_id, a.ten_nv (flat từ list)
  const isMyAppt = a.nhan_vien_phu_trach_id === STAFF_ID;
  let actionBtn = '';
  if (a.trang_thai==='cho_thuc_hien' && !a.nhan_vien_phu_trach_id) {
    actionBtn = `<button class="btn btn-primary btn-lg mt-3" onclick="openAssign(${a.id})">
      <i class="bi bi-person-check"></i> Nhận xe</button>`;
  } else if (a.trang_thai==='dang_thuc_hien' && isMyAppt) {
    actionBtn = `<button class="btn btn-success btn-lg mt-3" onclick="openComplete(${a.id})">
      <i class="bi bi-check-circle"></i> Hoàn thành</button>`;
  } else if (a.trang_thai==='dang_thuc_hien' && !isMyAppt) {
    actionBtn = `<div style="padding:10px;background:#f1f5f9;border-radius:8px;text-align:center;margin-top:12px;font-size:12.5px;color:#64748b">
      <i class="bi bi-person-fill"></i> Đang được <b>${a.ten_nv||'nhân viên khác'}</b> phụ trách</div>`;
  } else if (a.trang_thai==='hoan_thanh') {
    actionBtn = `<div class="alert alert-success mt-3"><i class="bi bi-check-circle"></i> Đã hoàn thành</div>`;
  }

  return `<div class="appt-card" id="appt-${a.id}">
    <div class="appt-header">
      <div><div class="appt-plate">${a.bien_so_xe||'–'}</div>
           <div class="appt-model">${a.hang_xe||''} – ${a.dong_xe||''}</div></div>
      ${getStatusBadge(a.trang_thai)}
    </div>
    <hr class="appt-divider">
    <div class="appt-customer-name">${a.ten_kh||'–'}</div>
    <div class="appt-services mt-2">
      <div class="appt-services-label">Dịch vụ yêu cầu:</div>
      ${(a.dich_vu||[]).map(s=>`<div class="appt-service-tag">${s.ten_dich_vu}</div>`).join('')}
    </div>
    ${a.ten_nv ? `<div class="appt-staff">Nhân viên phụ trách: <b>${a.ten_nv}</b></div>` : ''}
    ${actionBtn}
  </div>`;
}

function rerenderTodayApptCard(apptId) {
  const a = todayApptById.get(apptId);
  const el = document.getElementById('appt-' + apptId);
  if (!a || !el) return;
  el.outerHTML = renderApptCard(a);
}

// -------------------------------------------------------
// NHẬN XE – gọi detail endpoint để hiển thị modal (nested)
// -------------------------------------------------------
async function openAssign(apptId) {
  assignApptId = apptId;
  try {
    const a = await API.getLichHenDetail(apptId);
    document.getElementById('modal-assign-body').innerHTML = `
      <div class="alert alert-info"><i class="bi bi-info-circle"></i> Bạn muốn nhận phụ trách lịch hẹn này?</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:12px">
        <div><div class="form-label">Xe</div>
             <div class="fw-bold" style="font-size:15px">${a.xe?.bien_so_xe}</div>
             <div class="text-secondary fs-sm">${a.xe?.hang_xe} – ${a.xe?.dong_xe}</div></div>
        <div><div class="form-label">Khách hàng</div>
             <div class="fw-bold">${a.khach_hang?.ho_ten}</div>
             <div class="text-secondary fs-sm">${a.khach_hang?.so_dien_thoai}</div></div>
      </div>
      <div style="margin-top:14px"><div class="form-label">Dịch vụ</div>
        ${(a.dich_vu||[]).map(s=>`
          <div style="padding:6px 0;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between">
            <span>${s.ten_dich_vu}</span>
            <span class="text-primary fw-bold">${formatPrice(s.gia_tien)}</span>
          </div>`).join('')}
      </div>`;
    document.getElementById('btn-do-assign').onclick = doAssign;
    openModal('modal-assign');
  } catch (e) { showToast(e.message,'danger'); }
}

async function doAssign() {
  try {
    const id = assignApptId;
    await API.nhanXe(id);
    closeModal('modal-assign');
    showToast('Đã nhận phụ trách xe ✅');
    // Cập nhật tối thiểu để tránh cảm giác "load lại" cả danh sách.
    const cached = todayApptById.get(id);
    if (cached) {
      cached.trang_thai = 'dang_thuc_hien';
      cached.nhan_vien_phu_trach_id = STAFF_ID;
      cached.ten_nv = STAFF_NAME || cached.ten_nv;
      todayApptById.set(id, cached);
      rerenderTodayApptCard(id);
      const el = document.getElementById('appt-' + id);
      if (el) el.scrollIntoView({ block: 'nearest', behavior: 'auto' });
    } else {
      await renderToday({ soft: true, scrollAnchorId: id });
    }
  } catch (e) { showToast(e.message,'danger'); }
}

// -------------------------------------------------------
// HOÀN THÀNH
// -------------------------------------------------------
async function openComplete(apptId) {
  completeApptId = apptId;
  try {
    const a = await API.getLichHenDetail(apptId);
    document.getElementById('complete-detail').innerHTML = `
      <div style="display:flex;gap:12px;align-items:center;padding:12px;background:var(--bg-light);border-radius:9px">
        <div class="car-icon"><i class="bi bi-car-front-fill"></i></div>
        <div><div class="fw-bold">${a.xe?.bien_so_xe}</div>
             <div class="text-secondary fs-sm">${a.xe?.hang_xe} – ${a.xe?.dong_xe}</div>
             <div class="text-secondary fs-sm">${(a.dich_vu||[]).map(s=>s.ten_dich_vu).join(', ')}</div></div>
      </div>`;
    document.getElementById('complete-note').value = '';
    openModal('modal-complete');
  } catch (e) { showToast(e.message,'danger'); }
}

async function doComplete() {
  const note = document.getElementById('complete-note').value;
  try {
    const id = completeApptId;
    await API.hoanThanh(id, note);
    closeModal('modal-complete');
    showToast('Đã hoàn thành dịch vụ! ✅');
    await renderToday({ soft: true, scrollAnchorId: id });
  } catch (e) { showToast(e.message,'danger'); }
}

// -------------------------------------------------------
// LỊCH SỬ PHỤ TRÁCH – flat fields từ list endpoint
// -------------------------------------------------------
async function renderMyHistory() {
  const kwRaw = searchKeyword;
  const kw = normalizeSearchText(kwRaw);
  try {
    const params = { nhan_vien_id: STAFF_ID };
    const appts = await API.getLichHen(params);
    const filtered = kw
      ? appts.filter(a => {
          const serviceText = (a.dich_vu || []).map(s => normalizeSearchText(s.ten_dich_vu || '')).join(' ');
          const noteText = normalizeSearchText(a.ghi_chu || '');
          return (
            normalizeSearchText(a.bien_so_xe).includes(kw) ||
            normalizeSearchText(a.hang_xe).includes(kw) ||
            normalizeSearchText(a.dong_xe).includes(kw) ||
            normalizeSearchText(a.ten_kh).includes(kw) ||
            normalizeSearchText(a.so_dien_thoai).includes(kw) ||
            serviceText.includes(kw) ||
            noteText.includes(kw)
          );
        })
      : appts;
    document.getElementById('staff-history-tbody').innerHTML = filtered.map(a => {
      return `<tr>
        <td><b>${a.bien_so_xe||'–'}</b><br><span class="text-secondary fs-sm">${a.hang_xe||''}–${a.dong_xe||''}</span></td>
        <td>${a.ten_kh||'–'}</td>
        <td>${formatDate(a.ngay)}<br><span class="text-secondary fs-sm">${formatTime(a.gio_bat_dau)}–${formatTime(a.gio_ket_thuc)}</span></td>
        <td style="max-width:150px;font-size:12.5px">${(a.dich_vu||[]).map(s=>s.ten_dich_vu).join(', ')}</td>
        <td>${getStatusBadge(a.trang_thai)}</td>
        <td style="font-style:italic;font-size:12px;color:#64748b">${a.ghi_chu||'–'}</td>
      </tr>`;
    }).join('') || `<tr><td colspan="6" style="text-align:center;padding:32px;color:#94a3b8">${kw ? 'Không tìm thấy dữ liệu phù hợp' : 'Chưa có dữ liệu'}</td></tr>`;
  } catch (e) { showToast('Lỗi: '+e.message,'danger'); }
}
