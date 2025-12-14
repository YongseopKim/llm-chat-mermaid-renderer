/**
 * Toggle Button Component
 *
 * Features:
 * - Switch between source code and rendered diagram
 * - Update icon based on state
 */

export function createToggleButton(
  sourceEl: HTMLElement,
  renderedEl: HTMLElement,
  initialShowSource: boolean = false
): HTMLButtonElement {
  const button = document.createElement('button');
  button.className = 'mpr-toggle';
  button.setAttribute('aria-label', 'Toggle between source code and diagram');

  let showingSource = initialShowSource;

  // Set initial state
  if (showingSource) {
    sourceEl.style.display = 'block';
    renderedEl.style.display = 'block'; // Show both error and source
    button.textContent = '\u25B6'; // Play icon (diagram)
    button.title = 'Show diagram';
  } else {
    button.textContent = '{ }';
    button.title = 'Show source code';
  }

  button.addEventListener('click', () => {
    showingSource = !showingSource;

    if (showingSource) {
      // Show source code
      sourceEl.style.display = 'block';
      renderedEl.style.display = 'none';
      button.textContent = '\u25B6'; // Play icon (diagram)
      button.title = 'Show diagram';
    } else {
      // Show rendered diagram
      sourceEl.style.display = 'none';
      renderedEl.style.display = 'block';
      button.textContent = '{ }';
      button.title = 'Show source code';
    }
  });

  return button;
}
