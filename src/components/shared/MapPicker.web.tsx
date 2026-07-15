import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { mappls } from 'mappls-web-maps';
import { MAPPLS_WEB_KEY } from '../../config/mappls';

interface MapPickerProps {
  center: [number, number]; // [lng, lat] — controlled from parent
  onCenterChange: (coords: [number, number]) => void; // fired after the user stops panning
}

const EPS = 1e-7;
// One SDK instance for the whole app — initialize() loads the Mappls script once.
const mapplsObj = new mappls();

// Mappls Map's getCenter() returns a MapLibre LngLat; read by name so lat/lng order is safe.
function readCenter(c: any): [number, number] | null {
  if (!c) return null;
  const lng = typeof c.lng === 'number' ? c.lng : (typeof c.lon === 'number' ? c.lon : (Array.isArray(c) ? c[0] : undefined));
  const lat = typeof c.lat === 'number' ? c.lat : (Array.isArray(c) ? c[1] : undefined);
  if (typeof lat === 'number' && typeof lng === 'number') return [lng, lat];
  return null;
}

export function MapPicker({ center, onCenterChange }: MapPickerProps) {
  const containerId = useRef(`mappls-map-${Math.random().toString(36).slice(2)}`);
  const mapRef = useRef<any>(null);
  const lastInternalCenter = useRef<[number, number] | null>(null);
  const onChangeRef = useRef(onCenterChange);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  onChangeRef.current = onCenterChange;

  useEffect(() => {
    let cancelled = false;
    // If the map hasn't reported ready within 12s, surface an error instead of a blank tile.
    const failTimer = setTimeout(() => { if (!cancelled) setStatus(s => (s === 'ready' ? s : 'error')); }, 12000);

    const initialCenter = center;
    try {
      mapplsObj.initialize(MAPPLS_WEB_KEY, { map: true }, () => {
        if (cancelled) return;
        try {
          const map = mapplsObj.Map({
            id: containerId.current,
            properties: {
              center: [initialCenter[1], initialCenter[0]], // Mappls Map props: [lat, lng]
              zoom: 16,
              zoomControl: true,
              location: false,
            },
          });
          mapRef.current = map;
          map.on('load', () => {
            if (cancelled) return;
            clearTimeout(failTimer);
            setStatus('ready');
            map.on('moveend', () => {
              const coords = readCenter(map.getCenter());
              if (coords) {
                lastInternalCenter.current = coords;
                onChangeRef.current(coords);
              }
            });
          });
        } catch (e) {
          console.error('[MapPicker.web] Map() failed:', e);
          setStatus('error');
        }
      });
    } catch (e) {
      console.error('[MapPicker.web] initialize failed:', e);
      setStatus('error');
    }

    return () => {
      cancelled = true;
      clearTimeout(failTimer);
      try { mapRef.current?.remove?.(); } catch {}
      mapRef.current = null;
    };
  }, []);

  // Recenter only when `center` changes from outside (search / GPS), not on drag echo.
  useEffect(() => {
    const last = lastInternalCenter.current;
    const isEcho = !!last && Math.abs(last[0] - center[0]) < EPS && Math.abs(last[1] - center[1]) < EPS;
    if (!isEcho && mapRef.current) {
      try { mapRef.current.setCenter([center[0], center[1]]); } catch {}
    }
  }, [center]);

  return (
    <View style={styles.container}>
      <div id={containerId.current} style={{ width: '100%', height: '100%' }} />

      {status !== 'ready' && (
        <View style={styles.overlay} pointerEvents="none">
          <Text style={styles.overlayText}>
            {status === 'error' ? 'Map could not load. Check your connection or map key.' : 'Loading map...'}
          </Text>
        </View>
      )}

      <View pointerEvents="none" style={styles.pinWrap}>
        <MapPin size={40} color="#dc2626" fill="#dc2626" />
        <View style={styles.pinDot} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, position: 'relative' },
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0fdf4',
  },
  overlayText: { fontSize: 13, fontWeight: '600', color: '#15803d', textAlign: 'center', paddingHorizontal: 24 },
  pinWrap: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -20,
    marginTop: -40,
    alignItems: 'center',
    zIndex: 1000,
  },
  pinDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.35)',
    marginTop: -3,
  },
});
