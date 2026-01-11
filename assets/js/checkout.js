/* =========================================================
   checkout.js — checkout simulé
   - Lit le panier
   - Affiche le récapitulatif
   - Envoie GA4: add_shipping_info, add_payment_info
   - Redirige vers success.html avec order_id
========================================================= */

(function () {
  "use strict";

  const CART_KEY = "ec_cart_v1";
  const ORDER_KEY = "ec_last_order_v1";

  // DOM
  const itemsEl = document.getElementById("checkoutItems");
  const subtotalEl = document.getElementById("subtotal");
  const shippingEl = document.getElementById("shipping");
  const totalEl = document.getElementById("total");

  const shippingForm = document.getElementById("shippingForm");
  const paymentForm = document.getElementById("paymentForm");
  const alertEl = document.getElementById("checkoutAlert");

  if (!itemsEl) return;

  function safeJSONParse(value, fallback) {
    try { return JSON.parse(value); } catch { return fallback; }
  }

  function getCart() {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? safeJSONParse(raw, []) : [];
  }

  function formatXOF(n) {
    const v = Number(n) || 0;
    return v.toLocaleString("fr-FR") + " FCFA";
  }

  function subtotal(cart) {
    return cart.reduce((sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 0), 0);
  }

  function shippingCost(sub) {
    if (sub === 0) return 0;
    return sub >= 25000 ? 0 : 1500;
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

  function showAlert(msg, type = "error") {
    alertEl.hidden = false;
    alertEl.className = `product__alert product__alert--${type}`;
    alertEl.textContent = msg;
  }

  function hideAlert() {
    alertEl.hidden = true;
    alertEl.textContent = "";
  }

  function renderSummary(cart) {
    itemsEl.innerHTML = cart.map((it) => `
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

    const sub = subtotal(cart);
    const ship = shippingCost(sub);
    const tot = sub + ship;

    subtotalEl.textContent = formatXOF(sub);
    shippingEl.textContent = formatXOF(ship);
    totalEl.textContent = formatXOF(tot);
  }

  function makeOrderId() {
    return `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(16).slice(2, 6).toUpperCase()}`;
  }

  function persistOrder(order) {
    localStorage.setItem(ORDER_KEY, JSON.stringify(order));
  }

  function escapeHtml(s) {
    return (s || "").replace(/[&<>"']/g, (m) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[m]));
  }

  // Init
  document.addEventListener("DOMContentLoaded", () => {
    hideAlert();

    const cart = getCart();
    if (!cart.length) {
      showAlert("Votre panier est vide. Retournez à la boutique pour ajouter des produits.", "error");
      // redirection douce
      setTimeout(() => { window.location.href = "shop.html"; }, 1200);
      return;
    }

    renderSummary(cart);

    // Livraison
    shippingForm.addEventListener("submit", (e) => {
      e.preventDefault();
      hideAlert();

      const form = new FormData(shippingForm);
      const shipping_tier = form.get("shippingMethod") || "standard";

      if (typeof window.track === "function") {
        window.track("add_shipping_info", {
          currency: "XOF",
          value: subtotal(cart),
          shipping_tier,
          items: toGAItems(cart)
        });
      }

      toast("Livraison validée ✅");
    });

    // Paiement (simulation) -> on prépare la commande puis redirection
    paymentForm.addEventListener("submit", (e) => {
      e.preventDefault();
      hideAlert();

      const cartNow = getCart();
      if (!cartNow.length) {
        showAlert("Votre panier est vide. Impossible de finaliser.", "error");
        return;
      }

      const sub = subtotal(cartNow);
      const ship = shippingCost(sub);
      const tot = sub + ship;

      const form = new FormData(paymentForm);
      const payment_type = form.get("paymentMethod") || "mobile_money";
      const coupon = (form.get("coupon") || "").toString().trim();

      // GA4: add_payment_info
      if (typeof window.track === "function") {
        window.track("add_payment_info", {
          currency: "XOF",
          value: sub,
          payment_type,
          coupon: coupon || undefined,
          items: toGAItems(cartNow)
        });
      }

      // On persiste une "commande" (pour success.html)
      const order = {
        transaction_id: makeOrderId(),
        currency: "XOF",
        subtotal: sub,
        shipping: ship,
        value: tot,
        coupon: coupon || null,
        payment_type,
        items: cartNow
      };
      persistOrder(order);

      // Redirection vers success (purchase sera envoyé là-bas)
      window.location.href = `success.html?order=${encodeURIComponent(order.transaction_id)}`;
    });
  });

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

})();
