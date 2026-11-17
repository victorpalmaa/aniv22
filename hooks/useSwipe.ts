'use client';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { clamp, reduceMotion } from '@/lib/motion';

/** Celular/tablet: dedo, sem mouse. Mesa e Bar viram carrossel de arrastar para o lado. */
export function useTouchMode() {
  const [touch, setTouch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(hover: none) and (pointer: coarse)');
    const on = () => setTouch(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return touch;
}

type Opts = {
  enabled: boolean;
  /** número de paradas (itens). O progresso vai de 0 a 1 e encaixa em i/(steps-1) */
  steps: number;
  /** quantos px de arraste andam um item */
  pxPerStep: () => number;
  /** recebe o progresso 0..1 a cada frame em que ele muda (sem estado React) */
  onP: (p: number) => void;
};

/**
 * Arrastar na horizontal com o dedo, rolagem vertical continua com a página.
 * touch-action: pan-y (no CSS) faz o navegador decidir pelo eixo: vertical rola a página, horizontal chega aqui.
 * Solto o dedo, segue com o embalo e encaixa no item mais próximo. Toque curto continua sendo clique.
 * Devolve goTo(i) para teclado/foco.
 */
export function useSwipe(ref: RefObject<HTMLElement | null>, o: Opts) {
  const opts = useRef(o);
  opts.current = o;
  const st = useRef({ p: 0, raf: 0 });
  const goRef = useRef<(i: number) => void>(() => {});

  useEffect(() => {
    const el = ref.current;
    if (!el || !o.enabled) return;
    const S = st.current;
    const last = () => Math.max(1, opts.current.steps - 1);
    const set = (p: number) => {
      S.p = p;
      opts.current.onP(p);
    };
    const animTo = (target: number) => {
      cancelAnimationFrame(S.raf);
      const from = S.p, t0 = performance.now();
      const dur = reduceMotion() ? 0 : clamp(Math.abs(target - from) * last() * 260, 220, 560);
      const step = (now: number) => {
        const k = dur ? Math.min(1, (now - t0) / dur) : 1;
        set(from + (target - from) * (1 - Math.pow(1 - k, 3))); // ease-out cúbico
        if (k < 1) S.raf = requestAnimationFrame(step);
      };
      S.raf = requestAnimationFrame(step);
    };
    goRef.current = (i: number) => animTo(clamp(i, 0, last()) / last());

    let id = -1, x0 = 0, p0 = 0, moved = false, lx = 0, lt = 0, v = 0;
    const down = (e: PointerEvent) => {
      if (id !== -1 || (e.pointerType === 'mouse' && e.button !== 0)) return;
      cancelAnimationFrame(S.raf);
      id = e.pointerId; x0 = lx = e.clientX; lt = e.timeStamp; p0 = S.p; moved = false; v = 0;
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      const dx = e.clientX - x0;
      if (!moved && Math.abs(dx) > 6) {
        moved = true;
        el.setPointerCapture?.(id);
      }
      if (!moved) return;
      const span = opts.current.pxPerStep() * last();
      const dt = Math.max(1, e.timeStamp - lt);
      v = 0.8 * v + 0.2 * ((lx - e.clientX) / span / dt); // progresso por ms
      lx = e.clientX; lt = e.timeStamp;
      // borda elástica: passa um pouco do fim e volta
      let p = p0 - dx / span;
      if (p < 0) p *= 0.35;
      if (p > 1) p = 1 + (p - 1) * 0.35;
      set(p);
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      id = -1;
      if (!moved) return;
      // embalo: projeta ~180 ms e encaixa no item; no máximo 2 itens por gesto
      const n = last();
      const proj = S.p + clamp(v * 180, -2 / n, 2 / n);
      animTo(clamp(Math.round(proj * n) / n, 0, 1));
    };
    // arraste não vira clique no item embaixo do dedo
    const click = (e: MouseEvent) => {
      if (moved) {
        e.stopPropagation();
        e.preventDefault();
        moved = false;
      }
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('click', click, true);
    set(S.p);
    return () => {
      cancelAnimationFrame(S.raf);
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.removeEventListener('click', click, true);
    };
  }, [ref, o.enabled, o.steps]);

  return { goTo: (i: number) => goRef.current(i), progress: () => st.current.p };
}
