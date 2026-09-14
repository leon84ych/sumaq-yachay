export type SheetViewKind = 'definitions' | 'quotes' | 'unsupported';

const DEFINITIONS_NAMES = new Set(['words', 'definitions', 'glossary', 'concepts']);
const QUOTES_NAMES = new Set(['quotes', 'excerpts', 'quote']);

/**
 * Resolves a Domain Data Sheet's tab name to the view kind that should render it.
 * Unrecognized names fall back to 'unsupported' instead of throwing.
 */
export function resolveSheetViewKind(sheetName: string): SheetViewKind {
  const normalized = sheetName.trim().toLowerCase();
  if (DEFINITIONS_NAMES.has(normalized)) return 'definitions';
  if (QUOTES_NAMES.has(normalized)) return 'quotes';
  return 'unsupported';
}
