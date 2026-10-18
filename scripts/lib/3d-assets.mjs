import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import { validateBytes } from 'gltf-validator';

export const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const assetRootPath = join(root, 'src', 'assets', '3d');
export const manifestPaths = readdirSync(assetRootPath,{withFileTypes:true})
  .filter(entry=>entry.isDirectory())
  .flatMap(entry=>readdirSync(join(assetRootPath,entry.name),{withFileTypes:true})
    .filter(version=>version.isDirectory())
    .map(version=>join(assetRootPath,entry.name,version.name,'asset-manifest.json')))
  .filter(path=>{try{return lstatSync(path).isFile();}catch{return false;}})
  .sort();

const json = (path) => JSON.parse(readFileSync(path, 'utf8'));
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

export async function validateAssetSet() {
  const schema = json(join(root, 'config', 'asset-manifest.schema.json'));
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  const validateManifest = ajv.compile(schema);
  const assets=[];
  for(const manifestPath of manifestPaths){
  const manifest = json(manifestPath);
  if (!validateManifest(manifest)) {
    throw new Error(`3D asset manifest rejected: ${ajv.errorsText(validateManifest.errors, { separator: '; ' })}`);
  }

  const assetPath = resolve(root, manifest.artifact.path);
  const assetRoot = resolve(root, 'src', 'assets', '3d') + sep;
  if (!assetPath.startsWith(assetRoot) || lstatSync(assetPath).isSymbolicLink()) {
    throw new Error('3D asset path must resolve to a regular local file under src/assets/3d');
  }
  const bytes = readFileSync(assetPath);
  if (bytes.byteLength !== manifest.artifact.bytes || sha256(bytes) !== manifest.artifact.sha256) {
    throw new Error('3D asset bytes or SHA-256 do not match the fail-closed manifest');
  }

  const externalUris = [];
  const report = await validateBytes(new Uint8Array(bytes), {
    uri: relative(root, assetPath),
    maxIssues: 0,
    externalResourceFunction: async (uri) => {
      externalUris.push(uri);
      throw new Error(`External glTF resource is forbidden: ${uri}`);
    },
  });
  const actualIssues = Object.values(report.issues.messages.reduce((groups, issue) => {
    const key = `${issue.code}:${issue.severity}`;
    groups[key] ||= { code: issue.code, severity: issue.severity, count: 0 };
    groups[key].count += 1;
    return groups;
  }, {})).sort((a, b) => a.code.localeCompare(b.code) || a.severity - b.severity);
  const allowedIssues = manifest.validation.allowedIssues
    .map(({ code, severity, count }) => ({ code, severity, count }))
    .sort((a, b) => a.code.localeCompare(b.code) || a.severity - b.severity);
  if (externalUris.length || report.issues.numErrors || JSON.stringify(actualIssues) !== JSON.stringify(allowedIssues)) {
    throw new Error(`glTF validation failed closed: ${JSON.stringify({ externalUris, issues: report.issues })}`);
  }

  assets.push({
    manifest,
    report,
    metrics: {
      assetId: manifest.assetId,
      version: manifest.version,
      status: manifest.status,
      path: manifest.artifact.path.replace(/^src\//, ''),
      bytes: bytes.byteLength,
      sha256: manifest.artifact.sha256,
      gltf: {
        validator: report.validatorVersion,
        errors: report.issues.numErrors,
        warnings: report.issues.numWarnings,
        infos: report.issues.numInfos,
        hints: report.issues.numHints,
        allowedIssues: actualIssues,
        externalUris: externalUris.length,
      },
    },
  });
  }
  if(!assets.length)throw new Error('No local 3D asset manifests found');
  return {assets,manifests:assets.map(asset=>asset.manifest),metrics:assets.map(asset=>asset.metrics)};
}
