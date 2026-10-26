'use client';

import React, { ForwardedRef } from 'react';
import { FieldValues, Path, UseFormRegisterReturn } from 'react-hook-form';
import { TextareaProps } from './index.types';
import clsx from 'clsx';
import { Typography } from '../typography';

const TextareaComponent = <FV extends FieldValues>(
  props: TextareaProps<FV>,
  ref?: ForwardedRef<HTMLTextAreaElement>
) => {
  const {
    placeholder,
    errorMessage,
    infoMessage,
    label,
    register,
    name,
    customClassName,
    ...rest
  } = props;

  // Resolves placeholder for styling purposes
  const placeholderValue = label ? ' ' : placeholder;

  // Input classes
  const inputPaddingClass = clsx(label ? 'px-4 pr-8 pb-2.5 pt-5' : 'p-4 pr-8');
  const inputDisabledStyles = clsx('disabled:bg-surface-disabled disabled:cursor-not-allowed disabled:text-text-disabled disabled:border-input-border');
  const inputBorderStyles = clsx(
    errorMessage
      ? 'border-destructive focus:ring-destructive-muted'
      : infoMessage
      ? 'border-brand focus:ring-brand'
      : 'border-input-border hover:border-brand focus:border-brand focus:ring-brand'
  );

  const registerInput: UseFormRegisterReturn<Path<FV>> | object = register
    ? register(name, { required: rest.required })
    : {};

  return (
    <div className="relative z-0 w-full">
      <textarea
        className={clsx(
          customClassName,
          'peer block w-full appearance-none rounded-xl border bg-background text-[16px] md:text-body-m text-text-primary placeholder:text-text-tertiary autofill:bg-background focus:outline-none focus:ring-1 [&:not(:placeholder-shown)]:font-medium',
          inputPaddingClass,
          inputDisabledStyles,
          inputBorderStyles,
        )}
        id={name}
        placeholder={placeholderValue}
        {...rest}
        ref={ref}
        {...registerInput}
      />

      <label
        htmlFor={name}
        className="absolute left-4 top-[16px] z-10 origin-[0] -translate-y-4 scale-75 transform cursor-text text-[16px] font-medium text-text-tertiary duration-300 peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100 peer-autofill:top-[18px] peer-autofill:-translate-y-[18px] peer-focus:top-[18px] peer-focus:-translate-y-[18px] peer-focus:scale-75 peer-focus:text-text-brand md:text-body-l"
      >
        {label}
      </label>

      {errorMessage || infoMessage ? (
        <Typography
          size="body-s"
          customClassName="pl-4 pt-2"
          weight="regular"
          color={errorMessage ? 'error' : 'secondary'}
        >
          {errorMessage || infoMessage}
        </Typography>
      ) : null}
    </div>
  );
};

export type TextareaComponentType = <FV extends FieldValues>(
  props: TextareaProps<FV> & { ref?: React.ForwardedRef<HTMLTextAreaElement> }
) => ReturnType<typeof TextareaComponent>;

const Textarea = React.forwardRef(TextareaComponent) as TextareaComponentType;

export { Textarea };
export * from './index.types';
