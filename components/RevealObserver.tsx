'use client';
import { useEffect } from 'react';

/**
 * Entrada suave dos blocos marcados com data-reveal quando chegam à tela (opacity + translate,
 * uma vez só). A classe .reveal-on no <html> só entra com JS rodando: sem ela nada fica escondido.
 */
export function RevealObserver() {
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    const root = document.documentElement;
    root.classList.add('reveal-on');
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.01 },
    );
    document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return null;
}
