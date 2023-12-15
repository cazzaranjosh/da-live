import { origin, hlxOrigin } from '../../browse/state/index.js';

export async function saveToFranklin(path, action) {
  const [owner, repo, ...parts] = path.slice(1).toLowerCase().split('/');
  const aemPath = parts.join('/');

  const url = `${hlxOrigin}/${action}/${owner}/${repo}/main/${aemPath}`
  const resp = await fetch(url, { method: 'POST' });
  if (!resp.ok) console.log('error');
  return resp.json();
}

function toBlockCSSClassNames(text) {
  if (!text) return [];
  const names = [];
  const idx = text.lastIndexOf('(');
  if (idx >= 0) {
    names.push(text.substring(0, idx));
    names.push(...text.substring(idx + 1).split(','));
  } else {
    names.push(text);
  }

  return names.map((name) => name
    .toLowerCase()
    .replace(/[^0-9a-z]+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, ''))
    .filter((name) => !!name);
}

function convertBlocks(tables) {
  tables.forEach(table => {
    const tbody = table.querySelector(':scope > tbody');
    const rows = tbody ? [...tbody.querySelectorAll(':scope > tr')] : [...table.querySelectorAll(':scope > tr')];
    const nameRow = rows.shift();
    const divs = [...rows].map((row) => {
      const cols = row.querySelectorAll(':scope > td');
      const divs = [...cols].map((col) => {
        const { innerHTML } = col;
        const div = document.createElement('div');
        div.innerHTML = innerHTML;
        return div;
      });
      const div = document.createElement('div');
      div.append(...divs);
      return div;
    });

    const div = document.createElement('div');
    div.className = toBlockCSSClassNames(nameRow.textContent).join(' ');
    div.append(...divs);
    table.parentElement.parentElement.replaceChild(div, table.parentElement);
  });
}

export function saveToDas(pathname) {
  const fullPath = `${origin}/source${pathname}.html`;

  const editor = window.view.root.querySelector('.ProseMirror').cloneNode(true);
  editor.removeAttribute('class');
  editor.removeAttribute('contenteditable');
  editor.removeAttribute('translate');

  const emptyImgs = editor.querySelectorAll('img.ProseMirror-separator');
  emptyImgs.forEach((el) => { el.remove(); });

  const trailingBreaks = editor.querySelectorAll('.ProseMirror-trailingBreak');
  trailingBreaks.forEach((el) => { el.remove(); });

  const tables = editor.querySelectorAll('.tableWrapper > table');
  convertBlocks(tables);

  const html = `<body><main>${editor.outerHTML}</main></body>`;
  const blob = new Blob([html], { type: 'text/html' });

  const formData = new FormData();
  formData.append('data', blob);

  const opts = { method: 'PUT', body: formData };
  return fetch(fullPath, opts);
}

export async function handleAction(action) {
  const { hash } = window.location;
  const pathname = hash.replace('#', '');
  const dasSave = await saveToDas(pathname);
  if (!dasSave.ok) return;
  let json = await saveToFranklin(pathname, 'preview');
  if (action === 'publish') json = await saveToFranklin(pathname, 'live');
  const { url } = action === 'publish' ? json.live : json.preview;
  window.open(url, '_blank');
}

export function open(e) {
  e.target.closest('.da-header-actions').classList.toggle('is-open');
}
