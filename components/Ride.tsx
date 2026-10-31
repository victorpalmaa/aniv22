'use client';
import { useEffect, useRef, type CSSProperties } from 'react';
import { riseProgress, type Geo } from '@/hooks/useScene';
import { absTop, onScroll, vp } from '@/lib/scroll';
import { clamp, reduceMotion } from '@/lib/motion';

/**
 * Palavra gigante espaçada na borda de cima do capítulo. A faixa tem a cor do PRÓPRIO capítulo
 * (Victor reprovou a cor do anterior por contraste). As letras sobem em cascata conforme o
 * capítulo sobe da base da tela até grudar no topo.
 * Mede o capítulo, não a palavra: dentro de um sticky a posição da palavra não muda com o scroll.
 */
export function Ride({ word, bg, color, still = false }: { word: string; bg: string; color: string; still?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const letters = [...word];

  useEffect(() => {
    if (still) return; // no Bar a palavra fica parada, como no protótipo
    const g: Geo = { top: 0, h: 0, span: 1 };
    let spans: HTMLElement[] = [];
    let last = -1;
    return onScroll(
      () => {
        if (g.top > vp.y + vp.vh || g.top + g.h < vp.y) return;
        const p = riseProgress(g);
        if (p === last) return; // grudado ou longe: nada muda, nada escreve
        last = p;
        const flat = reduceMotion();
        spans.forEach((sp, i) => {
          const q = flat ? 1 : clamp((p - i * 0.05) / 0.55, 0, 1);
          sp.style.transform = `translate3d(0, ${((1 - q) * 100).toFixed(1)}%, 0)`;
        });
      },
      () => {
        const el = ref.current;
        if (!el) return;
        const scope = el.closest('section, .stack-panel') ?? el;
        g.top = absTop(scope);
        g.h = (scope as HTMLElement).offsetHeight;
        spans = [...el.querySelectorAll<HTMLElement>('span')];
        last = -1;
      },
    );
  }, [still]);

  return (
    <div className="ride" aria-hidden="true" ref={ref} style={{ '--n': letters.length, '--rb': bg, '--rc': color } as CSSProperties}>
      {letters.map((c, i) => (
        <span key={i}>{c === ' ' ? ' ' : c}</span>
      ))}
    </div>
  );
}
