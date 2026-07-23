import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapplsGL from 'mappls-map-react-native';

interface TrackingMapProps {
  userCoordinate: [number, number];
  agentLocation?: { lat: number; lng: number } | null;
}

// Mappls native SDK v2 is licensed via the bundled OLF file — there is no
// runtime key API (the old setMapSDKKey/setRestAPIKey calls don't exist on
// the module and would throw, leaving the map stuck on "Initializing").
export function TrackingMap({ userCoordinate, agentLocation }: TrackingMapProps) {
  return (
    <MapplsGL.MapView style={{ flex: 1 }} logoEnabled={false} compassEnabled={false}>
      <MapplsGL.Camera
        centerCoordinate={agentLocation ? [agentLocation.lng, agentLocation.lat] : userCoordinate}
        zoomLevel={14}
        animationMode="flyTo"
        animationDuration={500}
      />
      <MapplsGL.PointAnnotation id="user-pin" coordinate={userCoordinate} title="Pickup">
        <View style={styles.pinWrap}>
          <View style={styles.userPin}><Text style={{ fontSize: 19 }}>🏠</Text></View>
          <View style={styles.userPinStem} />
        </View>
      </MapplsGL.PointAnnotation>
      {agentLocation && (
        <MapplsGL.PointAnnotation id="agent-pin" coordinate={[agentLocation.lng, agentLocation.lat]} title="Agent">
          <View style={styles.pinWrap}>
            <View style={styles.agentPin}><Text style={{ fontSize: 19 }}>🛵</Text></View>
            <View style={styles.agentPinStem} />
          </View>
        </MapplsGL.PointAnnotation>
      )}
    </MapplsGL.MapView>
  );
}

const styles = StyleSheet.create({
  pinWrap: { alignItems: 'center' },
  userPin: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#16a34a', borderWidth: 3, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 5, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  userPinStem: { width: 0, height: 0, borderLeftWidth: 7, borderRightWidth: 7, borderTopWidth: 11, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#fff', marginTop: -3 },
  agentPin: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#fff', borderWidth: 3, borderColor: '#0284c7', alignItems: 'center', justifyContent: 'center', elevation: 5, shadowColor: '#0284c7', shadowOpacity: 0.35, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  agentPinStem: { width: 0, height: 0, borderLeftWidth: 7, borderRightWidth: 7, borderTopWidth: 11, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#0284c7', marginTop: -3 },
});
