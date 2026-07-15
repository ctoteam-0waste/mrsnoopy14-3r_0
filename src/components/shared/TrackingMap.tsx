import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import MapplsGL from 'mappls-map-react-native';
import { mapService } from '../../services/mapService';

interface TrackingMapProps {
  userCoordinate: [number, number];
  agentLocation?: { lat: number; lng: number } | null;
}

export function TrackingMap({ userCoordinate, agentLocation }: TrackingMapProps) {
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    mapService.getMapConfig()
      .then(key => {
        MapplsGL.setMapSDKKey(key);
        MapplsGL.setRestAPIKey(key);
        setMapReady(true);
      })
      .catch(() => {});
  }, []);

  if (!mapReady) {
    return (
      <View style={styles.mapComingSoon}>
        <ActivityIndicator size="small" color="#16a34a" />
        <Text style={styles.mapComingSoonTitle}>Initializing map...</Text>
      </View>
    );
  }

  return (
    <MapplsGL.MapView style={{ flex: 1 }} logoEnabled={false} compassEnabled={false}>
      <MapplsGL.Camera
        centerCoordinate={agentLocation ? [agentLocation.lng, agentLocation.lat] : userCoordinate}
        zoomLevel={14}
        animationMode="flyTo"
        animationDuration={500}
      />
      <MapplsGL.PointAnnotation id="user-pin" coordinate={userCoordinate} title="Pickup">
        <View style={styles.userPin}><Text style={{ fontSize: 18 }}>📦</Text></View>
      </MapplsGL.PointAnnotation>
      {agentLocation && (
        <MapplsGL.PointAnnotation id="agent-pin" coordinate={[agentLocation.lng, agentLocation.lat]} title="Agent">
          <View style={styles.agentPin}><Text style={{ fontSize: 18 }}>🛵</Text></View>
        </MapplsGL.PointAnnotation>
      )}
    </MapplsGL.MapView>
  );
}

const styles = StyleSheet.create({
  mapComingSoon: { flex: 1, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center', padding: 20 },
  mapComingSoonTitle: { fontSize: 14, fontWeight: '700', color: '#15803d', marginTop: 8, textAlign: 'center' },
  userPin: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#dcfce7', borderWidth: 2, borderColor: '#16a34a', alignItems: 'center', justifyContent: 'center' },
  agentPin: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', borderWidth: 2, borderColor: '#0ea5e9', alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#0ea5e9', shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
});
