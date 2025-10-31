// ---------- helpers ----------
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

const ENDPOINT = {
  // OPTION A (quick): Formspree — replace with your Formspree endpoint
  // e.g., "https://formspree.io/f/xyzabcd"
  url: "https://script.google.com/macros/s/AKfycbycFuKfnpBwjk_9hUcOqv_yQ0vwMajqTIB82hl5DRRnZUWi7DbARduQaKHpKzOQnm5eLQ/exec",

  // OPTION B: if you host your own API, just replace url with your POST route
};

// ---------- misc UI ----------
$("#year").textContent = new Date().getFullYear();
// mobile nav toggle
const navToggle = $(".nav-toggle");
const mainNav = $("#primary-nav");
if (navToggle && mainNav) {
  navToggle.addEventListener('click', () => {
    const expanded = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!expanded));
    mainNav.classList.toggle('show');
  });
}

// ---------- validation ----------
const form = $("#diagnostic-form");
const dialog = $("#successDialog");
const closeDialogBtn = $("#closeDialog");
const statusEl = $("#formStatus");
const submitBtn = $("#submitBtn");

function setError(input, message = "") {
  const field = input.closest(".form-field");
  const err = $(".error", field) || field.querySelector('.error') || null;
  if (message) {
    err.textContent = message;
    input.setAttribute("aria-invalid", "true");
  } else {
    err.textContent = "";
    input.removeAttribute("aria-invalid");
  }
}

function validate() {
  let ok = true;

  const required = [
    $("#fullName"),
    $("#phone"),
    $("#email"),
    $("#deviceType"),
    $("#issue")
  ];

  required.forEach(el => {
    if (el.type === "checkbox") {
      if (!el.checked) { setError(el, "Please agree to be contacted."); ok = false; }
      else setError(el, "");
    } else if (!el.value.trim()) {
      setError(el, "This field is required.");
      ok = false;
    } else setError(el, "");
  });

  const email = $("#email").value.trim();
  if (email && !/^\S+@\S+\.\S+$/.test(email)) {
    setError($("#email"), "Enter a valid email.");
    ok = false;
  }

  const phone = $("#phone").value.trim();
  if (phone && phone.replace(/\D/g, "").length < 10) {
    setError($("#phone"), "Enter a valid phone number.");
    ok = false;
  }

  return ok;
}

// ---------- submission ----------
if (form) {
  // restore draft if present
  try {
    const draft = localStorage.getItem('diagnostic:draft');
    if (draft) {
      const data = JSON.parse(draft);
      Object.keys(data).forEach(k => {
        const el = form.elements[k];
        if (!el) return;
        if (el.type === 'checkbox') el.checked = data[k];
        else el.value = data[k];
      });
    }
  } catch (e) { /* ignore malformed draft */ }

  form.addEventListener('input', (ev) => {
    // save small draft (debounced-ish)
    const fd = Object.fromEntries(new FormData(form).entries());
    localStorage.setItem('diagnostic:draft', JSON.stringify(fd));
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    statusEl.textContent = "";
    if (!validate()) return;

  submitBtn.disabled = true;
  submitBtn.classList.add('loading');
  const label = submitBtn.querySelector('.label');
  if (label) label.textContent = 'Sending…';

    const data = Object.fromEntries(new FormData(form).entries());
    data.submittedAt = new Date().toISOString();

    try {
      const res = await fetch(ENDPOINT.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      form.reset();
      localStorage.removeItem('diagnostic:draft');
      if (dialog && typeof dialog.showModal === 'function') {
        dialog.showModal();
        setTimeout(() => { try { dialog.close(); } catch (e) {} }, 3500);
      } else alert('Request received — we will contact you shortly.');
    } catch (err) {
      statusEl.textContent = "Couldn’t send right now. Please try again or contact us directly.";
      console.error(err);
    } finally {
      submitBtn.disabled = false;
      submitBtn.classList.remove('loading');
      if (label) label.textContent = 'Submit Request';
    }
  });
}

// Pause cube animation when page not visible (save CPU on mobile)
const cube = document.querySelector('.cube');
if (cube) {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cube.style.animationPlayState = 'paused';
    else cube.style.animationPlayState = 'running';
  });
}

// Button ripple effect (pure DOM, removed quickly)
document.addEventListener('pointerdown', (ev) => {
  const btn = ev.target.closest('.btn');
  if (!btn) return;
  // do not create ripples for keyboard activation
  if (ev.pointerType === 'keyboard') return;
  const rect = btn.getBoundingClientRect();
  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  const size = Math.max(rect.width, rect.height) * 0.6;
  ripple.style.width = ripple.style.height = size + 'px';
  ripple.style.left = (ev.clientX - rect.left - size / 2) + 'px';
  ripple.style.top = (ev.clientY - rect.top - size / 2) + 'px';
  btn.appendChild(ripple);
  // trigger animation
  requestAnimationFrame(() => btn.classList.add('ripple-anim'));
  // cleanup after animation
  setTimeout(() => {
    btn.classList.remove('ripple-anim');
    ripple.remove();
  }, 600);
});

// IntersectionObserver reveal for elements marked `.reveal`
(function setupRevealObserver(){
  if (!('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(ent => {
      if (ent.isIntersecting) {
        ent.target.classList.add('is-visible');
        observer.unobserve(ent.target);
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
})();

// Image load fade-in for hero and button 'squish' handlers
(function uiPolish(){
  // hero image fade-in
  const heroImg = document.querySelector('.hero-image img');
  if (heroImg) {
    if (heroImg.complete && heroImg.naturalWidth) heroImg.classList.add('loaded');
    else heroImg.addEventListener('load', () => heroImg.classList.add('loaded'));
  }

  // button pressed animation for pointer & keyboard
  function press(el){
    el.classList.add('pressed');
    setTimeout(() => el.classList.remove('pressed'), 140);
  }
  document.addEventListener('pointerdown', (e) => { const b = e.target.closest('.btn'); if (b) press(b); });
  document.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && document.activeElement && document.activeElement.classList.contains('btn')) press(document.activeElement); });
})();

// Motion toggle removed — function intentionally deleted

// Pointer tilt (desktop) for cube — respects reduced motion and ignores touch devices
try {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const wrap = document.querySelector('.cube-wrap');
  if (wrap && cube && !prefersReduced && !isTouch) {
    wrap.style.pointerEvents = 'auto';
    wrap.addEventListener('mousemove', (ev) => {
      const r = wrap.getBoundingClientRect();
      const x = (ev.clientX - r.left) / r.width - 0.5; // -0.5..0.5
      const y = (ev.clientY - r.top) / r.height - 0.5;
      const rx = y * -12; const ry = x * 14;
      cube.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
    });
    wrap.addEventListener('mouseleave', () => { cube.style.transform = ''; });
  }
} catch (e) { /* ignore */ }

if (closeDialogBtn) {
  closeDialogBtn.addEventListener("click", () => {
    if (dialog && typeof dialog.close === 'function') dialog.close();
  });
}

// Device model suggestions: enhanced, Edge-friendly custom dropdown that mirrors datalist
;(function setupDeviceSuggestions(){
  const mapping = {
    'Desktop PC': [
      'Custom Gaming PC','Dell Inspiron','Dell Alienware','HP Omen','HP Pavilion','Lenovo Legion','Lenovo ThinkCentre','Acer Predator','ASUS ROG Desktop','Corsair One'
    ],
    'Laptop': [
      'Dell XPS 13','Dell XPS 15','HP Spectre x360','HP Envy','Lenovo ThinkPad X1 Carbon','Lenovo Yoga','Asus ROG Zephyrus','Asus ZenBook','Acer Swift','Microsoft Surface Laptop'
    ],
    'Mac Desktop': ['iMac 24"','iMac 27"','Mac mini (M1/M2)','Mac Pro'],
    'Mac Laptop': ['MacBook Air (M1/M2)','MacBook Pro 13"','MacBook Pro 14"','MacBook Pro 16"'],
    'Game Console': [
      'PlayStation 5 (Standard)','PlayStation 5 (Digital)','PlayStation 4 Pro','PlayStation 4 Slim',
      'Xbox Series X','Xbox Series S','Xbox One X','Xbox One S',
      'Nintendo Switch','Nintendo Switch OLED','Nintendo Switch Lite',
      'Steam Deck 64GB','Steam Deck 256GB','Steam Deck 512GB'
    ],
    'Other': ['Router','Printer','NAS','Server','Smart TV','Home Router']
  };

  const typeEl = document.querySelector('#deviceType');
  const modelEl = document.querySelector('#deviceModel');
  const list = document.querySelector('#device-suggestions');
  if (!typeEl || !modelEl || !list) return;

  // Create a lightweight custom list element for consistent styling in Edge.
  // Append to body so it isn't clipped by overflow/containers in different browsers.
  const custom = document.createElement('div');
  custom.className = 'device-suggest device-suggest--floating';
  custom.setAttribute('role', 'listbox');
  custom.style.display = 'none';
  // stable id for ARIA references
  custom.id = 'device-suggest-list';
  document.body.appendChild(custom);

  // live region to announce counts for assistive tech
  let live = document.getElementById('device-suggest-live');
  if (!live) {
    live = document.createElement('div');
    live.id = 'device-suggest-live';
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    live.className = 'visually-hidden';
    document.body.appendChild(live);
  }

  function clearCustom(){
    custom.classList.remove('open');
    // wait for transition before clearing content
    setTimeout(() => { try { custom.innerHTML = ''; } catch (e) {} }, 260);
    modelEl.removeAttribute('aria-activedescendant');
    modelEl.setAttribute('aria-expanded', 'false');
    modelEl.removeAttribute('aria-owns');
  }

  function positionCustom(){
    const r = modelEl.getBoundingClientRect();
    const docEl = document.documentElement;
    const left = Math.max(8, r.left + window.pageXOffset);
    const top = r.bottom + window.pageYOffset + 6; // small gap
    custom.style.minWidth = r.width + 'px';
    custom.style.left = left + 'px';
    custom.style.top = top + 'px';
    // constrain right edge
    custom.style.maxWidth = Math.min(r.width, docEl.clientWidth - 16) + 'px';
  }

  function showCustom(items){
    custom.innerHTML = '';
    if (!items || !items.length) { clearCustom(); return; }
    items.forEach((it, i) => {
      const div = document.createElement('div');
      div.className = 'device-suggest__item';
      div.textContent = it;
      div.setAttribute('role','option');
      // stable id based on index and sanitized text
      const safe = it.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 36);
      div.id = `devopt-${safe}-${i}`;
      div.tabIndex = -1;
      div.addEventListener('click', () => { modelEl.value = it; clearCustom(); modelEl.focus(); });
      custom.appendChild(div);
    });
    positionCustom();
    custom.classList.add('open');
    modelEl.setAttribute('aria-expanded', 'true');
    modelEl.setAttribute('aria-owns', custom.id);
    // announce count
    try { live.textContent = `${items.length} suggestion${items.length === 1 ? '' : 's'} available.`; } catch (e) {}
  }

  function populateFor(type){
    const items = mapping[type] || [].concat(...Object.values(mapping)).slice(0, 12);
    // keep native datalist for browsers that style it well
    list.innerHTML = '';
    items.forEach(it => { const opt = document.createElement('option'); opt.value = it; list.appendChild(opt); });
    // also update custom
    showCustom(items.slice(0, 12));
  }

  // keyboard navigation inside custom list
  let currentIndex = -1;
  modelEl.addEventListener('input', (e) => {
    const val = modelEl.value.trim().toLowerCase();
    const items = [];
    Object.values(mapping).forEach(a => a.forEach(x => items.push(x)));
    const matches = val ? items.filter(it => it.toLowerCase().includes(val)).slice(0, 12) : (mapping[typeEl.value] || items.slice(0,12));
    if (matches.length) showCustom(matches);
    else clearCustom();
    currentIndex = -1;
  });

  modelEl.addEventListener('keydown', (ev) => {
    const items = custom.querySelectorAll('.device-suggest__item');
    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      if (items.length === 0) return;
      currentIndex = Math.min(currentIndex + 1, items.length - 1);
      const node = items[currentIndex];
      node.classList.add('focused'); node.focus();
      modelEl.setAttribute('aria-activedescendant', node.id);
      node.scrollIntoView({ block: 'nearest' });
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      if (items.length === 0) return;
      currentIndex = Math.max(currentIndex - 1, 0);
      const node = items[currentIndex];
      node.classList.add('focused'); node.focus();
      modelEl.setAttribute('aria-activedescendant', node.id);
      node.scrollIntoView({ block: 'nearest' });
    } else if (ev.key === 'Enter') {
      const items = custom.querySelectorAll('.device-suggest__item');
      if (currentIndex >= 0 && items[currentIndex]) {
        ev.preventDefault(); modelEl.value = items[currentIndex].textContent; clearCustom();
      }
    } else if (ev.key === 'Escape') { clearCustom(); }
  });

  // close when clicking outside or on blur (with small timeout so clicks register)
  document.addEventListener('click', (ev) => {
    if (!custom.contains(ev.target) && ev.target !== modelEl) clearCustom();
  }, true);
  modelEl.addEventListener('blur', () => { setTimeout(() => { if (document.activeElement && custom.contains(document.activeElement)) return; clearCustom(); }, 120); });

  // reposition on scroll/resize so floating list stays aligned
  window.addEventListener('resize', () => { if (custom.style.display === 'block') positionCustom(); });
  window.addEventListener('scroll', () => { if (custom.style.display === 'block') positionCustom(); }, true);

  typeEl.addEventListener('change', () => populateFor(typeEl.value));
  modelEl.addEventListener('focus', () => populateFor(typeEl.value));
  // initial populate
  populateFor(typeEl.value || 'Desktop PC');
})();

// Theme toggle: light/dark with persistence and system preference fallback
;(function setupThemeToggle(){
  const toggleLabel = document.getElementById('themeToggleBtn');
  const toggleInput = document.getElementById('themeToggleInput');
  if (!toggleLabel || !toggleInput) return;
  
  const userPref = localStorage.getItem('jaybyte:theme');
  const systemPref = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  const initial = userPref || systemPref;
  
  function applyTheme(t){
    const isDark = t === 'dark';
    if (isDark) {
      document.body.classList.remove('light-theme');
    } else {
      document.body.classList.add('light-theme');
    }
    toggleInput.checked = isDark; // checked = dark theme (moon position)
    toggleLabel.classList.toggle('is-light', !isDark);
  }
  
  applyTheme(initial);
  
  toggleInput.addEventListener('change', () => {
    const isDark = toggleInput.checked; // checked = dark theme
    const theme = isDark ? 'dark' : 'light';
    
    if (isDark) {
      document.body.classList.remove('light-theme');
    } else {
      document.body.classList.add('light-theme');
    }
    
    localStorage.setItem('jaybyte:theme', theme);
    toggleLabel.classList.toggle('is-light', !isDark);
    
    // small bounce feedback
    toggleLabel.classList.add('bounced');
    setTimeout(() => toggleLabel.classList.remove('bounced'), 420);
  });
})();

// Smooth scroll for internal anchor links (better for browsers without CSS smooth)
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const href = a.getAttribute('href');
  if (href === '#' || href === '#0') return;
  const target = document.querySelector(href);
  if (target) {
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    history.replaceState(null, '', href);
  }
});

// ---------- Stats counter + Testimonials carousel wiring ----------
;(function setupCountersAndCarousel(){
  // COUNTERS: animate numbers when scrolled into view
  const counters = document.querySelectorAll('.stat-num[data-target]');
  function animateCount(el){
    const target = parseInt(el.dataset.target, 10) || 0;
    const duration = 1400;
    const start = parseInt(el.textContent.replace(/[^0-9]/g, ''), 10) || 0;
    let t0 = null;
    function step(ts){
      if (!t0) t0 = ts;
      const p = Math.min((ts - t0) / duration, 1);
      const val = Math.floor(start + (target - start) * p);
      el.textContent = val.toLocaleString();
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = target.toLocaleString();
    }
    requestAnimationFrame(step);
  }

  if (counters.length) {
    const obs = new IntersectionObserver((entries, ob) => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          try { animateCount(en.target); } catch(e){}
          ob.unobserve(en.target);
        }
      });
    }, { threshold: 0.35 });
    counters.forEach(c => obs.observe(c));
  }

  // TESTIMONIAL CAROUSEL: basic sliding, controls, autoplay and keyboard support
  document.querySelectorAll('.test-carousel').forEach((carousel) => {
    const items = Array.from(carousel.children);
    if (!items.length) return;
    let idx = 0;

    // Ensure sliding layout
    carousel.style.display = 'flex';
    carousel.style.transition = 'transform .48s var(--easing-kw)';
    items.forEach(it => it.style.minWidth = '100%');

    function update(){
      carousel.style.transform = `translateX(-${idx * 100}%)`;
      // update dots active state
      if (dots && dots.length) {
        dots.forEach((d, i) => d.classList.toggle('active', i === idx));
      }
    }

    // wire controls if present within the same testimonials container
    const parent = carousel.closest('.testimonials') || carousel.parentElement;
    const prevBtn = parent ? parent.querySelector('#testPrev') : null;
    const nextBtn = parent ? parent.querySelector('#testNext') : null;
    if (prevBtn) prevBtn.addEventListener('click', () => { idx = (idx - 1 + items.length) % items.length; update(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { idx = (idx + 1) % items.length; update(); });

    // create pagination dots
    const dotsWrap = document.createElement('div');
    dotsWrap.className = 'test-dots';
    const dots = items.map((it, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', `Show testimonial ${i+1}`);
      b.addEventListener('click', () => { idx = i; update(); });
      dotsWrap.appendChild(b);
      return b;
    });
    // attach after parent container
    if (parent) parent.appendChild(dotsWrap);

    // autoplay (pauses on hover/focus)
    let auto = setInterval(() => { idx = (idx + 1) % items.length; update(); }, 6000);
    carousel.addEventListener('mouseenter', () => clearInterval(auto));
    carousel.addEventListener('mouseleave', () => { clearInterval(auto); auto = setInterval(() => { idx = (idx + 1) % items.length; update(); }, 6000); });

    // keyboard support
    carousel.tabIndex = 0;
    carousel.addEventListener('keydown', (ev) => {
      if (ev.key === 'ArrowLeft') { idx = (idx - 1 + items.length) % items.length; update(); }
      if (ev.key === 'ArrowRight') { idx = (idx + 1) % items.length; update(); }
    });

    // init
    update();
  });

})();
