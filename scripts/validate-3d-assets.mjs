import { validateAssetSet } from './lib/3d-assets.mjs';

const { metrics } = await validateAssetSet();
for(const asset of metrics)console.log(`validated ${asset.assetId} v${asset.version} (${asset.bytes} bytes, ${asset.gltf.errors} errors, ${asset.gltf.warnings} acknowledged warnings, no external URIs)`);
