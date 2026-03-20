import type { Fan, FilterCircle, DataFilter } from "../types";
import { distanceKm } from "./geo";

export function filterFans(
  fans: Fan[],
  circles: FilterCircle[],
  dataFilters: DataFilter[]
): Set<string> {
  const includeCircles = circles.filter((c) => c.type === "include");
  const excludeCircles = circles.filter((c) => c.type === "exclude");

  // --- Phase 1: Geographic circle set (set-based, unchanged) ---
  const circleSet = new Set<string>();
  if (includeCircles.length > 0) {
    for (const fan of fans) {
      const inCircle = includeCircles.some(
        (c) =>
          distanceKm(fan.LatitudeData, fan.LongitudeData, c.lat, c.lng) <=
          c.radiusKm
      );
      if (inCircle) circleSet.add(fan._rowId);
    }
  }

  // --- Phase 2: Sequential data filters (priority-ordered) ---
  // Process top-to-bottom: include adds to the set, exclude removes from it
  const dataSet = new Set<string>();
  if (dataFilters.length > 0) {
    for (const df of dataFilters) {
      if (!df.value) continue; // skip empty-value filters
      const lowerValue = df.value.toLowerCase();
      if (df.type === "include") {
        for (const fan of fans) {
          if (String(fan[df.field] ?? "").toLowerCase() === lowerValue) {
            dataSet.add(fan._rowId);
          }
        }
      } else {
        for (const fan of fans) {
          if (String(fan[df.field] ?? "").toLowerCase() === lowerValue) {
            dataSet.delete(fan._rowId);
          }
        }
      }
    }
  }

  // --- Phase 3: Combine ---
  const hasInclusions =
    includeCircles.length > 0 ||
    dataFilters.some((d) => d.type === "include" && d.value);

  let result: Set<string>;
  if (!hasInclusions) {
    // No include filters at all: start with all fans
    result = new Set(fans.map((f) => f._rowId));
  } else {
    // Union of circle-selected and data-selected
    result = new Set([...circleSet, ...dataSet]);
  }

  // --- Circle exclusions always apply as final pass ---
  if (excludeCircles.length > 0) {
    for (const fan of fans) {
      if (!result.has(fan._rowId)) continue;
      const excludedByCircle = excludeCircles.some(
        (c) =>
          distanceKm(fan.LatitudeData, fan.LongitudeData, c.lat, c.lng) <=
          c.radiusKm
      );
      if (excludedByCircle) result.delete(fan._rowId);
    }
  }

  return result;
}
