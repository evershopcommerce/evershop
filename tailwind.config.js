module.exports = {
  purge: {
    enabled: true,
    content: [
      './lib/*.js',
      './modules/*.js'
    ]
  },
  darkMode: false, // or 'media' or 'class',
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
    skew: false,
  },
  theme: {
    fontSize: {
      base: '.875rem'
    },
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
    spacing: {
      '025': '.25rem',
      '05': '.5rem',
      '075': '.75rem',
      '1': '1rem',
      '125': '1.25rem',
      '15': '1.5rem'
    },
    margin: {
      '025': '.25rem',
      '05': '.5rem',
      '075': '.75rem',
      '1': '1rem',
      '125': '1.25rem',
      '15': '1.5rem'
    },
    borderRadius: {
      DEFAULT: '0.25rem'
    },
    borderWidth: {
      DEFAULT: '1px'
    },
    opacity: {

    },
    boxShadow: {
      DEFAULT: '0 0 0 1px rgba(63,63,68,.05),0 1px 3px 0 rgba(63,63,68,.15)',
    }
  },
  variants: {
  },
  plugins: [],
}
