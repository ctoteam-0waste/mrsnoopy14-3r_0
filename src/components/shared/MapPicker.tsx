import React, { useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import MapplsGL from 'mappls-map-react-native';
import { MapPin } from 'lucide-react-native';

interface MapPickerProps {
  center: [number, number]; // [lng, lat] — controlled from parent
  onCenterChange: (coords: [number, number]) => void; // fired after the user stops panning
}

// ~1 m. GPS / SDK round-trips shift the last decimals, so an exact compare
// mistook the map's own report for a new outside recenter.
const EPS = 1e-5;
const REPORT_DEBOUNCE_MS = 400;
const RECENTER_MS = 600;

const near = (a: [number, number] | null, b: [number, number]) =>
  !!a && Math.abs(a[0] - b[0]) < EPS && Math.abs(a[1] - b[1]) < EPS;

export function MapPicker({ center, onCenterChange }: MapPickerProps) {
  const cameraRef = useRef<any>(null);
  const lastInternalCenter = useRef<[number, number] | null>(null);
  const latestCenter = useRef(center);
  const mapLoaded = useRef(false);
  const onChangeRef = useRef(onCenterChange);
  const reportTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // While our own recenter animation runs, the map's intermediate positions
  // must not be reported back — that echo flew the camera back and forth.
  const animatingUntil = useRef(0);
  latestCenter.current = center;
  onChangeRef.current = onCenterChange;

  useEffect(() => () => { if (reportTimer.current) clearTimeout(reportTimer.current); }, []);

  // A camera move sent while the map is still loading is dropped, so the map
  // stayed on its first center. Apply the latest one once it has loaded.
  const handleMapLoaded = () => {
    mapLoaded.current = true;
    cameraRef.current?.setCamera({ centerCoordinate: latestCenter.current, animationDuration: 0 });
  };

  // The SDK's own regionDidChange debounce is rebuilt on every render, so
  // stale timers fired extra, out-of-order reports. We take events raw
  // (regionDidChangeDebounceTime=0), read the center from the event payload
  // (no async getCenter race) and debounce here with one stable timer.
  const handleRegionDidChange = (feature: any) => {
    // Only a pan by the user picks a new spot. On iOS the map also reports a
    // region change when its view is resized (the address sheet growing from
    // one line to two), which fed a lookup -> resize -> lookup loop.
    if (feature?.properties?.isUserInteraction === false) return;
    const coords = feature?.geometry?.coordinates;
    if (!Array.isArray(coords) || typeof coords[0] !== 'number' || typeof coords[1] !== 'number') return;
    const c: [number, number] = [coords[0], coords[1]];
    if (reportTimer.current) clearTimeout(reportTimer.current);
    const wait = Math.max(REPORT_DEBOUNCE_MS, animatingUntil.current - Date.now());
    reportTimer.current = setTimeout(() => {
      reportTimer.current = null;
      if (near(lastInternalCenter.current, c)) return; // nothing moved
      lastInternalCenter.current = c;
      onChangeRef.current(c);
    }, wait);
  };

  // Move the camera only when `center` changes from outside (search select /
  // GPS) — not when it's the echo of a position this map just reported.
  useEffect(() => {
    if (near(lastInternalCenter.current, center)) return;
    if (!mapLoaded.current || !cameraRef.current) return;
    // Treat the target as already reported so its arrival isn't echoed back.
    lastInternalCenter.current = center;
    if (reportTimer.current) { clearTimeout(reportTimer.current); reportTimer.current = null; }
    animatingUntil.current = Date.now() + RECENTER_MS + 100;
    // easeTo + fixed street zoom: flyTo's zoom-out/zoom-in arc read as a glitch.
    cameraRef.current.setCamera({
      centerCoordinate: center,
      zoomLevel: 16,
      animationDuration: RECENTER_MS,
      animationMode: 'easeTo',
    });
  }, [center]);

  return (
    <View style={styles.container}>
      <MapplsGL.MapView
        style={styles.map}
        onDidFinishLoadingMap={handleMapLoaded}
        onRegionDidChange={handleRegionDidChange}
        regionDidChangeDebounceTime={0}
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
