import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShieldCheck, ShieldX } from 'lucide-react-native';
import { useTheme, makeStyles } from '../../theme';
import { setPageMeta } from '../../utils/pageMeta';
import { WebFooter } from '../../components/shared/WebFooter';
import { eventHub, fmtDate } from '../../services/eventhub';
import { EventHubHeader, StateView, PrimaryButton } from '../../components/events/EventUI';

type Result = Awaited<ReturnType<typeof eventHub.verify>>;

// karmaverse.earth/verify/:certId: the public check behind each certificate's QR code.
export function CertificateVerifyScreen({ navigation, route }: any) {
  const id = String(route?.params?.certId || '').toUpperCase();
  const styles = useStyles();
  const { colors } = useTheme();
  const [data, setData] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setNotFound(false);
    setData(null);
    try {
      setData(await eventHub.verify(id));
    } catch (e: any) {
      if (e?.status === 404) setNotFound(true);
      else setError(e?.message || "Couldn't check this certificate.");
    }
  }, [id]);

  useEffect(() => {
    load();
    return setPageMeta({ title: `Verify certificate ${id} | KarmaVerse` });
  }, [load, id]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <EventHubHeader navigation={navigation} title="Certificate check" subtitle={id} />
        <View style={styles.page}>
          {notFound ? (
            <View style={styles.card}>
              <ShieldX size={40} color={colors.danger} />
              <Text style={styles.title}>No certificate has this ID</Text>
              <Text style={styles.muted}>Check the ID printed on the certificate (it looks like KV-ABCDE23456). If it is correct, the certificate was not issued by KarmaVerse EventHub.</Text>
            </View>
          ) : (
            <StateView loading={!data && !error} error={error} onRetry={load}>
              {data && (
                <View style={styles.card}>
                  {data.valid ? <ShieldCheck size={44} color={colors.success} /> : <ShieldX size={44} color={colors.danger} />}
                  <Text style={[styles.status, { color: data.valid ? colors.success : colors.danger }]}>{data.valid ? 'Valid certificate' : 'This certificate was revoked'}</Text>
                  <Text style={styles.name}>{data.name}</Text>
                  <Text style={styles.muted}>{data.eventTitle}</Text>
                  <Text style={styles.muted}>{data.completion}</Text>
                  <Text style={styles.muted}>Issued {fmtDate(data.issuedAt)} · ID {data.certificateId}</Text>
                  {!!data.eventSlug && <PrimaryButton quiet label="About this event" onPress={() => navigation.navigate('EventDetail', { slug: data.eventSlug })} />}
                </View>
              )}
            </StateView>
          )}
        </View>
        {Platform.OS === 'web' && <WebFooter />}
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((c) => ({
  container: { flex: 1, backgroundColor: c.bg },
  page: { paddingHorizontal: 20, paddingBottom: 56, maxWidth: 620, width: '100%', alignSelf: 'center', flexGrow: 1 },
  card: { marginTop: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 20, padding: 28, alignItems: 'center', gap: 8 },
  status: { fontSize: 14, fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase' },
  title: { fontSize: 20, fontWeight: '900', color: c.text, textAlign: 'center' },
  name: { fontSize: 26, fontWeight: '900', color: c.text, textAlign: 'center', marginTop: 6 },
  muted: { fontSize: 14, color: c.textMuted, textAlign: 'center', lineHeight: 21 },
}));
