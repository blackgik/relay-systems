import { Config } from 'tailwindcss';

// Dark mode via class — add/remove `dark` on <html> to switch.
// CSS custom properties in src/styles/tokens.css provide all Layer 2 values.

export default {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './ui/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './utils/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    fontWeight: {
      thin: '100',
      'ultra-light': '200',
      light: '300',
      regular: '400',
      normal: '400',
      medium: '500',
      'semi-bold': '600',
      semibold: '600',
      bold: '700',
      'extra-bold': '800',
      black: '900',
    },
    extend: {
      fontFamily: {
        brand: ['var(--font-brand)', 'sans-serif'],
        sans: ['var(--font-brand)', 'sans-serif'],
      },

      screens: {
        xs: '375px',
        '2xl': '1440px',
      },

      fontSize: {
        'display-l': ['57px', { lineHeight: '64px', fontWeight: '700', letterSpacing: '-0.25px' }],
        'display-m': ['45px', { lineHeight: '52px', fontWeight: '700' }],
        'display-s': ['40px', { lineHeight: '48px', fontWeight: '700' }],
        'display-xs': ['36px', { lineHeight: '44px', fontWeight: '700' }],
        'headline-l': ['32px', { lineHeight: '40px', fontWeight: '700' }],
        'headline-m': ['28px', { lineHeight: '36px', fontWeight: '700' }],
        'headline-s': ['24px', { lineHeight: '32px', fontWeight: '700' }],
        'title-l': ['22px', { lineHeight: '28px', fontWeight: '600' }],
        'title-base': ['20px', { lineHeight: '28px', fontWeight: '600' }],
        'title-xs': ['18px', { lineHeight: '28px', fontWeight: '600' }],
        'title-m': ['16px', { lineHeight: '24px', fontWeight: '600', letterSpacing: '0.15px' }],
        'title-s': ['14px', { lineHeight: '20px', fontWeight: '600', letterSpacing: '0.1px' }],
        'label-l': ['14px', { lineHeight: '20px', fontWeight: '500', letterSpacing: '0.1px' }],
        'label-m': ['12px', { lineHeight: '16px', fontWeight: '500', letterSpacing: '0.5px' }],
        'label-s': ['11px', { lineHeight: '16px', fontWeight: '500', letterSpacing: '0.5px' }],
        'body-l': ['16px', { lineHeight: '24px', fontWeight: '500', letterSpacing: '0.5px' }],
        'body-m': ['14px', { lineHeight: '20px', fontWeight: '500', letterSpacing: '0.25px' }],
        'body-s': ['12px', { lineHeight: '16px', fontWeight: '500', letterSpacing: '0.4px' }],
        'caption-r': ['14px', { lineHeight: '22px', fontWeight: '400', letterSpacing: '0.2px' }],
        caption: ['11px', { lineHeight: '16px', fontWeight: '500', letterSpacing: '0.25px' }],
        'numeric-l': ['30px', { lineHeight: '36px', fontWeight: '700', letterSpacing: '-0.25px' }],
        'numeric-xl': ['42px', { lineHeight: '48px', fontWeight: '700', letterSpacing: '-0.5px' }],
        micro: ['10px', { lineHeight: '14px', fontWeight: '500', letterSpacing: '0.4px' }],
      },

      lineHeight: {
        table: 'var(--leading-table)',
      },

      boxShadow: {
        light: '0px 5px 14px 0px rgba(64, 64, 64, 0.05)',
        lg: '0px 12px 16px -4px rgba(16, 24, 40, 0.10), 0px 4px 6px -2px rgba(16, 24, 40, 0.05)',
        '2lg': '5px 5px 50px 0px rgba(26, 32, 44, 0.08)',
        card: '0 2px 7px rgba(211, 217, 227, 0.149)',
        'sticky-col': 'var(--shadow-sticky-col)',
        'toggle-knob':
          '0px 1px 2px 0px rgba(16, 24, 40, 0.06), 0px 1px 3px 0px rgba(16, 24, 40, 0.10)',
        dropdown: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        toast: '0px 5px 14px 0px rgba(64, 64, 64, 0.05)',
      },

      keyframes: {
        // Tooltip bubbles mount already-visible (they are portalled in on hover),
        // so the fade is a CSS animation rather than a two-render opacity flip --
        // the old approach needed requestAnimationFrame, which never fires while
        // the page is hidden and left the bubble stuck at opacity 0.
        'tooltip-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },

        // The drawer has the same shape of problem as the tooltip above: it
        // mounts off-screen and then has to move. Driving that from a class
        // flip needs the mount to be painted first, which is what the two
        // nested rAFs used to buy -- and the mount commit itself lands inside
        // that window, so the slide dropped its opening frames. As animations
        // these start with the element's first paint instead.
        // Opening is a fade, not a slide: a slide has to start from a painted
        // off-screen position, so any delay in mounting shows up as the panel
        // arriving late. A fade has no starting position to miss.
        'drawer-in': {
          from: { opacity: '0', transform: 'scale(0.98)' },
          to: { opacity: '1', transform: 'none' },
        },
        'drawer-out-right': {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(100%)' },
        },
        'drawer-out-left': {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-100%)' },
        },
        'overlay-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'overlay-out': {
          from: { opacity: '1' },
          to: { opacity: '0' },
        },
      },

      animation: {
        'tooltip-in': 'tooltip-in 150ms ease-out',
        // `both` holds the end frame, so a panel that has finished sliding out
        // stays out until it is unmounted.
        // In matches the Modal's own enter (fade + 300ms ease-out) so the two
        // read as one system. Out keeps the slide, which says where the panel
        // went; its easing accelerates away rather than crawling to a stop.
        'drawer-in': 'drawer-in 300ms ease-out both',
        'drawer-out-right': 'drawer-out-right 300ms cubic-bezier(0.4, 0, 1, 1) both',
        'drawer-out-left': 'drawer-out-left 300ms cubic-bezier(0.4, 0, 1, 1) both',
        'overlay-in': 'overlay-in 300ms ease-out both',
        'overlay-out': 'overlay-out 300ms ease-in both',
      },

      zIndex: {
        dropdown: '10',
        sticky: '11',
        tabs: '51',
        overlay: '99',
        modal: '100',
        toast: '110',
        tooltip: '120',
      },

      colors: {
        background: 'hsl(var(--background) / <alpha-value>)',
        surface: 'hsl(var(--surface) / <alpha-value>)',
        foreground: 'hsl(var(--foreground) / <alpha-value>)',

        card: {
          DEFAULT: 'hsl(var(--card) / <alpha-value>)',
          foreground: 'hsl(var(--card-foreground) / <alpha-value>)',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover) / <alpha-value>)',
          foreground: 'hsl(var(--popover-foreground) / <alpha-value>)',
        },
        'tooltip-bg': 'hsl(var(--tooltip-bg) / <alpha-value>)',
        muted: {
          DEFAULT: 'hsl(var(--muted) / <alpha-value>)',
          foreground: 'hsl(var(--muted-foreground) / <alpha-value>)',
        },

        'surface-disabled': 'hsl(var(--surface-disabled) / <alpha-value>)',
        'text-disabled': 'hsl(var(--text-disabled) / <alpha-value>)',

        'text-primary': 'hsl(var(--text-primary) / <alpha-value>)',
        'text-secondary': 'hsl(var(--text-secondary) / <alpha-value>)',
        'text-tertiary': 'hsl(var(--text-tertiary) / <alpha-value>)',
        'text-brand': 'hsl(var(--text-brand) / <alpha-value>)',

        'surface-hover': 'hsl(var(--surface-hover) / <alpha-value>)',
        'surface-pressed': 'hsl(var(--surface-pressed) / <alpha-value>)',
        'surface-selected': 'hsl(var(--surface-selected) / <alpha-value>)',

        brand: {
          DEFAULT: 'hsl(var(--brand) / <alpha-value>)',
          foreground: 'hsl(var(--brand-foreground) / <alpha-value>)',
          focus: 'hsl(var(--brand-focus) / <alpha-value>)',
        },
        'brand-text': 'hsl(var(--brand-text) / <alpha-value>)',
        'brand-subtle': 'hsl(var(--brand-subtle) / <alpha-value>)',

        destructive: {
          DEFAULT: 'hsl(var(--destructive) / <alpha-value>)',
          foreground: 'hsl(var(--destructive-foreground) / <alpha-value>)',
          subtle: 'hsl(var(--destructive-subtle) / <alpha-value>)',
          muted: 'hsl(var(--destructive-muted) / <alpha-value>)',
        },

        success: {
          DEFAULT: 'hsl(var(--success) / <alpha-value>)',
          strong: 'hsl(var(--success-strong) / <alpha-value>)',
          subtle: 'hsl(var(--success-subtle) / <alpha-value>)',
          text: 'hsl(var(--success-text) / <alpha-value>)',
        },

        warning: {
          DEFAULT: 'hsl(var(--warning) / <alpha-value>)',
          foreground: 'hsl(var(--warning-foreground) / <alpha-value>)',
          subtle: 'hsl(var(--warning-subtle) / <alpha-value>)',
          text: 'hsl(var(--warning-text) / <alpha-value>)',
        },

        info: {
          DEFAULT: 'hsl(var(--info) / <alpha-value>)',
          foreground: 'hsl(var(--info-foreground) / <alpha-value>)',
          subtle: 'hsl(var(--info-subtle) / <alpha-value>)',
          text: 'hsl(var(--info-text) / <alpha-value>)',
        },

        border: 'hsl(var(--border) / <alpha-value>)',
        'border-subtle': 'hsl(var(--border-subtle) / <alpha-value>)',
        'border-strong': 'hsl(var(--border-strong) / <alpha-value>)',
        'border-brand': 'hsl(var(--border-brand) / <alpha-value>)',
        input: {
          DEFAULT: 'hsl(var(--input) / <alpha-value>)',
          bg: 'hsl(var(--input-bg) / <alpha-value>)',
          border: 'hsl(var(--input-border) / <alpha-value>)',
          'border-focus': 'hsl(var(--input-border-focus) / <alpha-value>)',
          placeholder: 'hsl(var(--input-placeholder) / <alpha-value>)',
        },
        ring: 'hsl(var(--ring) / <alpha-value>)',
        'focus-ring': 'hsl(var(--focus-ring) / <alpha-value>)',
        'focus-ring-offset': 'hsl(var(--focus-ring-offset) / <alpha-value>)',

        overlay: 'hsl(var(--overlay-bg) / <alpha-value>)',

        secondary: 'hsl(var(--secondary) / <alpha-value>)',

        icon: {
          default: 'hsl(var(--icon-default) / <alpha-value>)',
          muted: 'hsl(var(--icon-muted) / <alpha-value>)',
          brand: 'hsl(var(--icon-brand) / <alpha-value>)',
          'on-brand': 'hsl(var(--icon-on-brand) / <alpha-value>)',
          disabled: 'hsl(var(--icon-disabled) / <alpha-value>)',
          success: 'hsl(var(--icon-success) / <alpha-value>)',
          warning: 'hsl(var(--icon-warning) / <alpha-value>)',
          error: 'hsl(var(--icon-error) / <alpha-value>)',
          info: 'hsl(var(--icon-info) / <alpha-value>)',
        },

        'text-link': 'hsl(var(--text-link) / <alpha-value>)',
        'text-link-hover': 'hsl(var(--text-link-hover) / <alpha-value>)',

        badge: {
          success: { text: '#027A48', bg: '#ECFDF3' },
          warning: { text: '#B54708', bg: '#FFFAEB' },
          error: { text: '#B42318', bg: '#FEF3F2' },
          neutral: { text: '#344054', bg: '#F2F4F7' },
          info: { text: '#175CD3', bg: '#EFF8FF' },
          purple: { text: '#6941C6', bg: '#F4F3FF' },
          teal: { text: '#005649', bg: '#E0FFF8' },
          harbor: { text: '#145665', bg: '#DDF2F5' },
        },

        avatar: {
          inactive: { bg: '#D1E9FF', text: '#194185' },
          staff: { bg: '#E0FFF8', text: '#005649' },

          customer: { bg: '#F4F3FF', text: '#3E1C96' },
          'active-dot': '#38C793',
          'inactive-dot': '#868C98',
        },

        toggle: {
          bg: '#F2F4F7',
          border: '#D2D4D7',
        },

        prescription: {
          bg: '#ECF8FF',
          text: '#003061',
        },

        nav: {
          bg: 'hsl(var(--nav-bg) / <alpha-value>)',
          border: 'hsl(var(--nav-border) / <alpha-value>)',
          'item-text': 'hsl(var(--nav-item-text) / <alpha-value>)',
          'item-text-active': 'hsl(var(--nav-item-text-active) / <alpha-value>)',
          'item-bg-hover': 'hsl(var(--nav-item-bg-hover) / <alpha-value>)',
          'item-bg-active': 'hsl(var(--nav-item-bg-active) / <alpha-value>)',
          'item-indicator': 'hsl(var(--nav-item-indicator) / <alpha-value>)',
        },

        table: {
          'header-bg': 'hsl(var(--table-header-bg) / <alpha-value>)',
          'header-text': 'hsl(var(--table-header-text) / <alpha-value>)',
          'row-bg': 'hsl(var(--table-row-bg) / <alpha-value>)',
          'row-hover': 'hsl(var(--table-row-hover) / <alpha-value>)',
          'row-alt': 'hsl(var(--table-row-alt) / <alpha-value>)',
          border: 'hsl(var(--table-border) / <alpha-value>)',
          'sticky-bg': 'hsl(var(--table-sticky-bg) / <alpha-value>)',
        },

        accent: {
          signal: '#F59E0B',
        },

        'off-white': '#FCFCFC',
        'off-black': '#14142B',

        disable: {
          bg: '#EBEDEF',
          text: '#A3A8B0',
        },
        disabled: {
          bg: '#EBEDEF',
          text: '#A3A8B0',
        },

        primary: {
          main: '#0B3B4B',
          dark: '#072A35',
          light: '#79C4D2',
          bg: '#DDF2F5',
          darkmode: '#1F6E80',
          black: '#0A0D14',
          50: '#F9F5FF',
          500: '#F59E0B',
        },

        neutral: {
          '25': 'hsl(var(--prim-neutral-25) / <alpha-value>)',
          '50': 'hsl(var(--prim-neutral-50) / <alpha-value>)',
          '100': 'hsl(var(--prim-neutral-100) / <alpha-value>)',
          '150': 'hsl(var(--prim-neutral-150) / <alpha-value>)',
          '200': 'hsl(var(--prim-neutral-200) / <alpha-value>)',
          '300': 'hsl(var(--prim-neutral-300) / <alpha-value>)',
          '400': 'hsl(var(--prim-neutral-400) / <alpha-value>)',
          '500': 'hsl(var(--prim-neutral-500) / <alpha-value>)',
          '600': 'hsl(var(--prim-neutral-600) / <alpha-value>)',
          '700': 'hsl(var(--prim-neutral-700) / <alpha-value>)',
          '800': 'hsl(var(--prim-neutral-800) / <alpha-value>)',
          '900': 'hsl(var(--prim-neutral-900) / <alpha-value>)',
          '950': 'hsl(var(--prim-neutral-950) / <alpha-value>)',
          '10': '#001B3C',
          '20': '#2F3038',
          '30': '#F5F6F7',
          '90': '#E2E1EC',
        },

        black: {
          50: '#eaf0f6',
          300: '#5A758F',
          700: '#082A40',
        },

        gray: {
          100: '#8F92A1',
          200: '#A5A9B0',
          500: '#1D2939',
          700: '#344054',
        },

        grayscale: {
          input: '#EFF0F7',
          line: '#D9DBE9',
          label: '#6E7191',
          placehold: '#A0A3BD',
          body: '#4E4B66',
          plain: '#E4E6E9',
          brown: '#2E323A',
          dark: '#0A0A0A',
        },

        green: {
          '25': '#f6fef9',
          '50': '#ECFDF3',
          '100': '#d1fadf',
          '200': '#a6f4c5',
          '300': '#6ce9a6',
          '400': '#32d583',
          '500': '#12b76a',
          '600': '#039855',

          '700': '#027A48',
          '800': '#05603a',
          '900': '#054f31',
          '901': '#EDFFF2',
          '902': '#04A353',
          '950': '#052e16',
          DEFAULT: '#12b76a',
        },

        red: {
          '25': '#fffbfa',
          '50': '#FEF3F2',
          '100': '#fee2e2',
          '200': '#FFC3C0',
          '300': '#FF968F',
          '400': '#FD6150',
          '500': '#f04438',
          '600': '#d92d20',
          '700': '#b42318',
          '800': '#912018',
          '900': '#7a271a',
          '950': '#450a0a',
          DEFAULT: '#f04438',
        },

        yellow: {
          '100': '#fef0c7',
          '25': '#fffcf5',
          '50': '#fffaeb',
          '200': '#fedf89',
          '300': '#fec84b',
          '400': '#fdb022',
          '500': '#f79009',
          '600': '#dc6803',
          '700': '#b54708',
          '800': '#93370d',
          '900': '#7a2e0e',
          '950': '#422006',
          DEFAULT: '#f79009',
        },

        'harbor': {
          '25': '#f2f9fb',
          '50': '#ddf2f5',
          '100': '#b3e2ea',
          '200': '#79c4d2',
          '300': '#3a9cae',
          '400': '#1f6e80',
          '500': '#145665',
          '600': '#0d3f4d',
          '700': '#093039',
          '800': '#062227',
          /* Figma canonical brand anchor — intentionally lighter than 800. Do not "fix" this value. --brand points here. */
          '900': '#0b3b4b',
          '950': '#030f13',
          DEFAULT: '#0b3b4b',
        },

        blue: {
          check: '#175CD3',
          '25': '#f5faff',
          '50': '#eff8ff',
          '100': '#d1e9ff',
          '200': '#b2ddff',
          '300': '#84caff',
          '400': '#53b1fd',
          '500': '#2e90fa',
          '600': '#1570ef',
          '700': '#1666d4',
          '800': '#1849a9',
          '900': '#194185',
          '950': '#0a1d3d',
          DEFAULT: '#2e90fa',
        },

        orange: {
          '25': '#fffaf5',
          '50': '#fff6ed',
          '100': '#ffead5',
          '200': '#fdd9a2',
          '300': '#feb273',
          '400': '#fd853a',
          '500': '#fb6514',
          '600': '#ec4a0a',
          '700': '#c4320a',
          '800': '#9c2a10',
          '900': '#7e2410',
          '950': '#431407',
          DEFAULT: '#fb6514',
        },

        purple: {
          '25': '#fafaff',
          '50': '#f4f3ff',
          '100': '#ebe9fe',
          '200': '#d9d6fe',
          '300': '#bdb4fe',
          '400': '#9b8afb',
          '500': '#7a5af8',
          '600': '#6938ef',
          '700': '#5925dc',
          '800': '#4a1fb8',
          '900': '#3e1c96',
          '950': '#190c45',
        },

        teal: {
          '25': '#f7fffd',
          '50': '#f0fffc',
          '100': '#e0fff8',
          '200': '#9cfbef',
          '300': '#6dfded',
          '400': '#41f8e1',
          /* 21-pt lightness cliff from step 400 (L=62%) is intentional — vivid aqua transitions to muted teal here. Add step 450 (#00e5cd, L≈53%) if smooth gradients are required. */
          '500': '#03cfbb',
          '600': '#00857a',
          '700': '#006b62',
          '800': '#005649',
          '900': '#003d35',
          '950': '#002420',
          DEFAULT: '#03cfbb',
        },

        slate: {
          '25': '#fafbfc',
          '50': '#fafafb',
          '100': '#f5f6f7',
          '150': '#ebedef',
          '200': '#e4e6e9',
          '300': '#c8ccd2',
          '400': '#a3a8b0',
          '500': '#7e848e',
          '600': '#525861',
          '700': '#2e323a',
          '800': '#16191f',
          /* S=33% intentional — blue-black character. Replace with #090c13 (S≈22%) if flat black is preferred. */
          '900': '#0a0d14',
          '950': '#05070a',
        },

        lavender: {
          '25': '#fbfaff',
          '50': '#f5f4ff',
          '100': '#e9e6ff',
          '200': '#c4b6ff',
          '300': '#c5a8ff',
          '400': '#b374ff',
          '500': '#9f1aff',
          '600': '#8000cc',
          '700': '#550084',
          '800': '#3a0055',
          '900': '#230033',
          '950': '#12001a',
        },

        rose: {
          '25': '#fef6fb',
          '50': '#fdf2fa',
          '100': '#fce7f6',
          '200': '#fcceee',
          '300': '#faa7e0',
          '400': '#f670c7',
          '500': '#ee46bc',
          '600': '#d81e86',
          '700': '#c11574',
          '800': '#9e165f',
          '900': '#851651',
          '950': '#4a0d28',
        },

        error: {
          one: '#F04438',
          two: '#FDA29B',
        },
      },
    },
  },
  plugins: [require('@tailwindcss/forms'), require('autoprefixer')],
} satisfies Config;
