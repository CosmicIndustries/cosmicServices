'use strict';

const state = {
  publicData: { services: [], reviews: [], settings: {} },
  bookingStep: 0,
  bookingService: ''
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function money(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value || 0));
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
}

function formToObject(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function setStatus(formId, message, isError = false) {
  const el = document.querySelector(`[data-status-for="${formId}"]`);
  if (!el) return;
  el.textContent = message;
  el.classList.toggle('error', isError);
}

function validateForm(form) {
  let ok = true;
  const fields = $$('[required]', form);
  fields.forEach(field => {
    const valid = field.type === 'checkbox' ? field.checked : Boolean(String(field.value || '').trim());
    field.setAttribute('aria-invalid', valid ? 'false' : 'true');
    if (!valid) ok = false;
  });
  if (!ok) {
    const firstInvalid = $('[aria-invalid="true"]', form);
    firstInvalid?.focus();
  }
  return ok;
}

function openDialog(dialog) {
  if (!dialog) return;
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
  document.body.classList.add('modal-open');
  setTimeout(() => dialog.querySelector('input, select, textarea, button')?.focus(), 20);
}

function closeDialog(dialog) {
  if (!dialog) return;
  if (typeof dialog.close === 'function') dialog.close();
  else dialog.removeAttribute('open');
  document.body.classList.remove('modal-open');
}

function renderServices() {
  const serviceGrid = $('#serviceGrid');
  const pricingGrid = $('#pricingGrid');
  const bookingChoices = $('#bookingChoices');
  const services = state.publicData.services;

  serviceGrid.innerHTML = services.map((service, index) => `
    <article class="service-card reveal" style="animation-delay:${index * 80}ms">
      <div>
        <span class="icon-chip">${String(index + 1).padStart(2, '0')}</span>
        <h3>${escapeHtml(service.name)}</h3>
        <p>${escapeHtml(service.summary)}</p>
        <div class="service-meta"><span>From ${money(service.priceFrom)}</span><span>${escapeHtml(service.duration)}</span></div>
        <ul>
          <li>Mobile intake and practical triage</li>
          <li>Scope and authorization check before work</li>
          <li>B2C booking and B2B routing compatible</li>
        </ul>
      </div>
      <button class="btn btn-tonal" type="button" data-open-booking data-service="${escapeHtml(service.name)}">Book this lane</button>
    </article>
  `).join('');

  pricingGrid.innerHTML = services.map(service => `
    <article class="pricing-card">
      <h3>${escapeHtml(service.name)}</h3>
      <p class="price" data-base="${Number(service.priceFrom)}">${money(service.priceFrom)} <small>from</small></p>
      <p>${escapeHtml(service.duration)} · Scope confirmed before work.</p>
      <button class="btn btn-outline stretch" type="button" data-open-booking data-service="${escapeHtml(service.name)}">Start request</button>
    </article>
  `).join('');

  bookingChoices.innerHTML = services.map((service, index) => `
    <label class="choice-card">
      <input type="radio" name="service" value="${escapeHtml(service.name)}" ${index === 0 ? 'checked' : ''} required>
      <strong>${escapeHtml(service.name)}</strong>
      <span>From ${money(service.priceFrom)} · ${escapeHtml(service.duration)}</span>
    </label>
  `).join('');

  state.bookingService = services[0]?.name || '';
  $$('[data-open-booking]').forEach(button => {
    button.addEventListener('click', () => {
      const service = button.dataset.service;
      if (service) {
        const choice = $(`input[name="service"][value="${CSS.escape(service)}"]`, $('#bookingForm'));
        if (choice) choice.checked = true;
        state.bookingService = service;
      }
      state.bookingStep = 0;
      updateBookingStep();
      openDialog($('#bookingModal'));
    });
  });
}

function renderReviews() {
  const root = $('#reviewGrid');
  root.innerHTML = state.publicData.reviews.map(review => `
    <article class="review-card">
      <div class="stars" aria-label="${review.rating} out of 5 stars">★★★★★</div>
      <blockquote>“${escapeHtml(review.text)}”</blockquote>
      <footer>${escapeHtml(review.name)} <span>· ${escapeHtml(review.role)}</span></footer>
    </article>
  `).join('');
}

function renderContact() {
  const settings = state.publicData.settings;
  $('#contactList').innerHTML = `
    <div><strong>Phone</strong><span>${escapeHtml(settings.phone || 'Add phone in admin')}</span></div>
    <div><strong>Email</strong><span>${escapeHtml(settings.email || 'Add email in admin')}</span></div>
    <div><strong>Service area</strong><span>${escapeHtml(settings.serviceArea || 'Add service area in admin')}</span></div>
    <div><strong>Hours</strong><span>${escapeHtml(settings.hours || 'Add hours in admin')}</span></div>
  `;
  $('#drpRto').textContent = settings.drpRto || '4 business hours';
  $('#drpRpo').textContent = settings.drpRpo || '1 business hour';
}

function updatePricingMode(mode) {
  $$('.segmented [data-price-mode]').forEach(button => button.classList.toggle('active', button.dataset.priceMode === mode));
  $$('.pricing-card .price').forEach(priceEl => {
    const base = Number(priceEl.dataset.base || 0);
    if (mode === 'recurring') {
      priceEl.innerHTML = `${money(Math.round(base * 0.85))} <small>route from</small>`;
    } else {
      priceEl.innerHTML = `${money(base)} <small>from</small>`;
    }
  });
}

function updateBookingStep() {
  $$('.booking-step').forEach(step => step.classList.toggle('active', Number(step.dataset.step) === state.bookingStep));
  $$('.stepper li').forEach((li, i) => li.classList.toggle('active', i <= state.bookingStep));
  $('[data-booking-prev]').disabled = state.bookingStep === 0;
  $('[data-booking-next]').classList.toggle('hidden', state.bookingStep === 3);
  $('[data-booking-submit]').classList.toggle('hidden', state.bookingStep !== 3);
  if (state.bookingStep === 3) renderBookingSummary();
}

function renderBookingSummary() {
  const form = $('#bookingForm');
  const data = formToObject(form);
  $('#bookingSummary').innerHTML = [
    ['Service', data.service],
    ['Date/time', `${data.date || 'Not set'} · ${data.time || 'Not set'}`],
    ['Name', data.name],
    ['Phone', data.phone],
    ['Address/area', data.address || 'Not provided'],
    ['Vehicle/equipment', data.vehicle || 'Not provided'],
    ['Notes', data.notes || 'None']
  ].map(([key, value]) => `<div><strong>${escapeHtml(key)}</strong><span>${escapeHtml(value)}</span></div>`).join('');
}

function bindForms() {
  $('#quoteForm').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!validateForm(form)) return setStatus('quoteForm', 'Check required fields first.', true);
    try {
      await api('/api/quotes', { method: 'POST', body: JSON.stringify(formToObject(form)) });
      form.reset();
      setStatus('quoteForm', 'Quote request received. Admin panel now has the lead.');
    } catch (error) {
      setStatus('quoteForm', error.message, true);
    }
  });

  $('#contactForm').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!validateForm(form)) return setStatus('contactForm', 'Check required fields first.', true);
    try {
      await api('/api/contact', { method: 'POST', body: JSON.stringify(formToObject(form)) });
      form.reset();
      setStatus('contactForm', 'Message received.');
    } catch (error) {
      setStatus('contactForm', error.message, true);
    }
  });

  $('#privacyForm').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!validateForm(form)) return setStatus('privacyForm', 'Check required fields first.', true);
    try {
      await api('/api/privacy-request', { method: 'POST', body: JSON.stringify(formToObject(form)) });
      form.reset();
      setStatus('privacyForm', 'Privacy request received and logged.');
    } catch (error) {
      setStatus('privacyForm', error.message, true);
    }
  });

  $('#bookingForm').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!validateForm(form)) return setStatus('bookingForm', 'Check required fields first.', true);
    try {
      const data = formToObject(form);
      await api('/api/bookings', { method: 'POST', body: JSON.stringify(data) });
      form.reset();
      state.bookingStep = 0;
      updateBookingStep();
      setStatus('bookingForm', 'Booking received. It is now visible in admin.');
      setTimeout(() => closeDialog($('#bookingModal')), 900);
    } catch (error) {
      setStatus('bookingForm', error.message, true);
    }
  });
}

function bindBooking() {
  $('[data-booking-prev]').addEventListener('click', () => {
    state.bookingStep = Math.max(0, state.bookingStep - 1);
    updateBookingStep();
  });

  $('[data-booking-next]').addEventListener('click', () => {
    const form = $('#bookingForm');
    if (state.bookingStep === 0) {
      const service = $('input[name="service"]:checked', form);
      if (!service) return;
    }
    if (state.bookingStep === 1) {
      const date = $('input[name="date"]', form);
      const time = $('select[name="time"]', form);
      date.setAttribute('aria-invalid', date.value ? 'false' : 'true');
      time.setAttribute('aria-invalid', time.value ? 'false' : 'true');
      if (!date.value || !time.value) return (date.value ? time : date).focus();
    }
    if (state.bookingStep === 2) {
      const required = ['name', 'phone'];
      let ok = true;
      required.forEach(name => {
        const field = $(`[name="${name}"]`, form);
        const valid = Boolean(field.value.trim());
        field.setAttribute('aria-invalid', valid ? 'false' : 'true');
        ok = ok && valid;
      });
      const consent = $('[name="consent"]', form);
      consent.setAttribute('aria-invalid', consent.checked ? 'false' : 'true');
      ok = ok && consent.checked;
      if (!ok) return $('[aria-invalid="true"]', form)?.focus();
    }
    state.bookingStep = Math.min(3, state.bookingStep + 1);
    updateBookingStep();
  });
}

function bindModals() {
  $$('[data-open-privacy]').forEach(button => button.addEventListener('click', () => openDialog($('#privacyModal'))));
  $$('[data-open-drp]').forEach(button => button.addEventListener('click', () => openDialog($('#drpModal'))));
  $$('[data-close-dialog]').forEach(button => button.addEventListener('click', () => closeDialog(button.closest('dialog'))));
  $$('dialog').forEach(dialog => {
    dialog.addEventListener('click', event => {
      if (event.target === dialog) closeDialog(dialog);
    });
    dialog.addEventListener('close', () => document.body.classList.remove('modal-open'));
  });
}

function bindConsent() {
  const banner = $('#cookieBanner');
  const choice = localStorage.getItem('ci_cookie_choice');
  if (!choice) banner.hidden = false;
  $$('[data-cookie]').forEach(button => {
    button.addEventListener('click', async () => {
      const accepted = button.dataset.cookie === 'accept';
      localStorage.setItem('ci_cookie_choice', accepted ? 'accepted' : 'rejected');
      banner.hidden = true;
      try {
        await api('/api/consent', {
          method: 'POST',
          body: JSON.stringify({ choice: accepted ? 'accepted' : 'rejected', necessary: true, analytics: accepted, marketing: accepted })
        });
      } catch (_) {}
    });
  });
}

function bindTheme() {
  const saved = localStorage.getItem('ci_theme');
  if (saved) document.documentElement.dataset.theme = saved;
  $('[data-theme-toggle]').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'calm-contrast' ? '' : 'calm-contrast';
    document.documentElement.dataset.theme = next;
    if (next) localStorage.setItem('ci_theme', next);
    else localStorage.removeItem('ci_theme');
  });
}

async function init() {
  try {
    state.publicData = await api('/api/public');
  } catch (error) {
    console.error(error);
  }
  renderServices();
  renderReviews();
  renderContact();
  bindForms();
  bindBooking();
  bindModals();
  bindConsent();
  bindTheme();
  $$('[data-price-mode]').forEach(button => button.addEventListener('click', () => updatePricingMode(button.dataset.priceMode)));
}

document.addEventListener('DOMContentLoaded', init);
