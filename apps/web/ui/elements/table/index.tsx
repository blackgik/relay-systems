'use client';

import React, { Dispatch, ReactNode, SetStateAction } from 'react';
import clsx from 'clsx';
import {
  ColumnDef,
  ColumnSort,
  OnChangeFn,
  PaginationState,
  Row,
  RowData,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { PaginationControls } from '../pagination';
import { DefaultEmptyTable, EmptyTableProps } from './empty-table';
import {
  TableCard,
  TableCardFact,
  TableCardFacts,
  TableCardHeader,
  TableCardTitle,
} from '../table-card';
import { ArrowDownSortIcon as ArrowDown } from '@/ui/elements/icon/app-icons';

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    /**
     * Marks this column as the headline of the mobile card.
     *
     * `AutoTableCard` otherwise guesses — first column, or the second when the
     * first looks like a row number. That guess is right for most tables and
     * wrong whenever the identifying column isn't first: purchases leads with
     * a date, so its cards were headlined by "Date Created" rather than the
     * order. Set this on the column that identifies the row.
     */
    cardTitle?: boolean;
    /**
     * Marks this column as prose, so its mobile card fact spans the full card
     * width and wraps rather than truncating to one line. For sentence-shaped
     * values — an audit activity, a note — where the tail is the content.
     */
    cardProse?: boolean;
  }
}

export interface DefaultTableProps<T extends RowData> extends EmptyTableProps {
  columns: ColumnDef<T, unknown>[];
  pageCount?: number;
  paginationState?: PaginationState;
  setPaginationState?: OnChangeFn<PaginationState>;
  data: T[];
  totalItemsCount?: number;
  itemsPerPageOptions?: number[];
  showInnerBorder?: boolean;
  onRowClick?: (row: T) => void;
  /** Extra classes for a single row, keyed off its data — used to highlight the row a deep
   *  link points at. Applied to both the desktop `<tr>` and the mobile card. */
  rowClassName?: (row: T) => string | undefined;
  sorting?: ColumnSort[];
  setSorting?: Dispatch<SetStateAction<ColumnSort[]>>;
  renderCard?: (data: T) => React.ReactNode;
  /** Drops the rule above the mobile card list — for tables that sit directly under
   * a tab bar or other divider, where it would draw a second line. */
  hideCardListTopBorder?: boolean;
  stickLastColumn?: boolean;
  /** Pins the header row while the rows scroll underneath. The table needs a
   * bounded height (a fixed/flex-constrained parent) for this to have an effect. */
  stickyHeader?: boolean;
  emptyTableUI?: ReactNode;
  /** Controlled column-visibility state, for consumers pairing this table with a `ColumnToggle`. */
  columnVisibility?: VisibilityState;
  onColumnVisibilityChange?: OnChangeFn<VisibilityState>;
  /** Called once the table instance is ready, exposing all leaf columns so an external `ColumnToggle` can control them. */
  onColumnsReady?: (columns: any[]) => void;
}

/** Fallback mobile card derived from the column defs when a consumer doesn't
 * supply `renderCard`: first cell becomes the card title zone, a trailing
 * actions column is pinned top-right, and the remaining cells render as a
 * two-column label/value grid using each column's string header as the label.
 *
 * Type and colour come from the `TableCard` primitives, which every mobile
 * card in the app now composes — see the note there. This file decides only
 * *which* cell goes in which slot.
 */
function AutoTableCard<T extends RowData>({ row }: { row: Row<T> }) {
  const cells = row.getVisibleCells();
  if (!cells.length) return null;

  // Drop a leading serial/ID column (ids like `_id`, `customer_id`, `no`): a
  // row number is neither a headline nor a fact worth a labelled slot.
  const skipLeading =
    cells.length > 1 && /(_?id$)|^(no|s\/?n|sn|index|serial|expander)$/i.test(cells[0].column.id);
  const candidates = skipLeading ? cells.slice(1) : cells;

  // A column may nominate itself as the headline via `meta.cardTitle`; the
  // first remaining column is the fallback. Guessing is right for tables whose
  // identifying column comes first and wrong for the rest — purchases leads
  // with a date, so its cards were headlined "Date Created".
  const nominated = candidates.findIndex((cell) => cell.column.columnDef.meta?.cardTitle);
  const titleIndex = nominated === -1 ? 0 : nominated;

  const titleCell = candidates[titleIndex];
  const restCells = candidates.filter((_, index) => index !== titleIndex);

  const lastCell = restCells[restCells.length - 1];
  const lastHeader = lastCell?.column.columnDef.header;
  const isActionsCell =
    lastCell &&
    (/action/i.test(lastCell.column.id) || lastHeader === undefined || lastHeader === '');
  const actionsCell = isActionsCell ? restCells.pop() : undefined;

  // be rendered as fact labels via flexRender.
  const headerByColumnId = new Map(
    titleCell
      .getContext()
      .table.getFlatHeaders()
      .map((header) => [header.column.id, header])
  );

  // The title gets the same label its column has in the table head, so the card
  // says what its headline value *is* — "INV-026AUG03-XLE" alone doesn't tell
  // you it's an invoice number. Skipped when the column has no header, which is
  // how display-only columns are declared.
  const titleHeaderDef = titleCell.column.columnDef.header;
  const titleHeader = headerByColumnId.get(titleCell.column.id);
  const hasTitleLabel = titleHeaderDef !== undefined && titleHeaderDef !== '' && !!titleHeader;

  return (
    <TableCard>
      <TableCardHeader
        actions={
          actionsCell
            ? flexRender(actionsCell.column.columnDef.cell, actionsCell.getContext())
            : undefined
        }
      >
        <TableCardTitle
          label={hasTitleLabel ? flexRender(titleHeaderDef, titleHeader.getContext()) : undefined}
        >
          {flexRender(titleCell.column.columnDef.cell, titleCell.getContext())}
        </TableCardTitle>
      </TableCardHeader>

      {restCells.length > 0 && (
        <TableCardFacts>
          {restCells.map((cell) => {
            const headerDef = cell.column.columnDef.header;
            const header = headerByColumnId.get(cell.column.id);
            const hasLabel = headerDef !== undefined && headerDef !== '' && !!header;

            return (
              <TableCardFact
                key={cell.id}
                label={hasLabel ? flexRender(headerDef, header.getContext()) : undefined}
                prose={cell.column.columnDef.meta?.cardProse}
              >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCardFact>
            );
          })}
        </TableCardFacts>
      )}
    </TableCard>
  );
}

function Table<T extends RowData>({
  columns,
  data,
  pageCount,
  totalItemsCount,
  paginationState,
  setPaginationState,
  showInnerBorder,
  onRowClick,
  rowClassName,
  customStyle,
  title,
  setSorting,
  sorting,
  renderCard,
  hideCardListTopBorder,
  stickLastColumn,
  stickyHeader,
  emptyTableUI,
  columnVisibility,
  onColumnVisibilityChange,
  onColumnsReady,
  ...rest
}: DefaultTableProps<T>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: { pagination: paginationState, sorting, columnVisibility: columnVisibility ?? {} },
    onPaginationChange: setPaginationState,
    manualPagination: true,
    // Removed: debugTable was hardcoded true causing console logs in production
    pageCount: pageCount ?? -1,
    manualSorting: true,
    onSortingChange: setSorting,
    onColumnVisibilityChange,
  });

  React.useEffect(() => {
    onColumnsReady?.(table.getAllLeafColumns());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, onColumnsReady]);

  const {
    getPageOptions,
    setPageIndex,
    setPagination,
    getCanPreviousPage,
    previousPage,
    nextPage,
    getCanNextPage,
  } = table;

  return (
    <>
      {/* Non-sticky tables size to their content. `h-full` used to pin this
          box to the parent's height while the scroller inside kept its full
          content height, so once a horizontal scrollbar appeared the last row
          hung outside the bordered card. Only the sticky-header variant, which
          deliberately owns a scroll viewport, gets a constrained height. */}
      <div className={clsx('w-full', stickyHeader && 'flex h-full min-h-0 flex-col')}>
        {data.length < 1 ? (
          emptyTableUI ? (
            emptyTableUI
          ) : (
            <DefaultEmptyTable title={title} customStyle={customStyle} {...rest} />
          )
        ) : (
          <div
            className={clsx(
              'w-full overflow-x-auto rounded-lg',
              stickyHeader ? 'min-h-0 flex-1 overflow-y-auto' : 'overflow-y-hidden'
            )}
          >
            <table className="hidden w-full lg:table">
              <thead className="bg-table-header-bg">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="text-left text-body-m">
                    {headerGroup.headers.map((header, index) => (
                      <th
                        key={header.id}
                        className={clsx(
                          'group whitespace-nowrap px-6 py-3 font-bold text-table-header-text transition-colors',
                          stickyHeader && 'sticky top-0 z-sticky bg-table-header-bg',
                          sorting && header.column.getCanSort() && 'cursor-pointer hover:bg-muted',
                          index === headerGroup.headers.length - 1 && '!pr-4',
                          stickLastColumn
                            ? index === headerGroup.headers.length - 1 &&
                                'sticky right-0 bg-table-header-bg shadow-sticky-col'
                            : ''
                        )}
                        style={{
                          width: header.getSize(),
                        }}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {header.isPlaceholder ? null : (
                          <div className="flex items-center gap-2">
                            {flexRender(header.column.columnDef.header, header.getContext())}

                            {header.column.getIsSorted()
                              ? { asc: <ArrowDown className="rotate-180" />, desc: <ArrowDown /> }[
                                  header.column.getIsSorted() as 'asc' | 'desc'
                                ]
                              : sorting &&
                                header.column.getCanSort() && (
                                  <ArrowDown className="opacity-0 transition-opacity group-hover:opacity-50" />
                                )}
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className={clsx(
                      // The last row draws no rule of its own. The scroll
                      // container is `rounded-lg`, which clips a full-width
                      // bottom border into a stub that stops short of both
                      // corners — visible as a short, floating line under the
                      // final row, and doubled against the border of any
                      // bordered wrapper the table sits in. The container's own
                      // edge closes the list.
                      'border-b border-table-border last:border-b-0',
                      onRowClick && 'cursor-pointer transition-all hover:bg-table-row-hover',
                      rowClassName?.(row.original)
                    )}
                    onClick={() => onRowClick?.(row.original)}
                  >
                    {row.getVisibleCells().map((cell, id) => (
                      <td
                        key={cell.id}
                        className={clsx(
                          // Header is `text-table-header-text` → `--text-primary`,
                          // so body copy on `text-text-tertiary` made every
                          // desktop table lighter in its data than in its column
                          // headings. Same inversion the mobile card had.
                          'whitespace-nowrap px-6 py-4 text-left text-body-s font-regular text-text-secondary',
                          showInnerBorder &&
                            (id === 0 ? 'border-l-0' : 'border-l border-table-border'),
                          id === row.getVisibleCells().length - 1 && '!pr-4',
                          stickLastColumn
                            ? id === row.getVisibleCells().length - 1 &&
                                'sticky right-0 bg-table-sticky-bg shadow-sticky-col'
                            : ''
                        )}
                        style={{
                          width: cell.column.getSize(),
                        }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* `border-t` so the first card is closed off from the toolbar
                above it — each card draws only its own bottom rule, which
                otherwise leaves the top of the list open.

                The last card's rule is dropped from here rather than from the
                card wrapper: `TableCard` draws its border unconditionally and
                leaves the last-child case to whoever owns the siblings, and
                that is this list. Written as `last:` on the wrapper it compiles
                to `& > *:last-child`, which matches every wrapper's only child
                and clears the divider from all of them. */}
            <div
              className={clsx(
                'flex flex-col border-table-border [&>*:last-child>*]:border-b-0 lg:hidden',
                !hideCardListTopBorder && 'border-t'
              )}
            >
              {table.getRowModel().rows.map((row) => (
                <div
                  key={row.id}
                  className={clsx(
                    onRowClick && 'cursor-pointer transition-all hover:bg-muted/60',
                    rowClassName?.(row.original)
                  )}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {renderCard ? renderCard(row.original) : <AutoTableCard row={row} />}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pagination draws the rule that separates it from the rows. It used
            to lean on the last row's own `border-b`, which sits inside the
            `rounded-lg` scroll container and so came out clipped at both
            corners — the short floating line under the final row. This one is
            outside that container and spans the full width. */}
        {data.length && paginationState ? (
          <div className="border-t border-table-border">
            <PaginationControls<T>
              getCanNextPage={getCanNextPage}
              getCanPreviousPage={getCanPreviousPage}
              getPageOptions={getPageOptions}
              nextPage={nextPage}
              paginationState={paginationState}
              previousPage={previousPage}
              setPageIndex={setPageIndex}
              setPagination={setPagination}
              table={table}
              totalItemsCount={totalItemsCount}
            />
          </div>
        ) : null}
      </div>
    </>
  );
}

export { Table };
export * from './empty-table';
