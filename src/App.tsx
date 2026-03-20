import { useState, useCallback, useRef } from "react";
import type { Fan, FilterCircle, DataFilter } from "./types";
import { parseFanCSV, fansToCSV } from "./lib/csv";
import { filterFans } from "./lib/filter";
import { geocodeBoundary, GEO_FIELDS } from "./lib/geo";
import UploadArea from "./components/UploadArea";
import MapView from "./components/MapView";
import Sidebar from "./components/Sidebar";
import "./App.css";

let nextCircleId = 1;
let nextDataFilterId = 1;

function App() {
  const [fans, setFans] = useState<Fan[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [circles, setCircles] = useState<FilterCircle[]>([]);
  const [dataFilters, setDataFilters] = useState<DataFilter[]>([]);

  // The applied (confirmed) selection — only recalculated on explicit "Apply"
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Track whether filters have changed since last apply
  const [dirty, setDirty] = useState(false);
  // Ref to hold latest state for applyFilters without stale closures
  const stateRef = useRef({ fans, circles, dataFilters });
  stateRef.current = { fans, circles, dataFilters };

  const applyFilters = useCallback(() => {
    const { fans, circles, dataFilters } = stateRef.current;
    setSelectedIds(filterFans(fans, circles, dataFilters));
    setDirty(false);
  }, []);

  const markDirty = useCallback(() => setDirty(true), []);

  const handleFile = useCallback(async (file: File) => {
    const result = await parseFanCSV(file);
    setFans(result.fans);
    setHeaders(result.headers);
    setCircles([]);
    setDataFilters([]);
    // Auto-apply on fresh upload (all fans selected, no filters)
    setSelectedIds(new Set(result.fans.map((f) => f._rowId)));
    setDirty(false);
  }, []);

  // --- Circle callbacks ---
  const addCircle = useCallback(
    (lat: number, lng: number, label: string) => {
      setCircles((prev) => [
        ...prev,
        {
          id: `c${nextCircleId++}`,
          lat,
          lng,
          radiusKm: 50,
          type: "include",
          label,
        },
      ]);
      markDirty();
    },
    [markDirty]
  );

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      addCircle(lat, lng, `Circle ${nextCircleId}`);
    },
    [addCircle]
  );

  const updateCircle = useCallback(
    (updated: FilterCircle) => {
      setCircles((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c))
      );
      markDirty();
    },
    [markDirty]
  );

  const deleteCircle = useCallback(
    (id: string) => {
      setCircles((prev) => prev.filter((c) => c.id !== id));
      markDirty();
    },
    [markDirty]
  );

  // --- Data filter callbacks ---
  const addDataFilter = useCallback(
    (field: string) => {
      setDataFilters((prev) => [
        ...prev,
        {
          id: `d${nextDataFilterId++}`,
          field,
          value: "",
          type: "include",
        },
      ]);
      markDirty();
    },
    [markDirty]
  );

  const updateDataFilter = useCallback(
    (updated: DataFilter) => {
      setDataFilters((prev) =>
        prev.map((d) => (d.id === updated.id ? updated : d))
      );
      markDirty();

      // Fetch boundary polygon for geographic fields when value changes
      const current = stateRef.current.dataFilters.find(
        (d) => d.id === updated.id
      );
      if (
        GEO_FIELDS.has(updated.field) &&
        updated.value &&
        (updated.value !== current?.value || updated.field !== current?.field)
      ) {
        // Clear stale boundary, then fetch new one
        setDataFilters((prev) =>
          prev.map((d) =>
            d.id === updated.id ? { ...d, boundary: undefined } : d
          )
        );
        geocodeBoundary(updated.value).then((boundary) => {
          setDataFilters((prev) =>
            prev.map((d) =>
              d.id === updated.id ? { ...d, boundary: boundary ?? null } : d
            )
          );
        });
      }
      // If field changed to non-geo, clear boundary
      if (
        !GEO_FIELDS.has(updated.field) &&
        current?.boundary !== undefined
      ) {
        setDataFilters((prev) =>
          prev.map((d) =>
            d.id === updated.id ? { ...d, boundary: undefined } : d
          )
        );
      }
    },
    [markDirty]
  );

  const deleteDataFilter = useCallback(
    (id: string) => {
      setDataFilters((prev) => prev.filter((d) => d.id !== id));
      markDirty();
    },
    [markDirty]
  );

  const reorderDataFilters = useCallback(
    (fromIndex: number, toIndex: number) => {
      setDataFilters((prev) => {
        const next = [...prev];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);
        return next;
      });
      markDirty();
    },
    [markDirty]
  );

  // --- Export ---
  const handleExport = useCallback(() => {
    const selected = fans.filter((f) => selectedIds.has(f._rowId));
    const csv = fansToCSV(selected, headers);

    // Build descriptive filename from active filters
    const parts: string[] = ["fans"];

    // Summarise circle filters
    for (const c of circles) {
      const tag = c.label.replace(/[^a-zA-Z0-9]+/g, "-").replace(/-+$/, "");
      parts.push(`${c.type === "include" ? "incl" : "excl"}-${tag}`);
    }

    // Summarise data filters (only those with a value)
    for (const df of dataFilters) {
      if (!df.value) continue;
      const field = df.field.replace(/Data$/, "").toLowerCase();
      const val = df.value.replace(/[^a-zA-Z0-9]+/g, "-").replace(/-+$/, "");
      parts.push(`${df.type === "include" ? "incl" : "excl"}-${field}-${val}`);
    }

    parts.push(String(selected.length));

    // Truncate to avoid excessively long filenames
    let filename = parts.join("_");
    if (filename.length > 200) {
      filename = filename.slice(0, 197) + "...";
    }

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [fans, selectedIds, headers, circles, dataFilters]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Fan Location Filter</h1>
        <UploadArea onFile={handleFile} fanCount={fans.length || null} />
      </header>
      <main className="app-main">
        <MapView
          fans={fans}
          selectedIds={selectedIds}
          circles={circles}
          dataFilters={dataFilters}
          onMapClick={handleMapClick}
        />
        <Sidebar
          fans={fans}
          headers={headers}
          circles={circles}
          dataFilters={dataFilters}
          onUpdateCircle={updateCircle}
          onDeleteCircle={deleteCircle}
          onAddCircle={addCircle}
          onAddDataFilter={addDataFilter}
          onUpdateDataFilter={updateDataFilter}
          onDeleteDataFilter={deleteDataFilter}
          onReorderDataFilters={reorderDataFilters}
          selectedCount={selectedIds.size}
          totalCount={fans.length}
          onExport={handleExport}
          dirty={dirty}
          onApply={applyFilters}
        />
      </main>
    </div>
  );
}

export default App;
