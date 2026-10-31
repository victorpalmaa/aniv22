'use client';
import { useEffect, type RefObject } from 'react';
import { onFrame } from '@/lib/scroll';
import { clamp } from '@/lib/motion';

/**
 * Padrão de cena fixa (container alto + filho sticky). Entrega o progresso 0→1 enquanto o
 * container passa pela tela. A função escreve direto no DOM; nada de setState por frame.
 */
export function useScene(
  ref: RefObject<HTMLElement | null>,
  fn: (p: number, el: HTMLElement) => void,
  opts: { offset?: () => number; span?: (el: HTMLElement) => number } = {},
) {
  useEffect(() => {
    return onFrame(() => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      const off = opts.offset?.() ?? 0;
      const span = Math.max(1, opts.span ? opts.span(el) : el.offsetHeight - window.innerHeight);
      fn(clamp((off - r.top) / span, 0, 1), el);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
