module.exports = {
  corePlugins: {
    // ...
    lineHeight: false,
    placeholder: false,
    placeholderOpacity: false,
    textOpacity: false,
    backgroundOpacity: false,
    backgroundPosition: false,
    backgroundImage: false,
    gradientColorStops: false,
    borderOpacity: false,
    divideColor: false,
    divideOpacity: false,
    ringOpacity: false,
    ringOffsetColor: false,
    mixBlendMode: false,
    backgroundBlendMode: false,
    brightness: false,
    contrast: false,
    dropShadow: false,
    hueRotate: false,
    invert: false,
    saturate: false,
    sepia: false,
    backdropFilter: false,
    backdropBlur: false,
    backdropBrightness: false,
    backdropContrast: false,
    backdropGrayscale: false,
    backdropHueRotate: false,
    backdropInvert: false,
    backdropOpacity: false,
    backdropSaturate: false,
    backdropSepia: false,
    transitionDelay: false,
    transform: false,
    transformOrigin: false,
    scale: false,
    rotate: false,
    translate: false,
    skew: false
  },
  theme: {
    fontFamily: {
      sans: 'Helvetica,Helvetica Neue,Arial,Lucida Grande,sans-serif'
    },
    fontSize: {
      base: '.875rem'
    },
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
    spacing: {
      0: '0px',
      '025': '.25rem',
      '05': '.5rem',
      '075': '.75rem',
      1: '1rem',
      125: '1.25rem',
      15: '1.5rem',
      2: '2rem',
      225: '2.25rem',
      25: '2.5rem',
      275: '2.75rem',
      3: '3rem',
      4: '4rem'
    },
    margin: {
      0: '0px',
      '025': '.25rem',
      '05': '.5rem',
      '075': '.75rem',
      1: '1rem',
      125: '1.25rem',
      15: '1.5rem',
      2: '2rem',
      225: '2.25rem',
      25: '2.5rem',
      275: '2.75rem',
      3: '3rem',
      4: '4rem'
    },
    borderRadius: {
      DEFAULT: '0.25rem',
      100: '100%'
    },
    borderWidth: {
      0: '0px',
      DEFAULT: '1px'
    },
    opacity: {},
    boxShadow: {
      DEFAULT: '0 0 0 1px rgba(63,63,68,.05),0 1px 3px 0 rgba(63,63,68,.15)'
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
