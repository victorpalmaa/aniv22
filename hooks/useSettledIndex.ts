'use client';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { SWIPE_EVENT } from './useSwipe';

/**
 * Índice "assentado": o item em foco só é devolvido depois que a rolagem fica parada por `delay` ms.
 * Durante a rolagem devolve -1. Serve para ligar o WebGL só quando o convidado para num item:
 * criar contexto + compilar shader + subir texturas no meio do gesto derrubava a Mesa e o Bar
 * para 10 a 17 fps (medido com CPU 4x).
 * `ref` é escrito pelo loop de animação (sem estado React por frame); aqui só há setState quando muda.
 */
export function useSettledIndex(ref: RefObject<number>, delay = 300) {
  const [idx, setIdx] = useState(-1);
  const cur = useRef(-1);
  useEffect(() => {
    let t = 0;
    const set = (v: number) => {
      if (cur.current === v) return;
      cur.current = v;
      setIdx(v);
    };
    const arm = () => {
      // saiu do item ativo: solta o WebGL na hora; senão mantém enquanto rola sobre o mesmo item
      if (cur.current !== -1 && ref.current !== cur.current) set(-1);
      clearTimeout(t);
      t = window.setTimeout(() => set(ref.current ?? -1), delay);
    };
    window.addEventListener('scroll', arm, { passive: true });
    window.addEventListener(SWIPE_EVENT, arm); // arrastar Mesa/Bar no celular não rola a página
    arm();
    return () => {
      clearTimeout(t);
      window.removeEventListener('scroll', arm);
      window.removeEventListener(SWIPE_EVENT, arm);
    };
  }, [ref, delay]);
  return idx;
}
