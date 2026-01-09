# E-commerce (Practice) — Statistics & Web Analytics with Google Analytics 4

Mini site e-commerce **pédagogique** conçu pour pratiquer :
- la **collecte de données web** (événements, conversions, funnels),
- l’analyse dans **Google Analytics 4 (GA4)**,
- et/ou l’implémentation via **Google Tag Manager (GTM)**.

> ⚠️ Ce projet ne vise pas à encaisser de paiements réels. Le “checkout” et la “purchase” sont **simulés** afin de générer des données d’analyse.

---

## 🎯 Objectifs pédagogiques

À la fin de ce projet, l’étudiant(e) doit être capable de :
1. Comprendre le parcours client (catalogue → produit → panier → checkout → achat).
2. Instrumenter un site avec des **événements GA4**.
3. Construire un **entonnoir de conversion** dans GA4.
4. Mesurer : taux de conversion, panier moyen, revenus simulés, pages/produits performants.
5. Segmenter et comparer des comportements : nouveaux vs anciens, mobile vs desktop, sources de trafic, etc.

---

## ✅ Fonctionnalités

### Pages
- `index.html` : accueil, promos, best sellers
- `shop.html` : catalogue (liste produits)
- `product.html` : fiche produit
- `cart.html` : panier (localStorage)
- `checkout.html` : checkout simulé (infos livraison/paiement)
- `success.html` : confirmation commande (événement purchase)

### E-commerce data (simulée)
- Produits chargés depuis `data/products.json`
- Panier stocké dans `localStorage`
- Total, quantité, coupon (optionnel)

---

## 📊 Événements GA4 (E-commerce)

Ce site vise à envoyer les événements recommandés GA4 :

- `view_item_list` : affichage du catalogue
- `select_item` : clic sur un produit depuis la liste
- `view_item` : affichage d’une fiche produit
- `add_to_cart` : ajout au panier
- `remove_from_cart` : suppression du panier
- `view_cart` : affichage du panier
- `begin_checkout` : début checkout
- `add_shipping_info` : validation livraison (simulé)
- `add_payment_info` : validation paiement (simulé)
- `purchase` : achat simulé (sur `success.html`)

> Les paramètres GA4 standards à inclure :  
`currency`, `value`, `items[]` (item_id, item_name, item_category, price, quantity), `transaction_id`.

---

## 🧱 Structure du projet

```text
e-commerce/
├─ index.html
├─ shop.html
├─ product.html
├─ cart.html
├─ checkout.html
├─ success.html
├─ assets/
│ ├─ css/
│ │ ├─ style.css
│ │ └─ components.css
│ ├─ js/
│ │ ├─ app.js
│ │ ├─ products.js
│ │ ├─ product-page.js
│ │ ├─ cart.js
│ │ ├─ checkout.js
│ │ └─ analytics.js
│ └─ img/
├─ data/
│ └─ products.json
└─ README.md
```

