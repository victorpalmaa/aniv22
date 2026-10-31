'use client';
// Um listener de scroll e um rAF por frame para a página inteira. Cada cena registra uma função
// que escreve transform/clip-path direto no DOM. Nada disso passa por estado do React.
type Fn = () => void;
const subs = new Set<Fn>();
let raf = 0;
let bound = false;

function run() {
  raf = 0;
  subs.forEach((fn) => fn());
}
function schedule() {
  if (!raf) raf = requestAnimationFrame(run);
}

export function onFrame(fn: Fn): () => void {
  subs.add(fn);
  if (!bound) {
    bound = true;
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
  }
  schedule();
  return () => {
    subs.delete(fn);
  };
}

/** Força uma passada (ex.: depois de mudar layout). */
export const requestFrame = schedule;
