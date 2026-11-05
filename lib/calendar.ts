// Fonte única do evento para o .ics (rota do servidor) e para o link do Google Agenda.
export const EVENT = {
  uid: 'parme-gala-2027@parme.recantocolonial.com.br', // fixo (não renomear com o evento): reimportar atualiza em vez de duplicar
  title: 'Parme & Varieté · aniversário do Victor',
  start: '20270115T230000Z', // 20h em Brasília
  // término ainda não definido: duração provisória de 5h, avisada na descrição
  end: '20270116T040000Z',
  description: 'Traje: passeio completo. Término a definir. Detalhes em https://parme.recantocolonial.com.br',
  location: 'Recanto Colonial, Avenida 29 de Abril, 350, Itatiba - SP',
  url: 'https://parme.recantocolonial.com.br',
};

export const googleCalendarUrl = () => {
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: EVENT.title,
    dates: `${EVENT.start}/${EVENT.end}`,
    details: EVENT.description,
    location: EVENT.location,
  });
  return `https://calendar.google.com/calendar/render?${q}`;
};
