import { memo } from "react";
import type { FilterCircle } from "../types";

interface Props {
  circle: FilterCircle;
  onChange: (updated: FilterCircle) => void;
  onDelete: (id: string) => void;
}

const CircleControl = memo(function CircleControl({ circle, onChange, onDelete }: Props) {
  return (
    <div className={`circle-control ${circle.type}`}>
      <div className="circle-header">
        <input
          className="circle-label-input"
          value={circle.label}
          onChange={(e) => onChange({ ...circle, label: e.target.value })}
        />
        <button
          className="delete-btn"
          onClick={() => onDelete(circle.id)}
          title="Remove circle"
        >
          x
        </button>
      </div>

      <div className="circle-type-toggle">
        <button
          className={circle.type === "include" ? "active include" : ""}
          onClick={() => onChange({ ...circle, type: "include" })}
        >
          Include
        </button>
        <button
          className={circle.type === "exclude" ? "active exclude" : ""}
          onClick={() => onChange({ ...circle, type: "exclude" })}
        >
          Exclude
        </button>
      </div>

      <div className="circle-radius">
        <label>
          Radius: {circle.radiusKm} km
          <input
            type="range"
            min={1}
            max={500}
            value={circle.radiusKm}
            onChange={(e) =>
              onChange({ ...circle, radiusKm: Number(e.target.value) })
            }
          />
        </label>
        <input
          type="number"
          min={1}
          max={5000}
          value={circle.radiusKm}
          onChange={(e) =>
            onChange({
              ...circle,
              radiusKm: Math.max(1, Number(e.target.value)),
            })
          }
          className="radius-number"
        />
      </div>

      <div className="circle-coords">
        {circle.lat.toFixed(4)}, {circle.lng.toFixed(4)}
      </div>
    </div>
  );
});

export default CircleControl;
