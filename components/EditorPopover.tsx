
import React, { useCallback, useEffect, useRef, useState, useLayoutEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { EditableElementKey } from '../types';

type AnchorRect = Pick<DOMRectReadOnly, 'x' | 'y' | 'top' | 'left' | 'bottom' | 'right' | 'width' | 'height'>;

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const escapeAttributeValue = (value: string): string => {
  if (typeof window !== 'undefined' && window.CSS && typeof window.CSS.escape === 'function') {
    return window.CSS.escape(value);
  }
  return value.replace(/"/g, '\"');
};

export const cloneAnchorRect = (rect: DOMRect | DOMRectReadOnly | AnchorRect | null): AnchorRect | null => {
  if (!rect) {
    return null;
  }
  const { x, y, top, left, bottom, right, width, height } = rect;
  return { x, y, top, left, bottom, right, width, height };
};

interface EditorPopoverProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
  anchor: AnchorRect | null;
  elementId: EditableElementKey;
}

const EditorPopover: React.FC<EditorPopoverProps> = ({
  title,
  onClose,
  children,
  footer,
  anchor,
  elementId,
}) => {
  const headingId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [placement, setPlacement] = useState<'top' | 'bottom'>('top');
  const [isMounted, setIsMounted] = useState(false);
  const [isPositioned, setIsPositioned] = useState(false);
  const [arrowPosition, setArrowPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const updatePosition = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const node = containerRef.current;
    if (!node) {
      return;
    }

    const anchorSelector = `[data-element-id="${escapeAttributeValue(elementId)}"]`;
    const anchorElement = document.querySelector(anchorSelector) as HTMLElement | null;
    const rect = anchorElement?.getBoundingClientRect() ?? anchor;

    const { width: dialogWidth, height: dialogHeight } = node.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = window.innerHeight;
    const gutter = 16;
    const offset = 12;

    if (!rect) {
      const fallbackLeft = Math.max(gutter, (viewportWidth - dialogWidth) / 2);
      const fallbackTop = Math.max(gutter, (viewportHeight - dialogHeight) / 2);
      setPosition({ top: fallbackTop, left: fallbackLeft });
      setPlacement('top');
      setIsPositioned(true);
      setArrowPosition(null);
      return;
    }

    let top = rect.top - dialogHeight - offset;
    let currentPlacement: 'top' | 'bottom' = 'top';
    if (top < gutter) {
      top = rect.bottom + offset;
      currentPlacement = 'bottom';
    }

    if (top + dialogHeight > viewportHeight - gutter) {
      const availableAbove = rect.top - gutter;
      const availableBelow = viewportHeight - rect.bottom - gutter;
      if (availableAbove > availableBelow) {
        top = Math.max(gutter, rect.top - dialogHeight - offset);
        currentPlacement = 'top';
      } else {
        top = Math.min(viewportHeight - dialogHeight - gutter, rect.bottom + offset);
        currentPlacement = 'bottom';
      }
    }

    const desiredLeft = rect.left + rect.width / 2 - dialogWidth / 2;
    const maxLeft = viewportWidth - dialogWidth - gutter;
    const clampedLeft = Math.max(gutter, Math.min(desiredLeft, maxLeft));

    setPosition({ top, left: clampedLeft });
    setPlacement(currentPlacement);
    setIsPositioned(true);

    const arrowCenter = Math.max(
      clampedLeft + 12,
      Math.min(rect.left + rect.width / 2, clampedLeft + dialogWidth - 12),
    );
    const arrowTop = currentPlacement === 'top' ? top + dialogHeight - 6 : top - 6;
    setArrowPosition({ top: arrowTop, left: arrowCenter - 6 });
  }, [anchor, elementId]);

  useIsomorphicLayoutEffect(() => {
    if (!isMounted) {
      return;
    }
    updatePosition();
  }, [updatePosition, isMounted]);

  useEffect(() => {
    if (!isMounted) {
      return;
    }
    const handleScroll = () => updatePosition();
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);

    const anchorSelector = `[data-element-id="${escapeAttributeValue(elementId)}"]`;
    const anchorElement = document.querySelector(anchorSelector) as HTMLElement | null;
    const observers: ResizeObserver[] = [];
    if (typeof ResizeObserver !== 'undefined') {
      const resizeObserver = new ResizeObserver(() => updatePosition());
      if (anchorElement) {
        resizeObserver.observe(anchorElement);
      }
      const node = containerRef.current;
      if (node) {
        resizeObserver.observe(node);
      }
      observers.push(resizeObserver);
    }

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
      observers.forEach(observer => observer.disconnect());
    };
  }, [updatePosition, elementId, isMounted]);

  useEffect(() => {
    if (!isMounted) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === 'Tab') {
        const node = containerRef.current;
        if (!node) {
          return;
        }
        const focusable = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(element =>
          element.tabIndex !== -1 && !element.hasAttribute('disabled') && !element.getAttribute('aria-hidden'),
        );
        if (focusable.length === 0) {
          event.preventDefault();
          node.focus();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey) {
          if (document.activeElement === first || !node.contains(document.activeElement)) {
            event.preventDefault();
            last.focus();
          }
          return;
        }
        if (document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isMounted]);

  useEffect(() => {
    if (!isMounted) {
      return;
    }
    const node = containerRef.current;
    if (!node) {
      return;
    }
    const focusable = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    if (focusable.length > 0) {
      focusable[0].focus();
    }
  }, [isMounted]);

  if (!isMounted) {
    return null;
  }

  return createPortal(
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
      tabIndex={-1}
      className={`fixed z-50 w-full max-w-md rounded-lg bg-white p-4 shadow-xl focus:outline-none dark:bg-gray-800
        ${isPositioned ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      style={{ top: position.top, left: position.left }}
    >
      <div
        className={`absolute h-3 w-3 rotate-45 bg-white dark:bg-gray-800
          ${placement === 'top' ? 'bottom-[-6px]' : 'top-[-6px]'}`}
        style={{ left: arrowPosition?.left, top: arrowPosition?.top }}
      />
      <div className="flex items-center justify-between">
        <h2 id={headingId} className="text-lg font-semibold text-gray-900 dark:text-white">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:text-gray-500 dark:hover:bg-gray-700 dark:hover:text-gray-400"
        >
          <span className="sr-only">Close editor</span>
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      <div className="mt-4 space-y-4 overflow-y-auto max-h-[70vh] pr-2">
        {children}
      </div>
      <div className="mt-4 flex justify-end border-t border-gray-200 pt-4 dark:border-gray-700">
        {footer}
      </div>
    </div>,
    document.body,
  );
};

export default EditorPopover;

