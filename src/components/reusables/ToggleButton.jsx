import { useState } from "react";

/**
 * ToggleButton — pill-like toggle button
 * Props:
 *  label: string | node
 *  selected?: boolean      // controlled
 *  defaultSelected?: bool  // uncontrolled
 *  onChange?(bool)
 *  icon?: ReactNode        // optional leading icon
 */
export default function ToggleButton({
  label,
  selected,
  defaultSelected = false,
  onChange,
  icon,
}) {
  const [internal, setInternal] = useState(defaultSelected);
  const isOn = selected !== undefined ? selected : internal;

  const toggle = () => {
    const next = !isOn;
    setInternal(next);
    onChange?.(next);
  };

  return (
    <button
      type="button"
      className={`kw-toggle${isOn ? " is-on" : ""}`}
      onClick={toggle}
    >
      {icon && <span className="kw-icon">{icon}</span>}
      {label}
    </button>
  );
}
