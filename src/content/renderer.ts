/**
 * Mermaid Renderer with Source Preservation
 *
 * Core functionality:
 * 1. Create preserving wrapper structure (hidden source + rendered SVG)
 * 2. MutationObserver for detecting new code blocks
 * 3. Mermaid.js rendering integration
 */

import { PlatformConfig, findUnprocessedMermaidBlocks } from './detector';
import { createToggleButton } from './toggle';

declare const mermaid: {
  initialize: (config: object) => void;
  render: (id: string, code: string) => Promise<{ svg: string }>;
};

let renderCounter = 0;

/**
 * Create the preserving wrapper structure
 *
 * This is the CORE of LLM Chat Exporter compatibility:
 * - Original source is hidden but parseable
 * - <code class="language-mermaid"> is preserved for converter.ts
 *
 * Output structure:
 * <div class="mpr-container" data-mpr-processed="true">
 *   <pre class="mpr-source" style="display:none">
 *     <code class="language-mermaid">original code</code>
 *   </pre>
 *   <div class="mpr-rendered"><!-- SVG will go here --></div>
 *   <button class="mpr-toggle">{ }</button>
 * </div>
 */
export function createPreservingWrapper(sourceCode: string): {
  container: HTMLDivElement;
  sourceWrapper: HTMLPreElement;
  renderedDiv: HTMLDivElement;
} {
  // Container
  const container = document.createElement('div');
  container.className = 'mpr-container';
  container.setAttribute('data-mpr-processed', 'true');

  // Source preservation (hidden) - KEY for LLM Chat Exporter
  const sourceWrapper = document.createElement('pre');
  sourceWrapper.className = 'mpr-source';
  sourceWrapper.style.display = 'none';

  const sourceCodeEl = document.createElement('code');
  sourceCodeEl.className = 'language-mermaid';
  sourceCodeEl.textContent = sourceCode;
  sourceWrapper.appendChild(sourceCodeEl);

  // Rendered diagram area
  const renderedDiv = document.createElement('div');
  renderedDiv.className = 'mpr-rendered';

  // Assemble
  container.appendChild(sourceWrapper);
  container.appendChild(renderedDiv);

  return { container, sourceWrapper, renderedDiv };
}

/**
 * Extract source code from an element based on platform
 */
export function extractSourceCode(
  element: Element,
  config: PlatformConfig
): string {
  if (config.platform === 'grok') {
    // Grok: element is the wrapper, code is inside pre > code
    const codeEl = element.querySelector('pre code');
    return codeEl?.textContent?.trim() || '';
  }

  // ChatGPT, Claude, Gemini: element is the code element itself
  return element.textContent?.trim() || '';
}

/**
 * Get the wrapper element to replace
 */
export function getWrapperToReplace(
  element: Element,
  config: PlatformConfig
): Element {
  if (config.platform === 'grok') {
    // Grok: element IS the wrapper [data-testid='code-block']
    return element;
  }

  // ChatGPT, Claude, Gemini: element is code, wrapper is parent pre
  return element.parentElement || element;
}

/**
 * Render a single mermaid block
 */
export async function renderMermaidBlock(
  element: Element,
  config: PlatformConfig
): Promise<HTMLDivElement | null> {
  try {
    // 1. Extract source code
    const sourceCode = extractSourceCode(element, config);
    if (!sourceCode) return null;

    // 2. Create wrapper structure
    const { container, sourceWrapper, renderedDiv } =
      createPreservingWrapper(sourceCode);

    // 3. Render with Mermaid.js
    const uniqueId = `mpr-diagram-${++renderCounter}`;
    try {
      const { svg } = await mermaid.render(uniqueId, sourceCode);
      renderedDiv.innerHTML = svg;
    } catch (err) {
      // Render error - show message but preserve source
      renderedDiv.innerHTML = `<div class="mpr-error">Mermaid rendering failed: ${err}</div>`;
      renderedDiv.classList.add('mpr-error-container');
    }

    // 4. Add toggle button
    const toggleBtn = createToggleButton(sourceWrapper, renderedDiv);
    container.appendChild(toggleBtn);

    // 5. Replace original element
    const wrapperToReplace = getWrapperToReplace(element, config);
    wrapperToReplace.replaceWith(container);

    return container;
  } catch (error) {
    console.error('[MPR] Render error:', error);
    return null;
  }
}

/**
 * Process existing blocks on page
 */
export function processExistingBlocks(config: PlatformConfig): void {
  const blocks = findUnprocessedMermaidBlocks(config);
  blocks.forEach((block) => renderMermaidBlock(block, config));
}

/**
 * Setup MutationObserver for new blocks
 */
export function setupMutationObserver(config: PlatformConfig): MutationObserver {
  const observer = new MutationObserver(() => {
    // Debounce with requestAnimationFrame
    requestAnimationFrame(() => {
      const blocks = findUnprocessedMermaidBlocks(config);
      blocks.forEach((block) => renderMermaidBlock(block, config));
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  return observer;
}

/**
 * Initialize the renderer
 */
export function initRenderer(config: PlatformConfig): void {
  // Initialize Mermaid
  mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    securityLevel: 'loose',
    fontFamily: 'inherit',
  });

  // Process existing blocks
  processExistingBlocks(config);

  // Watch for new blocks
  setupMutationObserver(config);
}
