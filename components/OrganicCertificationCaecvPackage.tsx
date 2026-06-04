import React, { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardList, ExternalLink, FileText, Mail, ShieldCheck, UserRound, UsersRound } from 'lucide-react';
import { CAECV_CONTACT, CAECV_EMAIL_SUMMARY, ORGANIC_CHANGE_OF_OWNERSHIP_ITEMS, OrganicApplicationItem } from '../services/organicCertificationPackage';

function priorityClass(priority: OrganicApplicationItem['priority']) {
  if (priority === 'critical') return 'border-red-500/30 bg-red-500/10 text-red-300';
  if (priority === 'high') return 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300';
  if (priority === 'medium') return 'border-blue-500/30 bg-blue-500/10 text-blue-300';
  return 'border-slate-500/20 bg-slate-500/10 text-slate-300';
}

function partyLabel(party: OrganicApplicationItem['party']) {
  if (party === 'previous_holder') return 'Tidligere eier';
  if (party === 'new_holder') return 'Ny eier';
  return 'Begge';
}

function statusLabel(status: OrganicApplicationItem['status']) {
  const labels: Record<OrganicApplicationItem['status'], string> = {
    not_started: 'Ikke startet',
    in_progress: 'Pågår',
    ready: 'Klar',
    submitted: 'Sendt',
    not_applicable: 'Ikke relevant',
    blocked: 'Avhenger av andre',
  };
  return labels[status];
}

const OrganicCertificationCaecvPackage: React.FC = () => {
  const stats = useMemo(() => {
    const required = ORGANIC_CHANGE_OF_OWNERSHIP_ITEMS.filter(i => i.required).length;
    const previous = ORGANIC_CHANGE_OF_OWNERSHIP_ITEMS.filter(i => i.party === 'previous_holder').length;
    const newHolder = ORGANIC_CHANGE_OF_OWNERSHIP_ITEMS.filter(i => i.party === 'new_holder').length;
    const critical = ORGANIC_CHANGE_OF_OWNERSHIP_ITEMS.filter(i => i.priority === 'critical').length;
    return { required, previous, newHolder, critical };
  }, []);

  const previousHolderItems = ORGANIC_CHANGE_OF_OWNERSHIP_ITEMS.filter(i => i.party === 'previous_holder');
  const newHolderItems = ORGANIC_CHANGE_OF_OWNERSHIP_ITEMS.filter(i => i.party === 'new_holder');

  return (
    <div className="space-y-6">
      <div className="glass rounded-[2rem] p-6 border border-[#d9b657]/25 bg-[#d9b657]/5">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
          <div className="flex items-start gap-4">
            <ShieldCheck className="text-[#d9b657] mt-1" size={28} />
            <div>
              <p className="text-[10px] text-[#d9b657] uppercase font-black tracking-[0.28em] mb-2">CAECV · eierskifte</p>
              <h3 className="text-2xl font-bold text-white">Søknadspakke for økologisk sertifisering</h3>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed max-w-4xl">
                Basert på e-posten fra CAECV: tidligere sertifikatholder må sende frivillig tilbaketrekking på grunn av eierskifte, mens Anna/ny eier må levere full ny søknad som planteproduksjonsoperatør.
              </p>
            </div>
          </div>
          <a href="https://www.caecv.com/solicitudes-nuevo-rue/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-sm text-slate-300 hover:text-white hover:bg-white/10">
            CAECV skjema <ExternalLink size={16} />
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Obligatoriske punkter" value={stats.required} icon={<ClipboardList size={18} />} />
        <Stat label="Tidligere eier" value={stats.previous} icon={<UsersRound size={18} />} />
        <Stat label="Ny eier" value={stats.newHolder} icon={<UserRound size={18} />} />
        <Stat label="Kritiske punkter" value={stats.critical} icon={<AlertTriangle size={18} />} />
      </div>

      <div className="glass rounded-[2rem] p-6 border border-blue-500/20 bg-blue-500/5">
        <div className="flex items-start gap-3">
          <Mail className="text-blue-300 mt-0.5" size={20} />
          <div>
            <p className="text-sm text-white font-bold">Hva fra e-posten bør inn i Olivia?</p>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">{CAECV_EMAIL_SUMMARY}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4 text-xs text-slate-400">
              <p><strong className="text-white">Kontakt:</strong> {CAECV_CONTACT.email}</p>
              <p><strong className="text-white">Kontrollkode:</strong> {CAECV_CONTACT.controlCode}</p>
              <p><strong className="text-white">Telefon:</strong> {CAECV_CONTACT.phone}</p>
              <p><strong className="text-white">Adresse:</strong> {CAECV_CONTACT.address}</p>
            </div>
          </div>
        </div>
      </div>

      <Section title="Tidligere eier må gjøre" items={previousHolderItems} />
      <Section title="Ny eier / Anna må levere" items={newHolderItems} />

      <div className="glass rounded-[2rem] p-6 border border-amber-500/20 bg-amber-500/5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="text-amber-300 mt-0.5" size={20} />
          <div>
            <p className="text-sm text-white font-bold">Viktig for appen videre</p>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Disse filene bør lastes opp i dokumentarkivet eller en egen CAECV-dokumentpakke når Storage-modulen er klar for sertifiseringsdokumenter. I tillegg bør Olivia kunne eksportere parselllisten fra olivia.parcels til FPO05175-format og lage oppgaver for tidligere eier, opplæring, signatur og innsending.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

function Section({ title, items }: { title: string; items: OrganicApplicationItem[] }) {
  return (
    <div className="space-y-4">
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">{title}</h3>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {items.map(item => (
          <div key={item.id} className={`glass rounded-[2rem] p-5 border ${priorityClass(item.priority)}`}>
            <div className="flex justify-between items-start gap-4">
              <div>
                <p className="text-[10px] uppercase font-bold tracking-widest mb-1">{partyLabel(item.party)} · {statusLabel(item.status)} · {item.required ? 'Obligatorisk' : 'Valgfri/betinget'}</p>
                <h4 className="text-lg text-white font-bold">{item.title}</h4>
                <p className="text-xs text-slate-500 mt-1">{item.caecvCode || 'Støttedokument'}{item.fileName ? ` · ${item.fileName}` : ''}</p>
              </div>
              {item.required ? <CheckCircle2 size={20} /> : <FileText size={20} />}
            </div>
            <p className="text-sm text-slate-300 mt-4 leading-relaxed">{item.summary}</p>
            <p className="text-xs text-slate-500 mt-3 leading-relaxed"><strong className="text-slate-300">I Olivia:</strong> {item.appAction}</p>
            {item.notes && <p className="text-xs text-amber-200 mt-3 leading-relaxed">{item.notes}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return <div className="glass rounded-[2rem] p-5 border border-white/10"><div className="text-[#d9b657] mb-2">{icon}</div><p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{label}</p><p className="text-3xl font-black text-white mt-1">{value}</p></div>;
}

export default OrganicCertificationCaecvPackage;
