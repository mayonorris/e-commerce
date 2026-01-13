(function () {
  "use strict";

  const PRODUCTS_URL = "data/products.json";
  const CART_KEY = "ec_cart_v1";

  const gridEl = document.getElementById("productsGrid");
  const emptyEl = document.getElementById("emptyState");
  const resultsInfoEl = document.getElementById("resultsInfo");

  const categorySelect = document.getElementById("categorySelect");
  const sortSelect = document.getElementById("sortSelect");
  const stockSelect = document.getElementById("stockSelect");
  const priceMaxInput = document.getElementById("priceMax");

  const applyBtn = document.getElementById("applyFiltersBtn");
  const resetBtn = document.getElementById("resetFiltersBtn");

  const searchForm = document.getElementById("shopSearchForm");
  const searchInput = document.getElementById("q");

  if (!gridEl) return;

  let allProducts = [];
  let viewProducts = [];

  function safeJSONParse(value, fallback) {
    try { return JSON.parse(value); } catch { return fallback; }
  }

  function getCart() {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? safeJSONParse(raw, []) : [];
  }

  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    window.dispatchEvent(new Event("cart:updated"));
  }

  function addToCart(item, quantity = 1) {
    const cart = getCart();
    const idx = cart.findIndex((x) => x.item_id === item.item_id);

    if (idx >= 0) {
      cart[idx].quantity = (Number(cart[idx].quantity) || 0) + quantity;
    } else {
      cart.push({
        item_id: item.item_id,
        item_name: item.item_name,
        item_category: item.item_category,
        price: Number(item.price) || 0,
        currency: item.currency || "XOF",
        quantity,
        image: item.image || ""
      });
    }

    saveCart(cart);
  }

  function formatXOF(n) {
    const v = Number(n) || 0;
    return v.toLocaleString("fr-FR") + " FCFA";
  }

  function normalize(str) {
    return (str || "")
      .toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function getQueryParams() {
    const params = new URLSearchParams(window.location.search);
    return { q: (params.get("q") || "").trim(), promo: (params.get("promo") || "").trim() };
  }

  function setQueryParam(key, value) {
    const url = new URL(window.location.href);
    if (!value) url.searchParams.delete(key);
    else url.searchParams.set(key, value);
    window.history.replaceState({}, "", url);
  }

  async function loadProducts() {
    const res = await fetch(PRODUCTS_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("Impossible de charger products.json");
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  }

  function uniqueCategories(products) {
    const set = new Set();
    products.forEach((p) => p.item_category && set.add(p.item_category));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "fr"));
  }

  function fillCategorySelect(products) {
    const cats = uniqueCategories(products);
    const keepFirst = categorySelect.querySelector('option[value="all"]');
    categorySelect.innerHTML = "";
    categorySelect.appendChild(keepFirst);

    cats.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      categorySelect.appendChild(opt);
    });
  }

  function featuredScore(p) {
    const badgeBoost = p.badge ? 10 : 0;
    const r = Number(p.rating || 0);
    const rev = Number(p.reviews || 0);
    return badgeBoost + r * 10 + Math.min(rev, 300) / 10;
  }

  function toGAItem(p) {
    return {
      item_id: p.item_id,
      item_name: p.item_name,
      item_category: p.item_category,
      item_category2: p.item_category2,
      price: Number(p.price) || 0
    };
  }

  function shorten(str, max) {
    if (!str) return "";
    return str.length > max ? str.slice(0, max - 1) + "…" : str;
  }

  function escapeHtml(s) {
    return (s || "").replace(/[&<>"']/g, (m) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[m]));
  }

  function escapeAttr(s) {
    return escapeHtml(s).replace(/`/g, "&#096;");
  }

  function productCardHTML(p) {
    const badge = p.badge ? `<span class="tag">${escapeHtml(p.badge)}</span>` : "";
    const stock = p.in_stock ? `<span class="stock stock--in">En stock</span>` : `<span class="stock stock--out">Rupture</span>`;

    return `
      <article class="product-card product-card--shop" data-item-id="${escapeAttr(p.item_id)}">
        <a class="product-card__link"
           href="product.html?id=${encodeURIComponent(p.item_id)}"
           data-analytics="product_click"
           data-item-id="${escapeAttr(p.item_id)}">

          <img class="product-card__img"
               src="${escapeAttr(p.image || "")}"
               alt="${escapeAttr(p.item_name || "Produit")}"
               loading="lazy"
               referrerpolicy="no-referrer"
               onerror="this.style.display='none'; this.closest('article').classList.add('img-fallback');" />

          <div class="product-card__meta">
            <div class="product-card__topline">
              <p class="product-card__category">${escapeHtml(p.item_category || "")}</p>
              ${badge}
            </div>
            <h3 class="product-card__title">${escapeHtml(p.item_name || "")}</h3>
            <p class="product-card__desc">${escapeHtml(shorten(p.description || "", 90))}</p>
          </div>
        </a>

        <div class="product-card__bottom">
          <div class="product-card__pricewrap">
            <p class="product-card__price">${formatXOF(p.price)}</p>
            <p class="product-card__sub">${stock} • ⭐ ${Number(p.rating || 0).toFixed(1)} (${Number(p.reviews || 0)})</p>
          </div>

          <button class="btn btn--small"
                  type="button"
                  data-analytics="add_to_cart"
                  data-item-id="${escapeAttr(p.item_id)}"
                  ${p.in_stock ? "" : "disabled"}>
            Ajouter
          </button>
        </div>
      </article>
    `;
  }

  function renderProducts(products) {
    viewProducts = products.slice();
    gridEl.innerHTML = viewProducts.map(productCardHTML).join("");

    const has = viewProducts.length > 0;
    emptyEl.hidden = has;
    gridEl.style.display = has ? "" : "none";

    resultsInfoEl.textContent = `${viewProducts.length} produit(s) affiché(s) sur ${allProducts.length}.`;
    bindCardEvents();
  }

  function applyFiltersAndSort({ emitAnalytics = true } = {}) {
    const q = (searchInput?.value || "").trim();
    const category = categorySelect?.value || "all";
    const stock = stockSelect?.value || "all";
    const sort = sortSelect?.value || "featured";
    const priceMax = Number(priceMaxInput?.value || 0);

    let filtered = allProducts.slice();

    if (q) {
      const nq = normalize(q);
      filtered = filtered.filter((p) => {
        const hay = normalize([p.item_name, p.item_category, p.item_category2, (p.tags || []).join(" "), p.description].join(" "));
        return hay.includes(nq);
      });
    }

    if (category !== "all") filtered = filtered.filter((p) => p.item_category === category);
    if (stock === "in") filtered = filtered.filter((p) => !!p.in_stock);
    if (stock === "out") filtered = filtered.filter((p) => !p.in_stock);
    if (priceMax > 0) filtered = filtered.filter((p) => Number(p.price) <= priceMax);

    filtered.sort((a, b) => {
      if (sort === "price_asc") return Number(a.price) - Number(b.price);
      if (sort === "price_desc") return Number(b.price) - Number(a.price);
      if (sort === "rating_desc") return Number(b.rating || 0) - Number(a.rating || 0);
      if (sort === "name_asc") return (a.item_name || "").localeCompare(b.item_name || "", "fr");
      return featuredScore(b) - featuredScore(a);
    });

    setQueryParam("q", q);
    renderProducts(filtered);

    if (emitAnalytics && typeof window.track === "function") {
      if (q) window.track("search", { search_term: q });

      window.track("filter_products", {
        category,
        stock,
        price_max: priceMax > 0 ? priceMax : null
      });

      window.track("sort_products", { sort_by: sort });

      window.track("view_item_list", {
        item_list_name: "Catalogue",
        items: filtered.slice(0, 50).map(toGAItem)
      });
    }
  }

  function bindCardEvents() {
    gridEl.querySelectorAll('a[data-analytics="product_click"]').forEach((a) => {
      a.addEventListener("click", () => {
        const id = a.getAttribute("data-item-id");
        const p = allProducts.find((x) => x.item_id === id);
        if (!p || typeof window.track !== "function") return;

        window.track("select_item", { item_list_name: "Catalogue", items: [toGAItem(p)] });
      });
    });

    gridEl.querySelectorAll('button[data-analytics="add_to_cart"]').forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-item-id");
        const p = allProducts.find((x) => x.item_id === id);
        if (!p || !p.in_stock) return;

        addToCart(p, 1);

        if (typeof window.track === "function") {
          window.track("add_to_cart", {
            currency: p.currency || "XOF",
            value: Number(p.price) || 0,
            items: [{ ...toGAItem(p), quantity: 1 }]
          });
        }

        toast("Ajouté au panier ✅");
      });
    });
  }

  function toast(message) {
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = message;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add("toast--show"));
    setTimeout(() => { el.classList.remove("toast--show"); setTimeout(() => el.remove(), 250); }, 2000);
  }

  function initFromURL() {
    const { q, promo } = getQueryParams();
    if (q && searchInput) searchInput.value = q;

    if (promo && typeof window.track === "function") {
      window.track("view_promotion", {
        promotions: [{ promotion_id: promo.toUpperCase(), promotion_name: `Promo: ${promo}` }]
      });
    }
  }

  function bindControls() {
    applyBtn?.addEventListener("click", () => applyFiltersAndSort({ emitAnalytics: true }));

    resetBtn?.addEventListener("click", () => {
      if (searchInput) searchInput.value = "";
      if (categorySelect) categorySelect.value = "all";
      if (stockSelect) stockSelect.value = "all";
      if (sortSelect) sortSelect.value = "featured";
      if (priceMaxInput) priceMaxInput.value = "";

      setQueryParam("q", "");
      applyFiltersAndSort({ emitAnalytics: true });
    });

    categorySelect?.addEventListener("change", () => applyFiltersAndSort({ emitAnalytics: true }));
    stockSelect?.addEventListener("change", () => applyFiltersAndSort({ emitAnalytics: true }));
    sortSelect?.addEventListener("change", () => applyFiltersAndSort({ emitAnalytics: true }));

    priceMaxInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); applyFiltersAndSort({ emitAnalytics: true }); }
    });

    searchForm?.addEventListener("submit", (e) => {
      e.preventDefault();
      applyFiltersAndSort({ emitAnalytics: true });
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    try {
      initFromURL();
      allProducts = await loadProducts();
      fillCategorySelect(allProducts);
      bindControls();
      applyFiltersAndSort({ emitAnalytics: true });
    } catch (err) {
      console.error(err);
      resultsInfoEl.textContent = "Erreur : impossible de charger les produits.";
      emptyEl.hidden = false;
      gridEl.style.display = "none";
    }
  });

})();
