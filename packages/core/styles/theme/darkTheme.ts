import { createTheme, theme } from '@nextui-org/react';
import { darkCode, darkCodeLight, darkPrimary, darkSelection } from '../../constants';
import { getColor } from './getColor';

export const darkTheme =  createTheme({
  type: "dark",
  theme: {
    colors: {
      // brand colors
      primaryLight: '#444',
      primary: '#444',
      primaryDark: '#444',
      secondary: '#eeff00',
      gradient: 'linear-gradient(112deg, $blue100 -25%, $pink500 -10%, $purple500 80%)',
      link: '#eeff00',
    },
    space: {},
    fonts: {}
  }
});
