const STORAGE_KEY = 'universe_workspace_dropbox';
const uploadedFiles = {
  map: [],
  addon: [],
  texture: [],
  misc: []
};

const dropboxState = {
  token: '',
  root: '/UniverseWorkspace',
  connected: false,
  accountName: '',
  remoteFiles: []
};

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / (1024 ** index);
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatDate(input) {
  if (!input) return '-';
  return new Date(input).toLocaleString('fr-FR');
}

function statusLabel(status) {
  switch (status) {
    case 'uploading': return 'Upload en cours';
    case 'synced': return 'Synchronise';
    case 'error': return 'Erreur';
    default: return 'En attente';
  }
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value;
  return div.innerHTML;
}

function inferType(name) {
  const lower = name.toLowerCase();
  if (lower.endsWith('.bsp') || lower.endsWith('.vmf')) return 'map';
  if (lower.endsWith('.gma') || lower.endsWith('.lua')) return 'addon';
  if (lower.endsWith('.vtf') || lower.endsWith('.vmt') || lower.endsWith('.png') || lower.endsWith('.psd')) return 'texture';
  return 'misc';
}

function getLocalEntries() {
  return Object.entries(uploadedFiles).flatMap(([type, files]) => files.map(file => ({ ...file, type })));
}

function findLocalEntryById(id) {
  for (const type of Object.keys(uploadedFiles)) {
    const entry = uploadedFiles[type].find(file => file.id === id);
    if (entry) return entry;
  }
  return null;
}

function setDropboxStatus(label, note = '') {
  document.getElementById('dropbox-status').textContent = label;
  document.getElementById('dropbox-identity').textContent = note;
}

function persistDropboxState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: dropboxState.token, root: dropboxState.root }));
}

function loadDropboxState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    dropboxState.token = parsed.token || '';
    dropboxState.root = parsed.root || dropboxState.root;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

async function dropboxRequest(endpoint, body, options = {}) {
  const isContent = Boolean(options.content);
  const url = isContent ? `https://content.dropboxapi.com/2/${endpoint}` : `https://api.dropboxapi.com/2/${endpoint}`;
  const headers = { Authorization: `Bearer ${dropboxState.token}` };

  let payload = null;
  if (isContent) {
    headers['Dropbox-API-Arg'] = JSON.stringify(body);
    headers['Content-Type'] = 'application/octet-stream';
    payload = options.content;
  } else {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body === undefined ? {} : body);
  }

  const response = await fetch(url, { method: 'POST', headers, body: payload });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Dropbox request failed: ${response.status}`);
  }

  return response.json();
}

function parseDropboxError(error) {
  try {
    return JSON.parse(error.message);
  } catch {
    return null;
  }
}

async function ensureDropboxRootExists() {
  try {
    await dropboxRequest('files/list_folder', {
      path: dropboxState.root,
      recursive: false,
      include_deleted: false,
      include_has_explicit_shared_members: false,
      include_mounted_folders: true
    });
  } catch (error) {
    const parsed = parseDropboxError(error);
    const notFound = parsed?.error?.['.tag'] === 'path' && parsed?.error?.path?.['.tag'] === 'not_found';
    if (!notFound) throw error;

    await dropboxRequest('files/create_folder_v2', {
      path: dropboxState.root,
      autorename: false
    });
  }
}

async function connectDropbox() {
  const tokenInput = document.getElementById('dropbox-token');
  const rootInput = document.getElementById('dropbox-root');
  const configToken = window.siteConfig?.dropbox_access_token || '';
  const token = tokenInput.value.trim() || configToken || dropboxState.token;
  const root = rootInput.value.trim() || '/UniverseWorkspace';

  if (!token) {
    setDropboxStatus('Token manquant', 'Colle un access token Dropbox pour connecter le hub.');
    return;
  }

  dropboxState.token = token;
  dropboxState.root = root.startsWith('/') ? root : `/${root}`;

  try {
    const profile = await dropboxRequest('users/get_current_account', null);
    dropboxState.connected = true;
    dropboxState.accountName = profile.name.display_name;
    persistDropboxState();
    setDropboxStatus('Connecte', `${profile.name.display_name} - ${dropboxState.root}`);
    await ensureDropboxRootExists();
    await refreshDropboxFiles();
  } catch (error) {
    console.error(error);
    dropboxState.connected = false;
    dropboxState.remoteFiles = [];
    setDropboxStatus('Connexion echouee', 'Dropbox a refuse la connexion ou la creation du dossier racine.');
    renderFileManager();
  }
}

function disconnectDropbox() {
  dropboxState.token = '';
  dropboxState.connected = false;
  dropboxState.accountName = '';
  dropboxState.remoteFiles = [];
  localStorage.removeItem(STORAGE_KEY);
  document.getElementById('dropbox-token').value = '';
  setDropboxStatus('Non connecte', 'Ajoute un token pour synchroniser.');
  renderFileManager();
}

async function refreshDropboxFiles() {
  if (!dropboxState.connected) {
    renderFileManager();
    return;
  }

  let cursor = null;
  let hasMore = true;
  const entries = [];

  while (hasMore) {
    const payload = cursor
      ? await dropboxRequest('files/list_folder/continue', { cursor })
      : await dropboxRequest('files/list_folder', {
          path: dropboxState.root,
          recursive: true,
          include_deleted: false,
          include_has_explicit_shared_members: false,
          include_mounted_folders: true
        });

    payload.entries.forEach(entry => {
      if (entry['.tag'] === 'file') {
        entries.push({
          id: entry.id,
          name: entry.name,
          size: entry.size,
          type: inferType(entry.name),
          source: 'dropbox',
          updatedAt: entry.client_modified || entry.server_modified,
          path: entry.path_display
        });
      }
    });

    cursor = payload.cursor;
    hasMore = payload.has_more;
  }

  dropboxState.remoteFiles = entries.sort((a, b) => a.name.localeCompare(b.name));
  renderFileManager();
}

function renderCategoryList(type) {
  const targetId = type === 'texture' ? 'tex-list' : `${type}-list`;
  const container = document.getElementById(targetId);
  const files = uploadedFiles[type];
  if (!container) return;

  container.innerHTML = '';
  if (!files.length) {
    container.innerHTML = '<div class="file-item"><span class="file-name">Aucun fichier</span><span class="file-size">-</span><span></span></div>';
    return;
  }

  files.forEach((file, index) => {
    const item = document.createElement('div');
    item.className = 'file-item';
    item.innerHTML = `
      <span class="file-name">${escapeHtml(file.name)}</span>
      <span class="file-badge status-${file.status || 'pending'}">${statusLabel(file.status)}</span>
      <span class="file-size">${formatBytes(file.size)}</span>
      <button class="file-del" data-type="${type}" data-index="${index}" type="button">Suppr.</button>
    `;
    container.appendChild(item);
  });

  container.querySelectorAll('.file-del').forEach(button => {
    button.addEventListener('click', () => {
      uploadedFiles[button.dataset.type].splice(Number(button.dataset.index), 1);
      renderCategoryList(button.dataset.type);
      updateQueueSummary();
      renderFileManager();
    });
  });
}

function updateQueueSummary() {
  const entries = getLocalEntries();
  const total = entries.length;
  const uploading = entries.filter(entry => entry.status === 'uploading').length;
  const synced = entries.filter(entry => entry.status === 'synced').length;
  const errors = entries.filter(entry => entry.status === 'error').length;
  document.getElementById('queue-summary').textContent = total
    ? `${total} fichier(s) locaux. ${uploading} en cours, ${synced} synchronises, ${errors} en erreur.`
    : 'Aucun fichier local pour le moment.';
}

async function handleUpload(file, type) {
  const maxSize = type === 'misc' ? 50 * 1024 * 1024 : 100 * 1024 * 1024;
  if (file.size > maxSize) {
    alert(`Fichier trop volumineux: ${file.name}`);
    return;
  }

  const entry = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: file.name,
    size: file.size,
    source: 'local',
    updatedAt: new Date(file.lastModified || Date.now()).toISOString(),
    blob: file,
    status: dropboxState.connected ? 'uploading' : 'pending'
  };

  uploadedFiles[type].push(entry);

  renderCategoryList(type);
  updateQueueSummary();
  renderFileManager();

  if (dropboxState.connected) {
    try {
      await uploadSingleFileToDropbox(entry);
      const saved = findLocalEntryById(entry.id);
      if (saved) saved.status = 'synced';
      await refreshDropboxFiles();
    } catch (error) {
      console.error(error);
      const saved = findLocalEntryById(entry.id);
      if (saved) saved.status = 'error';
    }

    renderCategoryList(type);
    updateQueueSummary();
    renderFileManager();
  }
}

function initUploadArea(inputEl) {
  const type = inputEl.dataset.type;
  const area = inputEl.closest('.upload-area');

  inputEl.addEventListener('change', () => {
    Array.from(inputEl.files || []).forEach(file => { handleUpload(file, type); });
    inputEl.value = '';
  });

  area.addEventListener('dragover', event => {
    event.preventDefault();
    area.classList.add('drag-over');
  });

  area.addEventListener('dragleave', () => area.classList.remove('drag-over'));

  area.addEventListener('drop', event => {
    event.preventDefault();
    area.classList.remove('drag-over');
    Array.from(event.dataTransfer.files || []).forEach(file => { handleUpload(file, type); });
  });
}

async function uploadSingleFileToDropbox(entry) {
  if (!dropboxState.connected) throw new Error('Dropbox non connecte');
  const targetPath = `${dropboxState.root}/${entry.type}/${entry.name}`.replace(/\/+/g, '/');
  await dropboxRequest('files/upload', { path: targetPath, mode: 'overwrite', autorename: false, mute: true }, { content: entry.blob });
}

async function syncAllToDropbox() {
  const localEntries = getLocalEntries().filter(entry => entry.status !== 'synced');
  if (!localEntries.length) {
    setDropboxStatus(dropboxState.connected ? 'Connecte' : 'Non connecte', 'Aucun fichier local a envoyer.');
    return;
  }
  if (!dropboxState.connected) {
    setDropboxStatus('Connexion requise', 'Connecte Dropbox avant d envoyer la queue.');
    return;
  }

  setDropboxStatus('Sync en cours', `Envoi de ${localEntries.length} fichier(s)...`);

  try {
    for (const entry of localEntries) {
      entry.status = 'uploading';
      renderCategoryList(entry.type);
      updateQueueSummary();
      renderFileManager();
      await uploadSingleFileToDropbox(entry);
      entry.status = 'synced';
    }

    updateQueueSummary();
    await refreshDropboxFiles();
    setDropboxStatus('Sync terminee', `${dropboxState.accountName} - ${dropboxState.root}`);
  } catch (error) {
    console.error(error);
    setDropboxStatus('Erreur Dropbox', 'Un envoi a echoue. Verifie le token et les permissions.');
  }

  Object.keys(uploadedFiles).forEach(renderCategoryList);
  renderFileManager();
}

async function createDropboxShareLink(path) {
  const existing = await dropboxRequest('sharing/list_shared_links', { path, direct_only: true });
  if (existing.links?.length) return existing.links[0].url;
  const created = await dropboxRequest('sharing/create_shared_link_with_settings', {
    path,
    settings: { requested_visibility: 'public' }
  });
  return created.url;
}

async function deleteDropboxFile(path) {
  if (!dropboxState.connected) return;
  await dropboxRequest('files/delete_v2', { path });
  await refreshDropboxFiles();
}

async function getDropboxTemporaryLink(path) {
  const result = await dropboxRequest('files/get_temporary_link', { path });
  return result.link;
}

function downloadLocalFile(entry) {
  const url = URL.createObjectURL(entry.blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = entry.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function renderFileManager() {
  const tbody = document.getElementById('file-manager-body');
  if (!tbody) return;

  const search = document.getElementById('manager-search')?.value?.trim().toLowerCase() || '';
  const sourceFilter = document.getElementById('manager-source-filter')?.value || 'all';
  const typeFilter = document.getElementById('manager-type-filter')?.value || 'all';
  const localEntries = getLocalEntries();
  const entries = [...localEntries, ...dropboxState.remoteFiles];

  const filtered = entries.filter(entry => {
    const matchesSource = sourceFilter === 'all' || sourceFilter === entry.source;
    const matchesType = typeFilter === 'all' || typeFilter === entry.type;
    const matchesSearch = !search || `${entry.name} ${entry.path || ''}`.toLowerCase().includes(search);
    return matchesSource && matchesType && matchesSearch;
  });

  document.getElementById('manager-local-count').textContent = String(localEntries.length);
  document.getElementById('manager-dropbox-count').textContent = String(dropboxState.remoteFiles.length);
  document.getElementById('manager-visible-count').textContent = String(filtered.length);
  document.getElementById('manager-total-count').textContent = String(entries.length);

  tbody.innerHTML = '';
  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-cell">Aucun fichier dans cette vue.</td></tr>';
    return;
  }

  filtered.forEach(entry => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>
        <div class="table-name">
          <strong>${escapeHtml(entry.name)}</strong>
          <span class="file-badge">${entry.path ? escapeHtml(entry.path) : 'Queue locale'}</span>
        </div>
      </td>
      <td>${escapeHtml(entry.type)}</td>
      <td>${entry.source === 'dropbox' ? 'Dropbox' : 'Local'}</td>
      <td>${formatBytes(entry.size)}</td>
      <td>${formatDate(entry.updatedAt)}</td>
      <td>
        <div class="file-actions">
          ${entry.source === 'local'
            ? `
              <button class="table-action" data-action="copy-name" data-id="${entry.id}" data-name="${escapeHtml(entry.name)}" type="button">Copier nom</button>
              <button class="table-action" data-action="download-local" data-id="${entry.id}" type="button">Download</button>
            `
            : `
              <button class="table-action" data-action="copy-path" data-path="${escapeHtml(entry.path)}" type="button">Copier path</button>
              <button class="table-action" data-action="download-remote" data-path="${escapeHtml(entry.path)}" type="button">Download</button>
              <button class="table-action" data-action="share" data-path="${escapeHtml(entry.path)}" type="button">Lien</button>
              <button class="table-action danger" data-action="delete-remote" data-path="${escapeHtml(entry.path)}" type="button">Supprimer</button>
            `}
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });

  tbody.querySelectorAll('.table-action').forEach(button => {
    button.addEventListener('click', async () => {
      const action = button.dataset.action;
      try {
        if (action === 'copy-name') copyText(button.dataset.name, button, 'Nom copie');
        if (action === 'download-local') {
          const entry = findLocalEntryById(button.dataset.id);
          if (entry) downloadLocalFile(entry);
        }
        if (action === 'copy-path') copyText(button.dataset.path, button, 'Path copie');
        if (action === 'download-remote') {
          const url = await getDropboxTemporaryLink(button.dataset.path);
          window.open(url, '_blank', 'noopener');
        }
        if (action === 'share') copyText(await createDropboxShareLink(button.dataset.path), button, 'Lien copie');
        if (action === 'delete-remote') await deleteDropboxFile(button.dataset.path);
      } catch (error) {
        console.error(error);
        button.textContent = 'Erreur';
      }
    });
  });
}

function clearLocalQueue() {
  Object.keys(uploadedFiles).forEach(type => {
    uploadedFiles[type] = [];
    renderCategoryList(type);
  });
  updateQueueSummary();
  renderFileManager();
}

document.addEventListener('DOMContentLoaded', () => {
  loadDropboxState();

  document.getElementById('dropbox-token').value = window.siteConfig?.dropbox_access_token || dropboxState.token;
  document.getElementById('dropbox-root').value = window.siteConfig?.dropbox_root_path || dropboxState.root;

  document.querySelectorAll('.file-input').forEach(initUploadArea);
  ['map', 'addon', 'texture', 'misc'].forEach(renderCategoryList);
  updateQueueSummary();
  renderFileManager();

  document.getElementById('dropbox-connect-btn').addEventListener('click', connectDropbox);
  document.getElementById('dropbox-refresh-btn').addEventListener('click', refreshDropboxFiles);
  document.getElementById('dropbox-disconnect-btn').addEventListener('click', disconnectDropbox);
  document.getElementById('sync-all-btn').addEventListener('click', syncAllToDropbox);
  document.getElementById('clear-local-btn').addEventListener('click', clearLocalQueue);
  document.getElementById('manager-search').addEventListener('input', renderFileManager);
  document.getElementById('manager-source-filter').addEventListener('change', renderFileManager);
  document.getElementById('manager-type-filter').addEventListener('change', renderFileManager);

  if (dropboxState.token) connectDropbox();
});

document.addEventListener('site-config-loaded', event => {
  const config = event.detail || {};
  const tokenInput = document.getElementById('dropbox-token');
  const rootInput = document.getElementById('dropbox-root');
  if (tokenInput && !tokenInput.value) tokenInput.value = config.dropbox_access_token || '';
  if (rootInput && (!rootInput.value || rootInput.value === '/UniverseWorkspace')) {
    rootInput.value = config.dropbox_root_path || '/UniverseWorkspace';
  }
});
