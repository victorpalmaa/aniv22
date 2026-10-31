'use client';
import { useRef, type CSSProperties } from 'react';
import { useScene } from '@/hooks/useScene';
import { clamp, reduceMotion, topH } from '@/lib/motion';

/**
 * Palavra gigante espaçada na borda de cima do capítulo. A faixa tem a cor do PRÓPRIO capítulo
 * (Victor reprovou a cor do anterior por contraste). As letras sobem em cascata conforme o painel
 * sobe da base da tela até grudar no topo.
 */
export function Ride({ word, bg, color, still = false }: { word: string; bg: string; color: string; still?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const letters = [...word];
  useScene(
    ref,
    (_p, el) => {
      if (still) return; // no Bar a palavra fica parada, como no protótipo
      const hh = topH(), vh = window.innerHeight;
      const p = clamp(1 - (el.getBoundingClientRect().top - hh) / (vh - hh), 0, 1);
      const flat = reduceMotion();
      ref.current?.querySelectorAll('span').forEach((sp, i) => {
        const q = flat ? 1 : clamp((p - i * 0.05) / 0.55, 0, 1);
        (sp as HTMLElement).style.setProperty('--rise', ((1 - q) * 100).toFixed(1) + '%');
      });
    },
  );
  return (
    <div className="ride" aria-hidden="true" ref={ref} style={{ '--n': letters.length, '--rb': bg, '--rc': color } as CSSProperties}>
      {letters.map((c, i) => (
        <span key={i}>{c === ' ' ? ' ' : c}</span>
      ))}
    </div>
  );
}
