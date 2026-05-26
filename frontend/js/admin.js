// Admin Dashboard JS

document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.isAuth()) { window.location.href = 'login.html'; return; }
  const user = Auth.getUser();
  if (user?.role !== 'admin') { window.location.href = 'login.html'; return; }

  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  document.getElementById('dashHamburger').addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('show');
  });
  overlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
  });

  document.querySelectorAll('.sidebar__link[data-tab]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      switchTab(link.dataset.tab);
      sidebar.classList.remove('open');
      overlay.classList.remove('show');
    });
  });

  document.querySelectorAll('.modal-overlay').forEach(o => {
    o.addEventListener('click', e => { if (e.target === o) o.classList.remove('open'); });
  });

  await loadAll();
});

function switchTab(tab) {
  document.querySelectorAll('.sidebar__link[data-tab]').forEach(l => l.classList.remove('active'));
  document.querySelector(`[data-tab="${tab}"]`)?.classList.add('active');
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById(`tab-${tab}`)?.classList.add('active');
  const titles = { overview: 'Обзор', pms: 'ПМ-менеджеры', teams: 'Все команды', challenges: 'Все челленджи', prizes: 'Призы', rating: 'Рейтинг' };
  document.getElementById('pageTitle').textContent = titles[tab] || tab;
}

let pms = [], teams = [], allMembers = [], allChallenges = [], prizes = [];

async function loadAll() {
  try { pms = await api('GET', '/admin/pms'); } catch { pms = []; }
  try { teams = await api('GET', '/admin/teams'); } catch { teams = []; }
  try { allMembers = await api('GET', '/admin/members'); } catch { allMembers = []; }
  try { allChallenges = await api('GET', '/admin/challenges'); } catch { allChallenges = []; }
  try { prizes = await api('GET', '/prizes/'); } catch { prizes = []; }
  renderAll();
}

function renderAll() {
  renderOverview();
  renderPMs();
  renderTeams();
  renderChallenges();
  renderPrizes();
  renderRating();
}

function initials(m) {
  return ((m.first_name?.[0] || '') + (m.last_name?.[0] || '')).toUpperCase() ||
    (m.full_name?.[0] || m.username?.[0] || '?').toUpperCase();
}

function renderOverview() {
  document.getElementById('sPMs').textContent = pms.length;
  document.getElementById('sTeams').textContent = teams.length;
  document.getElementById('sMembers').textContent = allMembers.length;
  const total = allMembers.reduce((s, m) => s + (m.total_points || 0), 0);
  document.getElementById('sPoints').textContent = total;

  const sorted = [...allMembers].sort((a, b) => (b.total_points || 0) - (a.total_points || 0)).slice(0, 5);
  const medals = ['🥇', '🥈', '🥉'];
  const topEl = document.getElementById('globalTopRating');
  topEl.innerHTML = sorted.length ? sorted.map((m, i) => `
    <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--gray-border)">
      <span style="font-size:18px">${medals[i] || (i + 1)}</span>
      <div class="rating-avatar" style="background:var(--purple)">${initials(m)}</div>
      <div style="flex:1">
        <div style="font-family:var(--font-display);font-size:12px;font-weight:600">${m.first_name} ${m.last_name}</div>
        <div style="font-size:11px;color:var(--text-muted)">${m.team_name || ''}</div>
      </div>
      <span style="font-family:var(--font-display);font-weight:700;color:var(--purple)">${m.total_points || 0}</span>
    </div>`).join('')
    : `<div class="empty-state"><div class="empty-state__icon">🏆</div><div class="empty-state__title">Нет данных</div></div>`;

  const tPrev = document.getElementById('teamsPreview');
  tPrev.innerHTML = teams.length ? teams.map(t => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--gray-border)">
      <div>
        <div style="font-family:var(--font-display);font-size:13px;font-weight:600">${t.name}</div>
        <div style="font-size:11px;color:var(--text-muted)">ПМ: ${t.pm_name || '—'}</div>
      </div>
      <span style="font-size:12px;color:var(--text-muted)">${t.members_count || 0} участников</span>
    </div>`).join('')
    : `<div class="empty-state"><div class="empty-state__icon">👥</div><div class="empty-state__title">Нет команд</div></div>`;
}

function renderPMs() {
  const tbody = document.getElementById('pmTableBody');
  if (!pms.length) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-state__icon">👤</div><div class="empty-state__title">Нет ПМ-аккаунтов</div></div></td></tr>`;
    return;
  }
  tbody.innerHTML = pms.map(pm => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          <div class="rating-avatar" style="background:var(--purple)">${(pm.full_name?.[0] || pm.username?.[0] || '?').toUpperCase()}</div>
          <div>
            <div style="font-family:var(--font-display);font-size:13px;font-weight:600">${pm.full_name || pm.username}</div>
            <div style="font-size:11px;color:var(--text-muted)">${pm.email || ''}</div>
          </div>
        </div>
      </td>
      <td style="font-size:13px">${pm.team_name || '—'}</td>
      <td style="font-size:13px">${pm.members_count || 0}</td>
      <td style="font-size:12px;color:var(--text-muted)">${pm.created_at ? new Date(pm.created_at).toLocaleDateString('ru-RU') : '—'}</td>
      <td>
        <button class="btn btn--danger" style="padding:5px 10px;font-size:11px" onclick="deletePM(${pm.id})">Удалить</button>
      </td>
    </tr>`).join('');
}

function renderTeams() {
  const el = document.getElementById('allTeamsList');
  if (!teams.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-state__icon">👥</div><div class="empty-state__title">Нет команд</div></div>`;
    return;
  }
  el.innerHTML = `<div style="display:flex;flex-direction:column;gap:12px">` +
    teams.map(t => `
      <div style="background:var(--gray-mid);border:1px solid var(--gray-border);border-radius:var(--radius-md);padding:16px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <div>
            <div style="font-family:var(--font-display);font-size:15px;font-weight:700">${t.name}</div>
            <div style="font-size:12px;color:var(--text-muted)">ПМ: ${t.pm_name || '—'}</div>
          </div>
          <span style="font-size:13px;color:var(--text-muted)">${t.members_count || 0} участников</span>
        </div>
      </div>`).join('') + '</div>';
}

function renderChallenges() {
  const tbody = document.getElementById('allChallengesBody');
  if (!allChallenges.length) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-state__icon">🎯</div><div class="empty-state__title">Нет челленджей</div></div></td></tr>`;
    return;
  }
  tbody.innerHTML = allChallenges.map(c => `
    <tr>
      <td style="font-size:13px">${c.title}</td>
      <td><span class="badge badge--${c.level.toLowerCase()}">${c.level}</span></td>
      <td style="font-family:var(--font-display);color:var(--purple);font-weight:700">${c.points}</td>
      <td style="font-size:12px;color:var(--text-muted)">${c.pm_name || '—'}</td>
      <td><button class="btn btn--danger" style="padding:5px 10px;font-size:11px" onclick="adminDeleteChallenge(${c.id})">Удалить</button></td>
    </tr>`).join('');
}

function renderPrizes() {
  const el = document.getElementById('prizesList');
  if (!prizes.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-state__icon">🎁</div><div class="empty-state__title">Нет призов</div><div class="empty-state__text">Добавьте первый приз в каталог</div></div>`;
    return;
  }
  el.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px">` +
    prizes.map(p => `
      <div style="background:var(--gray-mid);border:1px solid var(--gray-border);border-radius:var(--radius-md);padding:20px">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px">
          <span class="badge badge--${p.level.toLowerCase()}">${p.level}</span>
          <button class="btn btn--danger" style="padding:4px 8px;font-size:10px" onclick="deletePrize(${p.id})">✕</button>
        </div>
        <div style="font-family:var(--font-display);font-size:15px;font-weight:700;margin-bottom:6px">${p.name}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:10px">${p.description || ''}</div>
        <div style="font-family:var(--font-display);font-size:13px;color:var(--cyan)">${p.cost} баллов</div>
      </div>`).join('') + '</div>';
}

function renderRating() {
  const sorted = [...allMembers].sort((a, b) => (b.total_points || 0) - (a.total_points || 0));
  const el = document.getElementById('globalRatingFull');
  if (!sorted.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-state__icon">🏆</div><div class="empty-state__title">Нет данных</div></div>`;
    return;
  }
  const medals = ['🥇', '🥈', '🥉'];
  el.innerHTML = `<div class="rating-table">
    <div class="rating-header" style="grid-template-columns:48px 1fr 100px 120px">
      <span>#</span><span>Участник</span><span>Баллы</span><span class="rating-hide-mobile">Команда</span>
    </div>` +
    sorted.map((m, i) => `
      <div class="rating-row ${i<3?['rating-row--gold','rating-row--silver','rating-row--bronze'][i]:''}" style="grid-template-columns:48px 1fr 100px 120px">
        <span class="rating-place">${medals[i] || (i+1)}</span>
        <div class="rating-user">
          <div class="rating-avatar" style="background:var(--purple)">${initials(m)}</div>
          <div>
            <div class="rating-name">${m.first_name} ${m.last_name}</div>
            <div class="rating-role">${m.role_in_project || ''}</div>
          </div>
        </div>
        <span class="rating-points">${m.total_points || 0} pts</span>
        <span class="rating-challenges rating-hide-mobile">${m.team_name || '—'}</span>
      </div>`).join('') + '</div>';
}

// === ACTIONS ===
async function createPM() {
  const full_name = document.getElementById('pmFullName').value.trim();
  const username = document.getElementById('pmUsername').value.trim();
  const email = document.getElementById('pmEmail').value.trim();
  const password = document.getElementById('pmPassword').value;
  const team_name = document.getElementById('pmTeamName').value.trim();
  if (!username || !password) { showToast('Заполните логин и пароль', 'error'); return; }
  try {
    await api('POST', '/admin/pms', { full_name, username, email, password, team_name });
    closeModal('createPMModal');
    ['pmFullName','pmUsername','pmEmail','pmPassword','pmTeamName'].forEach(id => document.getElementById(id).value = '');
    await loadAll();
    showToast('ПМ-аккаунт создан');
  } catch (e) { showToast(e.message, 'error'); }
}

async function deletePM(id) {
  if (!confirm('Удалить ПМ-аккаунт? Все данные будут утеряны.')) return;
  try {
    await api('DELETE', `/admin/pms/${id}`);
    await loadAll();
    showToast('ПМ удалён');
  } catch (e) { showToast(e.message, 'error'); }
}

async function adminDeleteChallenge(id) {
  if (!confirm('Удалить челлендж?')) return;
  try {
    await api('DELETE', `/challenges/${id}`);
    await loadAll();
    showToast('Челлендж удалён');
  } catch (e) { showToast(e.message, 'error'); }
}

async function addPrize() {
  const name = document.getElementById('prizeName').value.trim();
  const description = document.getElementById('prizeDesc').value.trim();
  const cost = parseInt(document.getElementById('prizeCost').value);
  const level = document.getElementById('prizeLevel').value;
  if (!name) { showToast('Введите название', 'error'); return; }
  try {
    await api('POST', '/prizes/', { name, description, cost, level });
    closeModal('addPrizeModal');
    ['prizeName','prizeDesc'].forEach(id => document.getElementById(id).value = '');
    await loadAll();
    showToast('Приз добавлен');
  } catch (e) { showToast(e.message, 'error'); }
}

async function deletePrize(id) {
  if (!confirm('Удалить приз?')) return;
  try {
    await api('DELETE', `/prizes/${id}`);
    await loadAll();
    showToast('Приз удалён');
  } catch (e) { showToast(e.message, 'error'); }
}

function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = `toast toast--${type} show`;
  setTimeout(() => t.classList.remove('show'), 3000);
}
