import React from 'react';
import clsx from 'clsx';
import styles from './index.module.scss';
import { ButtonProps } from './index.types';

// ── Inline spinner ─────────────────────────────────────────────────────────────
// Uses currentColor so it inherits the button's text color automatically.
// No external dependency — avoids importing CircularLoader for button use.
function Spinner() {
  return (
    <svg
      className="h-4 w-4 shrink-0 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

// ── Variant class map ──────────────────────────────────────────────────────────
// All values use Layer 2 semantic tokens — no hardcoded hex.
// brand-focus, destructive-subtle, destructive-muted are defined in tokens.css.

const variantsClassMap: Record<string, string> = {
  /**
   * Primary — strong brand fill.
   * bg: var(--brand) | hover: var(--brand-focus) | ring: var(--ring)
   */
  primary:
    'bg-brand border border-brand text-white ' +
    'hover:bg-brand-focus hover:border-brand-focus ' +
    'focus-visible:bg-brand focus-visible:border-brand focus-visible:ring-focus-ring ' +
    'active:bg-brand-focus active:border-brand-focus ' +
    'disabled:border-none',

  /**
   * Secondary — muted fill, brand text, no border at rest.
   * hover: neutral foreground/10 tint — clearly darker than muted rest state.
   */
  secondary:
    'bg-muted text-text-brand ' +
    'hover:bg-foreground/10 ' +
    'focus-visible:border focus-visible:border-brand focus-visible:ring-focus-ring ' +
    'active:bg-foreground/15',

  /**
   * Ghost — transparent bg, brand border and text.
   * hover fills with brand-focus and flips text to white.
   */
  ghost:
    'border border-brand text-text-brand ' +
    'hover:bg-brand-focus hover:text-white hover:border-brand-focus ' +
    'focus-visible:bg-background focus-visible:border-brand focus-visible:ring-focus-ring ' +
    'active:bg-brand-focus active:border-brand-focus active:text-white',

  /**
   * Subtle — border-only, brand text, no fill.
   * hover/active darkens border only.
   */
  subtle:
    'border border-border text-text-brand ' +
    'hover:border-brand-focus ' +
    'focus-visible:border-border focus-visible:ring-focus-ring ' +
    'active:border-brand-focus',

  /**
   * Text — no bg, no border. Brand-colored link-style button.
   * hover: neutral foreground/10 tint — visible on icon-only without a brand tint.
   */
  text:
    'text-text-brand ' +
    'hover:bg-foreground/10 ' +
    'active:bg-foreground/15 ' +
    'disabled:border-none',

  /**
   * Error / Primary destructive — filled red.
   * bg: var(--error-one) | hover border: var(--error-two)
   * NOTE: opacity-10 removed — was a bug in original.
   */
  error:
    'text-white bg-error-one ' +
    'hover:border hover:border-error-two ' +
    'focus-visible:ring-focus-ring ' +
    'active:bg-error-one/90',

  /**
   * Secondary destructive — outlined red, for secondary irreversible actions.
   * bg: transparent | border: var(--destructive) | hover bg: var(--destructive-subtle)
   */
  'secondary-destructive':
    'bg-transparent border border-destructive text-destructive ' +
    'hover:bg-destructive-subtle ' +
    'focus-visible:ring-2 focus-visible:ring-destructive-muted ' +
    'active:bg-destructive-subtle',

  /**
   * Ghost destructive — no border, red text, for tertiary irreversible actions.
   */
  'ghost-destructive':
    'bg-transparent text-destructive ' +
    'hover:bg-destructive-subtle ' +
    'focus-visible:ring-2 focus-visible:ring-destructive-muted ' +
    'active:bg-destructive-subtle',
};

// ── Size class map ─────────────────────────────────────────────────────────────
// Canonical names: xs | sm | md | lg | xl
// Legacy aliases:  small → md  |  medium → lg  |  large → xl
// Icon-only paths always set equal w and h so the button is square.

function sizeClasses(size: string, hasLabel: boolean): string {
  switch (size) {
    case 'xs':
      // 24 × 24 — nav actions, compact table row actions
      return hasLabel
        ? 'h-6 text-label-s font-medium px-2 py-0.5'
        : 'h-6 w-6 text-label-s font-medium p-1';
    case 'sm':
      // 32 × 32
      return hasLabel
        ? 'h-8 text-body-m px-3 py-2'
        : 'h-8 w-8 text-body-m p-2';
    case 'md':
    case 'small':
      // 38 × 38 — modal actions, card CTAs
      return hasLabel
        ? 'h-[38px] text-body-m py-[9px] px-4'
        : 'h-[38px] w-[38px] text-body-m p-[9px]';
    case 'lg':
    case 'medium':
      // 48 × 48 — standard page and panel actions
      return hasLabel
        ? 'h-12 text-body-l py-[14px] px-4'
        : 'h-12 w-12 text-body-l p-3';
    case 'xl':
    case 'large':
      // 56 × 56 — page-level CTAs, auth forms
      return hasLabel
        ? 'h-14 p-4 text-title-xs'
        : 'h-14 w-14 p-4 text-title-xs';
    default:
      return hasLabel
        ? 'h-[38px] text-body-m py-[9px] px-4'
        : 'h-[38px] w-[38px] text-body-m p-[9px]';
  }
}

// ── Component ──────────────────────────────────────────────────────────────────

const Button: React.FC<ButtonProps> = (props) => {
  const {
    variant = 'primary',
    label = '',
    size = 'small',
    customClassName = '',
    rounded = true,
    // Icon props (both old and new names work)
    leftIcon,
    rightIcon,
    iconLeading,
    iconTrailing,
    // Loading (both old and new props work)
    loading = false,
    isLoading = false,
    showTextWhileLoading = true,
    // Disabled (both old and new props work)
    disabled,
    isDisabled = false,
    // New props
    href,
    target,
    rel,
    fullWidth,
    fit,
    hideLabel,
    ...rest
  } = props;

  // Merge aliases
  const effectiveLoading  = loading || isLoading;
  const effectiveDisabled = disabled || isDisabled;

  // Merge icon aliases — new names take priority
  const leadingIcon  = iconLeading  ?? leftIcon;
  const trailingIcon = iconTrailing ?? rightIcon;

  const hasLabel = Boolean(label);

  // Width: fullWidth prop takes priority; falls back to legacy fit logic.
  // Icon-only (no label, no explicit width prop): leave width unset so that
  // sizeClasses' equal w-* / w-[38px] / w-12 etc. applies without conflict.
  const widthClass =
    fullWidth !== undefined
      ? fullWidth ? 'w-full' : 'w-fit'
      : fit        ? 'w-fit'
      : !hasLabel  ? ''          // icon-only square — sizeClasses sets w and h
      : 'w-full';

  // ── Build class list ──────────────────────────────────────────────────────
  const buttonClass = clsx(
    // Base. `whitespace-nowrap`: every size is a fixed height, so a label that
    // wrapped ("View all / cycles") spilled out of the pill top and bottom.
    // On one line the label also sets the button's minimum width, so a flex
    // row can't squeeze it narrower than its text.
    'flex items-center justify-center gap-3 whitespace-nowrap font-medium',
    'transition-all duration-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    // Disabled CSS pseudo-class — triggered by HTML disabled attr
    // Loading does NOT set disabled attr so variant colors are preserved
    'disabled:pointer-events-none',
    'disabled:border disabled:border-disabled-bg disabled:bg-disabled-bg disabled:text-disabled-text',
    // Variant
    variantsClassMap[variant] ?? variantsClassMap['primary'],
    // SCSS module — .primary applies stroke-white to SVG icons; .error does same
    styles[variant as string] ?? '',
    // Size
    sizeClasses(size, hasLabel),
    // Loading: pointer-events off but keep variant colors (no disabled attr → no grey-out)
    effectiveLoading && 'pointer-events-none opacity-90',
    // Shape — pill for labelled buttons, rounded-lg for icon-only (square) buttons
    rounded && (hasLabel ? 'rounded-full' : 'rounded-lg'),
    // Width
    widthClass,
    // Consumer override
    customClassName,
  );

  // ── Content ───────────────────────────────────────────────────────────────
  const content = effectiveLoading ? (
    <>
      <Spinner />
      {showTextWhileLoading && label && (
        <span className={hideLabel ? 'hidden md:block' : ''}>{label}</span>
      )}
    </>
  ) : (
    <>
      {leadingIcon && <span className={styles.icon}>{leadingIcon}</span>}
      {label && (
        <span className={hideLabel ? 'hidden md:block' : ''}>{label}</span>
      )}
      {trailingIcon && <span className={styles.icon}>{trailingIcon}</span>}
    </>
  );

  // ── Render as <a> when href is provided ──────────────────────────────────
  if (href) {
    return (
      <a
        href={href}
        target={target}
        rel={rel}
        className={buttonClass}
        aria-disabled={effectiveDisabled || undefined}
      >
        {content}
      </a>
    );
  }

  // ── Render as <button> ────────────────────────────────────────────────────
  return (
    <button
      className={buttonClass}
      type="button"
      // Loading blocks interaction without graying out (no disabled attr)
      disabled={effectiveDisabled && !effectiveLoading}
      {...rest}
    >
      {content}
    </button>
  );
};

export { Button };
export * from './index.types';
