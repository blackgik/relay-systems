'use client';

import React from 'react';
import {
  ToastContainer as ReactToastContainer,
  toast as reactToast,
  Id,
} from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css'; // base CSS — positioning, auto-close animation, entry/exit
import clsx from 'clsx';
import { Typography } from '../typography';
import type { ToastVariant, ToastContentProps, ToastContainerProps, ToastParams } from './index.types';
import { CircleCheck, CircleX, Info, TriangleAlert, X } from 'lucide-react';

// ─── Variant visual config ────────────────────────────────────────────────────

const variantConfig: Record<
  ToastVariant,
  { iconBg: string; iconText: string; accent: string; progressBg: string; icon: React.ReactNode }
> = {
  success: {
    iconBg:     'bg-success-subtle',
    iconText:   'text-icon-success',
    accent:     'border-l-2 border-l-success-text',
    progressBg: 'bg-success-text',
    icon: (
      <CircleCheck size={16} strokeWidth={2} aria-hidden />
    ),
  },
  warning: {
    iconBg:     'bg-warning-subtle',
    iconText:   'text-icon-warning',
    accent:     'border-l-2 border-l-warning-text',
    progressBg: 'bg-warning-text',
    icon: (
      <TriangleAlert size={16} strokeWidth={2} aria-hidden />
    ),
  },
  error: {
    iconBg:     'bg-destructive-subtle',
    iconText:   'text-icon-error',
    accent:     'border-l-2 border-l-destructive',
    progressBg: 'bg-destructive',
    icon: (
      <CircleX size={16} strokeWidth={2} aria-hidden />
    ),
  },
  info: {
    iconBg:     'bg-info-subtle',
    iconText:   'text-icon-info',
    accent:     'border-l-2 border-l-info-text',
    progressBg: 'bg-info-text',
    icon: (
      <Info size={16} strokeWidth={2} aria-hidden />
    ),
  },
  neutral: {
    iconBg:     'bg-muted',
    iconText:   'text-icon-muted',
    accent:     'border-l-2 border-l-border',
    progressBg: 'bg-muted-foreground',
    icon: (
      <Info size={16} strokeWidth={2} aria-hidden />
    ),
  },
};

// ─── ToastContent — visual component ─────────────────────────────────────────

const ToastContent: React.FC<ToastContentProps> = ({
  variant = 'neutral',
  title,
  description,
  action,
  duration = 4000,
  showProgress = true,
  onClose,
  closeToast,
  className,
}) => {
  const config = variantConfig[variant];
  const showBar = showProgress && duration > 0;

  const handleClose = () => {
    closeToast?.();
    onClose?.();
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className={clsx(
        'relative flex gap-3 overflow-hidden',
        'rounded-lg bg-card border border-border shadow-lg',
        'w-full md:w-[360px] md:max-w-[400px] p-4 pb-5',
        config.accent,
        className,
      )}
    >
      {/* Variant icon */}
      <div
        className={clsx(
          'flex-shrink-0 flex items-center justify-center',
          'w-8 h-8 rounded-full',
          config.iconBg,
          config.iconText,
        )}
      >
        {config.icon}
      </div>

      {/* Text content */}
      <div className="flex-1 min-w-0 pr-5">
        <Typography size="body-m" weight="semi-bold" customClassName="text-foreground" as="p">
          {title}
        </Typography>
        {description && (
          <Typography
            size="body-s"
            weight="regular"
            color="muted"
            as="p"
            customClassName="mt-0.5"
          >
            {description}
          </Typography>
        )}
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="mt-2 transition-colors duration-150 hover:opacity-80"
          >
            <Typography size="body-s" weight="medium" customClassName="text-brand" as="span">
              {action.label} →
            </Typography>
          </button>
        )}
      </div>

      {/* Close button */}
      <button
        type="button"
        onClick={handleClose}
        aria-label="Dismiss notification"
        className={clsx(
          'absolute top-3 right-3',
          'text-text-tertiary hover:text-text-secondary',
          'transition-colors duration-150',
        )}
      >
        <X size={16} strokeWidth={2} aria-hidden />
      </button>

      {/* Progress bar — CSS animation driven by duration */}
      {showBar && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted overflow-hidden">
          <div
            className={clsx('h-full origin-left', config.progressBg)}
            style={{
              animation: `toast-progress ${duration}ms linear forwards`,
            }}
          />
        </div>
      )}
    </div>
  );
};

// ─── ToastContainer — place once at the app root ─────────────────────────────

const ToastContainer: React.FC<ToastContainerProps> = ({
  position = 'top-right',  // default: top-right (above content, clear of bottom nav)
  limit = 3,
}) => (
  <ReactToastContainer
    position={position}
    autoClose={4000}
    hideProgressBar    // we render our own progress bar inside ToastContent
    newestOnTop
    closeOnClick={false}
    rtl={false}
    pauseOnFocusLoss={false}
    draggable={false}
    pauseOnHover={false}
    closeButton={false}  // we render our own close button inside ToastContent
    icon={false}
    limit={limit}
    // z-index is controlled by .Toastify__toast-container override in globals.css
  />
);

// ─── Imperative toast API ─────────────────────────────────────────────────────

const fire = (variant: ToastVariant, options: ToastParams): Id => {
  const {
    title,
    description,
    duration = 4000,
    position = 'top-right',
    showProgress = true,
    action,
    onClose,
  } = options;

  return reactToast(
    ({ closeToast }) => (
      <ToastContent
        variant={variant}
        title={title}
        description={description}
        duration={duration}
        showProgress={showProgress}
        action={action}
        onClose={onClose}
        closeToast={closeToast}
      />
    ),
    {
      position,
      autoClose: duration === 0 ? false : duration,
      hideProgressBar: true,
      closeButton: false,
      icon: false,
      pauseOnHover: false,
      style: { background: 'transparent', boxShadow: 'none', padding: 0 },
    },
  );
};

export const toast = {
  success:    (options: ToastParams) => fire('success', options),
  warning:    (options: ToastParams) => fire('warning', options),
  error:      (options: ToastParams) => fire('error', options),
  info:       (options: ToastParams) => fire('info', options),
  neutral:    (options: ToastParams) => fire('neutral', options),
  dismiss:    (id?: Id) => reactToast.dismiss(id),
  dismissAll: () => reactToast.dismiss(),
};

export { ToastContent, ToastContainer };
export type { ToastVariant, ToastPositionType, ToastContentProps, ToastContainerProps, ToastParams, ToastAction } from './index.types';
