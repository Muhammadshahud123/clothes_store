/* =========================================================
   Clothes Store — main.js  (JavaScript + jQuery)
   Features: sticky navbar, cart (localStorage), wishlist,
   filter/search/sort, quick view, countdown, counters,
   form validation, scroll reveal, back-to-top
   ========================================================= */
$(function () {
  'use strict';

  /* ---------- Helpers ---------- */
  var CART_KEY = 'cs_cart_v1', WISH_KEY = 'cs_wish_v1';
  var PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="700"><rect width="100%" height="100%" fill="#f1ece3"/>' +
    '<text x="50%" y="50%" fill="#b4a98f" font-family="Georgia" font-size="28" text-anchor="middle">Clothes Store</text></svg>');

  function load(key) { try { return JSON.parse(localStorage.getItem(key)) || []; } catch (e) { return []; } }
  function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* private mode */ } }
  function money(n) { return 'Rs. ' + Number(n).toLocaleString('en-PK'); }
  function esc(s) { return $('<div>').text(s).html(); }

  /* Agar koi image load na ho to placeholder lagao */
  function fixImages(ctx) {
    $('img', ctx || document).each(function () {
      $(this).off('error.fb').on('error.fb', function () { if (this.src !== PLACEHOLDER) { this.src = PLACEHOLDER; } });
    });
  }
  // Jo images load hone se pehle hi fail ho chuki thin, unhe load ke baad check karo
  $(window).on('load', function () {
    $('img').each(function () {
      if (this.complete && this.naturalWidth === 0 && this.src !== PLACEHOLDER) { this.src = PLACEHOLDER; }
    });
  });
  fixImages();

  // Local image pehle dikhao; agar asli photo (data-photo) load ho jaye to usay lagao
  $('img[data-photo]').each(function () {
    var img = this, base = $(img).attr('data-local'), list = [];
    ['jpg', 'jpeg', 'png', 'webp'].forEach(function (x) { list.push(base + '.' + x); });  // apni photo: images/jacket.jpg
    list.push($(img).attr('data-photo'));                                                 // phir purana online link
    (function tryNext(i) {
      if (i >= list.length) { return; }
      var probe = new Image(); probe.referrerPolicy = 'no-referrer';
      probe.onload = function () { if (probe.naturalWidth > 50) { img.src = list[i]; } else { tryNext(i + 1); } };
      probe.onerror = function () { tryNext(i + 1); };
      probe.src = list[i];
    })(0);
  });

  function toast(msg, icon) {
    var $wrap = $('.toast-wrap');
    var $t = $('<div class="mini-toast" role="status"><i class="bi ' + (icon || 'bi-check-circle-fill') + '"></i><span></span></div>');
    $t.find('span').text(msg);
    $wrap.append($t);
    setTimeout(function () { $t.fadeOut(300, function () { $t.remove(); }); }, 2400);
  }

  /* ---------- Shared UI injected on every page ---------- */
  $('body').append(
    '<div class="toast-wrap" aria-live="polite"></div>' +
    '<button id="backTop" aria-label="Back to top"><i class="bi bi-arrow-up"></i></button>' +
    '<div class="offcanvas offcanvas-end cart-panel" tabindex="-1" id="cartPanel" aria-labelledby="cartTitle">' +
    '  <div class="offcanvas-header"><h5 class="offcanvas-title" id="cartTitle">Your Cart <span class="text-muted fs-6" id="cartCountText"></span></h5>' +
    '  <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button></div>' +
    '  <div class="offcanvas-body pt-0" id="cartItems"></div>' +
    '  <div class="cart-foot" id="cartFoot">' +
    '    <div class="d-flex justify-content-between mb-1"><span class="text-muted">Subtotal</span><strong id="cartSub">Rs. 0</strong></div>' +
    '    <div class="d-flex justify-content-between mb-3"><span class="text-muted">Delivery</span><strong id="cartShip">Rs. 0</strong></div>' +
    '    <div class="d-flex justify-content-between mb-3 fs-5"><span class="brand-font">Total</span><strong id="cartTotal">Rs. 0</strong></div>' +
    '    <button class="btn btn-accent w-100 py-2" id="checkoutBtn">Checkout <i class="bi bi-arrow-right ms-1"></i></button>' +
    '    <button class="btn btn-link w-100 text-muted mt-1 small" id="clearCart">Clear cart</button>' +
    '  </div>' +
    '</div>'
  );

  /* ---------- Navbar: shrink on scroll + back to top ---------- */
  var $nav = $('.site-nav'), $top = $('#backTop');
  function onScroll() {
    var y = $(window).scrollTop();
    $nav.toggleClass('scrolled', y > 30);
    y > 400 ? $top.css('display', 'grid').hide().fadeIn(0) : $top.hide();
  }
  $(window).on('scroll', onScroll); onScroll();
  $top.on('click', function () { $('html, body').animate({ scrollTop: 0 }, 500); });

  /* ---------- Scroll reveal ---------- */
  var $rev = $('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { $(e.target).addClass('in'); io.unobserve(e.target); } });
    }, { threshold: .12 });
    $rev.each(function () { io.observe(this); });
  } else { $rev.addClass('in'); }

  /* =====================================================
     CART
     ===================================================== */
  var cart = load(CART_KEY);
  var FREE_SHIP = 5000, SHIP_FEE = 250;

  function renderCart() {
    var $list = $('#cartItems').empty(), count = 0, sub = 0;
    cart.forEach(function (it) {
      count += it.qty; sub += it.qty * it.price;
      $list.append(
        '<div class="cart-item" data-id="' + esc(it.id) + '">' +
        '<img src="' + esc(it.img) + '" alt="' + esc(it.name) + '">' +
        '<div class="info"><h6>' + esc(it.name) + '</h6>' +
        '<div class="text-muted small mb-2">' + money(it.price) + '</div>' +
        '<div class="qty"><button class="q-minus" aria-label="Decrease">−</button><span>' + it.qty + '</span><button class="q-plus" aria-label="Increase">+</button></div></div>' +
        '<div class="text-end d-flex flex-column justify-content-between"><button class="remove-item" aria-label="Remove"><i class="bi bi-trash3"></i></button>' +
        '<strong class="small">' + money(it.qty * it.price) + '</strong></div></div>');
    });
    if (!cart.length) {
      $list.html('<div class="cart-empty"><i class="bi bi-bag"></i><p class="mt-3 mb-1 brand-font fs-5">Your cart is empty</p><p class="small">Add something you love.</p></div>');
    }
    var ship = (sub === 0 || sub >= FREE_SHIP) ? 0 : SHIP_FEE;
    $('#cartSub').text(money(sub));
    $('#cartShip').text(sub === 0 ? '—' : (ship === 0 ? 'Free' : money(ship)));
    $('#cartTotal').text(money(sub + ship));
    $('#cartCountText').text(count ? '(' + count + ' item' + (count > 1 ? 's' : '') + ')' : '');
    $('#cartFoot').toggle(cart.length > 0);
    $('.cart-badge').text(count).toggle(count > 0);
    fixImages($list);
  }

  function addToCart(p, qty) {
    var found = cart.filter(function (c) { return c.id === p.id; })[0];
    if (found) { found.qty += qty; } else { cart.push({ id: p.id, name: p.name, price: p.price, img: p.img, qty: qty }); }
    save(CART_KEY, cart); renderCart();
    $('.cart-badge').removeClass('bump'); void $('.cart-badge')[0] && $('.cart-badge')[0].offsetWidth; $('.cart-badge').addClass('bump');
    toast(p.name + ' added to cart', 'bi-bag-check-fill');
  }

  $('#cartItems').on('click', '.q-plus, .q-minus, .remove-item', function () {
    var id = String($(this).closest('.cart-item').data('id'));
    var item = cart.filter(function (c) { return c.id === id; })[0];
    if (!item) { return; }
    if ($(this).hasClass('q-plus')) { item.qty++; }
    else if ($(this).hasClass('q-minus')) { item.qty--; }
    else { item.qty = 0; }
    cart = cart.filter(function (c) { return c.qty > 0; });
    save(CART_KEY, cart); renderCart();
  });
  $('#clearCart').on('click', function () { cart = []; save(CART_KEY, cart); renderCart(); });
  $('#checkoutBtn').on('click', function () {
    cart = []; save(CART_KEY, cart); renderCart();
    bootstrap.Offcanvas.getOrCreateInstance('#cartPanel').hide();
    toast('Order placed! Thank you for shopping with us.', 'bi-stars');
  });
  renderCart();

  /* =====================================================
     PRODUCTS (index page only)
     ===================================================== */
  var $grid = $('#productGrid');
  if ($grid.length) {
    var $cols = $grid.find('.product-col'), activeCat = 'all', query = '', sortBy = 'featured';
    var wish = load(WISH_KEY);

    function prod($col) {
      return { id: String($col.data('id')), name: $col.data('name'), price: Number($col.data('price')),
               img: $col.find('.product-media img').attr('src'), cat: $col.data('cat'),
               desc: $col.find('.product-desc').text(), old: $col.data('old') };
    }

    // wishlist state
    $cols.each(function () {
      if (wish.indexOf(String($(this).data('id'))) > -1) { $(this).find('.wish-btn').addClass('active'); }
    });
    $grid.on('click', '.wish-btn', function () {
      var id = String($(this).closest('.product-col').data('id')), i = wish.indexOf(id);
      if (i > -1) { wish.splice(i, 1); $(this).removeClass('active'); toast('Removed from wishlist', 'bi-heart'); }
      else { wish.push(id); $(this).addClass('active'); toast('Saved to wishlist', 'bi-heart-fill'); }
      save(WISH_KEY, wish);
    });

    // add to cart
    $grid.on('click', '.add-cart', function () { addToCart(prod($(this).closest('.product-col')), 1); });

    // filter + search + sort
    function applyFilters() {
      var q = query.trim().toLowerCase(), shown = 0;
      $cols.each(function () {
        var $c = $(this), hay = ($c.data('name') + ' ' + $c.data('cat') + ' ' + $c.find('.product-desc').text()).toLowerCase();
        var ok = (activeCat === 'all' || $c.data('cat') === activeCat) && (!q || hay.indexOf(q) > -1);
        if (ok) { shown++; $c.stop(true, true).css({ opacity: 0, transform: 'translateY(18px)' }).show();
                  (function (el, n) { setTimeout(function () { el.css({ opacity: 1, transform: 'none' }); }, 30 + n * 45); })($c, shown); }
        else { $c.hide(); }
      });
      $('#emptyState').toggle(shown === 0);
      $('#resultCount').text(shown + (shown === 1 ? ' product' : ' products'));
    }
    function applySort() {
      var arr = $cols.get();
      arr.sort(function (a, b) {
        var pa = $(a).data('price'), pb = $(b).data('price');
        if (sortBy === 'low') { return pa - pb; }
        if (sortBy === 'high') { return pb - pa; }
        return $(a).data('order') - $(b).data('order');
      });
      $grid.append(arr);
    }

    $('.filter-pill').on('click', function () {
      activeCat = $(this).data('filter');
      $('.filter-pill').removeClass('active').attr('aria-pressed', 'false');
      $(this).addClass('active').attr('aria-pressed', 'true');
      applyFilters();
    });
    $('#sortSelect').on('change', function () { sortBy = this.value; applySort(); applyFilters(); });
    $('.nav-search input').on('input', function () { query = this.value; applyFilters(); });
    $('.nav-search').on('submit', function (e) {
      e.preventDefault(); applyFilters();
      $('html, body').animate({ scrollTop: $('#shop').offset().top - 80 }, 500);
    });
    $('#resetFilters').on('click', function () {
      query = ''; $('.nav-search input').val(''); $('.filter-pill[data-filter="all"]').trigger('click');
    });

    // category tiles + navbar dropdown on same page
    $(document).on('click', 'a[data-go-cat]', function (e) {
      e.preventDefault();
      var cat = $(this).data('go-cat');
      $('.filter-pill[data-filter="' + cat + '"]').trigger('click');
      $('html, body').animate({ scrollTop: $('#shop').offset().top - 80 }, 500);
    });

    // URL params from other pages: index.html?cat=jeans&q=shirt
    var params = new URLSearchParams(location.search);
    if (params.get('q')) { query = params.get('q'); $('.nav-search input').val(query); }
    if (params.get('cat')) { $('.filter-pill[data-filter="' + params.get('cat') + '"]').trigger('click'); }
    else { applyFilters(); }
    if (params.get('cat') || params.get('q')) {
      setTimeout(function () { $('html, body').animate({ scrollTop: $('#shop').offset().top - 80 }, 400); }, 300);
    }

    // quick view
    var qvProduct = null, qvModal = null;
    $grid.on('click', '.quick-btn', function () {
      var p = qvProduct = prod($(this).closest('.product-col'));
      $('#qvImg').attr('src', p.img); $('#qvName').text(p.name); $('#qvCat').text(p.cat);
      $('#qvDesc').text(p.desc); $('#qvPrice').text(money(p.price));
      $('#qvOld').text(p.old ? money(p.old) : '').toggle(!!p.old);
      $('#qvQty').text(1);
      qvModal = bootstrap.Modal.getOrCreateInstance('#quickView'); qvModal.show();
    });
    $('#qvPlus').on('click', function () { $('#qvQty').text(Math.min(10, +$('#qvQty').text() + 1)); });
    $('#qvMinus').on('click', function () { $('#qvQty').text(Math.max(1, +$('#qvQty').text() - 1)); });
    $('#qvAdd').on('click', function () {
      var size = $('input[name="size"]:checked').val();
      addToCart($.extend({}, qvProduct, { name: qvProduct.name + ' (' + size + ')', id: qvProduct.id + '-' + size }), +$('#qvQty').text());
      qvModal.hide();
    });

    // sale countdown (agle 3 din tak, har visit par reset nahi hota)
    var END_KEY = 'cs_sale_end';
    var end = +localStorage.getItem(END_KEY);
    if (!end || end < Date.now()) { end = Date.now() + 3 * 24 * 3600 * 1000; try { localStorage.setItem(END_KEY, end); } catch (e) {} }
    (function tick() {
      var d = Math.max(0, end - Date.now()), s = Math.floor(d / 1000);
      function p2(n) { return ('0' + n).slice(-2); }
      $('#cdD').text(p2(Math.floor(s / 86400))); $('#cdH').text(p2(Math.floor(s % 86400 / 3600)));
      $('#cdM').text(p2(Math.floor(s % 3600 / 60))); $('#cdS').text(p2(s % 60));
      setTimeout(tick, 1000);
    })();
  } else {
    // Dusre pages par search -> index.html?q=...
    $('.nav-search').on('submit', function (e) {
      var v = $.trim($(this).find('input').val());
      if (!v) { e.preventDefault(); }
    });
  }

  /* Cart button (all pages) */
  $('.cart-btn').on('click', function () { bootstrap.Offcanvas.getOrCreateInstance('#cartPanel').show(); });

  /* =====================================================
     ABOUT: animated counters
     ===================================================== */
  var $counters = $('.count-up');
  if ($counters.length) {
    var done = false;
    function runCounters() {
      if (done) { return; }
      var top = $counters.first().offset().top - $(window).height() + 80;
      if ($(window).scrollTop() < top) { return; }
      done = true;
      $counters.each(function () {
        var $el = $(this), target = +$el.data('to'), suffix = $el.data('suffix') || '';
        $({ n: 0 }).animate({ n: target }, { duration: 1800, easing: 'swing',
          step: function () { $el.text(Math.floor(this.n).toLocaleString() + suffix); },
          complete: function () { $el.text(target.toLocaleString() + suffix); } });
      });
    }
    $(window).on('scroll.cnt', runCounters); runCounters();
  }

  /* =====================================================
     CONTACT FORM validation
     ===================================================== */
  var $cf = $('#contactForm');
  if ($cf.length) {
    var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    function validField($f) {
      var v = $.trim($f.val()), ok = true;
      if ($f.is('#cName')) { ok = v.length >= 3; }
      else if ($f.is('#cEmail')) { ok = emailRe.test(v); }
      else if ($f.is('#cPhone')) { ok = v === '' || /^[+\d][\d\s-]{8,}$/.test(v); }
      else if ($f.is('#cMsg')) { ok = v.length >= 10; }
      $f.toggleClass('is-invalid', !ok).toggleClass('is-valid', ok && v !== '');
      return ok;
    }
    $cf.on('blur input', '.form-control', function () { if ($(this).hasClass('is-invalid') || $(this).hasClass('is-valid')) { validField($(this)); } });
    $cf.on('blur', '.form-control', function () { validField($(this)); });
    $('#cMsg').on('input', function () { $('#msgCount').text(this.value.length + ' / 500'); });
    $cf.on('submit', function (e) {
      e.preventDefault();
      var allOk = true;
      $cf.find('.form-control').each(function () { if (!validField($(this))) { allOk = false; } });
      if (!allOk) { $cf.find('.is-invalid').first().trigger('focus'); return; }
      var $btn = $cf.find('button[type=submit]').prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-2"></span>Sending…');
      setTimeout(function () {   // demo: yahan apna backend/API lagayen
        $cf.slideUp(300, function () { $('#formSuccess').fadeIn(300); });
        $cf[0].reset(); $cf.find('.form-control').removeClass('is-valid is-invalid'); $btn.prop('disabled', false).html('Send Message');
        $('#msgCount').text('0 / 500');
      }, 900);
    });
    $('#sendAnother').on('click', function () { $('#formSuccess').hide(); $cf.slideDown(300); });
  }

  /* =====================================================
     NEWSLETTER (footer, all pages)
     ===================================================== */
  $('.newsletter-form').on('submit', function (e) {
    e.preventDefault();
    var $i = $(this).find('input'), v = $.trim($i.val());
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) { $i.addClass('is-invalid').trigger('focus'); toast('Please enter a valid email', 'bi-exclamation-circle-fill'); return; }
    $i.removeClass('is-invalid').val(''); toast('Subscribed! Check your inbox soon.', 'bi-envelope-check-fill');
  });
  $('.newsletter-form input').on('input', function () { $(this).removeClass('is-invalid'); });

  /* Current year in footer */
  $('.js-year').text(new Date().getFullYear());
});
