'use client';

import React, { useId, useState } from 'react';
import clsx from 'clsx';
import { Camera, RefreshCw } from 'lucide-react';
import { compressImageFile } from '@/utils';

const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

/** Photo picker for KYC images. On phones `capture` opens the camera directly. */
export function PhotoInput({
  label,
  hint,
  value,
  onChange,
  capture,
  error,
}: {
  label: string;
  hint: string;
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  capture?: 'user' | 'environment';
  error?: string | null;
}) {
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const pick = async (file?: File) => {
    if (!file) return;
    setLocalError(null);
    if (!/^image\/(jpe?g|png|webp)$/.test(file.type)) {
      setLocalError('Use a JPG, PNG or WebP photo');
      return;
    }
    setBusy(true);
    try {
      const small = await compressImageFile(file, { maxDimension: 1400, maxSizeMb: 1.5 });
      if (small.size > 4 * 1024 * 1024) throw new Error('Photo is too large');
      onChange(await readAsDataUrl(small));
    } catch (e) {
      setLocalError((e as Error).message || 'Could not read that photo');
    } finally {
      setBusy(false);
    }
  };

  const shown = error || localError;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-label-l text-text-primary">{label}</span>
      <label
        htmlFor={id}
        className={clsx(
          'group relative flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 border-dashed bg-surface text-center transition-colors hover:border-brand/50',
          shown ? 'border-destructive' : value ? 'border-transparent' : 'border-border'
        )}
      >
        {value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt={label} className="absolute inset-0 h-full w-full object-cover" />
            <span className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-body-s text-white">
              <RefreshCw size={14} /> Retake
            </span>
          </>
        ) : (
          <>
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-subtle text-icon-brand dark:text-accent-signal">
              <Camera size={20} />
            </span>
            <span className="text-title-s text-text-primary">{busy ? 'Processing…' : 'Tap to add photo'}</span>
            <span className="max-w-[220px] px-4 text-body-s text-text-tertiary">{hint}</span>
          </>
        )}
        <input
          id={id}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture={capture}
          className="sr-only"
          onChange={(e) => {
            void pick(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </label>
      {shown && <p className="text-body-s text-destructive">{shown}</p>}
    </div>
  );
}
