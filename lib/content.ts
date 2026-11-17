// Conteúdo do cardápio e do bar (cardápio fechado em 15/11). Itens com foto usam <DepthPhoto>
// com assets em /public/depth/<slug> (prepare_depth_photos.py); os demais seguem com ilustração.
// Nada de conteúdo restrito aqui: este arquivo vai para o bundle público.

export type Fx = 'steam' | 'bubbles' | 'sparkle';
/** Foto com profundidade: w/h do meta.json. amp só para reduzir o movimento de um item.
 *  Garrafas usam profundidade única (bloco rígido) gerada no pipeline: vidro engana o modelo e a borda esticava. */
export type Photo = { slug: string; w: number; h: number; amp?: [number, number] };
export type Item = {
  id: string;
  name: string;
  cat: string;
  eyebrow: string;
  fx: Fx;
  desc: string;
  specs: [string, string][];
  pairs: string[];
  photo?: Photo;
  /** vídeo curto do prato: toca no detalhe (sem som, uma vez) no lugar da foto. poster = último quadro */
  video?: { src: string; first: string; last: string };
  /** cor da bebida: inunda o fundo do detalhe e acende o pedestal no Bar */
  color?: string;
  label?: [string, string];
};

// foto inteira (1179x892): telas quadradas e o detalhe em tela cheia recortam pelo centro (cover)
const ph = (slug: string): Photo => ({ slug, w: 1179, h: 892 });

/** Ilustrações só para quem ainda não tem foto. */
export const ART: Record<string, string> = {
  'caipi-limao': `<svg viewBox="0 0 120 120" aria-hidden="true"><line x1="76" y1="12" x2="62" y2="96" stroke="var(--gold)" stroke-width="3" stroke-linecap="round"/><path d="M32 56h56l-4.6 48a5 5 0 0 1-5 4.5H41.6a5 5 0 0 1-5-4.5z" fill="var(--lime)" opacity=".38"/><g fill="var(--ice)" opacity=".75"><rect x="40" y="46" width="16" height="16" rx="3" transform="rotate(-12 48 54)"/><rect x="62" y="44" width="16" height="16" rx="3" transform="rotate(14 70 52)"/><rect x="50" y="62" width="15" height="15" rx="3" transform="rotate(6 57 69)"/></g><path d="M44 90a10 10 0 0 1 18 0z" fill="var(--lime-dark)"/><path d="M46 90a8 8 0 0 1 14 0z" fill="var(--lime)"/><path d="M60 84a9 9 0 0 1 16 2z" fill="var(--lime-dark)"/><path d="M62 84.6a7 7 0 0 1 12 1.6z" fill="var(--lime)"/><path d="M28 38h64l-6.4 66a6 6 0 0 1-6 5.5H40.4a6 6 0 0 1-6-5.5z" fill="var(--ice)" opacity=".14" stroke="var(--ice)" stroke-width="1.5"/><circle cx="90" cy="40" r="11" fill="var(--lime-dark)"/><circle cx="90" cy="40" r="8.5" fill="var(--lime)"/><g stroke="var(--lime-dark)" stroke-width="1"><line x1="90" y1="32" x2="90" y2="48"/><line x1="82" y1="40" x2="98" y2="40"/></g></svg>`,
  'caipi-morango': `<svg viewBox="0 0 120 120" aria-hidden="true"><line x1="76" y1="12" x2="62" y2="96" stroke="var(--gold)" stroke-width="3" stroke-linecap="round"/><path d="M32 56h56l-4.6 48a5 5 0 0 1-5 4.5H41.6a5 5 0 0 1-5-4.5z" fill="#9a1d3e" opacity=".75"/><g fill="var(--ice)" opacity=".7"><rect x="40" y="46" width="16" height="16" rx="3" transform="rotate(-12 48 54)"/><rect x="62" y="44" width="16" height="16" rx="3" transform="rotate(14 70 52)"/></g><g fill="#d12b3f"><circle cx="48" cy="88" r="5"/><circle cx="54" cy="84" r="4.5"/><circle cx="52" cy="92" r="4"/></g><g fill="#c2263f"><circle cx="68" cy="86" r="5.5"/><circle cx="74" cy="91" r="4"/></g><path d="M28 38h64l-6.4 66a6 6 0 0 1-6 5.5H40.4a6 6 0 0 1-6-5.5z" fill="var(--ice)" opacity=".14" stroke="var(--ice)" stroke-width="1.5"/><path d="M84 30c8-6 16-4 18 2-8 4-14 3-18-2z" fill="#5d8a22"/><circle cx="84" cy="40" r="7" fill="#c2263f"/><circle cx="82" cy="38" r="1.5" fill="#fff" opacity=".6"/></svg>`,
};


export const ITEMS: Item[] = [
  { id: 'parmegiana', name: 'Arroz, parmegiana e fritas', cat: 'Prato principal', eyebrow: 'Prato principal', fx: 'steam', photo: { slug: 'parmegiana', w: 1280, h: 720 }, video: { src: '/video/parmegiana.mp4', first: '/video/parmegiana-inicio.webp', last: '/video/parmegiana-final.webp' }, desc: 'O prato principal da noite.', specs: [], pairs: ['heineken', 'coca'] },
  { id: 'croquete', name: 'Croquete', cat: 'Petisco', eyebrow: 'Petiscos', fx: 'steam', photo: ph('croquete'), desc: 'Porção de croquete.', specs: [], pairs: ['heineken', 'coca'] },
  { id: 'pintado', name: 'Bolinho de pintado', cat: 'Petisco', eyebrow: 'Petiscos', fx: 'steam', photo: ph('pintado'), desc: 'Bolinho de peixe pintado.', specs: [], pairs: ['caipi-limao', 'heineken'] },
  { id: 'rucula', name: 'Salada de rúcula', cat: 'Petisco', eyebrow: 'Petiscos', fx: 'steam', photo: ph('rucula'), desc: 'Salada de rúcula para abrir a mesa.', specs: [], pairs: ['campari', 'caipi-limao'] },
  { id: 'torresmo', name: 'Torresmo', cat: 'Petisco', eyebrow: 'Petiscos', fx: 'steam', photo: ph('torresmo'), desc: 'Porção de torresmo, servida com limão.', specs: [], pairs: ['caipi-limao', 'heineken'] },
  { id: 'polenta', name: 'Polenta', cat: 'Petisco', eyebrow: 'Petiscos', fx: 'steam', photo: ph('polenta'), desc: 'Porção de polenta frita.', specs: [], pairs: ['heineken', 'campari'] },
  { id: 'mandioca', name: 'Mandioca', cat: 'Petisco', eyebrow: 'Petiscos', fx: 'steam', photo: ph('mandioca'), desc: 'Porção de mandioca frita.', specs: [], pairs: ['heineken', 'caipi-limao'] },
  { id: 'fritas', name: 'Fritas', cat: 'Petisco', eyebrow: 'Petiscos · também no prato principal', fx: 'steam', photo: ph('fritas'), desc: 'Porção de batata frita. Também acompanha a parmegiana.', specs: [], pairs: ['heineken', 'coca'] },
];

export const DRINKS: Item[] = [
  { id: 'heineken', name: 'Heineken', label: ['Heineken', ''], cat: 'Bar', eyebrow: 'Cerveja', fx: 'bubbles', color: '#1f6b3a', photo: ph('heineken'), desc: 'Long neck bem gelada.', specs: [], pairs: ['fritas', 'torresmo'] },
  { id: 'campari', name: 'Campari', label: ['Campari', ''], cat: 'Bar', eyebrow: 'Aperitivo', fx: 'sparkle', color: '#b3122e', photo: ph('campari'), desc: 'O bitter italiano, para quem gosta do amargo.', specs: [], pairs: ['polenta', 'rucula'] },
  { id: 'caipi-limao', name: 'Caipirinha ou caipirosca de limão', label: ['Caipirinha', 'ou caipirosca · limão'], cat: 'Bar', eyebrow: 'Drink', fx: 'sparkle', color: '#6f9a2a', desc: 'Com cachaça (caipirinha) ou vodka (caipirosca). Você escolhe na hora.', specs: [['Fruta', 'Limão']], pairs: ['torresmo', 'pintado'] },
  { id: 'caipi-morango', name: 'Caipirinha ou caipirosca de morango', label: ['Caipirinha', 'ou caipirosca · morango'], cat: 'Bar', eyebrow: 'Drink', fx: 'sparkle', color: '#c2263f', desc: 'Com cachaça (caipirinha) ou vodka (caipirosca). Você escolhe na hora.', specs: [['Fruta', 'Morango']], pairs: ['croquete', 'parmegiana'] },
  { id: 'coca', name: 'Coca-Cola', label: ['Coca-Cola', ''], cat: 'Bar', eyebrow: 'Refrigerante', fx: 'bubbles', color: '#a50f1d', photo: ph('coca'), desc: 'Coca-Cola gelada.', specs: [], pairs: ['parmegiana', 'fritas'] },
  { id: 'guarana', name: 'Guaraná', label: ['Guaraná', ''], cat: 'Bar', eyebrow: 'Refrigerante', fx: 'bubbles', color: '#3f8f2f', photo: ph('guarana'), desc: 'Guaraná gelado.', specs: [], pairs: ['croquete', 'pintado'] },
  { id: 'agua', name: 'Água com e sem gás', label: ['Água', 'com e sem gás'], cat: 'Bar', eyebrow: 'Sem álcool', fx: 'bubbles', color: '#4a86a8', photo: ph('agua'), desc: 'Água mineral, com ou sem gás.', specs: [], pairs: ['rucula', 'parmegiana'] },
];

export const BY: Record<string, Item> = Object.fromEntries([...ITEMS, ...DRINKS].map((i) => [i.id, i]));
