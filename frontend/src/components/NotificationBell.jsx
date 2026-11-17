import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { Icon, Spinner } from "./ui";
import { cn } from "../lib/cn";

const POLL_MS = 20000;
const KIND_TONE = { run_done: "ok", import_done: "ok", recheck_done: "ok", share_pull: "none", status_change: "danger", error: "danger" };

function ago(s) {
    if (!s) return "";
    const t = new Date(String(s).replace(" ", "T"));
    const m = Math.round((Date.now() - t.getTime()) / 60000);
    if (Number.isNaN(m)) return s;
    if (m < 1) return "just now";
    if (m < 60) return `${m} min ago`;
    if (m < 1440) return `${Math.round(m / 60)} h ago`;
    return String(s).slice(0, 10);
}

export function NotificationBell() {
    const [open, setOpen] = useState(false);
    const [data, setData] = useState({ unread: 0, data: [] });
    const [loading, setLoading] = useState(false);
    const ref = useRef(null);

    const load = useCallback(async () => {
        try { setData(await api.notifications(0, 20)); } catch { /* backend chưa có API → bỏ qua */ }
    }, []);

    useEffect(() => {
        load();
        const t = setInterval(load, POLL_MS);
        return () => clearInterval(t);
    }, [load]);

    useEffect(() => {
        const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, []);

    async function toggle() {
        const next = !open;
        setOpen(next);
        if (next) { setLoading(true); await load(); setLoading(false); }
    }

    async function markAll() {
        try { await api.notificationsRead([], true); await load(); } catch { /* ignore */ }
    }

    async function markOne(n) {
        if (n.Is_read) return;
        try { await api.notificationsRead([n.ID]); await load(); } catch { /* ignore */ }
    }

    return (
        <div className="relative" ref={ref}>
            <button type="button" className="tnm-iconbtn" aria-label="Notifications" onClick={toggle}>
                <Icon name="bell" size={17} />
                {data.unread > 0 && <span className="badge" />}
            </button>
            {open && (
                <div className="tnm-menu !w-[340px] !p-0">
                    <div className="flex items-center justify-between border-b border-line px-4 py-3">
                        <span className="text-[14px] font-semibold">Notifications</span>
                        {data.unread > 0
                            ? <button type="button" className="!w-auto !p-0 font-mono text-[12px] text-muted hover:!bg-transparent hover:text-ink" onClick={markAll}>Mark all read</button>
                            : <span className="tnm-meta">All caught up</span>}
                    </div>
                    <div className="max-h-[360px] overflow-auto p-1.5">
                        {loading && data.data.length === 0 ? (
                            <div className="flex justify-center p-6"><Spinner size={18} /></div>
                        ) : data.data.length === 0 ? (
                            <div className="p-6 text-center text-[13px] text-muted">Chưa có thông báo nào.</div>
                        ) : data.data.map((n) => {
                            const tone = KIND_TONE[n.Kind] || "none";
                            return (
                                <button type="button" key={n.ID} onClick={() => markOne(n)}
                                    className={cn("!flex items-start gap-3 !rounded-md !px-3 !py-2.5", !n.Is_read && "bg-raised")}>
                                    <span className={cn("tnm-dot mt-1.5 shrink-0", tone === "danger" && "tnm-dot--danger")}
                                        style={tone === "none" || n.Is_read ? { background: "var(--ink-subtle)", boxShadow: "none" } : undefined} />
                                    <span className="min-w-0 flex-1">
                                        <span className={cn("block truncate text-[13px]", !n.Is_read && "font-semibold")}>{n.Title}</span>
                                        {n.Message && <span className="block truncate text-[12px] text-muted">{n.Message}</span>}
                                        <span className="mt-0.5 block font-mono text-[11px] text-subtle">{ago(n.Created_at)}</span>
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}