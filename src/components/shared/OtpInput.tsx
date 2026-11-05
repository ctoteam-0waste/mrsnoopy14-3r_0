import React, { useRef } from 'react';
import { View, Text, TextInput, Pressable, Platform } from 'react-native';
import { makeStyles } from '../../theme';

export function OtpInput({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const styles = useStyles();
  const inputRef = useRef<TextInput>(null);
  return (
    <Pressable style={styles.otpRow} onPress={() => inputRef.current?.focus()}>
      {Array.from({ length: 6 }).map((_, i) => (
        <View key={i} style={[styles.otpBox, i === Math.min(value.length, 5) && styles.otpBoxActive]}>
          <Text style={styles.otpDigit}>{value[i] || ''}</Text>
        </View>
      ))}
      {/* One real input under the boxes, so SMS autofill and paste fill all six. */}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(v) => onChange(v.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        autoFocus
        editable={!disabled}
        textContentType="oneTimeCode"
        autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
        caretHidden
        style={styles.otpInput}
        accessibilityLabel="6-digit code"
      />
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  otpRow: { flexDirection: 'row', gap: 8, marginTop: 24, marginBottom: 8 },
  otpBox: { flex: 1, maxWidth: 52, height: 56, borderRadius: 14, borderWidth: 1.5, borderColor: c.border, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' },
  otpBoxActive: { borderColor: c.primary },
  otpDigit: { fontSize: 22, fontWeight: '800', color: c.text },
  otpInput: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.02, color: 'transparent', fontSize: 1 },
}));
