import clsx from 'clsx';
import React from 'react';
import type { JSX } from 'react';

import styles from './index.module.scss';
import { SkeletonLoaderProps } from './index.types';

// SkeletonLoader component
const SkeletonLoader: React.FC<SkeletonLoaderProps> = (props) => {
  const {
    variant = 'rounded',
    tag,
    customClassName = '',
    children,
    width = 'auto',
    height = '1.2rem',
    ...rest
  } = props;

  // Resolved tag
  const Tag = (tag || 'span') as keyof JSX.IntrinsicElements;

  return (
    <Tag
      style={{ width, height }}
      className={clsx(
        customClassName,
        styles['skeleton-root'],
        styles[`skeleton-variant-${variant}`]
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
};

export { SkeletonLoader };
export * from './index.types';
