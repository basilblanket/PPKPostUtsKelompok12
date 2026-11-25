import React, { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import "leaflet/dist/leaflet.css";
export default function LabMap({ labs, position, onSelect }) {
  const el = useRef(null),
    map = useRef(null),
    layer = useRef(null),
    callback = useRef(onSelect),
    [ready, setReady] = useState(false),
    [error, setError] = useState("");
  callback.current = onSelect;
  useEffect(() => {
    let cancelled = false;
    import("leaflet")
      .then((mod) => {
        if (cancelled) return;
        const L = mod.default || mod;
        map.current = L.map(el.current).setView([-7.05, 110.44], 14);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap contributors",
          maxZoom: 19,
        })
          .on("tileerror", () =>
            setError(
              "Peta dasar tidak dapat dimuat. Periksa koneksi; daftar laboratorium tetap tersedia.",
            ),
          )
          .addTo(map.current);
        layer.current = L.layerGroup().addTo(map.current);
        setReady(true);
      })
      .catch(() => setError("Peta tidak dapat dimuat."));
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
  }, []);
  useEffect(() => {
    if (!ready) return;
    let active = true;
    import("leaflet").then((mod) => {
      if (!active || !map.current) return;
      const L = mod.default || mod;
      layer.current.clearLayers();
      labs.forEach((l) => {
        L.circle([l.latitude, l.longitude], {
          radius: l.radius,
          color: "#6059d9",
        }).addTo(layer.current);
        const label = document.createElement("span");
        label.textContent = l.title;
        L.circleMarker([l.latitude, l.longitude], {
          radius: 10,
          color: "#6059d9",
          fillOpacity: 1,
        })
          .bindTooltip(label)
          .on("click", () => callback.current(l.id))
          .addTo(layer.current);
      });
      if (position)
        L.circleMarker([position.latitude, position.longitude], {
          radius: 8,
          color: "#059669",
          fillOpacity: 1,
        })
          .bindTooltip("Lokasi Anda")
          .addTo(layer.current);
      const points = labs.map((l) => [l.latitude, l.longitude]);
      if (position) points.push([position.latitude, position.longitude]);
      if (points.length)
        map.current.fitBounds(points, { padding: [35, 35], maxZoom: 17 });
    });
    return () => {
      active = false;
    };
  }, [ready, labs, position]);
  return (
    <View style={{ gap: 8 }}>
      <div
        ref={el}
        style={{ height: 340, width: "100%", borderRadius: 18, zIndex: 0 }}
        aria-label="Peta laboratorium"
      />
      {!!error && <Text>{error}</Text>}
    </View>
  );
}
