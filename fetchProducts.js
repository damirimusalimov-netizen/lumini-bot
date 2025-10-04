(function(){
  // Вставьте адрес своего сервера в переменную ниже или задайте window.PRODUCTS_JSON_URL перед подключением скрипта.
  const PRODUCTS_URL = window.PRODUCTS_JSON_URL || 'https://YOUR_DOMAIN/products.json';

  async function loadProducts() {
    try {
      const res = await fetch(PRODUCTS_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch products.json: ' + res.status);
      const products = await res.json();
      const container = document.querySelector('.catalog_grid');
      if (!container) return;
      container.innerHTML = '';

      products.forEach(p => {
        const div = document.createElement('div');
        div.className = 'catalog_grid-item';
        div.dataset.category = p.category || 'all';
        div.innerHTML = `
          <img class="catalog_grid-img" src="${p.image}" alt="${p.title}">
          <h2 class="catalog_grid-title">${p.title}</h2>
          <p class="catalog_grid-price">Цена: ${p.price} руб.</p>
          <a class="catalog_grid-buy btn" href="https://t.me/Mananger_Lumini">Купить</a>
        `;
        container.appendChild(div);
      });
    } catch (err) {
      console.error('Error loading products:', err);
    }
  }

  // начальная загрузка и авто-обновление каждые 60 секунд
  loadProducts();
  setInterval(loadProducts, 60000);
})();
