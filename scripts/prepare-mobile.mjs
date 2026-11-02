import { createHash } from 'node:crypto';
import { cpSync, lstatSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(root, path), 'utf8');
const config = JSON.parse(read('capacitor.config.json'));
const contract = JSON.parse(read('config/mobile-release-contract.json'));
const exclusions = JSON.parse(read('config/mobile-package-exclusions.json'));
const sourcePath = contract.app.sourceArtifact;
const outputPath = contract.app.artifact;

if (config.appId !== contract.app.id || config.appName !== contract.app.name) {
  throw new Error('Capacitor identity must match the mobile release contract');
}
if (config.webDir !== dirname(outputPath)) {
  throw new Error('Capacitor webDir must own the audited mobile artifact');
}
if (config.server?.url || config.server?.allowNavigation?.length) {
  throw new Error('Mobile packaging must not enable a remote server or navigation allowlist');
}

const contentSecurityPolicy = [
  "default-src 'self' data: blob:",
  "script-src 'self' 'unsafe-inline' blob:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "media-src 'self' data: blob:",
  "connect-src 'self' blob:",
  "object-src 'none'",
  "frame-src 'none'",
  "base-uri 'none'",
  "form-action 'none'"
].join('; ');

const source = read(sourcePath);
const withoutRemoteStyles = source.replace(
  /\s*<link\b[^>]*href=["']https?:\/\/[^>]+>\s*/gi,
  '\n'
);
const mobile = withoutRemoteStyles.replace(
  '<meta charset="utf-8">',
  `<meta charset="utf-8">\n<meta http-equiv="Content-Security-Policy" content="${contentSecurityPolicy}">\n<meta name="kicklab-artifact" content="capacitor-local-v1">`
);

if (mobile === source || !mobile.includes("connect-src 'self' blob:")) {
  throw new Error('Mobile artifact hardening was not applied');
}
if (/<(?:script|link|img|audio|video|source)\b[^>]*(?:src|href)=["']https?:\/\//i.test(mobile)) {
  throw new Error('Mobile artifact contains a remote asset reference');
}

const outputDir = join(root, dirname(outputPath));
rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });
writeFileSync(join(root, outputPath), mobile);
cpSync(join(root, 'dist', 'media'), join(outputDir, 'media'), { recursive: true });
cpSync(join(root, 'dist', 'assets'), join(outputDir, 'assets'), { recursive: true });
if (exclusions.schemaVersion !== 1 || exclusions.paths.length !== 25 || new Set(exclusions.paths).size !== 25) {
  throw new Error('Mobile exclusion list must contain the 25 reviewed source/provenance paths');
}
for (const path of exclusions.paths) {
  if (!/^(?:assets|media)\/[a-zA-Z0-9._/-]+$/.test(path) || path.split('/').includes('..')) {
    throw new Error(`Unsafe mobile exclusion path: ${path}`);
  }
  const sourceFile = join(root, 'src', path);
  const packagedFile = join(outputDir, path);
  if (!lstatSync(sourceFile).isFile() || !lstatSync(packagedFile).isFile() ||
      !readFileSync(sourceFile).equals(readFileSync(packagedFile))) {
    throw new Error(`Cannot preserve exact source evidence for ${path}`);
  }
  rmSync(packagedFile);
}
cpSync(join(root, 'dist', 'party-qr.js'), join(outputDir, 'party-qr.js'));
cpSync(join(root, 'config', 'mobile-distribution-notices.txt'), join(outputDir, 'THIRD-PARTY-NOTICES.txt'));

const manifest = {
  schemaVersion: contract.schemaVersion,
  appId: config.appId,
  appName: config.appName,
  artifact: outputPath,
  sourceArtifact: sourcePath,
  sha256: createHash('sha256').update(mobile).digest('hex'),
  offline: true,
  egress: 'blocked',
  cloudIdentity: false,
  remoteSync: false,
  authority: contract.authority
};
writeFileSync(join(root, 'dist', 'kicklab-mobile-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`prepared ${outputPath} (${(mobile.length / 1024).toFixed(0)} KB, ${manifest.sha256.slice(0, 12)})`);
