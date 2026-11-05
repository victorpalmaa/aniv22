'use client';
import { useRef, type CSSProperties, type ReactNode } from 'react';
import { useScene } from '@/hooks/useScene';
import { clamp, io, nums, reduceMotion } from '@/lib/motion';

/**
 * Cena fixa (Traje e Surpresa): container alto + palco sticky, progresso 0→1 pelo scroll.
 * Só escreve transform e opacity: as duas propriedades que o navegador anima na GPU sem repintar.
 * (A versão anterior animava clip-path em tela cheia sobre gradientes pesados; no iPhone isso
 * repintava a camada inteira a cada frame e era a origem das travadas.)
 *
 * Coreografia por data-atributos nos filhos, lidos só na medição (nunca por frame):
 *  - data-show="a,b[,c,d]"  opacidade entra de a→b e sai de c→d; data-fx="up|zoom" soma movimento
 *  - data-open="a,b"         cortina: abre (scaleX a partir da borda externa) de a→b
 *  - data-push="a,b"         aproximação lenta da foto (scale 1,1→1) de a→b
 *  - data-rise="a,b"         pano de boca subindo (vai para cima e franze de leve) de a→b
 *  data-fx="lift": entra subindo e, na saída (c→d), sobe e encolhe sem sumir, para emendar no bloco seguinte
 * Movimento reduzido: classe .static, camadas viram blocos empilhados sem animação.
 */
type Kind = 'show' | 'open' | 'push' | 'rise';
type Layer = { el: HTMLElement; kind: Kind; n: number[]; fx: string; last: string; vis?: boolean };

const seg = (p: number, a: number, b: number) => (b <= a ? (p >= a ? 1 : 0) : clamp((p - a) / (b - a), 0, 1));

export function Cine({ id, height, style, className = '', children }: { id?: string; height: string; style?: CSSProperties; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const m = useRef({ H: 0, flat: false, layers: [] as Layer[] });

  useScene(
    ref,
    (p) => {
      const { H, flat, layers } = m.current;
      if (flat) return;
      for (const L of layers) {
        let css: string;
        if (L.kind === 'show') {
          const [a, b, c = 2, d = 2] = L.n;
          const qi = io(seg(p, a, b)), qo = io(seg(p, c, d));
          const o = L.fx === 'lift' ? qi : qi * (1 - qo);
          const tf =
            L.fx === 'lift'
              ? `translate3d(0,${((1 - qi) * H * 0.06 - qo * H * 0.2).toFixed(1)}px,0) scale(${(1 - 0.14 * qo).toFixed(4)})`
              : L.fx === 'up'
              ? `translate3d(0,${((1 - qi) * H * 0.06 - qo * H * 0.04).toFixed(1)}px,0)`
              : L.fx === 'zoom'
                ? `scale(${(1.06 - 0.06 * qi - 0.04 * qo).toFixed(4)})`
                : '';
          css = `${o.toFixed(3)}|${tf}`;
          if (css === L.last) continue;
          L.el.style.opacity = o.toFixed(3);
          // visibility é herdada: trocar recalcula a subárvore inteira, então só escreve quando muda
          const vis = o > 0.001;
          if (vis !== L.vis) {
            L.vis = vis;
            L.el.style.visibility = vis ? 'visible' : 'hidden';
          }
          if (tf) L.el.style.transform = tf;
        } else if (L.kind === 'open') {
          // cortina franzindo para a borda: estreita e sobe de leve na barra, como quando é recolhida
          const q = io(seg(p, L.n[0], L.n[1]));
          css = `scaleX(${(1 - 0.84 * q).toFixed(4)}) translate3d(0,${(-q * H * 0.012).toFixed(1)}px,0)`;
          if (css === L.last) continue;
          L.el.style.transform = css;
        } else if (L.kind === 'rise') {
          const q = io(seg(p, L.n[0], L.n[1]));
          css = `translate3d(0,${(-q * 104).toFixed(2)}%,0) scaleY(${(1 - 0.1 * q).toFixed(4)})`;
          if (css === L.last) continue;
          L.el.style.transform = css;
        } else {
          const q = seg(p, L.n[0], L.n[1]);
          css = `scale(${(1.1 - 0.1 * q).toFixed(4)})`;
          if (css === L.last) continue;
          L.el.style.transform = css;
        }
        L.last = css;
      }
    },
    {
      offset: 'top',
      span: (el) => el.offsetHeight - el.querySelector<HTMLElement>('.cine-stage')!.offsetHeight,
      measure: (c) => {
        const flat = reduceMotion();
        c.classList.toggle('static', flat);
        const st = c.querySelector<HTMLElement>('.cine-stage')!;
        const layers: Layer[] = [];
        c.querySelectorAll<HTMLElement>('[data-show],[data-open],[data-push],[data-rise]').forEach((el) => {
          const kind: Kind = el.dataset.show ? 'show' : el.dataset.open ? 'open' : el.dataset.rise ? 'rise' : 'push';
          layers.push({ el, kind, n: nums(el.dataset[kind]!), fx: el.dataset.fx ?? '', last: '' });
          if (flat) el.style.cssText = el.style.cssText.replace(/(opacity|visibility|transform):[^;]+;?/g, '');
        });
        m.current = { H: st.clientHeight, flat, layers };
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
