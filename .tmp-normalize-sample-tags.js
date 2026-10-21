const fs = require('node:fs');
const path = require('node:path');

const sampleDirectory = path.join(process.cwd(), 'public', 'sample');
const files = fs
  .readdirSync(sampleDirectory)
  .filter((name) => /^book-(?:es-)?\d+\.json$/.test(name))
  .sort();

function collectTags(value) {
  const values = Array.isArray(value) ? value : value === undefined || value === null ? [] : [value];
  return values.flatMap((item) =>
    String(item)
      .split(/[\s,;]+/)
      .map((tag) => tag.trim().replace(/^#+/, '').toLocaleLowerCase())
      .filter(Boolean)
      .map((tag) => `#${tag}`),
  );
}

function normalizeValue(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeValue);
  }
  if (!value || typeof value !== 'object') {
    return value;
  }

  for (const key of Object.keys(value)) {
    value[key] = normalizeValue(value[key]);
  }

  const singular = value.tag ?? value.Tag;
  const plural = value.tags ?? value.Tags;
  if (singular !== undefined || plural !== undefined) {
    value.tags = [...new Set([...collectTags(plural), ...collectTags(singular)])];
    delete value.tag;
    delete value.Tag;
    delete value.Tags;
  }

  return value;
}

function formatValue(value, depth = 0) {
  const indent = '  '.repeat(depth);
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    if (value.every((item) => item === null || typeof item !== 'object')) {
      return `[${value.map((item) => JSON.stringify(item)).join(', ')}]`;
    }
    return `[
${value
      .map((item) => `${indent}  ${formatValue(item, depth + 1)}`)
      .join(',\n')}
${indent}]`;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length === 0) return '{}';
    return `{
${entries
      .map(([key, item]) => `${indent}  ${JSON.stringify(key)}: ${formatValue(item, depth + 1)}`)
      .join(',\n')}
${indent}}`;
  }
  return JSON.stringify(value);
}

for (const file of files) {
  const filePath = path.join(sampleDirectory, file);
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const normalized = normalizeValue(parsed);
  fs.writeFileSync(filePath, `${formatValue(normalized)}\n`, 'utf8');
  console.log(`${file}: normalized singular and string tags to arrays`);
}
