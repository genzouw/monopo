import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]:not([hidden])',
  'button:not([disabled]):not([hidden]):not([tabindex="-1"])',
  'input:not([disabled]):not([hidden]):not([tabindex="-1"])',
  'select:not([disabled]):not([hidden]):not([tabindex="-1"])',
  'textarea:not([disabled]):not([hidden]):not([tabindex="-1"])',
  '[tabindex]:not([tabindex="-1"]):not([hidden])',
].join(',');

function getFocusables(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  );
}

export function useFocusTrap<T extends HTMLElement>() {
  const containerRef = useRef<T>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusables = getFocusables(container);
    const initial = focusables[0] ?? container;
    initial.focus({ preventScroll: true });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const current = getFocusables(container);
      if (current.length === 0) {
        e.preventDefault();
        return;
      }
      const first = current[0];
      const last = current[current.length - 1];
      const active = document.activeElement;
      if (
        e.shiftKey &&
        (active === first ||
          active === container ||
          !container.contains(active))
      ) {
        e.preventDefault();
        last.focus({ preventScroll: true });
      } else if (
        !e.shiftKey &&
        (active === last || !container.contains(active))
      ) {
        e.preventDefault();
        first.focus({ preventScroll: true });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus({ preventScroll: true });
    };
  }, []);

  return containerRef;
}
