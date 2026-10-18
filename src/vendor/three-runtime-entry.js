import * as Three from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';

// KickLab's imported-v42 game expects one local global. Bundle the loader with
// the exact same Three.js package so no module resolution or network is needed.
globalThis.THREE = Object.freeze({ ...Three, GLTFLoader, SkeletonUtils: Object.freeze({ clone: cloneSkeleton }) });
