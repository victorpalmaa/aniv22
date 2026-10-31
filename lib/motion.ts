export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
/** easeInOutQuad, a mesma curva do protótipo */
export const io = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
export const reduceMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const nums = (s: string) => s.split(',').map(Number);

/** Altura do topo fixo; capítulos grudam logo abaixo dele. */
export const topH = () => (document.querySelector('.top') as HTMLElement | null)?.offsetHeight ?? 60;

/** Rola até o capítulo pelo id da âncora, descontando o topo. */
export function jump(id: string) {
  const hh = topH();
  const el = document.getElementById(id);
  const target = id === 'topo' || !el ? 0 : el.getBoundingClientRect().top + window.scrollY - hh;
  window.scrollTo({ top: Math.max(0, target), behavior: reduceMotion() ? 'auto' : 'smooth' });
}
