import React, { useRef, useEffect } from "react";
import MapView, { Marker, Circle } from "react-native-maps";
export default function LabMap({ labs, position, onSelect }) {
  const map = useRef(null),
    center = position || labs[0] || { latitude: -7.05, longitude: 110.44 };
  useEffect(() => {
    const points = labs.map(({ latitude, longitude }) => ({
      latitude,
      longitude,
    }));
    if (position)
      points.push({
        latitude: position.latitude,
        longitude: position.longitude,
      });
    if (points.length)
      map.current?.fitToCoordinates(points, {
        edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
        animated: true,
      });
  }, [labs, position]);
  return (
    <MapView
      ref={map}
      style={{ height: 340, width: "100%", borderRadius: 18 }}
      initialRegion={{
        latitude: center.latitude,
        longitude: center.longitude,
        latitudeDelta: 0.012,
        longitudeDelta: 0.012,
      }}
    >
      {labs.map((l) => (
        <React.Fragment key={l.id}>
          <Marker
            coordinate={{ latitude: l.latitude, longitude: l.longitude }}
            title={l.title}
            onPress={() => onSelect(l.id)}
          />
          <Circle
            center={{ latitude: l.latitude, longitude: l.longitude }}
            radius={l.radius}
            fillColor="rgba(90,88,220,0.12)"
            strokeColor="#6059d9"
          />
        </React.Fragment>
      ))}
      {position && (
        <Marker
          coordinate={{
            latitude: position.latitude,
            longitude: position.longitude,
          }}
          title="Lokasi Anda"
          pinColor="#16a085"
        />
      )}
    </MapView>
  );
}
