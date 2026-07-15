import React, { useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import MapplsGL from 'mappls-map-react-native';
import { MapPin } from 'lucide-react-native';

interface MapPickerProps {
  center: [number, number]; // [lng, lat] — controlled from parent
  onCenterChange: (coords: [number, number]) => void; // fired after the user stops panning
}

const EPS = 1e-7;

export function MapPicker({ center, onCenterChange }: MapPickerProps) {
  const mapRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const lastInternalCenter = useRef<[number, number] | null>(null);

  const handleRegionDidChange = async () => {
    if (!mapRef.current) return;
    try {
      const c: [number, number] = await mapRef.current.getCenter();
      lastInternalCenter.current = c;
      onCenterChange(c);
    } catch {}
  };

  // Fly the camera only when `center` changes from outside (search select / GPS) —
  // not when it's just an echo of the user's own drag reported via onCenterChange.
  useEffect(() => {
    const last = lastInternalCenter.current;
    const isEcho = !!last && Math.abs(last[0] - center[0]) < EPS && Math.abs(last[1] - center[1]) < EPS;
    if (!isEcho && cameraRef.current) {
      cameraRef.current.flyTo(center, 500);
    }
  }, [center]);

  return (
    <View style={styles.container}>
      <MapplsGL.MapView
        ref={mapRef}
        style={styles.map}
        onRegionDidChange={handleRegionDidChange}
        regionDidChangeDebounceTime={400}
        logoEnabled={false}
        compassEnabled={false}
      >
        <MapplsGL.Camera ref={cameraRef} defaultSettings={{ centerCoordinate: center, zoomLevel: 16 }} />
      </MapplsGL.MapView>
      <View pointerEvents="none" style={styles.pinWrap}>
        <MapPin size={40} color="#dc2626" fill="#dc2626" />
        <View style={styles.pinDot} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  pinWrap: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -20,
    marginTop: -40,
    alignItems: 'center',
  },
  pinDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.35)',
    marginTop: -3,
  },
});
