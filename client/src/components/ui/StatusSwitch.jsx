export default function StatusSwitch({ checked, onChange, disabled, labelOn = "Active", labelOff = "Inactive" }) {
  return (
    <button
      type="button"
      className={`status-switch${checked ? " on" : ""}${disabled ? " disabled" : ""}`}
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      title={disabled ? "Protected account" : checked ? labelOn : labelOff}
      onClick={() => {
        if (!disabled) onChange(!checked);
      }}
    >
      <span className="status-switch-knob" />
      <span className="status-switch-label">{checked ? labelOn : labelOff}</span>
    </button>
  );
}
