/**
 * auth.js - Systeme d'authentification cote client
 * Utilise SHA-256 pour comparer le mot de passe avec config.json
 *
 * Securite: Cette protection est client-side uniquement.
 * Elle empeche l'acces casual mais un utilisateur avance
 * peut contourner via les DevTools. Pour une vraie securite,
 * utilisez un backend (PHP, Node.js, etc.)
 */

const SESSION_KEY = 'cu_auth_v1';

async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

let siteConfig = null;

function applySiteConfig() {
  if (!siteConfig) return;
  window.siteConfig = siteConfig;
  document.dispatchEvent(new CustomEvent('site-config-loaded', { detail: siteConfig }));

  if (siteConfig.server_ip) {
    document.querySelectorAll('#server-ip, #s-ip').forEach(el => {
      el.textContent = siteConfig.server_ip;
    });
  }

  if (siteConfig.server_port) {
    document.querySelectorAll('#server-port, #s-port').forEach(el => {
      el.textContent = siteConfig.server_port;
    });
  }

  if (siteConfig.server_ip && siteConfig.server_port) {
    const serverAddress = `${siteConfig.server_ip}:${siteConfig.server_port}`;
    document.querySelectorAll('[data-server-address]').forEach(el => {
      el.textContent = serverAddress;
    });
    document.querySelectorAll('[data-server-connect]').forEach(el => {
      el.setAttribute('href', `steam://connect/${serverAddress}`);
    });
  }

  if (siteConfig.site_title) {
    document.title = siteConfig.site_title;
  }
}

async function loadConfig() {
  try {
    const res = await fetch('data/config.json?v=' + Date.now());
    siteConfig = await res.json();
  } catch (e) {
    console.warn('[Auth] Impossible de charger config.json:', e);
    siteConfig = {
      password_hash: '9e12c82b183980189d24ee1db190423bc76d46479a380526d42458ec00ec73c0',
      server_ip: 'node01.universe-gmod.fr',
      server_port: '25000',
      site_title: 'Universe Workspace - GMod Dev Hub',
      dropbox_access_token: '',
      dropbox_root_path: '/UniverseWorkspace'
    };
  }

  applySiteConfig();
}

async function checkPassword(password) {
  if (!siteConfig) await loadConfig();
  const hash = await sha256(password);
  return hash === siteConfig.password_hash;
}

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

function showSite() {
  const loginScreen = document.getElementById('login-screen');
  const mainSite = document.getElementById('main-site');

  loginScreen.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
  loginScreen.style.opacity = '0';
  loginScreen.style.transform = 'scale(1.02)';

  window.setTimeout(() => {
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

document.addEventListener('DOMContentLoaded', async () => {
  await loadConfig();

  if (isAuthenticated()) {
    showSite();
    return;
  }

  const loginBtn = document.getElementById('login-btn');
  const passwordInput = document.getElementById('password');
  const errorMsg = document.getElementById('login-error');

  async function attemptLogin() {
    const pw = passwordInput.value.trim();
    if (!pw) {
      errorMsg.textContent = 'Veuillez entrer un mot de passe';
      passwordInput.focus();
      return;
    }

    loginBtn.disabled = true;
    loginBtn.querySelector('.btn-text').textContent = 'VERIFICATION...';
    errorMsg.textContent = '';

    await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 200));

    const valid = await checkPassword(pw);

    if (valid) {
      setSession(true);
      loginBtn.querySelector('.btn-text').textContent = 'ACCES ACCORDE';
      loginBtn.style.borderColor = '#39ff84';
      loginBtn.style.color = '#39ff84';
      window.setTimeout(showSite, 600);
    } else {
      loginBtn.disabled = false;
      loginBtn.querySelector('.btn-text').textContent = 'ACCEDER';
      errorMsg.textContent = 'Mot de passe incorrect';
      passwordInput.style.borderColor = '#ff4d6d';
      passwordInput.style.boxShadow = '0 0 0 3px rgba(255,77,109,0.1)';
      window.setTimeout(() => {
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

  const toggleBtn = document.getElementById('toggle-pw');
  toggleBtn.addEventListener('click', () => {
    const isText = passwordInput.type === 'text';
    passwordInput.type = isText ? 'password' : 'text';
    toggleBtn.textContent = isText ? 'Voir' : 'Masquer';
  });

  document.getElementById('logout-btn').addEventListener('click', () => {
    setSession(false);
    showLogin();
  });

  passwordInput.focus();
});
