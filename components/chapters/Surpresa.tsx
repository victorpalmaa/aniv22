'use client';
import { useEffect, useRef, useState } from 'react';
import { useParty } from '../providers/PartyProvider';
import { Cine, CineWord } from '../Cine';
import { getJSON, setJSON } from '@/lib/storage';
import { reduceMotion } from '@/lib/motion';
import { loadSurprise, type Surprise } from '@/lib/surprise';

type State = 'locked' | 'ready' | 'open';

/** 7 · Surpresa: cena fixa em 3 tempos + palco com cortina que só abre para confirmados. */
export function Surpresa() {
  const { me, openSheet } = useParty();
  const [opened, setOpened] = useState(false);
  const [nudge, setNudge] = useState(0);
  const [msg, setMsg] = useState(false);
  const [artist, setArtist] = useState<Surprise | null>(null);
  const [artistIn, setArtistIn] = useState(false);
  const palcoRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const state: State = !me ? 'locked' : opened ? 'open' : 'ready';

  useEffect(() => setOpened(!!getJSON('local', 'surp_open', 0)), []);
  useEffect(() => {
    if (!me) setOpened(false);
    else setMsg(false);
  }, [me]);

  useEffect(() => {
    if (state !== 'open') {
      setArtistIn(false);
      return;
    }
    let alive = true;
    loadSurprise().then((s) => {
      if (!alive) return;
      setArtist(s);
      requestAnimationFrame(() => requestAnimationFrame(() => alive && setArtistIn(true)));
    });
    return () => {
      alive = false;
    };
  }, [state]);

  function sparkle() {
    const palco = palcoRef.current;
    if (reduceMotion() || !palco?.animate) return;
    for (let i = 0; i < 26; i++) {
      const d = document.createElement('span');
      d.className = 'spark';
      d.style.left = 8 + Math.random() * 84 + '%';
      palco.appendChild(d);
      d.animate(
        [
          { transform: 'translateY(-10px)', opacity: 0 },
          { opacity: 1, offset: 0.15 },
          { transform: `translateY(${300 + Math.random() * 260}px) translateX(${(Math.random() - 0.5) * 60}px)`, opacity: 0 },
        ],
        { duration: 1800 + Math.random() * 1200, delay: 900 + Math.random() * 700, easing: 'cubic-bezier(.2,.6,.4,1)', fill: 'forwards' },
      ).onfinish = () => d.remove();
    }
  }

  function tryOpen() {
    if (!me) {
      // sem confirmação: a cortina só balança, a corda segura e aparece o aviso
      setNudge((n) => n + 1);
      setMsg(true);
      return;
    }
    if (opened) return;
    setOpened(true);
    setJSON('local', 'surp_open', 1);
    sparkle();
  }

  // reinicia a animação de "balançar" a cada toque
  useEffect(() => {
    const p = palcoRef.current;
    if (!p || !nudge) return;
    p.classList.remove('nudge');
    void p.offsetWidth;
    p.classList.add('nudge');
  }, [nudge]);

  return (
    <>
      <div className="anchor" id="surpresa" />
      <section className="chapter bleed" id="surpCh" style={{ ['--cb' as string]: 'var(--bg-2)' }}>
        <Cine id="surpCine" height="330svh">
          <div className="cine-stage">
            <div className="cl">
              <div className="cs stage-dark" />
              <CineWord word="SURPRESA" />
              <p className="cap">Só para quem confirmou presença</p>
            </div>
            <div className="cl" data-in="window" data-at=".14,.42">
              <div className="cs stage-red">
                <svg className="mic" viewBox="0 0 120 300" aria-hidden="true">
                  <rect x="48" y="20" width="24" height="44" rx="12" fill="#efe7d6" />
                  <path d="M60 64 V280 M30 280 H90" stroke="#a8864a" strokeWidth="5" strokeLinecap="round" />
                </svg>
              </div>
              <div className="side l">
                <small>Música</small>
                <b className="roll">
                  <span data-roll=".32,.42,.58,.66">Ao</span>
                </b>
              </div>
              <div className="side r">
                <small>Na festa</small>
                <b className="roll">
                  <span data-roll=".34,.44,.58,.66">
                    <i>vivo</i>
                  </span>
                </b>
              </div>
            </div>
            <div className="sline" data-line=".66,.72" aria-hidden="true" />
            <div className="cl plain" data-in="split" data-at=".72,.9" style={{ ['--pb' as string]: 'var(--bg-2)' }}>
              <p className="next">A cortina está logo abaixo ↓</p>
            </div>
          </div>
        </Cine>
        <div className="wrap">
          <header className="sec-head">
            <p className="eyebrow">Exclusivo para confirmados</p>
            <h2>
              Tem alguém <em>atrás da cortina</em>
            </h2>
            <p className="lede">
              {state === 'locked' ? 'Só abre para quem confirmou presença.' : state === 'ready' ? 'Você confirmou. A cortina abre para você.' : 'Nos vemos na pista.'}
            </p>
          </header>
          <div
            className="palco"
            ref={palcoRef}
            data-state={state}
            onClick={(e) => (e.target as Element).closest('.cortina, .valance') && tryOpen()}
          >
            <div className="palco-back" aria-hidden="true">
              <div className="floor" />
              <div className="spot" />
              <svg className="singer" viewBox="0 0 300 420" aria-hidden="true">
                <g fill="#1d1612">
                  <circle cx="150" cy="120" r="54" />
                  <path d="M50 420c0-110 44-190 100-190s100 80 100 190z" />
                </g>
                <path d="M210 250l-50 90" stroke="#a8864a" strokeWidth="9" strokeLinecap="round" />
                <rect x="200" y="214" width="26" height="42" rx="13" fill="#efe7d6" transform="rotate(28 213 235)" />
                <path d="M120 300c30 10 60 10 90 0l-6 22c-26 8-52 8-78 0z" fill="#3a2a1d" />
              </svg>
            </div>
            <p className="palco-name" aria-hidden="true">
              {state === 'open' && artist && (
                <>
                  <small>Ao vivo</small>
                  {artist.name}
                </>
              )}
            </p>
            <div className="cortina l" aria-hidden="true" />
            <div className="cortina r" aria-hidden="true" />
            <div className="valance" aria-hidden="true" />
            <div className="palco-cta">
              <p className="pk">A surpresa</p>
              <h3>Quem será que vai subir neste palco?</h3>
              <button className="btn-gold" type="button" ref={btnRef} onClick={tryOpen}>
                Toque para ver
              </button>
            </div>
            <button
              className="ghost sm palco-close"
              type="button"
              onClick={() => {
                setOpened(false);
                setJSON('local', 'surp_open', 0);
                btnRef.current?.focus({ preventScroll: true });
              }}
            >
              Fechar a cortina
            </button>
            <div className="rope" aria-hidden="true">
              <svg viewBox="0 0 400 120" preserveAspectRatio="none">
                <path d="M40 40 C 140 105, 260 105, 360 40" fill="none" stroke="#7a1624" strokeWidth="9" strokeLinecap="round" />
                <path d="M40 40 C 140 105, 260 105, 360 40" fill="none" stroke="#b02a3c" strokeWidth="3" strokeLinecap="round" opacity=".7" />
                <g fill="#d6b878">
                  <rect x="34" y="34" width="12" height="86" rx="3" />
                  <circle cx="40" cy="32" r="9" />
                  <rect x="354" y="34" width="12" height="86" rx="3" />
                  <circle cx="360" cy="32" r="9" />
                  <rect x="24" y="112" width="32" height="8" rx="3" />
                  <rect x="344" y="112" width="32" height="8" rx="3" />
                </g>
              </svg>
            </div>
            {state === 'locked' && msg && (
              <div className="palco-msg" role="status">
                <p>
                  <b>A cortina só abre para quem confirmou presença.</b>
                </p>
                <button className="btn-gold sm" type="button" onClick={() => openSheet()}>
                  Confirmar presença
                </button>
              </div>
            )}
          </div>
          {state === 'open' && artist && (
            <div className={`artist${artistIn ? ' in' : ''}`} aria-live="polite">
              <span className="artist-badge">
                <i />
                Confirmado
              </span>
              <h3>{artist.name}</h3>
              <p>
                {artist.role} <span className="tag">a confirmar</span>
              </p>
              <p>
                {artist.when} <span className="tag">a confirmar</span>
              </p>
              {artist.ig && (
                <a className="ig" href={artist.ig} target="_blank" rel="noopener">
                  Acesse o Instagram para ver
                </a>
              )}
            </div>
          )}
          <p className="tag" style={{ marginTop: 14 }}>
            Foto, nome e Instagram da atração entram pelo servidor, só para confirmados
          </p>
        </div>
      </section>
    </>
  );
}
