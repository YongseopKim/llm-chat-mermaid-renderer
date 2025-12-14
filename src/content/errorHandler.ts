/**
 * Error Handler for Mermaid Rendering
 *
 * Parses technical Mermaid.js errors and converts them
 * to user-friendly messages.
 */

export interface ParsedError {
  userMessage: string;
  details?: string;
  originalError: string;
}

interface ErrorPattern {
  pattern: RegExp;
  details: string | ((match: RegExpMatchArray) => string);
}

const ERROR_PATTERNS: ErrorPattern[] = [
  {
    pattern: /Parse error on line (\d+)/i,
    details: (match) => `Syntax error on line ${match[1]}`,
  },
  {
    pattern: /Unknown diagram type/i,
    details: 'Unsupported diagram type',
  },
  {
    pattern: /Syntax error in text/i,
    details: 'Syntax error in diagram',
  },
];

/**
 * Convert error to string
 */
function errorToString(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (error === null) {
    return 'null';
  }
  if (error === undefined) {
    return 'undefined';
  }
  return String(error);
}

/**
 * Parse technical error message and return user-friendly version
 */
export function parseErrorMessage(error: unknown): ParsedError {
  const originalError = errorToString(error);

  // Try to match known error patterns
  for (const { pattern, details } of ERROR_PATTERNS) {
    const match = originalError.match(pattern);
    if (match) {
      return {
        userMessage: 'Failed to render diagram',
        details: typeof details === 'function' ? details(match) : details,
        originalError,
      };
    }
  }

  // Fallback for unknown errors
  return {
    userMessage: 'Failed to render diagram',
    originalError,
  };
}

/**
 * Create error element for display
 */
export function createErrorElement(parsedError: ParsedError): HTMLDivElement {
  const container = document.createElement('div');
  container.className = 'mpr-error';

  // Title
  const title = document.createElement('div');
  title.className = 'mpr-error-title';
  title.textContent = parsedError.userMessage;
  container.appendChild(title);

  // Details (optional)
  const details = document.createElement('div');
  details.className = 'mpr-error-details';
  if (parsedError.details) {
    details.textContent = parsedError.details;
  } else {
    details.style.display = 'none';
  }
  container.appendChild(details);

  // Hint
  const hint = document.createElement('div');
  hint.className = 'mpr-error-hint';
  hint.textContent = 'Check the source code below';
  container.appendChild(hint);

  return container;
}
