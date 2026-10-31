'use client';
import { useRef, type CSSProperties, type ReactNode } from 'react';
import { useScene } from '@/hooks/useScene';
import { clamp, io, nums, reduceMotion } from '@/lib/motion';

/** Janela em arco (porta de teatro). Raios em px calculados por frame: % no clip-path é imprevisível. */
function arch(W: number, H: number, k: number) {
  const t = k * H * 0.26, bm = k * H * 0.22, sd = k * W * 0.33;
  const w = W - 2 * sd, h = H - t - bm;
  const rx = (w / 2) * Math.min(1, k * 1.6), ry = Math.min(h * 0.55, rx * 1.05);
  const r = (n: number) => n.toFixed(1) + 'px';
  return `inset(${r(t)} ${r(sd)} ${r(bm)} ${r(sd)} round ${r(rx)} ${r(rx)} ${r(k * 6)} ${r(k * 6)} / ${r(ry)} ${r(ry)} ${r(k * 6)} ${r(k * 6)})`;
}

/**
 * Cena fixa em camadas (Traje e Surpresa). As camadas declaram a coreografia por data-atributos,
 * como no protótipo: data-in="window|rise|split" + data-at="a,b", data-roll, data-list, data-line.
 * Movimento reduzido: a cena vira blocos empilhados (classe .static).
 */
export function Cine({ id, height, style, className = '', children }: { id?: string; height: string; style?: CSSProperties; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  // medidas do resize: palco e caixas das listas (nada disso é lido por frame)
  const m = useRef({ W: 0, H: 0, lists: new Map<HTMLElement, { box: number; h: number }>(), flat: false });
  useScene(
    ref,
    (p, c) => {
      if (m.current.flat) return;
      const { W, H } = m.current;
      const seg = (a: number, b: number) => clamp((p - a) / (b - a), 0, 1);
      c.querySelectorAll<HTMLElement>('.cl[data-in]').forEach((l) => {
        const [a, b] = nums(l.dataset.at!), q = io(seg(a, b));
        l.style.visibility = q <= 0 ? 'hidden' : 'visible';
        const k = 1 - q;
        l.style.clipPath =
          l.dataset.in === 'window' ? arch(W, H, k) : l.dataset.in === 'rise' ? `inset(${(k * 100).toFixed(2)}% 0 0 0)` : `inset(0 ${(k * 50).toFixed(2)}% 0 ${(k * 50).toFixed(2)}%)`;
        const cs = l.querySelector<HTMLElement>('.cs');
        if (cs) cs.style.transform = `scale(${(1.18 - 0.18 * q).toFixed(4)})`;
      });
      // letreiro: entra de cima e sai por baixo, cortado pela própria linha
      c.querySelectorAll<HTMLElement>('[data-roll]').forEach((el) => {
        const [ia, ib, oa, ob] = nums(el.dataset.roll!);
        el.style.setProperty('--ry', (-110 * (1 - io(seg(ia, ib))) + 110 * io(seg(oa, ob))).toFixed(2) + '%');
      });
      c.querySelectorAll<HTMLElement>('[data-list]').forEach((ul) => {
        const [a, b] = nums(ul.dataset.list!), t = seg(a, b);
        const { box, h } = m.current.lists.get(ul) ?? { box: 0, h: 0 };
        ul.style.transform = `translateY(${(box * 0.45 - t * (h - box * 0.2)).toFixed(1)}px)`;
      });
      c.querySelectorAll<HTMLElement>('[data-line]').forEach((ln) => {
        const [a, b] = nums(ln.dataset.line!), t = seg(a, b);
        ln.style.setProperty('--ls', io(t).toFixed(3));
        ln.style.setProperty('--lo', t > 0 && p < b + 0.06 ? '1' : '0');
      });
    },
    {
      offset: 'top',
      span: (el) => el.offsetHeight - el.querySelector<HTMLElement>('.cine-stage')!.offsetHeight,
      measure: (c) => {
        const flat = reduceMotion();
        c.classList.toggle('static', flat);
        const st = c.querySelector<HTMLElement>('.cine-stage')!;
        m.current.flat = flat;
        m.current.W = st.clientWidth;
        m.current.H = st.clientHeight;
        m.current.lists.clear();
        c.querySelectorAll<HTMLElement>('[data-list]').forEach((ul) => m.current.lists.set(ul, { box: ul.parentElement!.clientHeight, h: ul.offsetHeight }));
      },
    },
  );
  return (
    <section className={`cine ${className}`} id={id} ref={ref} style={{ '--cine-h': height, ...style } as CSSProperties}>
      {children}
    </section>
  );
}

/** Palavra gigante centralizada da primeira camada da cena */
export const CineWord = ({ word }: { word: string }) => (
  <div className="cw" aria-hidden="true" style={{ '--n': word.length } as CSSProperties}>
    {[...word].map((c, i) => (
      <span key={i}>{c}</span>
    ))}
  </div>
);
