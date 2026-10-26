'use client';
import React from 'react';
import clsx from 'clsx';
import { Button } from '../button';
import { Typography } from '../typography';
import { CloseIcon as Close, PrinterIcon as Printer, ArrowLeftIcon as BackIcon } from '@/ui/elements/icon/app-icons';

export interface ModalHeaderProps {
  title: string;
  onClose: () => void;
  subtitle?: string;
  showPrinter?: boolean;
  onPrint?: () => void;
  action?: React.ReactNode;
  className?: string;
  showMobileBack?: boolean;
  /** Full replacement for the title's default size classes — use when a
   * consumer needs an exact font size instead of the responsive title-base/
   * title-l scale (e.g. a fixed-width desktop popover). */
  titleClassName?: string;
}

export function ModalHeader({
  title,
  onClose,
  subtitle,
  showPrinter,
  onPrint,
  action,
  className,
  showMobileBack,
  titleClassName,
}: ModalHeaderProps) {
  return (
    <header
      className={clsx(
        'sticky top-0 z-10 rounded-t-2xl bg-background flex items-center justify-between gap-1 border-b border-border px-4 py-2.5 md:px-6 md:py-4',
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        {showMobileBack && (
          <Button
            variant="text"
            size="sm"
            leftIcon={<BackIcon aria-hidden="true" className="h-5 w-5" />}
            onClick={onClose}
            aria-label="Back"
            fit
            customClassName="md:hidden text-muted-foreground hover:text-foreground"
          />
        )}
        <div className="flex min-w-0 flex-col gap-0.5">
          <Typography
            size="title-l"
            weight="semi-bold"
            customClassName={
              titleClassName ?? 'truncate first-letter:capitalize !text-title-base md:!text-title-l'
            }
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography size="body-s" weight="regular" customClassName="text-muted-foreground">
              {subtitle}
            </Typography>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 lg:gap-2">
        {action}
        {showPrinter && (
          <Button
            variant="text"
            size="sm"
            leftIcon={<Printer aria-hidden="true" className="h-5 w-5" />}
            onClick={onPrint}
            aria-label="Print"
            customClassName="text-muted-foreground hover:text-foreground"
          />
        )}
        <Button
          variant="text"
          size="sm"
          leftIcon={<Close aria-hidden="true" className="h-5 w-5" />}
          onClick={onClose}
          aria-label="Close"
          customClassName={clsx(
            'text-muted-foreground hover:text-foreground',
            showMobileBack && 'hidden md:flex'
          )}
        />
      </div>
    </header>
  );
}

export default ModalHeader;
