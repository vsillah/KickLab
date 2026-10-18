import { validateAssetSet } from './lib/3d-assets.mjs';

const { metrics } = await validateAssetSet();
console.log(`validated ${metrics.assetId} v${metrics.version} (${metrics.bytes} bytes, ${metrics.gltf.errors} errors, ${metrics.gltf.warnings} acknowledged fixture warnings, no external URIs)`);
