import { memo, useState, useMemo, useRef, useEffect } from "react";
import type { DataFilter } from "../types";

interface Props {
  filter: DataFilter;
  index: number;
  fieldOptions: string[];
  uniqueValues: Map<string, string[]>;
  onChange: (updated: DataFilter) => void;
  onDelete: (id: string) => void;
  isDragging: boolean;
  isDragOver: boolean;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  onDragLeave: () => void;
}

const DataFilterControl = memo(function DataFilterControl({
  filter,
  index,
  fieldOptions,
  uniqueValues,
  onChange,
  onDelete,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onDragLeave,
}: Props) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(() => {
    const values = uniqueValues.get(filter.field) || [];
    if (!filter.value) return values.slice(0, 20);
    const lower = filter.value.toLowerCase();
    return values.filter((v) => v.toLowerCase().includes(lower)).slice(0, 20);
  }, [filter.field, filter.value, uniqueValues]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const className = [
    "data-filter-control",
    filter.type,
    isDragging ? "dragging" : "",
    isDragOver ? "drag-over" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={className}
      ref={wrapperRef}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={(e) => onDrop(e, index)}
      onDragLeave={onDragLeave}
    >
      <div className="circle-header">
        <span
          className="drag-handle"
          draggable
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = "move";
            onDragStart(index);
          }}
          onDragEnd={onDragEnd}
          title="Drag to reorder"
        >
          &#x2630;
        </span>
        <span className="filter-priority">{index + 1}</span>
        <select
          className="data-field-select"
          value={filter.field}
          onChange={(e) =>
            onChange({ ...filter, field: e.target.value, value: "" })
          }
        >
          {fieldOptions.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        <button
          className="delete-btn"
          onClick={() => onDelete(filter.id)}
          title="Remove filter"
        >
          x
        </button>
      </div>

      <div className="circle-type-toggle">
        <button
          className={filter.type === "include" ? "active include" : ""}
          onClick={() => onChange({ ...filter, type: "include" })}
        >
          Include
        </button>
        <button
          className={filter.type === "exclude" ? "active exclude" : ""}
          onClick={() => onChange({ ...filter, type: "exclude" })}
        >
          Exclude
        </button>
      </div>

      <div className="data-value-wrapper">
        <input
          className="data-value-input"
          type="text"
          placeholder={`Enter ${filter.field} value...`}
          value={filter.value}
          onChange={(e) => onChange({ ...filter, value: e.target.value })}
          onFocus={() => setShowSuggestions(true)}
        />
        {showSuggestions && suggestions.length > 0 && (
          <ul className="data-suggestions">
            {suggestions.map((s) => (
              <li
                key={s}
                onMouseDown={() => {
                  onChange({ ...filter, value: s });
                  setShowSuggestions(false);
                }}
              >
                {s}
              </li>
            ))}
          </ul>
        )}
      </div>

      {filter.value && (
        <div className="data-match-info">
          {filter.field} = &quot;{filter.value}&quot;
        </div>
      )}
    </div>
  );
});

export default DataFilterControl;
