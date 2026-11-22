#!/usr/bin/env node
/**
 * Automated Secret Scanner for espacioGYM repository.
 * Supports staged pre-commit scan (default) and full repo scan (--all via git ls-files).
 */
const { execSync } = require('child_process');
const fs = require('fs');

const scanAll = process.argv.includes('--all');
console.log(
  scanAll
    ? '🔒 Escaneando todo el repositorio rastreado por Git (--all)...'
    : '🔒 Verificando ausencia de secretos y claves expuestas en cambios staged...',
);

let targetFiles = [];
try {
  const cmd = scanAll
    ? 'git ls-files'
    : 'git diff --cached --name-only --diff-filter=ACM';
  targetFiles = execSync(cmd, { encoding: 'utf-8' })
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
} catch {
  targetFiles = [];
}

const forbiddenPathChecks = [
  {
    regex: /(^|\/)\.env$/i,
    label: 'Archivo .env confidencial',
  },
  {
    regex: /(^|\/)\.env\.(?!example$)[^/]+$/i,
    label: 'Archivo .env.* confidencial',
  },
  {
    regex: /(^|\/)google-services\.json$/i,
    label: 'Archivo confidencial google-services.json',
  },
  {
    regex: /firebase-adminsdk.*\.json$/i,
    label: 'Credencial Firebase Admin SDK',
  },
  {
    regex: /\.(pem|key|p12|jks|keystore)$/i,
    label: 'Archivo de clave o certificado privado',
  },
];

const forbiddenContentChecks = [
  {
    regex: /AIza[0-9A-Za-z\-_]{35}/,
    label: 'Google/Firebase API Key (AIza...)',
  },
  {
    regex: /\b(?:sk_live|sk_test|rk_live|rk_test|whsec)_[0-9A-Za-z]{10,}/,
    label: 'Clave privada/webhook de Stripe',
  },
  {
    regex: /\bxkeysib-[0-9A-Za-z\-_]{16,}/,
    label: 'Clave API de Brevo',
  },
  {
    regex: /\bre_[0-9A-Za-z_]{16,}/,
    label: 'Clave API de Resend',
  },
  {
    regex: /\bSG\.[0-9A-Za-z\-_]{16,}\.[0-9A-Za-z\-_]{16,}/,
    label: 'Clave API de SendGrid',
  },
  {
    regex: /\bAC[a-f0-9]{32}\b/,
    label: 'Twilio Account SID literal',
  },
  {
    regex: /-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----/,
    label: 'Clave privada PEM embebida',
  },
  {
    regex: /(?:JWT_SECRET\s*[:=]\s*|process\.env\.JWT_SECRET\s*\|\|\s*)['"][^'"]{6,}['"]/,
    label: 'Secreto JWT_SECRET hardcodeado',
  },
  {
    regex: /['"](?:Admin1234!|FernandaPrueba|gym-seminario-secret-2026)['"]/,
    label: 'Credencial o secreto literal heredado',
  },
];

const binaryExtRegex = /\.(png|jpg|jpeg|gif|webp|avif|ico|pdf|docx|odt|zip|mp3|mp4|apk|db|sqlite|woff2?|ttf|otf|jar|keystore)$/i;

let errorsFound = false;

for (const file of targetFiles) {
  if (file.endsWith('.example') || file.endsWith('check-secrets.cjs')) {
    continue;
  }

  for (const check of forbiddenPathChecks) {
    if (check.regex.test(file)) {
      console.error(`❌ ERROR: ${check.label} detectado en Git: ${file}`);
      errorsFound = true;
    }
  }

  if (binaryExtRegex.test(file) || !fs.existsSync(file)) {
    continue;
  }

  try {
    const lines = scanAll
      ? fs.readFileSync(file, 'utf-8').split('\n')
      : execSync(`git diff --cached -- "${file}"`, { encoding: 'utf-8' })
          .split('\n')
          .filter((line) => line.startsWith('+') && !line.startsWith('+++'))
          .map((line) => line.slice(1));

    lines.forEach((line, idx) => {
      for (const check of forbiddenContentChecks) {
        if (check.regex.test(line)) {
          console.error(`❌ ERROR: ${check.label} detectada en ${file}:${idx + 1}`);
          errorsFound = true;
        }
      }
    });
  } catch {
    // ignorar archivos no legibles
  }
}

if (errorsFound) {
  console.error('\n🚨 Verificación bloqueada para evitar fuga de secretos o credenciales.');
  process.exit(1);
}

console.log(`✅ Verificación de secretos superada (${targetFiles.length} archivos revisados).`);
