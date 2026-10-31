'use client';
import { useRef, type CSSProperties } from 'react';
import { ART, DRINKS } from '@/lib/content';
import { useScene } from '@/hooks/useScene';
import { clamp, io, reduceMotion, topH } from '@/lib/motion';
import { openItem } from '@/lib/detail';
import { Ride } from '../Ride';

const NB = DRINKS.length;
const STEP = 30; // graus entre posições do anel
const SLOTS = 12; // 12 posições no anel, as bebidas se repetem

/** 4 · Bar: carrossel em anel 3D. A da frente sobe e acende; o nome troca como letreiro. */
export function Bar() {
  const chRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const namesRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLElement>(null);
  const dotRef = useRef<HTMLElement>(null);
  const cur = useRef(-1);

  useScene(
    chRef,
    (p0) => {
      const stage = stageRef.current!;
      const p = p0 * (NB - 1);
      // pausa em cada bebida: o giro acontece no meio do trecho, como um passo
      const i = Math.min(NB - 2, Math.floor(p)), f = p - i;
      let pos = reduceMotion() ? Math.round(p) : i + io(clamp((f - 0.2) / 0.6, 0, 1));
      if (p >= NB - 1) pos = NB - 1;
      const W = stage.clientWidth, R = Math.min(W * 0.62, 520), rot = pos * STEP;
      ringRef.current!.querySelectorAll<HTMLElement>('.drink').forEach((el, j) => {
        const a = ((((j * STEP - rot) % 360) + 540) % 360) - 180; // ângulo relativo à frente, -180..180
        const vis = Math.abs(a) < 100;
        el.style.visibility = vis ? 'visible' : 'hidden';
        if (!vis) return;
        const rad = (a * Math.PI) / 180, front = Math.max(0, 1 - Math.abs(a) / STEP);
        const x = Math.sin(rad) * R, z = (Math.cos(rad) - 1) * R * 0.9, y = -Math.abs(Math.sin(rad)) * 30 - front * 18;
        el.style.transform = `translate(-50%,-50%) translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${z.toFixed(1)}px) rotateY(${(a * 0.45).toFixed(1)}deg) rotateZ(${(-10 + front * 4).toFixed(1)}deg) scale(${(1 + front * 0.12).toFixed(3)})`;
        el.style.filter = `brightness(${(0.28 + 0.72 * front).toFixed(2)}) saturate(${(0.5 + 0.5 * front).toFixed(2)})`;
        el.style.zIndex = String(Math.round(100 - Math.abs(a)));
        el.toggleAttribute('data-front', front > 0.9);
      });
      namesRef.current!.querySelectorAll<HTMLElement>('.nm').forEach((el, k) => {
        const o = k - pos;
        el.style.setProperty('--ny', (o * 100).toFixed(1) + '%');
        el.style.setProperty('--no', Math.max(0, 1 - Math.abs(o) * 1.6).toFixed(2));
      });
      const c = Math.round(pos);
      if (c !== cur.current) {
        cur.current = c;
        stage.style.setProperty('--glow', DRINKS[c].color ?? '');
      }
      const t = ((pos / (NB - 1)) * 100).toFixed(1) + '%';
      fillRef.current!.style.width = t;
      dotRef.current!.style.left = t;
    },
    { offset: topH, span: (el) => el.offsetHeight - stageRef.current!.offsetHeight },
  );

  // toque: na da frente abre o detalhe; nas outras, rola até ela virar a da frente
  function onClick(e: React.MouseEvent) {
    const b = (e.target as HTMLElement).closest<HTMLElement>('.drink');
    if (!b) return;
    if (b.hasAttribute('data-front')) return openItem(b.dataset.id!, b);
    const k = DRINKS.findIndex((d) => d.id === b.dataset.id);
    const ch = chRef.current!, span = ch.offsetHeight - stageRef.current!.offsetHeight;
    const top = ch.getBoundingClientRect().top + window.scrollY - topH() + span * (k / (NB - 1));
    window.scrollTo({ top, behavior: reduceMotion() ? 'auto' : 'smooth' });
  }

  return (
    <>
      <div className="anchor" id="bar" />
      <section className="bar-ch bleed" id="barCh" ref={chRef} style={{ '--n': NB } as CSSProperties}>
        <div className="bar-stage" ref={stageRef}>
          <Ride word="BAR" bg="#0b0a08" color="var(--gold)" still />
          <div className="bar-scene">
            <div className="bar-glow" aria-hidden="true" />
            <div className="bar-ped" aria-hidden="true" />
            <div className="bar-ring" ref={ringRef} onClick={onClick}>
              {Array.from({ length: SLOTS }, (_, j) => {
                const d = DRINKS[j % NB];
                return (
                  <button key={j} className="drink" type="button" data-slot={j} data-id={d.id} aria-label={d.name} tabIndex={j < NB ? 0 : -1}>
                    <span className="art" dangerouslySetInnerHTML={{ __html: ART[d.id] }} />
                  </button>
                );
              })}
            </div>
            <div className="bar-names" ref={namesRef} aria-live="polite">
              {DRINKS.map((d) => (
                <div key={d.id} className="nm">
                  <b>{d.label?.[0]}</b>
                  <span>{d.label?.[1] || ' '}</span>
                </div>
              ))}
            </div>
            <div className="bar-ui">
              <div className="bar-track" aria-hidden="true">
                <b ref={fillRef} />
                <i ref={dotRef} />
              </div>
              <p className="bar-hint">Role para escolher · toque para ver</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
