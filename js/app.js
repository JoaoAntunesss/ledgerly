/* Ledgerly — local-first invoices & expenses. Plain JS, no dependencies.
   Data lives in localStorage under KEY; use Settings → Backup to export/import it. */
(function () {
  'use strict';
  var KEY = 'ledgerly.v1';
  try { if (!localStorage.getItem('ledgerly.lang') && /^pt/i.test(navigator.language || '')) localStorage.setItem('ledgerly.lang', 'pt'); } catch (e) { }
  var LOCALE = (function () { try { return localStorage.getItem('ledgerly.lang') === 'pt' ? 'pt-PT' : undefined; } catch (e) { return undefined; } })();
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var view = $('#view'), dlg = $('#dlg');

  /* ---------- data ---------- */
  var DEFAULTS = { settings: { name: '', taxId: '', address: '', email: '', iban: '', currency: 'EUR', vat: 23, prefix: 'INV', terms: 30, footer: 'Thank you for your business.', people: 1, budgets: {} }, clients: [], invoices: [], expenses: [], bills: [], offers: {}, subs: [], income: [], loans: [], accounts: [], goals: [], nw: [], items: [], deadlines: [], groups: [] };
  var db;
  function load() {
    try { db = JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { db = null; }
    db = db || JSON.parse(JSON.stringify(DEFAULTS));
    db.settings = Object.assign({}, DEFAULTS.settings, db.settings);
    ['clients', 'invoices', 'expenses', 'bills', 'subs', 'income', 'loans', 'accounts', 'goals', 'nw', 'items', 'deadlines', 'groups'].forEach(function (k) { if (!Array.isArray(db[k])) db[k] = []; });
    if (!db.offers || typeof db.offers !== 'object' || Array.isArray(db.offers)) db.offers = {};
  }
  var warned = false;
  function save() { if (window.__afterSave) window.__afterSave(); try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { if (!warned) { warned = true; toast('Could not save — browser storage is blocked or full. Export a backup!'); } } }
  load();

  /* ---------- helpers ---------- */
  var uid = function () { return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var today = function () { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  var addDays = function (iso, n) { var d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  function money(n, cur) { try { return new Intl.NumberFormat(LOCALE, { style: 'currency', currency: cur || db.settings.currency }).format(n || 0); } catch (e) { return (n || 0).toFixed(2) + ' ' + (cur || ''); } }
  var fdate = function (iso) { if (!iso) return '—'; var d = new Date(iso + 'T12:00:00'); return isNaN(d) ? iso : d.toLocaleDateString(LOCALE, { day: '2-digit', month: 'short', year: 'numeric' }); };
  var num = function (v) { var n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : 0; };
  var round2 = function (n) { return Math.round((n + Number.EPSILON) * 100) / 100; };
  function toast(t) { var e = $('#toast'); e.textContent = t; e.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(function () { e.classList.remove('on'); }, 2400); }
  var clientOf = function (id) { return db.clients.filter(function (c) { return c.id === id; })[0]; };

  function totals(inv) {
    var net = 0, vat = 0;
    (inv.items || []).forEach(function (i) { var l = num(i.q) * num(i.p); net += l; vat += l * num(i.v) / 100; });
    net = round2(net); vat = round2(vat); return { net: net, vat: vat, gross: round2(net + vat) };
  }
  function addMonths(iso, n) { var d = new Date(iso + 'T12:00:00'), day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + n); d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function runRecurring() {            // creates draft copies of recurring invoices that are due
    var made = 0;
    db.invoices.slice().forEach(function (inv) {
      var n = 0; while (inv.rec && inv.rec.next <= today() && n++ < 12) {
        var c = JSON.parse(JSON.stringify(inv)); delete c.rec; delete c.paidOn; delete c.file; c.id = uid(); c.number = nextNumber(); c.status = 'draft'; c.issue = inv.rec.next; c.due = addDays(c.issue, +db.settings.terms || 30);
        db.invoices.push(c); made++; inv.rec.next = addMonths(inv.rec.next, inv.rec.every === 'month' ? 1 : inv.rec.every === 'quarter' ? 3 : 12);
      }
    });
    if (made) { save(); setTimeout(function () { toast(made + ' recurring invoice' + (made > 1 ? 's' : '') + ' created as draft'); }, 400); }
  }
  function status(inv) { if (inv.status === 'sent' && inv.due && inv.due < today()) return 'overdue'; return inv.status; }
  function nextNumber() {
    var y = new Date().getFullYear(), p = db.settings.prefix + '-' + y + '-', max = 0;
    db.invoices.forEach(function (i) { if (i.number && i.number.indexOf(p) === 0) max = Math.max(max, parseInt(i.number.slice(p.length), 10) || 0); });
    return p + String(max + 1).padStart(3, '0');
  }
  function csv(rows, name) {
    var t = rows.map(function (r) { return r.map(function (c) { c = String(c == null ? '' : c); if (/^[=+\-@]/.test(c)) c = "'" + c; return /[",\n;]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(','); }).join('\n');
    download(new Blob(['﻿' + t], { type: 'text/csv' }), name);
  }
  function download(blob, name) { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 3000); }

  /* ---------- tiny UI kit ---------- */
  var pendingPriv = null;
  function privField(x) { pendingPriv = x; return window.__famOn && window.__famOn() ? '<div><label>Visibility</label><select name="priv"><option value="0">Shared with family</option><option value="1" ' + (x.private ? 'selected' : '') + '>Private (only me)</option></select></div>' : ''; }
  function ask(html, onOk, okLabel) {
    var pp = pendingPriv; pendingPriv = null;
    dlg.innerHTML = '<form method="dialog">' + html + '<div class="row" style="justify-content:flex-end;margin-top:18px"><button class="btn" value="x" formnovalidate>Cancel</button><button class="btn p" value="ok">' + (okLabel || 'Save') + '</button></div></form>';
    dlg.onclose = function () { if (dlg.returnValue === 'ok') { var pv = dlg.querySelector('[name=priv]'); if (pp && pv) pp.private = pv.value === '1'; onOk(dlg); } dlg.returnValue = ''; };
    dlg.showModal();
  }
  var val = function (root, n) { var e = root.querySelector('[name="' + n + '"]'); return e ? e.value.trim() : ''; };
  function field(label, name, v, type, extra) { return '<div><label>' + label + '</label><input name="' + name + '" type="' + (type || 'text') + '" value="' + esc(v) + '" ' + (extra || '') + '></div>'; }

  /* ---------- views ---------- */
  var routes = { dashboard: dashboard, invoices: invoices, invoice: invoiceDoc, edit: invoiceEdit, clients: clients, expenses: expenses, bills: bills, subs: subs, income: incomePage, loans: loansPage, wealth: wealth, reminders: reminders, split: split, vat: vatReport, settings: settings };
  function route() {
    var h = location.hash.replace(/^#\/?/, '').split('/'), name = h[0] || 'dashboard';
    if (!routes[name]) name = 'dashboard';
    document.querySelectorAll('#nav a').forEach(function (a) { a.classList.toggle('on', a.dataset.r === (name === 'invoice' || name === 'edit' ? 'invoices' : name)); });
    routes[name](h[1]); window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);

  function kpi(label, v, cls) { return '<div class="card kpi ' + (cls || '') + '"><small>' + label + '</small><b>' + v + '</b></div>'; }

  function bizHtml() {
    if (!db.invoices.length && !db.expenses.length) return '';
    var y = new Date().getFullYear(), paid = 0, out = 0, over = 0, exp = 0, byM = [];
    for (var m = 0; m < 12; m++) byM.push({ inc: 0, exp: 0 });
    db.invoices.forEach(function (i) {
      var t = totals(i), s = status(i);
      if (s === 'paid') { if ((i.paidOn || i.issue || '').slice(0, 4) == y) { paid += t.gross; byM[+(i.paidOn || i.issue).slice(5, 7) - 1].inc += t.net; } }
      else if (s === 'overdue') { over += t.gross; out += t.gross; } else if (s === 'sent') out += t.gross;
    });
    db.expenses.forEach(function (e) { if ((e.date || '').slice(0, 4) == y) { exp += num(e.amount); byM[+e.date.slice(5, 7) - 1].exp += num(e.amount); } });
    var max = Math.max.apply(null, byM.map(function (b) { return Math.max(b.inc, b.exp); }).concat([1]));
    var mn = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
    var recent = db.invoices.slice().sort(function (a, b) { return (b.issue || '').localeCompare(a.issue || ''); }).slice(0, 5);
    return '<h2 class="sec2">💼 Work</h2>' + '<div class="grid g4">' + kpi('Paid in ' + y, money(paid), 'ok') + kpi('Outstanding', money(out)) + kpi('Overdue', money(over), over ? 'bad' : '') + kpi('Expenses in ' + y, money(exp)) + (db.subs.length ? kpi('Subscriptions / month', money(db.subs.filter(function (x) { return x.active !== false; }).reduce(function (a, x) { return a + mineM(x); }, 0))) : '') + '</div>' +
      '<div class="card" style="margin-top:14px"><h2>Income vs expenses · ' + y + '</h2><div class="bar">' + byM.map(function (b, i) {
        return '<div><span class="bars"><i style="height:' + (b.inc / max * 100) + '%" title="Income ' + money(b.inc) + '"></i><i class="e" style="height:' + (b.exp / max * 100) + '%" title="Expenses ' + money(b.exp) + '"></i></span>' + mn[i] + '</div>';
      }).join('') + '</div><div class="legend"><span><i style="background:var(--acc)"></i>Income (net, by payment date)</span><span><i style="background:var(--line)"></i>Expenses</span></div></div>' +
      '<div class="card" style="margin-top:14px"><h2>Recent invoices</h2>' + (recent.length ? invTable(recent) : '<div class="empty">No invoices yet.</div>') + '</div>';
  }


  /* ---------- new home: summary, where the money goes, 6-month trend, next 30 days ---------- */
  function overviewData() {
    var inc = db.income.filter(function (x) { return x.active !== false; }).reduce(function (a, x) { return a + incM(x); }, 0), ppl = Math.max(1, +db.settings.people || 1);
    var bl = Object.keys(BT).reduce(function (a, t) { var l = byType(t); return a + (l.length ? annual(l).cost / 12 / ppl : 0); }, 0);
    var sb = db.subs.filter(function (x) { return x.active !== false; }).reduce(function (a, x) { return a + mineM(x); }, 0);
    var ln = db.loans.reduce(function (a, L) { var i = loanInfo(L); return a + (i.done ? 0 : i.pay); }, 0);
    var since = addDays(today(), -90), ex = db.expenses.filter(function (e) { return (e.date || '') >= since; }).reduce(function (a, e) { return a + num(e.amount); }, 0) / 3;
    return { inc: inc, bl: bl, sb: sb, ln: ln, ex: ex, out: bl + sb + ln + ex, left: inc - bl - sb - ln - ex };
  }
  function donut(parts, centerTop, centerBottom) {
    var tot = parts.reduce(function (a, p) { return a + p.v; }, 0) || 1, R = 52, C = 2 * Math.PI * R, off = 0;
    return '<svg viewBox="0 0 140 140" class="donut" role="img" aria-label="Spending split"><circle cx="70" cy="70" r="' + R + '" fill="none" stroke="var(--bg)" stroke-width="18"/>' + parts.map(function (p) {
      var len = p.v / tot * C, el = '<circle cx="70" cy="70" r="' + R + '" fill="none" stroke="' + p.c + '" stroke-width="18" stroke-dasharray="' + Math.max(len - 1.5, 0) + ' ' + C + '" stroke-dashoffset="' + (-off) + '" transform="rotate(-90 70 70)"><title>' + esc(p.l) + ': ' + money(p.v) + '</title></circle>'; off += len; return el;
    }).join('') + '<text x="70" y="66" text-anchor="middle" font-size="9" fill="currentColor" opacity=".6">' + esc(centerTop) + '</text><text x="70" y="83" text-anchor="middle" font-size="15" font-weight="800" fill="currentColor">' + esc(centerBottom) + '</text></svg>';
  }
  function monthFlows(n) {
    var o = overviewData(), ppl = Math.max(1, +db.settings.people || 1), out = [], now = new Date();
    for (var i = n - 1; i >= 0; i--) {
      var d = new Date(now.getFullYear(), now.getMonth() - i, 1), k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      var inc = o.inc + db.invoices.filter(function (x) { return x.status === 'paid' && (x.paidOn || x.issue || '').slice(0, 7) === k; }).reduce(function (a, x) { return a + totals(x).net; }, 0);
      var bl = db.bills.filter(function (b) { return (b.date || '').slice(0, 7) === k; }).reduce(function (a, b) { return a + b.amount / ppl; }, 0);
      var ex = db.expenses.filter(function (e) { return (e.date || '').slice(0, 7) === k; }).reduce(function (a, e) { return a + num(e.amount); }, 0);
      out.push({ k: k, label: d.toLocaleDateString(LOCALE, { month: 'short' }), inc: inc, out: bl + ex + o.sb + o.ln });
    }
    return out;
  }
  function welcomeHtml() {
    return '<div class="card welcome"><h2 style="font-size:20px">Welcome to Ledgerly 👋</h2><p class="mut">Everything stays on your device unless you turn on sync. What do you want to manage?</p><div class="grid g3">' +
      '<button class="pick" data-mode="home"><b>🏠 Home & family</b><span>Bills, subscriptions, loans, savings, shared costs</span></button>' +
      '<button class="pick" data-mode="work"><b>💼 My business</b><span>Invoices, clients, expenses, VAT</span></button>' +
      '<button class="pick" data-mode="both"><b>✨ Both</b><span>Everything in one place</span></button></div>' +
      '<p style="margin:14px 0 0"><button class="btn" id="wdemo">Look around with demo data first</button></p></div>';
  }
  function greeting() { var h = new Date().getHours(); return h < 6 ? 'Good night' : h < 12 ? 'Good morning' : h < 20 ? 'Good afternoon' : 'Good evening'; }
  function quickChips() {
    return '<div class="chips"><button class="chip" data-q="bill">＋ Bill</button><button class="chip" data-q="scan">📷 Receipt</button><button class="chip" data-q="expense">＋ Expense</button><button class="chip" data-q="income">＋ Income</button><button class="chip" data-q="sub">＋ Subscription</button><button class="chip" data-q="invoice">＋ Invoice</button></div>';
  }
  function dashboard() {
    var empty = !db.invoices.length && !db.expenses.length && !db.bills.length && !db.subs.length && !db.loans.length && !db.income.length && !db.accounts.length;
    var mode = db.settings.mode || 'both';
    var html = '<div class="top"><div><h1>' + greeting() + (db.settings.name ? ', ' + esc(db.settings.name.split(' ')[0]) : '') + '</h1><div class="mut">' + new Date().toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' }) + '</div></div></div>';
    if (empty) { view.innerHTML = html + welcomeHtml(); wireWelcome(); return; }
    html += quickChips() + backupBanner() + alertsHtml(alerts());
    var o = overviewData();
    if (db.income.length || db.loans.length || db.subs.length || db.bills.length) {
      var parts = [{ l: 'Loans', v: o.ln, c: '#5c7cfa' }, { l: 'Home bills', v: o.bl, c: '#e8a400' }, { l: 'Subscriptions', v: o.sb, c: '#d6336c' }, { l: 'Other expenses', v: o.ex, c: '#16a394' }].filter(function (p) { return p.v > 0.5; });
      var flows = monthFlows(6), fmax = Math.max.apply(null, flows.map(function (f) { return Math.max(f.inc, f.out); }).concat([1]));
      html += '<div class="hero card"><div><small>' + (db.income.length ? 'Left over this month (estimate)' : 'Monthly costs (estimate)') + '</small><div class="big ' + (o.left < 0 && db.income.length ? 'neg' : '') + '">' + money(db.income.length ? o.left : o.out) + '</div>' +
        (db.income.length ? '<div class="mut">' + money(o.inc) + ' in · ' + money(o.out) + ' out · you keep ' + (o.inc ? Math.round(Math.max(0, o.left) / o.inc * 100) : 0) + '%' + '</div>' : '<div class="mut">Add your <a href="#/income">income</a> to see what is left each month.</div>') + '</div>' +
        '<div class="stack" role="img" aria-label="Where this month goes">' + parts.map(function (p) { return '<i style="flex:' + p.v + ';background:' + p.c + '" title="' + esc(p.l) + ' ' + money(p.v) + '"></i>'; }).join('') + '</div></div>';
      html += '<div class="grid g2" style="margin-top:14px"><div class="card"><h2>Where your money goes</h2><div class="dn">' + donut(parts, 'per month', money(o.out)) + '<div class="lg">' + parts.map(function (p) { return '<div><i style="background:' + p.c + '"></i><span>' + esc(p.l) + '</span><b>' + money(p.v) + '</b><em>' + Math.round(p.v / (o.out || 1) * 100) + '%</em></div>'; }).join('') + '</div></div></div>' +
        '<div class="card"><h2>Last 6 months</h2><div class="bar" style="height:150px">' + flows.map(function (f) { return '<div><span class="bars"><i style="height:' + f.inc / fmax * 100 + '%" title="In ' + money(f.inc) + '"></i><i class="e" style="height:' + f.out / fmax * 100 + '%;background:#e8590c" title="Out ' + money(f.out) + '"></i></span>' + f.label + '</div>'; }).join('') + '</div><div class="legend"><span><i style="background:var(--acc)"></i>Money in</span><span><i style="background:#e8590c"></i>Money out</span></div></div></div>';
    }
    var nw = db.accounts.length ? netWorth() : null;
    var small = [];
    if (nw != null) small.push(kpi('Net worth', money(nw), nw >= 0 ? 'ok' : 'bad'));
    if (db.goals.length) { var g = db.goals[0], r = Math.round(Math.min(1, g.saved / g.target) * 100); small.push(kpi('Goal: ' + esc(g.name), r + '%')); }
    if (db.loans.length) small.push(kpi('Still owed on loans', money(db.loans.reduce(function (a, L) { return a + loanInfo(L).bal; }, 0))));
    if (small.length) html += '<div class="grid g4" style="margin-top:14px">' + small.join('') + '</div>';
    html += upcomingHtml();
    if (mode !== 'home') html += bizHtml();
    view.innerHTML = html; wireWelcome();
  }
  function wireWelcome() {
    view.querySelectorAll('[data-mode]').forEach(function (b) { b.onclick = function () { db.settings.mode = b.dataset.mode; save(); applyMode(); location.hash = b.dataset.mode === 'work' ? '#/invoices' : '#/bills'; toast(b.dataset.mode === 'work' ? 'Add your business details in Settings, then create an invoice' : 'Add your first bill — or import a photo/PDF'); }; });
    var wd = $('#wdemo'); if (wd) wd.onclick = function () { demo(); save(); route(); };
    view.querySelectorAll('[data-q]').forEach(function (b) { b.onclick = function () { quickAdd(b.dataset.q); }; });
  }
  function applyMode() { var lb = $('#langbtn'); if (lb) lb.textContent = '🌐 ' + (LOCALE ? 'English' : 'Português'); document.body.dataset.mode = db.settings.mode || 'both'; }
  function quickAdd(k) {
    var go = function (hash, sel, wait) { if (location.hash !== hash) location.hash = hash; else route(); setTimeout(function () { var e = $(sel); if (e) e.click(); }, wait || 80); };
    if (dlg.open) dlg.close('x');
    if (k === 'bill') billForm(); else if (k === 'sub') subForm(); else if (k === 'income') incForm(); else if (k === 'invoice') location.hash = '#/edit/new';
    else if (k === 'expense') go('#/expenses', '#new'); else if (k === 'scan') go('#/expenses', '#scan');
    else if (k === 'loan') loanForm(); else if (k === 'goal') { go('#/wealth', '#newg'); } else if (k === 'account') { go('#/wealth', '#newa'); }
  }
  function moreSheet() {
    var items = Array.prototype.map.call(document.querySelectorAll('#nav a'), function (a) { return '<a href="' + a.getAttribute('href') + '" class="mrow">' + a.innerHTML + '</a>'; }).join('');
    dlg.innerHTML = '<form method="dialog"><h2>All sections</h2><div class="mgrid">' + items + '</div>' + (window.__installEvt || isIOS() ? '<p style="margin-top:14px"><button type="button" class="btn p" id="inst" style="width:100%">📲 Install the app on this phone</button></p>' : '') + '<p style="margin-top:10px"><button type="button" class="btn" data-act="lang" style="width:100%">🌐 ' + (LOCALE ? 'English' : 'Português') + '</button></p><div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn" value="x">Close</button></div></form>';
    dlg.onclose = null; dlg.showModal(); dlg.querySelectorAll('a.mrow').forEach(function (a) { a.onclick = function () { dlg.close('x'); }; });
    var i = dlg.querySelector('#inst'); if (i) i.onclick = installApp;
  }
  function quickSheet() {
    var b = function (k, t, d) { return '<button type="button" class="qa" data-qa="' + k + '"><b>' + t + '</b><span>' + d + '</span></button>'; };
    dlg.innerHTML = '<form method="dialog"><h2>Add something</h2><div class="qgrid">' + b('bill', '🧾 Bill', 'Electricity, water, gas, internet…') + b('scan', '📷 Receipt', 'Photo → expense, automatic') + b('expense', '💸 Expense', 'Type it in') + b('income', '💰 Income', 'Salary or other') + b('sub', '🔁 Subscription', 'Netflix, gym, IPTV…') + b('loan', '🏦 Loan', 'Mortgage, car, credit') + b('invoice', '📄 Invoice', 'Bill a client') + b('goal', '🎯 Savings goal', 'Holidays, emergency fund') + '</div><div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn" value="x">Close</button></div></form>';
    dlg.onclose = null; dlg.showModal(); dlg.querySelectorAll('[data-qa]').forEach(function (b2) { b2.onclick = function () { quickAdd(b2.dataset.qa); }; });
  }
  function isIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.navigator.standalone; }
  function installApp() {
    if (window.__installEvt) { window.__installEvt.prompt(); window.__installEvt = null; return; }
    ask('<h2>Install on your iPhone</h2><ol><li>Open this page in <b>Safari</b>.</li><li>Tap the <b>Share</b> button.</li><li>Choose <b>Add to Home Screen</b>.</li></ol><p class="mut">It then opens like a normal app, full screen, and works offline.</p>', function () { }, 'Got it');
  }
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); window.__installEvt = e; var b = $('#installbtn'); if (b) b.hidden = false; });
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-act]'); if (!t) return; var a = t.dataset.act;
    if (a === 'lang') { try { localStorage.setItem('ledgerly.lang', localStorage.getItem('ledgerly.lang') === 'pt' ? 'en' : 'pt'); } catch (e) { } location.reload(); } else if (a === 'quick') quickSheet(); else if (a === 'more') moreSheet(); else if (a === 'install') installApp();
  });

  function invTable(list) {
    return '<table><thead><tr><th>Number</th><th>Client</th><th>Issued</th><th>Due</th><th>Status</th><th class="r">Total</th></tr></thead><tbody>' + list.map(function (i) {
      var c = clientOf(i.clientId), s = status(i);
      return '<tr class="click" onclick="location.hash=\'#/invoice/' + i.id + '\'"><td><b>' + esc(i.number) + '</b></td><td>' + esc(c ? c.name : '—') + '</td><td class="mut">' + fdate(i.issue) + '</td><td class="mut">' + fdate(i.due) + '</td><td><span class="tag ' + s + '">' + s + '</span></td><td class="r">' + money(totals(i).gross, i.currency) + '</td></tr>';
    }).join('') + '</tbody></table>';
  }

  var invFilter = { q: '', s: 'all' };
  function invoices() {
    view.innerHTML = '<div class="top"><h1>Invoices</h1><div class="row"><button class="btn" id="exp">Export CSV</button><a class="btn p" href="#/edit/new">+ New invoice</a></div></div>' +
      '<div class="row" style="margin-bottom:14px"><input id="q" placeholder="Search number or client…" style="max-width:300px" value="' + esc(invFilter.q) + '"><select id="st" style="max-width:160px">' +
      ['all', 'draft', 'sent', 'overdue', 'paid'].map(function (s) { return '<option ' + (s === invFilter.s ? 'selected' : '') + '>' + s + '</option>'; }).join('') + '</select></div><div class="card" id="list"></div>';
    function draw() {
      var q = invFilter.q.toLowerCase(), l = db.invoices.filter(function (i) { var c = clientOf(i.clientId); return (invFilter.s === 'all' || status(i) === invFilter.s) && (!q || (i.number + ' ' + (c ? c.name : '')).toLowerCase().indexOf(q) > -1); })
        .sort(function (a, b) { return (b.issue || '').localeCompare(a.issue || '') || b.number.localeCompare(a.number); });
      $('#list').innerHTML = l.length ? invTable(l) : '<div class="empty">' + (db.invoices.length ? 'Nothing matches.' : 'No invoices yet. Create your first one!') + '</div>';
      draw.l = l;
    }
    $('#q').oninput = function (e) { invFilter.q = e.target.value; draw(); };
    $('#st').onchange = function (e) { invFilter.s = e.target.value; draw(); };
    $('#exp').onclick = function () {
      csv([['Number', 'Client', 'Issued', 'Due', 'Status', 'Paid on', 'Currency', 'Net', 'VAT', 'Total']].concat((draw.l || []).map(function (i) { var t = totals(i), c = clientOf(i.clientId); return [i.number, c ? c.name : '', i.issue, i.due, status(i), i.paidOn || '', i.currency, t.net, t.vat, t.gross]; })), 'invoices.csv');
    };
    draw();
  }

  function invoiceEdit(id) {
    var inv = id && id !== 'new' ? db.invoices.filter(function (i) { return i.id === id; })[0] : null;
    if (id && id !== 'new' && !inv) { location.hash = '#/invoices'; return; }
    inv = inv ? JSON.parse(JSON.stringify(inv)) : { id: uid(), number: nextNumber(), clientId: (db.clients[0] || {}).id || '', issue: today(), due: addDays(today(), +db.settings.terms || 30), status: 'draft', currency: db.settings.currency, items: [{ d: '', q: 1, p: '', v: db.settings.vat }], notes: db.settings.footer };
    var isNew = !db.invoices.some(function (i) { return i.id === inv.id; });
    view.innerHTML = '<div class="top"><h1>' + (isNew ? 'New invoice' : 'Edit ' + esc(inv.number)) + '</h1><div class="row"><a class="btn" href="#/invoices">Cancel</a><button class="btn p" id="save">Save</button></div></div>' +
      '<div class="card"><div class="f">' + field('Number', 'number', inv.number) +
      '<div><label>Client</label><select name="clientId">' + (db.clients.length ? db.clients.map(function (c) { return '<option value="' + c.id + '" ' + (c.id === inv.clientId ? 'selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') : '<option value="">— add a client first —</option>') + '</select></div>' +
      field('Issue date', 'issue', inv.issue, 'date') + field('Due date', 'due', inv.due, 'date') + field('Currency', 'currency', inv.currency, 'text', 'maxlength="3" style="text-transform:uppercase"') +
      '<div><label>Repeat</label><select name="rec">' + [['', 'Does not repeat'], ['month', 'Every month'], ['quarter', 'Every 3 months'], ['year', 'Every year']].map(function (o) { return '<option value="' + o[0] + '" ' + (((inv.rec || {}).every || '') === o[0] ? 'selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div><div><label>Status</label><select name="status">' + ['draft', 'sent', 'paid'].map(function (s) { return '<option ' + (s === inv.status ? 'selected' : '') + '>' + s + '</option>'; }).join('') + '</select></div></div></div>' +
      '<div class="card" style="margin-top:14px"><h2>Line items</h2><table class="items"><thead><tr><th>Description</th><th style="width:80px">Qty</th><th style="width:110px">Unit price</th><th style="width:80px">VAT %</th><th class="r" style="width:110px">Amount</th><th style="width:34px"></th></tr></thead><tbody id="items"></tbody></table>' +
      '<button class="btn s" id="add" style="margin-top:8px">+ Add line</button><div class="totals" id="tot"></div></div>' +
      '<div class="card" style="margin-top:14px"><label>Notes / payment info</label><textarea name="notes" rows="3">' + esc(inv.notes) + '</textarea></div>';
    function rows() {
      $('#items').innerHTML = inv.items.map(function (it, n) {
        return '<tr data-n="' + n + '"><td><input data-k="d" value="' + esc(it.d) + '" placeholder="Service or product"></td><td><input data-k="q" inputmode="decimal" value="' + esc(it.q) + '"></td><td><input data-k="p" inputmode="decimal" value="' + esc(it.p) + '"></td><td><input data-k="v" inputmode="decimal" value="' + esc(it.v) + '"></td><td class="r" data-amt>' + money(num(it.q) * num(it.p), inv.currency) + '</td><td><button class="btn s d" data-del title="Remove line" aria-label="Remove line">✕</button></td></tr>';
      }).join('');
      calc();
    }
    function calc() {
      var t = totals(inv), cur = inv.currency;
      $('#tot').innerHTML = '<div><span class="mut">Subtotal</span><span>' + money(t.net, cur) + '</span></div><div><span class="mut">VAT</span><span>' + money(t.vat, cur) + '</span></div><div class="t"><span>Total</span><span>' + money(t.gross, cur) + '</span></div>';
    }
    $('#items').oninput = function (e) {
      var tr = e.target.closest('tr'), k = e.target.dataset.k; if (!tr || !k) return;
      inv.items[+tr.dataset.n][k] = e.target.value; tr.querySelector('[data-amt]').textContent = money(num(inv.items[+tr.dataset.n].q) * num(inv.items[+tr.dataset.n].p), inv.currency); calc();
    };
    $('#items').onclick = function (e) { var b = e.target.closest('[data-del]'); if (!b) return; if (inv.items.length > 1) inv.items.splice(+b.closest('tr').dataset.n, 1); else inv.items[0] = { d: '', q: 1, p: '', v: db.settings.vat }; rows(); };
    $('#add').onclick = function () { inv.items.push({ d: '', q: 1, p: '', v: db.settings.vat }); rows(); var l = $('#items').querySelectorAll('tr'); l[l.length - 1].querySelector('input').focus(); };
    $('[name=currency]').oninput = function (e) { inv.currency = (e.target.value || db.settings.currency).toUpperCase(); rows(); };
    $('#save').onclick = function () {
      var g = function (n) { return val(view, n); };
      if (!db.clients.length || !g('clientId')) { toast('Add a client first (Clients page)'); return; }
      if (!g('number')) { toast('Invoice number is required'); return; }
      if (db.invoices.some(function (i) { return i.number === g('number') && i.id !== inv.id; })) { toast('That invoice number already exists'); return; }
      var prev = status(inv);
      inv.number = g('number'); inv.clientId = g('clientId'); inv.issue = g('issue') || today(); inv.due = g('due'); inv.currency = (g('currency') || db.settings.currency).toUpperCase().slice(0, 3);
      var ev = g('rec'); if (!ev) delete inv.rec; else if (!inv.rec || inv.rec.every !== ev) inv.rec = { every: ev, next: addMonths(inv.issue, ev === 'month' ? 1 : ev === 'quarter' ? 3 : 12) };
      inv.status = g('status'); inv.notes = view.querySelector('[name=notes]').value;
      if (inv.status === 'paid') inv.paidOn = inv.paidOn || today(); else delete inv.paidOn;
      inv.items = inv.items.filter(function (i) { return i.d || num(i.p); });
      if (!inv.items.length) { toast('Add at least one line item'); inv.items = [{ d: '', q: 1, p: '', v: db.settings.vat }]; rows(); return; }
      if (isNew) db.invoices.push(inv); else db.invoices[db.invoices.findIndex(function (i) { return i.id === inv.id; })] = inv;
      save(); toast('Invoice saved'); location.hash = '#/invoice/' + inv.id;
    };
    rows();
  }

  function invoiceDoc(id) {
    var inv = db.invoices.filter(function (i) { return i.id === id; })[0];
    if (!inv) { location.hash = '#/invoices'; return; }
    var c = clientOf(inv.clientId) || { name: '(deleted client)' }, s = db.settings, t = totals(inv), st = status(inv);
    view.innerHTML = '<div class="top noprint"><a href="#/invoices" class="btn">← Invoices</a><div class="row"><span class="tag ' + st + '">' + st + '</span>' +
      (st !== 'paid' ? '<button class="btn" id="paid">Mark as paid</button>' : '<button class="btn" id="unpaid">Mark unpaid</button>') +
      '<a class="btn" href="#/edit/' + inv.id + '">Edit</a><button class="btn" id="dup">Duplicate</button><button class="btn d" id="del">Delete</button><button class="btn p" id="print">Print / Save PDF</button></div></div>' +
      '<div class="doc"><div class="meta"><div><h1>Invoice</h1><div style="color:#667085">' + esc(inv.number) + '</div></div><div style="text-align:right"><b>' + esc(s.name || 'Your business') + '</b><pre>' + esc(s.address) + '</pre>' + (s.taxId ? '<div>Tax ID: ' + esc(s.taxId) + '</div>' : '') + (s.email ? '<div>' + esc(s.email) + '</div>' : '') + '</div></div>' +
      '<div class="meta"><div><small>Billed to</small><b>' + esc(c.name) + '</b><pre>' + esc(c.address || '') + '</pre>' + (c.taxId ? '<div>Tax ID: ' + esc(c.taxId) + '</div>' : '') + '</div><div><small>Issued</small>' + fdate(inv.issue) + '<br><small style="margin-top:8px">Due</small>' + fdate(inv.due) + '</div></div>' +
      '<table><thead><tr><th>Description</th><th class="r">Qty</th><th class="r">Unit price</th><th class="r">VAT</th><th class="r">Amount</th></tr></thead><tbody>' + inv.items.map(function (i) {
        return '<tr><td>' + esc(i.d) + '</td><td class="r">' + esc(i.q) + '</td><td class="r">' + money(num(i.p), inv.currency) + '</td><td class="r">' + esc(i.v) + '%</td><td class="r">' + money(num(i.q) * num(i.p), inv.currency) + '</td></tr>';
      }).join('') + '</tbody></table><div class="totals"><div><span>Subtotal</span><span>' + money(t.net, inv.currency) + '</span></div><div><span>VAT</span><span>' + money(t.vat, inv.currency) + '</span></div><div class="t"><span>Total due</span><span>' + money(t.gross, inv.currency) + '</span></div></div>' +
      (s.iban ? '<p style="margin-top:28px"><small>Pay by bank transfer</small>IBAN ' + esc(s.iban) + ' · Ref. ' + esc(inv.number) + '</p>' : '') + (inv.notes ? '<pre style="margin-top:18px;color:#444">' + esc(inv.notes) + '</pre>' : '') + '</div>';
    var set = function (fn) { fn(); save(); route(); };
    var p = $('#paid'), u = $('#unpaid');
    if (p) p.onclick = function () { set(function () { inv.status = 'paid'; inv.paidOn = today(); }); toast('Marked as paid'); };
    if (u) u.onclick = function () { set(function () { inv.status = 'sent'; delete inv.paidOn; }); };
    $('#print').onclick = function () { document.title = inv.number; window.print(); document.title = 'Ledgerly — invoices & expenses'; };
    $('#dup').onclick = function () { var n = JSON.parse(JSON.stringify(inv)); n.id = uid(); n.number = nextNumber(); n.status = 'draft'; n.issue = today(); n.due = addDays(today(), +s.terms || 30); delete n.paidOn; db.invoices.push(n); save(); location.hash = '#/edit/' + n.id; };
    $('#del').onclick = function () { ask('<h2>Delete ' + esc(inv.number) + '?</h2><p class="mut">This cannot be undone.</p>', function () { db.invoices = db.invoices.filter(function (i) { return i.id !== inv.id; }); save(); location.hash = '#/invoices'; }, 'Delete'); };
  }

  function clients() {
    view.innerHTML = '<div class="top"><h1>Clients</h1><button class="btn p" id="new">+ New client</button></div><div class="card" id="c"></div>';
    function draw() {
      $('#c').innerHTML = db.clients.length ? '<table><thead><tr><th>Name</th><th>Email</th><th>Tax ID</th><th class="r">Billed</th><th></th></tr></thead><tbody>' + db.clients.map(function (c) {
        var tot = db.invoices.filter(function (i) { return i.clientId === c.id && status(i) !== 'draft'; }).reduce(function (a, i) { return a + totals(i).gross; }, 0);
        return '<tr><td><b>' + esc(c.name) + '</b></td><td class="mut">' + esc(c.email) + '</td><td class="mut">' + esc(c.taxId) + '</td><td class="r">' + money(tot) + '</td><td class="r"><button class="btn s" data-e="' + c.id + '">Edit</button></td></tr>';
      }).join('') + '</tbody></table>' : '<div class="empty">No clients yet.</div>';
    }
    function form(c) {
      c = c || { id: uid(), name: '', email: '', taxId: '', address: '' };
      var isNew = !clientOf(c.id);
      ask('<h2>' + (isNew ? 'New client' : 'Edit client') + '</h2><div class="f">' + field('Name *', 'name', c.name, 'text', 'required') + field('Email', 'email', c.email, 'email') + field('Tax ID', 'taxId', c.taxId) +
        '<div class="w"><label>Address</label><textarea name="address" rows="3">' + esc(c.address) + '</textarea></div></div>' + (isNew ? '' : '<p><button type="button" class="btn s d" id="rm">Delete client</button></p>'), function (d) {
        var n = val(d, 'name'); if (!n) { toast('Name is required'); return; }
        c.name = n; c.email = val(d, 'email'); c.taxId = val(d, 'taxId'); c.address = d.querySelector('[name=address]').value.trim();
        if (isNew) db.clients.push(c); save(); draw(); toast('Client saved');
      });
      var rm = dlg.querySelector('#rm');
      if (rm) rm.onclick = function () {
        if (db.invoices.some(function (i) { return i.clientId === c.id; })) { toast('This client has invoices — delete those first'); return; }
        db.clients = db.clients.filter(function (x) { return x.id !== c.id; }); save(); dlg.close('x'); draw();
      };
    }
    $('#new').onclick = function () { form(); };
    $('#c').onclick = function (e) { var b = e.target.closest('[data-e]'); if (b) form(clientOf(b.dataset.e)); };
    draw();
  }

  var CATS = ['Groceries', 'Food & drinks', 'Fuel', 'Health', 'Home', 'Software', 'Equipment', 'Travel', 'Office', 'Marketing', 'Taxes & fees', 'Services', 'Other'];
  function expenses() {
    var y = new Date().getFullYear();
    view.innerHTML = '<div class="top"><h1>Expenses</h1><div class="row"><label class="btn" style="margin:0">🏦 Import bank statement<input type="file" id="csvf" accept=".csv,.txt,text/csv" hidden></label><label class="btn" style="margin:0">📷 Scan receipts<input type="file" id="scan" accept="image/*,application/pdf" multiple hidden></label><button class="btn" id="bud">Budgets</button><button class="btn" id="exp">Export CSV</button><button class="btn p" id="new">+ New expense</button></div></div><div id="bw"></div><div class="card" id="c"></div>';
    function draw() {
      if (typeof budgetBars === 'function') budgetBars();
      var l = db.expenses.slice().sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });
      var sum = l.filter(function (e) { return (e.date || '').slice(0, 4) == y; }).reduce(function (a, e) { return a + num(e.amount); }, 0);
      $('#c').innerHTML = l.length ? '<table><thead><tr><th>Date</th><th>Vendor</th><th>Category</th><th class="r">Amount</th><th></th></tr></thead><tbody>' + l.map(function (e) {
        return '<tr><td class="mut">' + fdate(e.date) + '</td><td><b>' + esc(e.vendor) + '</b>' + (e.auto ? ' <span class="tag draft">auto – check</span>' : '') + (e.file ? ' <a href="#" data-f="' + e.id + '" title="Open attachment">📎</a>' : '') + '<div class="mut">' + esc(e.note) + '</div></td><td><span class="tag">' + esc(e.cat) + '</span></td><td class="r">' + money(num(e.amount)) + '</td><td class="r"><button class="btn s" data-e="' + e.id + '">Edit</button></td></tr>';
      }).join('') + '</tbody></table><p class="mut" style="margin:12px 10px 0">Total in ' + y + ': <b style="color:var(--text)">' + money(sum) + '</b></p>' : '<div class="empty">No expenses yet.</div>';
    }
    function form(x, file) {
      x = x || { id: uid(), date: today(), vendor: '', cat: 'Other', amount: '', note: '' };
      var isNew = !db.expenses.some(function (e) { return e.id === x.id; });
      ask('<h2>' + (isNew ? 'New expense' : 'Edit expense') + '</h2><div class="f">' + privField(x) + field('Date', 'date', x.date, 'date') + field('Amount (incl. VAT)', 'amount', x.amount, 'text', 'inputmode="decimal" required') + field('VAT % in this amount', 'vat', x.vat == null ? db.settings.vat : x.vat, 'text', 'inputmode="decimal"') + field('Vendor *', 'vendor', x.vendor, 'text', 'required') +
        '<div><label>Category</label><select name="cat">' + CATS.map(function (c) { return '<option ' + (c === x.cat ? 'selected' : '') + '>' + c + '</option>'; }).join('') + '</select></div>' + '<div class="w">' + field('Note', 'note', x.note) + '</div>' + attachField(x, file) + '</div>' + (isNew ? '' : '<p><button type="button" class="btn s d" id="rm">Delete expense</button></p>'), function (d) {
        if (!val(d, 'vendor') || !num(val(d, 'amount'))) { toast('Vendor and amount are required'); return; }
        x.date = val(d, 'date') || today(); x.amount = num(val(d, 'amount')); x.vendor = val(d, 'vendor'); x.cat = val(d, 'cat'); x.note = val(d, 'note'); x.vat = num(val(d, 'vat')); saveAttach(x, d, file); delete x.auto;
        if (isNew) db.expenses.push(x); save(); draw(); toast('Expense saved');
      });
      var rm = dlg.querySelector('#rm'); if (rm) rm.onclick = function () { db.expenses = db.expenses.filter(function (e) { return e.id !== x.id; }); save(); dlg.close('x'); draw(); };
    }
    $('#csvf').onchange = function (ev) { var f = ev.target.files[0]; ev.target.value = ''; if (!f) return; f.text().then(function (t) { bankImport(t, draw); }); };
    $('#scan').onchange = function (ev) {
      var files = Array.prototype.slice.call(ev.target.files); ev.target.value = ''; if (!files.length) return;
      if (files.length === 1) { toast('Reading receipt…'); readFile(files[0]).then(function (t) { var r = parseReceipt(t); form(Object.assign({ id: uid(), date: today(), vendor: '', cat: 'Other', amount: '', note: '' }, r), files[0]); }).catch(function () { toast('Could not read it — fill in by hand'); form(null, files[0]); }); return; }
      var i = 0, added = 0; (function next() {
        if (i >= files.length) { save(); draw(); toast(added + ' of ' + files.length + ' receipts added — check the ones marked "auto"'); return; }
        toast('Reading receipt ' + (i + 1) + ' of ' + files.length + '…'); var f = files[i++];
        readFile(f).then(function (t) { var r = parseReceipt(t); if (r.amount) { var x = Object.assign({ id: uid(), date: today(), vendor: f.name, cat: 'Other', note: '', auto: true }, r); idbPut(x.id, f).catch(function () { }); x.file = { name: f.name, type: f.type }; db.expenses.push(x); added++; } }).catch(function () { }).then(next);
      })();
    };
    $('#bud').onclick = function () {
      var B = db.settings.budgets || {};
      ask('<h2>Monthly budgets</h2><p class="mut">Leave empty for no limit.</p><div class="f">' + CATS.map(function (c) { return field(c, 'b_' + c, B[c] || '', 'text', 'inputmode="decimal"'); }).join('') + '</div>', function (d) {
        var nb = {}; CATS.forEach(function (c) { var v = num(val(d, 'b_' + c)); if (v > 0) nb[c] = v; }); db.settings.budgets = nb; save(); budgetBars(); toast('Budgets saved');
      });
    };
    function budgetBars() {
      var B = db.settings.budgets || {}, ym = today().slice(0, 7), keys = Object.keys(B);
      $('#bw').innerHTML = keys.length ? '<div class="card" style="margin-bottom:14px"><h2>This month vs budget</h2>' + keys.map(function (c) {
        var sp = db.expenses.filter(function (e) { return e.cat === c && (e.date || '').slice(0, 7) === ym; }).reduce(function (a, e) { return a + num(e.amount); }, 0), r = sp / B[c];
        return '<div style="margin:10px 0"><div class="row" style="justify-content:space-between"><span>' + esc(c) + '</span><span class="mut">' + money(sp) + ' / ' + money(B[c]) + '</span></div><div style="height:8px;border-radius:9px;background:var(--bg);overflow:hidden"><div style="height:100%;width:' + Math.min(r, 1) * 100 + '%;background:' + (r > 1 ? 'var(--bad)' : r > .8 ? 'var(--warn)' : 'var(--ok)') + '"></div></div></div>';
      }).join('') + '</div>' : '';
    }
    budgetBars();
    $('#new').onclick = function () { form(); };
    $('#c').onclick = function (e) { var fa = e.target.closest('[data-f]'); if (fa) { e.preventDefault(); openAttach(fa.dataset.f); return; } var b = e.target.closest('[data-e]'); if (b) form(db.expenses.filter(function (x) { return x.id === b.dataset.e; })[0]); };
    $('#exp').onclick = function () { csv([['Date', 'Vendor', 'Category', 'Amount', 'Note']].concat(db.expenses.map(function (e) { return [e.date, e.vendor, e.cat, e.amount, e.note]; })), 'expenses.csv'); };
    draw();
  }


  function vatReport(yr) {
    var years = {}; db.invoices.forEach(function (i) { years[(i.issue || '').slice(0, 4)] = 1; }); db.expenses.forEach(function (e) { years[(e.date || '').slice(0, 4)] = 1; }); years[new Date().getFullYear()] = 1;
    var y = String(yr || new Date().getFullYear()), Q = [0, 1, 2, 3].map(function () { return { sales: 0, out: 0, spend: 0, inn: 0 }; });
    db.invoices.forEach(function (i) { if (i.status === 'draft' || (i.issue || '').slice(0, 4) !== y) return; var q = Math.floor((+i.issue.slice(5, 7) - 1) / 3), t = totals(i); Q[q].sales += t.net; Q[q].out += t.vat; });
    db.expenses.forEach(function (e) { if ((e.date || '').slice(0, 4) !== y) return; var q = Math.floor((+e.date.slice(5, 7) - 1) / 3), r = e.vat == null ? db.settings.vat : e.vat, a = num(e.amount); Q[q].spend += a; Q[q].inn += a - a / (1 + r / 100); });
    var tot = Q.reduce(function (a, q) { Object.keys(q).forEach(function (k) { a[k] = (a[k] || 0) + q[k]; }); return a; }, {});
    var row = function (n, q) { return '<tr><td><b>' + n + '</b></td><td class="r">' + money(q.sales) + '</td><td class="r">' + money(q.out) + '</td><td class="r">' + money(q.spend) + '</td><td class="r">' + money(q.inn) + '</td><td class="r"><b>' + money(q.out - q.inn) + '</b></td></tr>'; };
    view.innerHTML = '<div class="top"><h1>VAT report</h1><div class="row"><select id="yr" style="width:auto">' + Object.keys(years).sort().reverse().map(function (k) { return '<option ' + (k === y ? 'selected' : '') + '>' + k + '</option>'; }).join('') + '</select><button class="btn" id="vcsv">Export CSV</button></div></div>' +
      '<div class="card"><table><thead><tr><th></th><th class="r">Sales (net)</th><th class="r">VAT collected</th><th class="r">Expenses</th><th class="r">VAT deductible</th><th class="r">VAT to pay</th></tr></thead><tbody>' + Q.map(function (q, i) { return row('Q' + (i + 1), q); }).join('') + row('Year', tot).replace(/<tr>/, '<tr style="background:var(--bg)">') + '</tbody></table></div>' +
      '<p class="mut" style="margin-top:12px">Invoices count from the issue date, drafts are excluded. Expense VAT is taken from the "VAT %" you set on each expense. Amounts are summed as entered (no currency conversion). A summary to hand to your accountant — not a filing.</p>';
    $('#yr').onchange = function (e) { vatReport(e.target.value); };
    $('#vcsv').onclick = function () { csv([['Period', 'Sales net', 'VAT collected', 'Expenses', 'VAT deductible', 'VAT to pay']].concat(Q.map(function (q, i) { return ['Q' + (i + 1) + ' ' + y, round2(q.sales), round2(q.out), round2(q.spend), round2(q.inn), round2(q.out - q.inn)]; })).concat([['Year ' + y, round2(tot.sales), round2(tot.out), round2(tot.spend), round2(tot.inn), round2(tot.out - tot.inn)]]), 'vat-' + y + '.csv'); };
  }

  function settings() {
    var s = db.settings;
    view.innerHTML = '<div class="top"><h1>Settings</h1><button class="btn p" id="save">Save</button></div>' +
      '<div class="card"><h2>Your business</h2><div class="f">' + '<div class="w"><label>What do you use Ledgerly for?</label><select name="mode"><option value="both" ' + ((s.mode || 'both') === 'both' ? 'selected' : '') + '>Home and business</option><option value="home" ' + (s.mode === 'home' ? 'selected' : '') + '>Home & family only</option><option value="work" ' + (s.mode === 'work' ? 'selected' : '') + '>My business only</option></select></div>' + field('Your name / business name', 'name', s.name) + field('Tax ID', 'taxId', s.taxId) + field('Email', 'email', s.email, 'email') + field('IBAN', 'iban', s.iban) + '<div class="w"><label>Address</label><textarea name="address" rows="3">' + esc(s.address) + '</textarea></div></div></div>' +
      '<div class="card" style="margin-top:14px"><h2>Invoice defaults</h2><div class="f">' + field('Currency (ISO code)', 'currency', s.currency, 'text', 'maxlength="3"') + field('Default VAT %', 'vat', s.vat, 'text', 'inputmode="decimal"') + field('People sharing the household bills', 'people', s.people, 'number', 'min="1"') + field('Number prefix', 'prefix', s.prefix) + field('Payment terms (days)', 'terms', s.terms, 'number') +
      '<div class="w"><label>Default invoice footer</label><textarea name="footer" rows="2">' + esc(s.footer) + '</textarea></div></div></div>' +
      '<div class="card" style="margin-top:14px"><h2>Backup & data</h2><p class="mut">Everything is stored in this browser only. Export a backup regularly, and use it to move to another device.</p><div class="row"><button class="btn" id="bk">Export backup (.json)</button><label class="btn" style="margin:0">Import backup<input type="file" id="im" accept="application/json" hidden></label><button class="btn" id="demo">Load demo data</button><button class="btn d" id="wipe">Erase everything</button></div></div>' + extraSettingsHtml() + familyHtml();
    $('#save').onclick = function () {
      var g = function (n) { return val(view, n); };
      db.settings = Object.assign(db.settings, { mode: g('mode') || 'both', name: g('name'), taxId: g('taxId'), email: g('email'), iban: g('iban'), address: view.querySelector('[name=address]').value.trim(), currency: (g('currency') || 'EUR').toUpperCase().slice(0, 3), vat: num(g('vat')), prefix: g('prefix') || 'INV', people: Math.max(1, parseInt(g('people'), 10) || 1), terms: Math.max(0, parseInt(g('terms'), 10) || 0), footer: view.querySelector('[name=footer]').value });
      save(); applyMode(); toast('Settings saved');
    };
    $('#bk').onclick = function () { download(new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' }), 'ledgerly-backup-' + today() + '.json'); db.settings.lastExport = today(); save(); };
    extraSettingsWire(); familyWire();
    $('#im').onchange = function (e) {
      var f = e.target.files[0]; if (!f) return; var r = new FileReader();
      r.onload = function () {
        try { var d = JSON.parse(r.result); if (!d || !Array.isArray(d.invoices) || !Array.isArray(d.clients)) throw 0; ask('<h2>Replace current data?</h2><p class="mut">This backup has ' + d.invoices.length + ' invoices and ' + d.clients.length + ' clients. Your current data will be overwritten.</p>', function () { db = d; load2(); save(); route(); toast('Backup imported'); }, 'Replace'); }
        catch (x) { toast('That file is not a Ledgerly backup'); }
      }; r.readAsText(f);
    };
    $('#demo').onclick = function () { ask('<h2>Load demo data?</h2><p class="mut">This replaces your current data with a fictional sample.</p>', function () { demo(); save(); location.hash = '#/'; route(); }, 'Load demo'); };
    $('#wipe').onclick = function () { ask('<h2>Erase everything?</h2><p class="mut">All invoices, clients, expenses and settings in this browser will be deleted.</p>', function () { db = JSON.parse(JSON.stringify(DEFAULTS)); save(); route(); toast('All data erased'); }, 'Erase'); };
  }
  function load2() { db.settings = Object.assign({}, DEFAULTS.settings, db.settings); ['clients', 'invoices', 'expenses', 'bills', 'subs', 'income', 'loans', 'accounts', 'goals', 'nw', 'items', 'deadlines', 'groups'].forEach(function (k) { if (!Array.isArray(db[k])) db[k] = []; }); if (!db.offers || typeof db.offers !== 'object' || Array.isArray(db.offers)) db.offers = {}; }


  /* ---------- utilities: bills, trends and "why did it go up" ---------- */
  var BT = { electricity: { l: 'Electricity', u: 'kWh', c: '#e8a400' }, water: { l: 'Water', u: 'm³', c: '#2f8ae8' }, gas: { l: 'Gas', u: 'm³', c: '#e8590c' }, internet: { l: 'Internet / TV', u: '', c: '#8a5cf5' }, mobile: { l: 'Mobile', u: '', c: '#16a394' }, insurance: { l: 'Insurance', u: '', c: '#d6336c' }, rent: { l: 'Rent / condo', u: '', c: '#5c7cfa' }, other: { l: 'Other', u: '', c: '#667085' } };
  var billsType = 'all';
  function billUnit(b) { return b.usage > 0 ? b.amount / b.usage : null; }
  function byType(t) { return db.bills.filter(function (b) { return b.type === t; }).sort(function (a, b) { return a.date.localeCompare(b.date); }); }
  function pct(a, b) { return b ? (a - b) / b * 100 : null; }
  var fp = function (v) { return v == null ? '—' : (v > 0 ? '+' : '') + v.toFixed(1) + '%'; };
  function why(prev, cur) {          // splits the change into "paid more per unit" and "used more"
    var d = cur.amount - prev.amount, pu = billUnit(prev), cu = billUnit(cur);
    if (pu == null || cu == null) return { d: d, price: null, usage: null };
    var price = (cu - pu) * cur.usage, usage = (cur.usage - prev.usage) * pu;
    return { d: d, price: price, usage: usage };
  }
  function lineChart(list, key, color, fmt) {
    if (list.length < 2) return '<div class="empty" style="padding:20px">Add at least two bills to see a trend.</div>';
    var W = 600, H = 150, P = 8, v = list.map(key), mn = Math.min.apply(null, v), mx = Math.max.apply(null, v); if (mx === mn) { mx += 1; mn -= 1; }
    var pts = list.map(function (b, i) { return [P + i / (list.length - 1) * (W - 2 * P), H - P - (key(b) - mn) / (mx - mn) * (H - 2 * P)]; });
    return '<svg viewBox="0 0 ' + W + ' ' + (H + 18) + '" style="width:100%;height:auto"><polyline fill="none" stroke="' + color + '" stroke-width="2.5" stroke-linejoin="round" points="' + pts.map(function (p) { return p.join(','); }).join(' ') + '"/>' +
      pts.map(function (p, i) { return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="3.5" fill="' + color + '"><title>' + fdate(list[i].date) + ': ' + fmt(key(list[i])) + '</title></circle>'; }).join('') +
      '<text x="' + P + '" y="' + (H + 14) + '" font-size="11" fill="currentColor" opacity=".6">' + fdate(list[0].date) + '</text><text x="' + (W - P) + '" y="' + (H + 14) + '" font-size="11" text-anchor="end" fill="currentColor" opacity=".6">' + fdate(list[list.length - 1].date) + '</text></svg>';
  }
  function bills() {
    var types = Object.keys(BT).filter(function (t) { return db.bills.some(function (b) { return b.type === t; }); });
    if (billsType !== 'all' && types.indexOf(billsType) < 0) billsType = 'all';
    var shown = billsType === 'all' ? types : [billsType];
    view.innerHTML = '<div class="top"><h1>Utilities</h1><div class="row"><label class="btn" style="margin:0">📷 Import photo / PDF<input type="file" id="imp" accept="image/*,application/pdf" hidden></label><button class="btn p" id="new">+ Add bill</button></div></div>' +
      (types.length ? '<div class="row" style="margin-bottom:14px"><button class="btn s ' + (billsType === 'all' ? 'p' : '') + '" data-t="all">All</button>' + types.map(function (t) { return '<button class="btn s ' + (billsType === t ? 'p' : '') + '" data-t="' + t + '">' + BT[t].l + '</button>'; }).join('') + '</div>' : '') +
      alertsHtml(alerts().filter(function (a) { return billsType === 'all' || a.t === billsType; })) + (shown.length ? shown.map(billCard).join('') : '<div class="card empty">Add your water, electricity or gas bills (or import a photo/PDF) to see how they change over time and <b>why</b> they went up.<br><br><a href="#/settings">Load demo data</a> to see an example.</div>');
    $('#new').onclick = function () { billForm(); };
    $('#imp').onchange = function (e) { if (e.target.files[0]) importBill(e.target.files[0]); e.target.value = ''; };
    view.onclick = function (e) {
      var t = e.target.closest('[data-t]'); if (t) { billsType = t.dataset.t; bills(); return; }
      var fa = e.target.closest('[data-f]'); if (fa) { e.preventDefault(); openAttach(fa.dataset.f); return; }
      var fc = e.target.closest('[data-fc]'); if (fc) { forecastForm(fc.dataset.fc); return; }
      var o = e.target.closest('[data-o]'); if (o) { offerForm(o.dataset.o); return; }
      var b = e.target.closest('[data-e]'); if (b) billForm(db.bills.filter(function (x) { return x.id === b.dataset.e; })[0]);
    };
  }

  function annual(l) {               // yearly usage and cost estimated from the bills you entered
    var first = new Date(l[0].date), last = new Date(l[l.length - 1].date), gap = l.length > 1 ? (last - first) / 864e5 / (l.length - 1) : 30;
    var days = Math.max((last - first) / 864e5 + gap, 1), k = 365 / days;
    return { usage: l.reduce(function (a, b) { return a + (b.usage || 0); }, 0) * k, cost: l.reduce(function (a, b) { return a + b.amount; }, 0) * k, days: days };
  }
  function offerBox(t, l) {
    var T = BT[t], o = db.offers[t], a = annual(l), h = '<div class="card" style="margin-top:14px;background:var(--bg)"><div class="row" style="justify-content:space-between"><h2 style="margin:0">Compare a cheaper offer</h2><button class="btn s" data-o="' + t + '">' + (o ? 'Edit offer' : 'Add offer') + '</button></div>';
    if (!o) return h + '<p class="mut" style="margin:8px 0 0">Found a better tariff in the <a href="https://www.erse.pt/simuladores/precos-de-energia/" target="_blank" rel="noopener">ERSE simulator</a>? Enter its price here to see what you would save per year with your real usage.</p></div>';
    if (!T.u || a.usage <= 0) return h + '<p class="mut">Add usage (' + (T.u || 'units') + ') to your bills to compare offers.</p></div>';
    var offer = a.usage * o.price + (o.fixed || 0) * 12, save = a.cost - offer;
    return h + '<p style="margin:10px 0 0"><b>' + esc(o.name || 'This offer') + '</b>: ' + o.price.toFixed(4) + ' per ' + T.u + (o.fixed ? ' + ' + money(o.fixed) + '/month' : '') + '</p><div class="grid g4" style="margin-top:10px">' +
      '<div class="card kpi"><small>You pay now (per year)</small><b>' + money(a.cost) + '</b></div><div class="card kpi"><small>With this offer</small><b>' + money(offer) + '</b></div><div class="card kpi ' + (save > 0 ? 'ok' : 'bad') + '"><small>' + (save > 0 ? 'You would save' : 'You would pay more') + '</small><b>' + money(Math.abs(save)) + '/yr</b></div></div>' +
      '<p class="mut" style="font-size:12px;margin:10px 0 0">Based on ~' + Math.round(a.usage) + ' ' + T.u + '/year (from ' + l.length + ' bills). Your current cost already includes taxes and fixed fees, so enter the offer\'s price <b>with VAT and taxes</b> (and its fixed fee) for a fair comparison. Estimate only; check the final terms.</p></div>';
  }
  function offerForm(t) {
    var o = db.offers[t] || { name: '', price: '', fixed: '' };
    ask('<h2>Offer for ' + BT[t].l.toLowerCase() + '</h2><div class="f">' + field('Supplier / tariff name', 'name', o.name) + field('Price per ' + (BT[t].u || 'unit') + ' (with VAT)', 'price', o.price, 'text', 'inputmode="decimal" required') + field('Fixed fee per month (with VAT)', 'fixed', o.fixed, 'text', 'inputmode="decimal"') + '</div>' + (db.offers[t] ? '<p><button type="button" class="btn s d" id="rm">Remove offer</button></p>' : ''), function (d) {
      if (!num(val(d, 'price'))) { toast('Price is required'); return; }
      db.offers[t] = { name: val(d, 'name'), price: num(val(d, 'price')), fixed: num(val(d, 'fixed')) }; save(); bills(); toast('Offer saved');
    });
    var rm = dlg.querySelector('#rm'); if (rm) rm.onclick = function () { delete db.offers[t]; save(); dlg.close('x'); bills(); };
  }


  /* ---------- attachments (IndexedDB; not part of the JSON backup) ---------- */
  function idb() { return new Promise(function (ok, no) { var r = indexedDB.open('ledgerly-files', 1); r.onupgradeneeded = function () { r.result.createObjectStore('f'); }; r.onsuccess = function () { ok(r.result); }; r.onerror = function () { no(r.error); }; }); }
  function idbPut(k, blob) { return idb().then(function (d) { return new Promise(function (ok, no) { var t = d.transaction('f', 'readwrite'); t.objectStore('f').put(blob, k); t.oncomplete = ok; t.onerror = function () { no(t.error); }; }); }); }
  function idbGet(k) { return idb().then(function (d) { return new Promise(function (ok, no) { var r = d.transaction('f').objectStore('f').get(k); r.onsuccess = function () { ok(r.result); }; r.onerror = function () { no(r.error); }; }); }); }
  function idbDel(k) { return idb().then(function (d) { d.transaction('f', 'readwrite').objectStore('f').delete(k); }).catch(function () { }); }
  function attachField(it, imported) {
    return '<div class="w"><label>Attachment (photo or PDF)</label>' + (imported ? '<p class="mut" style="margin:0 0 4px">📎 ' + esc(imported.name) + ' will be attached.</p>' : '') + (it.file ? '<p class="mut" style="margin:0 0 4px">Current: ' + esc(it.file.name) + ' <label style="display:inline"><input type="checkbox" name="rmfile" style="width:auto"> remove</label></p>' : '') + '<input type="file" name="file" accept="image/*,application/pdf"></div>';
  }
  function saveAttach(it, d, imported) {
    var inp = d.querySelector('[name=file]'), f = (inp && inp.files[0]) || imported;
    if (d.querySelector('[name=rmfile]') && d.querySelector('[name=rmfile]').checked) { idbDel(it.id); delete it.file; }
    if (f) { if (f.size > 8 * 1024 * 1024) { toast('Attachment is over 8 MB — not saved'); return; } it.file = { name: f.name, type: f.type }; idbPut(it.id, f).catch(function () { toast('Could not store the attachment'); }); }
  }
  function openAttach(id) {
    idbGet(id).then(function (b) { if (!b) { toast('Attachment not found on this device'); return; } window.open(URL.createObjectURL(b), '_blank'); }).catch(function () { toast('Could not open the attachment'); });
  }

  /* ---------- alerts, upcoming payments, forecast ---------- */
  function alerts() {
    var out = [];
    Object.keys(BT).forEach(function (t) {
      var l = byType(t); if (l.length < 2) return; var c = l[l.length - 1], p = l[l.length - 2], T = BT[t];
      var ch = pct(c.amount, p.amount), uc = (c.usage && p.usage) ? pct(c.usage, p.usage) : null, up = billUnit(c), pp = billUnit(p), pc = (up && pp) ? pct(up, pp) : null;
      if (pc != null && pc > 5 && ch > 5) out.push({ t: t, l: 'warn', x: T.l + ': price per ' + T.u + ' rose ' + pc.toFixed(1) + '% (' + pp.toFixed(3) + ' → ' + up.toFixed(3) + '). Usage ' + (uc == null ? '' : (uc > 0 ? 'rose ' : 'fell ') + Math.abs(uc).toFixed(0) + '%') + ' — check for a tariff change.' });
      else if (uc == null && ch > 10) out.push({ t: t, l: 'warn', x: T.l + ': the last bill is ' + ch.toFixed(0) + '% higher (' + money(p.amount) + ' → ' + money(c.amount) + ').' });
      if (t === 'water' && l.length >= 4) { var avg = l.slice(-4, -1).reduce(function (a, b) { return a + (b.usage || 0); }, 0) / 3; if (avg && c.usage > avg * 1.4) out.push({ t: t, l: 'bad', x: 'Water: usage is ' + Math.round((c.usage / avg - 1) * 100) + '% above your recent average — possible leak or unusual use.' }); }
    });
    db.subs.forEach(function (x) { if (x.active !== false && x.history && x.history.length > 1) { var h = x.history, c = pct(h[h.length - 1].a, h[h.length - 2].a); if (c > 0.5 && h[h.length - 1].d >= addDays(today(), -90)) out.push({ t: 'subs', l: 'warn', x: x.name + ' went up ' + c.toFixed(0) + '% (' + money(h[h.length - 2].a) + ' → ' + money(h[h.length - 1].a) + ').' }); } });
    return out;
  }
  function alertsHtml(list) {
    return list.length ? '<div class="card" style="margin-bottom:14px;border-color:var(--warn)"><h2>⚠️ Heads up</h2>' + list.map(function (a) { return '<div style="padding:4px 0">• ' + esc(a.x) + '</div>'; }).join('') + '</div>' : '';
  }
  function upcoming() {
    var out = [];
    db.bills.forEach(function (b) { if (b.due && b.paid === false) out.push({ d: b.due, t: BT[b.type].l + (b.provider ? ' · ' + b.provider : ''), a: b.amount, href: '#/bills' }); });
    db.invoices.forEach(function (i) { var st = status(i); if ((st === 'sent' || st === 'overdue') && i.due) { var c = clientOf(i.clientId); out.push({ d: i.due, t: 'Invoice ' + i.number + ' (to receive)' + (c ? ' · ' + c.name : ''), a: totals(i).gross, href: '#/invoice/' + i.id, inc: true }); } });
    db.subs.forEach(function (x) { if (x.active === false) return; var r = nextRenewal(x); if (r && r <= addDays(today(), 14)) out.push({ d: r, t: x.name + ' (subscription)', a: x.amount, href: '#/subs' }); });
    db.deadlines.forEach(function (x) { var d = nextDeadline(x); if (d && d <= addDays(today(), 30)) out.push({ d: d, t: x.name, a: x.amount || 0, href: '#/reminders' }); });
    db.items.forEach(function (x) { var e = warrantyEnd(x); if (e && e >= today() && e <= addDays(today(), 30)) out.push({ d: e, t: 'Warranty ends: ' + x.name, a: 0, href: '#/reminders' }); });
    return out.sort(function (a, b) { return a.d.localeCompare(b.d); });
  }
  function upcomingHtml() {
    var l = upcoming(); if (!l.length) return '';
    return '<div class="card" style="margin-top:14px"><h2>Upcoming & overdue</h2><table><tbody>' + l.slice(0, 8).map(function (u) {
      var late = u.d < today(); return '<tr class="click" onclick="location.hash=\'' + u.href + '\'"><td class="mut" style="width:120px">' + fdate(u.d) + '</td><td>' + esc(u.t) + '</td><td>' + (late ? '<span class="tag overdue">overdue</span>' : '') + '</td><td class="r"><b style="color:' + (u.inc ? 'var(--ok)' : 'inherit') + '">' + (u.a ? (u.inc ? '+' : '−') + money(u.a) : '') + '</b></td></tr>';
    }).join('') + '</tbody></table></div>';
  }
  function forecastForm(t) {
    var T = BT[t], l = byType(t), last = l[l.length - 1]; if (!T.u || !last || !last.usage) { toast('Add usage to your bills first'); return; }
    var gap = l.length > 1 ? Math.round((new Date(last.date) - new Date(l[l.length - 2].date)) / 864e5) : 30;
    ask('<h2>Forecast the next ' + T.l.toLowerCase() + ' bill</h2><p class="mut">Read your meter now and compare with the reading at the start of the period.</p><div class="f">' + field(T.u + ' used so far', 'used', '', 'text', 'inputmode="decimal" required') + field('Days since the period started', 'days', '', 'number', 'min="1" required') + field('Days in a billing period', 'per', gap, 'number') + '</div><div id="fc" class="card kpi" style="margin-top:12px" hidden></div>', function (d) {
      var used = num(val(d, 'used')), days = Math.max(1, num(val(d, 'days'))), per = Math.max(days, num(val(d, 'per')) || 30);
      var proj = used / days * per, price = billUnit(last), cost = proj * price;
      toast('Estimated ' + Math.round(proj) + ' ' + T.u + ' ≈ ' + money(cost) + ' (last bill ' + money(last.amount) + ')');
    }, 'Estimate');
  }


  /* ---------- subscriptions: streaming, IPTV, apps, gym… ---------- */
  var SC = { streaming: 'Streaming (video)', iptv: 'IPTV / TV', music: 'Music / audio', software: 'Software / apps', cloud: 'Cloud / storage', gaming: 'Gaming', news: 'News / magazines', fitness: 'Gym / fitness', domain: 'Domains / hosting', vpn: 'VPN / security', donation: 'Donations / Patreon', other: 'Other' };
  var SN = { 'Netflix': 'streaming', 'Disney+': 'streaming', 'HBO Max': 'streaming', 'Prime Video / Amazon Prime': 'streaming', 'Apple TV+': 'streaming', 'SkyShowtime': 'streaming', 'Crunchyroll': 'streaming', 'YouTube Premium': 'streaming', 'DAZN': 'streaming', 'Spotify': 'music', 'Apple Music': 'music', 'Audible': 'music', 'IPTV': 'iptv', 'NOS / MEO / Vodafone TV': 'iptv', 'iCloud+': 'cloud', 'Google One': 'cloud', 'Dropbox': 'cloud', 'ChatGPT / Claude / AI': 'software', 'Microsoft 365': 'software', 'Adobe': 'software', 'Xbox Game Pass': 'gaming', 'PlayStation Plus': 'gaming', 'Nintendo Online': 'gaming', 'Gym': 'fitness', 'NordVPN / VPN': 'vpn', '1Password / Bitwarden': 'vpn', 'Domain / hosting': 'domain', 'Patreon / donations': 'donation' };
  var FORGET = [['Domain renewals', 'domain', 'yearly'], ['App Store / Google Play subscriptions', 'software', 'monthly'], ['Cloud storage (iCloud / Google One)', 'cloud', 'monthly'], ['VPN', 'vpn', 'yearly'], ['Password manager', 'vpn', 'yearly'], ['Gym / sports club', 'fitness', 'monthly'], ['Amazon Prime', 'streaming', 'yearly'], ['AI tools (ChatGPT, Claude…)', 'software', 'monthly'], ['Games (Game Pass, PS Plus…)', 'gaming', 'monthly'], ['Newspapers / magazines', 'news', 'monthly'], ['Donations / Patreon', 'donation', 'monthly'], ['Car insurance', 'other', 'yearly'], ['Annual car tax (IUC)', 'other', 'yearly'], ['Car inspection', 'other', 'yearly'], ['Health / life insurance', 'other', 'monthly'], ['Phone insurance / warranty', 'other', 'yearly']];
  var CY = { weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Every 3 months', yearly: 'Yearly' };
  function monthly(x) { var a = +x.amount || 0; return x.cycle === 'yearly' ? a / 12 : x.cycle === 'quarterly' ? a / 3 : x.cycle === 'weekly' ? a * 52 / 12 : a; }
  function stepDate(iso, cy) { return cy === 'weekly' ? addDays(iso, 7) : addMonths(iso, cy === 'yearly' ? 12 : cy === 'quarterly' ? 3 : 1); }
  function nextRenewal(x) { if (!x.next) return ''; var d = x.next, n = 0; while (d < today() && n++ < 600) d = stepDate(d, x.cycle); return d; }
  function share(x) { return Math.max(1, +x.people || 1); }
  var mineM = function (x) { return monthly(x) / share(x); };

  function subs() {
    var act = db.subs.filter(function (x) { return x.active !== false; }), off = db.subs.filter(function (x) { return x.active === false; });
    var m = act.reduce(function (a, x) { return a + mineM(x); }, 0), byCat = {};
    act.forEach(function (x) { byCat[x.cat] = (byCat[x.cat] || 0) + mineM(x); });
    var cats = Object.keys(byCat).sort(function (a, b) { return byCat[b] - byCat[a]; }), cmax = cats.length ? byCat[cats[0]] : 1;
    var tips = [], stream = act.filter(function (x) { return x.cat === 'streaming'; });
    if (stream.length >= 3) tips.push('You pay for ' + stream.length + ' video services (' + money(stream.reduce(function (a, x) { return a + mineM(x); }, 0)) + '/month). Rotating them month to month is a common way to save.');
    if (act.some(function (x) { return x.cat === 'iptv'; }) && stream.length) tips.push('You have IPTV and streaming at the same time — check for overlap.');
    act.forEach(function (x) { if (x.trial) tips.push(x.name + ': free trial — renews ' + fdate(nextRenewal(x)) + '. Cancel before if you do not want it.'); });
    var dueSoon = act.filter(function (x) { var r = nextRenewal(x); return r && r <= addDays(today(), 7); });
    if (dueSoon.length) tips.push('Renewing in the next 7 days: ' + dueSoon.map(function (x) { return x.name + ' (' + money(x.amount) + ')'; }).join(', ') + '.');
    view.innerHTML = '<div class="top"><h1>Subscriptions</h1><button class="btn p" id="new">+ Add subscription</button></div>' +
      (tips.length ? '<div class="card" style="margin-bottom:14px"><h2>💡 Worth a look</h2>' + tips.map(function (t) { return '<div style="padding:3px 0">• ' + esc(t) + '</div>'; }).join('') + '</div>' : '') +
      (act.length ? '<div class="grid g4"><div class="card kpi"><small>Per month</small><b>' + money(m) + '</b></div><div class="card kpi"><small>Per year</small><b>' + money(m * 12) + '</b></div><div class="card kpi"><small>Active</small><b>' + act.length + '</b></div>' + (off.length ? '<div class="card kpi ok"><small>Saved by cancelling</small><b>' + money(off.reduce(function (a, x) { return a + mineM(x); }, 0)) + '/mo</b></div>' : '') + '</div>' +
        '<div class="card" style="margin-top:14px"><h2>Where the money goes</h2>' + cats.map(function (c) { return '<div style="margin:9px 0"><div class="row" style="justify-content:space-between"><span>' + esc(SC[c] || c) + '</span><span class="mut">' + money(byCat[c]) + '/mo</span></div><div style="height:8px;border-radius:9px;background:var(--bg);overflow:hidden"><div style="height:100%;width:' + byCat[c] / cmax * 100 + '%;background:var(--acc)"></div></div></div>'; }).join('') + '</div>' +
        '<div class="card" style="margin-top:14px"><h2>Active</h2>' + subTable(act.sort(function (a, b) { return nextRenewal(a).localeCompare(nextRenewal(b)); })) + '</div>' : '<div class="card empty">No subscriptions yet. Add the ones you know, then use the checklist below for the ones you may have forgotten.</div>') +
      (off.length ? '<div class="card" style="margin-top:14px"><h2>Cancelled</h2>' + subTable(off) + '</div>' : '') +
      '<div class="card" style="margin-top:14px"><h2>Did you forget any of these?</h2><div class="row">' + FORGET.map(function (f, i) { return '<button class="btn s" data-fg="' + i + '">+ ' + esc(f[0]) + '</button>'; }).join('') + '</div><p class="mut" style="font-size:12px;margin:10px 0 0">Tip: check your bank statements and the subscription lists in the App Store / Google Play — that is where forgotten ones hide.</p></div>';
    $('#new').onclick = function () { subForm(); };
    view.onclick = function (e) {
      var b = e.target.closest('[data-e]'); if (b) return subForm(db.subs.filter(function (x) { return x.id === b.dataset.e; })[0]);
      var f = e.target.closest('[data-fg]'); if (f) { var g = FORGET[+f.dataset.fg]; subForm(null, { name: g[0], cat: g[1], cycle: g[2] }); return; }
      var t = e.target.closest('[data-tg]'); if (t) { var x = db.subs.filter(function (y) { return y.id === t.dataset.tg; })[0]; x.active = x.active === false; if (x.active === false) x.cancelledOn = today(); else delete x.cancelledOn; save(); subs(); toast(x.active === false ? 'Marked as cancelled' : 'Reactivated'); }
    };
  }
  function subTable(l) {
    return '<table><thead><tr><th>Name</th><th>Category</th><th class="r">Price</th><th class="r">Per month</th><th>Next renewal</th><th></th></tr></thead><tbody>' + l.map(function (x) {
      var ch = x.history && x.history.length > 1 ? pct(x.history[x.history.length - 1].a, x.history[x.history.length - 2].a) : null;
      return '<tr><td><b>' + esc(x.name) + '</b>' + (x.trial ? ' <span class="tag draft">trial</span>' : '') + (share(x) > 1 ? ' <span class="tag">shared ÷' + share(x) + '</span>' : '') + (x.note ? '<div class="mut">' + esc(x.note) + '</div>' : '') + '</td><td class="mut">' + esc(SC[x.cat] || x.cat) + '</td><td class="r">' + money(x.amount) + '<div class="mut" style="font-size:12px">' + CY[x.cycle] + (ch ? ' · <span style="color:' + (ch > 0 ? 'var(--bad)' : 'var(--ok)') + '">' + fp(ch) + '</span>' : '') + '</div></td><td class="r">' + money(mineM(x)) + '</td><td class="mut">' + (x.active === false ? '—' : fdate(nextRenewal(x))) + '</td><td class="r"><button class="btn s" data-e="' + x.id + '">Edit</button> <button class="btn s ' + (x.active === false ? '' : 'd') + '" data-tg="' + x.id + '">' + (x.active === false ? 'Reactivate' : 'Cancel') + '</button></td></tr>';
    }).join('') + '</tbody></table>';
  }
  function subForm(x, pre) {
    x = x || Object.assign({ id: uid(), name: '', cat: 'streaming', amount: '', cycle: 'monthly', next: addDays(today(), 30), people: 1, active: true, trial: false, note: '', history: [] }, pre || {});
    var isNew = !db.subs.some(function (y) { return y.id === x.id; });
    ask('<h2>' + (isNew ? 'Add subscription' : 'Edit subscription') + '</h2>' + '<datalist id="subnames">' + Object.keys(SN).map(function (n) { return '<option value="' + esc(n) + '">'; }).join('') + '</datalist><div class="f">' + privField(x) +
      field('Name *', 'name', x.name, 'text', 'list="subnames" required') + '<div><label>Category</label><select name="cat">' + Object.keys(SC).map(function (c) { return '<option value="' + c + '" ' + (c === x.cat ? 'selected' : '') + '>' + SC[c] + '</option>'; }).join('') + '</select></div>' +
      field('Price', 'amount', x.amount, 'text', 'inputmode="decimal" required') + '<div><label>Billed</label><select name="cycle">' + Object.keys(CY).map(function (c) { return '<option value="' + c + '" ' + (c === x.cycle ? 'selected' : '') + '>' + CY[c] + '</option>'; }).join('') + '</select></div>' +
      field('Next renewal date', 'next', x.next, 'date') + field('Shared between (people)', 'people', x.people, 'number', 'min="1"') +
      '<div><label>Free trial?</label><select name="trial"><option value="0">No</option><option value="1" ' + (x.trial ? 'selected' : '') + '>Yes — renews at this price</option></select></div>' + field('Note / login email', 'note', x.note) + '</div>' +
      (isNew ? '' : '<p><button type="button" class="btn s d" id="rm">Delete</button></p>'), function (d) {
      var n = val(d, 'name'), a = num(val(d, 'amount')); if (!n || !a) { toast('Name and price are required'); return; }
      var prev = x.history && x.history.length ? x.history[x.history.length - 1].a : null;
      x.name = n; x.cat = val(d, 'cat'); x.amount = a; x.cycle = val(d, 'cycle'); x.next = val(d, 'next') || today(); x.people = Math.max(1, parseInt(val(d, 'people'), 10) || 1); x.trial = val(d, 'trial') === '1'; x.note = val(d, 'note');
      x.history = x.history || []; if (prev !== a) x.history.push({ d: today(), a: a });
      if (isNew) db.subs.push(x); save(); subs(); toast(prev != null && prev !== a ? n + ': price changed ' + fp(pct(a, prev)) : 'Saved');
    });
    var nm = dlg.querySelector('[name=name]'); nm.addEventListener('input', function () { if (SN[nm.value]) dlg.querySelector('[name=cat]').value = SN[nm.value]; });
    var rm = dlg.querySelector('#rm'); if (rm) rm.onclick = function () { db.subs = db.subs.filter(function (y) { return y.id !== x.id; }); save(); dlg.close('x'); subs(); };
  }


  function readFile(f) { return f.type === 'application/pdf' ? readPdf(f) : readImage(f); }
  function parseReceipt(text) {
    var r = parseBill(text), low = text.toLowerCase(), o = {};
    if (r.amount) o.amount = r.amount; if (r.date) o.date = r.date;
    var line = text.split(/\n/).map(function (l) { return l.trim(); }).filter(function (l) { return /[a-zà-ú]{3,}/i.test(l); })[0]; if (line) o.vendor = line.slice(0, 40);
    o.cat = /continente|pingo doce|lidl|aldi|minipre|mercadona|auchan|intermarch|supermerc|mercearia/.test(low) ? 'Groceries' : /galp|repsol|bp\b|prio|cepsa|combust|gas[oó]leo|gasolina/.test(low) ? 'Fuel' : /restaurante|caf[eé]|pastelaria|pizz|burger|mcdonald|starbucks|take.?away/.test(low) ? 'Food & drinks' : /farm[aá]cia|cl[ií]nica|hospital|sa[uú]de|m[eé]dic/.test(low) ? 'Health' : /leroy|ikea|aki\b|bricolage/.test(low) ? 'Home' : 'Other';
    var v = low.match(/(?:iva|vat)[^\d\n]{0,12}(6|13|23)\s*%?/) || low.match(/\b(6|13|23)\s*%/); if (v) o.vat = +v[1];
    return o;
  }

  /* ---------- income & loans ---------- */
  var IC = { monthly: 'Monthly', yearly: 'Yearly (e.g. holiday pay, bonus)', weekly: 'Weekly' };
  var incM = function (x) { var a = +x.amount || 0; return x.cycle === 'yearly' ? a / 12 : x.cycle === 'weekly' ? a * 52 / 12 : a; };
  function nextPay(x) { if (x.cycle !== 'monthly' || !x.day) return ''; var d = new Date(); var iso = function (dt) { return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0'); }; var last = function (y, m) { return new Date(y, m + 1, 0).getDate(); }; var c = new Date(d.getFullYear(), d.getMonth(), Math.min(x.day, last(d.getFullYear(), d.getMonth()))); if (iso(c) < today()) c = new Date(d.getFullYear(), d.getMonth() + 1, Math.min(x.day, last(d.getFullYear(), d.getMonth() + 1))); return iso(c); }
  function incomePage() {
    var l = db.income, m = l.filter(function (x) { return x.active !== false; }).reduce(function (a, x) { return a + incM(x); }, 0);
    view.innerHTML = '<div class="top"><h1>Income</h1><button class="btn p" id="new">+ Add income</button></div>' +
      (l.length ? '<div class="grid g4"><div class="card kpi ok"><small>Per month (average)</small><b>' + money(m) + '</b></div><div class="card kpi"><small>Per year</small><b>' + money(m * 12) + '</b></div></div><div class="card" style="margin-top:14px"><table><thead><tr><th>Source</th><th>Type</th><th class="r">Amount</th><th>Next payment</th><th></th></tr></thead><tbody>' + l.map(function (x) {
        return '<tr><td><b>' + esc(x.source) + '</b>' + (x.who ? ' <span class="tag">' + esc(x.who) + '</span>' : '') + (x.private ? ' <span class="tag">private</span>' : '') + (x.active === false ? ' <span class="tag">stopped</span>' : '') + (x.note ? '<div class="mut">' + esc(x.note) + '</div>' : '') + '</td><td class="mut">' + esc(IC[x.cycle] || x.cycle) + '</td><td class="r"><b>' + money(x.amount) + '</b></td><td class="mut">' + (x.active === false ? '—' : fdate(nextPay(x))) + '</td><td class="r"><button class="btn s" data-e="' + x.id + '">Edit</button></td></tr>';
      }).join('') + '</tbody></table></div>' : '<div class="card empty">Add your salary (net, what lands in your account) and any other income. The dashboard then shows what is left after bills, subscriptions and loans.</div>');
    $('#new').onclick = function () { incForm(); };
    view.onclick = function (e) { var b = e.target.closest('[data-e]'); if (b) incForm(db.income.filter(function (x) { return x.id === b.dataset.e; })[0]); };
  }
  function incForm(x) {
    x = x || { id: uid(), source: 'Salary', amount: '', cycle: 'monthly', day: 25, active: true, note: '' };
    var isNew = !db.income.some(function (y) { return y.id === x.id; });
    ask('<h2>' + (isNew ? 'Add income' : 'Edit income') + '</h2><div class="f">' + privField(x) + field('Source', 'source', x.source) + field('Whose? (e.g. Ana)', 'who', x.who || '') + field('Amount (net)', 'amount', x.amount, 'text', 'inputmode="decimal" required') +
      '<div><label>How often</label><select name="cycle">' + Object.keys(IC).map(function (c) { return '<option value="' + c + '" ' + (c === x.cycle ? 'selected' : '') + '>' + IC[c] + '</option>'; }).join('') + '</select></div>' + field('Day of the month it arrives', 'day', x.day || '', 'number', 'min="1" max="31"') +
      '<div><label>Status</label><select name="active"><option value="1">Active</option><option value="0" ' + (x.active === false ? 'selected' : '') + '>Stopped</option></select></div>' + field('Note', 'note', x.note) + '</div>' + (isNew ? '' : '<p><button type="button" class="btn s d" id="rm">Delete</button></p>'), function (d) {
      var a = num(val(d, 'amount')); if (!a) { toast('Amount is required'); return; }
      x.source = val(d, 'source') || 'Income'; x.who = val(d, 'who'); x.amount = a; x.cycle = val(d, 'cycle'); x.day = Math.min(31, Math.max(0, parseInt(val(d, 'day'), 10) || 0)); x.active = val(d, 'active') !== '0'; x.note = val(d, 'note');
      if (isNew) db.income.push(x); save(); incomePage(); toast('Saved');
    });
    var rm = dlg.querySelector('#rm'); if (rm) rm.onclick = function () { db.income = db.income.filter(function (y) { return y.id !== x.id; }); save(); dlg.close('x'); incomePage(); };
  }
  function loanInfo(L) {
    var P = +L.principal || 0, i = (+L.rate || 0) / 1200, n = +L.term || 0, pay = +L.payment || 0;
    if (!pay && n) pay = i ? P * i / (1 - Math.pow(1 + i, -n)) : P / n;
    var st = new Date((L.start || today()) + 'T12:00:00'), nw = new Date(), k = Math.max(0, (nw.getFullYear() - st.getFullYear()) * 12 + nw.getMonth() - st.getMonth() - (nw.getDate() < st.getDate() ? 1 : 0));
    var bal = P, paidInt = 0, m = 0; while (m < k && bal > 0) { var it = bal * i; paidInt += it; bal = bal + it - pay; m++; } bal = Math.max(bal, 0);
    var left = 0, intLeft = 0, b2 = bal, stuck = false; while (b2 > 0.005 && left < 1200) { var it2 = b2 * i; if (pay <= it2 && left === 0) { stuck = true; break; } intLeft += it2; b2 = b2 + it2 - pay; left++; }
    return { pay: pay, bal: bal, paidInt: paidInt, left: left, intLeft: intLeft, end: left ? addMonths(today(), left) : '', progress: P ? 1 - bal / P : 0, stuck: stuck, done: bal <= 0.005 };
  }
  function loansPage() {
    var act = db.loans.map(function (L) { return { L: L, i: loanInfo(L) }; }), tot = act.reduce(function (a, o) { return { bal: a.bal + o.i.bal, pay: a.pay + (o.i.done ? 0 : o.i.pay), int: a.int + o.i.intLeft }; }, { bal: 0, pay: 0, int: 0 });
    view.innerHTML = '<div class="top"><h1>Loans & credit</h1><button class="btn p" id="new">+ Add loan</button></div>' +
      (act.length ? '<div class="grid g4"><div class="card kpi"><small>Total still owed</small><b>' + money(tot.bal) + '</b></div><div class="card kpi"><small>Paid per month</small><b>' + money(tot.pay) + '</b></div><div class="card kpi bad"><small>Interest still to pay</small><b>' + money(tot.int) + '</b></div></div>' + act.map(function (o) {
        var L = o.L, I = o.i; return '<div class="card" style="margin-top:14px"><div class="row" style="justify-content:space-between"><h2 style="margin:0">' + esc(L.name) + (L.lender ? ' <span class="mut" style="font-weight:400">· ' + esc(L.lender) + '</span>' : '') + '</h2><button class="btn s" data-e="' + L.id + '">Edit</button></div>' +
          '<div style="height:10px;border-radius:9px;background:var(--bg);overflow:hidden;margin:12px 0 6px"><div style="height:100%;width:' + Math.min(100, I.progress * 100) + '%;background:var(--ok)"></div></div><div class="mut" style="font-size:12px">' + (I.progress * 100).toFixed(0) + '% repaid of ' + money(L.principal) + '</div>' +
          '<div class="grid g4" style="margin-top:12px"><div class="card kpi"><small>Still owed (estimate)</small><b>' + money(I.bal) + '</b></div><div class="card kpi"><small>Monthly payment</small><b>' + money(I.pay) + '</b></div><div class="card kpi"><small>' + (I.done ? 'Status' : 'Ends around') + '</small><b>' + (I.done ? 'Paid off 🎉' : I.stuck ? '—' : fdate(I.end)) + '</b></div><div class="card kpi"><small>Interest paid / still to pay</small><b style="font-size:17px">' + money(I.paidInt) + ' / ' + money(I.intLeft) + '</b></div></div>' +
          (I.stuck ? '<p style="color:var(--bad)">The payment does not cover the monthly interest — check the rate and payment.</p>' : '') + '</div>';
      }).join('') + '<p class="mut" style="margin-top:12px">Estimates assume a fixed rate and regular payments from the start date. For a variable-rate loan (e.g. Euribor) update the rate when it changes; your bank statement is the authority.</p>' : '<div class="card empty">Add mortgages, car loans, credit cards or personal credit to see how much is left, when it ends and how much interest you will pay.</div>');
    $('#new').onclick = function () { loanForm(); };
    view.onclick = function (e) { var b = e.target.closest('[data-e]'); if (b) loanForm(db.loans.filter(function (x) { return x.id === b.dataset.e; })[0]); };
  }
  function loanForm(x) {
    x = x || { id: uid(), name: '', lender: '', principal: '', rate: '', term: '', payment: '', start: today(), note: '' };
    var isNew = !db.loans.some(function (y) { return y.id === x.id; });
    ask('<h2>' + (isNew ? 'Add loan' : 'Edit loan') + '</h2><div class="f">' + field('Name * (e.g. Mortgage, Car)', 'name', x.name, 'text', 'required') + field('Lender', 'lender', x.lender) + field('Amount borrowed', 'principal', x.principal, 'text', 'inputmode="decimal" required') + field('Interest rate (% per year)', 'rate', x.rate, 'text', 'inputmode="decimal"') +
      field('Term (months)', 'term', x.term, 'number', 'min="1"') + field('Monthly payment (leave empty to calculate)', 'payment', x.payment, 'text', 'inputmode="decimal"') + field('Start date', 'start', x.start, 'date') + field('Note', 'note', x.note) + '</div>' + (isNew ? '' : '<p><button type="button" class="btn s d" id="rm">Delete</button></p>'), function (d) {
      var P = num(val(d, 'principal')); if (!val(d, 'name') || !P) { toast('Name and amount are required'); return; }
      if (!num(val(d, 'payment')) && !num(val(d, 'term'))) { toast('Enter the monthly payment or the term in months'); return; }
      x.name = val(d, 'name'); x.lender = val(d, 'lender'); x.principal = P; x.rate = num(val(d, 'rate')); x.term = parseInt(val(d, 'term'), 10) || 0; x.payment = num(val(d, 'payment')); x.start = val(d, 'start') || today(); x.note = val(d, 'note');
      if (isNew) db.loans.push(x); save(); loansPage(); toast('Saved');
    });
    var rm = dlg.querySelector('#rm'); if (rm) rm.onclick = function () { db.loans = db.loans.filter(function (y) { return y.id !== x.id; }); save(); dlg.close('x'); loansPage(); };
  }
  function overviewHtml() {
    if (!db.income.length && !db.loans.length) return '';
    var inc = db.income.filter(function (x) { return x.active !== false; }).reduce(function (a, x) { return a + incM(x); }, 0), ppl = Math.max(1, +db.settings.people || 1);
    var bl = Object.keys(BT).reduce(function (a, t) { var l = byType(t); return a + (l.length ? annual(l).cost / 12 / ppl : 0); }, 0);
    var sb = db.subs.filter(function (x) { return x.active !== false; }).reduce(function (a, x) { return a + mineM(x); }, 0);
    var ln = db.loans.reduce(function (a, L) { var i = loanInfo(L); return a + (i.done ? 0 : i.pay); }, 0);
    var since = addDays(today(), -90), ex = db.expenses.filter(function (e) { return (e.date || '') >= since; }).reduce(function (a, e) { return a + num(e.amount); }, 0) / 3;
    var left = inc - bl - sb - ln - ex, row = function (n, v, c) { return '<tr><td>' + n + '</td><td class="r" style="color:' + (c || 'inherit') + '">' + money(v) + '</td></tr>'; };
    return '<div class="card" style="margin-bottom:14px"><h2>Your month at a glance</h2><table><tbody>' + row('Income', inc, 'var(--ok)') + row('Household bills (your share)', -bl) + row('Subscriptions', -sb) + row('Loan payments', -ln) + row('Other expenses (avg of last 3 months)', -ex) +
      '<tr style="background:var(--bg)"><td><b>Left over</b></td><td class="r"><b style="color:' + (left < 0 ? 'var(--bad)' : 'var(--ok)') + '">' + money(left) + '</b></td></tr></tbody></table><p class="mut" style="font-size:12px;margin:8px 0 0">Averages from the bills and expenses you registered. <a href="#/income">Income</a> · <a href="#/loans">Loans</a></p></div>';
  }


  /* ---------- security (PIN), automatic backup, notifications ---------- */
  var PINKEY = 'ledgerly.pin', LANGKEY = 'ledgerly.lang';
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { } }
  function hashPin(pin, salt) {
    var str = salt + ':' + pin;
    if (window.crypto && crypto.subtle) return crypto.subtle.digest('SHA-256', new TextEncoder().encode(str)).then(function (b) { return Array.prototype.map.call(new Uint8Array(b), function (x) { return x.toString(16).padStart(2, '0'); }).join(''); });
    var h = 5381; for (var i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0; return Promise.resolve('x' + (h >>> 0).toString(16));
  }
  var lockEl, idleT;
  function pinData() { try { return JSON.parse(lsGet(PINKEY)); } catch (e) { return null; } }
  function lock() {
    var pd = pinData(); if (!pd || lockEl) return;
    lockEl = document.createElement('div'); lockEl.className = 'lock';
    lockEl.innerHTML = '<form><div class="logo"><span>L</span>edgerly</div><p class="mut">Enter your PIN</p><input type="password" inputmode="numeric" autocomplete="off" maxlength="8" aria-label="PIN" autofocus><p class="err" role="alert"></p><button class="btn p" style="width:100%">Unlock</button></form>';
    document.body.appendChild(lockEl); document.body.style.overflow = 'hidden';
    var inp = lockEl.querySelector('input'); inp.focus();
    lockEl.querySelector('form').onsubmit = function (e) {
      e.preventDefault(); hashPin(inp.value, pd.salt).then(function (h) {
        if (h === pd.hash) { lockEl.remove(); lockEl = null; document.body.style.overflow = ''; armIdle(); }
        else { lockEl.querySelector('.err').textContent = 'Wrong PIN'; inp.value = ''; inp.focus(); }
      });
    };
  }
  function armIdle() {
    clearTimeout(idleT); if (!pinData()) return; idleT = setTimeout(lock, 5 * 60 * 1000);
  }
  ['pointerdown', 'keydown', 'scroll'].forEach(function (ev) { window.addEventListener(ev, function () { if (!lockEl) armIdle(); }, { passive: true }); });
  document.addEventListener('visibilitychange', function () { if (document.hidden && pinData() && !lockEl && Date.now()) { /* lock when you come back after 1 min away */ lock.hiddenAt = Date.now(); } else if (!document.hidden && lock.hiddenAt && Date.now() - lock.hiddenAt > 60000) { lock(); lock.hiddenAt = 0; } });

  // automatic backup into a folder you choose (Chrome/Edge). Point it at a Drive/Dropbox/OneDrive folder to get sync-like behaviour.
  var dirH = null, bkT, bkState = 'off';
  function fsOk() { return typeof window.showDirectoryPicker === 'function'; }
  function bkPerm(h, ask) { return h.queryPermission({ mode: 'readwrite' }).then(function (p) { return p === 'granted' ? p : (ask ? h.requestPermission({ mode: 'readwrite' }) : p); }); }
  function bkWrite() {
    if (!dirH) return Promise.resolve(); return bkPerm(dirH, false).then(function (p) {
      if (p !== 'granted') { bkState = 'needs-permission'; return; }
      return dirH.getFileHandle('ledgerly-backup.json', { create: true }).then(function (fh) { return fh.createWritable(); }).then(function (w) { return w.write(JSON.stringify(db, null, 2)).then(function () { return w.close(); }); }).then(function () { bkState = 'on'; db.settings.lastExport = today(); try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { } });
    }).catch(function () { bkState = 'error'; });
  }
  window.__afterSave = function () { if (!dirH) return; clearTimeout(bkT); bkT = setTimeout(bkWrite, 2500); };
  if (fsOk()) idbGet('__dir').then(function (h) { if (h) { dirH = h; bkPerm(h, false).then(function (p) { bkState = p === 'granted' ? 'on' : 'needs-permission'; }); } }).catch(function () { });

  function extraSettingsHtml() {
    var pd = pinData(), lang = lsGet(LANGKEY) || 'en', nperm = ('Notification' in window) ? Notification.permission : 'unsupported';
    return '<div class="card" style="margin-top:14px"><h2>Security & automatic backup</h2>' +
      '<div class="row"><button class="btn" id="pin">' + (pd ? 'Change / remove PIN' : 'Set a PIN lock') + '</button>' + (fsOk() ? '<button class="btn" id="autobk">' + (dirH ? 'Change backup folder' : 'Choose backup folder') + '</button>' + (dirH && bkState === 'needs-permission' ? '<button class="btn p" id="regrant">Re-enable auto backup</button>' : '') : '') + '</div>' +
      '<p class="mut" style="margin:10px 0 0;font-size:12px">The PIN hides the app after 5 minutes idle or when you return after a minute away. It is a screen lock, not encryption — anyone with access to this browser profile could still read the stored data, so also lock your device.' +
      (fsOk() ? ' Auto backup rewrites <code>ledgerly-backup.json</code> in the chosen folder after every change (' + (dirH ? bkState.replace('-', ' ') : 'not set') + '). Pick a folder that your cloud drive syncs to keep two devices roughly in step (import the file on the other device).' : ' Automatic folder backup needs Chrome or Edge on a computer; elsewhere you will get a monthly reminder to export.') + '</p></div>' +
      '<div class="card" style="margin-top:14px"><h2>Notifications & language</h2><div class="row"><button class="btn" id="notif">' + (nperm === 'granted' ? 'Notifications are on ✓' : nperm === 'denied' ? 'Blocked in browser settings' : nperm === 'unsupported' ? 'Not supported here' : 'Turn on reminders') + '</button>' +
      '<select id="lang" style="width:auto"><option value="en" ' + (lang === 'en' ? 'selected' : '') + '>English</option><option value="pt" ' + (lang === 'pt' ? 'selected' : '') + '>Português</option></select></div><p class="mut" style="margin:10px 0 0;font-size:12px">Reminders appear while the app is open (or installed and running) for things due within 2 days. Real push notifications when the app is closed would need a server, which this app deliberately does not have.</p></div>';
  }
  function extraSettingsWire() {
    $('#pin').onclick = function () {
      var pd = pinData();
      ask('<h2>' + (pd ? 'Change or remove PIN' : 'Set a PIN') + '</h2><div class="f">' + (pd ? field('Current PIN', 'old', '', 'password', 'inputmode="numeric" maxlength="8"') : '') + field('New PIN (4–8 digits)', 'nw', '', 'password', 'inputmode="numeric" maxlength="8"') + '</div><p class="mut">' + (pd ? 'Leave the new PIN empty to remove the lock.' : '') + '</p>', function (d) {
        var nw = val(d, 'nw'), old = val(d, 'old');
        var apply = function () { if (!nw) { lsSet(PINKEY, null); clearTimeout(idleT); toast('PIN removed'); settings(); return; } if (!/^\d{4,8}$/.test(nw)) { toast('Use 4 to 8 digits'); return; } var salt = uid(); hashPin(nw, salt).then(function (h) { lsSet(PINKEY, JSON.stringify({ salt: salt, hash: h })); armIdle(); toast('PIN saved'); settings(); }); };
        if (pd) hashPin(old, pd.salt).then(function (h) { if (h !== pd.hash) toast('Current PIN is wrong'); else apply(); }); else apply();
      });
    };
    var ab = $('#autobk'); if (ab) ab.onclick = function () {
      window.showDirectoryPicker({ mode: 'readwrite' }).then(function (h) { dirH = h; return idbPut('__dir', h).catch(function () { }); }).then(function () { return bkWrite(); }).then(function () { toast('Backup folder set — backup written'); settings(); }).catch(function (e) { if (e && e.name !== 'AbortError') toast('Could not use that folder'); });
    };
    var rg = $('#regrant'); if (rg) rg.onclick = function () { bkPerm(dirH, true).then(function () { return bkWrite(); }).then(function () { toast('Auto backup is on'); settings(); }); };
    $('#notif').onclick = function () { if (!('Notification' in window)) return; Notification.requestPermission().then(function () { notifyDue(); settings(); }); };
    $('#lang').onchange = function (e) { lsSet(LANGKEY, e.target.value); location.reload(); };
  }
  function backupBanner() {
    var has = db.invoices.length + db.expenses.length + db.bills.length + db.subs.length + db.loans.length + db.income.length > 0; if (!has || dirH) return '';
    var last = db.settings.lastExport, days = last ? (new Date(today()) - new Date(last)) / 864e5 : 999; if (days < 30) return '';
    return '<div class="card" style="margin-bottom:14px;border-color:var(--acc)">💾 ' + (last ? 'Your last backup was ' + Math.round(days) + ' days ago.' : 'You have not backed up yet.') + ' Your data only lives in this browser — <a href="#/settings">export a backup</a>.</div>';
  }
  function notifyDue() {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    var seen; try { seen = JSON.parse(lsGet('ledgerly.notified') || '[]'); } catch (e) { seen = []; }
    upcoming().filter(function (u) { return u.d <= addDays(today(), 2); }).forEach(function (u) {
      var k = u.t + '|' + u.d; if (seen.indexOf(k) > -1) return; seen.push(k);
      try { new Notification(u.d < today() ? 'Overdue: ' + u.t : u.d === today() ? 'Due today: ' + u.t : 'Due soon: ' + u.t, { body: fdate(u.d) + ' · ' + money(u.a), tag: k }); } catch (e) { }
    });
    lsSet('ledgerly.notified', JSON.stringify(seen.slice(-200)));
  }
  setInterval(notifyDue, 30 * 60 * 1000);


  /* ---------- wealth: accounts, goals, net worth ---------- */
  var AT = { checking: 'Current account', savings: 'Savings', investment: 'Investments', cash: 'Cash', other: 'Other asset' };
  function netWorth() { return db.accounts.reduce(function (a, x) { return a + (+x.balance || 0); }, 0) - db.loans.reduce(function (a, L) { return a + loanInfo(L).bal; }, 0); }
  function snapNW() { var m = today().slice(0, 7), v = round2(netWorth()); if (!db.accounts.length && !db.loans.length) return; db.nw.forEach(function (x) { if (!x.id) x.id = x.m; }); var e = db.nw.filter(function (x) { return x.m === m; })[0]; if (e) e.v = v; else db.nw.push({ id: m, m: m, v: v }); db.nw.sort(function (a, b) { return a.m.localeCompare(b.m); }); save(); }
  function wealth() {
    snapNW();
    var assets = db.accounts.reduce(function (a, x) { return a + (+x.balance || 0); }, 0), debt = db.loans.reduce(function (a, L) { return a + loanInfo(L).bal; }, 0), nw = assets - debt;
    view.innerHTML = '<div class="top"><h1>Wealth & goals</h1><div class="row"><button class="btn" id="newg">+ Goal</button><button class="btn p" id="newa">+ Account</button></div></div>' +
      ((db.accounts.length || db.loans.length) ? '<div class="grid g4"><div class="card kpi"><small>Assets</small><b>' + money(assets) + '</b></div><div class="card kpi bad"><small>Debts (loans)</small><b>' + money(debt) + '</b></div><div class="card kpi ' + (nw >= 0 ? 'ok' : 'bad') + '"><small>Net worth</small><b>' + money(nw) + '</b></div></div>' : '') +
      (db.nw.length > 1 ? '<div class="card" style="margin-top:14px"><h2>Net worth over time</h2>' + lineChart(db.nw.map(function (x) { return { date: x.m + '-01', v: x.v }; }), function (b) { return b.v; }, '#12805c', money) + '<p class="mut" style="font-size:12px;margin:6px 0 0">One snapshot per month, taken whenever you open this page or update an account.</p></div>' : '') +
      '<div class="card" style="margin-top:14px"><h2>Accounts</h2>' + (db.accounts.length ? '<table><tbody>' + db.accounts.map(function (x) { return '<tr><td><b>' + esc(x.name) + '</b><div class="mut">' + esc(AT[x.type] || x.type) + '</div></td><td class="r"><b>' + money(x.balance) + '</b></td><td class="r" style="width:70px"><button class="btn s" data-ea="' + x.id + '">Edit</button></td></tr>'; }).join('') + '</tbody></table>' : '<div class="empty" style="padding:16px">Add your current accounts, savings and investments (balances only — nothing is connected to your bank).</div>') + '</div>' +
      '<div class="card" style="margin-top:14px"><h2>Goals</h2>' + (db.goals.length ? db.goals.map(function (g) {
        var r = Math.min(1, (+g.saved || 0) / (+g.target || 1)), left = Math.max(0, g.target - g.saved), mo = g.by ? Math.max(1, Math.round((new Date(g.by) - new Date()) / 2629800000)) : 0;
        return '<div style="margin:14px 0"><div class="row" style="justify-content:space-between"><b>' + esc(g.name) + '</b><span class="mut">' + money(g.saved) + ' / ' + money(g.target) + ' <button class="btn s" data-eg="' + g.id + '">Edit</button></span></div><div style="height:9px;border-radius:9px;background:var(--bg);overflow:hidden;margin:6px 0"><div style="height:100%;width:' + r * 100 + '%;background:var(--acc)"></div></div><div class="mut" style="font-size:12px">' + (left <= 0 ? 'Reached 🎉' : (g.by ? 'Save ' + money(left / mo) + '/month for ' + mo + ' months to reach it by ' + fdate(g.by) : money(left) + ' to go')) + '</div></div>';
      }).join('') : '<div class="empty" style="padding:16px">Emergency fund, holidays, a new car… set a target and see what to save per month.</div>') + '</div>';
    $('#newa').onclick = function () { accForm(); }; $('#newg').onclick = function () { goalForm(); };
    view.onclick = function (e) { var a = e.target.closest('[data-ea]'); if (a) return accForm(db.accounts.filter(function (x) { return x.id === a.dataset.ea; })[0]); var g = e.target.closest('[data-eg]'); if (g) goalForm(db.goals.filter(function (x) { return x.id === g.dataset.eg; })[0]); };
  }
  function accForm(x) {
    x = x || { id: uid(), name: '', type: 'checking', balance: '' }; var isNew = !db.accounts.some(function (y) { return y.id === x.id; });
    ask('<h2>' + (isNew ? 'Add account' : 'Edit account') + '</h2><div class="f">' + privField(x) + field('Name *', 'name', x.name, 'text', 'required') + '<div><label>Type</label><select name="type">' + Object.keys(AT).map(function (k) { return '<option value="' + k + '" ' + (k === x.type ? 'selected' : '') + '>' + AT[k] + '</option>'; }).join('') + '</select></div>' + field('Balance today', 'balance', x.balance, 'text', 'inputmode="decimal"') + '</div>' + (isNew ? '' : '<p><button type="button" class="btn s d" id="rm">Delete</button></p>'), function (d) {
      if (!val(d, 'name')) { toast('Name is required'); return; } x.name = val(d, 'name'); x.type = val(d, 'type'); x.balance = num(val(d, 'balance')); if (isNew) db.accounts.push(x); save(); wealth(); toast('Saved');
    });
    var rm = dlg.querySelector('#rm'); if (rm) rm.onclick = function () { db.accounts = db.accounts.filter(function (y) { return y.id !== x.id; }); save(); dlg.close('x'); wealth(); };
  }
  function goalForm(x) {
    x = x || { id: uid(), name: '', target: '', saved: 0, by: '' }; var isNew = !db.goals.some(function (y) { return y.id === x.id; });
    ask('<h2>' + (isNew ? 'Add goal' : 'Edit goal') + '</h2><div class="f">' + privField(x) + field('Goal *', 'name', x.name, 'text', 'required') + field('Target amount', 'target', x.target, 'text', 'inputmode="decimal" required') + field('Saved so far', 'saved', x.saved, 'text', 'inputmode="decimal"') + field('Reach it by (optional)', 'by', x.by, 'date') + '</div>' + (isNew ? '' : '<p><button type="button" class="btn s d" id="rm">Delete</button></p>'), function (d) {
      if (!val(d, 'name') || !num(val(d, 'target'))) { toast('Name and target are required'); return; } x.name = val(d, 'name'); x.target = num(val(d, 'target')); x.saved = num(val(d, 'saved')); x.by = val(d, 'by'); if (isNew) db.goals.push(x); save(); wealth(); toast('Saved');
    });
    var rm = dlg.querySelector('#rm'); if (rm) rm.onclick = function () { db.goals = db.goals.filter(function (y) { return y.id !== x.id; }); save(); dlg.close('x'); wealth(); };
  }

  /* ---------- reminders: warranties and fixed deadlines ---------- */
  function warrantyEnd(x) { return x.bought && x.months ? addMonths(x.bought, +x.months) : ''; }
  function nextDeadline(x) { if (!x.date) return ''; var d = x.date, n = 0; if (x.repeat === 'yearly') while (d < today() && n++ < 100) d = addMonths(d, 12); return d; }
  var DL = [['IRS tax return', 'yearly', '06-30'], ['IMI (property tax)', 'yearly', '04-30'], ['IUC (car tax)', 'yearly', ''], ['Car inspection', 'yearly', ''], ['Car insurance renewal', 'yearly', ''], ['Home insurance renewal', 'yearly', ''], ['Passport / ID card renewal', 'none', ''], ['Driving licence renewal', 'none', '']];
  function reminders() {
    var W = db.items.map(function (x) { return { x: x, e: warrantyEnd(x) }; }).sort(function (a, b) { return a.e.localeCompare(b.e); });
    var D = db.deadlines.map(function (x) { return { x: x, d: nextDeadline(x) }; }).sort(function (a, b) { return a.d.localeCompare(b.d); });
    view.innerHTML = '<div class="top"><h1>Warranties & deadlines</h1><div class="row"><button class="btn" id="newd">+ Deadline</button><button class="btn p" id="newi">+ Warranty</button></div></div>' +
      '<div class="card"><h2>Deadlines</h2>' + (D.length ? '<table><tbody>' + D.map(function (o) { var late = o.d < today(); return '<tr><td><b>' + esc(o.x.name) + '</b>' + (o.x.note ? '<div class="mut">' + esc(o.x.note) + '</div>' : '') + '</td><td class="mut">' + (o.x.repeat === 'yearly' ? 'every year' : 'once') + '</td><td>' + fdate(o.d) + (late ? ' <span class="tag overdue">past</span>' : o.d <= addDays(today(), 30) ? ' <span class="tag draft">soon</span>' : '') + '</td><td class="r"><button class="btn s" data-ed="' + o.x.id + '">Edit</button></td></tr>'; }).join('') + '</tbody></table>' : '<div class="empty" style="padding:14px">Nothing yet.</div>') +
      '<div class="row" style="margin-top:12px">' + DL.map(function (d, i) { return '<button class="btn s" data-pd="' + i + '">+ ' + esc(d[0]) + '</button>'; }).join('') + '</div></div>' +
      '<div class="card" style="margin-top:14px"><h2>Warranties</h2>' + (W.length ? '<table><tbody>' + W.map(function (o) { var x = o.x, st = o.e < today() ? '<span class="tag overdue">expired</span>' : o.e <= addDays(today(), 60) ? '<span class="tag draft">ends soon</span>' : '<span class="tag paid">valid</span>'; return '<tr><td><b>' + esc(x.name) + '</b>' + (x.file ? ' <a href="#" data-f="' + x.id + '">📎</a>' : '') + '<div class="mut">' + esc(x.store || '') + (x.price ? ' · ' + money(x.price) : '') + '</div></td><td>Until ' + fdate(o.e) + '</td><td>' + st + '</td><td class="r"><button class="btn s" data-ei="' + x.id + '">Edit</button></td></tr>'; }).join('') + '</tbody></table>' : '<div class="empty" style="padding:14px">Add appliances and electronics with the purchase date — attach the receipt photo so you have it when something breaks.</div>') + '</div>';
    $('#newd').onclick = function () { dlForm(); }; $('#newi').onclick = function () { itemForm(); };
    view.onclick = function (e) {
      var f = e.target.closest('[data-f]'); if (f) { e.preventDefault(); return openAttach(f.dataset.f); }
      var a = e.target.closest('[data-ed]'); if (a) return dlForm(db.deadlines.filter(function (x) { return x.id === a.dataset.ed; })[0]);
      var b = e.target.closest('[data-ei]'); if (b) return itemForm(db.items.filter(function (x) { return x.id === b.dataset.ei; })[0]);
      var c = e.target.closest('[data-pd]'); if (c) { var d = DL[+c.dataset.pd], y = new Date().getFullYear(); dlForm(null, { name: d[0], repeat: d[1], date: d[2] ? y + '-' + d[2] : addDays(today(), 60) }); }
    };
  }
  function dlForm(x, pre) {
    x = x || Object.assign({ id: uid(), name: '', date: addDays(today(), 30), repeat: 'yearly', amount: '', note: '' }, pre || {}); var isNew = !db.deadlines.some(function (y) { return y.id === x.id; });
    ask('<h2>' + (isNew ? 'Add deadline' : 'Edit deadline') + '</h2><div class="f">' + field('What *', 'name', x.name, 'text', 'required') + field('Date', 'date', x.date, 'date') + '<div><label>Repeats</label><select name="repeat"><option value="yearly" ' + (x.repeat === 'yearly' ? 'selected' : '') + '>Every year</option><option value="none" ' + (x.repeat === 'none' ? 'selected' : '') + '>Once</option></select></div>' + field('Amount (optional)', 'amount', x.amount, 'text', 'inputmode="decimal"') + '<div class="w">' + field('Note', 'note', x.note) + '</div></div>' + (isNew ? '' : '<p><button type="button" class="btn s d" id="rm">Delete</button></p>'), function (d) {
      if (!val(d, 'name')) { toast('Name is required'); return; } x.name = val(d, 'name'); x.date = val(d, 'date') || today(); x.repeat = val(d, 'repeat'); x.amount = num(val(d, 'amount')); x.note = val(d, 'note'); if (isNew) db.deadlines.push(x); save(); reminders(); toast('Saved');
    });
    var rm = dlg.querySelector('#rm'); if (rm) rm.onclick = function () { db.deadlines = db.deadlines.filter(function (y) { return y.id !== x.id; }); save(); dlg.close('x'); reminders(); };
  }
  function itemForm(x) {
    x = x || { id: uid(), name: '', store: '', bought: today(), months: 24, price: '' }; var isNew = !db.items.some(function (y) { return y.id === x.id; });
    ask('<h2>' + (isNew ? 'Add warranty' : 'Edit warranty') + '</h2><div class="f">' + field('Item *', 'name', x.name, 'text', 'required') + field('Store', 'store', x.store) + field('Purchase date', 'bought', x.bought, 'date') + field('Warranty (months)', 'months', x.months, 'number', 'min="1"') + field('Price', 'price', x.price, 'text', 'inputmode="decimal"') + attachField(x) + '</div>' + (isNew ? '' : '<p><button type="button" class="btn s d" id="rm">Delete</button></p>'), function (d) {
      if (!val(d, 'name')) { toast('Name is required'); return; } x.name = val(d, 'name'); x.store = val(d, 'store'); x.bought = val(d, 'bought') || today(); x.months = parseInt(val(d, 'months'), 10) || 24; x.price = num(val(d, 'price')); saveAttach(x, d); if (isNew) db.items.push(x); save(); reminders(); toast('Saved');
    });
    var rm = dlg.querySelector('#rm'); if (rm) rm.onclick = function () { db.items = db.items.filter(function (y) { return y.id !== x.id; }); idbDel(x.id); save(); dlg.close('x'); reminders(); };
  }

  /* ---------- split: shared expenses ---------- */
  var splitSel = null;
  function balances(g) {
    var bal = {}; g.people.forEach(function (n) { bal[n] = 0; });
    g.expenses.forEach(function (e) { var among = (e.among && e.among.length ? e.among : g.people).filter(function (n) { return n in bal; }); if (!among.length || !(e.who in bal)) return; bal[e.who] += e.amount; among.forEach(function (n) { bal[n] -= e.amount / among.length; }); });
    return bal;
  }
  function settle(bal) {
    var pos = [], neg = [], out = []; Object.keys(bal).forEach(function (n) { var v = round2(bal[n]); if (v > 0.005) pos.push([n, v]); else if (v < -0.005) neg.push([n, -v]); });
    pos.sort(function (a, b) { return b[1] - a[1]; }); neg.sort(function (a, b) { return b[1] - a[1]; });
    while (pos.length && neg.length) { var m = Math.min(pos[0][1], neg[0][1]); out.push([neg[0][0], pos[0][0], round2(m)]); pos[0][1] = round2(pos[0][1] - m); neg[0][1] = round2(neg[0][1] - m); if (pos[0][1] < 0.005) pos.shift(); if (neg[0][1] < 0.005) neg.shift(); }
    return out;
  }
  function split() {
    var g = db.groups.filter(function (x) { return x.id === splitSel; })[0];
    if (!g) {
      view.innerHTML = '<div class="top"><h1>Split expenses</h1><button class="btn p" id="newg">+ New group</button></div>' + (db.groups.length ? '<div class="grid g2">' + db.groups.map(function (x) { var t = x.expenses.reduce(function (a, e) { return a + e.amount; }, 0); return '<div class="card click" data-g="' + x.id + '" style="cursor:pointer"><h2 style="margin:0">' + esc(x.name) + '</h2><div class="mut">' + x.people.map(esc).join(', ') + '</div><b style="font-size:20px">' + money(t) + '</b> <span class="mut">in ' + x.expenses.length + ' expenses</span></div>'; }).join('') + '</div>' : '<div class="card empty">Trips, flatmates, dinners — add a group, log who paid what, and see who owes whom.</div>');
      $('#newg').onclick = function () { groupForm(); }; view.onclick = function (e) { var c = e.target.closest('[data-g]'); if (c) { splitSel = c.dataset.g; split(); } }; return;
    }
    var bal = balances(g), pay = settle(bal);
    view.innerHTML = '<div class="top"><div><a href="#" id="back" class="mut">← All groups</a><h1>' + esc(g.name) + '</h1></div><div class="row"><button class="btn" id="eg">Edit group</button><button class="btn p" id="ne">+ Expense</button></div></div>' +
      '<div class="grid g2"><div class="card"><h2>Balances</h2>' + g.people.map(function (n) { var v = round2(bal[n]); return '<div class="row" style="justify-content:space-between;padding:4px 0"><span>' + esc(n) + '</span><b style="color:' + (v > 0 ? 'var(--ok)' : v < 0 ? 'var(--bad)' : 'inherit') + '">' + (v > 0 ? 'is owed ' : v < 0 ? 'owes ' : 'settled ') + (v ? money(Math.abs(v)) : '') + '</b></div>'; }).join('') + '</div>' +
      '<div class="card"><h2>To settle up</h2>' + (pay.length ? pay.map(function (p) { return '<div style="padding:4px 0"><b>' + esc(p[0]) + '</b> pays <b>' + esc(p[1]) + '</b> ' + money(p[2]) + '</div>'; }).join('') : '<div class="mut">All square 🎉</div>') + '</div></div>' +
      '<div class="card" style="margin-top:14px"><h2>Expenses</h2>' + (g.expenses.length ? '<table><tbody>' + g.expenses.slice().reverse().map(function (e) { return '<tr><td class="mut" style="width:110px">' + fdate(e.date) + '</td><td><b>' + esc(e.desc) + '</b><div class="mut">paid by ' + esc(e.who) + (e.among && e.among.length && e.among.length < g.people.length ? ' · split between ' + e.among.map(esc).join(', ') : ' · split equally') + '</div></td><td class="r"><b>' + money(e.amount) + '</b></td><td class="r"><button class="btn s d" data-x="' + e.id + '" aria-label="Delete">✕</button></td></tr>'; }).join('') + '</tbody></table>' : '<div class="empty" style="padding:14px">No expenses yet.</div>') + '</div>';
    $('#back').onclick = function (e) { e.preventDefault(); splitSel = null; split(); };
    $('#eg').onclick = function () { groupForm(g); }; $('#ne').onclick = function () { splitExpForm(g); };
    view.onclick = function (e) { var x = e.target.closest('[data-x]'); if (x) { g.expenses = g.expenses.filter(function (y) { return y.id !== x.dataset.x; }); save(); split(); } };
  }
  function groupForm(g) {
    g = g || { id: uid(), name: '', people: [], expenses: [] }; var isNew = !db.groups.some(function (y) { return y.id === g.id; });
    ask('<h2>' + (isNew ? 'New group' : 'Edit group') + '</h2><div class="f">' + field('Group name *', 'name', g.name, 'text', 'required') + '<div class="w">' + field('People (comma separated, include yourself) *', 'people', g.people.join(', '), 'text', 'required') + '</div></div>' + (isNew ? '' : '<p><button type="button" class="btn s d" id="rm">Delete group</button></p>'), function (d) {
      var pl = val(d, 'people').split(',').map(function (x) { return x.trim(); }).filter(function (x, i, a) { return x && a.indexOf(x) === i; });
      if (!val(d, 'name') || pl.length < 2) { toast('Add a name and at least two people'); return; } g.name = val(d, 'name'); g.people = pl; if (isNew) db.groups.push(g); save(); splitSel = g.id; split(); toast('Saved');
    });
    var rm = dlg.querySelector('#rm'); if (rm) rm.onclick = function () { db.groups = db.groups.filter(function (y) { return y.id !== g.id; }); splitSel = null; save(); dlg.close('x'); split(); };
  }
  function splitExpForm(g) {
    ask('<h2>New expense</h2><div class="f">' + field('What was it? *', 'desc', '', 'text', 'required') + field('Amount *', 'amount', '', 'text', 'inputmode="decimal" required') + '<div><label>Paid by</label><select name="who">' + g.people.map(function (n) { return '<option>' + esc(n) + '</option>'; }).join('') + '</select></div>' + field('Date', 'date', today(), 'date') +
      '<div class="w"><label>Split between</label><div class="row">' + g.people.map(function (n) { return '<label style="display:flex;gap:6px;align-items:center;margin:0;font-weight:500"><input type="checkbox" style="width:auto" name="am" value="' + esc(n) + '" checked> ' + esc(n) + '</label>'; }).join('') + '</div></div></div>', function (d) {
      var a = num(val(d, 'amount')); if (!val(d, 'desc') || !a) { toast('Add a description and amount'); return; }
      var am = Array.prototype.map.call(d.querySelectorAll('[name=am]:checked'), function (c) { return c.value; }); if (!am.length) { toast('Pick who shares it'); return; }
      g.expenses.push({ id: uid(), desc: val(d, 'desc'), amount: a, who: val(d, 'who'), date: val(d, 'date') || today(), among: am }); save(); split(); toast('Added');
    });
  }


  /* ---------- bank statement (CSV) import ---------- */
  function splitCSV(text) {
    var first = text.split(/\r?\n/).slice(0, 15).join('\n'), best = ';', bc = -1; [';', ',', '\t', '|'].forEach(function (d) { var c = first.split(d).length; if (c > bc) { bc = c; best = d; } });
    var rows = [], row = [], cur = '', q = false, i = 0; text = text.replace(/^﻿/, '');
    for (; i < text.length; i++) { var ch = text[i];
      if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
      else if (ch === '"') q = true; else if (ch === best) { row.push(cur); cur = ''; } else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cur); if (row.some(function (c) { return c.trim(); })) rows.push(row); row = []; cur = ''; } else cur += ch; }
    row.push(cur); if (row.some(function (c) { return c.trim(); })) rows.push(row); return rows;
  }
  function parseAmt(x) { x = String(x || '').replace(/[^\d,.\-+]/g, ''); if (!/\d/.test(x)) return null; var neg = /^-/.test(x) || /-$/.test(x); x = x.replace(/[+\-]/g, ''); if (/,\d{1,2}$/.test(x)) x = x.replace(/\./g, '').replace(',', '.'); else x = x.replace(/,/g, ''); var v = parseFloat(x); return isFinite(v) ? (neg ? -v : v) : null; }
  function parseDay(x) { x = String(x || '').trim(); var m = x.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/); if (m) return m[1] + '-' + m[2].padStart(2, '0') + '-' + m[3].padStart(2, '0'); m = x.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})/); if (m) return (m[3].length === 2 ? '20' + m[3] : m[3]) + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0'); return ''; }
  function guessCat(t) {
    var low = t.toLowerCase();
    return /continente|pingo doce|lidl|aldi|minipre|mercadona|auchan|intermarch|supermerc|mercearia/.test(low) ? 'Groceries' : /galp|repsol|\bbp\b|prio|cepsa|combust|gas[oó]leo|gasolina|via verde/.test(low) ? 'Fuel' : /restaurante|caf[eé]|pastelaria|pizz|burger|mcdonald|starbucks|uber ?eats|glovo|bolt food|take.?away/.test(low) ? 'Food & drinks' : /farm[aá]cia|cl[ií]nica|hospital|sa[uú]de|m[eé]dic|dent/.test(low) ? 'Health' : /leroy|ikea|aki\b|bricolage|conforama|worten|edp|[aá]gua|epal|goldenergy|endesa|iberdrola|condom[ií]nio/.test(low) ? 'Home' : /netflix|spotify|disney|hbo|prime video|youtube|apple\.com|google \*|microsoft|adobe|openai|github|dropbox|icloud|nos |meo |vodafone|nowo/.test(low) ? 'Software' : /iva|imposto|segura[cç][aã]o social|finan[cç]as|comiss[aã]o|anuidade|juros/.test(low) ? 'Taxes & fees' : /uber|bolt|cp |comboio|metro|ryanair|tap |airbnb|booking|hotel/.test(low) ? 'Travel' : 'Other';
  }
  function bankImport(text, done) {
    var rows = splitCSV(text); if (rows.length < 2) { toast('That file looks empty'); return; }
    var width = Math.max.apply(null, rows.slice(0, 30).map(function (r) { return r.length; })), dateCol = -1, hits = 0;
    for (var c = 0; c < width; c++) { var h = rows.filter(function (r) { return parseDay(r[c]); }).length; if (h > hits) { hits = h; dateCol = c; } }
    if (dateCol < 0 || hits < 1) { toast('Could not find a date column — export as CSV with dates'); return; }
    var head = rows.filter(function (r) { return !parseDay(r[dateCol]); }).slice(-1)[0] || [], hd = head.map(function (x) { return String(x).toLowerCase(); });
    var iDeb = hd.findIndex(function (x) { return /d[eé]bito|debit|sa[ií]da|withdraw/.test(x); }), iCre = hd.findIndex(function (x) { return /cr[eé]dito|credit|entrada|deposit/.test(x); });
    var isDateCol = function (k) { return /^data|^date|data /.test(hd[k] || '') || rows.filter(function (r) { return parseDay(r[k]); }).length > rows.length / 2; };
    var iAmt = (iDeb >= 0 && iCre >= 0) ? -1 : hd.findIndex(function (x, k) { return k !== dateCol && !isDateCol(k) && /montante|amount|valor|import/.test(x); });
    var data = rows.filter(function (r) { return parseDay(r[dateCol]); });
    if (iAmt < 0 && (iDeb < 0 || iCre < 0)) { var bestN = 0; for (var k = 0; k < width; k++) { if (k === dateCol || isDateCol(k)) continue; var n = data.filter(function (r) { return parseAmt(r[k]) != null; }).length; if (n > bestN) { bestN = n; iAmt = k; } } }
    var iDesc = hd.findIndex(function (x, k) { return k !== dateCol && /descri|movim|detalhe|merchant|narrative|memo|benefici/.test(x); });
    if (iDesc < 0) { var bl = 0; for (var k2 = 0; k2 < width; k2++) { if (k2 === dateCol || k2 === iAmt || k2 === iDeb || k2 === iCre) continue; var len = data.reduce(function (a, r) { return a + (parseAmt(r[k2]) == null || /[a-z]{3}/i.test(r[k2] || '') ? String(r[k2] || '').length : 0); }, 0); if (len > bl) { bl = len; iDesc = k2; } } }
    var items = data.map(function (r) {
      var a = iAmt >= 0 ? parseAmt(r[iAmt]) : ((parseAmt(r[iCre]) || 0) - Math.abs(parseAmt(r[iDeb]) || 0)); if (a == null) return null;
      var desc = String(r[iDesc] || '').replace(/\s+/g, ' ').trim(); return { date: parseDay(r[dateCol]), desc: desc, amt: a, cat: guessCat(desc) };
    }).filter(Boolean);
    if (!items.length) { toast('No transactions found'); return; }
    var dup = function (x) { return db.expenses.some(function (e) { return e.date === x.date && Math.abs(num(e.amount) - Math.abs(x.amt)) < 0.005 && (e.vendor || '').toLowerCase() === x.desc.toLowerCase(); }); };
    var spend = items.filter(function (x) { return x.amt < 0; });
    ask('<h2>Import bank statement</h2><p class="mut">' + spend.length + ' payments found' + (items.length > spend.length ? ' (' + (items.length - spend.length) + ' incoming rows ignored)' : '') + '. Untick what you do not want, fix categories, then import. Rows already in Expenses are unticked.</p><div style="max-height:52vh;overflow:auto"><table><thead><tr><th></th><th>Date</th><th>Description</th><th class="r">Amount</th><th>Category</th></tr></thead><tbody>' +
      spend.slice(0, 400).map(function (x, i) { return '<tr><td><input type="checkbox" style="width:auto" data-i="' + i + '" ' + (dup(x) ? '' : 'checked') + '></td><td class="mut">' + fdate(x.date) + '</td><td>' + esc(x.desc.slice(0, 60)) + (dup(x) ? ' <span class="tag">already added</span>' : '') + '</td><td class="r">' + money(-x.amt) + '</td><td><select data-c="' + i + '" style="padding:5px">' + CATS.map(function (c) { return '<option ' + (c === x.cat ? 'selected' : '') + '>' + c + '</option>'; }).join('') + '</select></td></tr>'; }).join('') + '</tbody></table></div>' + (spend.length > 400 ? '<p class="mut">Showing the first 400 of ' + spend.length + '.</p>' : ''), function (d) {
      var n = 0; spend.slice(0, 400).forEach(function (x, i) { var cb = d.querySelector('[data-i="' + i + '"]'); if (!cb || !cb.checked) return; db.expenses.push({ id: uid(), date: x.date, vendor: x.desc.slice(0, 60) || 'Bank payment', cat: d.querySelector('[data-c="' + i + '"]').value, amount: round2(-x.amt), note: '', vat: 0, auto: true, bank: true }); n++; });
      save(); if (done) done(); toast(n + ' expenses imported');
    }, 'Import');
    dlg.style.width = 'min(920px,96vw)'; dlg.addEventListener('close', function () { dlg.style.width = ''; }, { once: true });
  }
  window.__ledgerly = window.__ledgerly || {}; window.__ledgerly.bankParse = function (t) { return splitCSV(t); }; window.__ledgerly.parseAmt = parseAmt;


  /* ---------- family space: optional end-to-end encrypted sync through YOUR Firebase project ---------- */
  var SYNCKEY = 'ledgerly.sync', METAKEY = 'ledgerly.syncmeta';
  var SHARE_ALL = { bills: 'Utilities', subs: 'Subscriptions', loans: 'Loans', accounts: 'Accounts', goals: 'Goals', items: 'Warranties', deadlines: 'Deadlines', groups: 'Split groups', income: 'Income', expenses: 'Expenses', invoices: 'Invoices', clients: 'Clients' };
  var SHARE_DEFAULT = ['bills', 'subs', 'loans', 'accounts', 'goals', 'items', 'deadlines', 'groups'];
  function syncCfg() { try { return JSON.parse(lsGet(SYNCKEY)); } catch (e) { return null; } }
  function syncMeta() { try { return JSON.parse(lsGet(METAKEY)) || {}; } catch (e) { return {}; } }
  var syncStatus = '', syncBusy = false, syncTok = null;
  var b64 = function (u8) { var s2 = ''; for (var i = 0; i < u8.length; i++) s2 += String.fromCharCode(u8[i]); return btoa(s2); };
  var unb64 = function (t) { var s2 = atob(t), u = new Uint8Array(s2.length); for (var i = 0; i < s2.length; i++) u[i] = s2.charCodeAt(i); return u; };
  function sha(t) { return crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)).then(function (b) { return Array.prototype.map.call(new Uint8Array(b), function (x) { return x.toString(16).padStart(2, '0'); }).join(''); }); }
  var keyCache = {};
  function aesKey(code) {
    if (keyCache[code]) return Promise.resolve(keyCache[code]);
    return crypto.subtle.importKey('raw', new TextEncoder().encode(code), 'PBKDF2', false, ['deriveKey']).then(function (m) { return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: new TextEncoder().encode('ledgerly-family-v1'), iterations: 120000, hash: 'SHA-256' }, m, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']); }).then(function (k) { keyCache[code] = k; return k; });
  }
  function enc(code, obj) { return aesKey(code).then(function (k) { var iv = crypto.getRandomValues(new Uint8Array(12)); return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, k, new TextEncoder().encode(JSON.stringify(obj))).then(function (ct) { var all = new Uint8Array(12 + ct.byteLength); all.set(iv); all.set(new Uint8Array(ct), 12); return b64(all); }); }); }
  function dec(code, txt) { return aesKey(code).then(function (k) { var all = unb64(txt); return crypto.subtle.decrypt({ name: 'AES-GCM', iv: all.slice(0, 12) }, k, all.slice(12)); }).then(function (pt) { return JSON.parse(new TextDecoder().decode(pt)); }); }
  function hsh(o) { var t = JSON.stringify(o), h = 5381; for (var i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0; return (h >>> 0).toString(36) + t.length; }
  var fbLoaded = null;
  function loadScript(u) { return new Promise(function (ok, no) { var e = document.createElement('script'); e.src = u; e.onload = ok; e.onerror = function () { no(new Error('Could not load Firebase (offline?)')); }; document.head.appendChild(e); }); }
  function fbAuth(cfg) {
    fbLoaded = fbLoaded || loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js').then(function () { return loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js'); });
    return fbLoaded.then(function () { var F = window.firebase; if (!F.apps.length) F.initializeApp({ apiKey: cfg.apiKey, authDomain: cfg.projectId + '.firebaseapp.com', projectId: cfg.projectId }); return F.auth(); });
  }
  function googleToken(cfg) {
    return fbAuth(cfg).then(function (au) { return new Promise(function (ok) { var u = au.onAuthStateChanged(function (user) { u(); ok(user); }); }); }).then(function (user) { if (!user) throw new Error('Signed out of Google — sign in again in Settings'); return user.getIdToken(); });
  }
  function googleLogin(cfg) {
    return fbAuth(cfg).then(function (au) { return au.signInWithPopup(new window.firebase.auth.GoogleAuthProvider()); }).then(function (r) { return { uid: r.user.uid, email: r.user.email, name: r.user.displayName }; });
  }
  function fbToken(cfg) {
    if (cfg.mode === 'google') return googleToken(cfg);
    if (syncTok && syncTok.exp > Date.now() + 60000) return Promise.resolve(syncTok.t);
    return fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' + encodeURIComponent(cfg.apiKey), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }) }).then(function (r) { if (!r.ok) throw new Error('Firebase sign-in failed — is Anonymous sign-in enabled and the API key right?'); return r.json(); }).then(function (j) { syncTok = { t: j.idToken, exp: Date.now() + (+j.expiresIn || 3600) * 1000 }; return syncTok.t; });
  }
  function fbUrl(cfg, tok, path) { return cfg.url.replace(/\/$/, '') + '/' + (cfg.mode === 'google' ? 'users' : 'households') + '/' + cfg.hid + path + '.json?auth=' + encodeURIComponent(tok); }
  function runSync(manual) {
    var cfg = syncCfg(); if (!cfg || syncBusy) return Promise.resolve(); if (!(window.crypto && crypto.subtle)) { syncStatus = 'Sync needs https (or localhost).'; return Promise.resolve(); }
    syncBusy = true; var meta = syncMeta(), now = Date.now(), push = {}, applied = 0;
    return fbToken(cfg).then(function (tok) {
      return fetch(fbUrl(cfg, tok, '/items')).then(function (r) { if (!r.ok) throw new Error('Could not read the family space (check the database rules)'); return r.json(); }).then(function (remote) {
        remote = remote || {}; var jobs = [];
        cfg.cols.forEach(function (c) {
          meta[c] = meta[c] || {}; var local = {}, every = {}; db[c].forEach(function (x) { every[x.id] = 1; if (!x.private) local[x.id] = x; });
          Object.keys(local).forEach(function (id) { var m = meta[c][id], h = hsh(local[id]); if (!m) m = meta[c][id] = { h: '', t: 0 }; if (m.del) { m.del = false; m.h = ''; } if (m.h !== h) { m.h = h; m.t = now; m.dirty = true; } });
          Object.keys(meta[c]).forEach(function (id) { if (!local[id] && !meta[c][id].del) { meta[c][id].del = true; meta[c][id].t = now; meta[c][id].dirty = true; } });
          var ids = {}; Object.keys(meta[c]).forEach(function (i) { ids[i] = 1; }); Object.keys(remote).forEach(function (k) { if (k.indexOf(c + '_') === 0) ids[k.slice(c.length + 1)] = 1; });
          Object.keys(ids).forEach(function (id) {
            var rk = c + '_' + id, r = remote[rk], m = meta[c][id] || (meta[c][id] = { h: '', t: 0 });
            if (every[id] && !local[id] && r && r.t > m.t) return;   // private item: never overwritten by the family copy
            if (r && r.t > m.t) {                                   // remote is newer → take it
              if (r.d == null) { db[c] = db[c].filter(function (x) { return x.id !== id; }); m.del = true; m.t = r.t; m.dirty = false; applied++; }
              else jobs.push(dec(cfg.code, r.d).then(function (obj) { var i = db[c].findIndex(function (x) { return x.id === id; }); if (i < 0) db[c].push(obj); else db[c][i] = obj; m.h = hsh(obj); m.t = r.t; m.del = false; m.dirty = false; applied++; }).catch(function () { }));
            } else if (m.dirty || (!r && m.t && !m.del)) {            // ours is newer / not uploaded yet
              var o = m.del ? null : (db[c].filter(function (x) { return x.id === id; })[0]); var t = m.t;
              jobs.push((o ? enc(cfg.code, o) : Promise.resolve(null)).then(function (d) { push[rk] = { t: t, d: d }; m.dirty = false; }));
            }
          });
        });
        return Promise.all(jobs).then(function () { return tok; });
      }).then(function (tok) {
        if (!Object.keys(push).length) return;
        return fetch(fbUrl(cfg, tok, '/items'), { method: 'PATCH', body: JSON.stringify(push) }).then(function (r) { if (!r.ok) throw new Error('Could not write to the family space (check the database rules)'); });
      });
    }).then(function () {
      lsSet(METAKEY, JSON.stringify(meta)); cfg.last = Date.now(); lsSet(SYNCKEY, JSON.stringify(cfg)); syncStatus = 'Synced ' + new Date().toLocaleTimeString() + (applied ? ' · ' + applied + ' change' + (applied > 1 ? 's' : '') + ' received' : '');
      if (applied) { var keep = window.__afterSave; window.__afterSave = null; try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { } window.__afterSave = keep; if (!dlg.open) route(); }
    }).catch(function (e) { syncStatus = 'Sync problem: ' + e.message; if (manual) toast(syncStatus); }).then(function () { syncBusy = false; });
  }
  var prevAfter = window.__afterSave, syncT;
  window.__afterSave = function () { if (prevAfter) prevAfter(); if (syncCfg()) { clearTimeout(syncT); syncT = setTimeout(runSync, 2000); } };
  setInterval(function () { if (!document.hidden) runSync(); }, 60000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) runSync(); });
  function newCode(all) { var a = crypto.getRandomValues(new Uint8Array(16)), al = 'abcdefghjkmnpqrstuvwxyz23456789', o = ''; for (var i = 0; i < 16; i++) { o += al[a[i] % al.length]; if (i % 4 === 3 && i < 15) o += '-'; } return (all ? 'e' : 'h') + o.slice(1); }   // first letter remembers the sharing preset: e = everything, h = household
  var PERSONAL = Object.keys(SHARE_ALL).concat(['nw']);
  function googleHtml() {
    var c = syncCfg();
    if (c && c.mode === 'google') return '<div class="card" style="margin-top:14px"><h2>☁️ Google account sync <span class="tag paid">on</span></h2><p>Signed in as <b>' + esc(c.email || '') + '</b>. Everything you enter is encrypted on this device and backed up to your Google-protected space, so the same data appears on your phone and computer.</p><div class="row"><button class="btn p" id="gsync">Sync now</button><button class="btn d" id="gout">Sign out</button></div><p class="mut" style="font-size:12px;margin:10px 0 0" id="gstat">' + esc(syncStatus || (c.last ? 'Last sync ' + new Date(c.last).toLocaleString() : 'Not synced yet')) + '</p></div>';
    if (c) return '';
    if (!(window.crypto && crypto.subtle)) return '';
    return '<div class="card" style="margin-top:14px"><h2>☁️ Sign in with Google (optional)</h2><p class="mut">Use the app on your phone <i>and</i> your computer with the same data. Sign in with your Google account; your data is <b>encrypted with a password only you know</b> before it is stored in your own Firebase project.</p><div class="f">' + field('Firebase Web API key', 'gkey', '') + field('Firebase project ID', 'gproj', '') + field('Database URL', 'gurl', '', 'url', 'placeholder="https://your-project-default-rtdb.europe-west1.firebasedatabase.app"') + field('Encryption password (use the same on every device)', 'gpass', '', 'password') + '</div><div class="row" style="margin-top:10px"><button class="btn p" id="glogin">Sign in with Google</button></div>' +
      '<details style="margin-top:12px"><summary class="mut" style="cursor:pointer">One-time Firebase setup</summary><ol class="mut" style="font-size:13px"><li>Firebase console → Authentication → Sign-in method → enable <b>Google</b>.</li><li>Authentication → Settings → Authorized domains → add the address where you host this app.</li><li>Realtime Database → Rules → add:<pre style="background:var(--bg);padding:10px;border-radius:8px;overflow:auto">"users": { "$uid": { ".read": "auth.uid === $uid", ".write": "auth.uid === $uid" } }</pre></li><li>Project settings → copy the Web API key, project ID and database URL here.</li></ol><p class="mut" style="font-size:12px">If you lose the encryption password the cloud copy cannot be recovered.</p></details></div>';
  }
  function googleWire() {
    var c = syncCfg();
    if (c && c.mode === 'google') {
      $('#gsync').onclick = function () { syncStatus = 'Syncing…'; $('#gstat').textContent = syncStatus; runSync(true).then(function () { var e = $('#gstat'); if (e) e.textContent = syncStatus; }); };
      $('#gout').onclick = function () { ask('<h2>Sign out?</h2><p class="mut">Your data stays on this device; it just stops syncing.</p>', function () { fbAuth(c).then(function (a) { return a.signOut(); }).catch(function () { }); lsSet(SYNCKEY, null); lsSet(METAKEY, null); settings(); }, 'Sign out'); };
      return;
    }
    var b = $('#glogin'); if (!b) return;
    b.onclick = function () {
      var key = $('[name=gkey]').value.trim(), proj = $('[name=gproj]').value.trim(), url = $('[name=gurl]').value.trim(), pass = $('[name=gpass]').value;
      if (!key || !proj || !/^https:\/\//.test(url) || pass.length < 6) { toast('Fill in all four fields (password: at least 6 characters)'); return; }
      var cfg = { mode: 'google', apiKey: key, projectId: proj, url: url, code: pass };
      googleLogin(cfg).then(function (u) { cfg.hid = u.uid; cfg.email = u.email; cfg.cols = PERSONAL.slice(); lsSet(SYNCKEY, JSON.stringify(cfg)); lsSet(METAKEY, null); syncStatus = 'Syncing…'; settings(); return runSync(true).then(function () { settings(); }); }).catch(function (e) { toast('Google sign-in failed: ' + (e.message || e)); });
    };
  }
  function familyHtml() {
    var c = syncCfg(), secure = !!(window.crypto && crypto.subtle);
    if (c && c.mode === 'google') return googleHtml();
    if (!c) return googleHtml() + familyHtml2(c, secure);
    return familyHtml2(c, secure);
  }
  function familyHtml2(c, secure) {
    if (c) return '<div class="card" style="margin-top:14px"><h2>👨‍👩‍👧 Family space <span class="tag paid">on</span></h2><p>Family code: <code style="font-size:15px">' + esc(c.code) + '</code> <button class="btn s" id="fcopy">Copy</button></p><p class="mut" style="font-size:12px;margin:6px 0">Share it only through a private channel. Anyone with the code can read and edit the shared data.</p>' +
      '<div class="row" style="margin:10px 0">' + Object.keys(SHARE_ALL).map(function (k) { return '<label style="display:flex;gap:6px;align-items:center;margin:0;font-weight:500"><input type="checkbox" style="width:auto" data-sc="' + k + '" ' + (c.cols.indexOf(k) > -1 ? 'checked' : '') + '> ' + SHARE_ALL[k] + '</label>'; }).join('') + '</div>' +
      '<div class="row" style="margin-bottom:10px"><button class="btn s" data-preset="all">Share everything (couple)</button><button class="btn s" data-preset="house">Household only</button></div><p class="mut" style="font-size:12px;margin:0 0 10px">You can still mark single items as <b>Private (only me)</b> — a surprise gift, a personal account — and they will not sync.</p>' +
      '<div class="row"><button class="btn p" id="fsync">Sync now</button><button class="btn d" id="fleave">Leave family space</button></div><p class="mut" style="font-size:12px;margin:10px 0 0" id="fstat">' + esc(syncStatus || (c.last ? 'Last sync ' + new Date(c.last).toLocaleString() : 'Not synced yet')) + '</p></div>';
    return '<div class="card" style="margin-top:14px"><h2>👨‍👩‍👧 Family space (optional)</h2><p class="mut">Share household bills, subscriptions, loans, goals and more with your family on all your devices. Data is <b>encrypted on your device</b> before it is stored in <b>your own Firebase project</b>, so even the database owner only sees scrambled text. You choose how much to share: just the household, or <b>everything including salaries</b> if you manage money together as a couple.</p>' +
      (secure ? '<div class="f">' + field('Firebase Realtime Database URL', 'fburl', '', 'url', 'placeholder="https://your-project-default-rtdb.europe-west1.firebasedatabase.app"') + field('Firebase Web API key', 'fbkey', '') + '<div class="w"><label>What do you share?</label><select name="fpreset"><option value="house">Household only — bills, subscriptions, loans, goals… (salary and business stay private)</option><option value="all">Everything — we share it all, salaries included (couples)</option></select></div></div><div class="row" style="margin-top:10px"><button class="btn p" id="fcreate">Create family space</button><button class="btn" id="fjoin">Join with a code</button></div>' +
        '<details style="margin-top:12px"><summary class="mut" style="cursor:pointer">One-time Firebase setup</summary><ol class="mut" style="font-size:13px"><li>Firebase console → Authentication → Sign-in method → enable <b>Anonymous</b>.</li><li>Realtime Database → Rules → add: <pre style="background:var(--bg);padding:10px;border-radius:8px;overflow:auto">"households": { "$hid": { ".read": "auth != null", ".write": "auth != null" } }</pre></li><li>Project settings → copy the Web API key and the database URL here.</li></ol></details>' : '<p class="mut">Family sync needs this page to be served over https (for example GitHub Pages).</p>') + '</div>';
  }
  function familyWire() {
    var c = syncCfg(); googleWire(); if (c && c.mode === 'google') return;
    if (c) {
      $('#fcopy').onclick = function () { (navigator.clipboard ? navigator.clipboard.writeText(c.code) : Promise.reject()).then(function () { toast('Code copied'); }, function () { prompt('Copy the code', c.code); }); };
      $('#fsync').onclick = function () { syncStatus = 'Syncing…'; $('#fstat').textContent = syncStatus; runSync(true).then(function () { var e = $('#fstat'); if (e) e.textContent = syncStatus; }); };
      view.querySelectorAll('[data-sc]').forEach(function (cb) { cb.onchange = function () { var cols = []; view.querySelectorAll('[data-sc]').forEach(function (x) { if (x.checked) cols.push(x.dataset.sc); }); c.cols = cols; lsSet(SYNCKEY, JSON.stringify(c)); toast('Saved — applies on the next sync'); }; });
      view.querySelectorAll('[data-preset]').forEach(function (b) { b.onclick = function () { c.cols = b.dataset.preset === 'all' ? Object.keys(SHARE_ALL) : SHARE_DEFAULT.slice(); lsSet(SYNCKEY, JSON.stringify(c)); toast('Saved — applies on the next sync'); settings(); }; });
      $('#fleave').onclick = function () { ask('<h2>Leave the family space?</h2><p class="mut">Your data stays on this device; it just stops syncing. Other members keep theirs.</p>', function () { lsSet(SYNCKEY, null); lsSet(METAKEY, null); settings(); }, 'Leave'); };
      return;
    }
    var go = function (code) {
      var url = ($('[name=fburl]').value || '').trim(), key = ($('[name=fbkey]').value || '').trim(); if (!/^https:\/\/.+/.test(url) || !key) { toast('Enter the database URL and the API key first'); return; }
      sha(code).then(function (hid) { lsSet(SYNCKEY, JSON.stringify({ url: url, apiKey: key, code: code, hid: hid, cols: code.charAt(0) === 'e' ? Object.keys(SHARE_ALL) : SHARE_DEFAULT.slice() })); lsSet(METAKEY, null); syncStatus = 'Syncing…'; settings(); return runSync(true).then(function () { settings(); }); });
    };
    $('#fcreate').onclick = function () { go(newCode($('[name=fpreset]').value === 'all')); };
    $('#fjoin').onclick = function () { ask('<h2>Join a family space</h2><div class="f">' + field('Family code', 'code', '', 'text', 'placeholder="xxxx-xxxx-xxxx-xxxx" required') + '</div>', function (d) { var cd = val(d, 'code').toLowerCase().replace(/\s/g, ''); if (cd.length < 12) { toast('That code looks too short'); return; } go(cd); }, 'Join'); };
  }
  window.__ledgerly = window.__ledgerly || {}; window.__ledgerly.runSync = runSync; window.__famOn = function () { return !!syncCfg(); };

  function billCard(t) {
    var l = byType(t), T = BT[t], last = l[l.length - 1], prev = l[l.length - 2];
    var yoyB = l.filter(function (b) { var d = (new Date(last.date) - new Date(b.date)) / 864e5; return d > 330 && d < 400; }).pop();
    var h = '<div class="card" style="margin-bottom:14px"><div class="row" style="justify-content:space-between"><h2 style="margin:0;color:' + T.c + '">' + T.l + '</h2><span class="mut">' + l.length + ' bills' + (T.u ? ' · <a href="#" data-fc="' + t + '" onclick="return false">Forecast next bill</a>' : '') + '</span></div>';
    var summary = [];
    if (prev) { var w = why(prev, last), c = pct(last.amount, prev.amount); summary.push('<div class="card kpi ' + (c > 0.5 ? 'bad' : c < -0.5 ? 'ok' : '') + '"><small>Last bill vs previous</small><b>' + fp(c) + '</b><small>' + (w.d >= 0 ? '+' : '') + money(w.d) + (w.price != null ? ' · ' + (w.price >= 0 ? '+' : '') + money(w.price) + ' from price per ' + T.u + ', ' + (w.usage >= 0 ? '+' : '') + money(w.usage) + ' from usage' : '') + '</small></div>'); }
    if (yoyB) { var cy = pct(last.amount, yoyB.amount); summary.push('<div class="card kpi ' + (cy > 0.5 ? 'bad' : cy < -0.5 ? 'ok' : '') + '"><small>vs a year ago</small><b>' + fp(cy) + '</b><small>' + money(yoyB.amount) + ' → ' + money(last.amount) + '</small></div>'); }
    if (billUnit(last) != null) { var u0 = l.filter(function (b) { return billUnit(b) != null; })[0], cu = pct(billUnit(last), billUnit(u0)); summary.push('<div class="card kpi ' + (cu > 0.5 ? 'bad' : '') + '"><small>Price per ' + T.u + ' now</small><b>' + money(billUnit(last)) + '</b><small>' + fp(cu) + ' since ' + fdate(u0.date) + '</small></div>'); }
    if (db.settings.people > 1) summary.push('<div class="card kpi"><small>Last bill per person (' + db.settings.people + ')</small><b>' + money(last.amount / db.settings.people) + '</b></div>');
    h += '<div class="grid g4" style="margin:12px 0">' + summary.join('') + '</div>';
    h += '<div class="grid g2"><div><small class="mut">Amount per bill</small>' + lineChart(l, function (b) { return b.amount; }, T.c, money) + '</div>' +
      (T.u && l.filter(function (b) { return billUnit(b) != null; }).length > 1 ? '<div><small class="mut">Price per ' + T.u + ' (what you really pay, fees included)</small>' + lineChart(l.filter(function (b) { return billUnit(b) != null; }), billUnit, '#c0262d', function (v) { return v.toFixed(3); }) + '</div>' : '') + '</div>';
    h += '<table style="margin-top:10px"><thead><tr><th>Date</th><th>Provider</th>' + (T.u ? '<th class="r">' + T.u + '</th><th class="r">Per ' + T.u + '</th>' : '') + '<th class="r">Amount</th><th class="r">Change</th><th></th></tr></thead><tbody>' + l.slice().reverse().map(function (b, i, arr) {
      var pv = arr[i + 1], c = pv ? pct(b.amount, pv.amount) : null;
      return '<tr><td class="mut">' + fdate(b.date) + '</td><td>' + esc(b.provider) + (b.file ? ' <a href="#" data-f="' + b.id + '" title="Open attachment">📎</a>' : '') + (b.due && b.paid === false ? ' <span class="tag ' + (b.due < today() ? 'overdue' : 'sent') + '">due ' + fdate(b.due) + '</span>' : '') + '</td>' + (T.u ? '<td class="r">' + (b.usage || '—') + '</td><td class="r">' + (billUnit(b) != null ? billUnit(b).toFixed(3) : '—') + '</td>' : '') + '<td class="r"><b>' + money(b.amount) + '</b></td><td class="r"><span class="tag ' + (c > 0.5 ? 'overdue' : c < -0.5 ? 'paid' : '') + '">' + fp(c) + '</span></td><td class="r"><button class="btn s" data-e="' + b.id + '">Edit</button></td></tr>';
    }).join('') + '</tbody></table></div>';
    return h.replace(/<\/div>$/, offerBox(t, l) + '</div>');
  }
  function billForm(b, pre, file) {
    if (file) { pre = pre || {}; pre._file = file; }
    b = b || Object.assign({ id: uid(), type: 'electricity', provider: '', date: today(), amount: '', usage: '', note: '' }, pre ? { type: pre.type, provider: pre.provider, date: pre.date, amount: pre.amount, usage: pre.usage } : {});
    var isNew = !db.bills.some(function (x) { return x.id === b.id; });
    ask('<h2>' + (isNew ? 'Add bill' : 'Edit bill') + '</h2>' + (pre ? '<p class="mut">Read from your file — please check the values.</p>' : '') + '<div class="f"><div><label>Type</label><select name="type">' + Object.keys(BT).map(function (t) { return '<option value="' + t + '" ' + (t === b.type ? 'selected' : '') + '>' + BT[t].l + '</option>'; }).join('') + '</select></div>' +
      field('Bill date', 'date', b.date, 'date') + field('Payment due (optional)', 'due', b.due || '', 'date') + field('Provider', 'provider', b.provider) + field('Total amount', 'amount', b.amount, 'text', 'inputmode="decimal" required') + field('Usage (kWh / m³)', 'usage', b.usage, 'text', 'inputmode="decimal"') + field('Note', 'note', b.note) + '<div><label>Paid?</label><select name="paid"><option value="1" ' + (b.paid !== false ? 'selected' : '') + '>Paid</option><option value="0" ' + (b.paid === false ? 'selected' : '') + '>Not paid yet</option></select></div>' + attachField(b, pre && pre._file) + '</div>' +
      '<p class="mut" style="font-size:12px">Tip: enter the <b>total you paid</b>, fixed fees included — the price per unit then shows what you really pay.</p>' + (isNew ? '' : '<p><button type="button" class="btn s d" id="rm">Delete bill</button></p>'), function (d) {
      if (!num(val(d, 'amount'))) { toast('Amount is required'); return; }
      b.type = val(d, 'type'); b.date = val(d, 'date') || today(); b.provider = val(d, 'provider'); b.amount = num(val(d, 'amount')); b.usage = num(val(d, 'usage')); b.note = val(d, 'note'); b.due = val(d, 'due'); b.paid = val(d, 'paid') !== '0';
      saveAttach(b, d, pre && pre._file);
      if (isNew) db.bills.push(b); save(); bills(); toast('Bill saved');
    });
    var rm = dlg.querySelector('#rm'); if (rm) rm.onclick = function () { db.bills = db.bills.filter(function (x) { return x.id !== b.id; }); save(); dlg.close('x'); bills(); };
  }

  /* Import: PDFs are read as text (pdf.js); photos / scanned pages go through OCR (Tesseract.js). Both run in the browser.
     The libraries load from a CDN the first time you use the button. */
  function loadScript(src) { return new Promise(function (ok, no) { var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = function () { no(new Error('Could not load ' + src)); }; document.head.appendChild(s); }); }
  function parseBill(text) {
    var t = text.replace(/ /g, ' '), low = t.toLowerCase(), o = {};
    o.type = /kwh|eletric|electric|\bluz\b|energia/.test(low) ? 'electricity' : /m3|m³|[aá]gua|water|saneamento|epal|[aá]guas/.test(low) ? (/\bg[aá]s\b|natural/.test(low) && !/[aá]gua/.test(low) ? 'gas' : 'water') : /\bg[aá]s\b/.test(low) ? 'gas' : /internet|fibra|\btv\b/.test(low) ? 'internet' : 'other';
    var n = '(\\d{1,3}(?:[.\\s]\\d{3})*(?:[.,]\\d{1,3})?|\\d+(?:[.,]\\d+)?)', toNum = function (x) { x = x.replace(/\s/g, ''); if (/,\d{1,3}$/.test(x)) x = x.replace(/\./g, '').replace(',', '.'); else x = x.replace(/,/g, ''); return parseFloat(x); };
    var u = t.match(new RegExp(n + '\\s*(kwh|m3|m³)', 'i')); if (u) o.usage = toNum(u[1]);
    var tot = null, re = new RegExp('(total(?:\\s+a\\s+pagar|\\s+due|\\s+fatura)?|a\\s+pagar|amount\\s+due|valor\\s+a\\s+pagar)[^\\d\\n]{0,25}' + n + '\\s*(?:€|eur)?', 'ig'), m;
    while ((m = re.exec(t))) { var v = toNum(m[2]); if (v > 0 && (tot == null || v > tot)) tot = v; }
    if (tot == null) { var all = (t.match(new RegExp(n + '\\s*(?:€|eur)', 'ig')) || []).map(function (x) { return toNum(x.replace(/[^\d.,\s]/g, '').trim()); }).filter(function (x) { return x > 0; }); if (all.length) tot = Math.max.apply(null, all); }
    if (tot != null) o.amount = tot;
    var d = t.match(/(\d{4})[-\/.](\d{2})[-\/.](\d{2})/), d2 = t.match(/(\d{2})[-\/.](\d{2})[-\/.](\d{4})/);
    if (d) o.date = d[1] + '-' + d[2] + '-' + d[3]; else if (d2) o.date = d2[3] + '-' + d2[2] + '-' + d2[1];
    var prov = low.match(/edp|endesa|iberdrola|galp|goldenergy|su eletricidade|epal|[aá]guas de [a-zà-ú]+|nos|meo|vodafone|nowo/); if (prov) o.provider = prov[0].replace(/^./, function (c) { return c.toUpperCase(); });
    return o;
  }
  function importBill(file) {
    toast('Reading ' + file.name + '…');
    var job = file.type === 'application/pdf' ? readPdf(file) : readImage(file);
    job.then(function (text) {
      var r = parseBill(text); if (!r.amount && !r.usage) toast('Could not find the amounts — fill them in by hand');
      billForm(null, r, file);
    }).catch(function (e) { console.error(e); toast('Could not read that file. You can add the bill by hand.'); billForm(null, null, file); });
  }
  function readPdf(file) {
    var V = '3.11.174', B = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/' + V + '/';
    return loadScript(B + 'pdf.min.js').then(function () {
      pdfjsLib.GlobalWorkerOptions.workerSrc = B + 'pdf.worker.min.js';
      return file.arrayBuffer();
    }).then(function (buf) { return pdfjsLib.getDocument({ data: buf }).promise; }).then(function (pdf) {
      var pages = []; for (var i = 1; i <= Math.min(pdf.numPages, 4); i++) pages.push(pdf.getPage(i).then(function (p) { return p.getTextContent(); }).then(function (c) { return c.items.map(function (x) { return x.str; }).join(' '); }));
      return Promise.all(pages);
    }).then(function (t) { return t.join('\n'); });
  }
  function readImage(file) {
    return loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js').then(function () { return Tesseract.recognize(file, 'por+eng'); }).then(function (r) { return r.data.text; });
  }
  window.__ledgerly = window.__ledgerly || {}; window.__ledgerly.parseBill = parseBill;
  window.__ledgerly.parseReceipt = function (t) { return parseReceipt(t); };

  function demo() {
    var y = new Date().getFullYear(), d = function (m, day) { return y + '-' + String(m).padStart(2, '0') + '-' + String(day).padStart(2, '0'); };
    db = JSON.parse(JSON.stringify(DEFAULTS));
    db.settings.name = 'Northwind Studio'; db.settings.taxId = 'PT 123 456 789'; db.settings.address = '12 Harbour Street\n1000-001 Lisbon'; db.settings.email = 'hello@northwind.example'; db.settings.iban = 'PT50 0000 0000 0000 0000 0000 0';
    var a = { id: uid(), name: 'Acme Corp', email: 'billing@acme.example', taxId: 'DE 811 000 000', address: '1 Industrial Way\nBerlin' }, b = { id: uid(), name: 'Blue Fox Ltd', email: 'ap@bluefox.example', taxId: '', address: '8 Orchard Road\nLondon' };
    db.clients.push(a, b);
    var mk = function (n, c, issue, st, items) { var i = { id: uid(), number: db.settings.prefix + '-' + y + '-' + String(n).padStart(3, '0'), clientId: c.id, issue: issue, due: addDays(issue, 30), status: st, currency: 'EUR', items: items, notes: db.settings.footer }; if (st === 'paid') i.paidOn = addDays(issue, 18); db.invoices.push(i); };
    mk(1, a, d(1, 15), 'paid', [{ d: 'Website redesign', q: 1, p: 2400, v: 23 }]);
    mk(2, b, d(2, 10), 'paid', [{ d: 'Brand workshop (days)', q: 3, p: 650, v: 23 }]);
    mk(3, a, d(3, 20), 'paid', [{ d: 'Monthly retainer', q: 1, p: 900, v: 23 }]);
    mk(4, b, d(4, 8), 'paid', [{ d: 'Landing page', q: 1, p: 1500, v: 23 }, { d: 'Copywriting', q: 4, p: 80, v: 23 }]);
    mk(5, a, d(5, 2), 'paid', [{ d: 'Monthly retainer', q: 1, p: 900, v: 23 }]);
    mk(6, b, d(6, 14), 'sent', [{ d: 'Design system', q: 5, p: 700, v: 23 }]);
    mk(7, a, addDays(today(), -50), 'sent', [{ d: 'Consulting', q: 6, p: 120, v: 23 }]);
    mk(8, b, today(), 'draft', [{ d: 'Quarterly review', q: 1, p: 450, v: 23 }]);
    var el = [[1, 212, 0.158], [2, 198, 0.158], [3, 205, 0.159], [4, 176, 0.159], [5, 160, 0.171], [6, 150, 0.172], [7, 171, 0.172], [8, 184, 0.186], [9, 168, 0.187]];
    el.forEach(function (e) { db.bills.push({ id: uid(), type: 'electricity', provider: 'EDP', date: (y - 0) + '-' + String(e[0]).padStart(2, '0') + '-05', usage: e[1], amount: round2(e[1] * e[2] + 9.4), note: '' }); });
    [[1, 14, 2.1], [3, 15, 2.1], [5, 13, 2.35], [7, 18, 2.35], [9, 16, 2.6]].forEach(function (e) { db.bills.push({ id: uid(), type: 'water', provider: 'Águas', date: y + '-' + String(e[0]).padStart(2, '0') + '-12', usage: e[1], amount: round2(e[1] * e[2] + 6.8), note: '' }); });
    db.income.push({ id: uid(), source: 'Salary', amount: 1450, cycle: 'monthly', day: 25, active: true, note: '' }, { id: uid(), source: 'Holiday pay', amount: 1450, cycle: 'yearly', day: 0, active: true, note: '' });
    db.loans.push({ id: uid(), name: 'Car loan', lender: 'Bank', principal: 12000, rate: 6.5, term: 60, payment: 0, start: addMonths(today(), -18), note: '' }, { id: uid(), name: 'Mortgage', lender: 'Bank', principal: 140000, rate: 3.9, term: 360, payment: 0, start: addMonths(today(), -36), note: '' });
    [['Netflix', 'streaming', 13.99, 'monthly', 1, [11.99, 13.99]], ['Spotify Family', 'music', 17.99, 'monthly', 3, [15.99, 17.99]], ['Disney+', 'streaming', 8.99, 'monthly', 1, [8.99]], ['IPTV', 'iptv', 12, 'monthly', 1, [12]], ['iCloud+', 'cloud', 2.99, 'monthly', 1, [2.99]], ['Domain', 'domain', 14, 'yearly', 1, [14]], ['Gym', 'fitness', 29.9, 'monthly', 1, [29.9]]].forEach(function (u, i) {
      db.subs.push({ id: uid(), name: u[0], cat: u[1], amount: u[2], cycle: u[3], people: u[4], next: addDays(today(), 2 + i * 4), active: true, trial: false, note: '', history: u[5].map(function (a, k) { return { d: addDays(today(), -200 + k * 150), a: a }; }) });
    });
    [[d(1, 5), 'Figma', 'Software', 15], [d(2, 3), 'Co-working space', 'Office', 190], [d(3, 12), 'Laptop', 'Equipment', 1499], [d(4, 22), 'Train tickets', 'Travel', 86.5], [d(5, 9), 'Ads', 'Marketing', 240], [d(6, 1), 'Accountant', 'Services', 120]]
      .forEach(function (e) { db.expenses.push({ id: uid(), date: e[0], vendor: e[1], cat: e[2], amount: e[3], note: '' }); });
  }

  applyMode(); runRecurring(); route(); lock(); notifyDue(); setTimeout(runSync, 1500);
  if (!location.hash) location.hash = '#/';
})();
