(function () {
  "use strict";

  const CART_KEY = "ec_cart_v1";

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

      updateSummary(cart);
      return;
    }

    emptyEl.hidden = true;

    listEl.innerHTML = cart.map(itemRowHTML).join("");

    bindRowEvents();
    updateSummary(cart);

    if (typeof window.track === "function") {
      window.track("view_cart", {
        currency: "XOF",
        value: cartSubtotal(cart),
        items: toGAItems(cart)
      });
    }
  }

  function updateSummary(cart) {
    const sub = cartSubtotal(cart);
    const ship = shippingCost(sub);
    const tot = sub + ship;

    subtotalEl.textContent = formatXOF(sub);
    shippingEl.textContent = formatXOF(ship);
    totalEl.textContent = formatXOF(tot);
  }

  function itemRowHTML(it) {
    const price = Number(it.price) || 0;
    const qty = Math.max(1, Number(it.quantity) || 1);
    const line = price * qty;

    return `
      <div class="cart-item" data-item-id="${escapeAttr(it.item_id)}">
        <img class="cart-item__img"
             src="${escapeAttr(it.image || "")}"
             alt="${escapeAttr(it.item_name || "Produit")}"
             loading="lazy"
             referrerpolicy="no-referrer"
             onerror="this.style.display='none';" />

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
        render();
      });

      removeBtn?.addEventListener("click", () => {
        const cart = getCart();
        const idx = cart.findIndex((x) => x.item_id === id);
        if (idx < 0) return;

        const removed = cart[idx];
        const newCart = cart.filter((x) => x.item_id !== id);

        saveCart(newCart);

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

  document.addEventListener("DOMContentLoaded", () => render());
})();
