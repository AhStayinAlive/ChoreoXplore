import { useState } from "react";

/**
 * ToggleButton — pill-like toggle button
 * Props:
 *  label: string | node
 *  selected?: boolean      // controlled
 *  defaultSelected?: bool  // uncontrolled
 *  onChange?(bool)
 *  icon?: ReactNode        // optional leading icon
 *  className?: string      // optional additional classes
 */
export default function ToggleButton({
  label,
  selected,
  defaultSelected = false,
  onChange,
  icon,
  className, // Add className to props
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
      className={`kw-toggle ${className || ''}${isOn ? ' is-on' : ''}`.trim()}
      onClick={toggle}
    >
      {icon && <span className="kw-icon">{icon}</span>}
      {label}
    </button>
  );
}