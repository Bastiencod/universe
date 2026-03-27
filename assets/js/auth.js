/**
 * auth.js — Système d'authentification côté client
 * Utilise SHA-256 pour comparer le mot de passe avec config.json
 *
 * ⚠️  SÉCURITÉ : Cette protection est client-side uniquement.
 *     Elle empêche l'accès casual mais un utilisateur avancé
 *     peut contourner via les DevTools. Pour une vraie sécurité,
 *     utilisez un backend (PHP, Node.js, etc.)
 */

const SESSION_KEY = 'cu_auth_v1';

// ── SHA-256 en pur JS (Web Crypto API) ──────────────────────────

async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Chargement de la config ──────────────────────────────────────

let siteConfig = null;

async function loadConfig() {
  try {
    const res = await fetch('data/config.json?v=' + Date.now());
    siteConfig = await res.json();
    // Appliquer les infos du serveur
    if (siteConfig.server_ip) {
      document.querySelectorAll('#server-ip, #s-ip').forEach(el => el.textContent = siteConfig.server_ip);
    }
    if (siteConfig.server_port) {
      document.querySelectorAll('#server-port, #s-port').forEach(el => el.textContent = siteConfig.server_port);
    }
    if (siteConfig.site_title) {
      document.title = siteConfig.site_title;
    }
  } catch (e) {
    console.warn('[Auth] Impossible de charger config.json:', e);
    siteConfig = { password_hash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918' };
  }
}

// ── Vérification du mot de passe ────────────────────────────────

async function checkPassword(password) {
  if (!siteConfig) await loadConfig();
  const hash = await sha256(password);
  return hash === siteConfig.password_hash;
}

// ── Session ─────────────────────────────────────────────────────

function isAuthenticated() {
  return sessionStorage.getItem(SESSION_KEY) === 'true';
}

function setSession(value) {
  if (value) {
    sessionStorage.setItem(SESSION_KEY, 'true');
  } else {
    sessionStorage.removeItem(SESSION_KEY);
  }
}

// ── UI ───────────────────────────────────────────────────────────

function showSite() {
  const loginScreen = document.getElementById('login-screen');
  const mainSite = document.getElementById('main-site');

  loginScreen.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
  loginScreen.style.opacity = '0';
  loginScreen.style.transform = 'scale(1.02)';

  setTimeout(() => {
    loginScreen.classList.add('hidden');
    mainSite.classList.remove('hidden');
    mainSite.style.opacity = '0';
    mainSite.style.transition = 'opacity 0.4s ease';
    requestAnimationFrame(() => {
      mainSite.style.opacity = '1';
    });
  }, 450);
}

function showLogin() {
  document.getElementById('main-site').classList.add('hidden');
  const loginScreen = document.getElementById('login-screen');
  loginScreen.classList.remove('hidden');
  loginScreen.style.opacity = '1';
  loginScreen.style.transform = 'none';
  document.getElementById('password').value = '';
  document.getElementById('login-error').textContent = '';
}

// ── Event Listeners ──────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  await loadConfig();

  // Vérifier session existante
  if (isAuthenticated()) {
    showSite();
    return;
  }

  // Bouton login
  const loginBtn = document.getElementById('login-btn');
  const passwordInput = document.getElementById('password');
  const errorMsg = document.getElementById('login-error');

  async function attemptLogin() {
    const pw = passwordInput.value.trim();
    if (!pw) {
      errorMsg.textContent = '⚠ Veuillez entrer un mot de passe';
      passwordInput.focus();
      return;
    }

    loginBtn.disabled = true;
    loginBtn.querySelector('.btn-text').textContent = 'VÉRIFICATION...';
    errorMsg.textContent = '';

    // Petit délai pour éviter les attaques par timing
    await new Promise(r => setTimeout(r, 400 + Math.random() * 200));

    const valid = await checkPassword(pw);

    if (valid) {
      setSession(true);
      loginBtn.querySelector('.btn-text').textContent = 'ACCÈS ACCORDÉ ✓';
      loginBtn.style.borderColor = '#39ff84';
      loginBtn.style.color = '#39ff84';
      setTimeout(showSite, 600);
    } else {
      loginBtn.disabled = false;
      loginBtn.querySelector('.btn-text').textContent = 'ACCÉDER';
      errorMsg.textContent = '✕ Mot de passe incorrect';
      passwordInput.style.borderColor = '#ff4d6d';
      passwordInput.style.boxShadow = '0 0 0 3px rgba(255,77,109,0.1)';
      setTimeout(() => {
        passwordInput.style.borderColor = '';
        passwordInput.style.boxShadow = '';
        errorMsg.textContent = '';
      }, 2500);
      passwordInput.focus();
      passwordInput.select();
    }
  }

  loginBtn.addEventListener('click', attemptLogin);
  passwordInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') attemptLogin();
  });

  // Toggle visibilité mot de passe
  const toggleBtn = document.getElementById('toggle-pw');
  toggleBtn.addEventListener('click', () => {
    const isText = passwordInput.type === 'text';
    passwordInput.type = isText ? 'password' : 'text';
    toggleBtn.textContent = isText ? '👁' : '🙈';
  });

  // Déconnexion
  document.getElementById('logout-btn').addEventListener('click', () => {
    setSession(false);
    showLogin();
  });

  passwordInput.focus();
});
