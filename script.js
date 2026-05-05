(function () {
  "use strict";

  var STORAGE_KEY = "stride-cart-demo-v1";

  var cartToggle = document.getElementById("cartToggle");
  var cartClose = document.getElementById("cartClose");
  var cartPanel = document.getElementById("cartPanel");
  var cartBackdrop = document.getElementById("cartBackdrop");
  var cartList = document.getElementById("cartList");
  var cartEmpty = document.getElementById("cartEmpty");
  var cartTotal = document.getElementById("cartTotal");
  var cartBadge = document.getElementById("cartBadge");
  var checkoutBtn = document.getElementById("checkoutBtn");
  var toast = document.getElementById("toast");

  /** @type {{ id: string, name: string, price: number, image: string, qty: number }[]} */
  var cart = loadCart();

  function loadCart() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function saveCart() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
      /* ignore */
    }
  }

  function formatMoney(n) {
    return (
      "S/. " +
      n.toLocaleString("es-PE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }

  function getCardFromButton(btn) {
    var card = btn.closest(".card");
    if (!card) return null;
    var id = card.getAttribute("data-id");
    var nameEl = card.querySelector(".card__name");
    var priceEl = card.querySelector(".card__price");
    var imgEl = card.querySelector(".card__img");
    if (!id || !nameEl || !priceEl || !imgEl) return null;
    var price = parseFloat(priceEl.getAttribute("data-price"));
    if (isNaN(price)) return null;
    return {
      id: id,
      name: nameEl.textContent.trim(),
      price: price,
      image: imgEl.getAttribute("src") || "",
    };
  }

  function addToCart(item) {
    var existing = cart.find(function (line) {
      return line.id === item.id;
    });
    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({
        id: item.id,
        name: item.name,
        price: item.price,
        image: item.image,
        qty: 1,
      });
    }
    saveCart();
    renderCart();
    showToast("Añadido: " + item.name);
  }

  function setQty(id, qty) {
    var line = cart.find(function (l) {
      return l.id === id;
    });
    if (!line) return;
    line.qty = Math.max(0, qty);
    if (line.qty === 0) {
      cart = cart.filter(function (l) {
        return l.id !== id;
      });
    }
    saveCart();
    renderCart();
  }

  function removeLine(id) {
    cart = cart.filter(function (l) {
      return l.id !== id;
    });
    saveCart();
    renderCart();
  }

  function renderCart() {
    cartList.innerHTML = "";
    var count = 0;
    var subtotal = 0;

    cart.forEach(function (line) {
      count += line.qty;
      subtotal += line.price * line.qty;

      var li = document.createElement("li");
      li.className = "cart-item";
      li.innerHTML =
        '<img class="cart-item__img" src="" alt="" />' +
        '<div class="cart-item__info">' +
        '<p class="cart-item__name"></p>' +
        '<p class="cart-item__price"></p>' +
        "</div>" +
        '<div class="cart-item__controls">' +
        '<div class="cart-item__qty">' +
        '<button type="button" aria-label="Menos">−</button>' +
        "<span></span>" +
        '<button type="button" aria-label="Más">+</button>' +
        "</div>" +
        '<button type="button" class="cart-item__remove">Quitar</button>' +
        "</div>";

      var img = li.querySelector(".cart-item__img");
      img.src = line.image;
      img.alt = line.name;

      li.querySelector(".cart-item__name").textContent = line.name;
      li.querySelector(".cart-item__price").textContent =
        formatMoney(line.price) + " × " + line.qty;

      var qtySpan = li.querySelector(".cart-item__qty span");
      qtySpan.textContent = String(line.qty);

      var minus = li.querySelector(".cart-item__qty button:first-of-type");
      var plus = li.querySelector(".cart-item__qty button:last-of-type");
      minus.addEventListener("click", function () {
        setQty(line.id, line.qty - 1);
      });
      plus.addEventListener("click", function () {
        setQty(line.id, line.qty + 1);
      });

      li.querySelector(".cart-item__remove").addEventListener("click", function () {
        removeLine(line.id);
      });

      cartList.appendChild(li);
    });

    cartTotal.textContent = formatMoney(subtotal);
    checkoutBtn.disabled = cart.length === 0;

    if (cart.length === 0) {
      cartEmpty.hidden = false;
    } else {
      cartEmpty.hidden = true;
    }

    if (count > 0) {
      cartBadge.hidden = false;
      cartBadge.textContent = count > 99 ? "99+" : String(count);
    } else {
      cartBadge.hidden = true;
    }
  }

  function openCart() {
    cartPanel.classList.add("is-open");
    cartBackdrop.classList.add("is-open");
    cartBackdrop.hidden = false;
    cartPanel.setAttribute("aria-hidden", "false");
    cartToggle.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
  }

  function closeCart() {
    cartPanel.classList.remove("is-open");
    cartBackdrop.classList.remove("is-open");
    cartBackdrop.hidden = true;
    cartPanel.setAttribute("aria-hidden", "true");
    cartToggle.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  }

  function showToast(msg) {
    toast.textContent = msg;
    toast.hidden = false;
    toast.classList.add("is-visible");
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(function () {
      toast.classList.remove("is-visible");
      window.setTimeout(function () {
        toast.hidden = true;
      }, 400);
    }, 2200);
  }

  document.querySelectorAll(".js-add-cart").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var data = getCardFromButton(btn);
      if (!data) return;
      addToCart(data);
      openCart();
    });
  });

  if (cartToggle) {
    cartToggle.addEventListener("click", function () {
      if (cartPanel.classList.contains("is-open")) {
        closeCart();
      } else {
        openCart();
      }
    });
  }

  if (cartClose) cartClose.addEventListener("click", closeCart);
  if (cartBackdrop) cartBackdrop.addEventListener("click", closeCart);

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && cartPanel.classList.contains("is-open")) {
      closeCart();
    }
  });

  if (checkoutBtn) {
    checkoutBtn.addEventListener("click", function () {
      if (checkoutBtn.disabled) return;
      var totalText = cartTotal.textContent;
      cart = [];
      saveCart();
      renderCart();
      closeCart();
      window.alert(
        "¡Gracias por tu compra de demostración!\n\n" +
          "Total simulado: " +
          totalText +
          "\n\nNo se ha cobrado nada; esto es solo una práctica de carrito."
      );
    });
  }

  renderCart();
})();
