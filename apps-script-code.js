// ═══════════════════════════════════════════════════════════════
//  Control Financiero — Apps Script Backend
//  Pegar esto en: Extensiones → Apps Script → Code.gs
// ═══════════════════════════════════════════════════════════════

const SS = SpreadsheetApp.getActiveSpreadsheet();
const SHEET_TX   = 'Transacciones';
const SHEET_CATS = 'Categorias';
const TX_HEADERS   = ['id', 'type', 'amount', 'date', 'catId', 'note'];
const CATS_HEADERS = ['id', 'name', 'type', 'color'];

// ── GET: devuelve todos los datos ──────────────────────────────
function doGet(e) {
  try {
    const data = {
      transactions: readSheet(SHEET_TX),
      categories:   readSheet(SHEET_CATS),
    };
    return jsonResponse(data);
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

// ── POST: guarda todos los datos ───────────────────────────────
function doPost(e) {
  try {
    const payload = JSON.parse(e.parameter.data);

    if (payload.action === 'save') {
      writeSheet(SHEET_TX,   payload.transactions || [], TX_HEADERS);
      writeSheet(SHEET_CATS, payload.categories   || [], CATS_HEADERS);
      return jsonResponse({ ok: true, saved: new Date().toISOString() });
    }

    return jsonResponse({ error: 'Acción desconocida' }, 400);
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

// ── Leer hoja → array de objetos ───────────────────────────────
function readSheet(name) {
  let sheet = SS.getSheetByName(name);
  if (!sheet) return [];
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0].map(String);
  return values.slice(1)
    .filter(row => row.some(v => v !== '' && v !== null && v !== undefined))
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i] === undefined ? '' : String(row[i]); });
      return obj;
    });
}

// ── Escribir array de objetos → hoja ──────────────────────────
function writeSheet(name, rows, headers) {
  let sheet = SS.getSheetByName(name);
  if (!sheet) sheet = SS.insertSheet(name);
  sheet.clearContents();

  if (!rows || rows.length === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    applyHeaderStyle(sheet, headers.length);
    return;
  }

  const values = [
    headers,
    ...rows.map(r => headers.map(h => r[h] !== undefined ? r[h] : ''))
  ];
  sheet.getRange(1, 1, values.length, headers.length).setValues(values);
  applyHeaderStyle(sheet, headers.length);
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
}

// ── Estilo cabecera ────────────────────────────────────────────
function applyHeaderStyle(sheet, numCols) {
  const header = sheet.getRange(1, 1, 1, numCols);
  header.setBackground('#1a73e8');
  header.setFontColor('#ffffff');
  header.setFontWeight('bold');
}

// ── Respuesta JSON ─────────────────────────────────────────────
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
