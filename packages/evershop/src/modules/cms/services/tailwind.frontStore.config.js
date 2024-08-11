module.exports = {
  theme: {
    extend: {
      colors: {
        white: '#ffffff',
        primary: '#3a3a3a',
        secondary: '#111213',
        surface: '#111213',
        onSurface: '#111213',
        interactive: '#2c6ecb',
        critical: '#fa4545',
        warning: '#FFC453',
        highlight: '#5BCDDA',
        success: '#008060',
        decorative: '#FFC96B',
        border: '#8c9196',
        icon: '#5c5f62',
        divider: '#e1e3e5',
        textSubdued: '#737373',
        button: '#3a3a3a'
      },
      boxShadow: {
        DEFAULT: '0 0 0 1px rgba(63,63,68,.05),0 1px 3px 0 rgba(63,63,68,.15)'
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
  plugins: [require('@tailwindcss/typography')]
};
