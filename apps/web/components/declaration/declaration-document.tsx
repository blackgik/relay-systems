'use client';

import React, { useId } from 'react';
import { Camera, Fingerprint, Lock, MapPin, ScanLine } from 'lucide-react';
import { QrCode } from '@/ui/elements';
import { primitive } from '@/src/tokens';
import type { Declaration } from '@/lib/types';
import { formatMinors } from '@/lib/money';
import { SIGNATURE_FONT } from '@/lib/declaration';

// The printable A4 declaration. Colours are fixed ink, not theme tokens, for
// the same reason the QR code's are: a legal document must look the same in
// dark mode, on screen and on paper. Sized in mm/pt so print is exact.

const INK = primitive.harbor[900];
const INK_SOFT = primitive.harbor[500];
const SIGNAL = primitive.signal;
const STAMP_RED = '#B4232A';
const PAPER = '#FFFDF8';
const RULE = '#D9E3E6';

const MODE_LABEL: Record<string, string> = { AIR: 'Flight', ROAD: 'Road', RAIL: 'Rail' };

function fmt(iso: string, withTime = true) {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <rect x="4" y="4" width="40" height="40" rx="10" fill={INK} />
      <path d="M14 30l6-6 4 4 10-12" stroke={SIGNAL} strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="34" cy="16" r="3" fill={SIGNAL} />
    </svg>
  );
}

/** Rubber-stamp ink: a noise mask knocks out specks so it reads as pressed, not printed. */
function InkFilter({ id, seed }: { id: string; seed: number }) {
  return (
    <filter id={id} x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={seed} result="noise" />
      <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  3.2 0 0 0 -0.75" result="mask" />
      <feComposite in="SourceGraphic" in2="mask" operator="in" />
    </filter>
  );
}

function RoundStamp({ top, bottom, center, sub, color, rotate, size = 132 }: {
  top: string;
  bottom: string;
  center: string;
  sub: string;
  color: string;
  rotate: number;
  size?: number;
}) {
  const uid = useId().replace(/:/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 150 150" style={{ transform: `rotate(${rotate}deg)` }} aria-hidden>
      <defs>
        <InkFilter id={`ink-${uid}`} seed={7} />
        <path id={`top-${uid}`} d="M 22 75 A 53 53 0 0 1 128 75" />
        <path id={`bot-${uid}`} d="M 18 75 A 57 57 0 0 0 132 75" />
      </defs>
      <g filter={`url(#ink-${uid})`} fill={color} stroke={color} opacity="0.86">
        <circle cx="75" cy="75" r="70" fill="none" strokeWidth="3.2" />
        <circle cx="75" cy="75" r="63" fill="none" strokeWidth="1" />
        <circle cx="75" cy="75" r="37" fill="none" strokeWidth="1.2" />
        <text fontSize="11.5" fontWeight="800" letterSpacing="2.2" stroke="none" fontFamily="Arial, Helvetica, sans-serif">
          <textPath href={`#top-${uid}`} startOffset="50%" textAnchor="middle">{top}</textPath>
        </text>
        <text fontSize="10" fontWeight="700" letterSpacing="2" stroke="none" fontFamily="Arial, Helvetica, sans-serif" dy="8">
          <textPath href={`#bot-${uid}`} startOffset="50%" textAnchor="middle">{bottom}</textPath>
        </text>
        <text x="75" y="73" textAnchor="middle" fontSize="15" fontWeight="900" stroke="none" fontFamily="Arial, Helvetica, sans-serif" letterSpacing="1">{center}</text>
        <text x="75" y="88" textAnchor="middle" fontSize="8.5" fontWeight="700" stroke="none" fontFamily="Arial, Helvetica, sans-serif">{sub}</text>
        <path d="M 30 75 l 4 -3 l 4 3 l -4 3 z M 112 75 l 4 -3 l 4 3 l -4 3 z" stroke="none" />
      </g>
    </svg>
  );
}

function BoxStamp({ lines, color, rotate }: { lines: [string, string]; color: string; rotate: number }) {
  const uid = useId().replace(/:/g, '');
  return (
    <svg width="168" height="62" viewBox="0 0 168 62" style={{ transform: `rotate(${rotate}deg)` }} aria-hidden>
      <defs><InkFilter id={`ink-${uid}`} seed={11} /></defs>
      <g filter={`url(#ink-${uid})`} fill={color} stroke={color} opacity="0.82">
        <rect x="3" y="3" width="162" height="56" rx="6" fill="none" strokeWidth="3" />
        <rect x="9" y="9" width="150" height="44" rx="3" fill="none" strokeWidth="0.8" />
        <text x="84" y="29" textAnchor="middle" fontSize="15" fontWeight="900" letterSpacing="1.6" stroke="none" fontFamily="Arial, Helvetica, sans-serif">{lines[0]}</text>
        <text x="84" y="44" textAnchor="middle" fontSize="8.5" fontWeight="700" letterSpacing="1.4" stroke="none" fontFamily="Arial, Helvetica, sans-serif">{lines[1]}</text>
      </g>
    </svg>
  );
}

/** Diagonal repeating Relay wordmark and a large central mark, faint, behind everything. */
function Watermark() {
  const uid = useId().replace(/:/g, '');
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <pattern id={`wm-${uid}`} width="240" height="96" patternUnits="userSpaceOnUse" patternTransform="rotate(-28)">
          <g opacity="0.055">
            <rect x="0" y="10" width="22" height="22" rx="5.5" fill={INK} />
            <path d="M5.5 25l3.3-3.3 2.2 2.2 5.5-6.6" stroke={SIGNAL} strokeWidth="1.9" fill="none" strokeLinecap="round" />
            <text x="30" y="28" fontSize="19" fontWeight="800" letterSpacing="5" fill={INK} fontFamily="Arial, Helvetica, sans-serif">RELAY</text>
          </g>
          <text x="95" y="74" fontSize="7" letterSpacing="2.4" fill={INK} opacity="0.07" fontFamily="Arial, Helvetica, sans-serif">VERIFIED · TRACKED</text>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#wm-${uid})`} />
      <g transform="translate(397 600) rotate(-28)" opacity="0.05">
        <rect x="-150" y="-150" width="300" height="300" rx="72" fill={INK} />
        <path d="M-70 60l45-45 30 30 75-90" stroke={SIGNAL} strokeWidth="26" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

function SectionTitle({ index, children }: { index: string; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-[2.5mm] font-bold uppercase" style={{ fontSize: '8.6pt', letterSpacing: '0.14em', color: INK }}>
      <span className="flex items-center justify-center rounded-full text-white" style={{ width: '5.2mm', height: '5.2mm', background: INK, fontSize: '7pt' }}>{index}</span>
      {children}
      <span className="h-px flex-1" style={{ background: RULE }} />
    </h2>
  );
}

function Field({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <dt className="uppercase" style={{ fontSize: '6.4pt', letterSpacing: '0.12em', color: INK_SOFT }}>{label}</dt>
      <dd className={mono ? 'font-mono' : 'font-semibold'} style={{ fontSize: '8.8pt', color: INK }}>{value}</dd>
    </div>
  );
}

export function DeclarationDocument({ doc, verifyUrl }: { doc: Declaration; verifyUrl: string }) {
  const s = doc.shipment;
  const allAcknowledged = doc.couriers.length > 0 && doc.couriers.every((c) => c.acknowledged);
  const microtext = `RELAY DECLARATION ${doc.reference} · ${doc.sender.fullName.toUpperCase()} · ${s.originCity.toUpperCase()} TO ${s.destCity.toUpperCase()} · `;

  return (
    <article
      className="relative overflow-hidden"
      style={{
        width: '210mm',
        height: '297mm',
        background: PAPER,
        color: INK,
        fontFamily: 'var(--font-brand), Arial, Helvetica, sans-serif',
        printColorAdjust: 'exact',
        WebkitPrintColorAdjust: 'exact',
      }}
      aria-label={`Declaration ${doc.reference}`}
    >
      <Watermark />

      {/* Security frame: heavy rule, hairline, and a microtext band at the top */}
      <div className="pointer-events-none absolute" style={{ inset: '7mm', border: `1.4pt solid ${INK}`, borderRadius: '2mm' }} />
      <div className="pointer-events-none absolute" style={{ inset: '8.6mm', border: `0.4pt solid ${INK_SOFT}`, borderRadius: '1.4mm' }} />
      <p className="absolute overflow-hidden whitespace-nowrap" style={{ top: '9.6mm', left: '12mm', right: '12mm', fontSize: '4.2pt', letterSpacing: '0.18em', color: INK_SOFT, opacity: 0.8 }} aria-hidden>
        {microtext.repeat(6)}
      </p>
      <div className="absolute" style={{ top: '7mm', left: '7mm', right: '7mm', height: '1.6mm', background: `linear-gradient(90deg, ${INK} 0 70%, ${SIGNAL} 70% 100%)`, borderRadius: '2mm 2mm 0 0' }} aria-hidden />

      <div className="relative flex h-full flex-col" style={{ padding: '14mm 14mm 11mm' }}>
        {/* Letterhead */}
        <header className="flex items-start justify-between">
          <div className="flex items-center gap-[3mm]">
            <Mark size={40} />
            <div>
              <p className="font-extrabold leading-none" style={{ fontSize: '19pt', letterSpacing: '-0.01em' }}>Relay</p>
              <p style={{ fontSize: '7pt', color: INK_SOFT, letterSpacing: '0.08em' }}>PEER-TO-PEER LOGISTICS NETWORK</p>
            </div>
          </div>
          <div className="text-right">
            <p className="uppercase" style={{ fontSize: '6.4pt', letterSpacing: '0.14em', color: INK_SOFT }}>Declaration no.</p>
            <p className="font-mono font-bold" style={{ fontSize: '11.5pt' }}>{doc.reference}</p>
            <p style={{ fontSize: '7.4pt', color: INK_SOFT }}>Issued {fmt(doc.signedAt)}</p>
          </div>
        </header>

        <div className="mt-[4.5mm]">
          <h1 className="font-extrabold leading-tight" style={{ fontSize: '17pt', letterSpacing: '-0.01em' }}>
            Declaration of Lawful Goods
            <span className="block font-semibold" style={{ fontSize: '10.5pt', color: INK_SOFT }}>and Courier Custody Undertaking</span>
          </h1>
          <p className="mt-[1.5mm]" style={{ fontSize: '7.8pt', color: INK_SOFT, maxWidth: '165mm' }}>
            Made between the sender and every courier who carries this package on Relay. Part A is the sender&apos;s sworn declaration about the
            contents. Part B is the undertaking that binds the courier. Both parties hold an identical copy of this document.
          </p>
        </div>

        {/* Parties */}
        <section className="mt-[4mm] grid grid-cols-2 gap-[4mm]">
          <div className="rounded-[2mm] p-[3mm]" style={{ background: 'rgba(11,59,75,0.045)', border: `0.6pt solid ${RULE}` }}>
            <p className="uppercase" style={{ fontSize: '6.4pt', letterSpacing: '0.14em', color: INK_SOFT }}>The sender (declarant)</p>
            <p className="mt-[1mm] font-bold" style={{ fontSize: '12.5pt' }}>{doc.sender.fullName}</p>
            <p style={{ fontSize: '7.8pt', color: INK_SOFT }}>@{doc.sender.handle ?? 'sender'} · Identity verified, {doc.sender.tier}</p>
          </div>
          <div className="rounded-[2mm] p-[3mm]" style={{ background: 'rgba(245,158,11,0.07)', border: `0.6pt solid ${RULE}` }}>
            <p className="uppercase" style={{ fontSize: '6.4pt', letterSpacing: '0.14em', color: INK_SOFT }}>
              The courier{doc.couriers.length > 1 ? 's' : ''} (custodian{doc.couriers.length > 1 ? 's' : ''})
            </p>
            {doc.couriers.length === 0 && <p className="mt-[1mm] font-bold" style={{ fontSize: '11pt' }}>To be assigned</p>}
            {doc.couriers.map((c) => (
              <div key={c.sequence} className="mt-[1mm]">
                <p className="font-bold" style={{ fontSize: doc.couriers.length > 1 ? '10pt' : '12.5pt' }}>{c.fullName}</p>
                <p style={{ fontSize: '7.8pt', color: INK_SOFT }}>
                  @{c.handle ?? 'courier'} · {c.tier} · {c.originCity} → {c.destCity} · {MODE_LABEL[c.mode] ?? c.mode}{c.reference ? ` ${c.reference}` : ''}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Consignment */}
        <section className="mt-[3.5mm]">
          <SectionTitle index="1">The consignment</SectionTitle>
          <dl className="mt-[2mm] grid grid-cols-4 gap-x-[4mm] gap-y-[2mm]">
            <Field label="Shipment" value={<span className="break-all" style={{ fontSize: '7.4pt' }}>{s.id}</span>} mono />
            <Field label="Route" value={`${s.originCity} → ${s.destCity}`} />
            <Field label="Contents" value={<span className="capitalize">{s.category}</span>} />
            <Field label="Weight" value={`${s.weightKg} kg`} />
            <Field label="Declared value" value={formatMinors(s.declaredValue, s.currency)} />
            <Field label="Tamper seal" value={s.sealId ?? 'Applied at pickup'} mono={!!s.sealId} />
            <Field label="Requested" value={fmt(s.createdAt, false)} />
            <Field label="Status" value={<span className="capitalize">{s.status.toLowerCase().replace(/_/g, ' ')}</span>} />
          </dl>
        </section>

        {/* Part A */}
        <section className="mt-[3.5mm]">
          <SectionTitle index="A">The sender&apos;s declaration</SectionTitle>
          <p className="mt-[1.5mm]" style={{ fontSize: '8pt' }}>
            I, <strong>{doc.sender.fullName}</strong>, giving this package to Relay couriers, solemnly declare and attest that the goods being
            transferred are not incriminating, and that:
          </p>
          <ol className="mt-[1.5mm] list-decimal space-y-[0.8mm]" style={{ fontSize: '7.8pt', paddingLeft: '5mm', lineHeight: 1.35 }}>
            {doc.senderClauses.map((c) => <li key={c}>{c}</li>)}
          </ol>
        </section>

        {/* Part B */}
        <section className="mt-[3.5mm]">
          <SectionTitle index="B">The courier&apos;s undertaking</SectionTitle>
          <ol className="mt-[2mm] list-decimal space-y-[0.8mm]" style={{ fontSize: '7.8pt', paddingLeft: '5mm', lineHeight: 1.35 }}>
            {doc.courierClauses.map((c) => <li key={c}>{c}</li>)}
          </ol>
          <div className="mt-[2.5mm] flex items-center gap-[4mm] rounded-[2mm] px-[3mm] py-[2.2mm]" style={{ background: 'rgba(180,35,42,0.06)', border: `0.8pt solid rgba(180,35,42,0.45)` }}>
            <div className="min-w-0 flex-1">
              <p className="font-extrabold uppercase" style={{ fontSize: '8.4pt', letterSpacing: '0.08em', color: STAMP_RED }}>Warning to the courier</p>
              <p style={{ fontSize: '8pt' }}>
                This package is tracked from hand to hand. Stealing it will be traced, and you will face the full extent of the law.
              </p>
            </div>
            <ul className="grid shrink-0 grid-cols-5 gap-[1.5mm] text-center" style={{ fontSize: '5.8pt', color: INK_SOFT, width: '78mm' }}>
              {[
                [Lock, 'Sealed'],
                [Camera, 'Photographed'],
                [MapPin, 'GPS logged'],
                [ScanLine, 'Scanned'],
                [Fingerprint, 'KYC verified'],
              ].map(([Icon, label]) => {
                const I = Icon as typeof Lock;
                return (
                  <li key={label as string} className="flex flex-col items-center gap-[0.8mm]">
                    <span className="flex items-center justify-center rounded-full" style={{ width: '7mm', height: '7mm', background: INK }}>
                      <I size={12} color="#fff" strokeWidth={2.2} />
                    </span>
                    {label as string}
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* Signatures + stamps */}
        <section className="relative mt-[5mm] grid grid-cols-2 gap-[8mm]">
          <div>
            <p className="uppercase" style={{ fontSize: '6.4pt', letterSpacing: '0.14em', color: INK_SOFT }}>Signed by the sender</p>
            <p className="mt-[1mm] leading-none" style={{ fontFamily: SIGNATURE_FONT, fontSize: '25pt', height: '12mm', display: 'flex', alignItems: 'flex-end' }}>{doc.signedName}</p>
            <div className="h-px" style={{ background: INK }} />
            <p className="mt-[1mm] font-semibold" style={{ fontSize: '8.4pt' }}>{doc.sender.fullName}</p>
            <p style={{ fontSize: '7.2pt', color: INK_SOFT }}>Signed electronically {fmt(doc.signedAt)}</p>
          </div>
          <div>
            <p className="uppercase" style={{ fontSize: '6.4pt', letterSpacing: '0.14em', color: INK_SOFT }}>Acknowledged by the courier{doc.couriers.length > 1 ? 's' : ''}</p>
            <p className="mt-[1mm] leading-none" style={{ fontFamily: SIGNATURE_FONT, fontSize: doc.couriers.length > 1 ? '17pt' : '25pt', height: '12mm', display: 'flex', alignItems: 'flex-end', gap: '4mm', color: allAcknowledged ? INK : INK_SOFT }}>
              {doc.couriers.length === 0 ? '' : doc.couriers.map((c) => (c.acknowledged ? c.fullName : '')).filter(Boolean).join(' · ')}
            </p>
            <div className="h-px" style={{ background: INK }} />
            {doc.couriers.map((c) => (
              <p key={c.sequence} style={{ fontSize: '7.2pt', color: INK_SOFT }}>
                <span className="font-semibold" style={{ color: INK, fontSize: '8.4pt' }}>{c.fullName}</span>{' '}
                {c.acknowledged ? '· bound on accepting the request' : '· pending: accepting the request binds them to Part B'}
              </p>
            ))}
          </div>
          <div className="pointer-events-none absolute" style={{ left: '50mm', top: '-6mm' }}>
            <RoundStamp top="RELAY · DECLARATION" bottom="SENDER LIABLE · VERIFIED" center="SIGNED" sub={new Date(doc.signedAt).toLocaleDateString('en-GB')} color={STAMP_RED} rotate={-14} />
          </div>
          <div className="pointer-events-none absolute" style={{ right: '8mm', bottom: '-14mm' }}>
            {allAcknowledged ? (
              <BoxStamp lines={['CUSTODY TRACKED', 'ESCROW PROTECTED · RELAY']} color={INK} rotate={7} />
            ) : (
              <BoxStamp lines={['AWAITING COURIER', 'BINDING ON ACCEPTANCE']} color={INK_SOFT} rotate={7} />
            )}
          </div>
        </section>

        {/* Verification footer */}
        <footer className="mt-auto flex items-end gap-[4mm] pt-[3mm]" style={{ borderTop: `0.6pt solid ${RULE}` }}>
          <QrCode value={verifyUrl} size={78} title="Open this declaration on Relay" />
          <div className="flex-1" style={{ fontSize: '6.8pt', color: INK_SOFT }}>
            <p className="font-bold uppercase" style={{ color: INK, letterSpacing: '0.1em' }}>Verify this document</p>
            <p>Scan the code or open it on Relay; only the sender and couriers on this shipment can view it.</p>
            <p className="mt-[1mm] font-mono" style={{ fontSize: '6.2pt' }}>
              Statement v{doc.statementVersion} · SHA-256 {doc.statementHash.slice(0, 16)}…{doc.statementHash.slice(-8)}
              {doc.statementCurrent ? ' · wording unchanged since signing' : ''}
            </p>
            <p className="mt-[1mm]">This record is held with the shipment&apos;s custody log and may be disclosed to law enforcement on lawful request.</p>
          </div>
          <div className="text-right" style={{ fontSize: '6.8pt', color: INK_SOFT }}>
            <Mark size={22} />
            <p className="mt-[1mm]">Page 1 of 1</p>
          </div>
        </footer>
      </div>
    </article>
  );
}
