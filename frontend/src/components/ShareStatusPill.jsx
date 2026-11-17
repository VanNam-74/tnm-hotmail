import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Pill } from "./ui";

export function useShareStatus(pollMs = 15000) {
    const [st, setSt] = useState(null);
    useEffect(() => {
        let alive = true;
        const load = () => api.shareStatus().then((r) => alive && setSt(r)).catch(() => alive && setSt((s) => s ?? { unavailable: true }));
        load();
        const t = setInterval(load, pollMs);
        return () => { alive = false; clearInterval(t); };
    }, [pollMs]);
    return st;
}

export function ShareStatusPill({ prefix = "Share", className, fallback }) {
    const st = useShareStatus();
    if (!st) return null;
    if (st.unavailable) return fallback ?? null;
    const addr = st.url ? st.url.replace(/^https?:\/\//, "") : `:${st.port}`;
    return (
        <Pill tone={st.running ? "ok" : "danger"} className={className}>
            <span title={st.running ? "Share server is running" : st.error || "Share server is not running"}>
                {prefix} · {st.running ? addr : `off · ${addr}`}
            </span>
        </Pill>
    );
}