/* =========================================================
   cart.js — page panier
   - Rend le panier depuis localStorage
   - Modifie quantités + suppression
   - Calcule totaux
   - GA4: view_cart, remove_from_cart, begin_checkout
========================================================= */

(function () {
  "use strict";

  const CART_KEY = "ec_cart_v1";

  // DOM
  const listEl = document.getElementById("cartList");
  const emptyEl = document.getElementById("cartEmpty");

  const subtotalEl = document.getElementById("subtotal");
  const shippingEl = document.getElementById("shipping");
  const totalEl = document.getElementById("total");

  const checkoutBtn = document.getElementById("checkoutBtn");

  if (!listEl) return;

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

  function formatXOF(n) {
    const v = Number(n) || 0;
    return v.toLocaleString("fr-FR") + " FCFA";
  }

  function cartSubtotal(cart) {
    return cart.reduce((sum, item) => {
      const price = Number(item.price) || 0;
      const qty = Number(item.quantity) || 0;
      return sum + price * qty;
    }, 0);
  }

  function shippingCost(subtotal) {
    // Démo : livraison gratuite dès 25 000 FCFA, sinon 1500 FCFA
    if (subtotal === 0) return 0;
    return subtotal >= 25000 ? 0 : 1500;
  }

  function toGAItems(cart) {
    return cart.map((it) => ({
      item_id: it.item_id,
      item_name: it.item_name,
      item_category: it.item_category,
      price: Number(it.price) || 0,
      quantity: Number(it.quantity) || 0
    }));
  }

  function render() {
    const cart = getCart();

    if (!cart.length) {
      listEl.innerHTML = "";
      emptyEl.hidden = false;
      checkoutBtn.classList.add("btn--disabled");
      checkoutBtn.setAttribute("aria-disabled", "true");
      checkoutBtn.addEventListener("click", blockCheckoutIfEmpty, { once: true });

      updateSummary(cart);
      return;
    }

    emptyEl.hidden = true;
    checkoutBtn.classList.remove("btn--disabled");
    checkoutBtn.removeAttribute("aria-disabled");

    listEl.innerHTML = cart.map(itemRowHTML).join("");

    bindRowEvents();
    updateSummary(cart);

    // GA4: view_cart
    if (typeof window.track === "function") {
      window.track("view_cart", {
        currency: "XOF",
        value: cartSubtotal(cart),
        items: toGAItems(cart)
      });
    }
  }

  function blockCheckoutIfEmpty(e) {
    e.preventDefault();
    toast("Votre panier est vide.");
  }

  function updateSummary(cart) {
    const subtotal = cartSubtotal(cart);
    const ship = shippingCost(subtotal);
    const total = subtotal + ship;

    subtotalEl.textContent = formatXOF(subtotal);
    shippingEl.textContent = formatXOF(ship);
    totalEl.textContent = formatXOF(total);
  }

  function itemRowHTML(it) {
    const price = Number(it.price) || 0;
    const qty = Math.max(1, Number(it.quantity) || 1);
    const line = price * qty;

    return `
      <div class="cart-item" data-item-id="${escapeAttr(it.item_id)}">
        <div class="cart-item__img" aria-hidden="true"></div>

        <div class="cart-item__info">
          <p class="cart-item__category">${escapeHtml(it.item_category || "")}</p>
          <h3 class="cart-item__name">${escapeHtml(it.item_name || "")}</h3>
          <p class="cart-item__price">${formatXOF(price)} / unité</p>

          <div class="cart-item__actions">
            <div class="qty qty--row">
              <label class="sr-only" for="qty_${escapeAttr(it.item_id)}">Quantité</label>
              <input
                id="qty_${escapeAttr(it.item_id)}"
                class="control__input qty__input"
                type="number"
                min="1"
                step="1"
                value="${qty}"
                inputmode="numeric"
                data-analytics="cart_qty_change"
              />
            </div>

            <button class="btn btn--small btn--ghost"
                    type="button"
                    data-analytics="remove_from_cart">
              Supprimer
            </button>
          </div>
        </div>

        <div class="cart-item__line">
          <p class="cart-item__lineLabel">Total</p>
          <p class="cart-item__lineValue">${formatXOF(line)}</p>
        </div>
      </div>
    `;
  }

  function bindRowEvents() {
    const rows = listEl.querySelectorAll(".cart-item");

    rows.forEach((row) => {
      const id = row.getAttribute("data-item-id");
      const qtyInput = row.querySelector(".qty__input");
      const removeBtn = row.querySelector('button[data-analytics="remove_from_cart"]');

      qtyInput?.addEventListener("change", () => {
        const cart = getCart();
        const idx = cart.findIndex((x) => x.item_id === id);
        if (idx < 0) return;

        const newQty = Math.max(1, Number(qtyInput.value || 1));
        cart[idx].quantity = newQty;

        saveCart(cart);
        toast("Quantité mise à jour ✅");
        render(); // re-render totals & lines
      });

      removeBtn?.addEventListener("click", () => {
        const cart = getCart();
        const idx = cart.findIndex((x) => x.item_id === id);
        if (idx < 0) return;

        const removed = cart[idx];
        const newCart = cart.filter((x) => x.item_id !== id);

        saveCart(newCart);

        // GA4: remove_from_cart
        if (typeof window.track === "function") {
          window.track("remove_from_cart", {
            currency: removed.currency || "XOF",
            value: (Number(removed.price) || 0) * (Number(removed.quantity) || 1),
            items: [{
              item_id: removed.item_id,
              item_name: removed.item_name,
              item_category: removed.item_category,
              price: Number(removed.price) || 0,
              quantity: Number(removed.quantity) || 1
            }]
          });
        }

        toast("Article supprimé 🗑️");
        render();
      });
    });

    // begin_checkout
    checkoutBtn?.addEventListener("click", (e) => {
      const cart = getCart();
      if (!cart.length) {
        e.preventDefault();
        toast("Votre panier est vide.");
        return;
      }

      if (typeof window.track === "function") {
        window.track("begin_checkout", {
          currency: "XOF",
          value: cartSubtotal(cart),
          items: toGAItems(cart)
        });
      }
    });
  }

  // Toast
  function toast(message) {
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = message;

    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add("toast--show"));

    setTimeout(() => {
      el.classList.remove("toast--show");
      setTimeout(() => el.remove(), 250);
    }, 2000);
  }

  function escapeHtml(s) {
    return (s || "").replace(/[&<>"']/g, (m) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[m]));
  }

  function escapeAttr(s) {
    return escapeHtml(s).replace(/`/g, "&#096;");
  }

  // Init
  document.addEventListener("DOMContentLoaded", () => {
    render();
  });

})();
