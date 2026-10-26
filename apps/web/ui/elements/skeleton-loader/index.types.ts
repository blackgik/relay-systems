export type SkeletonLoaderVariant = 'circular' | 'rectangular' | 'rounded';

export interface SkeletonLoaderProps extends React.HTMLAttributes<HTMLOrSVGElement> {
  width?: string;
  height?: string;
  variant?: SkeletonLoaderVariant;
  customClassName?: string;
  tag?: string;
}
