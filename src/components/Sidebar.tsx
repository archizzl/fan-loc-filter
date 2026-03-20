import { useState, useCallback, useMemo } from "react";
import type { Fan, FilterCircle, DataFilter } from "../types";
import CircleControl from "./CircleControl";
import DataFilterControl from "./DataFilterControl";
import { geocodeCity } from "../lib/geo";

interface Props {
  fans: Fan[];
  headers: string[];
  circles: FilterCircle[];
  dataFilters: DataFilter[];
  onUpdateCircle: (updated: FilterCircle) => void;
  onDeleteCircle: (id: string) => void;
  onAddCircle: (lat: number, lng: number, label: string) => void;
  onAddDataFilter: (field: string) => void;
  onUpdateDataFilter: (updated: DataFilter) => void;
  onDeleteDataFilter: (id: string) => void;
  onReorderDataFilters: (fromIndex: number, toIndex: number) => void;
  selectedCount: number;
  totalCount: number;
  onExport: () => void;
  dirty: boolean;
  onApply: () => void;
}

export default function Sidebar({
  fans,
  headers,
  circles,
  dataFilters,
  onUpdateCircle,
  onDeleteCircle,
  onAddCircle,
  onAddDataFilter,
  onUpdateDataFilter,
  onDeleteDataFilter,
  onReorderDataFilters,
  selectedCount,
  totalCount,
  onExport,
  dirty,
  onApply,
}: Props) {
  const [cityQuery, setCityQuery] = useState("");
  const [searching, setSearching] = useState(false);

  // --- Drag-and-drop state ---
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = useCallback((index: number) => {
    setDragIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, toIndex: number) => {
      e.preventDefault();
      if (dragIndex !== null && dragIndex !== toIndex) {
        onReorderDataFilters(dragIndex, toIndex);
      }
      setDragIndex(null);
      setDragOverIndex(null);
    },
    [dragIndex, onReorderDataFilters]
  );

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
    setDragOverIndex(null);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  // Fields suitable for data filtering (non-numeric, non-ID columns)
  const filterableFields = useMemo(() => {
    return headers.filter(
      (h) => h !== "LatitudeData" && h !== "LongitudeData" && h !== "ConsolidatedFanID" && h !== "_rowId"
    );
  }, [headers]);

  // Pre-compute unique values per field for autocomplete
  const uniqueValues = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const field of filterableFields) {
      const set = new Set<string>();
      for (const fan of fans) {
        const val = String(fan[field] ?? "");
        if (val) set.add(val);
      }
      const sorted = [...set].sort();
      map.set(field, sorted);
    }
    return map;
  }, [fans, filterableFields]);

  async function handleCitySearch(e: React.FormEvent) {
    e.preventDefault();
    if (!cityQuery.trim()) return;
    setSearching(true);
    const result = await geocodeCity(cityQuery);
    setSearching(false);
    if (result) {
      onAddCircle(result.lat, result.lng, result.name);
      setCityQuery("");
    } else {
      alert("City not found. Try a different search.");
    }
  }

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>Filters</h2>
        <div className="selection-stats">
          <span className="stat-selected">{selectedCount.toLocaleString()}</span>
          {" / "}
          <span className="stat-total">{totalCount.toLocaleString()}</span>
          {" fans selected"}
        </div>

        {/* Apply button */}
        {totalCount > 0 && (
          <button
            className={`apply-btn ${dirty ? "dirty" : ""}`}
            onClick={onApply}
            disabled={!dirty}
          >
            {dirty ? "Apply Filters" : "Filters Applied"}
          </button>
        )}

        {totalCount > 0 && (
          <button className="export-btn" onClick={onExport}>
            Export Selected ({selectedCount.toLocaleString()})
          </button>
        )}
      </div>

      {/* Geographic circle filters */}
      <div className="filter-section">
        <div className="filter-section-header">
          <h3>Geographic Circles</h3>
        </div>
        <form className="city-search" onSubmit={handleCitySearch}>
          <input
            type="text"
            placeholder="Search city to add circle..."
            value={cityQuery}
            onChange={(e) => setCityQuery(e.target.value)}
          />
          <button type="submit" disabled={searching}>
            {searching ? "..." : "Add"}
          </button>
        </form>
        <p className="hint">Or click the map to place a circle</p>
        <div className="circle-list">
          {circles.length === 0 && (
            <p className="empty-msg">No circles yet.</p>
          )}
          {circles.map((c) => (
            <CircleControl
              key={c.id}
              circle={c}
              onChange={onUpdateCircle}
              onDelete={onDeleteCircle}
            />
          ))}
        </div>
      </div>

      {/* Data-based filters (priority-ordered, drag to reorder) */}
      <div className="filter-section">
        <div className="filter-section-header">
          <h3>Data Filters</h3>
          {filterableFields.length > 0 && (
            <button
              className="add-data-filter-btn"
              onClick={() => onAddDataFilter(filterableFields[0])}
            >
              + Add
            </button>
          )}
        </div>
        {dataFilters.length > 1 && (
          <p className="hint">Drag handle to reorder priority (top = first applied)</p>
        )}
        <div className="circle-list">
          {dataFilters.length === 0 && (
            <p className="empty-msg">
              No data filters yet. Use these to include/exclude by country, city, state, etc.
            </p>
          )}
          {dataFilters.map((df, index) => (
            <DataFilterControl
              key={df.id}
              filter={df}
              index={index}
              fieldOptions={filterableFields}
              uniqueValues={uniqueValues}
              onChange={onUpdateDataFilter}
              onDelete={onDeleteDataFilter}
              isDragging={dragIndex === index}
              isDragOver={dragOverIndex === index && dragIndex !== index}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              onDragLeave={handleDragLeave}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
