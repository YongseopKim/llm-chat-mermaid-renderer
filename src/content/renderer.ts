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
import { parseErrorMessage, createErrorElement } from './errorHandler';

declare const mermaid: {
  initialize: (config: object) => void;
  render: (id: string, code: string) => Promise<{ svg: string }>;
};

let renderCounter = 0;

/**
 * Clean up Mermaid error elements from DOM
 *
 * Mermaid.js injects error SVG elements directly into document.body
 * when parsing fails. This breaks the UI (especially on Gemini).
 * This function removes those injected elements.
 */
export function cleanupMermaidErrorElements(renderId: string): void {
  // Mermaid creates elements with id "d{renderId}" for errors
  const errorSelectors = [
    `#d${renderId}`, // Error container
    `#${renderId}`, // SVG element
    `[id^="d${renderId}"]`, // Any element starting with d{renderId}
    `svg[aria-roledescription="error"]#${renderId}`, // Error SVG with aria attribute
  ];

  errorSelectors.forEach((selector) => {
    try {
      const elements = document.querySelectorAll(selector);
      elements.forEach((el) => el.remove());
    } catch {
      // Ignore selector errors
    }
  });
}

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
 * Create Grok diagram container (hidden initially)
 * Includes hidden source for LLM Chat Exporter compatibility
 */
export function createGrokDiagramContainer(sourceCode: string): HTMLDivElement {
  const container = document.createElement('div');
  container.className = 'mpr-grok-diagram';
  container.style.display = 'none';

  // Hidden source for LLM Chat Exporter
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

  container.appendChild(sourceWrapper);
  container.appendChild(renderedDiv);

  return container;
}

/**
 * Toggle Grok diagram visibility
 */
export function toggleGrokDiagram(
  diagramContainer: HTMLElement,
  codeContainer: Element | null
): void {
  const isShowingDiagram = diagramContainer.style.display !== 'none';

  if (isShowingDiagram) {
    // Hide diagram, show code
    diagramContainer.style.display = 'none';
    if (codeContainer instanceof HTMLElement) {
      codeContainer.style.display = '';
    }
  } else {
    // Show diagram, hide code
    diagramContainer.style.display = '';
    if (codeContainer instanceof HTMLElement) {
      codeContainer.style.display = 'none';
    }
  }
}

/**
 * Render Grok mermaid block with button toggle
 * Preserves Grok's original UI (fold, copy buttons)
 */
export async function renderGrokMermaidBlock(
  wrapper: Element,
  config: PlatformConfig
): Promise<void> {
  // 1. Find preview button
  const previewBtn = wrapper.querySelector(config.previewButtonSelector!);
  if (!previewBtn) return;

  // 2. Extract source code
  const sourceCode = extractSourceCode(wrapper, config);
  if (!sourceCode) return;

  // 3. Create diagram container (hidden initially)
  const diagramContainer = createGrokDiagramContainer(sourceCode);

  // 4. Render diagram
  const uniqueId = `mpr-diagram-${++renderCounter}`;
  const renderedDiv = diagramContainer.querySelector('.mpr-rendered');
  try {
    const { svg } = await mermaid.render(uniqueId, sourceCode);
    if (renderedDiv) renderedDiv.innerHTML = svg;
  } catch (err) {
    // CRITICAL: Clean up Mermaid's injected error elements from DOM
    // Mermaid.js may inject error SVGs asynchronously, so we clean up
    // both immediately and after a short delay
    cleanupMermaidErrorElements(uniqueId);
    setTimeout(() => cleanupMermaidErrorElements(uniqueId), 0);

    if (renderedDiv) {
      const parsedError = parseErrorMessage(err);
      renderedDiv.innerHTML = '';
      renderedDiv.appendChild(createErrorElement(parsedError));
      renderedDiv.classList.add('mpr-error-container');
    }
  }

  // 5. Find code container (shiki div)
  const codeContainer = wrapper.querySelector('.shiki');

  // 6. Insert diagram container after code container
  if (codeContainer?.parentElement) {
    codeContainer.parentElement.insertBefore(
      diagramContainer,
      codeContainer.nextSibling
    );
  }

  // 7. Add click event to preview button
  previewBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleGrokDiagram(diagramContainer, codeContainer);
  });

  // 8. Mark as processed
  wrapper.setAttribute('data-mpr-processed', 'true');
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
    let hasError = false;
    try {
      const { svg } = await mermaid.render(uniqueId, sourceCode);
      renderedDiv.innerHTML = svg;
    } catch (err) {
      // Render error - show user-friendly message and auto-show source
      hasError = true;

      // CRITICAL: Clean up Mermaid's injected error elements from DOM
      // Mermaid.js injects error SVGs directly into document.body on parse errors
      // This breaks the UI on Gemini (and potentially other platforms)
      // We clean up both immediately and after a short delay to handle async injection
      cleanupMermaidErrorElements(uniqueId);
      setTimeout(() => cleanupMermaidErrorElements(uniqueId), 0);

      const parsedError = parseErrorMessage(err);
      renderedDiv.innerHTML = '';
      renderedDiv.appendChild(createErrorElement(parsedError));
      renderedDiv.classList.add('mpr-error-container');
    }

    // 4. Add toggle button (show source automatically on error)
    const toggleBtn = createToggleButton(sourceWrapper, renderedDiv, hasError);
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
