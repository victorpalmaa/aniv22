'use client';
import { useRef, type CSSProperties } from 'react';
import { useSettledIndex } from '@/hooks/useSettledIndex';
import { useSwipe, useTouchMode } from '@/hooks/useSwipe';
import { DRINKS } from '@/lib/content';
import { ItemArt } from '../ItemArt';
import { useMotionPrefs } from '../providers/MotionPrefs';
import { useScene } from '@/hooks/useScene';
import { clamp, io, reduceMotion } from '@/lib/motion';
import { openItem } from '@/lib/detail';
import { Ride } from '../Ride';

const NB = DRINKS.length;
const STEP = 30; // graus entre posições do anel
/**
 * Offset circular de x em [-NB/2, NB/2). Com 7 bebidas e STEP 30°, o offset máximo é ±3.5 (±105°):
 * cada bebida tem um único botão, e a troca de lado acontece atrás do anel (|a| > 100°, escondida).
 * Isso substitui os 12 slots fixos com DRINKS[j % NB], que dessincronizavam depois de uma volta (12 não é múltiplo de 7).
 */
const wrap = (x: number) => ((((x + NB / 2) % NB) + NB) % NB) - NB / 2;
const mod = (x: number) => ((x % NB) + NB) % NB;

/** 4 · Bar: carrossel em anel 3D. A da frente sobe e acende; o nome troca como letreiro. */
export function Bar() {
  const chRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const namesRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLElement>(null);
  const dotRef = useRef<HTMLElement>(null);
  const cur = useRef(-1);
  const ringW = useRef(400); // largura do palco, medida só no resize
  // frente do anel: único slot com WebGL, e só depois que a rolagem para (useSettledIndex)
  const frontRef = useRef(-1);
  const frontSlot = useSettledIndex(frontRef);
  const { detail } = useMotionPrefs();
  // celular/tablet: arrastar para o lado gira o anel (mesmo gesto da Mesa); rolar para baixo sai da seção
  const touch = useTouchMode();
  const touchRef = useRef(false); // useScene registra o callback uma vez: lê o modo por ref
  touchRef.current = touch;
  const swipe = useSwipe(stageRef, {
    enabled: touch,
    steps: NB,
    pxPerStep: () => Math.min(ringW.current * 0.5, 260),
    onP: (p) => render(p * (NB - 1)),
    loop: true, // gira sem fim para os dois lados; depois da Água volta a Heineken
  });

  useScene(
    chRef,
    (p0) => {
      if (touchRef.current) return;
      const p = p0 * (NB - 1);
      // desktop: pausa em cada bebida, o giro acontece no meio do trecho, como um passo
      const i = Math.min(NB - 2, Math.floor(p)), f = p - i;
      let pos = reduceMotion() ? Math.round(p) : i + io(clamp((f - 0.2) / 0.6, 0, 1));
      if (p >= NB - 1) pos = NB - 1;
      render(pos);
    },
    {
      offset: 'top',
      span: (el) => el.offsetHeight - stageRef.current!.offsetHeight,
      measure: () => {
        ringW.current = stageRef.current!.clientWidth;
        if (touchRef.current) render(swipe.progress() * (NB - 1));
      },
    },
  );

  // desenha o anel na posição pos (desktop: 0..NB-1 pela rolagem; toque: qualquer real, loop infinito)
  function render(pos: number) {
      const stage = stageRef.current;
      if (!stage || !ringRef.current) return;
      const R = Math.min(ringW.current * 0.62, 520);
      let fs = -1;
      ringRef.current!.querySelectorAll<HTMLElement>('.drink').forEach((el, j) => {
        const a = wrap(j - pos) * STEP; // ângulo relativo à frente, -105..105
        const vis = Math.abs(a) < 100;
        el.style.visibility = vis ? 'visible' : 'hidden';
        if (!vis) return;
        const rad = (a * Math.PI) / 180, front = Math.max(0, 1 - Math.abs(a) / STEP);
        const x = Math.sin(rad) * R, z = (Math.cos(rad) - 1) * R * 0.9, y = -Math.abs(Math.sin(rad)) * 30 - front * 18;
        el.style.transform = `translate(-50%,-50%) translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${z.toFixed(1)}px) rotateY(${(a * 0.35).toFixed(1)}deg) rotateZ(${(-6 + front * 3).toFixed(1)}deg) scale(${(1 + front * 0.08).toFixed(3)})`;
        // filter força repintura: degraus de 5% só repintam quando a diferença é visível
        const f = Math.round(front * 20) / 20;
        const filter = `brightness(${(0.36 + 0.64 * f).toFixed(2)}) saturate(${(0.6 + 0.4 * f).toFixed(2)})`;
        if (el.style.filter !== filter) el.style.filter = filter;
        el.style.zIndex = String(Math.round(100 - Math.abs(a)));
        el.toggleAttribute('data-front', front > 0.9);
        if (front > 0.9) fs = j;
      });
      namesRef.current!.querySelectorAll<HTMLElement>('.nm').forEach((el, k) => {
        const o = wrap(k - pos);
        el.style.setProperty('--ny', (o * 100).toFixed(1) + '%');
        el.style.setProperty('--no', Math.max(0, 1 - Math.abs(o) * 1.6).toFixed(2));
      });
      frontRef.current = fs;
      const m = mod(pos); // 0..NB, posição dentro da volta
      const c = mod(Math.round(pos));
      if (c !== cur.current) {
        cur.current = c;
        stage.style.setProperty('--glow', DRINKS[c].color ?? '');
      }
      // desktop: trilho linear de 0 a 1. Toque: posição na volta (m/NB), o ponto volta ao início depois da última
      const t = touchRef.current ? m / NB : clamp(pos / (NB - 1), 0, 1);
      fillRef.current!.style.transform = `scaleX(${t.toFixed(4)})`;
      dotRef.current!.style.left = (t * 100).toFixed(1) + '%';
  }

  // toque em qualquer bebida abre o detalhe dela, esteja na frente ou não (pedido do Victor)
  function onClick(e: React.MouseEvent) {
    const b = (e.target as HTMLElement).closest<HTMLElement>('.drink');
    if (b) openItem(b.dataset.id!, b);
  }

  return (
    <>
      <div className="anchor" id="bar" />
      <section className={`bar-ch bleed${touch ? ' swipe' : ''}`} id="barCh" ref={chRef} style={{ '--n': NB } as CSSProperties}>
        <div className="bar-stage" ref={stageRef}>
          <Ride word="BAR" bg="#0b0a08" color="var(--gold)" still />
          <div className="bar-scene">
            <div className="bar-glow" aria-hidden="true" />
            <div className="bar-ped" aria-hidden="true" />
            <div className="bar-ring" ref={ringRef} onClick={onClick}>
              {DRINKS.map((d, j) => (
                <button key={d.id} className="drink" type="button" data-slot={j} data-id={d.id} aria-label={d.name}>
                  <ItemArt it={d} className="art" active={j === frontSlot && !detail} />
                </button>
              ))}
            </div>
            {/* área de toque grande no centro: abre a bebida da frente (a garrafa sozinha era um alvo pequeno) */}
            <button
              className="bar-hit"
              type="button"
              aria-label="Ver a bebida da frente em 3D"
              onClick={() => {
                const b = ringRef.current?.querySelector<HTMLElement>('.drink[data-front]');
                if (b) openItem(b.dataset.id!, b);
              }}
            />
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
              <p className="bar-hint">{touch ? 'Arraste ↔ · toque para ver' : 'Role para escolher · toque para ver'}</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
