import { PartyProvider } from '@/components/providers/PartyProvider';
import { TopBar } from '@/components/TopBar';
import { Opening } from '@/components/chapters/Opening';
import { Invite } from '@/components/chapters/Invite';
import { Mesa } from '@/components/chapters/Mesa';
import { Bar } from '@/components/chapters/Bar';
import { Traje } from '@/components/chapters/Traje';
import { QuemVai } from '@/components/chapters/QuemVai';
import { Surpresa } from '@/components/chapters/Surpresa';
import { Duvidas } from '@/components/chapters/Duvidas';
import { Local } from '@/components/chapters/Local';
import { DetailLayer } from '@/components/DetailLayer';
import { Cta } from '@/components/Cta';
import { Sheet } from '@/components/Sheet';
import { RevealObserver } from '@/components/RevealObserver';

/** Página única, tudo por scroll. Ordem dos capítulos fechada em 31/10. */
export default function Page() {
  return (
    <PartyProvider>
      <div className="app">
        <TopBar />
        <Opening />
        <Invite />
        <Mesa />
        <Bar />
        <Traje />
        <QuemVai />
        <Surpresa />
        <Duvidas />
        <Local />
        <DetailLayer />
        <Cta />
        <Sheet />
        <RevealObserver />
      </div>
    </PartyProvider>
  );
}
