/** localStorage accounting uses two bytes per UTF-16 code unit, including keys.
 * Browsers can account differently; successful writes remain the authority.
 * navigator.storage.estimate() covers other storage and is not a localStorage quota.
 */
let capacity: number | undefined;
let lowerBound = false;

export function storageBytes(): number {
  let bytes = 0;
  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index);
    if (key !== null) bytes += 2 * (key.length + (localStorage.getItem(key)?.length ?? 0));
  }
  return bytes;
}

function measureCapacity(): number {
  const used = storageBytes();
  let key = 'folio-storage-probe';
  while (localStorage.getItem(key) !== null) key += '-';
  let low = 0;
  let high = 1024;
  // Bound temporary allocation to 32 MiB. If this fits, report a lower bound.
  const maximum = 16 * 1024 * 1024;
  const fits = (length: number) => {
    try {
      localStorage.setItem(key, '0'.repeat(length));
      return true;
    } catch (error) {
      if (
        typeof error !== 'object' ||
        error === null ||
        !('name' in error) ||
        error.name !== 'QuotaExceededError'
      )
        throw error;
      return false;
    }
  };
  try {
    while (high < maximum && fits(high)) {
      low = high;
      high *= 2;
    }
    if (high === maximum && fits(high)) {
      lowerBound = true;
      low = high;
    } else {
      while (high - low > 1) {
        const middle = Math.floor((low + high) / 2);
        if (fits(middle)) low = middle;
        else high = middle;
      }
    }
    return used + (low ? 2 * (key.length + low) : 0);
  } finally {
    localStorage.removeItem(key);
  }
}

export function updateStorageUsage(remeasure = false): void {
  const element = document.getElementById('storageUsage');
  if (!element) return;
  try {
    if (remeasure || capacity === undefined) {
      lowerBound = false;
      capacity = measureCapacity();
    }
    const used = storageBytes();
    const format = (bytes: number) => bytes.toLocaleString() + ' B';
    element.textContent = `Local storage (estimate): ${format(used)} used · ${lowerBound ? 'at least ' : ''}${format(Math.max(0, capacity - used))} remaining`;
    element.title =
      'Measured UTF-16 storage estimate for this site, including other localStorage keys. Browser writes determine the actual limit. Image attachments use separate storage. Click to remeasure.';
    element.onclick = () => updateStorageUsage(true);
  } catch {
    element.textContent = 'Local storage usage unavailable';
  }
}

/** Atomic setItem preserves the previous saved value when a write is rejected. */
export function writeStoredData(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    updateStorageUsage();
    return true;
  } catch {
    updateStorageUsage(true);
    return false;
  }
}
