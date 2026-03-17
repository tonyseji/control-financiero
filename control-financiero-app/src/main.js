import { state } from './store.js';
import { save, STORE } from './utils.js';
import { toast, setSyncStatus, closeConfirm, confirmAction } from './ui.js';
import { API_URL, syncFromSheets, syncToSheets, saveApiUrl, forceSyncFromSheets, exportData, importData } from './api.js';
import { setChartPeriod, changeChartYear } from './charts.js';
import { renderDashboard, updateMonthLabels } from './views/dashboard.js';
import { populateCatFilter, renderTransactions } from './views/transactions.js';
import { resetForm, buildTypeTabs, setFormType, populateFormCats, editTx,
         cancelEdit, submitForm, deleteTxConfirm, toggleRecurringOpts } from './views/add-form.js';
import { renderBudgetView, saveBudgets, saveSettings, updateBudgetTotal } from './views/budget.js';
import { renderCategories, submitCategory, editCat, cancelCatEdit, deleteCatConfirm,
         renderAccounts, submitAccount, editAcc, cancelAccEdit, deleteAccConfirm } from './views/categories.js';
import { initRecurring, renderRecurringList, toggleRecurringActive, deleteRecurringConfirm } from './views/recurring.js';
import { openGlobalSearch, closeGlobalSearch, renderSearchResults } from './views/search.js';

// ─── Navegación entre vistas ──────────────────────────────────────────────────
export function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-desktop button, .nav-mobile button').forEach(b => b.classList.remove('active'));
  document.getElementById('view-' + name).classList.add('active');

  const map = { dashboard: 0, transactions: 1, add: 2, budget: 3, categories: 4 };
  if (map[name] !== undefined) {
    document.querySelectorAll('.nav-desktop button')[map[name]]?.classList.add('active');
    document.querySelectorAll('.nav-mobile button')[map[name]]?.classList.add('active');
  }

  if (name === 'dashboard')    renderDashboard();
  if (name === 'transactions') { populateCatFilter(); renderTransactions(); }
  if (name === 'add')          { if (!state.editingTxId) resetForm(); renderRecurringList(); }
  if (name === 'budget')       renderBudgetView();
  if (name === 'categories')   { renderCategories(); renderAccounts(); }
}

// ─── Re-render de la vista activa ─────────────────────────────────────────────
export function renderCurrentView() {
  const v = document.querySelector('.view.active')?.id?.replace('view-', '');
  if (v) showView(v);
  else renderDashboard();
}

// ─── Toggle banner de configuración de URL ───────────────────────────────────
export function toggleSetupBanner() {
  const banner = document.getElementById('setupBanner');
  const input  = document.getElementById('apiUrlInput');
  const isHidden = banner.style.display === 'none';
  banner.style.display = isHidden ? 'flex' : 'none';
  if (isHidden && input) {
    input.value = API_URL || '';
    setTimeout(() => input.focus(), 80);
  }
}

// ─── Navegación mensual ───────────────────────────────────────────────────────
export function changeMonth(d) {
  state.curM += d;
  if (state.curM < 0)  { state.curM = 11; state.curY--; }
  if (state.curM > 11) { state.curM = 0;  state.curY++; }
  updateMonthLabels();
  const v = document.querySelector('.view.active')?.id?.replace('view-', '');
  if (v === 'dashboard')    renderDashboard();
  if (v === 'transactions') renderTransactions();
  if (v === 'budget')       renderBudgetView();
}

// ─── Exponer todo al scope global (necesario para los onclick= del HTML) ──────
window.showView              = showView;
window.changeMonth           = changeMonth;
window.toggleSetupBanner     = toggleSetupBanner;
window.saveApiUrl            = saveApiUrl;
window.syncToSheets          = syncToSheets;
window.forceSyncFromSheets   = forceSyncFromSheets;
window.exportData            = exportData;
window.importData            = importData;
window.openGlobalSearch      = openGlobalSearch;
window.closeGlobalSearch     = closeGlobalSearch;
window.renderSearchResults   = renderSearchResults;
window.setChartPeriod        = setChartPeriod;
window.changeChartYear       = changeChartYear;
window.renderTransactions    = renderTransactions;
window.editTx                = editTx;
window.deleteTxConfirm       = deleteTxConfirm;
window.setFormType           = setFormType;
window.toggleRecurringOpts   = toggleRecurringOpts;
window.submitForm            = submitForm;
window.cancelEdit            = cancelEdit;
window.saveSettings          = saveSettings;
window.saveBudgets           = saveBudgets;
window.updateBudgetTotal     = updateBudgetTotal;
window.submitCategory        = submitCategory;
window.editCat               = editCat;
window.cancelCatEdit         = cancelCatEdit;
window.deleteCatConfirm      = deleteCatConfirm;
window.submitAccount         = submitAccount;
window.editAcc               = editAcc;
window.cancelAccEdit         = cancelAccEdit;
window.deleteAccConfirm      = deleteAccConfirm;
window.toggleRecurringActive = toggleRecurringActive;
window.deleteRecurringConfirm= deleteRecurringConfirm;
window.closeConfirm          = closeConfirm;
window.confirmAction         = confirmAction;

// ─── Escuchar evento de datos cambiados (api.js lo dispara) ──────────────────
window.addEventListener('cf:datachanged', () => renderCurrentView());

// ─── Inicialización ───────────────────────────────────────────────────────────
if (API_URL) {
  document.getElementById('setupBanner').style.display = 'none';
  document.getElementById('apiUrlInput').value         = API_URL;
} else {
  setSyncStatus('none', 'Sin configurar');
}

updateMonthLabels();
renderDashboard();
initRecurring();
if (API_URL) syncFromSheets();
