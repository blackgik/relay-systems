'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, ShieldCheck } from 'lucide-react';
import { Button } from '@/ui/elements';
import { EmptyState } from '@/components/empty-state';
import { DeclarationDocument } from '@/components/declaration/declaration-document';
import { useRequireAuth } from '@/lib/auth';
import { ApiError, api } from '@/lib/api';
import type { Declaration } from '@/lib/types';

const SHEET_PX = 794; // 210mm at 96dpi

/**
 * The A4 declaration, for the sender and the couriers on the shipment.
 * "Download PDF" prints just the sheet (A4, no margins); the file name
 * carries the reference and both parties' full names.
 */
export default function DeclarationPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, token, loading } = useRequireAuth();
  const [doc, setDoc] = useState<Declaration | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verifyUrl, setVerifyUrl] = useState('');
  const [scale, setScale] = useState(1);
  const frame = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token || !id) return;
    api<Declaration>(`/attestations/${encodeURIComponent(id)}`, { token })
      .then(setDoc)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load this declaration'));
    setVerifyUrl(`${window.location.origin}/declarations/${id}`);
  }, [token, id]);

  // Shrink the sheet to fit narrow screens; print always uses the real size.
  useLayoutEffect(() => {
    const el = frame.current;
    if (!el) return;
    const fit = () => setScale(Math.min(1, el.clientWidth / SHEET_PX));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [doc]);

  if (!loading && !user) return null;

  const download = () => {
    if (!doc) return;
    const names = [doc.sender.fullName, ...doc.couriers.map((c) => c.fullName)].join('-');
    const previous = document.title;
    document.title = `Relay-Declaration-${doc.reference}-${names}`.replace(/[^\w-]+/g, '-');
    window.print();
    document.title = previous;
  };

  return (
    <div className="declaration-page min-h-screen bg-background px-4 py-6 print:bg-white print:p-0">
      <div className="mx-auto flex max-w-[794px] flex-col gap-4 print:max-w-none">
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <button type="button" onClick={() => router.back()} className="inline-flex items-center gap-1.5 text-body-s font-medium text-text-secondary hover:text-text-primary">
            <ArrowLeft size={15} /> Back
          </button>
          {doc && <Button label="Download PDF" fit iconLeading={<Download size={16} />} onClick={download} />}
        </div>

        {doc && (
          <p className="flex items-start gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-body-s text-text-secondary print:hidden">
            <ShieldCheck size={17} className="mt-0.5 shrink-0 text-success" />
            {doc.viewerRole === 'SENDER'
              ? 'You signed this declaration. Your courier sees the same document, with your full name, and can download it too.'
              : doc.couriers.some((c) => !c.acknowledged)
                ? 'Accepting this request binds you to Part B. The sender has already signed Part A and holds the same copy.'
                : 'You are bound by Part B. The sender signed Part A; both of you hold this same copy.'}
          </p>
        )}

        {error && <EmptyState art="shield" title="Declaration unavailable" body={error} cta={{ href: '/dashboard', label: 'Back to dashboard' }} />}
        {!doc && !error && <div className="aspect-[210/297] w-full animate-pulse rounded-lg bg-muted" aria-label="Loading declaration" />}

        {doc && (
          <div ref={frame} className="w-full print:!h-auto" style={{ height: `${297 * 3.7795 * scale}px` }}>
            <div
              className="origin-top-left shadow-2lg print:!transform-none print:shadow-none"
              style={{ transform: `scale(${scale})`, width: `${SHEET_PX}px` }}
            >
              <DeclarationDocument doc={doc} verifyUrl={verifyUrl} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
