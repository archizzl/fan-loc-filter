import distance from "@turf/distance";
import { point } from "@turf/helpers";

export function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  return distance(point([lng1, lat1]), point([lng2, lat2]), {
    units: "kilometers",
  });
}

export const GEO_FIELDS = new Set(["CountryData", "CityData", "StateData"]);

export async function geocodeBoundary(
  query: string
): Promise<GeoJSON.GeoJsonObject | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&polygon_geojson=1&polygon_threshold=0.005`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "FanLocFilter/1.0" },
    });
    const data = await res.json();
    if (data.length === 0 || !data[0].geojson) return null;
    return data[0].geojson as GeoJSON.GeoJsonObject;
  } catch {
    return null;
  }
}

export async function geocodeCity(
  query: string
): Promise<{ lat: number; lng: number; name: string } | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "FanLocFilter/1.0" },
    });
    const data = await res.json();
    if (data.length === 0) return null;
    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      name: data[0].display_name.split(",")[0],
    };
  } catch {
    return null;
  }
}
