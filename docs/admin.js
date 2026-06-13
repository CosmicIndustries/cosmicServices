'use strict';

let db = null;
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

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
}

function money(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value || 0));
}

function shortDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
}

function formToObject(form) { return Object.fromEntries(new FormData(form).entries()); }

function setStatus(formId, message, isError = false) {
  const el = document.querySelector(`[data-status-for="${formId}"]`);
  if (!el) return;
  el.textContent = message;
  el.classList.toggle('error', isError);
}

function statusPill(status) { return `<span class="status-pill">${escapeHtml(status || 'new')}</span>`; }

function renderTable(table, headers, rows) {
  table.innerHTML = `
    <thead><tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>
    <tbody>${rows.length ? rows.join('') : `<tr><td colspan="${headers.length}">No records yet.</td></tr>`}</tbody>
  `;
}

async function load() {
  db = await api('/api/admin/bootstrap');
  $('#loginView').classList.add('hidden');
  $('#adminView').classList.remove('hidden');
  renderAll();
}

function renderAll() {
  renderKpis();
  renderRecent();
  renderBookings();
  renderQuotes();
  renderMessages();
  renderServicesEditor();
  renderSettings();
  renderCompliance();
  renderAudit();
}

function renderKpis() {
  const stats = db.stats || {};
  const kpis = [
    ['Open bookings', stats.openBookings ?? 0],
    ['Open quotes', stats.openQuotes ?? 0],
    ['Clients', stats.clients ?? 0],
    ['Paid revenue', money(stats.revenue ?? 0)]
  ];
  $('#kpiGrid').innerHTML = kpis.map(([label, value]) => `<article class="kpi"><span>${label}</span><strong>${value}</strong></article>`).join('');
}

function renderRecent() {
  const events = [
    ...(db.bookings || []).map(item => ({ type: 'Booking', name: item.name, detail: item.service, status: item.status, createdAt: item.createdAt })),
    ...(db.quotes || []).map(item => ({ type: 'Quote', name: item.company, detail: item.serviceMix, status: item.status, createdAt: item.createdAt })),
    ...(db.messages || []).map(item => ({ type: 'Message', name: item.name, detail: item.topic || item.message, status: item.status, createdAt: item.createdAt }))
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10);
  renderTable($('#recentTable'), ['Type', 'Name', 'Detail', 'Status', 'Created'], events.map(e => `
    <tr><td>${e.type}</td><td>${escapeHtml(e.name)}</td><td>${escapeHtml(e.detail)}</td><td>${statusPill(e.status)}</td><td>${shortDate(e.createdAt)}</td></tr>
  `));
}

function renderBookings() {
  renderTable($('#bookingsTable'), ['Client', 'Service', 'When', 'Phone', 'Notes', 'Status', 'Action'], (db.bookings || []).map(b => `
    <tr>
      <td><strong>${escapeHtml(b.name)}</strong><br><small>${escapeHtml(b.email || '')}</small></td>
      <td>${escapeHtml(b.service)}<br><small>${escapeHtml(b.vehicle || '')}</small></td>
      <td>${escapeHtml(b.date || '')}<br>${escapeHtml(b.time || '')}</td>
      <td>${escapeHtml(b.phone || '')}</td>
      <td>${escapeHtml(b.notes || '')}</td>
      <td>${statusPill(b.status)}</td>
      <td>
        <select data-booking-status="${b.id}" aria-label="Update booking status for ${escapeHtml(b.name)}">
          ${['new', 'confirmed', 'scheduled', 'completed', 'cancelled'].map(s => `<option ${b.status === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </td>
    </tr>
  `));
  $$('[data-booking-status]').forEach(select => select.addEventListener('change', async () => {
    await api(`/api/admin/bookings/${select.dataset.bookingStatus}`, { method: 'PATCH', body: JSON.stringify({ status: select.value }) });
    await load();
  }));
}

function renderQuotes() {
  renderTable($('#quotesTable'), ['Company', 'Contact', 'Service mix', 'Area', 'Value', 'Status', 'Action'], (db.quotes || []).map(q => `
    <tr>
      <td><strong>${escapeHtml(q.company)}</strong><br><small>${escapeHtml(q.siteCount || '')} sites/units</small></td>
      <td>${escapeHtml(q.contactName)}<br><small>${escapeHtml(q.phone || q.email || '')}</small></td>
      <td>${escapeHtml(q.serviceMix)}<br><small>${escapeHtml(q.message || '')}</small></td>
      <td>${escapeHtml(q.city || '')}</td>
      <td><input data-quote-value="${q.id}" value="${Number(q.estimatedValue || 0)}" inputmode="decimal" aria-label="Estimated value for ${escapeHtml(q.company)}"></td>
      <td>${statusPill(q.status)}</td>
      <td>
        <select data-quote-status="${q.id}" aria-label="Update quote status for ${escapeHtml(q.company)}">
          ${['new', 'qualified', 'sent', 'won', 'lost', 'archived'].map(s => `<option ${q.status === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </td>
    </tr>
  `));
  $$('[data-quote-status]').forEach(select => select.addEventListener('change', async () => {
    const valueInput = $(`[data-quote-value="${CSS.escape(select.dataset.quoteStatus)}"]`);
    await api(`/api/admin/quotes/${select.dataset.quoteStatus}`, { method: 'PATCH', body: JSON.stringify({ status: select.value, estimatedValue: valueInput?.value || 0 }) });
    await load();
  }));
}

function renderMessages() {
  renderTable($('#messagesTable'), ['From', 'Topic', 'Message', 'Status', 'Action'], (db.messages || []).map(m => `
    <tr>
      <td><strong>${escapeHtml(m.name)}</strong><br><small>${escapeHtml(m.phone || m.email || '')}</small></td>
      <td>${escapeHtml(m.topic || 'General')}</td>
      <td>${escapeHtml(m.message || '')}</td>
      <td>${statusPill(m.status)}</td>
      <td><button class="btn btn-outline" type="button" data-message-done="${m.id}">Mark handled</button></td>
    </tr>
  `));
  $$('[data-message-done]').forEach(button => button.addEventListener('click', async () => {
    await api(`/api/admin/messages/${button.dataset.messageDone}`, { method: 'PATCH', body: JSON.stringify({ status: 'handled' }) });
    await load();
  }));
}

function renderServicesEditor() {
  const root = $('#serviceEditor');
  root.innerHTML = (db.services || []).map(service => `
    <div class="service-editor-row" data-service-id="${escapeHtml(service.id)}">
      <label>Name <input data-field="name" value="${escapeHtml(service.name)}"></label>
      <label>From $ <input data-field="priceFrom" value="${Number(service.priceFrom || 0)}" inputmode="decimal"></label>
      <label>Duration <input data-field="duration" value="${escapeHtml(service.duration)}"></label>
      <label>Active <select data-field="active"><option value="true" ${service.active !== false ? 'selected' : ''}>true</option><option value="false" ${service.active === false ? 'selected' : ''}>false</option></select></label>
      <label style="grid-column:1/-1;">Summary <input data-field="summary" value="${escapeHtml(service.summary)}"></label>
      <label style="grid-column:1/-1;">Compliance note <input data-field="complianceNote" value="${escapeHtml(service.complianceNote || '')}"></label>
    </div>
  `).join('');
}

function renderSettings() {
  const fields = [
    ['businessName', 'Business name'], ['tagline', 'Tagline'], ['phone', 'Phone'], ['email', 'Email'],
    ['privacyEmail', 'Privacy email'], ['serviceArea', 'Service area'], ['hours', 'Hours'], ['bookingWindow', 'Booking window'],
    ['stripeMode', 'Stripe mode'], ['emergencyEnabled', 'Emergency enabled'], ['drpRto', 'DRP RTO'], ['drpRpo', 'DRP RPO'],
    ['epaCertNote', 'EPA cert note'], ['licenseNote', 'License note']
  ];
  $('#settingsFields').innerHTML = fields.map(([key, label]) => `
    <label>${label}<input name="${key}" value="${escapeHtml(db.settings?.[key] || '')}"></label>
  `).join('');
}

function renderCompliance() {
  renderTable($('#privacyTable'), ['Name', 'Request', 'Contact', 'State', 'Status', 'Created', 'Action'], (db.privacyRequests || []).map(r => `
    <tr>
      <td>${escapeHtml(r.name)}</td>
      <td>${escapeHtml(r.requestType)}</td>
      <td>${escapeHtml(r.email || r.phone || '')}</td>
      <td>${escapeHtml(r.state || '')}</td>
      <td>${statusPill(r.status)}</td>
      <td>${shortDate(r.createdAt)}</td>
      <td><button class="btn btn-outline" type="button" data-privacy-progress="${r.id}">Mark in progress</button></td>
    </tr>
  `));
  $$('[data-privacy-progress]').forEach(button => button.addEventListener('click', async () => {
    await api(`/api/admin/privacy-requests/${button.dataset.privacyProgress}`, { method: 'PATCH', body: JSON.stringify({ status: 'in_progress' }) });
    await load();
  }));
  renderTable($('#consentTable'), ['Choice', 'Necessary', 'Analytics', 'Marketing', 'IP hint', 'Created'], (db.consents || []).slice(0, 50).map(c => `
    <tr><td>${escapeHtml(c.choice)}</td><td>${escapeHtml(c.necessary)}</td><td>${escapeHtml(c.analytics)}</td><td>${escapeHtml(c.marketing)}</td><td>${escapeHtml(c.ipHint || '')}</td><td>${shortDate(c.createdAt)}</td></tr>
  `));
}

function renderAudit() {
  renderTable($('#auditTable'), ['Action', 'Details', 'Created'], (db.auditLog || []).map(log => `
    <tr><td>${escapeHtml(log.action)}</td><td><code>${escapeHtml(JSON.stringify(log.details || {}))}</code></td><td>${shortDate(log.createdAt)}</td></tr>
  `));
}

function bindNavigation() {
  $$('.admin-nav button').forEach(button => {
    button.addEventListener('click', () => {
      $$('.admin-nav button').forEach(b => b.classList.remove('active'));
      button.classList.add('active');
      $$('.admin-panel').forEach(panel => panel.classList.toggle('active', panel.dataset.panelView === button.dataset.panel));
      $('#adminMain').focus();
    });
  });
}

function bindForms() {
  $('#loginForm').addEventListener('submit', async event => {
    event.preventDefault();
    try {
      await api('/api/admin/login', { method: 'POST', body: JSON.stringify(formToObject(event.currentTarget)) });
      setStatus('loginForm', 'Signed in.');
      await load();
    } catch (error) {
      setStatus('loginForm', error.message, true);
    }
  });

  $('#settingsForm').addEventListener('submit', async event => {
    event.preventDefault();
    try {
      await api('/api/admin/settings', { method: 'PUT', body: JSON.stringify(formToObject(event.currentTarget)) });
      setStatus('settingsForm', 'Settings saved.');
      await load();
    } catch (error) {
      setStatus('settingsForm', error.message, true);
    }
  });

  $('#servicesForm').addEventListener('submit', async event => {
    event.preventDefault();
    const services = $$('.service-editor-row').map(row => {
      const original = (db.services || []).find(s => s.id === row.dataset.serviceId) || {};
      const service = { ...original };
      $$('[data-field]', row).forEach(input => {
        const field = input.dataset.field;
        if (field === 'priceFrom') service[field] = Number(input.value || 0);
        else if (field === 'active') service[field] = input.value === 'true';
        else service[field] = input.value;
      });
      return service;
    });
    try {
      await api('/api/admin/services', { method: 'PUT', body: JSON.stringify({ services }) });
      setStatus('servicesForm', 'Services saved.');
      await load();
    } catch (error) {
      setStatus('servicesForm', error.message, true);
    }
  });
}

function bindTopbar() {
  $('#refreshBtn').addEventListener('click', load);
  $('#logoutBtn').addEventListener('click', async () => {
    await api('/api/admin/logout', { method: 'POST', body: '{}' }).catch(() => null);
    location.reload();
  });
}

async function init() {
  bindNavigation();
  bindForms();
  bindTopbar();
  try {
    await load();
  } catch (_) {
    $('#loginView').classList.remove('hidden');
    $('#adminView').classList.add('hidden');
  }
}

document.addEventListener('DOMContentLoaded', init);
