import React, { useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import MapplsGL from 'mappls-map-react-native';
import { MapPin } from 'lucide-react-native';

interface MapPickerProps {
  center: [number, number]; // [lng, lat] — controlled from parent
  onCenterChange: (coords: [number, number]) => void; // fired after the user stops panning
}

const EPS = 1e-7;
// About a metre. Smaller moves are layout noise, not the user moving the pin.
const MOVE_EPS = 1e-5;

export function MapPicker({ center, onCenterChange }: MapPickerProps) {
  const mapRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const lastInternalCenter = useRef<[number, number] | null>(null);
  const latestCenter = useRef(center);
  const mapLoaded = useRef(false);
  latestCenter.current = center;

  // A camera move sent while the map is still loading is dropped, so the map
  // stayed on its first center. Apply the latest one once it has loaded.
  const handleMapLoaded = () => {
    mapLoaded.current = true;
    cameraRef.current?.setCamera({ centerCoordinate: latestCenter.current, animationDuration: 0 });
  };

  // Only a pan by the user picks a new spot. On iOS the map also reports a region
  // change when its view is resized (the address sheet below growing from one line
  // to two), which fed a loop: resize -> new lookup -> sheet resizes -> ...
  const handleRegionDidChange = async (feature?: any) => {
    if (!mapRef.current) return;
    if (feature?.properties?.isUserInteraction === false) return;
    try {
      const c: [number, number] = await mapRef.current.getCenter();
      const last = lastInternalCenter.current;
      if (last && Math.abs(last[0] - c[0]) < MOVE_EPS && Math.abs(last[1] - c[1]) < MOVE_EPS) return;
      lastInternalCenter.current = c;
      onCenterChange(c);
    } catch {}
  };

  // Fly the camera only when `center` changes from outside (search select / GPS) —
  // not when it's just an echo of the user's own drag reported via onCenterChange.
  useEffect(() => {
    const last = lastInternalCenter.current;
    const isEcho = !!last && Math.abs(last[0] - center[0]) < EPS && Math.abs(last[1] - center[1]) < EPS;
    if (!isEcho && mapLoaded.current && cameraRef.current) {
      cameraRef.current.flyTo(center, 500);
    }
  }, [center]);

  return (
    <View style={styles.container}>
      <MapplsGL.MapView
        ref={mapRef}
        style={styles.map}
        onDidFinishLoadingMap={handleMapLoaded}
        onRegionDidChange={handleRegionDidChange}
        regionDidChangeDebounceTime={400}
        logoEnabled={false}
        compassEnabled={false}
      >
        <MapplsGL.Camera ref={cameraRef} defaultSettings={{ centerCoordinate: center, zoomLevel: 16 }} />
      </MapplsGL.MapView>
      <View style={[styles.pinWrap, { pointerEvents: 'none' }]}>
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
