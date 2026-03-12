
const booking = {
  step:       1,    
  slotId:     null, 
  carId:      null, 
  serviceIds: [],  
  total:      0,    
};

// -------------------------------------------------------
// ĐIỀU HƯỚNG TRANG
// Ẩn trang cũ, hiện trang mới theo id
// -------------------------------------------------------
function showPage(id) {
  // Ẩn tất cả trang
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  // Bỏ active khỏi tất cả nav item
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  // Hiện trang được chọn
  const page = document.getElementById('page-' + id);
  if (page) page.classList.add('active');

  // Đánh dấu nav item tương ứng
  const navMap = { dashboard: 0, 'my-cars': 1, booking: 2, history: 3, invoices: 4 };
  const navItems = document.querySelectorAll('.nav-item');
  if (navMap[id] !== undefined && navItems[navMap[id]]) {
    navItems[navMap[id]].classList.add('active');
  }

  // Render dữ liệu khi chuyển trang
  if (id === 'dashboard') renderDashboard();
  if (id === 'my-cars')   renderCars();
  if (id === 'booking')   renderBooking();
  if (id === 'history')   renderHistory();
  if (id === 'invoices')  renderInvoices();
}

// -------------------------------------------------------
// DASHBOARD – Trang tổng quan
// -------------------------------------------------------
function renderDashboard() {
  // Lọc lịch hẹn chưa hoàn thành / chưa hủy của user 1
  const myAppts = AppData.appointments.filter(a =>
    a.userId === 1 && a.status !== 'hoan_thanh' && a.status !== 'da_huy'
  );

  // Render bảng lịch hẹn sắp tới
  document.getElementById('upcoming-tbody').innerHTML = myAppts.map(a => {
    const slot     = AppData.slots.find(s => s.id === a.slotId);
    const car      = AppData.cars.find(c => c.id === a.carId);
    const svcs     = a.services.map(id => AppData.services.find(s => s.id === id)?.name).join(', ');
    return `<tr>
      <td>
        <b>${car?.plate}</b><br>
        <span class="text-secondary fs-sm">${car?.brand} – ${car?.model}</span>
      </td>
      <td>
        ${slot?.start} – ${slot?.end}<br>
        <span class="text-secondary fs-sm">${formatDate(slot?.date)}</span>
      </td>
      <td style="max-width:160px">${svcs}</td>
      <td>${getStatusBadge(a.status)}</td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="showPage('history')">
          Chi tiết
        </button>
      </td>
    </tr>`;
  }).join('') || `<tr><td colspan="5" style="text-align:center;padding:24px;color:#94a3b8">Không có lịch hẹn sắp tới</td></tr>`;

  // Render danh sách xe rút gọn
  const myCars = AppData.cars.filter(c => c.userId === 1);
  document.getElementById('my-cars-mini').innerHTML =
    myCars.map(c => `
      <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #f1f5f9">
        <div class="car-icon"><i class="bi bi-car-front"></i></div>
        <div>
          <div class="fw-bold">${c.plate}</div>
          <div class="text-secondary fs-sm">${c.brand} – ${c.model}</div>
        </div>
      </div>`).join('')
    + `<button class="btn btn-outline btn-sm mt-3" style="width:100%" onclick="showPage('my-cars')">
         Quản lý xe
       </button>`;
}

// -------------------------------------------------------
// XE CỦA TÔI
// -------------------------------------------------------
function renderCars() {
  const myCars = AppData.cars.filter(c => c.userId === 1);
  document.getElementById('cars-grid').innerHTML = myCars.map(c => `
    <div class="card" style="padding:20px">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:14px">
        <div class="car-icon" style="width:48px;height:48px;font-size:22px">
          <i class="bi bi-car-front-fill"></i>
        </div>
        <div>
          <div class="car-plate" style="font-size:17px">${c.plate}</div>
          <div class="car-model">${c.brand} – ${c.model}</div>
        </div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-primary btn-sm" style="flex:1" onclick="showPage('booking')">
          <i class="bi bi-calendar-plus"></i> Đặt lịch
        </button>
        <button class="btn btn-outline btn-sm" onclick="deleteCar(${c.id})">
          <i class="bi bi-trash"></i>
        </button>
      </div>
    </div>`).join('')
    || `<div class="empty-state">
          <div class="empty-icon"><i class="bi bi-car-front"></i></div>
          <div class="empty-title">Chưa có xe nào</div>
          <div class="empty-desc">Thêm xe để bắt đầu đặt lịch</div>
        </div>`;
}

// Thêm xe mới từ modal
function addCar() {
  const plate = document.getElementById('car-plate').value.trim();
  const brand = document.getElementById('car-brand').value.trim();
  const model = document.getElementById('car-model-input').value.trim();
  if (!plate) { showToast('Vui lòng nhập biển số xe', 'danger'); return; }
  const newId = Math.max(...AppData.cars.map(c => c.id)) + 1;
  AppData.cars.push({ id: newId, userId: 1, plate, brand, model });
  closeModal('modal-add-car');
  renderCars();
  showToast('Đã thêm xe ' + plate);
  // Reset form
  ['car-plate','car-brand','car-model-input'].forEach(id => document.getElementById(id).value = '');
}

// Xóa xe theo id
function deleteCar(id) {
  if (confirm('Xóa xe này khỏi danh sách?')) {
    AppData.cars = AppData.cars.filter(c => c.id !== id);
    renderCars();
    showToast('Đã xóa xe');
  }
}

// -------------------------------------------------------
// ĐẶT LỊCH – Reset về bước 1 khi vào trang
// -------------------------------------------------------
function renderBooking() {
  // Reset state
  booking.step = 1; booking.slotId = null;
  booking.carId = null; booking.serviceIds = []; booking.total = 0;

  // Reset giao diện bước
  updateBookingSteps();
  renderSlots();
  updateSummary();

  document.getElementById('booking-step1').style.display = 'block';
  document.getElementById('booking-step2').style.display = 'none';
  document.getElementById('booking-step3').style.display = 'none';
  document.getElementById('btn-prev').style.display = 'none';
  document.getElementById('btn-next').disabled = true;
  document.getElementById('btn-next').innerHTML = 'Tiếp theo <i class="bi bi-arrow-right"></i>';
}

// Render danh sách slot theo ngày
function renderSlots() {
  // Gộp slot theo ngày
  const grouped = {};
  AppData.slots.forEach(s => {
    if (!grouped[s.date]) grouped[s.date] = [];
    grouped[s.date].push(s);
  });

  let html = '';
  for (const [date, slots] of Object.entries(grouped)) {
    html += `<div class="slot-date-label">Ngày ${formatDate(date)}</div><div class="slot-grid">`;
    slots.forEach(s => {
      const avail = s.capacity - s.booked;
      const full  = avail === 0;
      html += `
        <div class="slot-card ${full ? 'disabled' : ''}"
             id="slot-${s.id}"
             onclick="${full ? '' : `selectSlot(${s.id})`}">
          <div class="slot-time">${s.start} – ${s.end}</div>
          <div class="slot-count">${s.booked}/${s.capacity}</div>
          <div class="slot-avail ${full ? 'red' : 'green'}">
            ${full ? 'Đã đầy' : `Còn ${avail} slot`}
          </div>
        </div>`;
    });
    html += '</div>';
  }
  document.getElementById('slots-container').innerHTML = html;
}

// Chọn 1 khung giờ
function selectSlot(id) {
  booking.slotId = id;
  document.querySelectorAll('.slot-card').forEach(el => el.classList.remove('selected'));
  document.getElementById('slot-' + id)?.classList.add('selected');

  const slot = AppData.slots.find(s => s.id === id);
  document.getElementById('sum-slot').textContent = `${slot.start}–${slot.end}, ${formatDate(slot.date)}`;
  document.getElementById('btn-next').disabled = false;
}

// Render bước 2: chọn xe + dịch vụ
function renderStep2() {
  const myCars = AppData.cars.filter(c => c.userId === 1);

  // Danh sách xe
  document.getElementById('car-select-list').innerHTML = myCars.map(c => `
    <div class="car-card" id="car-sel-${c.id}" onclick="selectCar(${c.id})">
      <div class="car-icon"><i class="bi bi-car-front"></i></div>
      <div>
        <div class="car-plate">${c.plate}</div>
        <div class="car-model">${c.brand} – ${c.model}</div>
      </div>
    </div>`).join('');

  // Lưới dịch vụ
  const icons = ['🔧','🛢️','🛞','🚿','⚙️','❄️','⚡','🔩'];
  document.getElementById('service-select-grid').innerHTML = AppData.services.map((s, i) => `
    <div class="service-item" id="svc-${s.id}" onclick="toggleService(${s.id})">
      <div class="service-icon">${icons[i % icons.length]}</div>
      <div class="service-name">${s.name}</div>
      <div class="service-price">${formatPrice(s.price)}</div>
    </div>`).join('');
}

// Chọn xe trong bước 2
function selectCar(id) {
  booking.carId = id;
  document.querySelectorAll('.car-card').forEach(e => e.classList.remove('selected'));
  document.getElementById('car-sel-' + id)?.classList.add('selected');
  const car = AppData.cars.find(c => c.id === id);
  document.getElementById('sum-car').textContent = `${car.plate} – ${car.model}`;
  checkStep2Valid();
}

// Bật/tắt chọn dịch vụ
function toggleService(id) {
  const idx = booking.serviceIds.indexOf(id);
  if (idx === -1) booking.serviceIds.push(id);
  else            booking.serviceIds.splice(idx, 1);

  document.getElementById('svc-' + id)?.classList.toggle('selected', booking.serviceIds.includes(id));

  // Tính lại tổng tiền
  booking.total = booking.serviceIds.reduce(
    (sum, sid) => sum + (AppData.services.find(s => s.id === sid)?.price || 0), 0
  );
  updateSummary();
  checkStep2Valid();
}

// Kiểm tra bước 2 đã đủ điều kiện chưa
function checkStep2Valid() {
  document.getElementById('btn-next').disabled = !(booking.carId && booking.serviceIds.length > 0);
}

// Cập nhật panel tóm tắt
function updateSummary() {
  const svcNames = booking.serviceIds.map(id => AppData.services.find(s => s.id === id)?.name);
  document.getElementById('sum-svc-label').textContent  = `Dịch vụ (${booking.serviceIds.length})`;
  document.getElementById('sum-services').textContent   = svcNames.length ? svcNames.join(', ') : 'Chưa chọn';
  document.getElementById('sum-total').textContent      = formatPrice(booking.total);
}

// Render bước 3: Xác nhận
function renderStep3() {
  const slot = AppData.slots.find(s => s.id === booking.slotId);
  const car  = AppData.cars.find(c => c.id === booking.carId);
  const svcs = booking.serviceIds.map(id => AppData.services.find(s => s.id === id));

  document.getElementById('confirm-detail').innerHTML = `
    <div style="display:grid;gap:14px">
      <div class="alert alert-info">
        <i class="bi bi-info-circle"></i> Vui lòng kiểm tra thông tin trước khi xác nhận
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div>
          <div class="form-label">Khung giờ</div>
          <div class="fw-bold">${slot.start} – ${slot.end}</div>
          <div class="text-secondary fs-sm">${formatDate(slot.date)}</div>
        </div>
        <div>
          <div class="form-label">Xe</div>
          <div class="fw-bold">${car.plate}</div>
          <div class="text-secondary fs-sm">${car.brand} – ${car.model}</div>
        </div>
      </div>
      <div>
        <div class="form-label">Dịch vụ đã chọn</div>
        ${svcs.map(s => `
          <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f1f5f9">
            <span>${s.name}</span>
            <span class="fw-bold text-primary">${formatPrice(s.price)}</span>
          </div>`).join('')}
        <div style="display:flex;justify-content:space-between;padding:12px 0;font-size:16px;font-weight:800">
          <span>Tổng cộng</span>
          <span style="color:var(--primary)">${formatPrice(booking.total)}</span>
        </div>
      </div>
      <div class="form-group mb-0">
        <label class="form-label">Ghi chú (tùy chọn)</label>
        <textarea class="form-control" rows="2"
                  placeholder="Mô tả vấn đề hoặc yêu cầu đặc biệt..."></textarea>
      </div>
    </div>`;

  document.getElementById('btn-next').innerHTML = '<i class="bi bi-check-lg"></i> Xác nhận đặt lịch';
  document.getElementById('btn-next').disabled  = false;
}

// Cập nhật giao diện chỉ báo bước
function updateBookingSteps() {
  [1, 2, 3].forEach(i => {
    const el = document.getElementById('step-' + i);
    el.classList.remove('active', 'done');
    if (i < booking.step)      el.classList.add('done');
    else if (i === booking.step) el.classList.add('active');
  });
}

// Nút "Tiếp theo"
function bookingNext() {
  if (booking.step === 1 && !booking.slotId) return;
  if (booking.step === 3) { confirmBooking(); return; }

  booking.step++;
  updateBookingSteps();
  document.getElementById('btn-prev').style.display = 'block';

  if (booking.step === 2) {
    document.getElementById('booking-step1').style.display = 'none';
    document.getElementById('booking-step2').style.display = 'block';
    document.getElementById('booking-step3').style.display = 'none';
    document.getElementById('btn-next').disabled = true;
    document.getElementById('btn-next').innerHTML = 'Tiếp theo <i class="bi bi-arrow-right"></i>';
    renderStep2();
  } else if (booking.step === 3) {
    document.getElementById('booking-step2').style.display = 'none';
    document.getElementById('booking-step3').style.display = 'block';
    renderStep3();
  }
}

// Nút "Quay lại"
function bookingPrev() {
  if (booking.step === 1) return;
  booking.step--;
  updateBookingSteps();

  if (booking.step === 1) {
    document.getElementById('btn-prev').style.display = 'none';
    document.getElementById('booking-step1').style.display = 'block';
    document.getElementById('booking-step2').style.display = 'none';
    document.getElementById('btn-next').innerHTML = 'Tiếp theo <i class="bi bi-arrow-right"></i>';
    document.getElementById('btn-next').disabled  = !booking.slotId;
  } else if (booking.step === 2) {
    document.getElementById('booking-step2').style.display = 'block';
    document.getElementById('booking-step3').style.display = 'none';
    document.getElementById('btn-next').innerHTML = 'Tiếp theo <i class="bi bi-arrow-right"></i>';
    checkStep2Valid();
  }
}

// Lưu lịch hẹn mới vào dữ liệu mẫu
function confirmBooking() {
  const newId = Math.max(...AppData.appointments.map(a => a.id)) + 1;
  AppData.appointments.push({
    id:       newId,
    userId:   1,
    carId:    booking.carId,
    slotId:   booking.slotId,
    staffId:  null,
    status:   'cho_thuc_hien',
    services: [...booking.serviceIds]
  });

  // Tăng số slot đã đặt
  const slot = AppData.slots.find(s => s.id === booking.slotId);
  if (slot) slot.booked++;

  // Tạo hóa đơn tự động
  AppData.invoices.push({
    id:     Math.max(...AppData.invoices.map(i => i.id)) + 1,
    apptId: newId,
    total:  booking.total,
    status: 'chua_thanh_toan'
  });

  showToast('Đặt lịch thành công! 🎉');
  showPage('history');
}

// -------------------------------------------------------
// HỦY LỊCH HẸN
// Chỉ hủy được khi trạng thái là 'cho_thuc_hien'
// -------------------------------------------------------
let cancelApptId = null; // Lưu id lịch hẹn đang muốn hủy

// Mở modal xác nhận hủy
function openCancelConfirm(apptId) {
  cancelApptId = apptId;
  const appt     = AppData.appointments.find(a => a.id === apptId);
  const car      = AppData.cars.find(c => c.id === appt?.carId);
  const slot     = AppData.slots.find(s => s.id === appt?.slotId);
  const svcs     = (appt?.services || []).map(id => AppData.services.find(s => s.id === id)?.name);

  // Hiển thị thông tin lịch hẹn trong modal
  document.getElementById('cancel-appt-info').innerHTML = `
    <div style="display:flex;gap:12px;align-items:center;margin-bottom:12px">
      <div class="car-icon"><i class="bi bi-car-front-fill"></i></div>
      <div>
        <div class="fw-bold" style="font-size:15px">${car?.plate}</div>
        <div class="text-secondary fs-sm">${car?.brand} – ${car?.model}</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px">
      <div><span class="text-secondary">Khung giờ: </span><b>${slot?.start} – ${slot?.end}</b></div>
      <div><span class="text-secondary">Ngày: </span><b>${formatDate(slot?.date)}</b></div>
    </div>
    <div style="margin-top:8px;font-size:13px">
      <span class="text-secondary">Dịch vụ: </span>${svcs.join(', ')}
    </div>`;

  // Gắn hàm xử lý cho nút xác nhận
  document.getElementById('btn-do-cancel').onclick = doCancel;
  document.getElementById('cancel-reason').value   = '';

  openModal('modal-cancel-confirm');
}

// Thực hiện hủy lịch hẹn
function doCancel() {
  const appt = AppData.appointments.find(a => a.id === cancelApptId);
  if (!appt) return;

  // Đổi trạng thái sang 'da_huy'
  appt.status = 'da_huy';

  // Cập nhật hóa đơn tương ứng sang 'hoa_don_da_huy'
  const inv = AppData.invoices.find(i => i.apptId === appt.id);
  if (inv) inv.status = 'hoa_don_da_huy';

  // Trả lại slot đã đặt
  const slot = AppData.slots.find(s => s.id === appt.slotId);
  if (slot && slot.booked > 0) slot.booked--;

  closeModal('modal-cancel-confirm');
  showToast('Đã hủy lịch hẹn thành công', 'success');
  renderHistory(); // Làm mới trang lịch sử
}

// -------------------------------------------------------
// LỊCH SỬ BẢO DƯỠNG
// -------------------------------------------------------
function renderHistory() {
  const myAppts = AppData.appointments.filter(a => a.userId === 1);

  // Render bảng
  document.getElementById('history-tbody').innerHTML = myAppts.map(a => {
    const slot = AppData.slots.find(s => s.id === a.slotId);
    const car  = AppData.cars.find(c => c.id === a.carId);
    const svcs = a.services.map(id => AppData.services.find(s => s.id === id)?.name).join(', ');

    // Nút hủy: chỉ hiện khi trạng thái là 'cho_thuc_hien'
    const cancelBtn = a.status === 'cho_thuc_hien'
      ? `<button class="btn btn-danger btn-sm" onclick="openCancelConfirm(${a.id})">
           <i class="bi bi-x-circle"></i> Hủy
         </button>`
      : `<span style="color:#94a3b8;font-size:12px">–</span>`;

    return `<tr>
      <td>${slot ? formatDate(slot.date) : '–'}<br>
          <span class="text-secondary fs-sm">${slot?.start}–${slot?.end}</span></td>
      <td>${car?.plate}</td>
      <td style="max-width:150px;font-size:12.5px">${svcs}</td>
      <td>${getStatusBadge(a.status)}</td>
      <td>${cancelBtn}</td>
    </tr>`;
  }).join('') || `<tr><td colspan="5" style="text-align:center;padding:24px;color:#94a3b8">Chưa có lịch hẹn nào</td></tr>`;

  // Render dòng thời gian
  document.getElementById('history-timeline').innerHTML = [...myAppts].reverse().map(a => {
    const slot = AppData.slots.find(s => s.id === a.slotId);
    const car  = AppData.cars.find(c => c.id === a.carId);
    const svcs = a.services.map(id => AppData.services.find(s => s.id === id)?.name).join(', ');
    return `<div class="record-item">
      <div class="record-dot"></div>
      <div>
        <div class="record-date">${slot ? formatDate(slot.date) : '–'} · ${slot?.start}</div>
        <div class="record-plate">${car?.plate} – ${car?.model}</div>
        <div class="record-services">${svcs}</div>
        <div class="mt-1">${getStatusBadge(a.status)}</div>
      </div>
    </div>`;
  }).join('');
}

// -------------------------------------------------------
// HÓA ĐƠN
// -------------------------------------------------------
function renderInvoices() {
  const myAppts   = AppData.appointments.filter(a => a.userId === 1);
  const myInvoices = AppData.invoices.filter(inv => myAppts.find(a => a.id === inv.apptId));

  document.getElementById('invoice-list').innerHTML = myInvoices.map(inv => {
    const appt = AppData.appointments.find(a => a.id === inv.apptId);
    const car  = AppData.cars.find(c => c.id === appt?.carId);
    const slot = AppData.slots.find(s => s.id === appt?.slotId);
    const svcs = (appt?.services || []).map(id => AppData.services.find(s => s.id === id));
    const isCancelled = inv.status === 'hoa_don_da_huy';
    return `<div class="card" style="${isCancelled ? 'opacity:0.65;' : ''}">
      <div style="display:flex;align-items:center;padding:16px 20px;gap:16px;flex-wrap:wrap">
        <div style="flex:1;min-width:200px">
          <div style="font-weight:700;font-size:15px;${isCancelled ? 'text-decoration:line-through;color:#94a3b8;' : ''}">
            Hóa đơn #INV-00${inv.id}
          </div>
          <div class="text-secondary fs-sm mt-1">
            ${car?.plate} – ${car?.model} · ${slot ? formatDate(slot.date) : '–'}
          </div>
          <div class="text-secondary fs-sm">${svcs.map(s=>s?.name).join(', ')}</div>
          ${isCancelled ? `<div style="font-size:12px;color:#dc2626;margin-top:4px"><i class="bi bi-x-circle-fill"></i> Lịch hẹn đã bị hủy – hóa đơn không còn hiệu lực</div>` : ''}
        </div>
        <div style="text-align:right">
          <div style="font-size:20px;font-weight:800;color:${isCancelled ? '#94a3b8' : 'var(--primary)'};${isCancelled ? 'text-decoration:line-through;' : ''}">${formatPrice(inv.total)}</div>
          <div class="mt-1">${getStatusBadge(inv.status)}</div>
        </div>
        <div>
          <button class="btn btn-outline btn-sm" onclick="viewInvoice(${inv.id})">
            <i class="bi bi-eye"></i> Xem
          </button>
        </div>
      </div>
    </div>`;
  }).join('') || `<div class="empty-state">
    <div class="empty-icon"><i class="bi bi-receipt"></i></div>
    <div class="empty-title">Chưa có hóa đơn nào</div>
  </div>`;
}

// Xem chi tiết hóa đơn trong modal
function viewInvoice(invId) {
  const inv      = AppData.invoices.find(i => i.id === invId);
  const appt     = AppData.appointments.find(a => a.id === inv.apptId);
  const slot     = AppData.slots.find(s => s.id === appt?.slotId);
  const car      = AppData.cars.find(c => c.id === appt?.carId);
  const svcs     = (appt?.services || []).map(id => AppData.services.find(s => s.id === id));
  const customer = AppData.users.find(u => u.id === 1);

  document.getElementById('modal-invoice-body').innerHTML = `
    <div style="background:var(--primary);color:white;padding:20px;border-radius:8px;margin-bottom:20px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <div style="font-size:12px;opacity:.7;text-transform:uppercase;letter-spacing:.06em">AutoCare Garage</div>
          <div style="font-size:20px;font-weight:800;margin-top:4px">Hóa đơn #INV-00${inv.id}</div>
        </div>
        <div>${getStatusBadge(inv.status)}</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px;font-size:12px;opacity:.85">
        <div>📅 ${slot ? formatDate(slot.date) : '–'} · ${slot?.start}–${slot?.end}</div>
        <div>👤 ${customer?.name}</div>
        <div>🚗 ${car?.plate} – ${car?.model}</div>
      </div>
    </div>
    <div>
      <div style="font-weight:700;font-size:13px;margin-bottom:10px">Dịch vụ</div>
      ${svcs.map(s => `
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f1f5f9">
          <span>${s?.name}</span>
          <span class="fw-bold">${formatPrice(s?.price)}</span>
        </div>`).join('')}
      <div style="display:flex;justify-content:space-between;padding:14px 0;font-size:16px;font-weight:800;border-top:2px solid var(--border);margin-top:8px">
        <span>Tổng cộng</span>
        <span style="color:var(--primary)">${formatPrice(inv.total)}</span>
      </div>
    </div>
    ${inv.status === 'chua_thanh_toan'
      ? '<div class="alert alert-info mt-2"><i class="bi bi-info-circle"></i> Vui lòng thanh toán tại quầy hoặc chuyển khoản</div>'
      : inv.status === 'hoa_don_da_huy'
        ? '<div class="alert alert-danger mt-2"><i class="bi bi-x-circle-fill"></i> Hóa đơn đã hủy – Lịch hẹn đã bị hủy, hóa đơn không còn hiệu lực</div>'
        : '<div class="alert alert-success mt-2"><i class="bi bi-check-circle"></i> Đã thanh toán – Cảm ơn bạn!</div>'}`;

  openModal('modal-invoice');
}

// -------------------------------------------------------
// KHỞI ĐỘNG: Render trang dashboard khi load
// -------------------------------------------------------
renderDashboard();
