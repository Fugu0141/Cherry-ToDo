import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import path from 'node:path';

const dist = path.resolve('dist');
if (!existsSync(dist)) {
  console.error('dist/ is missing. Run npm run build before npm run metrics.');
  process.exit(1);
}

function walk(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const absolute = path.join(directory, entry);
    return statSync(absolute).isDirectory() ? walk(absolute) : [absolute];
  });
}

const rows = walk(dist)
  .map((file) => {
    const bytes = readFileSync(file);
    return {
      file: path.relative(dist, file).split(path.sep).join('/'),
      bytes: bytes.length,
      gzipBytes: gzipSync(bytes).length,
    };
  })
  .sort((left, right) => left.file.localeCompare(right.file));

const total = rows.reduce(
  (result, row) => ({ bytes: result.bytes + row.bytes, gzipBytes: result.gzipBytes + row.gzipBytes }),
  { bytes: 0, gzipBytes: 0 },
);

console.log('Cherry V2 production bundle metrics');
console.log(`Node ${process.version} · ${process.platform} ${process.arch}`);
console.table(rows);
console.log(`Total: ${total.bytes} bytes (${total.gzipBytes} gzip bytes)`);
