'use client';
import { useRef } from 'react';
import { useScene } from '@/hooks/useScene';
import { clamp, io, reduceMotion } from '@/lib/motion';

const Orn = () => (
  <svg className="orn" viewBox="0 0 200 16" aria-hidden="true">
    <path d="M2 8 H80 M120 8 H198" stroke="currentColor" strokeWidth="1" />
    <path d="M100 1 L107 8 L100 15 L93 8 Z" fill="none" stroke="currentColor" strokeWidth="1" />
    <circle cx="100" cy="8" r="2" fill="currentColor" />
    <circle cx="86" cy="8" r="1.4" fill="currentColor" />
    <circle cx="114" cy="8" r="1.4" fill="currentColor" />
  </svg>
);

/** 1 · Abertura: convite gatefold. O lacre se parte, as abas abrem em 3D e o cartão cresce com a rolagem. */
export function Opening() {
  const secRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const invRef = useRef<HTMLDivElement>(null);
  const lRef = useRef<HTMLDivElement>(null);
  const rRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);

  // medidas do resize: largura final do cartão e tamanho inicial (fechado)
  const size = useRef({ w0: 260, w1: 260 });

  useScene(
    secRef,
    (p0, xp) => {
      const inv = invRef.current!, L = lRef.current!, R = rRef.current!;
      const p = reduceMotion() ? 1 : p0;
      const seg = (a: number, b: number) => clamp((p - a) / (b - a), 0, 1);
      // linha do tempo: lacre parte e abas abrem (8–62%), cartão cresce (40–92%), abas somem no fim
      const open = io(seg(0.08, 0.62)), grow = io(seg(0.4, 0.92));
      const { w0, w1 } = size.current;
      const w = w0 * (1 + 0.04 * seg(0, 0.12)) + (w1 - w0 * 1.04) * grow;
      // o cartão tem a largura final fixa e cresce por scale: só compositor, sem relayout do texto
      inv.style.transform = `translate(-50%,-50%) rotateX(${((1 - grow) * 9).toFixed(2)}deg) scale(${(w / w1).toFixed(4)})`;
      const ang = open * 168;
      L.style.transform = `rotateY(${(-ang).toFixed(2)}deg)`;
      R.style.transform = `rotateY(${ang.toFixed(2)}deg)`;
      // Safari ignora backface-visibility quando o 3D é achatado (opacity no pai, por exemplo):
      // a troca frente/verso é feita aqui, pelo ângulo, e o fade vai nas faces, não na aba
      const showBack = ang > 90;
      const fo = (1 - seg(0.72, 0.95)).toFixed(3);
      for (const flap of [L, R]) {
        const [front, back] = flap.children as unknown as HTMLElement[];
        front.style.visibility = showBack ? 'hidden' : 'visible';
        back.style.visibility = showBack ? 'visible' : 'hidden';
        front.style.opacity = fo;
        back.style.opacity = fo;
        front.style.setProperty('--shade', (Math.sin(open * Math.PI) * 0.45).toFixed(3));
      }
      inv.style.setProperty('--gx', (25 + open * 55).toFixed(1) + '%'); // brilho da folha corre enquanto abre
      hintRef.current!.style.opacity = (1 - seg(0, 0.08)).toFixed(3);
      bgRef.current!.style.opacity = (1 - 0.65 * grow).toFixed(3);
    },
    {
      measure: (xp) => {
        xp.classList.toggle('static', reduceMotion());
        const st = stageRef.current!;
        const vw = st.clientWidth, vh = st.clientHeight;
        const w0 = Math.min(vw * 0.62, 300), w1 = Math.min(vw * 0.92, vh * 0.84 * 0.75);
        size.current = { w0, w1 };
        invRef.current!.style.setProperty('--w', w1.toFixed(1) + 'px');
      },
      span: (el) => el.offsetHeight - stageRef.current!.clientHeight,
    },
  );

  return (
    <section className="xp bleed" id="topo" ref={secRef}>
      <div className="xp-stage" ref={stageRef}>
        <div className="xp-bg" ref={bgRef} aria-hidden="true" />
        <div className="inv" ref={invRef} aria-hidden="true">
          <div className="inv-inner">
            <Orn />
            <span className="ii-k">Victor tem o prazer de convidar você para</span>
            <span className="ii-t">
              Parme <i className="foil">&amp;</i> Gala
            </span>
            <Orn />
            <span className="ii-d">Sexta-feira · 15 de janeiro de 2027</span>
            <span className="ii-h">às vinte horas</span>
            <span className="ii-k">Traje de gala</span>
            <span className="ii-s">Confirme até 05 de janeiro</span>
          </div>
          <div className="flap l" ref={lRef}>
            <div className="face f-front">
              <span className="fk">Victor</span>
              <span className="fw foil">Parme</span>
              <span className="fk">15 · 01</span>
              <span className="seal-h">
                <b className="foil">V</b>
              </span>
            </div>
            <div className="face f-back" />
          </div>
          <div className="flap r" ref={rRef}>
            <div className="face f-front">
              <span className="fk">convida</span>
              <span className="fw foil">
                <i>&amp;</i> Gala
              </span>
              <span className="fk">2027</span>
              <span className="seal-h">
                <b className="foil">V</b>
              </span>
            </div>
            <div className="face f-back" />
          </div>
        </div>
        <p className="xp-hint" ref={hintRef} aria-hidden="true">
          Role para abrir o convite <span>↓</span>
        </p>
        <h1 className="sr-only">Parme &amp; Gala: aniversário do Victor, sexta, 15 de janeiro de 2027, às 20h</h1>
      </div>
    </section>
  );
}
