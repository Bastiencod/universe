/**
 * main.js — Navigation et utilitaires généraux
 */

// ── Copie de l'IP ────────────────────────────────────────────────

function copyIP() {
  const ip = document.getElementById('server-ip').textContent;
  const port = document.getElementById('server-port').textContent;
  const full = `${ip}:${port}`;

  navigator.clipboard.writeText(full).then(() => {
    const btn = document.querySelector('.copy-btn');
    const orig = btn.textContent;
    btn.textContent = '✓ Copié !';
    btn.style.color = '#39ff84';
    btn.style.borderColor = '#39ff84';
    setTimeout(() => {
      btn.textContent = orig;
      btn.style.color = '';
      btn.style.borderColor = '';
    }, 2000);
  }).catch(() => {
    // Fallback pour navigateurs anciens
    const el = document.createElement('textarea');
    el.value = full;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  });
}

// ── Navigation active au scroll ──────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const sections = document.querySelectorAll('.section[id]');
  const navLinks = document.querySelectorAll('.nav-link');

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

  // Smooth scroll pour les liens de navigation
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

// ── Effet de particules sur le hero (optionnel) ──────────────────

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
        0%,100% { transform: translateY(0) translateX(0); opacity:${0.3 + Math.random()*0.4}; }
        33% { transform: translateY(${-20 - Math.random()*40}px) translateX(${-10 + Math.random()*20}px); }
        66% { transform: translateY(${-10 - Math.random()*20}px) translateX(${-15 + Math.random()*30}px); }
      }
    `;
    document.head.appendChild(style);
    hero.appendChild(p);
  }
}

document.addEventListener('DOMContentLoaded', initParticles);
