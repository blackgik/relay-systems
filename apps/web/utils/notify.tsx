'use client';

import { Id, toast as reactToast } from 'react-toastify';
import { ToastContent } from '@/ui/elements/toast';
import type { ToastVariant, ToastPositionType, ToastAction } from '@/ui/elements/toast';

// ─── Legacy props (backward-compatible with all existing callers) ─────────────

interface NotifProps {
  message?: string;
  subtitle?: string;
  /** Duration in ms. 0 = persistent. Default: 5000 */
  autoClose?: number | false;
  position?: ToastPositionType;
  showProgress?: boolean;
  action?: ToastAction;
  onClose?: () => void;
}

interface UpdateNotifProps {
  message?: string;
  subtitle?: string;
  type?: ToastVariant | 'default';
  autoClose?: number | false;
  position?: ToastPositionType;
}

// ─── Internal helper ──────────────────────────────────────────────────────────

/**
 * Callers routinely pass the API's own `res.message` as the subtitle, and it
 * usually restates the heading — "Product updated successfully!" over
 * "updated successfully". A subtitle that adds nothing is worse than none,
 * so drop it when it is the heading in other words.
 */
const squash = (value?: string) => (value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** Words that carry no information on their own in a success or failure toast. */
const FILLER = new Set([
  'a', 'an', 'the', 'is', 'was', 'were', 'been', 'has', 'have', 'your',
  'add', 'added', 'create', 'created', 'delete', 'deleted', 'edit', 'edited',
  'remove', 'removed', 'save', 'saved', 'update', 'updated',
  'success', 'successful', 'successfully', 'record', 'item', 'data',
]);

export const meaningfulSubtitle = (message?: string, subtitle?: string) => {
  const a = squash(message);
  const b = squash(subtitle);
  if (!b) return undefined;
  // Every string contains '', so an absent heading must not swallow the subtitle.
  if (!a) return subtitle;
  if (a.includes(b) || b.includes(a)) return undefined;

  // The API often restates the heading in its own word order — "Brand update
  // successfully!" over "Edited Successfully". Keep the subtitle only when it
  // says something the heading does not.
  // "Created attributes successfully" under "Attribute created successfully!"
  // is the same sentence, so singular and plural have to compare equal.
  const stem = (word: string) => (word.length > 3 && word.endsWith('s') ? word.slice(0, -1) : word);
  const headingWords = new Set(a.split(' ').map(stem));
  const rest = b
    .split(' ')
    .map(stem)
    .filter((word) => !FILLER.has(word) && !headingWords.has(word));

  return rest.length ? subtitle : undefined;
};

const fire = (variant: ToastVariant, { message, subtitle: rawSubtitle, autoClose = 5000, position = 'top-right', showProgress = true, action, onClose }: NotifProps): Id => {
  const subtitle = meaningfulSubtitle(message, rawSubtitle);

  return reactToast(
    ({ closeToast }) => (
      <ToastContent
        variant={variant}
        title={message ?? ''}
        description={subtitle}
        duration={autoClose === false ? 0 : autoClose}
        showProgress={showProgress}
        action={action}
        onClose={onClose}
        closeToast={closeToast}
      />
    ),
    {
      position,
      autoClose: autoClose === false ? false : autoClose,
      hideProgressBar: true,
      closeButton: false,
      icon: false,
      pauseOnHover: false,
      style: { background: 'transparent', boxShadow: 'none', padding: 0 },
    },
  );
};

// ─── Public API ───────────────────────────────────────────────────────────────

const success = (options: NotifProps): Id => fire('success', options);
const error   = (options: NotifProps): Id => fire('error',   options);
const info    = (options: NotifProps): Id => fire('info',    options);
const warning = (options: NotifProps): Id => fire('warning', options);
const neutral = (options: NotifProps): Id => fire('neutral', options);

const update = (id: Id, { message, subtitle, type, ...rest }: UpdateNotifProps) => {
  const variant: ToastVariant =
    type === 'error'   ? 'error'   :
    type === 'success' ? 'success' :
    type === 'warning' ? 'warning' :
    type === 'info'    ? 'info'    : 'neutral';

  reactToast.update(id, {
    render: ({ closeToast }) => (
      <ToastContent
        variant={variant}
        title={message ?? ''}
        description={subtitle}
        closeToast={closeToast}
      />
    ),
    ...rest,
  });
};

const dismissAll = () => reactToast.dismiss();
const dismiss    = (id?: Id) => reactToast.dismiss(id);

export { success, error, info, warning, neutral, update, dismissAll, dismiss };
