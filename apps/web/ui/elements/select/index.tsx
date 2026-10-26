'use client';

import { Listbox, ListboxProps } from '@headlessui/react';
import clsx from 'clsx';
import React, { ElementType, Fragment, forwardRef, useState, useEffect, useRef } from 'react';
import { Typography } from '../typography';
import { CircularLoader } from '../circular-loader';
import { ArrowDownLgIcon as ArrowDownIcon, CloseIcon } from '@/ui/elements/icon/app-icons';

export type SelectProps<TTag extends ElementType, TType, TActualType> = ListboxProps<
  TTag,
  TType,
  TActualType
> & {
  selectedDisplayValue?: React.ReactNode;
  listValue: TType[];
  label?: string;
  customBtnClass?: string;
  errorMessage?: string;
  customListOptionsClass?: string;
  optionalWidth?: string;
  miniCustomListOptionsClass?: string;
  miniTransform?: string;
  loading?: boolean;
  isTable?: boolean;
  icon?: React.ReactNode;
  customValueStyle?: string;
  /** Return the display label for an option. Required when listValue contains objects. */
  getOptionLabel?: (option: TType) => string;
  /** Render custom option content while preserving the option value and selection state. */
  renderOption?: (option: TType, selected: boolean) => React.ReactNode;
  /** Pass a key name or comparator to Listbox `by` for object equality. */
  by?: string | ((a: TType, b: TType) => boolean);
  /** Sticky content rendered below the options list with a border-t divider (e.g. "Add New" CTA). */
  footer?: React.ReactNode;
  /** Message shown when listValue is empty. @default "No options available." */
  emptyMessage?: string;
  /**
   * When true, renders a text input at the top of the dropdown panel that
   * filters the visible options client-side by label match (case-insensitive).
   * The search input is cleared when the dropdown closes.
   * @default false
   */
  searchable?: boolean;
  /** Placeholder shown inside the search input when searchable={true}. @default "Search..." */
  searchPlaceholder?: string;
  /**
   * When provided, applies the returned className string to both the trigger
   * button background and the matching option row in the dropdown. Use to
   * colour-code status selects (e.g. stock-take status via getColorByValue).
   */
  getOptionColor?: (option: TType) => string | undefined;
  /**
   * 'placeholder' (default) — `label` renders as inline placeholder text
   * inside the trigger, replaced by the selected value once one is chosen.
   * 'floating' — Input-style floating label: `label` sits centered inside
   * the trigger like a placeholder when empty, then animates up/shrinks
   * once a value is selected or the dropdown is open, matching `Input`'s
   * floating-label behaviour. Opt-in only — existing callers are
   * unaffected unless they pass this explicitly.
   */
  labelVariant?: 'placeholder' | 'floating';
  /**
   * 'popover' (default) — options render as a small anchored panel below
   * the trigger, at every viewport width.
   * 'sheet' — below the `sm` breakpoint, options render as a full-width
   * bottom sheet (fixed to the viewport bottom, rounded top corners, a
   * dim backdrop, and a drag-handle affordance). At `sm` and above it
   * falls back to the normal anchored popover. Use for selects with long
   * or searchable option lists where a small floating panel gets cramped
   * on mobile (e.g. state/city, category, unit, payment method).
   */
  mobileVariant?: 'popover' | 'sheet';
};

// ── SelectOptionsList (internal) ──────────────────────────────────────────────
// Extracted so it can manage its own searchQuery state and reset on close via
// useEffect. This avoids calling setState during the parent render cycle.
interface SelectOptionsListProps {
  open: boolean;
  listValue: any[];
  loading: boolean;
  searchable: boolean;
  searchPlaceholder: string;
  emptyMessage: string;
  getOptionLabel?: (option: any) => string;
  renderOption?: (option: any, selected: boolean) => React.ReactNode;
  getOptionColor?: (option: any) => string | undefined;
  miniCustomListOptionsClass?: string;
  miniTransform?: string;
  customListOptionsClass?: string;
  footer?: React.ReactNode;
  mobileVariant: 'popover' | 'sheet';
  label?: string;
  onRequestClose: () => void;
}

function SelectOptionsList({
  open,
  listValue,
  loading,
  searchable,
  searchPlaceholder,
  emptyMessage,
  getOptionLabel,
  renderOption,
  getOptionColor,
  miniCustomListOptionsClass,
  miniTransform,
  customListOptionsClass,
  footer,
  mobileVariant,
  label,
  onRequestClose,
}: SelectOptionsListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const prevOpenRef = useRef(open);

  useEffect(() => {
    // Clear search when dropdown transitions from open to closed
    if (prevOpenRef.current && !open) {
      setSearchQuery('');
    }
    prevOpenRef.current = open;
  }, [open]);

  const filteredOptions = searchable && searchQuery.trim()
    ? listValue.filter((option) => {
      const labelText = getOptionLabel ? getOptionLabel(option) : String(option);
      return labelText.toLowerCase().includes(searchQuery.toLowerCase());
    })
    : listValue;

  return (
    <>
      {mobileVariant === 'sheet' && open && (
        <div className="fixed inset-0 z-overlay bg-overlay/40 sm:hidden" aria-hidden="true" />
      )}
      <Listbox.Options
        className={clsx(
          'w-full min-w-[50px] overflow-auto bg-popover p-1 text-[16px] shadow-lg focus:outline-none md:text-body-m',
          mobileVariant === 'sheet'
            ? 'fixed inset-x-0 bottom-0 z-modal max-h-[75vh] rounded-t-2xl sm:absolute sm:inset-x-0 sm:inset-y-auto sm:bottom-auto sm:z-dropdown sm:mb-1 sm:max-h-[200px] sm:rounded-md'
            : 'absolute z-dropdown mb-1 max-h-[200px] rounded-md',
          customListOptionsClass
        )}
      >
        {mobileVariant === 'sheet' && (
          <div className="mb-1 flex justify-center pt-1 sm:hidden">
            <span className="h-1 w-10 rounded-full bg-border" />
          </div>
        )}
        {mobileVariant === 'sheet' && (
          <div className="mb-1 flex items-center justify-between gap-2 px-3 pb-2 sm:hidden">
            <Typography size="body-m" weight="semi-bold" customClassName="truncate text-text-primary">
              {label}
            </Typography>
            <button
              type="button"
              onClick={onRequestClose}
              aria-label="Close"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-text-tertiary hover:bg-surface-hover hover:text-text-primary"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>
        )}
        {searchable && (
          <div className="sticky top-0 z-10 mx-3 bg-popover pb-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              onClick={(e) => e.stopPropagation()}
              className="w-full rounded-lg border border-input-border bg-background px-[14px] py-2 text-[16px] md:text-body-m text-foreground placeholder:text-text-tertiary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              autoComplete="off"
            />
          </div>
        )}
        {loading ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-background p-4">
            <CircularLoader customClassName="w-6 h-6" />
            <Typography>Loading list...</Typography>
          </div>
        ) : (
          filteredOptions.length ? filteredOptions.map((option, idx) => {
            const labelText = getOptionLabel ? getOptionLabel(option) : String(option);
            const optionColorClass = getOptionColor ? getOptionColor(option) : undefined;
            return (
              <Listbox.Option
                key={idx}
                className={({ active, selected }) =>
                  clsx(
                    'relative cursor-pointer select-none rounded-lg p-3',
                    miniCustomListOptionsClass,
                    optionColorClass,
                    active && !selected ? 'bg-surface-hover' : '',
                    selected ? 'bg-brand text-white' : 'text-text-secondary'
                  )
                }
                value={option}
              >
                {({ selected }) => (
                  <span
                    className={clsx(
                      'block truncate capitalize',
                      miniTransform,
                      selected ? 'font-medium' : 'font-normal'
                    )}
                  >
                    {renderOption ? renderOption(option, selected) : labelText}
                  </span>
                )}
              </Listbox.Option>
            );
          }) :
            <span className="block p-3 text-body-s font-medium text-text-tertiary">
              {searchable && searchQuery.trim() ? 'No results found.' : emptyMessage}
            </span>
        )}
        {footer && (
          <div className="sticky bottom-0 border-t border-border bg-popover">
            {footer}
          </div>
        )}
      </Listbox.Options>
    </>
  );
}

const Select = forwardRef<HTMLButtonElement, SelectProps<any, any, any>>(
  (
    {
      selectedDisplayValue,
      value,
      listValue,
      onChange,
      label,
      customBtnClass,
      errorMessage,
      customListOptionsClass,
      optionalWidth,
      miniCustomListOptionsClass,
      miniTransform,
      loading,
      icon,
      customValueStyle,
      disabled,
      isTable,
      getOptionLabel,
      renderOption,
      by,
      footer,
      emptyMessage = 'No options available.',
      searchable = false,
      searchPlaceholder = 'Search...',
      getOptionColor,
      labelVariant = 'placeholder',
      mobileVariant = 'popover',
    },
    ref
  ) => {
    // Compute color class for the selected value (used on trigger when getOptionColor provided)
    const selectedColorClass = getOptionColor ? getOptionColor(value) : undefined;

    // Local ref to the trigger button so the sheet's title-bar close button can
    // toggle it closed (Headless UI's Listbox.Button closes on click while open).
    const buttonRef = useRef<HTMLButtonElement | null>(null);
    const setButtonRef = (node: HTMLButtonElement | null) => {
      buttonRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLButtonElement | null>).current = node;
    };

    return (
      <div className='w-full'>
        <Listbox value={value} onChange={onChange} disabled={disabled} {...(by ? { by } : {})}>
          {({ open }) => (
            <div className={`relative ${optionalWidth ? optionalWidth : ''}`}>
              <Listbox.Button
                ref={setButtonRef}
                className={clsx(
                  'relative flex w-full justify-between gap-2 rounded-lg border bg-background hover:border-brand hover:bg-surface-hover [&>*]:max-w-[unset] disabled:bg-disabled-bg disabled:text-disabled-text disabled:cursor-not-allowed',
                  labelVariant === 'floating'
                    ? 'items-center px-4 pt-4 pb-2'
                    : 'items-center px-[14px] py-[10px]',
                  open && 'bg-muted',
                  errorMessage ? 'border-destructive' : 'border-input-border',
                  isTable ? 'max-h-[38px]' : 'h-[56px]',
                  selectedColorClass,
                  customBtnClass
                )}
              >
                {({ value }) => {
                  // An object value is shown through `getOptionLabel`, same as
                  // its option row. Rendering the object itself threw "Objects
                  // are not valid as a React child" the moment one was picked.
                  const selectedValue =
                    selectedDisplayValue ||
                    (value != null && getOptionLabel ? getOptionLabel(value) : value);

                  if (labelVariant === 'floating') {
                    const isFloated = Boolean(selectedValue) || open;

                    return (
                      <Fragment>
                        <span
                          className={clsx(
                            'block w-full truncate text-left text-[16px] font-medium capitalize text-text-primary md:text-body-m',
                            customValueStyle && customValueStyle
                          )}
                        >
                          {selectedValue}
                        </span>

                        <label
                          className={clsx(
                            'pointer-events-none absolute left-4 top-[16px] origin-[0] transform truncate text-left font-medium text-text-tertiary duration-200 text-[16px] md:text-body-l',
                            isFloated ? '-translate-y-4 scale-75' : 'translate-y-0 scale-100'
                          )}
                        >
                          {label}
                        </label>

                        {icon ? (
                          <>{icon}</>
                        ) : (
                          <ArrowDownIcon
                            className={clsx(
                              'min-h-[20px] min-w-[20px] shrink-0 text-text-tertiary transition-transform duration-200',
                              open && '-rotate-180'
                            )}
                          />
                        )}
                      </Fragment>
                    );
                  }

                  return (
                    <Fragment>
                      <span
                        className={clsx(
                          'max-w-[50px] truncate text-[16px] font-medium capitalize md:text-body-m',
                          selectedValue ? 'text-text-primary' : 'text-input-placeholder',
                          customValueStyle && customValueStyle
                        )}
                      >
                        {selectedValue || label}
                      </span>

                      {icon ? (
                        <>{icon}</>
                      ) : (
                        <ArrowDownIcon
                          className={clsx(
                            'min-h-[20px] min-w-[20px] text-text-tertiary transition-transform duration-200',
                            open && '-rotate-180'
                          )}
                        />
                      )}
                    </Fragment>
                  );
                }}
              </Listbox.Button>

              <SelectOptionsList
                open={open}
                listValue={listValue}
                loading={!!loading}
                searchable={!!searchable}
                searchPlaceholder={searchPlaceholder || 'Search...'}
                emptyMessage={emptyMessage || 'No options available.'}
                getOptionLabel={getOptionLabel}
                renderOption={renderOption}
                getOptionColor={getOptionColor}
                mobileVariant={mobileVariant}
                label={label}
                onRequestClose={() => buttonRef.current?.click()}
                miniCustomListOptionsClass={miniCustomListOptionsClass}
                miniTransform={miniTransform}
                customListOptionsClass={customListOptionsClass}
                footer={footer}
              />
            </div>
          )}
        </Listbox>
        {errorMessage && (
          <Typography size="body-s" customClassName="pl-4 pt-2 text-destructive" weight="regular">
            {errorMessage}
          </Typography>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export { Select };
