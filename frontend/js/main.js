// === GLOBAL UTILS ===

const API_BASE = '/api';

// Token management
const Auth = {
  getToken: () => localStorage.getItem('token'),
  setToken: (t) => localStorage.setItem('token', t),
  removeToken: () => localStorage.removeItem('token'),
  getUser: () => {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  },
  setUser: (u) => localStorage.setItem('user', JSON.stringify(u)),
  isAuth: () => !!localStorage.getItem('token'),
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/pages/login.html';
  }
};

// API helper
async function api(method, path, data = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  const token = Auth.getToken();
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (data) opts.body = JSON.stringify(data);
  const res = await fetch(API_BASE + path, opts);
  if (res.status === 401) { Auth.logout(); return; }
  const json = await res.json();
  if (!res.ok) throw new Error(json.detail || 'Ошибка запроса');
  return json;
}

// Toast notification
function showToast(msg, type = 'success') {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.className = `toast toast--${type} show`;
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// === LANDING PAGE LOGIC ===
document.addEventListener('DOMContentLoaded', () => {
  // Burger menu
  const burger = document.getElementById('burger');
  const mobileNav = document.getElementById('mobileNav');
  if (burger && mobileNav) {
    burger.addEventListener('click', () => {
      mobileNav.classList.toggle('open');
    });
    // Close on link click
    mobileNav.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => mobileNav.classList.remove('open'));
    });
  }

  // Smooth close mobile nav on outside click
  document.addEventListener('click', (e) => {
    if (mobileNav && mobileNav.classList.contains('open')) {
      if (!mobileNav.contains(e.target) && !burger.contains(e.target)) {
        mobileNav.classList.remove('open');
      }
    }
  });

  // Intersection Observer for fade-in
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.mechanic-card, .level-card, .reward-card, .stat-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    observer.observe(el);
  });

  // If already logged in, update CTA
  if (Auth.isAuth()) {
    const user = Auth.getUser();
    const btns = document.querySelectorAll('a[href*="login"]');
    btns.forEach(btn => {
      const role = user?.role;
      btn.href = role === 'admin' ? '/pages/admin.html' : '/pages/pm.html';
      if (btn.textContent.includes('Войти')) btn.textContent = 'Личный кабинет';
    });
  }
});
