import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useTheme } from './ThemeContext';
import { ThemeColors } from './colors';

// StyleSheet.create is static and can't read context, so a themed screen builds its
// styles from the active tokens through this helper.
//
//   const useStyles = makeStyles((c) => ({
//     container: { backgroundColor: c.bg },
//     title:     { color: c.text },
//   }));
//
//   function Screen() {
//     const styles = useStyles();          // re-computes when the theme changes
//     const { colors } = useTheme();       // for inline colors (icons, gradients)
//     ...
//   }
export function makeStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (colors: ThemeColors) => T
) {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}
