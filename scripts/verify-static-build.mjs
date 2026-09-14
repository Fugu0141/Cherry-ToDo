import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const distRoot = resolve('dist');
const indexPath = resolve(distRoot, 'index.html');

if (!existsSync(indexPath)) {
  throw new Error('dist/index.html is missing. Run npm run build before static verification.');
}

const html = readFileSync(indexPath, 'utf8');
const assetRefs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((match) => match[1]);
const localRefs = assetRefs.filter((ref) => ref.startsWith('./'));
const absoluteLocalRefs = assetRefs.filter((ref) => ref.startsWith('/'));

if (absoluteLocalRefs.length > 0) {
  throw new Error(
    `Static build contains root-absolute asset references: ${absoluteLocalRefs.join(', ')}`,
  );
}

if (localRefs.length === 0) {
  throw new Error('Static build contains no relative local asset references.');
}

for (const ref of localRefs) {
  const filePath = resolve(distRoot, ref.slice(2));
  if (!existsSync(filePath)) {
    throw new Error(`Static build references a missing file: ${ref}`);
  }
}

console.log(
  `Static deployment verification passed for ${localRefs.length} relative asset reference(s).`,
);
