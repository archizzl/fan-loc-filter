import { memo, useMemo, useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Circle,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import type { Fan, FilterCircle, DataFilter } from "../types";
import "leaflet/dist/leaflet.css";

interface Props {
  fans: Fan[];
  selectedIds: Set<string>;
  circles: FilterCircle[];
  dataFilters: DataFilter[];
  onMapClick: (lat: number, lng: number) => void;
}

function ClickHandler({ onMapClick }: { onMapClick: Props["onMapClick"] }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/**
 * Renders fan markers on a single Canvas layer for performance.
 * Only re-draws when fans or selectedIds change (not on circle edits).
 */
function FanCanvasLayer({
  fans,
  selectedIds,
}: {
  fans: Fan[];
  selectedIds: Set<string>;
}) {
  const map = useMap();
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    // Remove old layer
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
    }

    // Use a canvas renderer shared across all markers
    const renderer = L.canvas({ padding: 0.5 });
    const group = L.layerGroup();

    for (const fan of fans) {
      const isSelected = selectedIds.has(fan._rowId);
      L.circleMarker([fan.LatitudeData, fan.LongitudeData], {
        radius: 3,
        renderer,
        color: isSelected ? "#3b82f6" : "#9ca3af",
        fillColor: isSelected ? "#3b82f6" : "#d1d5db",
        fillOpacity: isSelected ? 0.8 : 0.3,
        weight: 1,
      }).addTo(group);
    }

    group.addTo(map);
    layerRef.current = group;

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
      }
    };
  }, [fans, selectedIds, map]);

  return null;
}

/**
 * Renders GeoJSON boundary polygons for data filters.
 * Uses raw L.geoJSON for reliable updates (avoids react-leaflet GeoJSON re-render issues).
 */
function BoundaryLayer({ dataFilters }: { dataFilters: DataFilter[] }) {
  const map = useMap();
  const layerRef = useRef<L.LayerGroup | null>(null);

  const boundaries = useMemo(
    () =>
      dataFilters
        .filter(
          (df): df is DataFilter & { boundary: GeoJSON.GeoJsonObject } =>
            df.boundary != null && df.boundary !== undefined
        )
        .map((df) => ({ id: df.id, type: df.type, boundary: df.boundary })),
    [dataFilters]
  );

  useEffect(() => {
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
    }

    if (boundaries.length === 0) {
      layerRef.current = null;
      return;
    }

    const group = L.layerGroup();

    for (const b of boundaries) {
      const color = b.type === "include" ? "#22c55e" : "#ef4444";
      L.geoJSON(b.boundary as GeoJSON.GeoJsonObject, {
        style: {
          color,
          fillColor: color,
          fillOpacity: 0.15,
          weight: 2,
        },
      }).addTo(group);
    }

    group.addTo(map);
    layerRef.current = group;

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
      }
    };
  }, [boundaries, map]);

  return null;
}

const MapView = memo(function MapView({
  fans,
  selectedIds,
  circles,
  dataFilters,
  onMapClick,
}: Props) {
  const center = useMemo<[number, number]>(() => {
    if (fans.length === 0) return [54.0, -2.0];
    return [
      fans.reduce((s, f) => s + f.LatitudeData, 0) / fans.length,
      fans.reduce((s, f) => s + f.LongitudeData, 0) / fans.length,
    ];
  }, [fans]);

  return (
    <MapContainer
      center={center}
      zoom={fans.length > 0 ? 5 : 3}
      className="map-container"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onMapClick={onMapClick} />

      {/* Filter circles — lightweight, just a few overlays */}
      {circles.map((c) => (
        <Circle
          key={c.id}
          center={[c.lat, c.lng]}
          radius={c.radiusKm * 1000}
          pathOptions={{
            color: c.type === "include" ? "#22c55e" : "#ef4444",
            fillColor: c.type === "include" ? "#22c55e" : "#ef4444",
            fillOpacity: 0.15,
            weight: 2,
          }}
        />
      ))}

      {/* Boundary polygons for data filters */}
      <BoundaryLayer dataFilters={dataFilters} />

      {/* Fan markers — canvas-rendered for performance */}
      <FanCanvasLayer fans={fans} selectedIds={selectedIds} />
    </MapContainer>
  );
});

export default MapView;
