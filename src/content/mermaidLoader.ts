/**
 * Mermaid.js Library Loader
 *
 * Imports bundled Mermaid (CSP-safe)
 */

import mermaid from 'mermaid';

// Expose mermaid globally for renderer.ts
(window as any).mermaid = mermaid;

export function loadMermaidLibrary(): Promise<void> {
  console.log('[MPR] Mermaid loaded from bundle');
  return Promise.resolve();
}
