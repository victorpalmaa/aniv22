'use client';
import { useEffect, type RefObject } from 'react';
import { absTop, onScroll, vp } from '@/lib/scroll';
import { clamp } from '@/lib/motion';

export type Geo = { top: number; h: number; span: number };

/**
 * Padrão de cena fixa (container alto + filho sticky). Entrega o progresso 0→1 enquanto o
 * container passa pela tela. A geometria é medida só no resize; por frame, só scrollY.
 *  - offset: onde a cena começa a contar, em px a partir do topo da tela (ex.: altura do topo fixo)
 *  - span: quantos px de rolagem levam o progresso de 0 a 1
 *  - measure: medição extra da cena (larguras, alturas internas), roda junto da medição geral
 */
export function useScene(
  ref: RefObject<HTMLElement | null>,
  fn: (p: number, el: HTMLElement, g: Geo) => void,
  opts: { offset?: 'top' | 'none'; span?: (el: HTMLElement) => number; measure?: (el: HTMLElement) => void } = {},
) {
  useEffect(() => {
    const g: Geo = { top: 0, h: 0, span: 1 };
    return onScroll(
      () => {
        const el = ref.current;
        if (!el) return;
        // fora da tela: não escreve nada
        if (g.top + g.h < vp.y || g.top > vp.y + vp.vh) return;
        const off = opts.offset === 'top' ? vp.hh : 0;
        fn(clamp((vp.y + off - g.top) / g.span, 0, 1), el, g);
      },
      () => {
        const el = ref.current;
        if (!el) return;
        opts.measure?.(el);
        g.top = absTop(el);
        g.h = el.offsetHeight;
        g.span = Math.max(1, opts.span ? opts.span(el) : g.h - vp.vh);
      },
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}

/** Progresso de um painel subindo da base da tela até grudar sob o topo (palavra gigante, mapa). */
export const riseProgress = (g: Geo) => clamp(1 - (g.top - vp.y - vp.hh) / (vp.vh - vp.hh), 0, 1);
