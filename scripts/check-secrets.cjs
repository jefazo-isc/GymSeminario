#!/usr/bin/env node
/**
 * Automated Secret Scanner for espacioGYM repository.
 * Detects accidentally committed Google API keys, credentials, or google-services.json files.
 */
const { execSync } = require('child_process');

console.log('🔒 Verificando ausencia de secretos y claves expuestas en Git...');

let stagedFiles = [];
try {
  stagedFiles = execSync('git diff --cached --name-only --diff-filter=ACM', { encoding: 'utf-8' })
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
} catch {
  // En caso de no estar en git o sin staged
}

const forbiddenPatterns = [
  /AIza[0-9A-Za-z\-_]{35}/g, // Google API Key pattern
  /google-services\.json$/i, // Secret Android services file
];

let errorsFound = false;

for (const file of stagedFiles) {
  if (file.endsWith('.example') || file.endsWith('check-secrets.cjs')) {
    continue;
  }

  if (file.endsWith('google-services.json')) {
    console.error(`❌ ERROR: Intentando commitear archivo confidencial: ${file}`);
    errorsFound = true;
    continue;
  }

  try {
    const diff = execSync(`git diff --cached -- "${file}"`, { encoding: 'utf-8' });
    const addedLines = diff
      .split('\n')
      .filter((line) => line.startsWith('+') && !line.startsWith('+++'));

    for (const line of addedLines) {
      if (line.includes('AIzaSyDgvE4giqYTIyEQ0JrENbH4IWhzl4pfFQY') || /AIza[0-9A-Za-z\-_]{35}/.test(line)) {
        if (!file.includes('environment.defaults.ts')) {
          console.error(`❌ ERROR: Posible Google API Key detectada en ${file}:`);
          console.error(`   ${line.trim().slice(0, 50)}...`);
          errorsFound = true;
        }
      }
    }
  } catch {
    // ignorar archivos binarios o borrados
  }
}

if (errorsFound) {
  console.error('\n🚨 El commit fue bloqueado para evitar fugas de secretos.');
  process.exit(1);
} else {
  console.log('✅ Verificación de secretos superada: Ningún secreto detectado.');
}
