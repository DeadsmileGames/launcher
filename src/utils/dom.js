let bodyLockCount = 0;
let previousOverflow = '';

export function lockBodyScroll() {
  if (typeof document === 'undefined') return () => {};
  if (bodyLockCount === 0) {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  bodyLockCount += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    bodyLockCount = Math.max(0, bodyLockCount - 1);
    if (bodyLockCount === 0) document.body.style.overflow = previousOverflow;
  };
}

export const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function trapFocus(panel, onClose, initialFocus = panel) {
  const previousFocus = document.activeElement;
  const unlock = lockBodyScroll();
  const key = (event) => {
    if (event.key === 'Escape') { event.preventDefault(); onClose?.(); return; }
    if (event.key !== 'Tab' || !panel) return;
    const elements = [...panel.querySelectorAll(FOCUSABLE_SELECTOR)].filter((element) => !element.closest('[hidden], [inert], [aria-hidden="true"]') && !element.matches(':disabled, input[type="hidden"]'));
    const first = elements[0];
    const last = elements.at(-1);
    if (!first) { event.preventDefault(); panel.focus(); }
    else if (event.shiftKey && (document.activeElement === first || document.activeElement === panel || !panel.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
  };
  document.addEventListener('keydown', key);
  initialFocus?.focus();
  return () => { unlock(); document.removeEventListener('keydown', key); if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus(); };
}
