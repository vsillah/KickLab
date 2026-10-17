import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(root, path), 'utf8');
const config = JSON.parse(read('capacitor.config.json'));
const contract = JSON.parse(read('config/mobile-release-contract.json'));
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
  "connect-src 'none'",
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

if (mobile === source || !mobile.includes('connect-src \'none\'')) {
  throw new Error('Mobile artifact hardening was not applied');
}
if (/<(?:script|link|img|audio|video|source)\b[^>]*(?:src|href)=["']https?:\/\//i.test(mobile)) {
  throw new Error('Mobile artifact contains a remote asset reference');
}

const outputDir = join(root, dirname(outputPath));
mkdirSync(outputDir, { recursive: true });
writeFileSync(join(root, outputPath), mobile);
rmSync(join(outputDir, 'media'), { recursive: true, force: true });
cpSync(join(root, 'dist', 'media'), join(outputDir, 'media'), { recursive: true });

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
writeFileSync(join(outputDir, 'kicklab-mobile-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`prepared ${outputPath} (${(mobile.length / 1024).toFixed(0)} KB, ${manifest.sha256.slice(0, 12)})`);
