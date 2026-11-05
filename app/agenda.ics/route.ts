import { EVENT } from '@/lib/calendar';

// .ics servido pelo servidor: no iOS abre a tela nativa "Adicionar ao Calendário" (blob no cliente vira download)
export const dynamic = 'force-static';

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

export function GET() {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Parme & Varieté//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${EVENT.uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${EVENT.start}`,
    `DTEND:${EVENT.end}`,
    `SUMMARY:${esc(EVENT.title)}`,
    `DESCRIPTION:${esc(EVENT.description)}`,
    `LOCATION:${esc(EVENT.location)}`,
    `URL:${EVENT.url}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:Parme & Varieté amanhã',
    'TRIGGER:-P1D',
    'END:VALARM',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:Parme & Varieté em 3 horas',
    'TRIGGER:-PT3H',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="parme-variete.ics"',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
