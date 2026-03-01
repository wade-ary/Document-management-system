/**
 * Table Processing Utilities
 * Contains functions for parsing and processing document tables
 */

import API_BASE_URL from '../../../config/api';

export interface TableFull {
  page_number?: number;
  table_id?: string;
  method?: string;
  csv_uri?: string;
  rows?: string[][];
  bbox?: unknown;
  csv_rows?: string[][];
}

/**
 * CSV/TSV/pipe parser with delimiter detection and basic quote support
 */
export const parseCSV = (text: string): string[][] => {
  const lines = text.replace(/\r/g, '').split('\n');
  const delims: Array<',' | ';' | '\t' | '|'> = [',', ';', '\t', '|'];
  
  const parseWith = (d: string, lns: string[]): string[][] => {
    if (d === ',' || d === ';') {
      // quoted parser for comma/semicolon
      const rows: string[][] = [];
      for (const ln of lns) {
        const row: string[] = [];
        let cell = '';
        let i = 0;
        let inQuotes = false;
        while (i < ln.length) {
          const ch = ln[i];
          if (inQuotes) {
            if (ch === '"') {
              if (i + 1 < ln.length && ln[i + 1] === '"') {
                cell += '"';
                i += 2;
              } else {
                inQuotes = false;
                i++;
              }
            } else {
              cell += ch;
              i++;
            }
          } else {
            if (ch === '"') { inQuotes = true; i++; }
            else if (ch === d) { row.push(cell); cell = ''; i++; }
            else { cell += ch; i++; }
          }
        }
        row.push(cell);
        rows.push(row.map(c => c.trim()));
      }
      // remove potential trailing empty row
      if (rows.length > 0 && rows[rows.length - 1].every(c => c === '')) rows.pop();
      return rows;
    } else {
      // simple split for tab/pipe
      const rows = lns.map(ln => ln.split(d).map(c => c.trim()));
      if (rows.length > 0 && rows[rows.length - 1].every(c => c === '')) rows.pop();
      return rows;
    }
  };

  const score = (rows: string[][]): number => {
    if (!rows.length) return 0;
    const counts = rows.map(r => r.filter(c => c !== '').length);
    const avg = counts.reduce((a,b)=>a+b,0) / counts.length;
    const multi = counts.filter(c => c >= 2).length;
    return avg + multi; // prefer more columns and more multi-cell lines
  };

  let bestRows: string[][] = [];
  let bestScore = -1;
  for (const d of delims) {
    const parsed = parseWith(d, lines);
    const sc = score(parsed);
    if (sc > bestScore) { bestRows = parsed; bestScore = sc; }
  }
  return bestRows;
};

/**
 * Utilities for choosing the best table representation and shaping header/body
 */
// const _hasLetters = (s: string) => /[A-Za-z]/.test(s);
const _isMostlyNumeric = (s: string) => s !== '' && /^(?:[\d\s.,:\-\/()%]+)$/.test(s);
// const _nonEmptyCount = (row: string[]) => row.filter(c => (c || '').trim() !== '').length;

const _mode = (arr: number[]) => {
  const freq = new Map<number, number>();
  for (const n of arr) freq.set(n, (freq.get(n) || 0) + 1);
  let best = arr[0] || 0, bestC = -1;
  for (const [k, v] of freq) { if (v > bestC) { best = k; bestC = v; } }
  return best;
};

// const _scoreRows = (rows: string[][]): {score: number; colCount: number} => {
//   if (!rows || rows.length === 0) return { score: 0, colCount: 0 };
//   const lengths = rows.map(r => r.length);
//   const colMode = _mode(lengths.filter(l => l >= 2));
//   const multiRows = rows.filter(r => _nonEmptyCount(r) >= Math.max(2, colMode)).length;
//   return { score: multiRows * 10 + colMode, colCount: colMode || Math.max(...lengths) };
// };

const _dropIndexColumn = (rows: string[][]): string[][] => {
  if (!rows || rows.length === 0) return rows;
  const colN = Math.max(...rows.map(r => r.length));
  if (colN <= 1) return rows;
  // Gather column 0 stats
  const col0 = rows.map(r => (r[0] || '').trim());
  const emptyRatio = col0.filter(c => c === '').length / col0.length;
  const numericRatio = col0.filter(c => _isMostlyNumeric(c)).length / col0.length;
  const header0 = (rows[0][0] || '').toLowerCase();
  const looksIndexHeader = header0 === '' || header0.includes('index') || header0.includes('unnamed');
  if (looksIndexHeader || emptyRatio > 0.5 || numericRatio > 0.8) {
    return rows.map(r => r.slice(1));
  }
  return rows;
};

/**
 * Build a structured table from compact preview strings (pipe-delimited)
 */
export const buildFromPreviewLines = (lines: string[] | undefined) => {
  if (!lines || lines.length === 0) return { header: [] as string[], body: [] as string[][], colCount: 0 };
  
  const cleaned = lines
    .map(l => (l || '').trim())
    .filter(l => l !== '' && !/^-{3,}$/.test(l) && !/^Page\s*\d+\s*:?.*/i.test(l));
  const splitted = cleaned.map(l => l.split('|').map(c => c.trim()).filter(c => c !== ''));
  const valid = splitted.filter(r => r.length >= 2);
  if (valid.length === 0) return { header: [], body: [], colCount: 0 };
  
  const counts = valid.map(r => r.length);
  const colMode = _mode(counts);
  const normalized = valid.map(r => {
    const out = Array.from({ length: colMode }).map((_, i) => r[i] || '');
    return out;
  });
  
  const headerCand = normalized[0];
  const nonNumericHead = headerCand.filter(c => c && /[A-Za-z]/.test(c) && !/^(?:[\d\s.,:\-\/()%]+)$/.test(c)).length;
  const headerIsReal = nonNumericHead >= Math.ceil(Math.max(2, colMode) / 2);
  const header = headerIsReal ? headerCand : Array.from({ length: colMode }).map((_, i) => `Column ${i + 1}`);
  const body = headerIsReal ? normalized.slice(1) : normalized;
  
  return { header, body, colCount: colMode };
};

/**
 * Get best processed rows from a table (CSV preferred), sanitized and with index column dropped
 */
export const getProcessedRows = (t: TableFull): string[][] => {
  const clean = (val: unknown) => {
    if (val == null) return '';
    const s = String(val);
    return s.replace(/^\s*Page\s*\d+\s*:\s*/i, '').replace(/\s*\n\s*/g, ' ').replace(/\s+/g, ' ').trim();
  };
  
  let rows: string[][] = [];
  if (t.csv_rows && t.csv_rows.length) {
    rows = t.csv_rows.map(r => r.map(c => (c ?? '').trim()));
  } else if (t.rows && t.rows.length) {
    rows = t.rows.map(r => (Array.isArray(r) ? r.map(clean) : []));
  }
  
  // drop empty rows
  rows = rows.filter(r => r.some(c => c && c.length > 0));
  
  // drop noisy paragraph-like single cell rows
  const noisy = (r: string[]) => {
    const nonEmpty = r.filter(c => c && c.length > 0);
    const longest = nonEmpty.reduce((m, c) => Math.max(m, c.length), 0);
    return nonEmpty.length <= 1 && longest > 40;
  };
  rows = rows.filter(r => !noisy(r));
  rows = _dropIndexColumn(rows);
  return rows;
};

/**
 * Build a unified table from multiple fragments and optional preview
 */
export const buildUnifiedTable = (tables: TableFull[] | null, previewLines: string[] | undefined) => {
  const allCsvLinks: string[] = (tables || []).map(t => t.csv_uri ? `${API_BASE_URL}${t.csv_uri}` : '').filter(Boolean) as string[];
  
  // 1) Prefer preview when it already forms a good grid
  const prv = buildFromPreviewLines(previewLines);
  const previewGood = prv.colCount >= 3 && (prv.body.length >= 2 || prv.header.length >= 3);
  if (previewGood) return { header: prv.header, body: prv.body, colCount: prv.colCount, csvLinks: allCsvLinks };

  // 2) Otherwise, pick the best single fragment (don't merge) to avoid column drift
  const processed = (tables || []).map(t => ({ rows: getProcessedRows(t), csv: t.csv_uri ? `${API_BASE_URL}${t.csv_uri}` : '' }));
  const candidates = processed.filter(p => p.rows && p.rows.length > 0);
  if (candidates.length === 0) return { header: [], body: [], colCount: 0, csvLinks: [] };
  
  const scored = candidates.map(p => ({
    p,
    colN: Math.max(...p.rows.map(r => r.length)),
    bodyLen: p.rows.length,
  }));
  scored.sort((a, b) => (b.bodyLen * 10 + b.colN) - (a.bodyLen * 10 + a.colN));
  
  const chosen = scored[0];
  const rows = chosen.p.rows;
  const colN = Math.max(...rows.map(r => r.length));
  
  // header inference
  const first = rows[0] || [];
  const headerishCells = first.filter(c => c && /[A-Za-z]/.test(c) && !/^(?:[\d\s.,:\-\/()%]+)$/.test(c)).length;
  const looksHeader = headerishCells >= Math.ceil(Math.max(2, colN) / 2);
  let header = looksHeader ? first : Array.from({ length: colN }).map((_, i) => `Column ${i + 1}`);
  
  // sensible defaults for known shapes
  if (!looksHeader && (colN === 4)) header = ['S. No.', 'Team ID', 'Team Name', 'Name of the Team Leader'];
  if (!looksHeader && (colN === 3)) header = ['Team ID', 'Team Name', 'Team Leader'];
  
  const body = looksHeader ? rows.slice(1) : rows;
  const csvLinks = chosen.p.csv ? [chosen.p.csv] : [];
  
  return { header, body, colCount: colN, csvLinks };
};