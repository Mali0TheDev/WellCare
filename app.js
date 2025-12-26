/* =====================================================
   WellCare - app.js (Unified)
   - Theme (dark/light)
   - Cart (localStorage) + MiniCart
   - Products (+) adds items
   - Products filter (AUTO): scroll chips + search + PRICE RANGE slider
   - Checkout page renders items + qty +/- + delete
   - Guidance accordion fixed (shows/hides description)
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

  // -------------------------
  // Theme
  // -------------------------
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
      const iconEl = $("#themeIcon");
      if (iconEl) iconEl.textContent = isDark ? "☀️" : "🌙";
      else btn.innerHTML = `${isDark ? "☀️" : "🌙"} <span>الوضع</span>`;
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

  // -------------------------
  // Cart Storage
  // -------------------------
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

  function clearCart() {
    saveCart([]);
    return [];
  }

  // -------------------------
  // MiniCart
  // -------------------------
  function openMiniCart() {
    const mini = $("#miniCart");
    if (!mini) return;
    mini.hidden = false;
  }

  function closeMiniCart() {
    const mini = $("#miniCart");
    if (!mini) return;
    mini.hidden = true;
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

  // -------------------------
  // Products (+)
  // -------------------------
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

  // =====================================================
  // Products Filter (AUTO)
  // - Chips Scroll
  // - Search
  // - Price Range Slider (cursor)
  // =====================================================
  function initProductsFilterAuto() {
    const addBtns = $$("button[data-add], [data-add]");
    if (addBtns.length === 0) return; // not products page

    // Build product cards list by nearest parent containing the add button
    const cardSet = new Set();
    addBtns.forEach((btn) => {
      const card =
        btn.closest(".product-card, .product, .card, article, li, .box") ||
        btn.closest("div") ||
        btn.parentElement;
      if (card) cardSet.add(card);
    });
    const cards = Array.from(cardSet);
    if (cards.length === 0) return;

    const firstCard = cards[0];
    const grid =
      firstCard.closest(".products-grid, .grid, .products, .productsContainer, .cards, .container") ||
      firstCard.parentElement;

    // Create / reuse UI
    let filterWrap = $("#productFilters");
    if (!filterWrap) {
      filterWrap = document.createElement("div");
      filterWrap.id = "productFilters";
      filterWrap.className = "filterBar";
    }

    let searchInput = $("#productSearch");
    if (!searchInput) {
      searchInput = document.createElement("input");
      searchInput.id = "productSearch";
      searchInput.type = "search";
      searchInput.placeholder = "ابحث عن منتج...";
      searchInput.className = "productSearch";
      searchInput.autocomplete = "off";
    }

    // --- Price Range UI (slider)
    let priceWrap = $("#priceFilterWrap");
    let priceRange = $("#priceRange");
    let priceValue = $("#priceValue");

    if (!priceWrap) {
      priceWrap = document.createElement("div");
      priceWrap.id = "priceFilterWrap";
      priceWrap.className = "priceFilterWrap";

      const label = document.createElement("div");
      label.className = "priceLabel";
      label.innerHTML = `<strong>السعر الأقصى:</strong> <span id="priceValue">—</span>`;

      priceRange = document.createElement("input");
      priceRange.type = "range";
      priceRange.id = "priceRange";
      priceRange.className = "priceRange";

      priceWrap.appendChild(label);
      priceWrap.appendChild(priceRange);

      // keep ref
      priceValue = $("#priceValue", priceWrap);
    }

    // Main UI container
    const uiContainer = document.createElement("div");
    uiContainer.className = "productsFilterUI";
    uiContainer.appendChild(filterWrap);
    uiContainer.appendChild(searchInput);
    uiContainer.appendChild(priceWrap);

    // Insert only if not already inserted
    if (!$("#productFilters")?.closest(".productsFilterUI")) {
      if (grid && grid.parentElement) grid.parentElement.insertBefore(uiContainer, grid);
      else firstCard.parentElement?.insertBefore(uiContainer, firstCard);
    }

    // Categories extraction
    const categories = new Set();

    function getCardCategoryList(card) {
      const list = [];

      const dataCat = card.dataset.category || card.dataset.cat;
      if (dataCat) list.push(...String(dataCat).split(",").map((x) => x.trim()).filter(Boolean));

      const tagEls = $$(".tag, .badge, .pill, .chip, [data-tag]", card);
      tagEls.forEach((t) => {
        const txt = t.textContent?.trim();
        if (!txt) return;
        if (txt.includes("د.ل")) return; // ignore prices
        if (txt === "+") return;
        list.push(txt);
      });

      return Array.from(new Set(list.map((x) => x.trim()).filter(Boolean)));
    }

    // Prices: read from button[data-add].dataset.price primarily
    function getCardPrice(card) {
      const btn = $("button[data-add], [data-add]", card);
      const p = btn?.dataset?.price;
      const num = Number(p);
      return Number.isFinite(num) ? num : 0;
    }

    cards.forEach((c) => {
      getCardCategoryList(c).forEach((cat) => categories.add(cat));
    });

    // Setup price slider min/max from products
    const prices = cards.map(getCardPrice).filter((p) => Number.isFinite(p) && p > 0);
    const minP = prices.length ? Math.min(...prices) : 0;
    const maxP = prices.length ? Math.max(...prices) : 0;

    // If no prices found, hide the slider (so you don't see useless UI)
    const canPrice = maxP > 0;
    priceWrap.style.display = canPrice ? "" : "none";

    if (canPrice) {
      priceRange.min = String(minP);
      priceRange.max = String(maxP);
      priceRange.step = "1";
      priceRange.value = String(maxP); // start showing all

      priceValue.textContent = `${maxP} د.ل`;
    }

    // Build chips
    filterWrap.innerHTML = "";

    const allChip = document.createElement("button");
    allChip.type = "button";
    allChip.className = "chip is-active";
    allChip.dataset.filter = "all";
    allChip.textContent = "الكل";
    filterWrap.appendChild(allChip);

    Array.from(categories)
      .sort((a, b) => a.localeCompare(b, "ar"))
      .forEach((cat) => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "chip";
        chip.dataset.filter = norm(cat);
        chip.textContent = cat;
        filterWrap.appendChild(chip);
      });

    let activeFilter = "all";
    let searchValue = "";
    let maxAllowedPrice = canPrice ? Number(priceRange.value) : Infinity;

    function cardText(card) {
      const btn = $("button[data-add], [data-add]", card);
      const dsName = btn?.dataset?.name || card.dataset.name || "";
      const dsTags = card.dataset.tags || "";
      return norm(`${dsName} ${dsTags} ${card.innerText || ""}`);
    }

    function cardHasCategory(card, filterNorm) {
      if (filterNorm === "all") return true;
      const list = getCardCategoryList(card).map(norm);
      if (list.includes(filterNorm)) return true;
      return cardText(card).includes(filterNorm);
    }

    function apply() {
      const f = norm(activeFilter || "all");
      const q = norm(searchValue);

      cards.forEach((card) => {
        const price = getCardPrice(card);

        const okFilter = cardHasCategory(card, f);
        const okSearch = q ? cardText(card).includes(q) : true;
        const okPrice = canPrice ? price <= maxAllowedPrice : true;

        card.style.display = okFilter && okSearch && okPrice ? "" : "none";
      });
    }

    // Chip events
    $$("[data-filter]", filterWrap).forEach((chip) => {
      chip.addEventListener("click", () => {
        $$("[data-filter]", filterWrap).forEach((c) => c.classList.remove("is-active"));
        chip.classList.add("is-active");
        activeFilter = chip.dataset.filter || "all";
        apply();
      });
    });

    // Search events
    searchInput.addEventListener("input", () => {
      searchValue = searchInput.value || "";
      apply();
    });

    // Range events
    if (canPrice) {
      const onRange = () => {
        maxAllowedPrice = Number(priceRange.value) || maxP;
        priceValue.textContent = `${maxAllowedPrice} د.ل`;
        apply();
      };
      priceRange.addEventListener("input", onRange);
      priceRange.addEventListener("change", onRange);
    }

    apply();
  }

  // -------------------------
  // Checkout Rendering
  // -------------------------
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

  // -------------------------
  // Guidance Accordion FIX ✅
  // (Shows/hides the description panel)
  // -------------------------
  function initAccordion() {
    const btns = $$(".accBtn, [data-acc-btn], .faqBtn, .toggleBtn");
    if (btns.length === 0) return;

    btns.forEach((btn) => {
      // Find panel:
      // - next element sibling
      // - OR common classes inside same parent/container
      const item = btn.closest(".accItem, .faqItem, .accordion-item, .guidanceItem") || btn.parentElement;
      let panel =
        (item && $(".accPanel, .accContent, .panel, .desc, .content", item)) ||
        btn.nextElementSibling;

      if (!panel) return;

      // Prepare default hidden state
      if (!btn.hasAttribute("aria-expanded")) btn.setAttribute("aria-expanded", "false");
      panel.classList.add("accPanel"); // ensure styling
      panel.style.overflow = "hidden";
      panel.style.maxHeight = "0px";
      panel.style.opacity = "0";
      panel.style.pointerEvents = "none";

      btn.addEventListener("click", () => {
        const isOpen = btn.getAttribute("aria-expanded") === "true";
        btn.setAttribute("aria-expanded", isOpen ? "false" : "true");

        if (isOpen) {
          // close
          panel.style.maxHeight = "0px";
          panel.style.opacity = "0";
          panel.style.pointerEvents = "none";
        } else {
          // open
          panel.style.pointerEvents = "auto";
          panel.style.opacity = "1";
          panel.style.maxHeight = panel.scrollHeight + "px";
        }
      });
    });
  }

  // -------------------------
  // Misc
  // -------------------------
  function initYear() {
    const y = $("#year");
    if (y) y.textContent = String(new Date().getFullYear());
  }

  // -------------------------
  // Boot
  // -------------------------
  document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    initYear();

    initMiniCartEvents();
    initAddButtons();

    // ✅ Products filtering + range
    initProductsFilterAuto();

    // ✅ Guidance fix
    initAccordion();

    renderMiniCart();
    renderCheckout();
  });
})();
