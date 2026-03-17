import { state } from '../store.js';
import { uid, catTypeLabel } from '../utils.js';
import { toast, showConfirm } from '../ui.js';
import { saveData } from '../api.js';

// ─── Render de la cuadrícula de categorías ────────────────────────────────────
export function renderCategories() {
  document.getElementById('catGrid').innerHTML = state.categories.length
    ? state.categories.map(c => `
        <div class="cat-card">
          <div class="cat-sw" style="background:${c.color}"></div>
          <div class="cat-main">
            <div class="cat-name" title="${c.name}">${c.name}</div>
            <div class="cat-badge ${c.type}">${catTypeLabel(c.type)}</div>
          </div>
          <div class="cat-actions">
            <button class="btn-sm" onclick="editCat('${c.id}')" title="Editar">✏</button>
            <button class="btn-sm del" onclick="deleteCatConfirm('${c.id}')" title="Eliminar">✕</button>
          </div>
        </div>`).join('')
    : `<div class="empty-state" style="grid-column:1/-1"><div class="ei">🏷</div>Sin categorías</div>`;
}

// ─── Añadir / editar categoría ────────────────────────────────────────────────
export async function submitCategory() {
  const name  = document.getElementById('catName').value.trim();
  const type  = document.getElementById('catType').value;
  const color = document.getElementById('catColor').value;
  if (!name) { toast('Introduce un nombre', 'error'); return; }

  if (state.editingCatId) {
    const i = state.categories.findIndex(c => c.id === state.editingCatId);
    state.categories[i] = { ...state.categories[i], name, type, color };
    toast('Actualizada ✓', 'success');
    cancelCatEdit();
  } else {
    if (state.categories.find(c => c.name.toLowerCase() === name.toLowerCase())) {
      toast('Ya existe', 'error');
      return;
    }
    state.categories.push({ id: uid(), name, type, color });
    toast('Creada ✓', 'success');
    document.getElementById('catName').value = '';
  }
  await saveData();
  renderCategories();
}

// ─── Poner categoría en modo edición ─────────────────────────────────────────
export function editCat(id) {
  const c = state.categories.find(x => x.id === id);
  if (!c) return;
  state.editingCatId = id;
  document.getElementById('catFormTitle').textContent  = 'Editar categoría';
  document.getElementById('catName').value             = c.name;
  document.getElementById('catType').value             = c.type;
  document.getElementById('catColor').value            = c.color;
  document.getElementById('catSubmit').textContent     = 'Guardar cambios';
  document.getElementById('catCancel').style.display   = '';
  document.getElementById('catName').focus();
}

// ─── Cancelar edición de categoría ───────────────────────────────────────────
export function cancelCatEdit() {
  state.editingCatId = null;
  document.getElementById('catFormTitle').textContent  = 'Nueva categoría';
  document.getElementById('catName').value             = '';
  document.getElementById('catSubmit').textContent     = 'Añadir';
  document.getElementById('catCancel').style.display   = 'none';
}

// ─── Confirmar eliminación de categoría ──────────────────────────────────────
export function deleteCatConfirm(id) {
  const c    = state.categories.find(x => x.id === id);
  if (!c) return;
  const used = state.transactions.filter(t => t.catId === id).length;
  showConfirm(
    'Eliminar categoría',
    used
      ? `"${c.name}" tiene ${used} transacciones. ¿Eliminar igualmente?`
      : `¿Eliminar "${c.name}"?`,
    async () => {
      state.categories = state.categories.filter(x => x.id !== id);
      await saveData();
      renderCategories();
      toast('Eliminada', 'info');
    }
  );
}
