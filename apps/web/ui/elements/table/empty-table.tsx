import { ReactNode } from 'react';
import clsx from 'clsx';
import { PackageSearch } from 'lucide-react';
import { Typography } from '../typography';

export interface EmptyTableProps {
  title?: string;
  subtitle?: string;
  children?: ReactNode;
  icon?: ReactNode;
  customStyle?: string;
  smTable?: boolean;
}

function EmptyGlyph({ icon }: { icon?: ReactNode }) {
  if (icon) return <>{icon}</>;
  return (
    <span className="flex h-24 w-24 items-center justify-center rounded-full bg-muted md:h-32 md:w-32">
      <PackageSearch className="h-10 w-10 text-icon-muted md:h-14 md:w-14" aria-hidden />
    </span>
  );
}

export const TableEmptyListView = ({
  title = 'Nothing to show...',
  subtitle,
  children,
  customStyle,
}: EmptyTableProps) => (
  <div className={clsx('my-48 flex w-full flex-col items-center justify-center gap-6', customStyle)}>
    <EmptyGlyph />
    <div className="flex max-w-[375px] flex-col items-center gap-2 text-center">
      <Typography size="title-s" weight="semi-bold" color="primary">
        {title}
      </Typography>
      {subtitle && (
        <Typography size="body-m" customClassName="!text-muted-foreground text-center">
          {subtitle}
        </Typography>
      )}
    </div>

    {children}
  </div>
);

export const DefaultEmptyTable = ({
  children,
  customStyle,
  icon,
  subtitle,
  smTable,
  title = 'No data found.',
}: EmptyTableProps) => (
  <div
    className={clsx(
      'flex h-full w-full flex-1 flex-col items-center justify-center gap-4 p-4 md:p-9',
      customStyle,
      !smTable && 'my-4 md:mb-[12.5rem]'
    )}
  >
    <EmptyGlyph icon={icon} />
    <div className="flex w-full max-w-[375px] flex-col items-center gap-2 text-center">
      <Typography size="title-base" weight="semi-bold" color="primary">
        {title}
      </Typography>
      {subtitle && (
        <Typography size="body-m" weight="medium" color="secondary" align="center">
          {subtitle}
        </Typography>
      )}
    </div>

    {children}
  </div>
);
