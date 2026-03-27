/**
 * main.js - Navigation et utilitaires generaux
 */

function getServerAddress() {
  const ip = document.getElementById('server-ip')?.textContent?.trim();
  const port = document.getElementById('server-port')?.textContent?.trim();
  if (!ip || !port) return '';
  return `${ip}:${port}`;
}

function flashCopyState(button, label) {
  if (!button) return;
  const originalLabel = button.dataset.label || button.textContent;
  button.dataset.label = originalLabel;
  button.textContent = label;
  button.style.color = '#39ff84';
  button.style.borderColor = '#39ff84';

  window.setTimeout(() => {
    button.textContent = originalLabel;
    button.style.color = '';
    button.style.borderColor = '';
  }, 2000);
}

function legacyCopy(text) {
  const el = document.createElement('textarea');
  el.value = text;
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
}

function copyIP(button = document.querySelector('.copy-btn')) {
  const full = getServerAddress();
  if (!full) return;

  navigator.clipboard.writeText(full).then(() => {
    flashCopyState(button, 'OK COPIE');
  }).catch(() => {
    legacyCopy(full);
    flashCopyState(button, 'OK COPIE');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const sections = document.querySelectorAll('.section[id]');
  const navLinks = document.querySelectorAll('.nav-link');
  const currentYear = document.getElementById('current-year');

  if (currentYear) {
    currentYear.textContent = new Date().getFullYear();
  }

  document.querySelectorAll('[data-copy-server]').forEach(button => {
    button.addEventListener('click', () => copyIP(button));
  });

  function updateActiveNav() {
    let current = '';
    sections.forEach(section => {
      const sectionTop = section.offsetTop - 80;
      if (window.scrollY >= sectionTop) {
        current = section.id;
      }
    });

    navLinks.forEach(link => {
      link.classList.toggle(
        'active',
        link.getAttribute('href') === `#${current}`
      );
    });
  }

  window.addEventListener('scroll', updateActiveNav, { passive: true });
  updateActiveNav();

  navLinks.forEach(link => {
    link.addEventListener('click', e => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  document.querySelectorAll('.footer-links a').forEach(link => {
    link.addEventListener('click', e => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
});

function initParticles() {
  const hero = document.querySelector('.hero-section');
  if (!hero) return;

  for (let i = 0; i < 12; i++) {
    const p = document.createElement('div');
    p.style.cssText = `
      position:absolute;
      width:${1 + Math.random() * 2}px;
      height:${1 + Math.random() * 2}px;
      background:rgba(0,229,255,${0.2 + Math.random() * 0.4});
      border-radius:50%;
      left:${Math.random() * 100}%;
      top:${Math.random() * 100}%;
      pointer-events:none;
      animation: float${i} ${6 + Math.random() * 8}s ease-in-out infinite;
    `;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes float${i} {
        0%,100% { transform: translateY(0) translateX(0); opacity:${0.3 + Math.random() * 0.4}; }
        33% { transform: translateY(${-20 - Math.random() * 40}px) translateX(${-10 + Math.random() * 20}px); }
        66% { transform: translateY(${-10 - Math.random() * 20}px) translateX(${-15 + Math.random() * 30}px); }
      }
    `;
    document.head.appendChild(style);
    hero.appendChild(p);
  }
}

document.addEventListener('DOMContentLoaded', initParticles);
