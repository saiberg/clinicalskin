// Interacciones visuales (sin lógica de negocio real, solo maquetación)
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => links.classList.toggle('open'));
  }

  const stepper = Array.from(document.querySelectorAll('.quiz-stepper .step'));
  const steps = Array.from(document.querySelectorAll('.quiz-step'));
  const finalPanel = document.querySelector('.quiz-final');
  let currentStep = 0;

  const selectOnlyOneOption = (group) => {
    const options = group.querySelectorAll('.quiz-option');
    options.forEach((option) => {
      option.addEventListener('click', () => {
        options.forEach((item) => item.classList.remove('selected'));
        option.classList.add('selected');
      });
    });
  };

  document.querySelectorAll('.quiz-options').forEach(selectOnlyOneOption);

  const updateStepper = () => {
    stepper.forEach((step, index) => {
      const isDone = index < currentStep;
      const isActive = index === currentStep;
      step.classList.toggle('done', isDone);
      step.classList.toggle('active', isActive);
    });

    steps.forEach((step, index) => {
      step.classList.toggle('active', index === currentStep && currentStep < steps.length);
    });

    if (finalPanel) {
      finalPanel.classList.toggle('is-visible', currentStep >= steps.length);
    }
  };

  const goToStep = (nextIndex) => {
    const maxIndex = steps.length;
    currentStep = Math.min(Math.max(nextIndex, 0), maxIndex);
    updateStepper();
  };

  const pasoValido = () => {
    const activo = document.querySelector('.quiz-step.active');
    if (!activo || activo.querySelector('.quiz-option.selected')) return true;
    if (!activo.querySelector('.quiz-hint')) {
      const hint = document.createElement('p');
      hint.className = 'quiz-hint';
      hint.textContent = 'Selecciona una opción para continuar';
      activo.appendChild(hint);
    }
    return false;
  };

  document.querySelectorAll('.next-step').forEach((button) => {
    button.addEventListener('click', () => { if (pasoValido()) goToStep(currentStep + 1); });
  });

  document.querySelectorAll('.prev-step').forEach((button) => {
    button.addEventListener('click', () => goToStep(currentStep - 1));
  });

  document.querySelector('.finish-step')?.addEventListener('click', () => { if (pasoValido()) goToStep(steps.length); });

  document.querySelectorAll('.quiz-step').forEach((step) => {
    step.addEventListener('click', (event) => {
      if (event.target.closest('.quiz-option')) step.querySelector('.quiz-hint')?.remove();
    });
  });

  updateStepper();
});

/* =========================================================
   Clinical Skin — Interacciones de ecommerce (maqueta)
   ========================================================= */
(() => {
  const fmt = (n) => '$' + Math.round(n).toLocaleString('es-CL');

  /* Selector de cantidad genérico (producto y carrito) */
  document.querySelectorAll('.qty-selector').forEach((sel) => {
    const value = sel.querySelector('span');
    const buttons = sel.querySelectorAll('button');
    if (!value || buttons.length < 2) return;
    const [minus, plus] = buttons;
    const read = () => parseInt(value.textContent, 10) || 1;
    minus.addEventListener('click', () => {
      value.textContent = Math.max(1, read() - 1);
      sel.dispatchEvent(new CustomEvent('qtychange', { bubbles: true }));
    });
    plus.addEventListener('click', () => {
      value.textContent = read() + 1;
      sel.dispatchEvent(new CustomEvent('qtychange', { bubbles: true }));
    });
  });

  /* Carrito: recalcular totales y eliminar ítems */
  const cartPanel = document.querySelector('.cart-panel');
  if (cartPanel) {
    const SHIP_FLAT = 3990;
    const orderBox = document.querySelector('.order-box');
    const emptyBox = document.querySelector('.cart-empty');
    const subEl = document.querySelector('[data-cart="subtotal"]');
    const discEl = document.querySelector('[data-cart="discount"]');
    const totalEl = document.querySelector('[data-cart="total"]');
    const countEls = document.querySelectorAll('[data-cart="count"]');

    const recalc = () => {
      let subtotal = 0;
      let count = 0;
      cartPanel.querySelectorAll('.cart-item').forEach((item) => {
        const price = parseInt(item.dataset.price, 10) || 0;
        const qty = parseInt(item.querySelector('.qty-selector span')?.textContent, 10) || 1;
        subtotal += price * qty;
        count += qty;
        const line = item.querySelector('.line-price');
        if (line) line.textContent = fmt(price * qty);
      });
      const itemsCount = cartPanel.querySelectorAll('.cart-item').length;
      const discount = itemsCount >= 2 ? subtotal * 0.1 : 0;
      const discRow = document.querySelector('.order-box .summary-row.discount');
      if (discRow) discRow.style.display = discount > 0 ? '' : 'none';
      if (subEl) subEl.textContent = fmt(subtotal);
      if (discEl) discEl.textContent = '-' + fmt(discount);
      if (totalEl) totalEl.textContent = fmt(subtotal - discount + SHIP_FLAT);
      countEls.forEach((el) => (el.textContent = String(count)));

      const hasItems = cartPanel.querySelectorAll('.cart-item').length > 0;
      cartPanel.style.display = hasItems ? '' : 'none';
      if (orderBox) orderBox.style.display = hasItems ? '' : 'none';
      emptyBox?.classList.toggle('is-visible', !hasItems);
    };

    cartPanel.querySelectorAll('.remove-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        btn.closest('.cart-item')?.remove();
        recalc();
      });
    });
    cartPanel.querySelectorAll('.qty-selector').forEach((sel) => {
      sel.addEventListener('qtychange', recalc);
    });
    recalc();
  }

  /* Checkout: envío, pago y tarjeta */
  const checkout = document.querySelector('.checkout-layout');
  if (checkout) {
    let shipping = 3990;
    const shipEl = document.querySelector('[data-checkout="envio"]');
    const totalEls = document.querySelectorAll('[data-checkout="total"]');
    const resumen = (window.CS_COMPRA && CS_COMPRA.resumen().count > 0) ? CS_COMPRA.resumen() : null;
    const subtotal = resumen ? resumen.subtotal : 82600;
    const discount = resumen ? resumen.descuento : 8260;

    const update = () => {
      const total = subtotal - discount + shipping;
      if (shipEl) shipEl.textContent = shipping > 0 ? fmt(shipping) : 'Gratis';
      totalEls.forEach((el) => (el.textContent = fmt(total)));
    };

    const syncCards = (input) => {
      document
        .querySelectorAll(`input[name="${input.name}"]`)
        .forEach((i) => i.closest('.radio-card')?.classList.toggle('selected', i.checked));
    };

    document.querySelectorAll('.radio-card input').forEach((input) => {
      input.addEventListener('change', () => {
        syncCards(input);
        if (input.name === 'envio') {
          shipping = parseInt(input.dataset.cost, 10) || 0;
          update();
        }
        if (input.name === 'pago') {
          document
            .querySelector('.card-fields')
            ?.classList.toggle('visible', input.value === 'webpay');
        }
      });
    });

    update();
  }

  /* Ilustraciones de producto: se asignan según el nombre */
  const PRODUCT_IMG = {
    'Gel Limpiador Balance': 'img/productos/gel-balance.jpg',
    'Sérum Equilibrio Botánico': 'img/productos/serum-equilibrio.jpg',
    'Ampolla Luz Vitamina C': 'img/productos/ampolla-vitc.jpg',
    'Bálsamo Centella Calma': 'img/productos/balsamo-centella.jpg',
    'Crema Bruma de Avena': 'img/productos/crema-avena.jpg',
    'Protector Solar Ligero SPF50': 'img/productos/protector-spf50.jpg',
    'Tónico Exfoliante BHA 2%': 'img/productos/tonico-bha.jpg',
    'Aceite Desmaquillante Suave': 'img/productos/aceite-desmaquillante.jpg',
    'Leche Limpiadora Suave': 'img/productos/leche-cremosa.jpg',
    'Gel Hidratante Oil-Free': 'img/productos/gel-hidratante.jpg',
    'Sérum Hidra Plump': 'img/productos/serum-hidra.jpg'
  };

  const dressMedia = (el, name) => {
    const src = PRODUCT_IMG[name];
    if (!src || !el || el.querySelector('img')) return;
    el.insertAdjacentHTML('afterbegin', `<img src="${src}" alt="${name}">`);
    el.querySelector('svg')?.style.setProperty('display', 'none');
  };

  document.querySelectorAll('.product-media').forEach((el) => {
    const name = el.parentElement?.querySelector('h3')?.textContent.trim();
    if (name) dressMedia(el, name);
  });
  document.querySelectorAll('.cart-thumb').forEach((el) => {
    const name = el.closest('.cart-item')?.querySelector('h2')?.textContent.trim();
    if (name) dressMedia(el, name);
  });
  document.querySelectorAll('.os-thumb').forEach((el) => {
    const name = el.closest('.os-item')?.querySelector('strong')?.textContent.trim();
    if (name) dressMedia(el, name);
  });
  document.querySelectorAll('.product-gallery-main, .product-gallery-thumbs div').forEach((el) => {
    const name = document.querySelector('.product-info h1')?.textContent.trim();
    if (name) dressMedia(el, name);
  });
  document.querySelectorAll('.fake-bottle').forEach((el) => {
    const name = el.closest('.hero-card')?.querySelector('h2')?.textContent.trim();
    if (name) dressMedia(el, name);
  });
})();
