document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.isAuth()) { location.href = 'login.html'; return; }
  const user = Auth.getUser();
  if (user?.role !== 'admin') { location.href = 'login.html'; return; }

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
    link.addEventListener('click', e => {
      e.preventDefault();
      switchTab(link.dataset.tab);
      sidebar.classList.remove('open');
      overlay.classList.remove('show');
    });
  });

  // Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(o => {
    o.addEventListener('click', e => { if (e.target === o) o.classList.remove('open'); });
  });

  await loadAll();
});

// ─── TAB ROUTING ──────────────────────────────────────
const TAB_TITLES = {
  overview: 'Обзор', analytics: 'Аналитика', pms: 'ПМ-менеджеры',
  teams: 'Команды', members: 'Участники', challenges: 'Челленджи',
  prizes: 'Призы', logs: 'Лог баллов',
};

function switchTab(tab) {
  document.querySelectorAll('.sidebar__link[data-tab]').forEach(l => l.classList.remove('active'));
  document.querySelector(`[data-tab="${tab}"]`)?.classList.add('active');
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById(`tab-${tab}`)?.classList.add('active');
  document.getElementById('pageTitle').textContent = TAB_TITLES[tab] || tab;
}

// ─── STATE ────────────────────────────────────────────
let pms = [], teams = [], allMembers = [], allChallenges = [], prizes = [], logs = [], analytics = null;
let challengeLevelFilter = '';

// ─── LOAD ─────────────────────────────────────────────
async function loadAll() {
  const results = await Promise.allSettled([
    api('GET', '/admin/pms'),
    api('GET', '/admin/teams'),
    api('GET', '/admin/members'),
    api('GET', '/admin/challenges'),
    api('GET', '/prizes/'),
    api('GET', '/admin/point-logs?limit=100'),
    api('GET', '/admin/analytics'),
  ]);
  pms          = results[0].status === 'fulfilled' ? results[0].value : [];
  teams        = results[1].status === 'fulfilled' ? results[1].value : [];
  allMembers   = results[2].status === 'fulfilled' ? results[2].value : [];
  allChallenges= results[3].status === 'fulfilled' ? results[3].value : [];
  prizes       = results[4].status === 'fulfilled' ? results[4].value : [];
  logs         = results[5].status === 'fulfilled' ? results[5].value : [];
  analytics    = results[6].status === 'fulfilled' ? results[6].value : null;

  renderAll();
}

function renderAll() {
  renderOverview();
  renderAnalytics();
  renderPMs();
  renderTeams();
  renderMembers();
  renderChallenges();
  renderPrizes();
  renderLogs();
}

// ─── HELPERS ──────────────────────────────────────────
function initials(m) {
  if (m.first_name && m.last_name) return (m.first_name[0] + m.last_name[0]).toUpperCase();
  return (m.full_name?.[0] || m.username?.[0] || '?').toUpperCase();
}

function fmtDate(s) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: '2-digit' });
}
function fmtDateShort(s) {
  if (!s) return '';
  const d = new Date(s);
  return `${d.getDate()}.${String(d.getMonth()+1).padStart(2,'0')}`;
}

function avatarColor(i) {
  const colors = ['var(--purple)','#0891B2','#1A9E7A','#A16207','#BE123C'];
  return colors[i % colors.length];
}

function memberAvatar(m, i=0) {
  return `<div class="rating-avatar" style="background:${avatarColor(i)};color:#fff">${initials(m)}</div>`;
}

// ─── OVERVIEW ─────────────────────────────────────────
function renderOverview() {
  const a = analytics;
  document.getElementById('sPMs').textContent       = a?.total_pms       ?? pms.length;
  document.getElementById('sTeams').textContent     = a?.total_teams      ?? teams.length;
  document.getElementById('sMembers').textContent   = a?.total_members    ?? allMembers.length;
  document.getElementById('sPoints').textContent    = a?.total_points     ?? allMembers.reduce((s,m) => s+(m.total_points||0), 0);
  document.getElementById('sChallenges').textContent= a?.total_challenges ?? allChallenges.length;

  // Top-5
  const top = a?.top_members ?? [...allMembers].sort((a,b) => (b.total_points||0)-(a.total_points||0)).slice(0,5);
  const medals = ['🥇','🥈','🥉'];
  const topEl = document.getElementById('overviewTopMembers');
  topEl.innerHTML = top.length
    ? top.map((m,i) => `
        <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
          <span style="font-size:18px;width:24px;text-align:center">${medals[i]||i+1}</span>
          ${memberAvatar(m,i)}
          <div style="flex:1;min-width:0">
            <div style="font-family:var(--font-display);font-size:12px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${m.first_name} ${m.last_name}</div>
            <div style="font-size:11px;color:var(--text-muted)">${m.team_name||''}</div>
          </div>
          <span style="font-family:var(--font-display);font-weight:700;color:var(--purple);font-size:14px">${m.total_points||0} pts</span>
        </div>`).join('')
    : emptyState('🏆', 'Нет участников');

  // Teams preview
  const tEl = document.getElementById('overviewTeams');
  tEl.innerHTML = teams.length
    ? teams.slice(0,6).map(t => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--border)">
          <div>
            <div style="font-family:var(--font-display);font-size:12px;font-weight:700">${t.name}</div>
            <div style="font-size:11px;color:var(--text-muted)">${t.pm_name||'—'}</div>
          </div>
          <span class="badge badge--active">${t.members_count} чел.</span>
        </div>`).join('')
    : emptyState('👥', 'Команд пока нет');

  // Recent logs
  const lEl = document.getElementById('overviewRecentLogs');
  const recent = logs.slice(0, 6);
  lEl.innerHTML = recent.length
    ? recent.map(l => `
        <div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--border)">
          <span class="source-badge source-badge--${l.source_type}">${srcLabel(l.source_type)}</span>
          <span style="flex:1;font-size:12px;font-weight:600">${l.member_name||'—'}</span>
          <span class="${l.points>0?'pts-positive':'pts-negative'}" style="font-size:13px">${l.points>0?'+':''}${l.points}</span>
          <span style="font-size:11px;color:var(--text-muted)">${fmtDate(l.created_at)}</span>
        </div>`).join('')
    : emptyState('📋', 'Операций пока нет');
}

// ─── ANALYTICS ────────────────────────────────────────
function renderAnalytics() {
  const a = analytics;
  if (!a) return;

  document.getElementById('aLight').textContent  = a.challenges_by_level?.LIGHT  ?? 0;
  document.getElementById('aMedium').textContent = a.challenges_by_level?.MEDIUM ?? 0;
  document.getElementById('aHard').textContent   = a.challenges_by_level?.HARD   ?? 0;
  const avg = a.total_members > 0 ? Math.round(a.total_points / a.total_members) : 0;
  document.getElementById('aAvg').textContent = avg;

  // Bar chart: points by day
  renderBarChart('pointsChart', a.points_by_day || []);

  // Donut: levels
  renderDonut('levelsPie', [
    { label: 'LIGHT',  val: a.challenges_by_level?.LIGHT  ?? 0, color: 'var(--mint)'   },
    { label: 'MEDIUM', val: a.challenges_by_level?.MEDIUM ?? 0, color: 'var(--cyan)'   },
    { label: 'HARD',   val: a.challenges_by_level?.HARD   ?? 0, color: 'var(--purple)' },
  ]);

  // Teams ranking
  renderTeamsRanking(a.teams_stats || []);
}

function renderBarChart(containerId, data) {
  const el = document.getElementById(containerId);
  if (!data.length) { el.innerHTML = `<div class="bar-chart__empty">Нет данных за последние 14 дней</div>`; return; }
  const max = Math.max(...data.map(d => d.points), 1);
  el.innerHTML = `<div class="bar-chart">` +
    data.map(d => `
      <div class="bar-chart__col">
        <div class="bar-chart__bar" data-val="${d.points}" style="height:${Math.round((d.points/max)*120)+4}px"></div>
        <div class="bar-chart__label">${fmtDateShort(d.date)}</div>
      </div>`).join('') +
    `</div>`;
}

function renderDonut(containerId, segments) {
  const el = document.getElementById(containerId);
  const total = segments.reduce((s,i) => s+i.val, 0);
  if (!total) { el.innerHTML = `<div class="bar-chart__empty">Нет данных</div>`; return; }

  // SVG donut
  const r = 52, cx = 64, cy = 64, stroke = 22;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  let paths = '';
  for (const seg of segments) {
    const pct = seg.val / total;
    const dash = pct * circ;
    paths += `<circle cx="${cx}" cy="${cy}" r="${r}"
      fill="none" stroke="${seg.color}" stroke-width="${stroke}"
      stroke-dasharray="${dash} ${circ - dash}"
      stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cy})"
      style="transition:all 0.6s ease"/>`;
    offset += dash;
  }
  const svgStr = `<svg class="donut-svg" width="128" height="128" viewBox="0 0 128 128">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--bg-input)" stroke-width="${stroke}"/>
    ${paths}
    <text x="${cx}" y="${cy+5}" text-anchor="middle" font-family="Unbounded" font-size="14" font-weight="700" fill="var(--text)">${total}</text>
  </svg>`;

  el.innerHTML = `<div class="donut-wrap">${svgStr}
    <div class="donut-legend">` +
    segments.map(s => `
      <div class="donut-legend-item">
        <div class="donut-legend-dot" style="background:${s.color}"></div>
        <span class="donut-legend-label">${s.label}</span>
        <span class="donut-legend-val" style="margin-left:12px">${s.val}</span>
      </div>`).join('') +
    `</div></div>`;
}

function renderTeamsRanking(stats) {
  const el = document.getElementById('teamsRanking');
  if (!stats.length) { el.innerHTML = emptyState('👥', 'Нет команд'); return; }
  const maxPts = Math.max(...stats.map(t => t.total_points), 1);
  const sorted = [...stats].sort((a,b) => b.total_points - a.total_points);
  el.innerHTML = `
    <div class="team-rank-row team-rank-row__header">
      <span>#</span><span>Команда</span><span>Баллы</span><span>Участников</span><span>Light</span><span>Hard</span>
    </div>` +
    sorted.map((t,i) => `
      <div class="team-rank-row">
        <span style="font-family:var(--font-display);font-size:13px;font-weight:700;color:var(--text-muted)">${i+1}</span>
        <div>
          <div style="font-family:var(--font-display);font-size:12px;font-weight:700">${t.team_name}</div>
          <div style="font-size:11px;color:var(--text-muted)">${t.pm_name||'—'}</div>
          <div class="team-bar"><div class="team-bar__fill" style="width:${Math.round((t.total_points/maxPts)*100)}%"></div></div>
        </div>
        <span style="font-family:var(--font-display);font-weight:700;color:var(--purple)">${t.total_points}</span>
        <span style="font-size:13px">${t.members_count}</span>
        <span class="badge badge--light">${t.light_count}</span>
        <span class="badge badge--hard">${t.hard_count}</span>
      </div>`).join('');
}

// ─── PMs ──────────────────────────────────────────────
function renderPMs() {
  const q = (document.getElementById('pmSearch')?.value || '').toLowerCase();
  const data = q ? pms.filter(p =>
    `${p.full_name||''} ${p.username} ${p.email||''}`.toLowerCase().includes(q)
  ) : pms;

  const tbody = document.getElementById('pmTableBody');
  tbody.innerHTML = data.length ? data.map(pm => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          <div class="rating-avatar" style="background:var(--purple);color:#fff">${(pm.full_name?.[0]||pm.username[0]).toUpperCase()}</div>
          <div>
            <div style="font-family:var(--font-display);font-size:12px;font-weight:700">${pm.full_name||pm.username}</div>
            <div style="font-size:11px;color:var(--text-muted)">@${pm.username}</div>
          </div>
        </div>
      </td>
      <td><span class="status-pill status-pill--${pm.is_active!==false?'active':'blocked'}">${pm.is_active!==false?'Активен':'Заблокирован'}</span></td>
      <td>
        <div style="font-size:13px;font-weight:600">${pm.team_name||'—'}</div>
        ${pm.team_id?`<button class="link-sm" onclick="openTeamDetail(${pm.team_id})">Подробнее</button>`:''}
      </td>
      <td style="font-family:var(--font-display);font-size:13px">${pm.members_count||0}</td>
      <td style="font-family:var(--font-display);font-size:13px">${pm.challenges_count||0}</td>
      <td style="font-size:12px;color:var(--text-muted)">${fmtDate(pm.created_at)}</td>
      <td>
        <div class="action-group">
          <button class="action-btn action-btn--edit"  onclick="openEditPM(${pm.id})">✏️ Изменить</button>
          <button class="action-btn action-btn--pass"  onclick="openResetPass(${pm.id},'${pm.full_name||pm.username}')">🔑 Пароль</button>
          <button class="action-btn action-btn--block" onclick="togglePMActive(${pm.id},${pm.is_active!==false})">${pm.is_active!==false?'🚫 Блок':'✅ Разблок'}</button>
          <button class="action-btn action-btn--del"   onclick="deletePM(${pm.id})">🗑 Удалить</button>
        </div>
      </td>
    </tr>`).join('')
    : `<tr><td colspan="7">${emptyState('👤','ПМ-менеджеров нет')}</td></tr>`;
}

// ─── TEAMS ────────────────────────────────────────────
function renderTeams() {
  const el = document.getElementById('allTeamsList');
  if (!teams.length) { el.innerHTML = emptyState('👥','Команд пока нет'); return; }
  el.innerHTML = `<div style="display:flex;flex-direction:column;gap:10px">` +
    teams.map(t => `
      <div style="background:var(--bg-section);border:1.5px solid var(--border);border-radius:var(--radius-md);padding:16px;display:flex;align-items:center;gap:14px;flex-wrap:wrap">
        <div style="flex:1;min-width:160px">
          <div style="font-family:var(--font-display);font-size:14px;font-weight:700">${t.name}</div>
          <div style="font-size:12px;color:var(--text-muted)">ПМ: ${t.pm_name||'—'} · Создана ${fmtDate(t.created_at)}</div>
        </div>
        <span class="badge badge--active">${t.members_count} участников</span>
        <div class="action-group">
          <button class="action-btn action-btn--detail" onclick="openTeamDetail(${t.id})">👁 Детали</button>
          <button class="action-btn action-btn--edit"   onclick="openEditTeam(${t.id},'${escQ(t.name)}')">✏️ Переименовать</button>
        </div>
      </div>`).join('') + '</div>';
}

// ─── MEMBERS ──────────────────────────────────────────
function renderMembers() {
  // Populate team filter
  const sel = document.getElementById('memberTeamFilter');
  const prev = sel?.value;
  if (sel && sel.options.length <= 1) {
    teams.forEach(t => {
      const o = document.createElement('option');
      o.value = t.id; o.textContent = t.name;
      sel.appendChild(o);
    });
    if (prev) sel.value = prev;
  }

  const q   = (document.getElementById('memberSearch')?.value||'').toLowerCase();
  const tid = document.getElementById('memberTeamFilter')?.value;
  let data  = allMembers;
  if (tid) data = data.filter(m => String(m.team_id) === tid);
  if (q)   data = data.filter(m => `${m.first_name} ${m.last_name} ${m.email||''}`.toLowerCase().includes(q));

  document.getElementById('membersCount').textContent = `${data.length} участников`;

  const tbody = document.getElementById('memberTableBody');
  tbody.innerHTML = data.length ? data.map((m,i) => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          ${memberAvatar(m,i)}
          <div>
            <div style="font-family:var(--font-display);font-size:12px;font-weight:700">${m.first_name} ${m.last_name}</div>
            <div style="font-size:11px;color:var(--text-muted)">${m.email||'—'}</div>
          </div>
        </div>
      </td>
      <td style="font-size:12px">${m.team_name||'—'}</td>
      <td style="font-size:12px;color:var(--text-secondary)">${m.role_in_project||'—'}</td>
      <td><span style="font-family:var(--font-display);font-weight:800;font-size:14px;color:var(--purple)">${m.total_points||0}</span></td>
      <td><span class="${m.daily_streak>0?'badge badge--done':''}">${m.daily_streak||0} дн.</span></td>
      <td>
        <div class="action-group">
          <button class="action-btn action-btn--edit"  onclick="openEditMember(${m.id})">✏️</button>
          <button class="action-btn action-btn--plus"  onclick="openPoints(${m.id},'${escQ(m.first_name+' '+m.last_name)}',1)">+pts</button>
          <button class="action-btn action-btn--minus" onclick="openPoints(${m.id},'${escQ(m.first_name+' '+m.last_name)}',-1)">−pts</button>
          <button class="action-btn action-btn--hist"  onclick="openHistory(${m.id},'${escQ(m.first_name+' '+m.last_name)}')">📋</button>
          <button class="action-btn action-btn--del"   onclick="deleteMember(${m.id})">🗑</button>
        </div>
      </td>
    </tr>`).join('')
    : `<tr><td colspan="6">${emptyState('🙋','Участников нет')}</td></tr>`;
}

// ─── CHALLENGES ───────────────────────────────────────
function filterChallenges(level, btn) {
  challengeLevelFilter = level;
  document.querySelectorAll('#tab-challenges .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderChallenges();
}

function renderChallenges() {
  const data = challengeLevelFilter
    ? allChallenges.filter(c => c.level === challengeLevelFilter)
    : allChallenges;

  const tbody = document.getElementById('allChallengesBody');
  tbody.innerHTML = data.length ? data.map(c => `
    <tr>
      <td>
        <div style="font-family:var(--font-display);font-size:12px;font-weight:700">${c.title}</div>
        ${c.description?`<div style="font-size:11px;color:var(--text-muted);margin-top:2px">${c.description}</div>`:''}
      </td>
      <td><span class="badge badge--${c.level.toLowerCase()}">${c.level}</span></td>
      <td style="font-family:var(--font-display);font-weight:800;color:var(--purple)">${c.points}</td>
      <td style="font-size:12px">${c.team_name||'—'}</td>
      <td style="font-size:12px;color:var(--text-muted)">${c.pm_name||'—'}</td>
      <td style="font-size:11px;color:var(--text-muted)">${fmtDate(c.created_at)}</td>
      <td><button class="action-btn action-btn--del" onclick="adminDeleteChallenge(${c.id})">🗑 Удалить</button></td>
    </tr>`).join('')
    : `<tr><td colspan="7">${emptyState('🎯','Челленджей нет')}</td></tr>`;
}

// ─── PRIZES ───────────────────────────────────────────
function renderPrizes() {
  const el = document.getElementById('prizesList');
  if (!prizes.length) { el.innerHTML = emptyState('🎁','Призов пока нет','Добавьте первый приз в каталог'); return; }
  el.innerHTML = `<div class="prizes-grid">` +
    prizes.map(p => `
      <div class="prize-card">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px">
          <span class="badge badge--${p.level.toLowerCase()}">${p.level}</span>
          <button class="action-btn action-btn--del" style="padding:3px 8px;font-size:10px" onclick="deletePrize(${p.id})">✕</button>
        </div>
        <div style="font-family:var(--font-display);font-size:15px;font-weight:800;margin-bottom:6px">${p.name}</div>
        <div style="font-size:12px;color:var(--text-secondary);margin-bottom:12px;line-height:1.5">${p.description||''}</div>
        <div style="font-family:var(--font-display);font-size:13px;color:#0891B2;font-weight:700">${p.cost} баллов</div>
      </div>`).join('') + '</div>';
}

// ─── LOGS ─────────────────────────────────────────────
function renderLogs() {
  document.getElementById('logsCount').textContent = `${logs.length} записей`;
  const tbody = document.getElementById('logsBody');
  tbody.innerHTML = logs.length ? logs.map(l => `
    <tr>
      <td style="font-size:12px;color:var(--text-muted);white-space:nowrap">${fmtDate(l.created_at)}</td>
      <td style="font-family:var(--font-display);font-size:12px;font-weight:600">${l.member_name||'—'}</td>
      <td><span class="${l.points>0?'pts-positive':'pts-negative'}">${l.points>0?'+':''}${l.points}</span></td>
      <td><span class="source-badge source-badge--${l.source_type}">${srcLabel(l.source_type)}</span></td>
      <td style="font-size:12px;color:var(--text-secondary);max-width:200px">${l.comment||'—'}</td>
      <td style="font-size:12px;color:var(--text-muted)">${l.awarded_by_name||'—'}</td>
    </tr>`).join('')
    : `<tr><td colspan="6">${emptyState('📋','Операций пока нет')}</td></tr>`;
}

// ─── PM ACTIONS ───────────────────────────────────────
async function createPM() {
  const full_name  = v('pmFullName');
  const username   = v('pmUsername');
  const email      = v('pmEmail');
  const password   = v('pmPassword');
  const team_name  = v('pmTeamName');
  if (!username) { toast('Введите логин', 'error'); return; }
  if (!password || password.length < 6) { toast('Пароль минимум 6 символов', 'error'); return; }
  try {
    await api('POST', '/admin/pms', { full_name, username, email, password, team_name });
    closeModal('createPMModal');
    ['pmFullName','pmUsername','pmEmail','pmPassword','pmTeamName'].forEach(id => set(id,''));
    await loadAll();
    toast('ПМ-аккаунт создан');
  } catch(e) { toast(e.message, 'error'); }
}

function openEditPM(id) {
  const pm = pms.find(p => p.id === id);
  if (!pm) return;
  set('editPMId', id);
  set('editPMFullName', pm.full_name||'');
  set('editPMEmail', pm.email||'');
  set('editPMTeamName', pm.team_name||'');
  document.getElementById('editPMActive').value = String(pm.is_active !== false);
  openModal('editPMModal');
}

async function savePM() {
  const id = parseInt(v('editPMId'));
  const data = {
    full_name:  v('editPMFullName') || null,
    email:      v('editPMEmail')    || null,
    team_name:  v('editPMTeamName') || null,
    is_active:  document.getElementById('editPMActive').value === 'true',
  };
  try {
    await api('PATCH', `/admin/pms/${id}`, data);
    closeModal('editPMModal');
    await loadAll();
    toast('Изменения сохранены');
  } catch(e) { toast(e.message, 'error'); }
}

async function togglePMActive(id, currentlyActive) {
  try {
    await api('PATCH', `/admin/pms/${id}`, { is_active: !currentlyActive });
    await loadAll();
    toast(currentlyActive ? 'Аккаунт заблокирован' : 'Аккаунт разблокирован');
  } catch(e) { toast(e.message, 'error'); }
}

function openResetPass(id, name) {
  set('resetPassPMId', id);
  set('resetPassValue', '');
  document.getElementById('resetPassHint').textContent = `Новый пароль для: ${name}`;
  openModal('resetPassModal');
}

async function doResetPass() {
  const id  = parseInt(v('resetPassPMId'));
  const pwd = v('resetPassValue');
  if (!pwd || pwd.length < 6) { toast('Минимум 6 символов', 'error'); return; }
  try {
    await api('POST', `/admin/pms/${id}/reset-password`, { new_password: pwd });
    closeModal('resetPassModal');
    toast('Пароль изменён');
  } catch(e) { toast(e.message, 'error'); }
}

async function deletePM(id) {
  if (!confirm('Удалить ПМ-аккаунт? Команда и все данные будут удалены.')) return;
  try {
    await api('DELETE', `/admin/pms/${id}`);
    await loadAll();
    toast('ПМ удалён');
  } catch(e) { toast(e.message, 'error'); }
}

// ─── TEAM ACTIONS ─────────────────────────────────────
async function openTeamDetail(teamId) {
  const team = teams.find(t => t.id === teamId);
  if (!team) return;
  document.getElementById('teamDetailTitle').textContent = `👥 ${team.name}`;
  document.getElementById('teamDetailBody').innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">Загрузка…</div>';
  openModal('teamDetailModal');
  try {
    const members = await api('GET', `/admin/teams/${teamId}/members`);
    const teamChallenges = allChallenges.filter(c => c.team_name === team.name);
    const totalPts = members.reduce((s,m) => s+(m.total_points||0), 0);
    document.getElementById('teamDetailBody').innerHTML = `
      <div class="team-detail-stats">
        <div class="team-detail-stat"><div class="team-detail-stat__val">${members.length}</div><div class="team-detail-stat__label">Участников</div></div>
        <div class="team-detail-stat"><div class="team-detail-stat__val">${totalPts}</div><div class="team-detail-stat__label">Баллов</div></div>
        <div class="team-detail-stat"><div class="team-detail-stat__val">${teamChallenges.length}</div><div class="team-detail-stat__label">Челленджей</div></div>
      </div>
      <div style="font-family:var(--font-display);font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px">Участники</div>` +
      (members.length
        ? members.sort((a,b) => (b.total_points||0)-(a.total_points||0)).map((m,i) => `
            <div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--border)">
              ${memberAvatar(m,i)}
              <div style="flex:1">
                <div style="font-family:var(--font-display);font-size:12px;font-weight:700">${m.first_name} ${m.last_name}</div>
                <div style="font-size:11px;color:var(--text-muted)">${m.role_in_project||m.email||'—'}</div>
              </div>
              <span style="font-family:var(--font-display);font-weight:800;color:var(--purple)">${m.total_points||0} pts</span>
            </div>`).join('')
        : emptyState('🙋','Участников нет'));
  } catch(e) {
    document.getElementById('teamDetailBody').innerHTML = `<div style="color:#B91C1C;font-size:13px">Ошибка загрузки</div>`;
  }
}

function openEditTeam(id, name) {
  set('editTeamId', id);
  set('editTeamName', name);
  openModal('editTeamModal');
}

async function saveTeam() {
  const id   = parseInt(v('editTeamId'));
  const name = v('editTeamName').trim();
  if (!name) { toast('Введите название', 'error'); return; }
  try {
    await api('PATCH', `/admin/teams/${id}`, { name });
    closeModal('editTeamModal');
    await loadAll();
    toast('Название команды обновлено');
  } catch(e) { toast(e.message, 'error'); }
}

// ─── MEMBER ACTIONS ───────────────────────────────────
function openEditMember(id) {
  const m = allMembers.find(x => x.id === id);
  if (!m) return;
  set('editMemberId', id);
  set('editMemberFirst', m.first_name);
  set('editMemberLast',  m.last_name);
  set('editMemberEmail', m.email||'');
  set('editMemberRole',  m.role_in_project||'');
  openModal('editMemberModal');
}

async function saveMember() {
  const id   = parseInt(v('editMemberId'));
  const data = {
    first_name:        v('editMemberFirst')||undefined,
    last_name:         v('editMemberLast') ||undefined,
    email:             v('editMemberEmail')||null,
    role_in_project:   v('editMemberRole') ||null,
  };
  try {
    await api('PATCH', `/admin/members/${id}`, data);
    closeModal('editMemberModal');
    await loadAll();
    toast('Данные участника обновлены');
  } catch(e) { toast(e.message, 'error'); }
}

async function deleteMember(id) {
  if (!confirm('Удалить участника и все его баллы?')) return;
  try {
    await api('DELETE', `/admin/members/${id}`);
    await loadAll();
    toast('Участник удалён');
  } catch(e) { toast(e.message, 'error'); }
}

let _pointsSign = 1;  // +1 award, -1 deduct

function openPoints(memberId, name, sign) {
  _pointsSign = sign;
  set('pointsMemberId', memberId);
  set('pointsAmount', '10');
  set('pointsComment', '');
  document.getElementById('pointsModalTitle').textContent = sign > 0 ? '➕ Начислить баллы' : '➖ Снять баллы';
  document.getElementById('pointsModalHint').textContent  = `Участник: ${name}`;
  document.getElementById('pointsSubmitBtn').textContent  = sign > 0 ? 'Начислить' : 'Снять';
  document.getElementById('pointsSubmitBtn').className    = sign > 0 ? 'btn btn--primary' : 'btn btn--danger';
  openModal('pointsModal');
}

async function submitPoints() {
  const memberId = parseInt(v('pointsMemberId'));
  const amount   = parseInt(v('pointsAmount'));
  const comment  = v('pointsComment');
  if (!amount || amount <= 0) { toast('Введите количество баллов', 'error'); return; }
  const points = _pointsSign * amount;
  try {
    await api('POST', `/admin/members/${memberId}/points`, { member_id: memberId, points, comment });
    closeModal('pointsModal');
    await loadAll();
    toast(`${points > 0 ? '+' : ''}${points} баллов начислено`);
  } catch(e) { toast(e.message, 'error'); }
}

async function openHistory(memberId, name) {
  document.getElementById('historyModalTitle').textContent = `📋 ${name} — история баллов`;
  document.getElementById('historyBody').innerHTML = '<tr><td colspan="5" style="text-align:center;padding:16px;color:var(--text-muted)">Загрузка…</td></tr>';
  openModal('historyModal');
  try {
    const history = await api('GET', `/admin/members/${memberId}/points-history`);
    document.getElementById('historyBody').innerHTML = history.length
      ? history.map(l => `
          <tr>
            <td style="font-size:11px;color:var(--text-muted);white-space:nowrap">${fmtDate(l.created_at)}</td>
            <td><span class="${l.points>0?'pts-positive':'pts-negative'}" style="font-size:14px">${l.points>0?'+':''}${l.points}</span></td>
            <td><span class="source-badge source-badge--${l.source_type}">${srcLabel(l.source_type)}</span></td>
            <td style="font-size:12px;color:var(--text-secondary);max-width:180px">${l.comment||'—'}</td>
            <td style="font-size:11px;color:var(--text-muted)">${l.awarded_by_name||'—'}</td>
          </tr>`).join('')
      : '<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--text-muted)">Операций нет</td></tr>';
  } catch(e) {
    document.getElementById('historyBody').innerHTML = `<tr><td colspan="5" style="color:#B91C1C;padding:12px">Ошибка загрузки</td></tr>`;
  }
}

// ─── CHALLENGE / PRIZE ACTIONS ────────────────────────
async function adminDeleteChallenge(id) {
  if (!confirm('Удалить челлендж?')) return;
  try {
    await api('DELETE', `/challenges/${id}`);
    await loadAll();
    toast('Челлендж удалён');
  } catch(e) { toast(e.message, 'error'); }
}

async function addPrize() {
  const name        = v('prizeName').trim();
  const description = v('prizeDesc').trim();
  const cost        = parseInt(v('prizeCost'))||10;
  const level       = document.getElementById('prizeLevel').value;
  if (!name) { toast('Введите название', 'error'); return; }
  try {
    await api('POST', '/prizes/', { name, description, cost, level });
    closeModal('addPrizeModal');
    ['prizeName','prizeDesc'].forEach(id => set(id,''));
    await loadAll();
    toast('Приз добавлен');
  } catch(e) { toast(e.message, 'error'); }
}

async function deletePrize(id) {
  if (!confirm('Удалить приз?')) return;
  try {
    await api('DELETE', `/prizes/${id}`);
    await loadAll();
    toast('Приз удалён');
  } catch(e) { toast(e.message, 'error'); }
}

// ─── UTILS ────────────────────────────────────────────
function srcLabel(t) {
  return { challenge: 'Челлендж', daily: 'Дейли', manual: 'Ручное', admin_manual: 'Админ' }[t] || t;
}

function emptyState(icon, title, text='') {
  return `<div class="empty-state">
    <div class="empty-state__icon">${icon}</div>
    <div class="empty-state__title">${title}</div>
    ${text?`<div class="empty-state__text">${text}</div>`:''}
  </div>`;
}

function escQ(s) { return String(s).replace(/'/g, "\\'"); }
function v(id) { return (document.getElementById(id)?.value || '').trim(); }
function set(id, val) { const el = document.getElementById(id); if (el) el.value = val; }

function openModal(id)  { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

function toast(msg, type='success') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = `toast toast--${type} show`;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 3200);
}
