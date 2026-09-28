import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

export const RotiPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#f6f0fd',
      100: '#ebdffb',
      200: '#d6c0f5',
      300: '#b58cf0',
      400: '#9866df',
      500: '#7a42c9',
      600: '#5b2a91',
      700: '#4a2178',
      800: '#3a1a60',
      900: '#2c1349',
      950: '#1c0b30',
    },
    colorScheme: {
      light: {
        primary: {
          color: '{primary.600}',
          contrastColor: '#ffffff',
          hoverColor: '{primary.700}',
          activeColor: '{primary.800}',
        },
      },
      dark: {
        primary: {
          color: '{primary.300}',
          contrastColor: '#1a0f2b',
          hoverColor: '{primary.200}',
          activeColor: '{primary.100}',
        },
        surface: {
          0: '#ffffff',
          50: '#f4eefb',
          100: '#e2d8ee',
          200: '#c7b8da',
          300: '#a99bbd',
          400: '#85779a',
          500: '#645779',
          600: '#463a59',
          700: '#33264a',
          800: '#2a1f38',
          900: '#1e1529',
          950: '#120c1a',
        },
      },
    },
  },
});
