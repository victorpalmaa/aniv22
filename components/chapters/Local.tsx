'use client';
import { useRef } from 'react';
import { riseProgress, useScene } from '@/hooks/useScene';
import { reduceMotion } from '@/lib/motion';
import { Ride } from '../Ride';

// Traçado a partir do print do Google Maps do local (Av. Vinte e Nove de Abril, 350, Vila Santa Clara),
// em coordenadas do próprio print (1179x1115). MAP_K é a escala print → tela; o pino do Google (490,640)
// fica em ANCHOR na tela. Rótulos e pins usam at(), então dá para mexer só nesses dois números.
const MAP_K = 0.7;
const PIN = { x: 490, y: 640 };
const ANCHOR = { x: 420, y: 285 };
const at = (x: number, y: number): [number, number] => [+(ANCHOR.x + MAP_K * (x - PIN.x)).toFixed(1), +(ANCHOR.y + MAP_K * (y - PIN.y)).toFixed(1)];
const pt = (x: number, y: number) => at(x, y).join(' ');
const DOOR = at(500, 632);

/** Rótulo de rua: ponto no traçado original + deslocamento em unidades de tela (não escala com o mapa). */
function Lbl({ p: [x, y], d = [0, 0], rot = 0, anchor, far, children }: { p: [number, number]; d?: [number, number]; rot?: number; anchor?: 'middle' | 'end'; far?: boolean; children: string }) {
  const [sx, sy] = at(x, y);
  const lx = +(sx + d[0]).toFixed(1), ly = +(sy + d[1]).toFixed(1);
  return (
    <text className={far ? 'map-lbl lbl-far' : 'map-lbl'} x={lx} y={ly} textAnchor={anchor} transform={rot ? `rotate(${rot} ${lx} ${ly})` : undefined}>
      {children}
    </text>
  );
}

// Sem coordenadas ainda: os três apps resolvem pelo endereço. Quando COORDS chegar, o pino fica exato.
const ADDRESS = 'Avenida 29 de Abril, 350, Itatiba - SP';
const COORDS = null as { lat: number; lng: number } | null;
const DEST = COORDS ? `${COORDS.lat},${COORDS.lng}` : encodeURIComponent(ADDRESS);
const LINKS = {
  waze: COORDS ? `https://waze.com/ul?ll=${DEST}&navigate=yes` : `https://waze.com/ul?q=${DEST}&navigate=yes`,
  apple: `https://maps.apple.com/?daddr=${DEST}`,
  google: `https://www.google.com/maps/dir/?api=1&destination=${DEST}`,
};

/** 9 · Local: último capítulo. Mapa ilustrativo que aproxima com o scroll; Waze como botão principal. */
export function Local() {
  const ref = useRef<HTMLDivElement>(null);
  const pinsSet = useRef(false);
  useScene(ref, (_p, el, g) => {
    const p = riseProgress(g);
    el.style.setProperty('--mz', reduceMotion() ? '1' : (1.15 - 0.15 * p).toFixed(4));
    if (p > 0.7 && !pinsSet.current) {
      pinsSet.current = true;
      el.classList.add('pins-in');
    }
  });

  const Btn = ({ href, cls, children }: { href?: string; cls: string; children: string }) =>
    href ? (
      <a className={cls} href={href} target="_blank" rel="noopener">
        {children}
      </a>
    ) : (
      <button className={cls} type="button" disabled title="O link entra quando o endereço chegar">
        {children}
      </button>
    );

  return (
    <>
      <div className="anchor" id="local" />
      <div className="stack-panel paper bleed" id="locPanel" ref={ref}>
        <Ride word="LOCAL" bg="var(--paper)" color="var(--wine)" />
        <h3 className="sr-only">Local da festa</h3>
        <div className="map-wrap">
          <div className="leaves light" aria-hidden="true" />
          <svg className="map" viewBox="0 0 800 560" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Mapa ilustrativo do local da festa">
            <rect width="800" height="560" fill="var(--paper)" />
            {/* traçado do print do Google Maps; ruas que encostavam na borda do print foram estendidas para fora,
                porque o recorte (slice) do celular mostra mais para os lados. Traço não escala (.map-base). */}
            <g className="map-base" transform={`translate(${ANCHOR.x - MAP_K * PIN.x} ${ANCHOR.y - MAP_K * PIN.y}) scale(${MAP_K})`}>
              {/* Av. Vinte e Nove de Abril */}
              <path d="M430 -400 L 455 0 L 470 250 L 490 410 L 515 660 L 540 850 L 560 1115 L 590 1500" fill="none" stroke="var(--map-road)" strokeWidth="18" strokeLinecap="round" />
              <g stroke="var(--map-street)" strokeWidth="11" fill="none" strokeLinecap="round" strokeLinejoin="round">
                {/* R. Domingos Pretti */}
                <path d="M-500 1060 L 0 1000 L 300 965 L 560 925 L 800 890 L 1179 830 L 1700 760" />
                {/* diagonal da esquerda até a avenida */}
                <path d="M-500 760 L 0 580 L 250 500 L 490 405" />
                {/* diagonal da direita (mão única) */}
                <path d="M520 -200 L 610 0 L 700 170 L 800 350 L 880 510 L 1000 420 L 1179 300 L 1500 80" />
                {/* paralela à direita da avenida */}
                <path d="M900 -200 L 830 20 L 720 330 L 690 470 L 678 700 L 690 800 L 720 1000 L 760 1115 L 800 1400" />
                {/* rua de cima */}
                <path d="M-500 200 L 0 110 L 300 62 L 460 92" />
              </g>
              <g stroke="var(--map-street)" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M690 790 L 1030 660 L 995 520" />
                <path d="M40 460 L 120 740 L 180 830 L 210 1115 L 230 1400" />
                <path d="M245 510 L 270 800 L 300 1000 L 320 1400" />
                <path d="M-300 880 L 0 800 L 140 740" />
                <path d="M400 450 L 405 520 L 380 770" />
                {/* viela ao lado do número 350 */}
                <path d="M405 660 L 512 670" />
                <path d="M438 795 L 435 860 L 378 855" />
                <path d="M880 1400 L 870 940 L 1179 880 L 1600 840" />
                <path d="M380 1000 L 410 1115 L 430 1400" />
                <path d="M110 1030 L 130 1100" />
                <path d="M810 350 Q 860 320 910 230" />
                <path d="M885 355 L 970 290 M935 330 L 1000 410" />
              </g>
            </g>
            <Lbl p={[478, 300]} d={[16, 0]} rot={84}>
              Av. 29 de Abril
            </Lbl>
            <Lbl p={[360, 950]} d={[0, -12]} rot={-7} anchor="middle">
              R. Domingos Pretti
            </Lbl>
            <path className="route" d={`M${pt(455, 0)} L ${pt(470, 250)} L ${pt(490, 410)} L ${pt(512, 620)} L ${DOOR.join(' ')}`} fill="none" />
            {/* estacionamento: logo abaixo da viela, colado na avenida (posição marcada pelo Victor) */}
            <g className="pin p-park" transform={`translate(${pt(500, 738)})`} style={{ transitionDelay: '0s' }}>
              <circle r="16" fill="var(--wine)" />
              <text y="6" textAnchor="middle" className="pin-t">
                P
              </text>
              <text className="map-lbl" y="38" textAnchor="middle">
                Estacionamento
              </text>
            </g>
            <g className="pin p-door" transform={`translate(${DOOR.join(' ')})`} style={{ transitionDelay: '.09s' }}>
              <circle r="7" fill="var(--gold)" stroke="var(--ink)" strokeWidth="2" />
              <text className="map-lbl" x="-14" y="26" textAnchor="end">
                Entrada
              </text>
            </g>
            <g className="pin p-main" transform={`translate(${DOOR[0] - 14} ${DOOR[1] - 14})`} style={{ transitionDelay: '.18s' }}>
              <rect x="-22" y="-52" width="44" height="44" fill="var(--ink)" />
              <path d="M-6 -8 L0 2 L6 -8z" fill="var(--ink)" />
              <text y="-23" textAnchor="middle" className="pin-m">
                P&amp;G
              </text>
            </g>
          </svg>
        </div>
        <div className="map-foot">
          <div className="addr">
            <b>Recanto Colonial</b>
            <span>Avenida 29 de Abril, 350 · Itatiba, SP</span>
          </div>
          <div className="row">
            <Btn href={LINKS.waze} cls="btn-ink">
              Abrir no Waze
            </Btn>
            <Btn href={LINKS.apple} cls="ghost-ink">
              Apple Maps
            </Btn>
            <Btn href={LINKS.google} cls="ghost-ink">
              Google Maps
            </Btn>
          </div>
        </div>
      </div>
      <footer className="proto bleed">
        <span>Parme &amp; Gala · 15.01.2027</span>
      </footer>
    </>
  );
}
