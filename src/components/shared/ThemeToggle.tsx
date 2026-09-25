import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Sun, Moon, Smartphone } from 'lucide-react-native';
import { useTheme, ThemeMode } from '../../theme';

// A three-way appearance control: Light / Dark / System. Drop it into a settings
// row (e.g. Profile). Reads and writes the app theme through ThemeContext.
const OPTIONS: { mode: ThemeMode; label: string; Icon: any }[] = [
  { mode: 'light', label: 'Light', Icon: Sun },
  { mode: 'dark', label: 'Dark', Icon: Moon },
  { mode: 'system', label: 'System', Icon: Smartphone },
];

export function ThemeToggle() {
  const { mode, setMode, colors } = useTheme();

  return (
    <View style={[styles.row, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
      {OPTIONS.map(({ mode: m, label, Icon }) => {
        const active = mode === m;
        return (
          <TouchableOpacity
            key={m}
            style={[styles.seg, active && { backgroundColor: colors.surface, borderColor: colors.primary }]}
            onPress={() => setMode(m)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Icon size={16} color={active ? colors.primary : colors.textMuted} />
            <Text style={[styles.label, { color: active ? colors.primary : colors.textMuted }]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  seg: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  label: { fontSize: 13, fontWeight: '700' },
});
