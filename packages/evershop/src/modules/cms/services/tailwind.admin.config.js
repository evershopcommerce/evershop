module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#008060',
        secondary: '#111213',
        surface: '#111213',
        onSurface: '#111213',
        interactive: '#2c6ecb',
        critical: '#d72c0d',
        warning: '#FFC453',
        highlight: '#5BCDDA',
        success: '#008060',
        decorative: '#FFC96B',
        border: '#8c9196',
        background: '#f6f6f7fc',
        icon: '#5c5f62',
        divider: '#e1e3e5',
        textSubdued: '#6d7175'
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
  plugins: []
};
