/**
 * Content Script Entry Point
 *
 * Responsibilities:
 * 1. Detect platform
 * 2. Load Mermaid.js from CDN
 * 3. Initialize renderer
 */

import { detectPlatform, getPlatformConfig } from './detector';
import { initRenderer } from './renderer';
import { loadMermaidLibrary } from './mermaidLoader';

async function main() {
  // 1. Detect platform
  const platform = detectPlatform(window.location.hostname);
  if (!platform) {
    console.log('[MPR] Unsupported platform:', window.location.hostname);
    return;
  }

  // Grok has its own mermaid renderer, skip processing
  if (platform === 'grok') {
    console.log('[MPR] Grok detected - skipping (has native mermaid support)');
    return;
  }

  console.log(`[MPR] Detected platform: ${platform}`);

  // 2. Load Mermaid.js
  try {
    await loadMermaidLibrary();
  } catch (error) {
    console.error('[MPR] Failed to load Mermaid:', error);
    return;
  }

  // 3. Get platform config
  const config = getPlatformConfig(platform);

  // 4. Initialize renderer
  initRenderer(config);
  console.log('[MPR] Renderer initialized');
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
