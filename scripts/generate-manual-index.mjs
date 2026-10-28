import { readdir, writeFile } from 'node:fs/promises';

const docsDirectory = new URL('../public/docs/', import.meta.url);
const index = {};

for (const language of ['en', 'es']) {
  const files = await readdir(new URL(`${language}/manual/`, docsDirectory), {
    withFileTypes: true,
  });
  index[language] = files
    .filter((file) => file.isFile() && /^\d+_.+\.md$/.test(file.name))
    .map((file) => file.name)
    .sort((first, second) => first.localeCompare(second, 'en', { numeric: true }));
  const orders = index[language].map((file) => Number(file.split('_')[0]));
  if (new Set(orders).size !== orders.length) {
    throw new Error(`Manual numeric prefixes must be unique for ${language}.`);
  }
}

await writeFile(new URL('manuals.json', docsDirectory), `${JSON.stringify(index, null, 2)}\n`);
console.log(`Indexed ${Object.values(index).flat().length} manuals.`);