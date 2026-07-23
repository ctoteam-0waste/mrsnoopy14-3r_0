import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { mappls } from 'mappls-web-maps';
import { MAPPLS_WEB_KEY } from '../../config/mappls';

interface TrackingMapProps {
  userCoordinate: [number, number];           // [lng, lat] — pickup
  agentLocation?: { lat: number; lng: number } | null; // agent live location
}

const mapplsObj = new mappls();

// Custom HTML pins so the pickup point and the moving agent are visually
// distinct (default Mappls markers are identical red pins).
const USER_PIN_HTML =
  '<div style="width:38px;height:38px;border-radius:50%;background:#dcfce7;border:3px solid #16a34a;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 8px rgba(22,163,74,0.45);">📦</div>';
const AGENT_PIN_HTML =
  '<div style="width:38px;height:38px;border-radius:50%;background:#e0f2fe;border:3px solid #0284c7;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 8px rgba(2,132,199,0.5);">🛵</div>';

// OpenStreetMap iframe — used only if the Mappls Web SDK fails to load,
// so the tracking view is never worse than before.
function OsmFallback({ userCoordinate, agentLocation }: TrackingMapProps) {
  const [userLng, userLat] = userCoordinate;
  const pts = agentLocation ? [[userLat, userLng], [agentLocation.lat, agentLocation.lng]] : [[userLat, userLng]];
  const lats = pts.map(p => p[0]); const lons = pts.map(p => p[1]);
  const bbox = `${Math.min(...lons) - 0.01}%2C${Math.min(...lats) - 0.01}%2C${Math.max(...lons) + 0.01}%2C${Math.max(...lats) + 0.01}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${userLat}%2C${userLng}`;
  return <iframe title="Live tracking map" src={src} style={{ width: '100%', height: '100%', border: 0 }} />;
}

export function TrackingMap({ userCoordinate, agentLocation }: TrackingMapProps) {
  const containerId = useRef(`mappls-track-${Math.random().toString(36).slice(2)}`);
  const mapRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const agentMarkerRef = useRef<any>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'fallback'>('loading');

  useEffect(() => {
    let cancelled = false;
    const failTimer = setTimeout(() => { if (!cancelled) setStatus(s => (s === 'ready' ? s : 'fallback')); }, 12000);

    try {
      mapplsObj.initialize(MAPPLS_WEB_KEY, { map: true }, () => {
        if (cancelled) return;
        try {
          const map = mapplsObj.Map({
            id: containerId.current,
            properties: {
              center: [userCoordinate[1], userCoordinate[0]], // Mappls: [lat, lng]
              zoom: 14,
              zoomControl: true,
            },
          });
          mapRef.current = map;
          map.on('load', () => {
            if (cancelled) return;
            clearTimeout(failTimer);
            setStatus('ready');
            userMarkerRef.current = mapplsObj.Marker({
              map,
              position: { lat: userCoordinate[1], lng: userCoordinate[0] },
              popupHtml: '<b>Pickup location</b>',
              html: USER_PIN_HTML,
              width: 38,
              height: 38,
            });
          });
        } catch (e) {
          console.error('[TrackingMap.web] Map() failed:', e);
          setStatus('fallback');
        }
      });
    } catch (e) {
      console.error('[TrackingMap.web] initialize failed:', e);
      setStatus('fallback');
    }

    return () => {
      cancelled = true;
      clearTimeout(failTimer);
      try { mapRef.current?.remove?.(); } catch {}
      mapRef.current = null;
    };
  }, []);

  // Live agent marker — moves as the agent's location updates
  useEffect(() => {
    if (status !== 'ready' || !agentLocation || !mapRef.current) return;
    const pos = { lat: agentLocation.lat, lng: agentLocation.lng };
    try {
      if (agentMarkerRef.current) {
        agentMarkerRef.current.setPosition(pos);
      } else {
        agentMarkerRef.current = mapplsObj.Marker({
          map: mapRef.current,
          position: pos,
          popupHtml: '<b>Agent (live)</b>',
          html: AGENT_PIN_HTML,
          width: 38,
          height: 38,
        });
      }
      mapRef.current.setCenter([agentLocation.lng, agentLocation.lat]);
    } catch (e) {
      console.warn('[TrackingMap.web] agent marker update failed:', e);
    }
  }, [agentLocation, status]);

  if (status === 'fallback') {
    return <OsmFallback userCoordinate={userCoordinate} agentLocation={agentLocation} />;
  }

  return (
    <View style={styles.container}>
      <div id={containerId.current} style={{ width: '100%', height: '100%' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
