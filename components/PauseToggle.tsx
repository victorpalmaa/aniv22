'use client';
import { useMotionPrefs } from './providers/MotionPrefs';

/** Botão único e visível que pausa o movimento das fotos (estado lembrado no aparelho). */
export function PauseToggle() {
  const { paused, togglePaused } = useMotionPrefs();
  return (
    <button className="anim-toggle" type="button" aria-pressed={paused} onClick={togglePaused}>
      <span aria-hidden="true">{paused ? '▶' : '❚❚'}</span>
      {paused ? 'Retomar' : 'Pausar'}
      <span className="at-long"> animações</span>
    </button>
  );
}
