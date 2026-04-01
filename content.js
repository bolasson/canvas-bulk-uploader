(() => {
  'use strict';

  function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const el = document.querySelector(selector);
      if (el) return resolve(el);
      const observer = new MutationObserver(() => {
        const found = document.querySelector(selector);
        if (found) { observer.disconnect(); resolve(found); }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => { observer.disconnect(); reject(new Error('Timeout')); }, timeout);
    });
  }

  function formatBytes(b) {
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
    return (b / 1048576).toFixed(1) + ' MB';
  }

  function activateFileTab() {
    const tab = document.querySelector(
      'a[href="#submit_online_upload_form"], li.online_upload a, a[data-type="online_upload"]'
    );
    if (tab) tab.click();
  }

  function clickAddAnotherFile() {
    const link = document.querySelector(
      '.add_another_file_link, a[data-action="add_attachment"], .add_another_file'
    );
    if (link) { link.click(); return true; }
    return false;
  }

  function setFileOnInput(input, file) {
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.dispatchEvent(new Event('input',  { bubbles: true }));
  }

  function clearInput(input) {
    const dt = new DataTransfer();
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // Get all current Canvas file inputs
  function getCanvasInputs() {
    return [...document.querySelectorAll('input[name^="attachments"][type="file"]')];
  }

  // Remove a Canvas slot by its input element (clicks the remove link in its row)
  async function removeCanvasSlot(input) {
    const row = input.closest(
      '.submission_attachment, .attachment_field, [class*="attachment"], li, .file_input_row'
    );
    const removeBtn = row && row.querySelector(
      '.remove_attachment_link, .delete_attachment_link, a[data-action="remove_attachment"]'
    );
    if (removeBtn) {
      removeBtn.click();
      await new Promise(r => setTimeout(r, 200));
    } else {
      // Can't remove the slot (it's the last one), just blank it
      clearInput(input);
    }
  }

  // Step 1: Remove any Canvas slots whose file is no longer in our panel list
  async function syncRemovals(panelNames) {
    const inputs = getCanvasInputs();
    for (const input of inputs) {
      if (input.files && input.files[0]) {
        if (!panelNames.has(input.files[0].name)) {
          await removeCanvasSlot(input);
        }
      }
    }
  }

  async function uploadFiles(files) {
    activateFileTab();
    await new Promise(r => setTimeout(r, 400));

    // Build set of names we want uploaded
    const panelNames = new Set(files.map(f => f.name));

    // Step 1: remove Canvas slots for files no longer in our list
    await syncRemovals(panelNames);
    await new Promise(r => setTimeout(r, 200));

    // Step 2: figure out which files still need uploading (not already in Canvas)
    const canvasInputs   = getCanvasInputs();
    const canvasNames    = new Set(canvasInputs.filter(i => i.files && i.files[0]).map(i => i.files[0].name));
    const filesToUpload  = files.filter(f => !canvasNames.has(f.name));

    if (filesToUpload.length === 0) {
      showStatus('All files are already queued in Canvas — nothing new to add.', 'warn');
      return;
    }

    // Make sure at least one input exists
    try {
      await waitForElement(
        '#submit_online_upload_form input[type="file"], input[name^="attachments"][type="file"]',
        5000
      );
    } catch {
      showStatus("Could not find Canvas file input. Make sure you're on the submission page.", 'error');
      return;
    }

    let uploaded = 0;

    for (const file of filesToUpload) {
      // Find an empty slot first
      const currentInputs = getCanvasInputs();
      const emptySlot = currentInputs.find(i => !i.files || i.files.length === 0);

      if (emptySlot) {
        setFileOnInput(emptySlot, file);
        uploaded++;
      } else {
        // No empty slots — add a new one
        const before = getCanvasInputs();
        const added  = clickAddAnotherFile();
        if (!added) {
          showStatus(`Only ${uploaded} file(s) added — "Add Another File" link not found.`, 'warn');
          break;
        }
        await new Promise(r => setTimeout(r, 350));
        const after    = getCanvasInputs();
        const newInput = after.find(el => !before.includes(el));
        if (!newInput) {
          showStatus(`Could not find new file input for "${file.name}".`, 'error');
          break;
        }
        setFileOnInput(newInput, file);
        uploaded++;
      }

      await new Promise(r => setTimeout(r, 150));
    }

    const skipped  = files.length - filesToUpload.length;
    const skipNote = skipped > 0 ? ` (${skipped} already in Canvas, skipped)` : '';
    showStatus(`Done! ${uploaded} file${uploaded !== 1 ? 's' : ''} loaded${skipNote} — hit Submit!`, 'success');
  }

  function showStatus(msg, type = 'info') {
    const el = document.getElementById('cbu-status');
    if (!el) return;
    el.textContent = msg;
    el.className   = 'cbu-status cbu-status--' + type;
    el.style.display = 'block';
    if (type === 'success') setTimeout(() => { el.style.display = 'none'; }, 7000);
  }

  function buildPanel() {
    if (document.getElementById('cbu-panel')) return;

    const panel = document.createElement('div');
    panel.id = 'cbu-panel';
    panel.innerHTML = `
      <div class="cbu-header">
        <span class="cbu-title">Canvas Bulk Uploader</span>
        <button class="cbu-collapse" title="Collapse">−</button>
      </div>
      <div class="cbu-body">
        <label class="cbu-drop-zone" id="cbu-drop-zone">
          <input type="file" id="cbu-file-input" multiple>
          <span class="cbu-drop-text">Click or drag files here</span>
        </label>
        <div id="cbu-file-list" class="cbu-file-list"></div>
        <div id="cbu-status" class="cbu-status" style="display:none"></div>
        <div class="cbu-actions">
          <button id="cbu-clear-btn" class="cbu-btn cbu-btn--ghost" style="display:none">Clear All</button>
          <button id="cbu-upload-btn" class="cbu-btn" disabled>Bulk Upload</button>
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    // Collapse toggle
    let collapsed = false;
    panel.querySelector('.cbu-collapse').addEventListener('click', () => {
      collapsed = !collapsed;
      panel.querySelector('.cbu-body').style.display = collapsed ? 'none' : '';
      panel.querySelector('.cbu-collapse').textContent = collapsed ? '+' : '−';
    });

    // Drag-to-move
    const header = panel.querySelector('.cbu-header');
    let dragging = false, ox = 0, oy = 0;
    header.addEventListener('mousedown', e => {
      if (e.target.classList.contains('cbu-collapse')) return;
      dragging = true;
      ox = e.clientX - panel.offsetLeft;
      oy = e.clientY - panel.offsetTop;
      panel.style.transition = 'none';
    });
    document.addEventListener('mousemove', e => {
      if (!dragging) return;
      panel.style.left   = Math.max(0, Math.min(e.clientX - ox, window.innerWidth  - panel.offsetWidth))  + 'px';
      panel.style.top    = Math.max(0, Math.min(e.clientY - oy, window.innerHeight - panel.offsetHeight)) + 'px';
      panel.style.right  = 'auto';
      panel.style.bottom = 'auto';
    });
    document.addEventListener('mouseup', () => { dragging = false; });

    // File state
    let selectedFiles = [];

    function fileKey(f) { return `${f.name}::${f.size}::${f.lastModified}`; }

    function addFiles(fileList) {
      const existingKeys = new Set(selectedFiles.map(fileKey));
      let dupes = 0;
      for (const f of fileList) {
        if (existingKeys.has(fileKey(f))) { dupes++; continue; }
        selectedFiles.push(f);
        existingKeys.add(fileKey(f));
      }
      if (dupes > 0) showStatus(`${dupes} duplicate${dupes > 1 ? 's' : ''} skipped.`, 'warn');
      renderFileList();
    }

    function renderFileList() {
      const list      = document.getElementById('cbu-file-list');
      const uploadBtn = document.getElementById('cbu-upload-btn');
      const clearBtn  = document.getElementById('cbu-clear-btn');
      list.innerHTML  = '';
      const hasFiles  = selectedFiles.length > 0;
      uploadBtn.disabled     = !hasFiles;
      clearBtn.style.display = hasFiles ? 'block' : 'none';

      selectedFiles.forEach((f, idx) => {
        const row = document.createElement('div');
        row.className = 'cbu-file-row';
        row.innerHTML = `
          <span class="cbu-file-name" title="${f.name}">${f.name}</span>
          <span class="cbu-file-size">${formatBytes(f.size)}</span>
          <button class="cbu-remove" data-idx="${idx}" title="Remove">×</button>
        `;
        list.appendChild(row);
      });

      list.querySelectorAll('.cbu-remove').forEach(b => {
        b.addEventListener('click', e => {
          selectedFiles.splice(+e.target.dataset.idx, 1);
          renderFileList();
        });
      });
    }

    document.getElementById('cbu-file-input').addEventListener('change', e => {
      addFiles(e.target.files);
      e.target.value = '';
    });

    const zone = document.getElementById('cbu-drop-zone');
    zone.addEventListener('dragover',  e => { e.preventDefault(); zone.classList.add('cbu-drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('cbu-drag-over'));
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('cbu-drag-over');
      addFiles(e.dataTransfer.files);
    });

    // Clear All: just reload the page
    document.getElementById('cbu-clear-btn').addEventListener('click', () => {
      location.reload();
    });

    document.getElementById('cbu-upload-btn').addEventListener('click', () => {
      if (!selectedFiles.length) return;
      const btn = document.getElementById('cbu-upload-btn');
      btn.disabled    = true;
      btn.textContent = 'Uploading…';
      showStatus('Syncing with Canvas…', 'info');
      uploadFiles(selectedFiles).finally(() => {
        btn.disabled    = false;
        btn.textContent = 'Bulk Upload';
      });
    });
  }

  function init() {
    const SELECTORS = [
      '#submit_online_upload_form', '#submit_assignment',
      '.submit_assignment_form', 'input[name^="attachments"][type="file"]',
      '.submit_assignment_link', '#sidebar_submit_assignment',
    ];
    const formVisible = () => SELECTORS.some(sel => document.querySelector(sel));
    if (formVisible()) { buildPanel(); return; }
    const obs = new MutationObserver(() => {
      if (formVisible()) { obs.disconnect(); buildPanel(); }
    });
    obs.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => { obs.disconnect(); buildPanel(); }, 2000);
  }

  init();
})();
