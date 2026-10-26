import { LegacyRef } from 'react';
import { UseFormRegister, FieldValues, Path } from 'react-hook-form';

export interface InputProps<IFormValues extends FieldValues>
  extends React.InputHTMLAttributes<HTMLInputElement> {
  id?: string;
  label?: React.ReactNode | string;
  name: Path<IFormValues>;
  sizeType?: 'sm' | 'md' | 'lg';
  errorMessage?: React.ReactNode | string;
  infoMessage?: React.ReactNode | string;
  register?: UseFormRegister<IFormValues>;
  required?: boolean;
  customClassName?: string;
  labelClassName?: string;
  ref?: LegacyRef<HTMLInputElement>;
  showMiniText?: boolean;
  miniText?: string;
  showImportanticon?: boolean;
  showMiniButton?: boolean;
  miniBtnLabel?: string;
  tooltipContent?: string;
  tooltipPlacement?: 'top' | 'right' | 'bottom' | 'left';
}
