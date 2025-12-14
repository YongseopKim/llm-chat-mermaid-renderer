import { describe, it, expect } from 'vitest';
import {
  parseErrorMessage,
  createErrorElement,
  type ParsedError,
} from '../../src/content/errorHandler';

describe('parseErrorMessage', () => {
  describe('Parse error pattern', () => {
    it('should parse "Parse error on line X" pattern', () => {
      const error = new Error(
        'Parse error on line 3:\ngraph TD\n    A-->'
      );
      const result = parseErrorMessage(error);

      expect(result.userMessage).toBe('Failed to render diagram');
      expect(result.details).toBe('Syntax error on line 3');
      expect(result.originalError).toContain('Parse error on line 3');
    });

    it('should handle line number extraction', () => {
      const error = new Error('Parse error on line 15: unexpected token');
      const result = parseErrorMessage(error);

      expect(result.details).toBe('Syntax error on line 15');
    });
  });

  describe('Unknown diagram type pattern', () => {
    it('should parse unknown diagram type errors', () => {
      const error = new Error('Unknown diagram type: invalidDiagram');
      const result = parseErrorMessage(error);

      expect(result.userMessage).toBe('Failed to render diagram');
      expect(result.details).toBe('Unsupported diagram type');
    });
  });

  describe('Syntax error pattern', () => {
    it('should parse "Syntax error in text" pattern', () => {
      const error = new Error('Syntax error in text mermaid version 10.0.0');
      const result = parseErrorMessage(error);

      expect(result.userMessage).toBe('Failed to render diagram');
      expect(result.details).toContain('Syntax error');
    });
  });

  describe('Fallback handling', () => {
    it('should provide fallback message for unknown errors', () => {
      const error = new Error('Some random error');
      const result = parseErrorMessage(error);

      expect(result.userMessage).toBe('Failed to render diagram');
      expect(result.originalError).toBe('Some random error');
    });

    it('should handle non-Error objects', () => {
      const result = parseErrorMessage('string error');

      expect(result.userMessage).toBe('Failed to render diagram');
      expect(result.originalError).toBe('string error');
    });

    it('should handle null/undefined', () => {
      const resultNull = parseErrorMessage(null);
      const resultUndefined = parseErrorMessage(undefined);

      expect(resultNull.userMessage).toBe('Failed to render diagram');
      expect(resultUndefined.userMessage).toBe('Failed to render diagram');
    });
  });
});

describe('createErrorElement', () => {
  it('should create error element with correct structure', () => {
    const parsedError: ParsedError = {
      userMessage: 'Failed to render diagram',
      details: 'Syntax error on line 3',
      originalError: 'Parse error on line 3',
    };

    const element = createErrorElement(parsedError);

    expect(element.className).toBe('mpr-error');
    expect(element.querySelector('.mpr-error-title')).not.toBeNull();
    expect(element.querySelector('.mpr-error-details')).not.toBeNull();
    expect(element.querySelector('.mpr-error-hint')).not.toBeNull();
  });

  it('should display user message in title', () => {
    const parsedError: ParsedError = {
      userMessage: 'Failed to render diagram',
      originalError: 'error',
    };

    const element = createErrorElement(parsedError);
    const title = element.querySelector('.mpr-error-title');

    expect(title!.textContent).toBe('Failed to render diagram');
  });

  it('should display details when provided', () => {
    const parsedError: ParsedError = {
      userMessage: 'Failed to render diagram',
      details: 'Syntax error on line 5',
      originalError: 'error',
    };

    const element = createErrorElement(parsedError);
    const details = element.querySelector('.mpr-error-details');

    expect(details!.textContent).toBe('Syntax error on line 5');
  });

  it('should hide details element when no details provided', () => {
    const parsedError: ParsedError = {
      userMessage: 'Failed to render diagram',
      originalError: 'error',
    };

    const element = createErrorElement(parsedError);
    const details = element.querySelector('.mpr-error-details') as HTMLElement;

    expect(details.style.display).toBe('none');
  });

  it('should display hint text', () => {
    const parsedError: ParsedError = {
      userMessage: 'Failed to render diagram',
      originalError: 'error',
    };

    const element = createErrorElement(parsedError);
    const hint = element.querySelector('.mpr-error-hint');

    expect(hint!.textContent).toBe('Check the source code below');
  });
});
