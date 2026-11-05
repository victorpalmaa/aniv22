'use client';
import { useEffect, useRef } from 'react';
import { absTop, onScroll, vp } from '@/lib/scroll';
import { jump } from '@/lib/motion';

const NAV = [
  ['convite', 'Convite'],
  ['mesa', 'Mesa'],
  ['traje', 'Traje'],
  ['quem-vai', 'Quem vai'],
  ['surpresa', 'Surpresa'],
  ['duvidas', 'Dúvidas'],
  ['local', 'Local'],
] as const;

export function TopBar() {
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let current: string | null = null;
    let tops: [string, number][] = [];
    // scrollspy: destaca o capítulo visível e centraliza o item no menu
    return onScroll(
      () => {
        let cur: string | null = null;
        for (const [id, top] of tops) if (top - vp.y <= vp.vh * 0.45) cur = id;
        if (cur === current || !navRef.current) return;
        current = cur;
        navRef.current.querySelectorAll('a').forEach((a) => {
          const on = a.dataset.jump === cur;
          if (on) {
            a.setAttribute('aria-current', 'page');
            const nav = navRef.current!;
            nav.scrollTo({ left: a.offsetLeft - nav.clientWidth / 2 + a.offsetWidth / 2, behavior: 'smooth' });
          } else a.removeAttribute('aria-current');
        });
      },
      () => {
        tops = NAV.flatMap(([id]) => {
          const el = document.getElementById(id);
          return el ? [[id, absTop(el)] as [string, number]] : [];
        });
      },
    );
  }, []);

  return (
    <header className="top">
      <a className="brand" href="#topo" onClick={(e) => (e.preventDefault(), jump('topo'))}>
        Parme <b>&amp;</b> Varieté
      </a>
      <nav className="nav" aria-label="Seções" ref={navRef}>
        {NAV.map(([id, label]) => (
          <a key={id} href={`#${id}`} data-jump={id} onClick={(e) => (e.preventDefault(), jump(id))}>
            {label}
          </a>
        ))}
      </nav>
    </header>
  );
}
