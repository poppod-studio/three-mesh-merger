const MODES = [
  { id: "translate" as const, label: "Move", shortcut: "W", icon: "⊹" },
  { id: "rotate" as const, label: "Rotate", shortcut: "E", icon: "↻" },
  { id: "scale" as const, label: "Scale", shortcut: "R", icon: "⊡" },
];

interface ViewportToolbarProps {
  mode: "translate" | "rotate" | "scale";
  onChange: (mode: "translate" | "rotate" | "scale") => void;
  disabled?: boolean;
  visible?: boolean;
}

export function ViewportToolbar({
  mode,
  onChange,
  disabled,
  visible,
}: ViewportToolbarProps) {
  if (!visible) return null;
  return (
    <div className="viewport-toolbar">
      {MODES.map(({ id, label, shortcut, icon }) => (
        <button
          key={id}
          className={`vp-tool-btn ${mode === id ? "active" : ""}`}
          onClick={() => onChange(id)}
          disabled={disabled}
          title={`${label} (${shortcut})`}
        >
          <span className="vp-tool-icon">{icon}</span>
          <span className="vp-tool-label">{label}</span>
          <kbd className="vp-kbd">{shortcut}</kbd>
        </button>
      ))}
    </div>
  );
}
