'use client';
/**
 * Agendador único de scroll, em duas fases para não travar no iPhone:
 *  - measure: lê geometria (getBoundingClientRect, offsetHeight). Só roda no load, no resize
 *    e quando a altura da página muda. Nunca por frame.
 *  - frame: só lê `vp.y` (scrollY) e escreve transform/clip-path. Sem leitura de layout,
 *    então o navegador não é forçado a recalcular nada no meio do frame.
 * Nada disso passa por estado do React.
 */
type Fn = () => void;
const measures = new Set<Fn>();
const frames = new Set<Fn>();
let raf = 0;
let dirty = true;
let bound = false;

/** Viewport em cache. `hh` é a altura do topo fixo; capítulos grudam logo abaixo dele. */
export const vp = { y: 0, vh: 800, vw: 400, hh: 60 };

function measureAll() {
  dirty = false;
  vp.vh = window.innerHeight;
  vp.vw = document.documentElement.clientWidth;
  vp.hh = (document.querySelector('.top') as HTMLElement | null)?.offsetHeight ?? 60;
  document.documentElement.style.setProperty('--hh', vp.hh + 'px');
  measures.forEach((fn) => fn());
}

function run() {
  raf = 0;
  if (dirty) measureAll();
  vp.y = window.scrollY;
  frames.forEach((fn) => fn());
}

function schedule() {
  if (!raf) raf = requestAnimationFrame(run);
}

/** Pede nova medição no próximo frame (ex.: depois de mudar layout). */
export function remeasure() {
  dirty = true;
  schedule();
}

function bind() {
  if (bound) return;
  bound = true;
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', remeasure);
  // altura da página muda quando fontes carregam ou a Mesa recalcula sua trilha
  new ResizeObserver(remeasure).observe(document.body);
  document.fonts?.ready.then(remeasure).catch(() => {});
}

export function onScroll(frame: Fn, measure?: Fn): () => void {
  bind();
  frames.add(frame);
  if (measure) measures.add(measure);
  remeasure();
  return () => {
    frames.delete(frame);
    if (measure) measures.delete(measure);
  };
}

/** Topo absoluto (na página) de um elemento que não é sticky. Só chamar dentro de measure. */
export const absTop = (el: Element) => el.getBoundingClientRect().top + window.scrollY;
