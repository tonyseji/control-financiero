import { state, getCat, amt } from '../store.js';
import { TX_TYPES } from '../store.js';
import { save, normalizeDate, uid, fmt, typeLabel, STORE } from '../utils.js';
import { toast, showConfirm } from '../ui.js';
import { saveData } from '../api.js';
import { renderRecurringList } from './recurring.js';

// ─── Construir pestañas de tipo ───────────────────────────────────────────────
export function buildTypeTabs() {
  document.getElementById('typeTabs').innerHTML = TX_TYPES.map(t =>
    `<button id="tab-${t.id}" class="${t.id === state.formType ? 'active ' + t.cls : ''}" onclick="setFormType('${t.id}')">${t.label}</button>`
  ).join('');
}

// ─── Cambiar tipo activo en el formulario ─────────────────────────────────────
export function setFormType(type) {
  state.formType = type;
  TX_TYPES.forEach(t => {
    const b = document.getElementById('tab-' + t.id);
    if (b) b.className = t.id === type ? 'active ' + t.cls : '';
  });
  document.getElementById('fSubmit').textContent = state.editingTxId
    ? 'Guardar cambios'
    : 'Guardar ' + typeLabel(type).toLowerCase();
  populateFormCats(type);
}

// ─── Poblar selector de categorías según el tipo ──────────────────────────────
export function populateFormCats(type) {
  let cats;
  if (type === 'income') {
    cats = state.categories.filter(c => c.type === 'income' || c.type === 'both');
  } else if (type === 'saving' || type === 'invest') {
    cats = state.categories.filter(c => c.type === 'saving' || c.type === 'invest' || c.type === 'both');
  } else {
    cats = state.categories.filter(c => c.type === 'expense' || c.type === 'expense_var' || c.type === 'both');
  }
  if (!cats.length) cats = state.categories;
  document.getElementById('fCatSel').innerHTML = cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

// ─── Resetear formulario ──────────────────────────────────────────────────────
export function resetForm() {
  state.editingTxId = null;
  state.formType    = 'expense';
  document.getElementById('formTitle').textContent = 'Añadir transacción';
  document.getElementById('fAmount').value         = '';
  document.getElementById('fDate').value           = new Date().toISOString().split('T')[0];
  document.getElementById('fNote').value           = '';
  document.getElementById('fCancel').style.display = 'none';
  const fr = document.getElementById('fRecurring');
  if (fr) fr.checked = false;
  const ro = document.getElementById('recurringOpts');
  if (ro) ro.style.display = 'none';
  buildTypeTabs();
  populateFormCats('expense');
}

// ─── Editar transacción existente ─────────────────────────────────────────────
export function editTx(id) {
  const t = state.transactions.find(x => x.id === id);
  if (!t) return;
  state.editingTxId = id;
  state.formType    = t.type || 'expense';
  document.getElementById('formTitle').textContent  = 'Editar transacción';
  document.getElementById('fSubmit').textContent    = 'Guardar cambios';
  document.getElementById('fCancel').style.display  = '';
  buildTypeTabs();
  populateFormCats(t.type);
  document.getElementById('fAmount').value  = t.amount;
  document.getElementById('fDate').value    = t.date;
  document.getElementById('fCatSel').value  = t.catId;
  document.getElementById('fNote').value    = t.note || '';
  // Ir a la vista de añadir
  window.showView('add');
}

// ─── Cancelar edición ─────────────────────────────────────────────────────────
export function cancelEdit() {
  resetForm();
  window.showView('transactions');
}

// ─── Enviar formulario ────────────────────────────────────────────────────────
export async function submitForm() {
  const amount = parseFloat(document.getElementById('fAmount').value);
  const date   = document.getElementById('fDate').value;
  const catId  = document.getElementById('fCatSel').value;
  const note   = document.getElementById('fNote').value.trim();

  if (!amount || amount <= 0) { toast('Introduce una cantidad válida', 'error'); return; }
  if (!date)   { toast('Selecciona una fecha', 'error'); return; }
  if (!catId)  { toast('Selecciona una categoría', 'error'); return; }

  const isRecurring = document.getElementById('fRecurring')?.checked && !state.editingTxId;

  if (state.editingTxId) {
    const i = state.transactions.findIndex(t => t.id === state.editingTxId);
    state.transactions[i] = { ...state.transactions[i], amount, date, catId, note, type: state.formType };
    state.editingTxId = null;
    await saveData();
    toast('Actualizado ✓', 'success');
    window.showView('transactions');
  } else {
    state.transactions.push({ id: uid(), type: state.formType, amount, date, catId, note });
    if (isRecurring) {
      const day     = parseInt(document.getElementById('fRecDay')?.value) || 1;
      const name    = document.getElementById('fRecName')?.value.trim() || note || getCat(catId).name;
      const curKey  = normalizeDate(date).substring(0, 7);
      state.recurring.push({
        id: uid(), type: state.formType, amount, catId, note, name,
        dayOfMonth: day, active: true, lastGenerated: curKey,
      });
      save(STORE.RECURRING, state.recurring);
      renderRecurringList();
      toast('Guardado + recurrente creado ✓', 'success');
    } else {
      toast('Guardado ✓', 'success');
    }
    await saveData();
    resetForm();
  }
}

// ─── Toggle opciones de recurrente ────────────────────────────────────────────
export function toggleRecurringOpts() {
  const on = document.getElementById('fRecurring').checked;
  document.getElementById('recurringOpts').style.display = on ? 'block' : 'none';
}

// ─── Confirmar eliminación de transacción ─────────────────────────────────────
export function deleteTxConfirm(id) {
  const t   = state.transactions.find(x => x.id === id);
  if (!t) return;
  const cat = getCat(t.catId);
  showConfirm(
    'Eliminar transacción',
    `¿Eliminar ${typeLabel(t.type).toLowerCase()} de ${fmt(amt(t))} en "${cat.name}" del ${new Date(t.date + 'T12:00:00').toLocaleDateString('es-ES')}?`,
    async () => {
      state.transactions = state.transactions.filter(x => x.id !== id);
      await saveData();
      // refrescar la vista activa
      const v = document.querySelector('.view.active')?.id?.replace('view-', '');
      if (v === 'transactions') {
        const { renderTransactions } = await import('./transactions.js');
        renderTransactions();
      } else {
        window.dispatchEvent(new CustomEvent('cf:datachanged'));
      }
      toast('Eliminado', 'info');
    }
  );
}
