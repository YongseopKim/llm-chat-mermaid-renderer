/**
 * Platform Detection and Code Block Detection
 *
 * Responsibilities:
 * 1. Identify platform by hostname
 * 2. Find unprocessed mermaid code blocks
 * 3. Handle platform-specific detection strategies
 */

export type Platform = 'chatgpt' | 'claude' | 'gemini' | 'grok';

interface PlatformSelectors {
  hostname: string;
  selectors: {
    codeBlock: string;
    wrapper: string;
    languageLabel?: string;
    previewButton?: string;
  };
  detection: 'className' | 'languageLabel' | 'contentBased';
}

interface SelectorsConfig {
  version: string;
  platforms: Record<Platform, PlatformSelectors>;
}

// Import with type assertion
import selectorsJson from '../../config/selectors.json';
const selectors = selectorsJson as SelectorsConfig;

export interface PlatformConfig {
  platform: Platform;
  codeBlockSelector: string;
  wrapperSelector: string;
  detection: 'className' | 'languageLabel' | 'contentBased';
  languageLabelSelector?: string;
  previewButtonSelector?: string;
}

/**
 * Mermaid diagram type keywords (first word of diagram)
 */
const MERMAID_KEYWORDS = [
  'graph',
  'flowchart',
  'sequencediagram',
  'classdiagram',
  'statediagram',
  'statediagram-v2',
  'erdiagram',
  'journey',
  'gantt',
  'pie',
  'quadrantchart',
  'requirementdiagram',
  'gitgraph',
  'mindmap',
  'timeline',
  'zenuml',
  'sankey-beta',
  'xychart-beta',
  'block-beta',
];

/**
 * Check if content looks like mermaid code
 */
export function isMermaidContent(content: string): boolean {
  const trimmed = content.trim().toLowerCase();
  const firstWord = trimmed.split(/[\s\n]/)[0];
  return MERMAID_KEYWORDS.includes(firstWord);
}

/**
 * Detect platform from hostname
 */
export function detectPlatform(hostname: string): Platform | null {
  for (const [key, config] of Object.entries(selectors.platforms)) {
    if (hostname.includes(config.hostname)) {
      return key as Platform;
    }
  }
  return null;
}

/**
 * Get platform configuration
 */
export function getPlatformConfig(platform: Platform): PlatformConfig {
  const config = selectors.platforms[platform];

  if (config.detection === 'languageLabel') {
    return {
      platform,
      codeBlockSelector: config.selectors.codeBlock,
      wrapperSelector: config.selectors.wrapper,
      detection: 'languageLabel',
      languageLabelSelector: config.selectors.languageLabel,
      previewButtonSelector: config.selectors.previewButton,
    };
  }

  if (config.detection === 'contentBased') {
    return {
      platform,
      codeBlockSelector: config.selectors.codeBlock,
      wrapperSelector: config.selectors.wrapper,
      detection: 'contentBased',
    };
  }

  return {
    platform,
    codeBlockSelector: config.selectors.codeBlock,
    wrapperSelector: config.selectors.wrapper,
    detection: 'className',
  };
}

/**
 * Check if an element is a mermaid code block
 */
export function isMermaidCodeBlock(
  element: Element,
  config: PlatformConfig
): boolean {
  // Skip if already processed
  if (element.closest('[data-mpr-processed="true"]')) {
    return false;
  }

  if (config.detection === 'className') {
    // ChatGPT, Claude: class="language-mermaid"
    return element.classList.contains('language-mermaid');
  }

  if (config.detection === 'contentBased') {
    // Gemini: no language class, detect by content
    const content = element.textContent || '';
    return isMermaidContent(content);
  }

  if (config.detection === 'languageLabel') {
    // Grok: separate span for language label
    const wrapper = element.closest(config.wrapperSelector);
    if (!wrapper) return false;

    const labelEl = wrapper.querySelector(config.languageLabelSelector!);
    return labelEl?.textContent?.trim().toLowerCase() === 'mermaid';
  }

  return false;
}

/**
 * Find all unprocessed mermaid code blocks
 */
export function findUnprocessedMermaidBlocks(
  config: PlatformConfig
): Element[] {
  if (config.detection === 'className') {
    // Direct selector for className-based platforms
    const blocks = document.querySelectorAll(config.codeBlockSelector);
    return Array.from(blocks).filter(
      (el) => !el.closest('[data-mpr-processed="true"]')
    );
  }

  if (config.detection === 'contentBased') {
    // Gemini: filter by mermaid content detection
    const allBlocks = document.querySelectorAll(config.codeBlockSelector);
    return Array.from(allBlocks).filter((el) => {
      if (el.closest('[data-mpr-processed="true"]')) return false;
      const content = el.textContent || '';
      return isMermaidContent(content);
    });
  }

  if (config.detection === 'languageLabel') {
    // Grok: filter by language label content
    const allWrappers = document.querySelectorAll(config.wrapperSelector);
    return Array.from(allWrappers).filter((wrapper) => {
      if (wrapper.hasAttribute('data-mpr-processed')) return false;
      if (wrapper.closest('[data-mpr-processed="true"]')) return false;

      const labelEl = wrapper.querySelector(config.languageLabelSelector!);
      return labelEl?.textContent?.trim().toLowerCase() === 'mermaid';
    });
  }

  return [];
}
