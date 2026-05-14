// =====================================================
// modal-loader.js – Tải và nhúng modal từ file partial
// =====================================================
// Dùng fetch() để load từng file partial HTML vào <body>
// Gọi hàm này trước khi dùng openModal() hay bất kỳ
// trigger nào liên quan đến modal.
//
// Cách dùng trong HTML:
//   <script src="js/modal-loader.js"></script>
//   <script>
//     loadModals([
//       'partials/modals/customer/modal-add-car.html',
//       'partials/modals/customer/modal-notif.html',
//       ...
//     ]);
//   </script>
// =====================================================

/**
 * Tải danh sách file partial modal và nhúng vào cuối <body>
 * @param {string[]} paths - Mảng đường dẫn tới các file partial
 * @returns {Promise<void>}
 */
async function loadModals(paths) {
  // Tạo container chứa tất cả modal (để dễ debug trong DevTools)
  const container = document.createElement('div');
  container.id = 'modal-container';
  container.setAttribute('aria-hidden', 'true');
  document.body.appendChild(container);

  // Load tuần tự từng file partial
  for (const path of paths) {
    try {
      const res  = await fetch(path);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();

      // Tạo wrapper có data-partial để dễ nhận biết nguồn
      const wrapper = document.createElement('div');
      wrapper.dataset.partial = path;
      wrapper.innerHTML = html;
      container.appendChild(wrapper);

    } catch (err) {
      console.warn(`[modal-loader] Không tải được: ${path}`, err);
    }
  }
}
