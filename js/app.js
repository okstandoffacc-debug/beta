// Основная логика приложения Старинная Коллекция

// Кэшированные данные
let allProducts = [];
let filteredProducts = [];
let currentCategory = 'all';
let currentSort = 'default';
let searchQuery = '';
let favorites = [];
let cart = [];
let viewHistory = [];

// Иконки категорий
const ICONS = {
  'Посуда': 'fa-mug-hot',
  'Свет': 'fa-lightbulb',
  'Фигурки и декор': 'fa-chess-knight',
  'Инструменты и приборы': 'fa-compass',
  'Кухня и быт': 'fa-utensils',
  'Техника': 'fa-radio',
  'Медицина': 'fa-kit-medical',
  'Курительные': 'fa-smoking'
};

// Загрузка данных каталога
async function loadCatalogData() {
  try {
    const response = await fetch('./js/catalog.json');
    if (!response.ok) {
      console.error('Не удалось загрузить каталог');
      return [];
    }
    const data = await response.json();
    console.log('Загружено товаров:', data.length);
    return data;
  } catch (error) {
    console.error('Ошибка при загрузке каталога:', error);
    return [];
  }
}

// Инициализация приложения
async function initApp() {
  // Загружаем данные каталога
  allProducts = await loadCatalogData();
  if (allProducts.length === 0) {
    console.warn('Нет данных о товарах, используем пустой массив');
    allProducts = [];
  }

  // Загружаем избранное из localStorage
  const storedFavs = localStorage.getItem('favorites');
  if (storedFavs) {
    favorites = JSON.parse(storedFavs);
  }

  // Загружаем корзину из localStorage
  const storedCart = localStorage.getItem('cart');
  if (storedCart) {
    cart = JSON.parse(storedCart);
  }

  // Загружаем историю просмотров из localStorage
  const storedHistory = localStorage.getItem('viewHistory');
  if (storedHistory) {
    try { viewHistory = JSON.parse(storedHistory); } catch (e) { viewHistory = []; }
  }

  // Рендерим товары
  filteredProducts = allProducts;
  renderProducts(filteredProducts);

  // Генерируем кнопки категорий
  renderCategories();

  // Настраиваем обработчики событий
  setupEventListeners();

  // Обновляем интерфейс
  updateCartCount();
  updateFavoritesUI();
}

// Отрисовка товаров в сетке
function renderProducts(products) {
  const productsGrid = document.querySelector('.products-grid');
  const emptyState = document.getElementById('empty-state');

  if (!productsGrid) return;

  productsGrid.innerHTML = '';

  if (products.length === 0) {
    emptyState.hidden = false;
    return;
  }

  emptyState.hidden = true;

  products.forEach(product => {
    const productCard = document.createElement('div');
    productCard.className = 'product-card';
    productCard.setAttribute('role', 'article');
    productCard.setAttribute('tabindex', '0');

    // Определяем категорию для отображения иконки
    const category = product.category || 'Разное';
    const categoryIcon = ICONS[category] || 'fa-gem';

    productCard.innerHTML = `
      <div class="product-image-wrapper">
        <img
          src="${product.image || 'https://via.placeholder.com/400x400?text=Нет+фото'}"
          alt="${product.name}"
          class="product-image"
          loading="lazy"
          onerror="this.onerror=null;this.src='https://via.placeholder.com/400x400?text=Нет+фото'"
        >
        <div class="product-image-overlay">
          <button
            class="btn-favorite"
            aria-label="В избранное"
            onclick="event.stopPropagation();toggleFavorite(${product.id})"
            data-id="${product.id}"
          >
            <i class="fa${favorites.includes(product.id) ? '+' : ''} fa-heart"
               style="color:${favorites.includes(product.id) ? 'var(--gold-light)' : '#ffffff'}"></i>
          </button>
          <button
            class="btn-cart"
            aria-label="В корзину"
            onclick="event.stopPropagation();addToCart(${product.id})"
            data-id="${product.id}"
          >
            <i class="fas fa-shopping-cart"></i>
          </button>
        </div>
      </div>

      <div class="product-info">
        <h3 class="product-name" title="${product.name}">${product.name}</h3>
        <p class="product-price">${product.price}</p>
        <div class="product-category">${category}</div>
        <div class="product-meta">
          <span>${category}</span>
          <span>№ ${String(product.id).padStart(3, '0')}</span>
        </div>
      </div>
    `;

    // Клик по карточке открывает детали товара
    productCard.addEventListener('click', function() {
      showProductDetail(product.id);
    });

    // Добавляем обработчик клавиатуры для продукта
    productCard.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        showProductDetail(product.id);
      }
    });

    productsGrid.appendChild(productCard);
  });
}

// Фильтрация по поиску
function filterProducts(searchQuery) {
  const query = searchQuery.toLowerCase();

  filteredProducts = allProducts.filter(product => {
    const nameMatch = product.name.toLowerCase().includes(query);
    const priceMatch = product.price.toLowerCase().includes(query);
    return nameMatch || priceMatch || query === '';
  });

  renderProducts(filteredProducts);
  renderCategories();
  updateCategoryCounters();
  updateResetButton();
}

// Фильтрация по категории
function filterProductsByCategory(category) {
  currentCategory = category;

  if (category === 'all') {
    filteredProducts = allProducts;
  } else {
    filteredProducts = allProducts.filter(product => product.category === category);
  }

  renderProducts(filteredProducts);
  updateCategoryButtons();
}

// Генерация кнопок категорий из данных
function renderCategories() {
  const categoryFilters = document.getElementById('category-filters');
  if (!categoryFilters) return;

  // Считаем количество товаров по категориям
  const categoryCounts = {};
  allProducts.forEach(product => {
    const cat = product.category || 'Разное';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  // Сортируем категории по количеству товаров
  const sortedCategories = Object.keys(categoryCounts).sort((a, b) => categoryCounts[b] - categoryCounts[a]);

  // Генерируем HTML для кнопок категорий
  const buttonsHTML = sortedCategories.map(cat => {
    const count = categoryCounts[cat];
    return `
      <button
        class="category-btn"
        data-category="${cat}"
        aria-pressed="false"
      >
        ${cat}
        <span class="category-count">${count}</span>
      </button>
    `;
  }).join('');

  // Добавляем кнопку "Все товары" в начало
  categoryFilters.innerHTML = `
    <button
      class="category-btn active"
      data-category="all"
      aria-pressed="true"
    >
      Все товары
      <span class="category-count">${allProducts.length}</span>
    </button>
    ${buttonsHTML}
  `;

  // Назначаем обработчики для новых кнопок
  const categoryBtns = categoryFilters.querySelectorAll('.category-btn');
  categoryBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      categoryBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const category = btn.dataset.category;
      filterProductsByCategory(category);
    });
  });
}

// Обновление кнопок категорий
function updateCategoryButtons() {
  const categoryBtns = document.querySelectorAll('.category-btn');

  categoryBtns.forEach(btn => {
    const btnCategory = btn.dataset.category;
    const isActive = btnCategory === currentCategory || (currentCategory === 'all' && btnCategory === 'all');

    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', isActive);
  });
}

// Обновление отображения счетчиков категорий
function updateCategoryCounters() {
  const categoryCounts = {};
  allProducts.forEach(product => {
    const cat = product.category;
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  // Обновляем счетчики в кнопках
  const categoryBtns = document.querySelectorAll('.category-btn');
  categoryBtns.forEach(btn => {
    const cat = btn.dataset.category;
    const countEl = btn.querySelector('.category-count');
    if (countEl && cat) {
      countEl.textContent = categoryCounts[cat] || 0;
    }
  });
}

// Показывать кнопку сброса фильтров, если фильтры активны
function updateResetButton() {
  const resetBtn = document.getElementById('reset-filters-btn');
  if (!resetBtn) return;
  resetBtn.style.display = (searchQuery || currentCategory !== 'all' || currentSort !== 'default') ? 'inline-flex' : 'none';
}

// Настройка обработчиков событий
function setupEventListeners() {
  // Поиск
  const searchInput = document.querySelector('.search-input');
  if (searchInput) {
    searchInput.addEventListener('input', function(e) {
      searchQuery = e.target.value;
      filterProducts(searchQuery);
    });
  }

  // Фильтрация по категориям
  const categoryBtns = document.querySelectorAll('.category-btn');
  categoryBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      // Сначала сбрасываем активное состояние у всех
      categoryBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const category = btn.dataset.category;
      filterProductsByCategory(category);
    });
  });

  // Сортировка
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', function() {
      currentSort = this.value;
      applySorting();
    });
  }

  // Сброс фильтров
  const resetBtn = document.getElementById('reset-filters-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', resetAllFilters);
  }

  // Кнопка закрыть корзину
  const cartCloseBtn = document.querySelector('.cart-close');
  if (cartCloseBtn) {
    cartCloseBtn.addEventListener('click', closeCart);
  }

  // Клик по оверлею закрывает корзину
  const cartOverlay = document.getElementById('cart-overlay');
  if (cartOverlay) {
    cartOverlay.addEventListener('click', closeCart);
  }

  // Кнопка открыть корзину
  const cartBtn = document.getElementById('cart-btn');
  if (cartBtn) {
    cartBtn.addEventListener('click', openCart);
  }
}

// Применение сортировки
function applySorting() {
  if (filteredProducts.length === 0) return;

  let sorted = [...filteredProducts];

  switch (currentSort) {
    case 'price-asc':
      sorted.sort((a, b) => {
        const pa = parseInt(String(a.price).replace(/\D/g, ''), 10) || 0;
        const pb = parseInt(String(b.price).replace(/\D/g, ''), 10) || 0;
        return pa - pb;
      });
      break;
    case 'price-desc':
      sorted.sort((a, b) => {
        const pa = parseInt(String(a.price).replace(/\D/g, ''), 10) || 0;
        const pb = parseInt(String(b.price).replace(/\D/g, ''), 10) || 0;
        return pb - pa;
      });
      break;
    case 'new-first':
      // Сортировка по ID ( newest first — самые поздние добавленные )
      sorted.sort((a, b) => b.id - a.id);
      break;
    default:
      // оставляем текущий порядок
  }

  renderProducts(sorted);
}

// Сброс всех фильтров
function resetAllFilters() {
  searchQuery = '';
  currentCategory = 'all';
  currentSort = 'default';

  // Сбрасываем поля ввода
  const searchInput = document.querySelector('.search-input');
  if (searchInput) {
    searchInput.value = '';
  }

  // Сбрасываем сортировку
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.value = 'default';
    currentSort = 'default';
  }

  // Сбрасываем категории
  filteredProducts = [...allProducts];
  renderProducts(filteredProducts);
  updateCategoryButtons();
  updateCategoryCounters();
  const resetBtn = document.getElementById('reset-filters-btn');
  if (resetBtn) {
    resetBtn.style.display = 'none';
  }
}

// Добавление товара в историю просмотров
function addToHistory(id) {
  const product = allProducts.find(p => p.id === id);
  if (!product) return;
  viewHistory = viewHistory.filter(item => item.id !== id);
  viewHistory.unshift({ id, name: product.name, price: product.price, category: product.category, image: product.image, viewedAt: Date.now() });
  if (viewHistory.length > 50) viewHistory = viewHistory.slice(0, 50);
  localStorage.setItem('viewHistory', JSON.stringify(viewHistory));
}

// Очистка истории просмотров
function clearViewHistory() {
  viewHistory = [];
  localStorage.removeItem('viewHistory');
  renderViewHistory();
}

// Удаление товара из истории
function removeFromHistory(id) {
  viewHistory = viewHistory.filter(item => item.id !== id);
  localStorage.setItem('viewHistory', JSON.stringify(viewHistory));
  renderViewHistory();
}

// Добавление в корзину
function addToCart(id) {
  const product = allProducts.find(p => p.id === id);
  if (!product) return;

  // Проверяем, есть ли уже товар в корзине
  const existing = cart.find(item => item.id === id);
  if (existing) {
    existing.quantity = (existing.quantity || 1) + 1;
  } else {
    cart.push({ id, name: product.name, price: product.price, quantity: 1 });
  }

  // Сохраняем в localStorage
  localStorage.setItem('cart', JSON.stringify(cart));

  // Обновляем счетчик
  updateCartCount();

  // Показываем уведомление
  showToast('Товар добавлен в корзину');
}

// Удаление из корзины
function removeFromCart(id) {
  cart = cart.filter(item => item.id !== id);
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartCount();
  renderProducts(filteredProducts); // перерисовываем, чтобы обновить кнопки
}

// Переключение избранного
function toggleFavorite(id) {
  const index = favorites.indexOf(id);

  if (index === -1) {
    favorites.push(id);
  } else {
    favorites.splice(index, 1);
  }

  // Сохраняем в localStorage
  localStorage.setItem('favorites', JSON.stringify(favorites));

  // Обновляем UI
  updateFavoritesUI();

  // Перерисовываем карточки, чтобы обновить иконки
  renderProducts(filteredProducts);
}

// Обновление UI избранного
function updateFavoritesUI() {
  const favoriteBtns = document.querySelectorAll('.btn-favorite');

  favoriteBtns.forEach(btn => {
    const id = parseInt(btn.dataset.id, 10);
    const isFavorite = favorites.includes(id);

    // Обновляем иконку
    const heartIcon = btn.querySelector('i');
    if (heartIcon) {
      if (isFavorite) {
        heartIcon.className = 'fa fa-heart';
        heartIcon.style.color = '#7A2E2A';
      } else {
        heartIcon.className = 'fa-regular fa-heart';
        heartIcon.style.color = '#ffffff';
      }
    }

    // Обновляем атрибут pressed
    btn.setAttribute('aria-pressed', isFavorite);
  });
}

// Показать страницу товара
function showProductDetail(id) {
  const product = allProducts.find(p => p.id === id);
  if (!product) return;

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Создаем модальное окно или переходим к деталям
  const detailHTML = `
    <div class="product-modal" id="product-modal" role="dialog" aria-modal="true" aria-labelledby="product-modal-title" aria-describedby="product-modal-desc">
      <div class="product-modal-overlay" onclick="closeProductModal()"></div>

      <div class="product-modal-content" onclick="event.stopPropagation()">
        <button class="product-modal-close" onclick="closeProductModal()" aria-label="Закрыть детали товара">
          <i class="fas fa-times"></i>
        </button>

        <div class="product-modal-images">
          <img
            src="${product.image}"
            alt="${product.name}"
            class="product-modal-main-image"
            loading="lazy"
          >
          <div class="product-modal-thumbnails">
            ${product.photos ? product.photos.map((photo, i) => `<img src="${photo}" alt="${product.name} превью ${i+1}" class="product-modal-thumb${i === 0 ? ' active' : ''}" onclick="swapMainImage('${photo}')">`).join('') : ''}
          </div>
        </div>

        <div class="product-modal-info">
          <h2 id="product-modal-title" class="product-modal-title">${product.name}</h2>
          <p class="product-modal-price">${product.price}</p>
          <div class="product-modal-meta">
            <div class="product-modal-meta-item">
              <span class="product-modal-meta-label">Категория</span>
              <span class="product-modal-meta-value">${product.category || '—'}</span>
            </div>
            ${product.seller ? `<div class="product-modal-meta-item">
              <span class="product-modal-meta-label">Продавец</span>
              <span class="product-modal-meta-value">${product.seller}</span>
            </div>` : ''}
            ${product.year ? `<div class="product-modal-meta-item">
              <span class="product-modal-meta-label">Год</span>
              <span class="product-modal-meta-value">${product.year}</span>
            </div>` : ''}
          </div>
          <h3 class="product-modal-description-title">Описание</h3>
          <p id="product-modal-desc" class="product-modal-desc">${product.description || 'Описание отсутствует'}</p>

          <div class="product-modal-actions">
            <button class="btn-primary" onclick="addToCart(${product.id})" style="margin-right: 12px;">
              <i class="fas fa-shopping-cart" aria-hidden="true"></i> В корзину
            </button>
            <button class="btn-favorite" onclick="toggleFavorite(${product.id}); event.stopPropagation()" style="margin-left: 12px;">
              <i class="fa fa-heart" style="color: ${favorites.includes(product.id) ? '#7A2E2A' : '#ffffff'}"></i>
            </button>
            ${product.link ? `<a href="${product.link}" target="_blank" rel="noopener" class="btn-action" style="flex-basis:100%;margin-top:12px;background:#2f4a3f;color:#fff;border-color:#2f4a3f;">Открыть объявление на Авито</a>` : ''}
          </div>
        </div>
      </div>
    </div>
  `;

  // Добавляем модальное окно в тело страницы
  const modalContainer = document.createElement('div');
  modalContainer.innerHTML = detailHTML;
  document.body.appendChild(modalContainer);

  // Фокусируем модальное окно
  setTimeout(() => {
    const modal = document.getElementById('product-modal');
    if (modal) {
      modal.focus();
    }
  }, 100);
}

// Закрыть модальное окно товара
function closeProductModal() {
  const modal = document.getElementById('product-modal');
  if (modal) {
    modal.remove();
  }
}

// Обмен основного изображения
function swapMainImage(url) {
  const mainImage = document.querySelector('.product-modal-main-image');
  if (mainImage) {
    mainImage.src = url;
  }
}

// Показать уведомление
function showToast(message) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'alert');
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%) translateY(100px);
    background: var(--burgundy);
    color: white;
    padding: 12px 24px;
    border-radius: var(--radius-md);
    z-index: 1000;
    box-shadow: 0 8px 24px rgba(0,0,0,0.15);
    transition: transform 0.3s ease;
  `;

  container.appendChild(toast);

  // Анимация появления
  setTimeout(() => {
    toast.style.transform = 'translateX(-50%) translateY(0)';
  }, 10);

  // Автоматическое скрытие
  setTimeout(() => {
    toast.style.transform = 'translateX(-50%) translateY(100px)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Обновление счетчика корзины
function updateCartCount() {
  const cartCount = document.getElementById('cart-count');
  if (!cartCount) return;

  const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
  cartCount.textContent = totalItems;

  // Показываем/скрываем счетчик
  if (totalItems > 0) {
    cartCount.style.display = 'inline-block';
  } else {
    cartCount.style.display = 'none';
  }
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', initApp);

// Открыть корзину
function openCart() {
  const sidebar = document.getElementById('cart-sidebar');
  const overlay = document.getElementById('cart-overlay');
  if (!sidebar) return;

  renderCart();

  sidebar.hidden = false;
  if (overlay) overlay.hidden = false;
  document.body.style.overflow = 'hidden';
}

// Закрыть корзину
function closeCart() {
  const sidebar = document.getElementById('cart-sidebar');
  const overlay = document.getElementById('cart-overlay');
  if (sidebar) sidebar.hidden = true;
  if (overlay) overlay.hidden = true;
  document.body.style.overflow = '';
}

// Отрисовка товаров в корзине
function renderCart() {
  const cartItems = document.getElementById('cart-items');
  const cartTotal = document.getElementById('cart-total-sum');
  if (!cartItems) return;

  cartItems.innerHTML = '';

  if (cart.length === 0) {
    cartItems.innerHTML = '<p class="cart-empty">Ваша корзина пуста</p>';
    if (cartTotal) cartTotal.textContent = '0 ₽';
    return;
  }

  let sum = 0;
  cart.forEach(item => {
    const priceNum = parseInt(String(item.price).replace(/\D/g, ''), 10) || 0;
    sum += priceNum * (item.quantity || 1);

    const row = document.createElement('div');
    row.className = 'cart-item';
    row.innerHTML = `
      <div class="cart-item-info">
        <span class="cart-item-name">${item.name}</span>
        <span class="cart-item-price">${item.price} × ${item.quantity || 1}</span>
      </div>
      <button class="cart-item-remove" data-id="${item.id}" aria-label="Удалить">
        <i class="fas fa-trash"></i>
      </button>
    `;
    cartItems.appendChild(row);
  });

  if (cartTotal) cartTotal.textContent = sum + ' ₽';

  // Обработчики удаления
  cartItems.querySelectorAll('.cart-item-remove').forEach(btn => {
    btn.addEventListener('click', function() {
      removeFromCart(parseInt(this.dataset.id, 10));
      renderCart();
    });
  });
}

// Сброс всех фильтров (алиас для HTML-онклик)
function resetFilters() {
  resetAllFilters();
}

// Экспорт функций для использования в HTML
window.toggleFavorite = toggleFavorite;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.filterProducts = filterProducts;
window.filterProductsByCategory = filterProductsByCategory;
window.resetAllFilters = resetAllFilters;
window.resetFilters = resetFilters;
window.showProductDetail = showProductDetail;
window.closeProductModal = closeProductModal;
window.swapMainImage = swapMainImage;
window.openCart = openCart;
window.closeCart = closeCart;