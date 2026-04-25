// Shared material library. Architectural-matte default per spec §4.
import * as THREE from 'three';
import { COLORS } from './colors.js';

// Default architectural matte
export function matte(colorHex, overrides = {}) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(colorHex),
    roughness: 0.85,
    metalness: 0.0,
    ...overrides,
  });
}

// Glass for windows (later stages)
export function glass(colorHex = COLORS.windowGlass) {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(colorHex),
    transmission: 0.6,
    opacity: 0.4,
    transparent: true,
    roughness: 0.05,
    metalness: 0.0,
  });
}

// Roof shingle (very matte)
export function shingle(colorHex = COLORS.roofShingle) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(colorHex),
    roughness: 0.95,
    metalness: 0.0,
  });
}

// Lazy-cached library so geometry modules can grab shared materials
const cache = new Map();
export function shared(key, factory) {
  if (!cache.has(key)) cache.set(key, factory());
  return cache.get(key);
}
