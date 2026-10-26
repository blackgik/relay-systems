import type { PaginationState } from '@tanstack/react-table';

type SearchParamsLike = {
  get: (key: string) => string | null;
};

export const PAGINATION_QUERY_KEYS = {
  pageNo: 'page_no',
  pageSize: 'no_of_requests',
} as const;

export const DEFAULT_PAGE_INDEX = 0;
export const DEFAULT_PAGE_SIZE = 10;

export function getDefaultPaginationState(
  overrides: Partial<PaginationState> = {}
): PaginationState {
  return {
    pageIndex: DEFAULT_PAGE_INDEX,
    pageSize: DEFAULT_PAGE_SIZE,
    ...overrides,
  };
}

/**
 * Mirrors the existing call-site behavior:
 * - uses `Number(x) || default` to fall back for NaN/0
 * - preserves negative values (because `-1` is truthy), matching previous logic
 */
export function getPaginationStateFromSearchParams(
  searchParams: SearchParamsLike,
  defaults: Partial<PaginationState> = {}
): PaginationState {
  const { pageIndex: defaultPageIndex, pageSize: defaultPageSize } =
    getDefaultPaginationState(defaults);

  return {
    pageIndex: Number(searchParams.get(PAGINATION_QUERY_KEYS.pageNo)) || defaultPageIndex,
    pageSize: Number(searchParams.get(PAGINATION_QUERY_KEYS.pageSize)) || defaultPageSize,
  };
}

export function getPaginationReqParams(paginationState: PaginationState) {
  return {
    page_no: paginationState.pageIndex,
    no_of_requests: paginationState.pageSize,
  } as const;
}

// Pagination range with dots
export function calPaginationRangeWithDots(c: number, m: number) {
  const current = c,
    last = m,
    delta = 2,
    left = current - delta,
    right = current + delta + 1,
    range = [],
    rangeWithDots = [];

  let l;

  for (let i = 1; i <= last; i++) {
    if (i === 1 || i === last || (i >= left && i < right)) {
      range.push(i);
    }
  }

  for (const i of range) {
    if (l) {
      if (i - l === 2) {
        rangeWithDots.push(l + 1);
      } else if (i - l !== 1) {
        rangeWithDots.push('...');
      }
    }
    rangeWithDots.push(i);
    l = i;
  }

  return rangeWithDots;
}


