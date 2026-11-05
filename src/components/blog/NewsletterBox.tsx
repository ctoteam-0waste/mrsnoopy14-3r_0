import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Mail } from 'lucide-react-native';
import { BLOG_SOURCE } from '../../services/blog';
import { useTheme, makeStyles } from '../../theme';

// Newsletter sign-up for the blog. Saved on 0waste.co.in (its /api/newsletter endpoint),
// in the same list as sign-ups there; the team sees it in the 0waste admin.
export function NewsletterBox() {
  const styles = useStyles();
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) return setError('Please enter a valid email address.');
    setState('busy');
    try {
      const res = await fetch(`${BLOG_SOURCE}/api/newsletter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), source: 'karmaverse.earth' }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Couldn't sign you up right now. Please try again later.");
      setState('done');
    } catch (e: any) {
      setError(e?.message ?? "Couldn't sign you up right now.");
      setState('idle');
    }
  };

  return (
    <View style={styles.box}>
      <View style={styles.iconWrap}>
        <Mail size={20} color={colors.primary} />
      </View>
      <Text style={styles.title}>Get new posts in your inbox</Text>
      <Text style={styles.text}>Practical recycling and zero-waste tips, event invites and KarmaVerse updates. No spam. Unsubscribe anytime.</Text>
      {state === 'done' ? (
        <Text style={styles.done}>Thanks — you're on the list!</Text>
      ) : (
        <View style={styles.row}>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={colors.textFaint}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            onSubmitEditing={submit}
            style={styles.input}
            accessibilityLabel="Email address"
          />
          <TouchableOpacity style={styles.btn} onPress={submit} disabled={state === 'busy'}>
            {state === 'busy' ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.btnText}>Subscribe</Text>}
          </TouchableOpacity>
        </View>
      )}
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  box: { backgroundColor: c.primarySoft, borderRadius: 24, padding: 24, gap: 10, marginTop: 28 },
  iconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '900', color: c.text },
  text: { fontSize: 15, color: c.textMuted, lineHeight: 22 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  input: { flexGrow: 1, flexBasis: 220, minHeight: 48, borderRadius: 100, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, paddingHorizontal: 18, fontSize: 15, color: c.text },
  btn: { minHeight: 48, paddingHorizontal: 24, borderRadius: 100, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: c.onPrimary, fontWeight: '800', fontSize: 15 },
  done: { fontSize: 15, fontWeight: '700', color: c.primary, marginTop: 4 },
  error: { fontSize: 13.5, color: '#dc2626', fontWeight: '600' },
}));
