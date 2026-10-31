import { getJSON, setJSON } from './storage';

export const PARTY_START = Date.UTC(2027, 0, 15, 23, 0, 0); // 15/01/2027 20h em Brasília (sem horário de verão)
export const RSVP_DEADLINE = Date.UTC(2027, 0, 6, 3, 0, 0); // fim do dia 05/01 em Brasília
export const pastDeadline = () => Date.now() > RSVP_DEADLINE;

export const AREAS = ['Bar', 'Salão', 'Pista'] as const; // ids 0, 1, 2 batem com a tabela areas
export const AREAS_IN = ['no Bar', 'no Salão', 'na Pista'] as const;

/**
 * Código da festa vem no link do WhatsApp (?c=parme22) e fica guardado: o hash do detalhe
 * e a volta do app de email podem perder a query string.
 */
export function partyCode(): string | null {
  if (typeof window === 'undefined') return null;
  const fromUrl = new URLSearchParams(window.location.search).get('c');
  if (fromUrl) {
    setJSON('local', 'party_code', fromUrl.trim());
    return fromUrl.trim();
  }
  return getJSON<string | null>('local', 'party_code', null);
}

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
