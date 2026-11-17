import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button, Icon } from "./ui";
import { cn } from "../lib/cn";

const fmt = (d) => d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` : "";
const parse = (s) => { if (!s) return null; const [y, m, dd] = s.split("-").map(Number); return new Date(y, m - 1, dd); };
const sameDay = (a, b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);
const DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const PANEL_W = 700;

function matrix(base) {
    const first = new Date(base.getFullYear(), base.getMonth(), 1);
    const start = new Date(first); start.setDate(1 - first.getDay());
    const weeks = [];
    for (let w = 0; w < 6; w++) { const row = []; for (let i = 0; i < 7; i++) { const d = new Date(start); d.setDate(start.getDate() + w * 7 + i); row.push(d); } weeks.push(row); }
    return weeks;
}

const presets = [
    ["Today", () => { const t = new Date(); return [t, t]; }],
    ["Yesterday", () => { const t = new Date(); t.setDate(t.getDate() - 1); return [t, t]; }],
    ["Last 7 Days", () => { const e = new Date(), s = new Date(); s.setDate(s.getDate() - 6); return [s, e]; }],
    ["Last 15 Days", () => { const e = new Date(), s = new Date(); s.setDate(s.getDate() - 14); return [s, e]; }],
    ["Last 30 Days", () => { const e = new Date(), s = new Date(); s.setDate(s.getDate() - 29); return [s, e]; }],
    ["This Month", () => { const n = new Date(); return [new Date(n.getFullYear(), n.getMonth(), 1), new Date(n.getFullYear(), n.getMonth() + 1, 0)]; }],
    ["Last Month", () => { const n = new Date(); return [new Date(n.getFullYear(), n.getMonth() - 1, 1), new Date(n.getFullYear(), n.getMonth(), 0)]; }],
];

export function DateRangePicker({ value, onApply }) {
    const [open, setOpen] = useState(false);
    const [from, setFrom] = useState(parse(value?.from));
    const [to, setTo] = useState(parse(value?.to));
    const [view, setView] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const [pos, setPos] = useState({ top: 0, left: 0 });
    const btnRef = useRef(null);
    const panelRef = useRef(null);

    useEffect(() => { setFrom(parse(value?.from)); setTo(parse(value?.to)); }, [value?.from, value?.to]);
    useEffect(() => {
        const h = (e) => {
            if (panelRef.current && panelRef.current.contains(e.target)) return;
            if (btnRef.current && btnRef.current.contains(e.target)) return;
            setOpen(false);
        };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, []);

    function openPanel() {
        const r = btnRef.current.getBoundingClientRect();
        let left = r.left;
        if (left + PANEL_W > window.innerWidth - 8) left = window.innerWidth - PANEL_W - 8;
        setPos({ top: r.bottom + 6, left: Math.max(8, left) });
        setOpen(true);
    }

    function pick(d) {
        if (!from || (from && to)) { setFrom(d); setTo(null); }
        else if (d < from) { setTo(from); setFrom(d); }
        else setTo(d);
    }
    const inRange = (d) => from && to && d >= from && d <= to;
    const label = (from || to) ? `${fmt(from) || "…"} → ${fmt(to) || "…"}` : "Select date range";

    function Month({ base }) {
        return (
            <div className="w-[248px]">
                <div className="mb-2 flex items-center justify-between px-1">
                    <button type="button" onClick={() => setView(addMonths(view, -1))} className="grid h-7 w-7 place-items-center rounded-sm text-muted hover:bg-hover hover:text-ink"><Icon name="back" size={14} /></button>
                    <div className="text-[13px] font-semibold">{base.toLocaleString("en", { month: "long", year: "numeric" })}</div>
                    <button type="button" onClick={() => setView(addMonths(view, 1))} className="grid h-7 w-7 place-items-center rounded-sm text-muted hover:bg-hover hover:text-ink"><Icon name="right" size={14} /></button>
                </div>
                <div className="grid grid-cols-7 text-center font-mono text-[11px] uppercase text-subtle">{DOW.map((d) => <div key={d} className="py-1">{d}</div>)}</div>
                {matrix(base).map((week, wi) => (
                    <div key={wi} className="grid grid-cols-7">
                        {week.map((d, di) => {
                            const out = d.getMonth() !== base.getMonth();
                            const edge = sameDay(d, from) || sameDay(d, to);
                            return (
                                <button type="button" key={di} onClick={() => pick(d)}
                                    className={cn("tnm-day", out && "out", inRange(d) && "in", edge && "edge")}>
                                    {d.getDate()}
                                </button>
                            );
                        })}
                    </div>
                ))}
            </div>
        );
    }

    return (
        <>
            <button type="button" ref={btnRef} onClick={() => (open ? setOpen(false) : openPanel())}
                className="tnm-input flex items-center gap-2 text-left">
                <Icon name="calendar" size={16} className="text-subtle" />
                <span className={cn("truncate", !(from || to) && "text-subtle", (from || to) && "font-mono text-[13px]")}>{label}</span>
            </button>

            {open && createPortal(
                <div ref={panelRef} className="tnm-popover fixed p-4"
                    style={{ top: pos.top, left: pos.left, width: PANEL_W, zIndex: 1000 }}>
                    <div className="flex gap-4">
                        <div className="w-36 shrink-0 space-y-0.5 border-r border-line pr-3">
                            {presets.map(([name, fn]) => (
                                <button key={name} onClick={() => { const [s, e] = fn(); setFrom(s); setTo(e); setView(new Date(s.getFullYear(), s.getMonth(), 1)); }}
                                    type="button" className="block w-full rounded-sm px-3 py-1.5 text-left text-[13px] text-muted hover:bg-hover hover:text-ink">{name}</button>
                            ))}
                        </div>
                        <div className="flex gap-4"><Month base={view} /><Month base={addMonths(view, 1)} /></div>
                    </div>
                    <div className="mt-3 flex justify-end gap-2 border-t border-line pt-3">
                        <Button variant="secondary" size="sm" onClick={() => { setFrom(null); setTo(null); }}>Clear</Button>
                        <Button size="sm" onClick={() => { onApply({ from: fmt(from), to: fmt(to) }); setOpen(false); }}>Apply</Button>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}