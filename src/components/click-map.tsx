"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { Circle, CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from "react-leaflet";
import type { LatLngBoundsExpression } from "leaflet";
import type { MapPoint } from "@/lib/stats";

function FitBounds({ points }: { points: MapPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 10);
      return;
    }
    const bounds: LatLngBoundsExpression = points.map((p) => [p.lat, p.lng]);
    map.fitBounds(bounds, { padding: [32, 32], maxZoom: 11 });
  }, [map, points]);
  return null;
}

const darkQuery = "(prefers-color-scheme: dark)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(darkQuery);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function useDarkMode() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(darkQuery).matches,
    () => false,
  );
}

export default function ClickMap({ points }: { points: MapPoint[] }) {
  const dark = useDarkMode();
  const max = useMemo(() => Math.max(1, ...points.map((p) => p.count)), [points]);
  const colors = dark ? { ip: "#3987e5", gps: "#d95926", ring: "#1a1a19" } : { ip: "#2a78d6", gps: "#eb6834", ring: "#fcfcfb" };
  // Área do círculo proporcional ao número de cliques (raio ∝ √n).
  const radius = (n: number) => 5 + 17 * Math.sqrt(n / max);

  return (
    <MapContainer center={[-14.2, -51.9]} zoom={3} scrollWheelZoom={false} className="h-full w-full" worldCopyJump>
      <TileLayer
        key={dark ? "dark" : "light"}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url={`https://{s}.basemaps.cartocdn.com/${dark ? "dark_all" : "light_all"}/{z}/{x}/{y}{r}.png`}
      />
      <FitBounds points={points} />
      {points.map((p) => (
        <span key={`${p.precise}-${p.lat}-${p.lng}`}>
          {p.precise && p.accuracy && p.accuracy < 5000 && (
            <Circle
              center={[p.lat, p.lng]}
              radius={p.accuracy}
              pathOptions={{ color: colors.gps, weight: 1, fillOpacity: 0.08, dashArray: "4 4" }}
            />
          )}
          <CircleMarker
            center={[p.lat, p.lng]}
            radius={radius(p.count)}
            pathOptions={{ color: colors.ring, weight: 2, fillColor: p.precise ? colors.gps : colors.ip, fillOpacity: 0.8 }}
          >
            <Tooltip direction="top" offset={[0, -4]}>
              <strong>{p.label}</strong>
              <br />
              {p.count.toLocaleString("pt-BR")} {p.count === 1 ? "clique" : "cliques"} ·{" "}
              {p.precise ? `GPS (±${Math.round(p.accuracy ?? 0)} m)` : "estimado por IP"}
            </Tooltip>
          </CircleMarker>
        </span>
      ))}
    </MapContainer>
  );
}
