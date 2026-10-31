'use client';
// O detalhe de comida/bebida é uma camada por cima da página, aberta por hash (#parmegiana)
// para manter deep link no WhatsApp. Aqui fica só a navegação; a camada vive em DetailLayer.
let inAppNav = 0;
let lastTrigger: HTMLElement | null = null;

export function openItem(id: string, trigger?: HTMLElement | null) {
  if (trigger) lastTrigger = trigger;
  inAppNav++;
  window.location.hash = id;
}

/** Volta pelo histórico se a camada foi aberta dentro do site; senão limpa o hash. */
export function leaveItem() {
  if (inAppNav > 0) {
    const n = inAppNav;
    inAppNav = 0;
    history.go(-n);
    return;
  }
  try {
    history.replaceState(null, '', location.pathname + location.search);
  } catch {
    /* noop */
  }
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

export const takeLastTrigger = () => lastTrigger;
