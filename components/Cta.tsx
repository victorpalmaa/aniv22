'use client';
import { useParty } from './providers/PartyProvider';

export function Cta() {
  const { me, ready, openSheet, toastMsg } = useParty();
  return (
    <>
      <div className="cta-bar">
        <button id="cta" type="button" className={me ? 'done' : undefined} onClick={() => openSheet()} aria-busy={!ready}>
          {me ? 'Você está confirmado' : 'Confirmar presença'}
        </button>
      </div>
      <div id="toast" role="status" aria-live="polite" hidden={!toastMsg}>
        {toastMsg}
      </div>
    </>
  );
}
