import plugin from '@tailwindcss/typography';

export default {
  theme: {
    extend: {
      colors: {
        white: '#ffffff',
        // Brand: a deep ink base with a warm amber accent
        primary: '#111827',
        primaryHover: '#1f2937',
        accent: '#c2410c',
        accentSoft: '#fff7ed',
        secondary: '#374151',
        surface: '#ffffff',
        surfaceSubdued: '#f8f7f5',
        onSurface: '#111827',
        interactive: '#1d4ed8',
        critical: '#dc2626',
        warning: '#d97706',
        highlight: '#0891b2',
        success: '#047857',
        decorative: '#f5d0a9',
        border: '#e5e1da',
        borderStrong: '#d6d1c7',
        icon: '#6b7280',
        divider: '#ece9e3',
        textSubdued: '#6b7280',
        button: '#111827'
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif'
        ],
        display: [
          'Fraunces',
          'Iowan Old Style',
          'Georgia',
          'Cambria',
          'Times New Roman',
          'serif'
        ]
      },
      letterSpacing: {
        tightest: '-0.04em'
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.25rem',
        '3xl': '1.75rem'
      },
      maxWidth: {
        page: '1280px'
      },
      boxShadow: {
        DEFAULT: '0 1px 2px 0 rgba(17, 24, 39, 0.05)',
        card: '0 1px 3px rgba(17, 24, 39, 0.06), 0 8px 24px -12px rgba(17, 24, 39, 0.12)',
        cardHover:
          '0 2px 6px rgba(17, 24, 39, 0.08), 0 20px 40px -20px rgba(17, 24, 39, 0.25)',
        overlay: '0 24px 60px -20px rgba(17, 24, 39, 0.35)'
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.22, 1, 0.36, 1)'
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' }
        }
      },
      animation: {
        fadeUp: 'fadeUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
        shimmer: 'shimmer 1.6s infinite'
      }
    }
  },
  variants: {
    extend: {
      borderWidth: ['first', 'last'],
      margin: ['first', 'last'],
      padding: ['first', 'last']
    }
  },
  plugins: [plugin]
};
