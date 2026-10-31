'use client';
import { useEffect, useState } from 'react';
import { useParty } from '../providers/PartyProvider';
import { FloorPlan } from '../FloorPlan';
import { Ride } from '../Ride';

/** 6 · Quem vai: preview anônimo para quem não confirmou, planta completa ao vivo para quem confirmou. */
export function QuemVai() {
  const { me, pins, counts, live, lastArrival } = useParty();
  const [liveTxt, setLiveTxt] = useState('Ao vivo');
  const total = me ? pins.length : counts.reduce((s, c) => s + c.total, 0);

  useEffect(() => {
    if (!lastArrival) return;
    setLiveTxt(`${lastArrival.split(' ')[0]} acabou de confirmar`);
    const t = setTimeout(() => setLiveTxt('Ao vivo'), 4000);
    return () => clearTimeout(t);
  }, [lastArrival]);

  return (
    <>
      <div className="anchor" id="quem-vai" />
      <section className="chapter bleed" id="quemCh" style={{ ['--cb' as string]: 'var(--bg)' }}>
        <Ride word="QUEM VAI" bg="var(--bg)" color="var(--gold)" />
        <div className="wrap">
          <header className="sec-head">
            {/* sem confirmação não há socket; com socket caído, o ponto apaga em vez de mentir */}
            <p className={`live${me && live === 'off' ? ' off' : ''}`}>
              <i />
              <span>{me ? (live === 'on' ? liveTxt : 'Reconectando…') : 'Ao vivo'}</span>
            </p>
            <h2>
              {me ? (
                <>
                  Quem <em>vai</em>
                </>
              ) : (
                <>
                  {total} {total === 1 ? 'pessoa' : 'pessoas'} <em>{total === 1 ? 'já confirmou' : 'já confirmaram'}</em>
                </>
              )}
            </h2>
            <p className="lede">{me ? 'Toque em um círculo para ver o nome.' : 'Confirme para ver quem vai e escolher onde ficar.'}</p>
          </header>
          <FloorPlan />
        </div>
      </section>
    </>
  );
}
