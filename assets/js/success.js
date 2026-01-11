/* =========================================================
   success.js — page confirmation
   - Récupère la dernière commande (localStorage)
   - Envoie GA4: purchase
   - Vide le panier après envoi
========================================================= */

(function () {
  "use strict";

  const CART_KEY = "ec_cart_v1";
  const ORDER_KEY = "ec_last_order_v1";

  const cardEl = document.getElementById("successCard");
  if (!cardEl) return;

  function safeJSONParse(value, fallback) {
    try { return JSON.parse(value); } catch { return fallback; }
  }

  function formatXOF(n) {
    const v = Number(n) || 0;
    return v.toLocaleString("fr-FR") + " FCFA";
  }

  function getOrder() {
    const raw = localStorage.getItem(ORDER_KEY);
    return raw ? safeJSONParse(raw, null) : null;
  }

  function clearCart() {
    localStorage.setItem(CART_KEY, JSON.stringify([]));
    window.dispatchEvent(new Event("cart:updated"));
  }

  function toGAItems(items) {
    return (items || []).map((it) => ({
      item_id: it.item_id,
      item_name: it.item_name,
      item_category: it.item_category,
      price: Number(it.price) || 0,
      quantity: Number(it.quantity) || 0
    }));
  }

  function render(order) {
    const itemsHTML = (order.items || []).map((it) => `
      <div class="checkout-item">
        <div class="checkout-item__left">
          <p class="checkout-item__name">${escapeHtml(it.item_name || "")}</p>
          <p class="checkout-item__sub">${escapeHtml(it.item_category || "")} • Qté: ${Number(it.quantity) || 0}</p>
        </div>
        <div class="checkout-item__right">
          <strong>${formatXOF((Number(it.price) || 0) * (Number(it.quantity) || 0))}</strong>
        </div>
      </div>
    `).join("");

    cardEl.innerHTML = `
      <div class="success-row">
        <span>N° commande</span>
        <strong>${escapeHtml(order.transaction_id || "")}</strong>
      </div>
      <div class="success-row">
        <span>Paiement</span>
        <strong>${escapeHtml(order.payment_type || "—")}</strong>
      </div>
      ${order.coupon ? `
        <div class="success-row">
          <span>Coupon</span>
          <strong>${escapeHtml(order.coupon)}</strong>
        </div>
      ` : ""}

      <div class="success-items">
        ${itemsHTML}
      </div>

      <div class="success-row success-row--total">
        <span>Total</span>
        <strong>${formatXOF(order.value)}</strong>
      </div>
    `;
  }

  function escapeHtml(s) {
    return (s || "").replace(/[&<>"']/g, (m) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[m]));
  }

  document.addEventListener("DOMContentLoaded", () => {
    const order = getOrder();

    if (!order) {
      cardEl.innerHTML = `
        <div class="product__alert product__alert--error">
          Aucune commande trouvée. Retournez à la boutique.
        </div>
      `;
      return;
    }

    render(order);

    // GA4: purchase (simulation)
    if (typeof window.track === "function") {
      window.track("purchase", {
        transaction_id: order.transaction_id,
        currency: order.currency || "XOF",
        value: Number(order.value) || 0,
        shipping: Number(order.shipping) || 0,
        coupon: order.coupon || undefined,
        payment_type: order.payment_type || undefined,
        items: toGAItems(order.items)
      });
    }

    // On vide le panier après la "commande"
    clearCart();
  });

})();
