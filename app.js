/* =====================================================
   WellCare - app.js (Unified FINAL)
   - Theme (dark/light)
   - Cart (localStorage) + MiniCart
   - Products: Category DROPDOWN + Search + Price RANGE (compact)
   - Checkout: render + qty +/- + delete + THANK YOU popup
   - Guidance: accordion open/close (works even if panels had hidden)
===================================================== */

(() => {
  "use strict";

  const CART_KEY = "wellcare_cart_v1";
  const THEME_KEY = "wellcare_theme_v1";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clampInt = (n, min, max) => Math.max(min, Math.min(max, n));
  const norm = (s) =>
    String(s ?? "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ");

  /* -------------------------
     Theme
  ------------------------- */
  function getSavedTheme() {
    const t = localStorage.getItem(THEME_KEY);
    if (t === "dark" || t === "light") return t;
    return null;
  }

  function setTheme(theme) {
    const isDark = theme === "dark";
    document.body.classList.toggle("dark", isDark);
    localStorage.setItem(THEME_KEY, theme);

    const btn = $("#themeToggle");
    if (btn) {
      btn.setAttribute("aria-pressed", isDark ? "true" : "false");
      // keep your button text structure:
      btn.innerHTML = `${isDark ? "☀️" : "🌙"} <span>الوضع</span>`;
    }
  }

  function initTheme() {
    setTheme(getSavedTheme() || "dark");
    const btn = $("#themeToggle");
    if (!btn) return;

    btn.addEventListener("click", () => {
      const isDarkNow = document.body.classList.contains("dark");
      setTheme(isDarkNow ? "light" : "dark");
    });
  }

  /* -------------------------
     Cart Storage
  ------------------------- */
  function loadCart() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }

  function clearCart() {
    saveCart([]);
    return [];
  }

  function getCartCount(cart) {
    return cart.reduce((sum, it) => sum + (Number(it.qty) || 0), 0);
  }

  function getCartTotal(cart) {
    return cart.reduce((sum, it) => sum + (Number(it.qty) || 0) * (Number(it.price) || 0), 0);
  }

  function upsertCartItem({ name, price, img }, deltaQty = 1) {
    const cart = loadCart();
    const idx = cart.findIndex((x) => x.name === name);

    if (idx >= 0) {
      cart[idx].qty = clampInt((Number(cart[idx].qty) || 0) + deltaQty, 1, 999);
    } else {
      cart.push({
        name,
        price: Number(price) || 0,
        img: img || "",
        qty: clampInt(deltaQty, 1, 999),
      });
    }

    saveCart(cart);
    return cart;
  }

  function removeCartItem(index) {
    const cart = loadCart();
    if (index >= 0 && index < cart.length) cart.splice(index, 1);
    saveCart(cart);
    return cart;
  }

  /* -------------------------
     MiniCart UI
  ------------------------- */
  function openMiniCart() {
    const mini = $("#miniCart");
    if (mini) mini.hidden = false;
  }

  function closeMiniCart() {
    const mini = $("#miniCart");
    if (mini) mini.hidden = true;
  }

  function toggleMiniCart() {
    const mini = $("#miniCart");
    if (!mini) return;
    mini.hidden ? openMiniCart() : closeMiniCart();
  }

  function renderMiniCart() {
    const cart = loadCart();

    const badge = $("#cartCount");
    if (badge) badge.textContent = String(getCartCount(cart));

    const itemsEl = $("#miniCartItems");
    const totalEl = $("#miniCartTotal");

    if (totalEl) totalEl.textContent = `${getCartTotal(cart)} د.ل`;
    if (!itemsEl) return;

    if (cart.length === 0) {
      itemsEl.innerHTML = `<p style="text-align:center;opacity:.8;margin:10px 0;">السلة فارغة</p>`;
      return;
    }

    itemsEl.innerHTML = cart
      .map(
        (it, i) => `
        <div class="miniItem">
          <img src="${it.img}" alt="${it.name}">
          <div class="miniItem__info">
            <p class="miniItem__name">${it.name}</p>
            <div class="miniItem__price">${it.price} د.ل</div>
          </div>

          <div class="miniItem__qty">
            <button class="qtyBtn" data-mini-minus="${i}" type="button">-</button>
            <strong>${it.qty}</strong>
            <button class="qtyBtn" data-mini-plus="${i}" type="button">+</button>
          </div>

          <button class="removeBtn" title="حذف" data-mini-remove="${i}" type="button">🗑️</button>
        </div>
      `
      )
      .join("");

    $$("[data-mini-minus]", itemsEl).forEach((btn) => {
      btn.addEventListener("click", () => {
        const i = Number(btn.dataset.miniMinus);
        const cart2 = loadCart();
        if (!cart2[i]) return;
        cart2[i].qty = clampInt((Number(cart2[i].qty) || 1) - 1, 1, 999);
        saveCart(cart2);
        renderMiniCart();
        renderCheckout();
      });
    });

    $$("[data-mini-plus]", itemsEl).forEach((btn) => {
      btn.addEventListener("click", () => {
        const i = Number(btn.dataset.miniPlus);
        const cart2 = loadCart();
        if (!cart2[i]) return;
        cart2[i].qty = clampInt((Number(cart2[i].qty) || 1) + 1, 1, 999);
        saveCart(cart2);
        renderMiniCart();
        renderCheckout();
      });
    });

    $$("[data-mini-remove]", itemsEl).forEach((btn) => {
      btn.addEventListener("click", () => {
        const i = Number(btn.dataset.miniRemove);
        removeCartItem(i);
        renderMiniCart();
        renderCheckout();
      });
    });
  }

  function initMiniCartEvents() {
    const cartBtn = $("#cartBtn") || $("#cartCount")?.closest("button") || $("#cartCount")?.closest(".pill");
    if (cartBtn) {
      cartBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleMiniCart();
      });
    }

    const closeBtn = $("#closeMiniCart");
    if (closeBtn) closeBtn.addEventListener("click", closeMiniCart);

    const clearBtn = $("#clearCart");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        clearCart();
        renderMiniCart();
        renderCheckout();
      });
    }

    document.addEventListener("click", (e) => {
      const mini = $("#miniCart");
      if (!mini || mini.hidden) return;

      const inside = mini.contains(e.target);
      const trigger = $("#cartBtn") || $("#cartCount")?.closest("button") || $("#cartCount")?.closest(".pill");
      const isTrigger = trigger ? trigger.contains(e.target) : false;

      if (!inside && !isTrigger) closeMiniCart();
    });
  }

  /* -------------------------
     Products: Add Buttons
  ------------------------- */
  function initAddButtons() {
    $$("[data-add]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const name = btn.dataset.name || "منتج";
        const price = Number(btn.dataset.price || 0);
        const img = btn.dataset.img || "";
        upsertCartItem({ name, price, img }, 1);
        renderMiniCart();
        openMiniCart();
      });
    });
  }

  /* =====================================================
     Products Filters (Dropdown + Search + Range)
     Requirements:
     - HTML elements exist:
       #categorySelect, #productSearch, #priceRange, #priceValue, #priceFilterWrap
     - If not present, we create them automatically and insert above the grid.
  ===================================================== */
  function initProductsFilters() {
    const addBtns = $$("[data-add]");
    if (addBtns.length === 0) return; // not products page

    // cards are .product-card in your products.html
    const cards = Array.from(new Set(addBtns.map((b) => b.closest(".product-card")).filter(Boolean)));
    if (cards.length === 0) return;

    const firstCard = cards[0];
    const grid =
      firstCard.closest(".grid, .products-grid, .products, .cards, .container") || firstCard.parentElement;

    // ensure UI container exists
    let ui = $(".productsFilters");
    if (!ui) {
      ui = document.createElement("div");
      ui.className = "productsFilters";
      ui.innerHTML = `
        <div class="filtersRow">
          <select id="categorySelect" class="filterSelect">
            <option value="all">الكل</option>
          </select>

          <input id="productSearch" class="productSearch" type="search"
                 placeholder="ابحث عن منتج..." autocomplete="off" />
        </div>

        <div class="priceFilterWrap" id="priceFilterWrap">
          <div class="priceLabel">
            <strong>السعر الأقصى:</strong>
            <span id="priceValue">—</span>
          </div>
          <input id="priceRange" class="priceRange" type="range" />
        </div>
      `;
      if (grid && grid.parentElement) grid.parentElement.insertBefore(ui, grid);
      else firstCard.parentElement?.insertBefore(ui, firstCard);
    }

    const categorySelect = $("#categorySelect");
    const searchInput = $("#productSearch");
    const priceWrap = $("#priceFilterWrap");
    const priceRange = $("#priceRange");
    const priceValue = $("#priceValue");

    // Extract categories from each card's .chip spans (your file uses spans)
    const categories = new Set();

    function getCardCategories(card) {
      const chips = $$(".chip", card)
        .map((c) => (c.textContent || "").trim())
        .filter(Boolean)
        .filter((t) => !t.includes("د.ل") && t !== "+");
      return Array.from(new Set(chips));
    }

    cards.forEach((card) => {
      getCardCategories(card).forEach((cat) => categories.add(cat));
    });

    // Fill dropdown once
    if (categorySelect) {
      while (categorySelect.options.length > 1) categorySelect.remove(1);
      Array.from(categories)
        .sort((a, b) => a.localeCompare(b, "ar"))
        .forEach((cat) => {
          const opt = document.createElement("option");
          opt.value = norm(cat);
          opt.textContent = cat;
          categorySelect.appendChild(opt);
        });
    }

    function getPrice(card) {
      const btn = $("[data-add]", card);
      const p = Number(btn?.dataset?.price);
      return Number.isFinite(p) ? p : 0;
    }

    const prices = cards.map(getPrice).filter((p) => p > 0);
    const minP = prices.length ? Math.min(...prices) : 0;
    const maxP = prices.length ? Math.max(...prices) : 0;

    let maxAllowed = maxP > 0 ? maxP : Infinity;

    // setup range
    if (priceRange && maxP > 0) {
      priceWrap.style.display = "";
      priceRange.min = String(minP);
      priceRange.max = String(maxP);
      priceRange.step = "1";
      priceRange.value = String(maxP);
      maxAllowed = maxP;
      if (priceValue) priceValue.textContent = `${maxP} د.ل`;
    } else if (priceWrap) {
      priceWrap.style.display = "none";
    }
  
    function cardText(card) {
      const btn = $("[data-add]", card);
      const name = btn?.dataset?.name || "";
      return norm(`${name} ${card.innerText || ""}`);
    }

    function apply() {
      const cat = categorySelect ? norm(categorySelect.value || "all") : "all";
      const q = searchInput ? norm(searchInput.value || "") : "";

      cards.forEach((card) => {
        const cats = getCardCategories(card).map(norm);
        const price = getPrice(card);

        const okCat = cat === "all" ? true : cats.includes(cat);
        const okSearch = q ? cardText(card).includes(q) : true;
        const okPrice = maxP > 0 ? price <= maxAllowed : true;

        card.style.display = okCat && okSearch && okPrice ? "" : "none";
      });
    }

    if (categorySelect) categorySelect.addEventListener("change", apply);
    if (searchInput) searchInput.addEventListener("input", apply);

    if (priceRange && maxP > 0) {
      const onRange = () => {
        maxAllowed = Number(priceRange.value) || maxP;
        if (priceValue) priceValue.textContent = `${maxAllowed} د.ل`;
        apply();
      };
      priceRange.addEventListener("input", onRange);
      priceRange.addEventListener("change", onRange);
    }

    apply();
  }

  /* -------------------------
     Checkout Rendering
  ------------------------- */
  function renderCheckout() {
    const itemsWrap = $("#checkoutItems");
    if (!itemsWrap) return;

    const cart = loadCart();
    const countEl = $("#checkoutCount");
    const totalEl = $("#checkoutTotal");
    const hintEl = $("#checkoutHint");

    if (countEl) countEl.textContent = String(getCartCount(cart));
    if (totalEl) totalEl.textContent = `${getCartTotal(cart)} د.ل`;

    if (cart.length === 0) {
      itemsWrap.innerHTML = `<p class="muted" style="text-align:center;margin:16px 0;">السلة فارغة</p>`;
      if (hintEl) hintEl.textContent = "أضف منتجات من صفحة المنتجات عبر زر (+).";
      return;
    }

    if (hintEl) hintEl.textContent = "يمكنك تعديل الكمية أو الحذف ثم تأكيد الشراء.";

    itemsWrap.innerHTML = cart
      .map(
        (it, i) => `
        <div class="ckItem" style="display:flex;gap:14px;align-items:center;padding:12px;border:1px solid var(--border);border-radius:14px;margin-bottom:10px;background:color-mix(in oklab, var(--card) 92%, transparent);">
          <img src="${it.img}" alt="${it.name}" style="width:64px;height:64px;border-radius:12px;object-fit:cover;border:1px solid var(--border);" />
          <div style="flex:1;min-width:0;">
            <strong style="display:block;margin-bottom:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${it.name}</strong>
            <span class="muted">${it.price} د.ل</span>
          </div>

          <div style="display:flex;align-items:center;gap:8px;">
            <button type="button" class="btn" data-ck-minus="${i}" style="padding:8px 12px;border-radius:12px;">-</button>
            <strong style="min-width:26px;text-align:center;">${it.qty}</strong>
            <button type="button" class="btn" data-ck-plus="${i}" style="padding:8px 12px;border-radius:12px;">+</button>
          </div>

          <button type="button" class="btn" data-ck-remove="${i}" title="حذف" style="padding:8px 12px;border-radius:12px;">🗑️</button>
        </div>
      `
      )
      .join("");

    $$("[data-ck-minus]", itemsWrap).forEach((btn) => {
      btn.addEventListener("click", () => {
        const i = Number(btn.dataset.ckMinus);
        const cart2 = loadCart();
        if (!cart2[i]) return;
        cart2[i].qty = clampInt((Number(cart2[i].qty) || 1) - 1, 1, 999);
        saveCart(cart2);
        renderMiniCart();
        renderCheckout();
      });
    });

    $$("[data-ck-plus]", itemsWrap).forEach((btn) => {
      btn.addEventListener("click", () => {
        const i = Number(btn.dataset.ckPlus);
        const cart2 = loadCart();
        if (!cart2[i]) return;
        cart2[i].qty = clampInt((Number(cart2[i].qty) || 1) + 1, 1, 999);
        saveCart(cart2);
        renderMiniCart();
        renderCheckout();
      });
    });

    $$("[data-ck-remove]", itemsWrap).forEach((btn) => {
      btn.addEventListener("click", () => {
        const i = Number(btn.dataset.ckRemove);
        removeCartItem(i);
        renderMiniCart();
        renderCheckout();
      });
    });
  }

  /* -------------------------
     Thank You Popup
  ------------------------- */
  function showThankYou() {
    const box = $("#thankYou");
    if (!box) return;
    box.hidden = false;

    const card = $(".thankYou__card", box);
    if (card) {
      try {
        card.animate(
          [
            { transform: "translateY(10px) scale(0.98)", opacity: 0 },
            { transform: "translateY(0) scale(1)", opacity: 1 },
          ],
          { duration: 280, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" }
        );
      } catch {}
    }
  }

  function hideThankYou() {
    const box = $("#thankYou");
    if (!box) return;
    box.hidden = true;
  }

  function initCheckoutEvents() {
    const confirmBtn = $("#confirmPurchase");
    const closeBtn = $("#closeThankYou");
    const clearBtn = $("#clearCartCheckout");
    const box = $("#thankYou");

    if (confirmBtn) {
      confirmBtn.addEventListener("click", (e) => {
        e.preventDefault();
        const cart = loadCart();
        if (cart.length === 0) return;

        showThankYou();
        clearCart();
        renderMiniCart();
        renderCheckout();
      });
    }

    if (closeBtn) closeBtn.addEventListener("click", hideThankYou);

    // click outside the card closes
    if (box) {
      box.addEventListener("click", (e) => {
        const card = $(".thankYou__card", box);
        if (card && !card.contains(e.target)) hideThankYou();
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener("click", (e) => {
        e.preventDefault();
        clearCart();
        renderMiniCart();
        renderCheckout();
      });
    }
  }

  /* -------------------------
     Guidance Accordion (works even if panels used hidden)
  ------------------------- */
  function initAccordion() {
    const btns = $$(".accBtn, [data-acc-btn], .faqBtn, .toggleBtn");
    if (btns.length === 0) return;

    btns.forEach((btn) => {
      const item = btn.closest(".accItem, .faqItem, .accordion-item, .guidanceItem") || btn.parentElement;
      let panel =
        (item && $(".accPanel, .accContent, .panel, .desc, .content", item)) || btn.nextElementSibling;

      if (!panel) return;

      // if HTML had hidden attribute, remove it so animation works
      if (panel.hasAttribute("hidden")) panel.removeAttribute("hidden");

      if (!btn.hasAttribute("aria-expanded")) btn.setAttribute("aria-expanded", "false");

      panel.classList.add("accPanel");
      panel.style.overflow = "hidden";
      panel.style.maxHeight = "0px";
      panel.style.opacity = "0";
      panel.style.pointerEvents = "none";

      btn.addEventListener("click", () => {
        const isOpen = btn.getAttribute("aria-expanded") === "true";
        btn.setAttribute("aria-expanded", isOpen ? "false" : "true");

        if (isOpen) {
          panel.style.maxHeight = "0px";
          panel.style.opacity = "0";
          panel.style.pointerEvents = "none";
        } else {
          panel.style.pointerEvents = "auto";
          panel.style.opacity = "1";
          panel.style.maxHeight = panel.scrollHeight + "px";
        }
      });
    });
  }

  /* -------------------------
     Misc
  ------------------------- */
 

  /* -------------------------
     Boot
  ------------------------- */
  document.addEventListener("DOMContentLoaded", () => {
    initTheme();
   

    initMiniCartEvents();
    initAddButtons();

    // Products
    initProductsFilters();


    // Guidance
    initAccordion();

    // Checkout
    initCheckoutEvents();

    // initial renders
    renderMiniCart();
    renderCheckout();
  });
})();
