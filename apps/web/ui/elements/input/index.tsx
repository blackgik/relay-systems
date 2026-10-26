'use client';

import React, { ForwardedRef } from 'react';
import clsx from 'clsx';
import { FieldValues, UseFormRegisterReturn, Path } from 'react-hook-form';
import { InputProps } from './index.types';
import { Typography } from '../typography';
import Tooltip from '../tooltip';
import { useCurrency } from '@/lib/currency';
import { ImportantIcon as Important, ErrorWarningFillIcon as ImportantIcon } from '@/ui/elements/icon/app-icons';

const sizeStyles = {
  sm: 'h-[38px] px-3 py-0',
  md: 'h-12 px-4 pt-4 pb-2',
  lg: 'h-14 px-4 pt-4 pb-2',
};

const labelStyles = {
  sm: '',
  md: '-translate-y-3 scale-75 top-[12px] peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100 peer-autofill:top-[4px] peer-autofill:-translate-y-[4px] peer-focus:top-[4px] peer-focus:-translate-y-[4px] peer-focus:scale-75',
  lg: '-translate-y-4 scale-75 top-[16px] peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100 peer-autofill:top-[18px] peer-autofill:-translate-y-[18px] peer-focus:top-[18px] peer-focus:-translate-y-[18px] peer-focus:scale-75',
};

const InputComponent = <FV extends FieldValues>(
  props: InputProps<FV>,
  ref?: ForwardedRef<HTMLInputElement>
) => {
  const { symbol } = useCurrency();
  const {
    placeholder,
    errorMessage,
    infoMessage,
    label,
    register,
    name,
    id,
    value,
    customClassName,
    labelClassName,
    showMiniText,
    miniText,
    tooltipContent,
    tooltipPlacement = 'top',
    showImportanticon,
    showMiniButton,
    miniBtnLabel,
    sizeType = 'lg',
    ...rest
  } = props;

  const inputId = id || name;

  // Resolves placeholder for styling purposes
  const placeholderValue = label ? ' ' : placeholder;

  const inputDisabledStyles = clsx('disabled:bg-surface-disabled disabled:cursor-not-allowed disabled:text-text-disabled');

  const inputBorderStyles = clsx(
    errorMessage
      ? 'border-destructive focus:ring-destructive-muted'
      : infoMessage
        ? 'border-brand focus:ring-brand'
        : 'border-input-border focus:border-brand hover:border hover:border-brand active:border active:border-brand focus:ring-brand'
  );

  const registerInput: UseFormRegisterReturn<Path<FV>> | object = register
    ? register(name as Path<FV>, { required: rest.required })
    : {};

  // `registerInput` is spread last so RHF owns ref/name/value tracking, which
  // means it would otherwise clobber an `onChange`/`onBlur` passed by the
  // caller. Compose them instead: RHF records the change first, then the
  // caller's handler runs and can derive/override other fields (e.g. selling
  // price -> markup %).
  const registered = registerInput as Partial<UseFormRegisterReturn<Path<FV>>>;
  const composedHandlers = register
    ? {
        onChange: async (e: React.ChangeEvent<HTMLInputElement>) => {
          await registered.onChange?.(e);
          rest.onChange?.(e);
        },
        onBlur: async (e: React.FocusEvent<HTMLInputElement>) => {
          await registered.onBlur?.(e);
          rest.onBlur?.(e);
        },
      }
    : {};

  return (
    <div className="relative z-0 w-full">
      {showMiniButton && (
        <span
          className={clsx(
            'absolute left-4 z-20 flex h-8 w-6 items-center justify-center text-body-l font-bold text-text-secondary',
            sizeType === 'md' ? 'top-2' : 'top-3'
          )}
        >
          {miniBtnLabel || symbol}
        </span>
      )}

      <input
        className={clsx(
          customClassName,
          sizeStyles[sizeType],
          showMiniText && 'pr-24',
          // Clear the currency symbol (left-4 + w-6) so it doesn't sit on the value.
          showMiniButton && 'pl-11',
          'peer block w-full appearance-none rounded-lg border bg-background text-[16px] md:text-body-m text-text-primary placeholder:text-text-tertiary autofill:bg-background [&:not(:placeholder-shown)]:font-medium',
          inputDisabledStyles,
          inputBorderStyles
        )}
        id={inputId}
        aria-invalid={errorMessage ? true : undefined}
        value={value}
        placeholder={placeholderValue}
        ref={ref}
        {...rest}
        {...registerInput}
        {...composedHandlers}
      />

      {sizeType !== 'sm' && (
        <label
          htmlFor={inputId}
          className={clsx(
            labelClassName,
            labelStyles[sizeType],
            // One line always: a long label ("Last Name (optional)") used to wrap
            // out of a half-width field on a phone.
            showMiniText ? 'max-w-[calc(100%_-_6rem)]' : 'max-w-[calc(100%_-_2rem)]',
            'truncate',
            // Line up with the padded value when the currency symbol is shown.
            showMiniButton ? 'left-11' : 'left-4',
            'absolute z-10 origin-[0] transform cursor-text font-medium text-text-tertiary duration-300 peer-focus:text-text-brand text-[16px] md:text-body-l'
          )}
          >
          {label}
        </label>
      )}

      {showMiniText && (
        <Typography
          color="neutral700"
          size="title-m"
          customClassName="absolute top-4 right-4 flex items-center gap-2"
        >
          {miniText}
          {showImportanticon &&
            <Tooltip
              content={tooltipContent || ''}
              placement={tooltipPlacement}
              bubbleClassName="!max-w-[280px] line-clamp-3"
            >
              <Important />
            </Tooltip>
          }
        </Typography>
      )}

      {errorMessage || infoMessage ? (
        <Typography
          size="body-s"
          customClassName="pt-2 flex items-center gap-1"
          weight="regular"
          color={errorMessage ? 'error' : 'secondary'}
        >
          <ImportantIcon className={clsx(errorMessage ? 'text-icon-error' : null)} />
          <span>{errorMessage || infoMessage}</span>
        </Typography>
      ) : null}
    </div>
  );
};

export type InputComponentType = <FV extends FieldValues>(
  props: InputProps<FV> & { ref?: React.ForwardedRef<HTMLInputElement> }
) => ReturnType<typeof InputComponent>;

const Input = React.forwardRef(InputComponent) as InputComponentType;

export { Input };

export * from './index.types';
