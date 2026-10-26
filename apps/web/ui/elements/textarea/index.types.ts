import { LegacyRef } from 'react';
import { UseFormRegister, FieldValues, Path } from 'react-hook-form';

export interface TextareaProps<IFormValues extends FieldValues>
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  id?: string;
  label?: React.ReactNode | string;
  name: Path<IFormValues>;
  errorMessage?: React.ReactNode | string;
  infoMessage?: React.ReactNode | string;
  register?: UseFormRegister<IFormValues>;
  required?: boolean;
  customClassName?: string;
  ref?: LegacyRef<HTMLTextAreaElement>;
}
