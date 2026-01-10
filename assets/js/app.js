/* =========================================================
   app.js — logique de base (panier, UI, hooks)
   - Met à jour le compteur panier (#cartCount)
   - Gère les boutons "Ajouter au panier" sur index.html
   - Envoie des événements analytics via window.track()
========================================================= */

(function () {
  "use strict";

  const CART_KEY = "ec_cart_v1";

  function safeJSONParse(value, fallback) {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  function getCart() {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? safeJSONParse(raw, []) : [];
  }

  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }

  function cartItemCount(cart) {
    return cart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  }

  function updateCartCountUI() {
    const el = document.getElementById("cartCount");
    if (!el) return;

    const cart = getCart();
    const count = cartItemCount(cart);

    el.textContent = String(count);
    el.setAttribute("aria-label", `Articles dans le panier : ${count}`);
  }

  // (Démo) Catalogue minimal pour les produits "Sélection" sur index.html
  // On remplacera plus tard par data/products.json
  const FEATURED_CATALOG = {
    sku_001: { item_id: "sku_001", item_name: "Carnet intelligent (démo)", item_category: "Accessoires", price: 12000, currency: "XOF" },
    sku_002: { item_id: "sku_002", item_name: "Écouteurs sans fil (démo)", item_category: "Tech",        price: 18500, currency: "XOF" },
    sku_003: { item_id: "sku_003", item_name: "Lampe minimaliste (démo)",    item_category: "Maison",      price:  9900, currency: "XOF" },
    sku_004: { item_id: "sku_004", item_name: "Organiseur de bureau (démo)", item_category: "Bureau",     price:  6500, currency: "XOF" }
  };

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
        quantity: quantity
      });
    }

    saveCart(cart);
    updateCartCountUI();
  }

  // Petite notification (UX) sans lib externe
  function toast(message) {
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = message;

    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add("toast--show"));

    setTimeout(() => {
      el.classList.remove("toast--show");
      setTimeout(() => el.remove(), 250);
    }, 2200);
  }

  function bindAddToCartButtons() {
    const buttons = document.querySelectorAll('button[data-analytics="featured_add_to_cart"]');
    if (!buttons.length) return;

    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const itemId = btn.getAttribute("data-item-id");
        if (!itemId || !FEATURED_CATALOG[itemId]) return;

        const item = FEATURED_CATALOG[itemId];
        addToCart(item, 1);

        // GA4 event: add_to_cart
        if (typeof window.track === "function") {
          window.track("add_to_cart", {
            currency: item.currency || "XOF",
            value: item.price,
            items: [{
              item_id: item.item_id,
              item_name: item.item_name,
              item_category: item.item_category,
              price: item.price,
              quantity: 1
            }]
          });
        }

        toast("Ajouté au panier ✅");
      });
    });
  }

  function bindPromoClicks() {
    // Ici, l’objectif est surtout pédagogique : on capte les promos facilement.
    const promos = document.querySelectorAll('a[data-analytics="promo_click"]');
    if (!promos.length) return;

    promos.forEach((a) => {
      a.addEventListener("click", () => {
        const promo_id = a.getAttribute("data-promo-id") || "PROMO_INCONNUE";
        const promo_name = a.getAttribute("data-promo-name") || "Promotion";

        if (typeof window.track === "function") {
          // GA4 recommended: select_promotion
          window.track("select_promotion", {
            promotions: [{ promotion_id: promo_id, promotion_name: promo_name }]
          });
        }
      });
    });
  }

  function bindFeaturedProductClicks() {
    const links = document.querySelectorAll('a[data-analytics="featured_product_click"]');
    if (!links.length) return;

    links.forEach((a) => {
      a.addEventListener("click", () => {
        const item_id = a.getAttribute("data-item-id");
        const item = item_id ? FEATURED_CATALOG[item_id] : null;

        if (typeof window.track === "function") {
          // GA4 recommended: select_item (from a list)
          window.track("select_item", {
            item_list_name: "Sélection du moment",
            items: item ? [{
              item_id: item.item_id,
              item_name: item.item_name,
              item_category: item.item_category,
              price: item.price
            }] : []
          });
        }
      });
    });
  }

  function bindSearchSubmit() {
    const form = document.querySelector("form.search");
    if (!form) return;

    form.addEventListener("submit", () => {
      const input = form.querySelector("input[name='q']");
      const term = (input?.value || "").trim();

      if (typeof window.track === "function") {
        // GA4 recommended: search
        window.track("search", { search_term: term || "(vide)" });
      }
    });
  }

  function pageView() {
    // Pour GTM/GA4, la page_view est souvent automatique.
    // On garde quand même une trace custom si besoin.
    if (typeof window.track === "function") {
      window.track("page_view_custom", {
        page_title: document.title,
        page_location: window.location.href,
        page_path: window.location.pathname
      });
    }
  }

  // Init
  document.addEventListener("DOMContentLoaded", () => {
    updateCartCountUI();
    window.addEventListener("cart:updated", updateCartCountUI);
    bindAddToCartButtons();
    bindPromoClicks();
    bindFeaturedProductClicks();
    bindSearchSubmit();
    pageView();
  });

})();
