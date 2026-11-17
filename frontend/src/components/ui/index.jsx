import { useState } from "react";
import { cn } from "../../lib/cn";

/* ---------------- Feedback ---------------- */

export function Spinner({ size = 20, className }) {
  const bars = Array.from({ length: 12 });
  const w = Math.max(1.5, size * 0.08);
  return (
    <span className={cn("ios-spin", className)} style={{ width: size, height: size }} role="status" aria-label="loading">
      {bars.map((_, i) => (
        <i key={i} style={{
          width: w, height: size * 0.28, marginLeft: -w / 2,
          transformOrigin: `center ${size / 2}px`, transform: `rotate(${i * 30}deg)`,
          opacity: ((i + 1) / 12) * 0.9 + 0.1, animationDelay: `${-(11 - i) * 0.075}s`,
        }} />
      ))}
    </span>
  );
}

export function ProgressSpinner({ done, total, label, size = 18 }) {
  return (
    <div className="flex items-center gap-3 text-sm text-muted">
      <Spinner size={size} />
      <span>{label ? `${label} ` : ""}{typeof done === "number" && typeof total === "number" ? <span className="font-mono">{done} / {total}</span> : null}</span>
    </div>
  );
}

export function ProgressBar({ value = 0, total = 0 }) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return <div className="tnm-progress"><i style={{ width: `${pct}%` }} /></div>;
}

export function Skeleton({ className }) { return <div className={cn("skeleton", className)} />; }

export function SkeletonRows({ rows = 6, cols = 5 }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-3">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={cn("h-9 flex-1", c === 0 && "max-w-[56px]")} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon = "inbox", title, children, action }) {
  return (
    <div className="tnm-empty">
      <span className="ring"><Icon name={icon} size={18} /></span>
      {title && <strong>{title}</strong>}
      {children && <span>{children}</span>}
      {action && <div className="mt-1.5">{action}</div>}
    </div>
  );
}

/* ---------------- Actions ---------------- */

// variant: primary | secondary (ghost outline) | soft | ghost (text) | danger | invert
export function Button({ variant = "primary", size = "md", icon, className, children, ...props }) {
  const v = {
    primary: "tnm-btn--primary",
    secondary: "tnm-btn--ghost",
    outline: "tnm-btn--ghost",
    soft: "tnm-btn--soft",
    ghost: "tnm-btn--text",
    danger: "tnm-btn--danger",
    invert: "tnm-btn--invert",
  }[variant];
  const s = { sm: "tnm-btn--sm", md: "", lg: "tnm-btn--lg" }[size];
  const iconOnly = !children && icon;
  return (
    <button type="button" className={cn("tnm-btn", v, s, iconOnly && "tnm-btn--icon", className)} {...props}>
      {icon && <Icon name={icon} size={size === "sm" ? 14 : 16} className="static" />}
      {children}
    </button>
  );
}

export function Segmented({ value, onChange, options }) {
  return (
    <div className="tnm-seg" role="tablist">
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value} onClick={() => onChange(o.value)}>
          {o.icon && <Icon name={o.icon} size={15} />}
          {o.label}
          {o.count !== undefined && <span className="n">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ---------------- Surfaces ---------------- */

export function Card({ className, ...props }) {
  return <div className={cn("tnm-panel", className)} {...props} />;
}
export function CardHead({ title, sub, step, children, className }) {
  return (
    <div className={cn("tnm-panel__head", className)}>
      <div className="min-w-0">
        <div className="tnm-panel__title">{step && <span className="tnm-step">{step}</span>}{title}</div>
        {sub && <div className="tnm-panel__sub mt-0.5">{sub}</div>}
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </div>
  );
}
export function CardBody({ className, ...props }) { return <div className={cn("tnm-panel__body", className)} {...props} />; }
export function CardFoot({ className, ...props }) { return <div className={cn("tnm-panel__foot", className)} {...props} />; }
export function InnerBox({ className, ...props }) {
  return <div className={cn("rounded-md border border-line bg-raised", className)} {...props} />;
}

/* ---------------- Forms ---------------- */

export function Input({ className, mono, icon, ...props }) {
  const el = <input className={cn("tnm-input", mono && "tnm-input--mono", className)} {...props} />;
  if (!icon) return el;
  return <div className="tnm-inputwrap"><Icon name={icon} size={16} className="tnm-ico" />{el}</div>;
}

export function Textarea({ className, mono, ...props }) {
  return <textarea className={cn("tnm-input", mono && "tnm-input--mono", className)} {...props} />;
}

export function Select({ className, children, ...props }) {
  return <select className={cn("tnm-input tnm-select", className)} {...props}>{children}</select>;
}

export function Field({ label, tag, badge, hint, children, className }) {
  return (
    <label className={cn("tnm-field", className)}>
      <span className="tnm-label">{label}{tag && <span className="tnm-tag">{tag}</span>}{badge}</span>
      {children}
      {hint && <span className="tnm-hint">{hint}</span>}
    </label>
  );
}

export function Checkbox({ indeterminate, ...props }) {
  return (
    <input type="checkbox" className="tnm-check"
      ref={(el) => { if (el) el.indeterminate = !!indeterminate; }} {...props} />
  );
}

export function CopyBox({ value, onCopied, mask = false, className, dark }) {
  const [shown, setShown] = useState(!mask);
  const display = shown || !value ? value : `${value.slice(0, 8)}${"·".repeat(6)}${value.slice(-4)}`;
  return (
    <div className={cn("tnm-copybox", className)}>
      <code title={shown ? value : undefined}>{display || "—"}</code>
      {mask && <Button size="sm" variant={dark ? "secondary" : "soft"} icon={shown ? "eyeOff" : "eye"} aria-label="Show"
        onClick={() => setShown((s) => !s)} />}
      <Button size="sm" variant={dark ? "invert" : "soft"} icon="copy" disabled={!value}
        onClick={() => { navigator.clipboard?.writeText(value); onCopied?.(); }}>Copy</Button>
    </div>
  );
}

/* ---------------- Status ---------------- */

export function statusTone(status) {
  const s = (status || "").toLowerCase();
  if (!s || s.includes("unknown")) return "";
  if (s.includes("active") || s.includes("live")) return "ok";
  if (s.includes("suspend") || s.includes("ter") || s.includes("die") || s.includes("lock") || s.includes("ban") || s.includes("fail")) return "danger";
  if (s.includes("pending") || s.includes("verif") || s.includes("review") || s.includes("audit") || s.includes("hold")) return "warn";
  return "";
}

export function StatusBadge({ status }) {
  const tone = statusTone(status);
  return <span className={cn("tnm-badge", tone && `tnm-badge--${tone}`)}>{status || "Unknown"}</span>;
}

export function Pill({ tone = "ok", children, className }) {
  return (
    <span className={cn("tnm-pill", className)}>
      {tone && <span className={cn("tnm-dot", tone !== "ok" && `tnm-dot--${tone}`)} style={tone === "none" ? { background: "var(--ink-subtle)", boxShadow: "none" } : undefined} />}
      {children}
    </span>
  );
}

export function IconTile({ name, size = 18, className }) {
  return <span className={cn("tnm-card__icon", className)}><Icon name={name} size={size} /></span>;
}

/* ---------------- Icons (Lucide-style, 24 grid) ---------------- */

const ICONS = {
  token: "M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2ZM13 5v2M13 11v2M13 17v2",
  filter: "M22 3H2l8 9.46V19l4 2v-8.54L22 3z",
  share: "M18 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM6 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM18 16a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98",
  gear: "M20 7h-9M14 17H5M17 14a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM7 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  back: "m15 18-6-6 6-6",
  right: "m9 18 6-6-6-6",
  arrow: "M7 7h10v10M7 17 17 7",
  arrowRight: "M5 12h14M13 6l6 6-6 6",
  bell: "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0",
  mail: "M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM22 7l-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7",
  chevronDown: "m6 9 6 6 6-6",
  copy: "M10 8h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2zM4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",
  sheet: "M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM3 9h18M3 15h18M9 3v18",
  download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
  receive: "M12 3v12M7 10l5 5 5-5M5 21h14",
  play: "M6 4l14 8-14 8z",
  check: "M20 6 9 17l-5-5",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-4.3-4.3",
  calendar: "M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM16 2v4M8 2v4M3 10h18",
  x: "M18 6 6 18M6 6l12 12",
  key: "M7.5 10a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11zM21 2l-9.6 9.6M15.5 7.5l3 3L22 7l-3-3",
  trash: "M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
  eye: "M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7ZM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  eyeOff: "M9.88 9.88a3 3 0 1 0 4.24 4.24M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61A13.53 13.53 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61M2 2l20 20",
  inbox: "M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z",
  rotate: "M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5",
  plug: "M12 22v-5M9 8V2M15 8V2M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8z",
  wifi: "M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  server: "M4 2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM4 14h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2zM6 6h.01M6 18h.01",
};

export function Icon({ name, size = 20, className, strokeWidth = 1.7 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={cn("shrink-0", className)} aria-hidden="true">
      <path d={ICONS[name] || ""} />
    </svg>
  );
}
