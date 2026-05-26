// PM Dashboard JS

document.addEventListener('DOMContentLoaded', async () => {
  // Auth guard
  if (!Auth.isAuth()) { window.location.href = 'login.html'; return; }
  const user = Auth.getUser();
  if (user?.role !== 'pm') { window.location.href = 'login.html'; return; }

  // Set user info
  const initials = (user.full_name || 'ПМ').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  document.getElementById('userAvatar').textContent = initials;
  document.getElementById('userName').textContent = user.full_name || user.username;

  // Sidebar toggle
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

  // Tab navigation
  document.querySelectorAll('.sidebar__link[data-tab]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const tab = link.dataset.tab;
      switchTab(tab);
      sidebar.classList.remove('open');
      overlay.classList.remove('show');
    });
  });

  // Set today's date as default for daily
  const dailyDate = document.getElementById('dailyDate');
  if (dailyDate) dailyDate.value = new Date().toISOString().split('T')[0];

  await loadAll();
});

function switchTab(tab) {
  document.querySelectorAll('.sidebar__link[data-tab]').forEach(l => l.classList.remove('active'));
  document.querySelector(`[data-tab="${tab}"]`)?.classList.add('active');
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById(`tab-${tab}`)?.classList.add('active');
  const titles = { overview: 'Обзор', team: 'Команда', challenges: 'Челленджи', daily: 'Дейли-задачи', rating: 'Рейтинг' };
  document.getElementById('pageTitle').textContent = titles[tab] || tab;
}

// State
let teamMembers = [];
let challenges = [];
let dailyTasks = [];
let currentChallengeFilter = 'all';

async function loadAll() {
  await Promise.all([loadTeam(), loadChallenges(), loadDailyTasks()]);
  renderOverview();
  renderRating();
}

async function loadTeam() {
  try {
    teamMembers = await api('GET', '/teams/my/members');
    renderTeam();
  } catch (e) { teamMembers = []; renderTeam(); }
}

async function loadChallenges() {
  try {
    challenges = await api('GET', '/challenges/my');
    renderChallenges();
  } catch (e) { challenges = []; }
}

async function loadDailyTasks() {
  try {
    dailyTasks = await api('GET', '/daily-tasks/my');
    renderDaily();
  } catch (e) { dailyTasks = []; }
}

// === RENDER FUNCTIONS ===

function renderOverview() {
  document.getElementById('statMembers').textContent = teamMembers.length;
  document.getElementById('statChallenges').textContent = challenges.length;
  const today = new Date().toISOString().split('T')[0];
  const todayTasks = dailyTasks.filter(t => t.date === today).length;
  document.getElementById('statDaily').textContent = todayTasks;
  const totalPts = teamMembers.reduce((s, m) => s + (m.total_points || 0), 0);
  document.getElementById('statPoints').textContent = totalPts;

  // Top-3
  const sorted = [...teamMembers].sort((a, b) => (b.total_points || 0) - (a.total_points || 0)).slice(0, 3);
  const topEl = document.getElementById('topRatingList');
  if (!sorted.length) {
    topEl.innerHTML = `<div class="empty-state"><div class="empty-state__icon">📊</div><div class="empty-state__title">Нет данных</div></div>`;
  } else {
    const medals = ['🥇', '🥈', '🥉'];
    topEl.innerHTML = sorted.map((m, i) => `
      <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--gray-border);">
        <span style="font-size:20px;">${medals[i]}</span>
        <div class="rating-avatar" style="background:var(--purple)">${initials(m)}</div>
        <div style="flex:1">
          <div style="font-family:var(--font-display);font-size:13px;font-weight:600">${m.first_name} ${m.last_name}</div>
          <div style="font-size:11px;color:var(--text-muted)">${m.role_in_project || ''}</div>
        </div>
        <div style="font-family:var(--font-display);font-size:16px;font-weight:700;color:var(--purple)">${m.total_points || 0} pts</div>
      </div>`).join('');
  }

  // Active challenges
  const actCh = challenges.slice(0, 4);
  const actEl = document.getElementById('activeChallengesList');
  if (!actCh.length) {
    actEl.innerHTML = `<div class="empty-state"><div class="empty-state__icon">🎯</div><div class="empty-state__title">Нет челленджей</div></div>`;
  } else {
    actEl.innerHTML = actCh.map(c => `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--gray-border)">
        <span class="badge badge--${c.level.toLowerCase()}">${c.level}</span>
        <span style="flex:1;font-size:13px">${c.title}</span>
        <span style="font-size:12px;color:var(--text-muted)">${c.points} pts</span>
      </div>`).join('');
  }
}

function initials(m) {
  return ((m.first_name?.[0] || '') + (m.last_name?.[0] || '')).toUpperCase();
}

function renderTeam() {
  const tbody = document.getElementById('teamTableBody');
  if (!teamMembers.length) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state">
      <div class="empty-state__icon">👥</div>
      <div class="empty-state__title">Команда пуста</div>
      <div class="empty-state__text">Добавьте первого участника</div>
    </div></td></tr>`;
    return;
  }
  tbody.innerHTML = teamMembers.map(m => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          <div class="rating-avatar" style="background:var(--purple)">${initials(m)}</div>
          <div>
            <div style="font-family:var(--font-display);font-size:13px;font-weight:600">${m.first_name} ${m.last_name}</div>
            <div style="font-size:11px;color:var(--text-muted)">${m.email || ''}</div>
          </div>
        </div>
      </td>
      <td style="font-size:13px;color:var(--text-muted)">${m.role_in_project || '—'}</td>
      <td><span style="font-family:var(--font-display);font-weight:700;color:var(--purple)">${m.total_points || 0}</span></td>
      <td><span class="${m.daily_streak > 0 ? 'badge badge--done' : ''}">${m.daily_streak || 0} дн.</span></td>
      <td>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button class="btn btn--primary" style="padding:6px 12px;font-size:11px" onclick="openAwardModal(${m.id})">+ Баллы</button>
          <button class="btn btn--danger" style="padding:6px 12px;font-size:11px" onclick="removeMember(${m.id})">Удалить</button>
        </div>
      </td>
    </tr>`).join('');
}

function renderChallenges() {
  const el = document.getElementById('challengesList');
  const filtered = currentChallengeFilter === 'all'
    ? challenges
    : challenges.filter(c => c.level === currentChallengeFilter);

  if (!filtered.length) {
    el.innerHTML = `<div class="empty-state">
      <div class="empty-state__icon">🎯</div>
      <div class="empty-state__title">Нет челленджей</div>
      <div class="empty-state__text">Создайте первый челлендж для команды</div>
    </div>`;
    return;
  }
  el.innerHTML = `<div style="display:flex;flex-direction:column;gap:12px">` +
    filtered.map(c => `
      <div style="background:var(--gray-mid);border:1px solid var(--gray-border);border-radius:var(--radius-md);padding:16px;display:flex;align-items:flex-start;gap:12px">
        <span class="badge badge--${c.level.toLowerCase()}" style="flex-shrink:0;margin-top:2px">${c.level}</span>
        <div style="flex:1;min-width:0">
          <div style="font-family:var(--font-display);font-size:14px;font-weight:600;margin-bottom:4px">${c.title}</div>
          <div style="font-size:12px;color:var(--text-muted)">${c.description || ''}</div>
          ${c.example ? `<div style="font-size:11px;color:var(--cyan);margin-top:6px">Пример: ${c.example}</div>` : ''}
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0">
          <span style="font-family:var(--font-display);font-size:14px;font-weight:700;color:var(--purple)">${c.points} pts</span>
          <button class="btn btn--danger" style="padding:4px 10px;font-size:11px" onclick="deleteChallenge(${c.id})">Удалить</button>
        </div>
      </div>`).join('') + '</div>';
}

function filterChallenges(level, btn) {
  currentChallengeFilter = level;
  document.querySelectorAll('#tab-challenges .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderChallenges();
}

function renderDaily() {
  const tbody = document.getElementById('dailyTableBody');
  if (!dailyTasks.length) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state">
      <div class="empty-state__icon">📅</div>
      <div class="empty-state__title">Нет задач</div>
    </div></td></tr>`;
    return;
  }
  tbody.innerHTML = dailyTasks.map(t => `
    <tr>
      <td style="font-size:13px">${t.description}</td>
      <td><span style="font-family:var(--font-display);color:var(--cyan);font-weight:700">${t.points} pts</span></td>
      <td style="font-size:12px;color:var(--text-muted)">${formatDate(t.date)}</td>
      <td><button class="btn btn--danger" style="padding:5px 10px;font-size:11px" onclick="deleteDailyTask(${t.id})">Удалить</button></td>
    </tr>`).join('');
}

function renderRating() {
  const sorted = [...teamMembers].sort((a, b) => (b.total_points || 0) - (a.total_points || 0));
  const el = document.getElementById('fullRatingList');
  if (!sorted.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-state__icon">🏆</div><div class="empty-state__title">Нет данных</div></div>`;
    return;
  }
  const medals = ['🥇', '🥈', '🥉'];
  el.innerHTML = `<div class="rating-table">
    <div class="rating-header">
      <span>#</span><span>Участник</span><span>Баллы</span><span class="rating-hide-mobile">Роль</span>
    </div>` +
    sorted.map((m, i) => `
      <div class="rating-row ${i === 0 ? 'rating-row--gold' : i === 1 ? 'rating-row--silver' : i === 2 ? 'rating-row--bronze' : ''}">
        <span class="rating-place">${medals[i] || (i + 1)}</span>
        <div class="rating-user">
          <div class="rating-avatar" style="background:var(--purple)">${initials(m)}</div>
          <div>
            <div class="rating-name">${m.first_name} ${m.last_name}</div>
            <div class="rating-role">${m.email || ''}</div>
          </div>
        </div>
        <span class="rating-points">${m.total_points || 0} pts</span>
        <span class="rating-challenges rating-hide-mobile">${m.role_in_project || '—'}</span>
      </div>`).join('') + '</div>';
}

// === ACTIONS ===

async function addMember() {
  const first = document.getElementById('memberFirstName').value.trim();
  const last = document.getElementById('memberLastName').value.trim();
  const role = document.getElementById('memberRole').value.trim();
  const email = document.getElementById('memberEmail').value.trim();
  if (!first || !last) { showToast('Заполните имя и фамилию', 'error'); return; }
  try {
    await api('POST', '/teams/my/members', { first_name: first, last_name: last, role_in_project: role, email });
    closeModal('addMemberModal');
    ['memberFirstName','memberLastName','memberRole','memberEmail'].forEach(id => document.getElementById(id).value = '');
    await loadTeam();
    renderOverview();
    renderRating();
    showToast('Участник добавлен');
  } catch (e) { showToast(e.message, 'error'); }
}

async function removeMember(id) {
  if (!confirm('Удалить участника?')) return;
  try {
    await api('DELETE', `/teams/my/members/${id}`);
    await loadTeam();
    renderOverview();
    renderRating();
    showToast('Участник удалён');
  } catch (e) { showToast(e.message, 'error'); }
}

async function addChallenge() {
  const title = document.getElementById('challengeTitle').value.trim();
  const desc = document.getElementById('challengeDesc').value.trim();
  const level = document.getElementById('challengeLevel').value;
  const example = document.getElementById('challengeExample').value.trim();
  if (!title) { showToast('Введите название', 'error'); return; }
  const pts = { LIGHT: 10, MEDIUM: 25, HARD: 50 };
  try {
    await api('POST', '/challenges/', { title, description: desc, level, example, points: pts[level] });
    closeModal('addChallengeModal');
    ['challengeTitle','challengeDesc','challengeExample'].forEach(id => document.getElementById(id).value = '');
    await loadChallenges();
    renderOverview();
    showToast('Челлендж создан');
  } catch (e) { showToast(e.message, 'error'); }
}

async function deleteChallenge(id) {
  if (!confirm('Удалить челлендж?')) return;
  try {
    await api('DELETE', `/challenges/${id}`);
    await loadChallenges();
    renderOverview();
    showToast('Челлендж удалён');
  } catch (e) { showToast(e.message, 'error'); }
}

async function addDailyTask() {
  const desc = document.getElementById('dailyDesc').value.trim();
  const points = parseInt(document.getElementById('dailyPoints').value) || 5;
  const date = document.getElementById('dailyDate').value;
  if (!desc) { showToast('Введите описание задачи', 'error'); return; }
  try {
    await api('POST', '/daily-tasks/', { description: desc, points, date });
    closeModal('addDailyModal');
    document.getElementById('dailyDesc').value = '';
    document.getElementById('dailyPoints').value = '5';
    await loadDailyTasks();
    renderOverview();
    showToast('Задача добавлена');
  } catch (e) { showToast(e.message, 'error'); }
}

async function deleteDailyTask(id) {
  if (!confirm('Удалить задачу?')) return;
  try {
    await api('DELETE', `/daily-tasks/${id}`);
    await loadDailyTasks();
    renderOverview();
    showToast('Задача удалена');
  } catch (e) { showToast(e.message, 'error'); }
}

function openAwardModal(memberId) {
  // Populate member select
  const memberSel = document.getElementById('awardMember');
  memberSel.innerHTML = teamMembers.map(m =>
    `<option value="${m.id}" ${m.id === memberId ? 'selected' : ''}>${m.first_name} ${m.last_name}</option>`
  ).join('');

  // Populate challenges
  const chSel = document.getElementById('awardChallenge');
  const allItems = [
    ...challenges.map(c => ({ id: `c_${c.id}`, label: `[${c.level}] ${c.title} (+${c.points} pts)`, points: c.points, type: 'challenge', ref_id: c.id })),
    ...dailyTasks.map(t => ({ id: `d_${t.id}`, label: `[Дейли] ${t.description} (+${t.points} pts)`, points: t.points, type: 'daily', ref_id: t.id }))
  ];
  chSel.innerHTML = allItems.map(i => `<option value="${i.id}">${i.label}</option>`).join('');
  chSel._items = allItems;

  openModal('awardPointsModal');
}

async function awardPoints() {
  const memberId = parseInt(document.getElementById('awardMember').value);
  const chSel = document.getElementById('awardChallenge');
  const selected = chSel._items?.find(i => i.id === chSel.value);
  const comment = document.getElementById('awardComment').value.trim();
  if (!selected) { showToast('Выберите задачу', 'error'); return; }
  try {
    await api('POST', '/points/award', {
      member_id: memberId,
      points: selected.points,
      source_type: selected.type,
      source_id: selected.ref_id,
      comment
    });
    closeModal('awardPointsModal');
    document.getElementById('awardComment').value = '';
    await loadTeam();
    renderOverview();
    renderRating();
    showToast(`Начислено ${selected.points} баллов!`);
  } catch (e) { showToast(e.message, 'error'); }
}

// === MODAL UTILS ===
function openModal(id) {
  document.getElementById(id).classList.add('open');
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}
// Close on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});

function formatDate(d) {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function showToast(msg, type = 'success') {
  const t = document.getElementById('toast') || document.querySelector('.toast');
  if (!t) return;
  t.textContent = msg;
  t.className = `toast toast--${type} show`;
  setTimeout(() => t.classList.remove('show'), 3000);
}
