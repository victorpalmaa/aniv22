'use client';
export type Surprise = { name: string; role: string; when: string; ig: string | null };

/**
 * Conteúdo da Surpresa. NÃO pode morar no bundle: o repo é público e o JS vai inteiro para o
 * cliente. A implementação recomendada (tabela com select só para quem tem linha em rsvps + foto
 * em bucket privado com URL assinada) ainda depende de aprovação. Até lá, placeholder neutro.
 */
export async function loadSurprise(): Promise<Surprise> {
  return { name: 'Atração surpresa', role: 'Música ao vivo', when: 'Horário a confirmar', ig: null };
}
