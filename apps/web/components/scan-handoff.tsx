'use client';

import React, { useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { Button, ImageUploader, Input, Typography, toast } from '@/ui/elements';
import { ApiError, api } from '@/lib/api';

function currentPosition(): Promise<{ lat: number; lng: number } | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return Promise.resolve(null);
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 4000);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      }
    );
  });
}

export function ScanHandoff({ token, onDone }: { token: string; onDone: () => void }) {
  const [scanned, setScanned] = useState<string | null>(null);
  const [manual, setManual] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [sealId, setSealId] = useState('');
  const [photo, setPhoto] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState<string | null>(null);

  const submit = async (jwt: string) => {
    if (!sealId.trim() || !photo) {
      toast.error({ title: 'Missing details', description: 'Seal ID and a photo are required.' });
      return;
    }
    setBusy(true);
    try {
      const geo = await currentPosition();
      const result = await api<{ duplicate: boolean; code: string | null }>(`/custody/handoff`, {
        method: 'POST',
        token,
        body: {
          token: jwt,
          sealId: sealId.trim(),
          photos: [photo],
          lat: geo?.lat,
          lng: geo?.lng,
          idempotencyKey: crypto.randomUUID(),
        },
      });
      setCode(result.code);
      toast.success({ title: 'Handoff confirmed', description: 'Compare the code with the taker.' });
      onDone();
    } catch (err) {
      toast.error({
        title: 'Handoff failed',
        description: err instanceof ApiError ? err.message : 'Try again',
      });
    } finally {
      setBusy(false);
    }
  };

  if (code) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-border p-6">
        <Typography size="body-m" color="secondary" as="p">
          Handoff complete. Confirm this code matches the taker&apos;s screen:
        </Typography>
        <Typography size="display-s" weight="bold" color="primary" as="p">
          {code}
        </Typography>
      </div>
    );
  }

  if (!scanned) {
    return (
      <div className="flex max-w-md flex-col gap-3">
        {!manual ? (
          <>
            <div className="overflow-hidden rounded-lg border border-border">
              <Scanner
                onScan={(result: any) => {
                  const value = Array.isArray(result) ? result[0]?.rawValue : result?.rawValue;
                  if (typeof value === 'string' && value.length > 20) setScanned(value);
                }}
                onError={() => {}}
              />
            </div>
            <Button
              label="Enter token manually"
              variant="text"
              size="sm"
              onClick={() => setManual(true)}
            />
          </>
        ) : (
          <>
            <Input
              name="token"
              label="Handoff token"
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
            />
            <Button
              label="Use token"
              variant="secondary"
              disabled={!manualToken}
              onClick={() => setScanned(manualToken)}
            />
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex max-w-md flex-col gap-4">
      <Typography size="body-m" weight="medium" color="primary" as="p">
        Code scanned. Confirm the seal and take a photo to complete the handoff.
      </Typography>
      <Input name="seal" label="Seal ID" value={sealId} onChange={(e) => setSealId(e.target.value)} />
      <ImageUploader imageUrl={photo} setImageUrl={setPhoto} id="handoff-photo" />
      <div>
        <Button label={busy ? 'Confirming…' : 'Confirm handoff'} disabled={busy} onClick={() => submit(scanned)} />
      </div>
    </div>
  );
}
