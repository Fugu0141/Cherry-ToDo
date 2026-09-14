import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = path.join(repositoryRoot, 'src');
const importPattern = /\b(?:import|export)\s+(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]/g;
const dynamicImportPattern = /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g;

function walk(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const absolute = path.join(directory, entry);
    return statSync(absolute).isDirectory() ? walk(absolute) : [absolute];
  });
}

function normalize(filePath) {
  return filePath.split(path.sep).join('/');
}

function resolveSourceImport(sourceFile, specifier) {
  if (!specifier.startsWith('.')) {
    return null;
  }

  const base = path.resolve(path.dirname(sourceFile), specifier);
  const candidates = [base, `${base}.ts`, path.join(base, 'index.ts')];
  return candidates.find((candidate) => candidate.startsWith(sourceRoot)) ?? null;
}

function moduleName(relativePath) {
  const match = relativePath.match(/^modules\/([^/]+)\//);
  return match?.[1] ?? null;
}

function isPublicModuleEntry(relativePath) {
  return /^modules\/[^/]+\/index\.ts$/.test(relativePath);
}

function violationsForImport(sourceRelative, targetRelative) {
  const violations = [];
  const sourceModule = moduleName(sourceRelative);
  const targetModule = moduleName(targetRelative);

  if (sourceModule !== null && targetModule !== null && sourceModule !== targetModule) {
    if (!isPublicModuleEntry(targetRelative)) {
      violations.push('cross-module imports must use the target module index.ts public API');
    }
  }

  if (!sourceRelative.startsWith('ui-contract/') && targetRelative.startsWith('ui-contract/')) {
    if (targetRelative !== 'ui-contract/index.ts') {
      violations.push('ui-contract consumers must import only ui-contract/index.ts');
    }
  }

  if (sourceRelative.startsWith('shared/')) {
    if (/^(modules|ui-contract|ui|adapters|composition)\//.test(targetRelative)) {
      violations.push('shared code cannot depend on outer application layers');
    }
  }

  if (/^modules\/[^/]+\/domain\//.test(sourceRelative)) {
    if (/^(ui-contract|ui|adapters|composition)\//.test(targetRelative)) {
      violations.push('domain code cannot depend on UI, adapters, composition, or UI contracts');
    }
    if (/^modules\/[^/]+\/(application|ports)\//.test(targetRelative)) {
      violations.push('domain code cannot depend on application or ports');
    }
  }

  if (/^modules\/[^/]+\/application\//.test(sourceRelative)) {
    if (/^(ui|adapters|composition)\//.test(targetRelative)) {
      violations.push('application code cannot depend on UI, adapters, or composition');
    }
  }

  if (/^modules\/[^/]+\/ports\//.test(sourceRelative)) {
    if (/^(ui-contract|ui|adapters|composition)\//.test(targetRelative)) {
      violations.push('port contracts cannot depend on concrete outer layers');
    }
    if (/^modules\/[^/]+\/application\//.test(targetRelative)) {
      violations.push('port contracts cannot depend on application implementations');
    }
  }

  if (sourceRelative.startsWith('ui-contract/')) {
    if (/^(ui|adapters|composition)\//.test(targetRelative)) {
      violations.push('ui-contract cannot depend on UI implementations, adapters, or composition');
    }
  }

  if (sourceRelative.startsWith('ui/')) {
    if (/^(modules|adapters|composition)\//.test(targetRelative)) {
      violations.push('UI packages may consume ui-contract, not modules/adapters/composition directly');
    }
  }

  if (!sourceRelative.startsWith('composition/')) {
    if (targetRelative.startsWith('adapters/')) {
      violations.push('only composition may import concrete adapters');
    }
  }

  return violations;
}

const files = walk(sourceRoot).filter((file) => file.endsWith('.ts'));
const failures = [];

for (const sourceFile of files) {
  const sourceRelative = normalize(path.relative(sourceRoot, sourceFile));
  const contents = readFileSync(sourceFile, 'utf8');
  const specifiers = [];

  for (const pattern of [importPattern, dynamicImportPattern]) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(contents)) !== null) {
      if (match[1] !== undefined) {
        specifiers.push(match[1]);
      }
    }
  }

  for (const specifier of specifiers) {
    const target = resolveSourceImport(sourceFile, specifier);
    if (target === null) {
      continue;
    }
    const targetRelative = normalize(path.relative(sourceRoot, target));
    for (const reason of violationsForImport(sourceRelative, targetRelative)) {
      failures.push(`${sourceRelative} -> ${specifier}: ${reason}`);
    }
  }
}

if (failures.length > 0) {
  console.error('Architecture boundary violations found:\n');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exitCode = 1;
} else {
  console.log(`Architecture boundaries passed for ${files.length} TypeScript files.`);
}
