function copyText(text, button, label = 'Copie OK') {
  const original = button ? (button.dataset.label || button.textContent) : '';
  if (button) button.dataset.label = original;

  const done = () => {
    if (!button) return;
    button.textContent = label;
    window.setTimeout(() => {
      button.textContent = original;
    }, 1800);
  };

  navigator.clipboard.writeText(text).then(done).catch(() => {
    const area = document.createElement('textarea');
    area.value = text;
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    document.body.removeChild(area);
    done();
  });
}

function copyServerAddress(button = document.querySelector('[data-copy-server]')) {
  const address = document.querySelector('[data-server-address]')?.textContent?.trim();
  if (address) copyText(address, button, 'Adresse copiee');
}

function slugToTitle(url) {
  const cleanUrl = new URL(url);
  const lastPart = cleanUrl.pathname.split('/').filter(Boolean).pop() || cleanUrl.hostname;
  return decodeURIComponent(lastPart)
    .replace(/^Category:/i, '')
    .replace(/_/g, ' ')
    .replace(/\((.*?)\)/g, '$1')
    .replace(/\b([a-z])/g, char => char.toUpperCase());
}

function domainLabel(url) {
  const hostname = new URL(url).hostname.replace(/^www\./, '');
  if (hostname.includes('facepunch')) return 'Facepunch';
  if (hostname.includes('valvesoftware')) return 'Valve Developer Wiki';
  if (hostname.includes('steamgames')) return 'Steamworks';
  if (hostname.includes('dropbox')) return 'Dropbox';
  if (hostname.includes('lua.org')) return 'Lua';
  if (hostname.includes('luarocks')) return 'LuaRocks';
  if (hostname.includes('github.com')) return 'GitHub';
  if (hostname.includes('visualstudio.com')) return 'VS Code';
  return hostname;
}

function buildResourceGroups(resources) {
  const groups = new Map();
  resources.forEach(resource => {
    if (!groups.has(resource.category)) groups.set(resource.category, []);
    groups.get(resource.category).push(resource);
  });
  return Array.from(groups.entries()).map(([category, items]) => ({ category, items }));
}

function renderResources() {
  const search = document.getElementById('resource-search')?.value?.trim().toLowerCase() || '';
  const category = document.getElementById('resource-category-filter')?.value || 'all';
  const target = document.getElementById('resource-groups');
  const countEl = document.getElementById('resource-visible-count');
  if (!target || !window.RESOURCE_LINKS) return;

  const filtered = window.RESOURCE_LINKS.filter(resource => {
    const haystack = `${resource.category} ${slugToTitle(resource.url)} ${resource.url}`.toLowerCase();
    const matchesSearch = !search || haystack.includes(search);
    const matchesCategory = category === 'all' || category === resource.category;
    return matchesSearch && matchesCategory;
  });

  target.innerHTML = '';
  countEl.textContent = String(filtered.length);

  if (!filtered.length) {
    target.innerHTML = '<div class="resource-group"><p class="empty-cell">Aucun lien ne correspond a cette recherche.</p></div>';
    return;
  }

  buildResourceGroups(filtered).forEach(group => {
    const section = document.createElement('section');
    section.className = 'resource-group';
    section.innerHTML = `
      <div class="resource-group-head">
        <div>
          <p class="section-kicker">Categorie</p>
          <h3>${group.category}</h3>
        </div>
        <span class="resource-group-count">${group.items.length} liens</span>
      </div>
      <div class="resource-grid"></div>
    `;

    const grid = section.querySelector('.resource-grid');
    group.items.forEach(resource => {
      const title = resource.title || slugToTitle(resource.url);
      const card = document.createElement('a');
      card.className = 'resource-card';
      card.href = resource.url;
      card.target = '_blank';
      card.rel = 'noreferrer noopener';
      card.innerHTML = `
        <strong>${title}</strong>
        <p>${domainLabel(resource.url)} - ressource verifiee pour ${resource.category.toLowerCase()}.</p>
        <div class="resource-url">${resource.url}</div>
      `;
      grid.appendChild(card);
    });

    target.appendChild(section);
  });
}

function initResourceFilters() {
  const filter = document.getElementById('resource-category-filter');
  if (!filter || !window.RESOURCE_LINKS) return;

  [...new Set(window.RESOURCE_LINKS.map(item => item.category))].forEach(category => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    filter.appendChild(option);
  });

  document.getElementById('resource-search')?.addEventListener('input', renderResources);
  filter.addEventListener('change', renderResources);
  renderResources();
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('current-year').textContent = new Date().getFullYear();

  document.querySelectorAll('[data-copy-server]').forEach(button => {
    button.addEventListener('click', () => copyServerAddress(button));
  });

  const sections = document.querySelectorAll('.section[id]');
  const navLinks = document.querySelectorAll('.nav-link');

  function updateActiveNav() {
    let current = sections[0]?.id || '';
    sections.forEach(section => {
      if (window.scrollY >= section.offsetTop - 140) current = section.id;
    });
    navLinks.forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === `#${current}`);
    });
  }

  navLinks.forEach(link => {
    link.addEventListener('click', event => {
      const target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  document.querySelectorAll('.footer-links a').forEach(link => {
    link.addEventListener('click', event => {
      const target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  window.addEventListener('scroll', updateActiveNav, { passive: true });
  updateActiveNav();
  initResourceFilters();
});
