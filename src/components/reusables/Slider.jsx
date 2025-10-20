import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Slider (single-thumb, no tooltip by default)
 * New props:
 *  marks=[{value:number,label?:string}]
 *  showMarks=false
 *  showMarkLabels=false
 *  snapToMarks=false        // when true, ignore step & snap to marks
 *  thickness=8              // px track thickness
 *  radius=999               // px track radius
 *  defaultValue             // used for double-click reset
 *  valueText=(v)=>string    // aria-valuetext
 */
export default function Slider({
  id,
  label,
  value,
  onChange,
  onChangeEnd,
  min = 0,
  max = 100,
  step = 1,
  orientation = "horizontal",
  disabled = false,
  marks = [],
  showMarks = false,
  showMarkLabels = false,
  snapToMarks = false,
  thickness = 8,
  radius = 999,
  defaultValue,
  valueText = (v) => String(v),
  format = (v) => v,
}) {
  const trackRef = useRef(null);
  const [isHover, setHover] = useState(false);
  const [isFocus, setFocus] = useState(false);
  const isVertical = orientation === "vertical";

  const clamp = (v) => Math.min(max, Math.max(min, v));

  const nearestMark = useCallback(
    (v) => {
      if (!marks?.length) return v;
      let best = marks[0].value;
      let d = Math.abs(v - best);
      for (const m of marks) {
        const dd = Math.abs(v - m.value);
        if (dd < d) {
          d = dd; best = m.value;
        }
      }
      return best;
    },
    [marks]
  );

  const snap = useCallback(
    (v) => {
      if (snapToMarks && marks?.length) return nearestMark(v);
      // step snapping
      return Math.round((v - min) / step) * step + min;
    },
    [snapToMarks, marks, min, step, nearestMark]
  );

  const pct = useMemo(() => ((value - min) / (max - min)) * 100, [value, min, max]);

  const setFromPointer = useCallback(
    (clientX, clientY, shouldSnap = true) => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      let ratio;
      if (isVertical) ratio = 1 - (clientY - rect.top) / rect.height;
      else ratio = (clientX - rect.left) / rect.width;
      const raw = min + ratio * (max - min);
      // Only snap if explicitly requested (on release), otherwise allow smooth dragging
      const next = shouldSnap ? clamp(snap(raw)) : clamp(raw);
      onChange?.(next);
    },
    [isVertical, min, max, snap, onChange]
  );

  // pointer interactions
  useEffect(() => {
    const move = (e) => setFromPointer(e.clientX, e.clientY, false); // No snap during drag
    const up = (e) => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", up);
      // Snap to step on release
      setFromPointer(e.clientX, e.clientY, true);
      onChangeEnd?.(value);
    };
    const down = (e) => {
      if (disabled) return;
      e.preventDefault();
      setFromPointer(e.clientX, e.clientY, true); // Snap on initial click
      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", up, { once: true });
    };
    const el = trackRef.current;
    el?.addEventListener("pointerdown", down);
    return () => el?.removeEventListener("pointerdown", down);
  }, [disabled, setFromPointer, onChangeEnd, value]);

  // keyboard interactions
  const onKeyDown = (e) => {
    if (disabled) return;
    const big = Math.max(step * 5, (max - min) / 10);
    let next = value;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowUp":   next = value + step; break;
      case "ArrowLeft":
      case "ArrowDown": next = value - step; break;
      case "PageUp":    next = value + big;  break;
      case "PageDown":  next = value - big;  break;
      case "Home":      next = min; break;
      case "End":       next = max; break;
      default: return;
    }
    e.preventDefault();
    onChange?.(clamp(snap(next)));
  };

  // double-click to reset
  const onDoubleClick = () => {
    if (defaultValue == null) return;
    onChange?.(clamp(snap(defaultValue)));
    onChangeEnd?.(clamp(snap(defaultValue)));
  };

  return (
    <div className={`sl-wrap ${isVertical ? "sl-wrap--v" : ""}`}>
      {label && (
        <div className="sl-head">
          <label htmlFor={id} className="ui-label">{label}</label>
            <span className="sl-value">{format(value)}</span>
        </div>
      )}

      <div
        className={`sl ${isVertical ? "sl--v" : "sl--h"}${disabled ? " sl--disabled" : ""}`}
        data-thickness={thickness}
        data-radius={radius}
      >
        <div
          ref={trackRef}
          className="sl-track"
          role="slider"
          id={id}
          tabIndex={disabled ? -1 : 0}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-valuetext={valueText(value)}
          aria-disabled={disabled}
          aria-orientation={orientation}
          onKeyDown={onKeyDown}
          onPointerEnter={() => setHover(true)}
          onPointerLeave={() => setHover(false)}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          onDoubleClick={onDoubleClick}
        >
          <div
            className="sl-fill"
            style={isVertical ? { height: `${pct}%` } : { width: `${pct}%` }}
          />
          <div
            className={`sl-thumb${(isHover || isFocus) ? " is-active" : ""}`}
            style={
              isVertical
                ? { bottom: `${pct}%`, transform: "translate(-50%, 50%)" }
                : { left: `${pct}%`,   transform: "translate(-50%, -50%)" }
            }
          />
          {showMarks && marks
            .filter(m => m.value !== min && m.value !== max) // skip edges
            .map((m, i) => {
            const mpct = ((m.value - min) / (max - min)) * 100;
            return (
                <div key={i} className="sl-mark-wrap" style={isVertical ? { bottom: `${mpct}%` } : { left: `${mpct}%` }}>
                    <div className="sl-mark" />
                        {showMarkLabels && !isVertical && (
                        <div className="sl-mark-label">{m.label ?? m.value}</div>
                        )}
                    </div>
                );
            })}
        </div>
      </div>
    </div>
  );
}
