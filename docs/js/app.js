/* ─────────────────────────────────────────────────
   app.js — Райский дворик
   ───────────────────────────────────────────────── */

let menuData = null;
let cart     = JSON.parse(localStorage.getItem('resti_cart') || '{}');
let qrDone   = false;

// ── Boot ──────────────────────────────────────────
fetch('data.json')
    .then(r => r.json())
    .then(data => {
        menuData = data;
        buildCategories();
        buildMenu(menuData.categories, 'menu-container');
        buildRules();
        syncCart();
    });

// ── Categories ────────────────────────────────────
function buildCategories() {
    const row = document.getElementById('categories-container');
    row.innerHTML = '<button class="chip active" onclick="filterCat(\'all\',this)">Все</button>';
    menuData.categories
        .filter(c => !c.hidden)
        .forEach(cat => {
            const b = document.createElement('button');
            b.className   = 'chip';
            b.textContent = cat.name;
            b.onclick = e => filterCat(cat.id, e.currentTarget);
            row.appendChild(b);
        });
}

function filterCat(id, btn) {
    document.querySelectorAll('#categories-container .chip')
        .forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    const cats = id === 'all'
        ? menuData.categories
        : menuData.categories.filter(c => c.id === id);
    buildMenu(cats, 'menu-container');
}

// ── Build Menu ────────────────────────────────────
function buildMenu(categories, targetId) {
    const el = document.getElementById(targetId);
    if (!el) return;
    el.innerHTML = '';

    let found = false;
    categories.forEach(cat => {
        if (cat.hidden) return;
        const items = (cat.items || []).filter(i => !i.hidden);
        if (!items.length) return;
        found = true;

        const sec = document.createElement('div');
        sec.className = 'category-section';

        const h = document.createElement('h2');
        h.className = 'category-title';
        h.innerHTML = `<span class="material-symbols-rounded">local_dining</span>${cat.name}`;
        sec.appendChild(h);

        const grid = document.createElement('div');
        grid.className = 'dishes-grid';
        items.forEach(item => grid.appendChild(buildCard(item)));
        sec.appendChild(grid);
        el.appendChild(sec);
    });

    if (!found) {
        el.innerHTML = '<p class="no-results">Ничего не найдено</p>';
    }
}

function buildCard(item) {
    const card = document.createElement('div');
    card.className = 'card';

    const img = item.image
        ? `<img src="${item.image}" class="card-img" alt="${esc(item.name)}" loading="lazy">`
        : `<div class="card-img-placeholder"><span class="material-symbols-rounded">restaurant_menu</span></div>`;

    let foot = '';
    if (item.variants && item.variants.length) {
        foot = `<div class="variants-col">`;
        item.variants.forEach((v, vi) => {
            const p = prc(v.price);
            foot += `
                <div class="variant-row">
                    <span class="price-badge">${v.name}: ${p} ₸</span>
                    <button class="btn-add" onclick="addItem('${item.id}_${vi}','${esc(item.name)} (${esc(v.name)})','${p}')">
                        <span class="material-symbols-rounded">add</span>
                    </button>
                </div>`;
        });
        foot += `</div>`;
    } else {
        const p = prc(item.price);
        foot = `
            <span class="price-badge">${p} ₸</span>
            <button class="btn-add" onclick="addItem('${item.id}','${esc(item.name)}','${p}')">
                <span class="material-symbols-rounded">add</span>В корзину
            </button>`;
    }

    card.innerHTML = `
        ${img}
        <div class="card-body">
            <div class="card-name">${item.name}</div>
            <div class="card-desc">${item.description || ''}</div>
            <div class="card-foot" style="${item.variants?.length ? 'flex-direction:column;align-items:stretch;' : ''}">${foot}</div>
        </div>`;
    return card;
}

// ── Rules / Fines ─────────────────────────────────
function buildRules() {
    const el = document.getElementById('restaurant-rules');
    if (!el || !menuData) return;

    const rules    = menuData.restaurant.rules || '';
    const finesRaw = (menuData.restaurant.fines || '')
        .replace(/^Штрафы за бой посуды:\s*/i, '');

    let finesHTML = '';
    finesRaw.split(',').map(s => s.trim()).filter(Boolean).forEach(entry => {
        const di = entry.lastIndexOf('-');
        if (di < 0) return;
        const name  = entry.slice(0, di).trim();
        const price = entry.slice(di + 1).replace(/\D/g, '');
        finesHTML += `
            <div class="fine-row">
                <span class="fine-name">${name}</span>
                <span class="fine-price">${price} ₸</span>
            </div>`;
    });

    el.innerHTML = `
        <p class="rules-section-title">Правила кафе</p>
        <p class="rules-text">${rules.replace(/\n/g, '<br>')}</p>
        <p class="rules-section-title" style="border-color:var(--c-error)">Штрафы за бой посуды</p>
        <div class="fines-list">${finesHTML}</div>`;
}

// ── Tab Navigation ────────────────────────────────
function switchTab(tab) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${tab}`).classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    const btn = document.querySelector(`[data-tab="${tab}"]`);
    if (btn) btn.classList.add('active');

    // Remove search circle active state
    document.getElementById('search-circle').classList.remove('active');

    if (tab === 'rules' && !qrDone) {
        qrDone = true;
        setTimeout(buildQR, 120);
    }
}

// ── Search ────────────────────────────────────────
function openSearch() {
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('search-circle').classList.add('active');

    const ov = document.getElementById('search-overlay');
    ov.classList.add('open');
    document.getElementById('search-results').innerHTML = '';
    setTimeout(() => document.getElementById('search-input').focus(), 200);
}

function closeSearch() {
    document.getElementById('search-overlay').classList.remove('open');
    document.getElementById('search-input').value = '';
    document.getElementById('search-results').innerHTML = '';
    document.getElementById('search-circle').classList.remove('active');

    // Restore active tab highlight
    const active = document.querySelector('.page.active');
    const id = active ? active.id.replace('page-', '') : 'menu';
    const btn = document.querySelector(`[data-tab="${id}"]`);
    if (btn) btn.classList.add('active');
}

document.getElementById('search-input').addEventListener('input', function () {
    const q = this.value.toLowerCase().trim();
    const el = document.getElementById('search-results');
    if (!menuData) return;

    if (!q) { el.innerHTML = ''; return; }

    const results = menuData.categories
        .filter(c => !c.hidden)
        .map(cat => ({
            ...cat,
            items: (cat.items || []).filter(i =>
                !i.hidden && (
                    i.name.toLowerCase().includes(q) ||
                    (i.description || '').toLowerCase().includes(q)
                )
            )
        }))
        .filter(c => c.items.length > 0);

    buildMenu(results, 'search-results');
});

// ── Cart ──────────────────────────────────────────
function addItem(id, name, priceStr) {
    const price = parseInt(prc(priceStr)) || 0;
    cart[id] = cart[id]
        ? { ...cart[id], qty: cart[id].qty + 1 }
        : { name, price, qty: 1 };
    saveCart();
}

function changeQty(id, delta) {
    if (!cart[id]) return;
    cart[id].qty += delta;
    if (cart[id].qty <= 0) delete cart[id];
    saveCart();
}

function saveCart() {
    localStorage.setItem('resti_cart', JSON.stringify(cart));
    syncCart();
}

function syncCart() {
    const el    = document.getElementById('cart-items-container');
    const total = document.getElementById('cart-total');
    const dot   = document.getElementById('cart-dot');
    if (!el) return;

    el.innerHTML = '';
    let sum = 0, count = 0;

    const entries = Object.entries(cart);
    if (!entries.length) {
        el.innerHTML = `
            <div class="empty-cart">
                <span class="material-symbols-rounded">shopping_bag</span>
                <p>Корзина пуста</p>
                <small>Добавьте что-нибудь из меню</small>
            </div>`;
    } else {
        entries.forEach(([id, item]) => {
            sum   += item.price * item.qty;
            count += item.qty;
            const row = document.createElement('div');
            row.className = 'cart-item';
            row.innerHTML = `
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">${item.price} ₸ × ${item.qty}</div>
                </div>
                <div class="cart-controls">
                    <button class="cart-ctrl-btn" onclick="changeQty('${id}',-1)">−</button>
                    <span class="qty">${item.qty}</span>
                    <button class="cart-ctrl-btn" onclick="changeQty('${id}',1)">+</button>
                </div>`;
            el.appendChild(row);
        });
    }

    if (total) total.textContent = `${sum} ₸`;
    if (dot)   dot.style.display = count > 0 ? 'block' : 'none';
}

// ── QR ────────────────────────────────────────────
function buildQR() {
    const el = document.getElementById('qrcode');
    if (!el || el.children.length) return;
    const url = location.href.split('#')[0].split('?')[0];
    new QRCode(el, {
        text: url, width: 160, height: 160,
        colorDark: '#1E1E1E', colorLight: '#FFFFFF',
        correctLevel: QRCode.CorrectLevel.H
    });
}

// ── Helpers ───────────────────────────────────────
function prc(v) { return (v || '0').toString().replace(/[^\d.]/g, '') || '0'; }
function esc(s) { return (s || '').replace(/'/g, "\\'"); }
