import { PaginationState, Table, Updater } from '@tanstack/react-table';
import { Typography } from '../typography';
import { Select } from '../select';
import clsx from 'clsx';
import { calPaginationRangeWithDots } from '@/utils';
import { useMemo } from 'react';
import { ArrowLeftIcon as ArrowLeft , ArrowRightIcon } from '@/ui/elements/icon/app-icons';

interface PaginationProps<T> {
  totalItemsCount?: number;
  previousPage: () => void;
  getCanPreviousPage: () => boolean;
  paginationState: PaginationState;
  nextPage: () => void;
  getCanNextPage: () => boolean;
  setPageIndex: (updater: Updater<number>) => void;
  setPagination: (updater: Updater<PaginationState>) => void;
  getPageOptions: () => number[];
  table: Table<T>;
}

export function PaginationControls<T>({
  totalItemsCount,
  getCanPreviousPage,
  previousPage,
  paginationState,
  getCanNextPage,
  nextPage,
  setPageIndex,
  setPagination,
  getPageOptions,
  table,
}: PaginationProps<T>) {
  const pageOptions = getPageOptions();
  const { pageIndex, pageSize } = paginationState || {};

  // Get in between pages in table pagination
  const inBetweenPagesWithDots = useMemo(
    () =>
      pageIndex !== undefined ? calPaginationRangeWithDots(pageIndex + 1, pageOptions.length) : [],
    [pageOptions, pageIndex]
  );

  const currentPageRows = table.getRowModel().rows.length;

  const startItem = Number(pageIndex) * Number(pageSize) + 1;
  const endItem = Number(pageIndex) * Number(pageSize) + currentPageRows;

  return (
    <section className="flex w-full flex-wrap items-center justify-between gap-3 bg-background p-3 md:gap-6 md:p-4 lg:p-6">
      <div className="flex flex-1 items-center gap-2 whitespace-nowrap text-body-s md:text-body-l">
        Showing {startItem} to {endItem} of{' '}
        <span className="text-body-m font-semi-bold text-text-secondary">
          {' '}
          {totalItemsCount} results
        </span>
      </div>

      <div className="-order-1 flex w-full items-center justify-between gap-2 md:order-none md:w-auto lg:gap-10">
        <button
          className="flex gap-2 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => previousPage()}
          disabled={!getCanPreviousPage()}
        >
          <ArrowLeft />
          <span className="hidden md:block">Previous</span>
        </button>

        <div className="flex">
          {inBetweenPagesWithDots.map((page, idx) => {
            const isActivePage = Number(page) && Number(page) - 1 === pageIndex;
            const isSeparator = page === '...';

            return (
              <button
                className={clsx(
                  'flex h-[2.5rem] w-[2.5rem] items-center justify-center rounded-lg',
                  // D3: active page uses surface-selected (#DEE8FF) — selected-state token
                  isActivePage && 'bg-surface-selected',
                  !isActivePage && !isSeparator && 'hover:bg-surface-hover'
                )}
                key={`page-${page}-${idx}`}
                disabled={isSeparator}
                onClick={() => (isSeparator ? null : setPageIndex(Number(page) - 1))}
              >
                <Typography
                  size="body-s"
                  weight={isActivePage ? 'semi-bold' : 'medium'}
                  color={isActivePage ? 'brand' : 'muted'}
                >
                  {page}
                </Typography>
              </button>
            );
          })}
        </div>

        <button
          className="flex gap-2 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => nextPage()}
          disabled={!getCanNextPage()}
        >
          <span className="hidden md:block">Next</span>
          <ArrowRightIcon />
        </button>
      </div>

      <div className="flex flex-1 items-center justify-end gap-1 text-body-s md:text-body-l">
        <p>Show Rows </p>
        <div>
          <Select
            // Fixed: was border-neutral-500, now uses canonical border token
            customBtnClass="!w-fit border-border !h-[38px] !px-[8px] md:!px-[14px]"
            customListOptionsClass="top-0 -translate-y-[calc(100%+10px)]"
            listValue={[10, 15, 20, 25, 30]}
            onChange={(value: number) => setPagination({ pageIndex: 0, pageSize: value })}
            value={pageSize}
          />
        </div>
      </div>
    </section>
  );
}
