(function () {
  "use strict";

  const PRODUCTS_URL = "data/products.json";
  const CART_KEY = "ec_cart_v1";

  const titleEl = document.getElementById("productTitle");
  const categoryEl = document.getElementById("productCategory");
  const badgeEl = document.getElementById("productBadge");
  const descEl = document.getElementById("productDesc");
  const priceEl = document.getElementById("productPrice");
  const subEl = document.getElementById("productSub");
  const imgEl = document.getElementById("productImg");
  const alertEl = document.getElementById("productAlert");
  const breadcrumbCurrent = document.getElementById("breadcrumbCurrent");

  const qtyInput = document.getElementById("qtyInput");
  const addBtn = document.getElementById("addToCartBtn");
  const relatedGrid = document.getElementById("relatedGrid");

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

    if (idx >= 0) cart[idx].quantity = (Number(cart[idx].quantity) || 0) + quantity;
    else cart.push({
      item_id: item.item_id,
      item_name: item.item_name,
      item_category: item.item_category,
      price: Number(item.price) || 0,
      currency: item.currency || "XOF",
      quantity,
      image: item.image || ""
    });

    saveCart(cart);
  }

  function formatXOF(n) {
    const v = Number(n) || 0;
    return v.toLocaleString("fr-FR") + " FCFA";
  }

  function getProductId() {
    const params = new URLSearchParams(window.location.search);
    return (params.get("id") || "").trim();
  }

  async function loadProducts() {
    const res = await fetch(PRODUCTS_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("Impossible de charger products.json");
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  }

  function showAlert(message, type = "info") {
    alertEl.hidden = false;
    alertEl.className = `product__alert product__alert--${type}`;
    alertEl.textContent = message;
  }

  function hideAlert() {
    alertEl.hidden = true;
    alertEl.textContent = "";
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

  function renderProduct(p) {
    titleEl.textContent = p.item_name || "Produit";
    breadcrumbCurrent.textContent = p.item_name || "Produit";
    categoryEl.textContent = p.item_category || "—";

    if (p.badge) { badgeEl.hidden = false; badgeEl.textContent = p.badge; }
    else { badgeEl.hidden = true; }

    descEl.textContent = p.description || "";
    priceEl.textContent = formatXOF(p.price);

    const stockText = p.in_stock ? "En stock" : "Rupture";
    const ratingText = `⭐ ${Number(p.rating || 0).toFixed(1)} (${Number(p.reviews || 0)} avis)`;
    subEl.textContent = `${stockText} • ${ratingText}`;

    // ✅ Image réelle
    imgEl.src = p.image || "";
    imgEl.alt = p.item_name || "Produit";
    imgEl.referrerPolicy = "no-referrer";
    imgEl.onerror = () => {
      imgEl.removeAttribute("src");
      imgEl.classList.add("product__img--fallback");
    };

    addBtn.disabled = !p.in_stock;
    addBtn.textContent = p.in_stock ? "Ajouter au panier" : "Indisponible";
  }

  function renderRelated(products, current) {
    if (!relatedGrid) return;

    const related = products
      .filter((x) => x.item_id !== current.item_id && x.item_category === current.item_category)
      .slice(0, 4);

    relatedGrid.innerHTML = related.map((p) => `
      <article class="product-card product-card--shop">
        <a class="product-card__link"
           href="product.html?id=${encodeURIComponent(p.item_id)}"
           data-analytics="related_product_click"
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
              ${p.badge ? `<span class="tag">${escapeHtml(p.badge)}</span>` : ""}
            </div>
            <h3 class="product-card__title">${escapeHtml(p.item_name || "")}</h3>
            <p class="product-card__desc">${escapeHtml(shorten(p.description || "", 85))}</p>
          </div>
        </a>

        <div class="product-card__bottom">
          <div class="product-card__pricewrap">
            <p class="product-card__price">${formatXOF(p.price)}</p>
            <p class="product-card__sub">${p.in_stock ? "En stock" : "Rupture"} • ⭐ ${Number(p.rating || 0).toFixed(1)}</p>
          </div>
          <button class="btn btn--small"
                  type="button"
                  data-analytics="related_add_to_cart"
                  data-item-id="${escapeAttr(p.item_id)}"
                  ${p.in_stock ? "" : "disabled"}>
            Ajouter
          </button>
        </div>
      </article>
    `).join("");

    relatedGrid.querySelectorAll('a[data-analytics="related_product_click"]').forEach((a) => {
      a.addEventListener("click", () => {
        const id = a.getAttribute("data-item-id");
        const p = products.find((x) => x.item_id === id);
        if (!p || typeof window.track !== "function") return;
        window.track("select_item", { item_list_name: "Produits similaires", items: [toGAItem(p)] });
      });
    });

    relatedGrid.querySelectorAll('button[data-analytics="related_add_to_cart"]').forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-item-id");
        const p = products.find((x) => x.item_id === id);
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

  document.addEventListener("DOMContentLoaded", async () => {
    hideAlert();

    const id = getProductId();
    if (!id) {
      titleEl.textContent = "Produit introuvable";
      showAlert("Aucun identifiant de produit fourni. Retournez à la boutique.", "error");
      addBtn.disabled = true;
      return;
    }

    try {
      const products = await loadProducts();
      const product = products.find((p) => p.item_id === id);

      if (!product) {
        titleEl.textContent = "Produit introuvable";
        showAlert("Ce produit n’existe pas (id inconnu). Retournez à la boutique.", "error");
        addBtn.disabled = true;
        return;
      }

      renderProduct(product);
      renderRelated(products, product);

      if (typeof window.track === "function") {
        window.track("view_item", {
          currency: product.currency || "XOF",
          value: Number(product.price) || 0,
          items: [toGAItem(product)]
        });
      }

      addBtn.addEventListener("click", () => {
        const qty = Math.max(1, Number(qtyInput?.value || 1));
        if (!product.in_stock) return;

        addToCart(product, qty);

        if (typeof window.track === "function") {
          window.track("add_to_cart", {
            currency: product.currency || "XOF",
            value: (Number(product.price) || 0) * qty,
            items: [{ ...toGAItem(product), quantity: qty }]
          });
        }

        toast("Ajouté au panier ✅");
      });

    } catch (err) {
      console.error(err);
      titleEl.textContent = "Erreur";
      showAlert("Erreur lors du chargement des données produit.", "error");
      addBtn.disabled = true;
    }
  });

})();
