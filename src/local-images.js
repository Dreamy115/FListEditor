/* Browser-local preview overrides. F-List BBCode always keeps its numeric IDs. */
(() => {
  'use strict';
  const records = new Map();
  let revision = 0;
  const $ = id => document.getElementById(id);
  const status = message => { $('localImageStatus').textContent = message; };
  $('manageImageMappings').addEventListener('click', () => $('localImagePanel').showModal());
  $('manageInlineImageMappings').addEventListener('click', () => $('localImagePanel').showModal());
  $('closeImageMappings').addEventListener('click', () => $('localImagePanel').close());
  $('localImagePanel').addEventListener('close', () => {
    if ($('inlineImagePicker').open) renderMappedChoices();
  });
  let pickerResolve = null;
  function finishPick(id) {
    const resolve = pickerResolve; pickerResolve = null;
    $('inlineImagePicker').close(); resolve?.(id);
  }
  $('cancelInlineImage').addEventListener('click', () => finishPick(null));
  $('inlineImagePicker').addEventListener('close', () => {
    const resolve = pickerResolve; pickerResolve = null; resolve?.(null);
  });
  $('customInlineImageForm').addEventListener('submit', event => {
    event.preventDefault();
    const id = $('customInlineImageId').value.trim();
    if (!/^[1-9]\d{0,19}$/.test(id)) {
      $('inlineImagePickerStatus').textContent = 'Enter a positive numeric F-List image ID (up to 20 digits).';
      $('customInlineImageId').setAttribute('aria-invalid', 'true'); return;
    }
    finishPick(id);
  });
  async function pick() {
    await ready;
    $('customInlineImageId').value = '';
    $('customInlineImageId').removeAttribute('aria-invalid');
    $('inlineImagePickerStatus').textContent = '';
    renderMappedChoices();
    return new Promise(resolve => { pickerResolve = resolve; $('inlineImagePicker').showModal(); });
  }
  function renderMappedChoices() {
    const list = $('mappedImageChoices'); list.replaceChildren();
    for (const record of records.values()) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'mapped-image-choice';
      const image = document.createElement('img'); image.src = record.url; image.alt = ''; image.loading = 'lazy';
      const label = document.createElement('span');
      const id = document.createElement('strong'); id.textContent = record.alias ? record.alias + ' (#' + record.id + ')' : '#' + record.id;
      const name = document.createElement('span'); name.textContent = record.name;
      label.append(id, name); button.append(image, label);
      button.setAttribute('aria-label', 'Insert F-List image ' + record.id);
      button.addEventListener('click', () => finishPick(record.id)); list.append(button);
    }
    if (!records.size) {
      const empty = document.createElement('p'); empty.textContent = 'No mapped images yet. Enter a custom ID below, or add preview images using Image mappings.'; list.append(empty);
    }
  }
  function openMapping(id, macroAlias = '') {
    const record = records.get(id);
    $('localImageId').value = id;
    $('localImageUrl').value = record?.kind === 'url' ? record.url : '';
    $('localImageAlias').value = record?.alias || macroAlias;
    status(record
      ? 'Editing #' + id + '. Attach a new file or URL to replace its preview. Source code will not change.'
      : 'Attach a preview image to #' + id + '. Source code will not change.');
    if (!$('localImagePanel').open) $('localImagePanel').showModal();
    $('localImagePanel').scrollTop = 0;
    $(record?.kind === 'url' ? 'localImageUrl' : 'attachLocalImage').focus();
  }
  function previewShortcut(event) {
    const image = event.target.closest('[data-local-inline-id]');
    if (!image || (event.type === 'keydown' && !['Enter', ' '].includes(event.key))) return;
    event.preventDefault(); event.stopPropagation();
    openMapping(image.dataset.localInlineId, image.dataset.inlineAlias || '');
  }
  $('preview').addEventListener('click', previewShortcut);
  $('preview').addEventListener('keydown', previewShortcut);
  const database = new Promise((resolve, reject) => {
    const request = indexedDB.open('folio-local-images', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('images', {keyPath:'id'});
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  async function storage(operation) {
    const db = await database;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('images', 'readwrite');
      const request = operation(transaction.objectStore('images'));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error || Error('Storage operation aborted'));
    });
  }
  function changed() {
    revision++;
    const list = $('localImageList'); list.replaceChildren();
    if (!records.size) {
      const row = document.createElement('tr');
      const empty = document.createElement('td'); empty.colSpan = 5; empty.className = 'local-image-empty';
      empty.textContent = 'No image mappings yet. Enter an ID and attach a file or URL above.'; row.append(empty); list.append(row);
    }
    for (const record of records.values()) {
      const row = document.createElement('tr');
      const id = document.createElement('th'); id.scope = 'row'; id.textContent = '#' + record.id;
      const type = document.createElement('td'); type.textContent = record.kind === 'file' ? 'Local file' : 'Remote URL';
      const alias = document.createElement('td'); alias.className = 'local-image-alias'; alias.textContent = record.alias || '—';
      const label = document.createElement('td'); label.className = 'local-image-source'; label.textContent = record.name; label.title = record.name;
      const edit = document.createElement('button'); edit.type = 'button'; edit.className = 'btn'; edit.textContent = 'Edit';
      edit.setAttribute('aria-label', 'Edit preview attachment for image ' + record.id);
      edit.addEventListener('click', () => openMapping(record.id));
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'btn'; remove.textContent = 'Remove';
      remove.setAttribute('aria-label', 'Remove preview attachment for image ' + record.id);
      remove.addEventListener('click', async () => {
        remove.disabled = true;
        try { await storage(store => store.delete(record.id)); records.delete(record.id); changed(); status('Preview attachment removed. F-List ID unchanged.'); }
        catch (_) { remove.disabled = false; status('Could not remove attachment: browser storage unavailable.'); }
      });
      const actions = document.createElement('div'); actions.className = 'local-image-row-actions'; actions.append(edit, remove);
      const actionCell = document.createElement('td'); actionCell.append(actions);
      row.append(id, alias, type, label, actionCell); list.append(row);
    }
    document.dispatchEvent(new Event('folio-images-changed'));
  }
  function imageId() {
    const id = $('localImageId').value.trim();
    if (!/^[1-9]\d{0,19}$/.test(id)) throw Error('Enter a positive numeric F-List image ID (up to 20 digits).');
    return id;
  }
  async function save(record) {
    await storage(store => store.put(record));
    records.set(record.id, record); changed();
    status('Preview attached to #' + record.id + '. Saved only in this browser; nothing uploaded to F-List.');
  }
  let busy = false;
  async function attach(action) {
    if (busy) return;
    busy = true; $('saveImageAlias').disabled = $('attachLocalImage').disabled = $('attachImageUrl').disabled = true;
    try { await ready; await action(); }
    catch (error) { status(error.message || 'Could not save attachment: browser storage unavailable or full.'); }
    finally { busy = false; $('saveImageAlias').disabled = $('attachLocalImage').disabled = $('attachImageUrl').disabled = false; }
  }
  $('localImageId').addEventListener('input', () => { $('localImageAlias').value = records.get($('localImageId').value.trim())?.alias || ''; });
  $('saveImageAlias').addEventListener('click', () => attach(async () => {
    const id = imageId(), record = records.get(id);
    if (!record) throw Error('Attach a file or URL first to create a mapping for this ID.');
    await save({...record, alias:$('localImageAlias').value});
    status('Alias saved for #' + id + '. Existing source code is unchanged.');
  }));
  $('attachLocalImage').addEventListener('click', () => {
    try { imageId(); $('localImageFile').click(); } catch (error) { status(error.message); }
  });
  $('localImageFile').addEventListener('change', event => {
    const file = event.target.files[0]; event.target.value = ''; if (!file) return;
    attach(async () => {
      const id = imageId(), alias = $('localImageAlias').value;
      if (!['image/png','image/jpeg','image/gif','image/webp'].includes(file.type)) throw Error('Choose a PNG, JPEG, GIF or WebP image.');
      if (file.size > 8 * 1024 * 1024) throw Error('Choose an image smaller than 8 MB.');
      const url = await new Promise((resolve, reject) => {
        const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(Error('Could not read image.')); reader.readAsDataURL(file);
      });
      const image = new Image(); image.src = url;
      try { await image.decode(); } catch (_) { throw Error('This file could not be decoded as an image.'); }
      await save({id, name:file.name, kind:'file', url, alias});
    });
  });
  $('attachImageUrl').addEventListener('click', () => attach(async () => {
    const id = imageId(); let url;
    try { url = new URL($('localImageUrl').value.trim()); } catch (_) { throw Error('Enter a complete HTTP or HTTPS image URL.'); }
    if (!['http:','https:'].includes(url.protocol) || url.username || url.password) throw Error('Use an HTTP or HTTPS image URL without embedded credentials.');
    await save({id, name:url.href, kind:'url', url:url.href, alias:$('localImageAlias').value});
    status('URL attached to #' + id + '. Only the mapping is saved locally; loading the image contacts its host.');
  }));
  const ready = storage(store => store.getAll()).then(saved => {
    for (const record of saved) {
      if (/^[1-9]\d{0,19}$/.test(record.id) && typeof record.url === 'string' && typeof record.name === 'string' &&
          ((record.kind === 'file' && /^data:image\/(png|jpeg|gif|webp);base64,/.test(record.url)) ||
           (record.kind === 'url' && /^https?:\/\//i.test(record.url)))) records.set(record.id, {...record, alias:typeof record.alias === 'string' ? record.alias : ''});
    }
    changed();
  }).catch(() => { status('Browser image storage is unavailable. Attachments cannot be saved here.'); });
  globalThis.FolioLocalImages = {
    get: id => records.get(id), get revision() { return revision; }, ready, pick,
    clear: async () => { await ready; await storage(store => store.clear()); records.clear(); changed(); status('All preview attachments removed.'); }
  };
})();
