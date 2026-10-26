import clsx from 'clsx';
import type { JSX } from 'react';
import { defaultWeight } from '@/src/tokens/typography';
import type { FontSizeKey, FontWeightKey } from '@/src/tokens/typography';
import {
  tagDefaultMap,
  TypographyColors,
  TypographyProps,
} from './index.types';

const sizeClassMap: Record<FontSizeKey, string> = {
  'display-l': 'text-display-l',
  'display-m': 'text-display-m',
  'display-s': 'text-display-s',
  'display-xs': 'text-display-xs',
  'numeric-xl': 'text-numeric-xl',
  'numeric-l': 'text-numeric-l',
  'headline-l': 'text-headline-l',
  'headline-m': 'text-headline-m',
  'headline-s': 'text-headline-s',
  'title-l': 'text-title-l',
  'title-base': 'text-title-base',
  'title-xs': 'text-title-xs',
  'title-m': 'text-title-m',
  'title-s': 'text-title-s',
  'body-l': 'text-body-l',
  'body-m': 'text-body-m',
  'body-s': 'text-body-s',
  'label-l': 'text-label-l',
  'label-m': 'text-label-m',
  'label-s': 'text-label-s',
  'caption-r': 'text-caption-r',
  'caption': 'text-caption',
  'micro': 'text-micro',
};

const weightClassMap: Record<FontWeightKey, string> = {
  thin: 'font-thin',
  'ultra-light': 'font-ultra-light',
  light: 'font-light',
  regular: 'font-regular',
  medium: 'font-medium',
  'semi-bold': 'font-semi-bold',
  bold: 'font-bold',
  'extra-bold': 'font-extra-bold',
  black: 'font-black',
};

const underlineClassMap = {
  always: 'underline',
  hover: 'hover:underline',
  none: '',
};

const alignClassMap = {
  center: 'text-center',
  start: 'text-start',
  end: 'text-end',
  left: 'text-left',
  right: 'text-right',
  justify: 'text-justify',
};

const HEADING_SIZES = new Set<FontSizeKey>([
  'display-l', 'display-m', 'display-s', 'display-xs',
  'headline-l', 'headline-m', 'headline-s',
  'title-l', 'title-base', 'title-xs', 'title-m', 'title-s',
]);

const colorClassMap: Partial<Record<TypographyColors, string>> = {
  primary: 'text-text-secondary',
  muted: 'text-text-tertiary',
  brand: 'text-text-brand',
  secondary: 'text-text-secondary',
  destructive: 'text-destructive',
  error: 'text-destructive',
  white: 'text-white',
  success: 'text-success-text',
  active: 'text-success-text',
  info: 'text-info-text',
  warn: 'text-warning-text',
  neutral20: 'text-neutral-20',
  neutral400: 'text-text-tertiary',
  neutral500: 'text-text-tertiary',
  neutral600: 'text-text-secondary',
  neutral700: 'text-text-secondary',
  neutral800: 'text-text-secondary',
  gSBody: 'text-text-secondary',
  gSPlacehold: 'text-text-tertiary',
  gSLabel: 'text-text-tertiary',
};

const Typography: React.FC<TypographyProps> = (props) => {
  const {
    size: sizeProp,
    weight: weightProp,
    as: asProp,
    weight: fontWeightProp,
    as: tag,
    underline = 'none',
    gutterBottom,
    noWrap,
    align = 'left',
    color = 'primary',
    customClassName = '',
    children,
    ...rest
  } = props;

  let resolvedSize: FontSizeKey;

  if (sizeProp !== undefined) {
    resolvedSize = sizeProp;
  } else {
    resolvedSize = 'body-m';
  }

  let resolvedWeight: FontWeightKey;

  if (weightProp !== undefined) {
    resolvedWeight = weightProp;
  } else if (fontWeightProp !== undefined) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        `[Typography] fontWeight="${fontWeightProp}" is deprecated. Use weight="${fontWeightProp}" instead.`
      );
    }
    resolvedWeight = fontWeightProp;
  } else {
    resolvedWeight = defaultWeight[resolvedSize];
  }

  const Tag = (asProp || tag || tagDefaultMap[resolvedSize] || 'p') as keyof JSX.IntrinsicElements;

  const resolvedColorClass =
    color === 'primary' && HEADING_SIZES.has(resolvedSize)
      ? 'text-text-primary'
      : colorClassMap[color];

  const classes = clsx(
    sizeClassMap[resolvedSize],
    weightClassMap[resolvedWeight],
    gutterBottom && 'mb-4',
    noWrap && 'overflow-hidden text-ellipsis whitespace-nowrap',
    resolvedColorClass,
    underlineClassMap[underline],
    alignClassMap[align],
  );

  return (
    <Tag className={clsx(customClassName, classes)} {...rest}>
      {children}
    </Tag>
  );
};

export { Typography };
export * from './index.types';
