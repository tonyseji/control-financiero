import { state } from './store.js';
import { save, normalizeDate, hhmm, uid, STORE } from './utils.js';
import { toast, setSyncStatus } from './ui.js';

// ─── URL del Apps Script ──────────────────────────────────────────────────────
export let API_URL = localStorage.getItem('cf_api_url') || '';

// ─── Sincronización desde Sheets (GET) ───────────────────────────────────────
export async function syncFromSheets() {
  if (!API_URL) { setSyncStatus('none'); return; }
  setSyncStatus('syncing');
  try {
    const res = await fetch(API_URL, { cache: 'no-store' });
    const d   = await res.json();
    if (d.error) throw new Error(d.error);
    if (d.categories && d.categories.length) {
      state.categories = d.categories;
      save(STORE.CATS, state.categories);
    }
    if (d.transactions) {
      state.transactions = d.transactions.map(t => ({
        ...t, amount: parseFloat(t.amount) || 0, date: normalizeDate(t.date),
      }));
      save(STORE.TX, state.transactions);
    }
    setSyncStatus('ok', 'Sincronizado ' + hhmm());
    window.dispatchEvent(new CustomEvent('cf:datachanged'));
  } catch (e) {
    setSyncStatus('error', 'Error de sync');
    console.error(e);
  }
}

// ─── Sincronización hacia Sheets (POST) ──────────────────────────────────────
async function syncToSheets() {
  if (!API_URL) return;
  setSyncStatus('syncing');
  try {
    await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'data=' + encodeURIComponent(JSON.stringify({
        action: 'save',
        transactions: state.transactions,
        categories:   state.categories,
      })),
    });
    setSyncStatus('ok', 'Guardado ' + hhmm());
  } catch (e) {
    setSyncStatus('error', 'Error al guardar');
  }
}

// ─── Guardar local + sync remoto ──────────────────────────────────────────────
export async function saveData() {
  save(STORE.CATS, state.categories);
  save(STORE.TX,   state.transactions);
  await syncToSheets();
}

// ─── Guardar URL del Apps Script ──────────────────────────────────────────────
export function saveApiUrl() {
  const v = document.getElementById('apiUrlInput').value.trim();
  if (!v || !v.startsWith('https://script.google.com')) {
    toast('URL no válida de Apps Script', 'error');
    return;
  }
  API_URL = v;
  save('cf_api_url', API_URL);
  document.getElementById('setupBanner').style.display = 'none';
  toast('URL guardada, conectando…', 'success');
  syncFromSheets();
}

export function forceSyncFromSheets() {
  if (!API_URL) { toast('Configura la URL primero', 'info'); return; }
  syncFromSheets();
}

// ─── Exportar / Importar JSON ─────────────────────────────────────────────────
export function exportData() {
  const blob = new Blob(
    [JSON.stringify({ version: 1, exported: new Date().toISOString(), categories: state.categories, transactions: state.transactions }, null, 2)],
    { type: 'application/json' }
  );
  const a = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = `control-financiero-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast('Exportado', 'success');
}

export async function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async ev => {
    try {
      const d = JSON.parse(ev.target.result);
      if (!d.categories || !d.transactions) throw 0;
      state.categories   = d.categories;
      state.transactions = d.transactions.map(t => ({
        ...t, amount: parseFloat(t.amount) || 0, date: normalizeDate(t.date),
      }));
      await saveData();
      window.dispatchEvent(new CustomEvent('cf:datachanged'));
      toast(`Importados ${state.transactions.length} movimientos ✓`, 'success');
    } catch {
      toast('JSON no válido', 'error');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}
