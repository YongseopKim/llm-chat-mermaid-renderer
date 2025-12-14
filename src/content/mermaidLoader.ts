/**
 * Mermaid.js Library Loader
 *
 * Loads Mermaid from CDN (jsDelivr)
 */

const MERMAID_CDN_URL =
  'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';

export function loadMermaidLibrary(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Skip if already loaded
    if (typeof (window as any).mermaid !== 'undefined') {
      console.log('[MPR] Mermaid already loaded');
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = MERMAID_CDN_URL;

    script.onload = () => {
      console.log('[MPR] Mermaid loaded from CDN');
      resolve();
    };

    script.onerror = () => {
      reject(new Error('[MPR] Failed to load Mermaid from CDN'));
    };

    document.head.appendChild(script);
  });
}
