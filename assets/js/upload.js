/**
 * upload.js — Gestion des uploads de fichiers
 *
 * GitHub Pages étant statique, les fichiers sont stockés en mémoire
 * dans cette session. Pour un vrai stockage, intégrez un service :
 *   - Cloudflare R2 / AWS S3 (remplacer handleUpload)
 *   - Google Drive API
 *   - Un backend dédié
 */

const uploadedFiles = {
  map: [],
  addon: [],
  texture: [],
  misc: []
};

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function renderFileList(type) {
  const listEl = document.getElementById(`${type === 'texture' ? 'tex' : type}-list`);
  if (!listEl) return;

  listEl.innerHTML = '';
  uploadedFiles[type].forEach((file, index) => {
    const item = document.createElement('div');
    item.className = 'file-item';
    item.innerHTML = `
      <span class="file-name">📄 ${escapeHTML(file.name)}</span>
      <span class="file-size">${formatBytes(file.size)}</span>
      <button class="file-del" data-type="${type}" data-index="${index}" title="Supprimer">✕</button>
    `;
    listEl.appendChild(item);
  });

  // Event listeners pour les boutons de suppression
  listEl.querySelectorAll('.file-del').forEach(btn => {
    btn.addEventListener('click', () => {
      const t = btn.dataset.type;
      const i = parseInt(btn.dataset.index);
      uploadedFiles[t].splice(i, 1);
      renderFileList(t);
    });
  });
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

function handleUpload(file, type) {
  // Vérification taille
  const maxSize = type === 'misc' ? 50 * 1024 * 1024 : 100 * 1024 * 1024;
  if (file.size > maxSize) {
    alert(`⚠️ Fichier trop volumineux !\nMax: ${formatBytes(maxSize)}\nFichier: ${formatBytes(file.size)}`);
    return;
  }

  // Ajouter à la liste en mémoire
  uploadedFiles[type].push({
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: file.lastModified,
    // Pour vraiment stocker le fichier, vous pourriez envoyer via fetch() à une API ici
  });

  renderFileList(type);

  // Feedback visuel
  const areaId = `${type === 'texture' ? 'tex' : type}-drop`;
  const area = document.getElementById(areaId);
  if (area) {
    area.style.borderColor = '#39ff84';
    area.style.background = 'rgba(57,255,132,0.05)';
    setTimeout(() => {
      area.style.borderColor = '';
      area.style.background = '';
    }, 1200);
  }
}

function initUploadArea(inputEl) {
  const type = inputEl.dataset.type;
  const label = inputEl.closest('label');

  // File input change
  inputEl.addEventListener('change', () => {
    Array.from(inputEl.files).forEach(file => handleUpload(file, type));
    inputEl.value = ''; // Reset pour permettre re-sélection
  });

  // Drag & drop
  label.addEventListener('dragover', e => {
    e.preventDefault();
    label.classList.add('drag-over');
  });

  label.addEventListener('dragleave', e => {
    if (!label.contains(e.relatedTarget)) {
      label.classList.remove('drag-over');
    }
  });

  label.addEventListener('drop', e => {
    e.preventDefault();
    label.classList.remove('drag-over');
    Array.from(e.dataTransfer.files).forEach(file => handleUpload(file, type));
  });
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.file-input').forEach(initUploadArea);
});
