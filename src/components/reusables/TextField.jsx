import { useId, useMemo, useRef, useLayoutEffect } from "react";

export default function TextField({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  hint,
  error,
  disabled,
  required,
  prefix,
  suffix,
  size = "md",
  fullWidth = true,
  clearable = false,
  onClear,
  maxLength,
  showCount = false,
  multiline = false,
  rows = 1,              // start small for one-liner
  minRows = 1,           // new: minimum height
  maxRows = 5,           // new: maximum before scroll
  inputProps = {},
  onEnter,
  onEscape,
}) {
  const autoId = useId();
  const fieldId = id || `tf-${autoId}`;
  const ref = useRef(null);

  useLayoutEffect(() => {
    if (multiline && ref.current) {
      const el = ref.current;
      el.style.height = "auto";
      const lineHeight = 20; // fallback line-height px
      const maxHeight = lineHeight * maxRows;
      el.style.height = Math.min(el.scrollHeight, maxHeight) + "px";
    }
  }, [value, multiline, maxRows]);

  const describedBy = useMemo(() => {
    const ids = [];
    if (hint) ids.push(`${fieldId}-hint`);
    if (error) ids.push(`${fieldId}-err`);
    if (showCount && maxLength) ids.push(`${fieldId}-cnt`);
    return ids.join(" ") || undefined;
  }, [hint, error, showCount, maxLength, fieldId]);

  const classes =
    "tf " +
    (disabled ? " tf--disabled" : "") +
    (error ? " tf--error" : "") +
    (size ? ` tf--${size}` : "") +
    (fullWidth ? " tf--full" : "");

  const handleKeyDown = (e) => {
    if (multiline) return;
    if (e.key === "Enter") onEnter?.();
    if (e.key === "Escape") onEscape?.();
  };

  const counter = showCount && typeof maxLength === "number"
    ? `${value?.length ?? 0}/${maxLength}`
    : null;

  return (
    <div className="tf-wrap">
      {label && (
        <label htmlFor={fieldId} className="ui-label">
          {label}
          {required ? " *" : null}
        </label>
      )}

      <div className={classes}>
        {prefix && <span className="tf__affix tf__prefix">{prefix}</span>}

        {multiline ? (
          <textarea
            id={fieldId}
            ref={ref}
            rows={minRows}
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={describedBy}
            maxLength={maxLength}
            style={{ resize: "none", overflow: "auto" }}
            {...inputProps}
          />
        ) : (
          <input
            id={fieldId}
            type={type}
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={describedBy}
            maxLength={maxLength}
            onKeyDown={handleKeyDown}
            {...inputProps}
          />
        )}

        {clearable && value && (
          <button
            type="button"
            className="tf__affix tf__clear"
            aria-label="Clear"
            onClick={() => {
              onChange?.("");
              onClear?.();
            }}
          >
            ×
          </button>
        )}

        {suffix && <span className="tf__affix tf__suffix">{suffix}</span>}
      </div>

      {hint && (
        <small id={`${fieldId}-hint`} className="ui-hint">{hint}</small>
      )}
      {error && (
        <small id={`${fieldId}-err`} className="ui-error">{error}</small>
      )}
      {counter && (
        <small id={`${fieldId}-cnt`} className="ui-hint" style={{ float: "right" }}>
          {counter}
        </small>
      )}
    </div>
  );
}
