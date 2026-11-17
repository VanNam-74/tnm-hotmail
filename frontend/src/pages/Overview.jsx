import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";
import { Shell } from "../components/Shell";
import { Icon, Pill, statusTone } from "../components/ui";
import { NotificationBell } from "../components/NotificationBell";
import { ShareStatusPill } from "../components/ShareStatusPill";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function ModuleCard({ num, icon, title, desc, cta, stat, onClick, hero, chips, shortcut, className }) {
  return (
    <button type="button" onClick={onClick} className={`tnm-card ${hero ? "tnm-card--hero" : ""} ${className || ""}`}>
      <div className="tnm-card__top">
        <span className="tnm-card__icon"><Icon name={icon} size={18} /></span>
        <span className="tnm-eyebrow">{num}</span>
      </div>
      <div>
        <h3 className="tnm-card__title">{title}</h3>
        <p className="tnm-card__desc">{desc}</p>
      </div>
      {chips && <div className="tnm-chips">{chips.map((c) => <span key={c} className="tnm-chip">{c}</span>)}</div>}
      <div className="tnm-card__foot">
        {hero ? (
          <>
            <span className="tnm-kbd" style={{ background: "transparent", borderColor: "var(--hero-line)", color: "var(--hero-muted)" }}>{shortcut}</span>
            <span className="tnm-btn tnm-btn--invert">{cta}<Icon name="arrow" size={16} className="tnm-ico" /></span>
          </>
        ) : (
          <>
            <span className="tnm-stat">{stat}</span>
            <span className="flex items-center gap-2.5">
              <span className="text-[13px] font-medium">{cta}</span>
              <span className="tnm-card__arrow"><Icon name="arrow" size={16} /></span>
            </span>
          </>
        )}
      </div>
    </button>
  );
}

export default function Overview() {
  const nav = useNavigate();
  const { user, logout } = useAuth();
  const [menu, setMenu] = useState(false);
  const menuRef = useRef(null);
  const [stats, setStats] = useState({ total: null, statuses: [], keys: null, peers: null, net: null, sharePort: null });
  const initials = (user || "U").replace(/[^a-zA-Z]/g, "").slice(0, 2).toUpperCase() || "U";

  useEffect(() => {
    (async () => {
      const [p, k, pe, st] = await Promise.allSettled([api.profiles(1, 1), api.shareList(), api.peers(), api.settings()]);
      setStats({
        total: p.status === "fulfilled" ? p.value.total ?? 0 : null,
        statuses: p.status === "fulfilled" ? p.value.all_status || [] : [],
        keys: k.status === "fulfilled" ? (k.value.data || []).filter((s) => !s.Revoked).length : null,
        peers: pe.status === "fulfilled" ? (pe.value.data || []).length : null,
        net: st.status === "fulfilled" ? st.value.network : null,
        sharePort: st.status === "fulfilled" ? st.value.config?.share_port : null,
      });
    })();
  }, []);

  useEffect(() => {
    const h = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenu(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // Keyboard shortcuts: Ctrl+1..4
  useEffect(() => {
    const routes = { 1: "/app/gettoken", 2: "/app/filter", 3: "/app/share", 4: "/app/settings" };
    const h = (e) => { if ((e.ctrlKey || e.metaKey) && routes[e.key]) { e.preventDefault(); nav(routes[e.key]); } };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [nav]);

  // Group KDP statuses into ok / warn / danger / other
  const groups = { ok: 0, warn: 0, danger: 0, other: 0 };
  stats.statuses.forEach((s) => { groups[statusTone(s.status) || "other"] += s.count || 0; });

  return (
    <Shell>
      <header className="tnm-header">
        <div className="tnm-logo"><Icon name="mail" size={20} /></div>
        <div>
          <div className="tnm-brand__name">TNM Hotmail</div>
          <div className="tnm-eyebrow">Token · Filter · Share</div>
        </div>
        <div className="tnm-header__end">
          <ShareStatusPill className="hidden md:inline-flex"
            fallback={stats.net?.ip ? <Pill tone="none" className="hidden md:inline-flex">Share · {stats.net.ip}{stats.sharePort ? `:${stats.sharePort}` : ""}</Pill> : null} />
          <NotificationBell />
          <div className="relative" ref={menuRef}>
            <button type="button" onClick={() => setMenu((v) => !v)} className="tnm-btn tnm-btn--ghost" style={{ padding: "0 10px 0 4px", gap: 6 }}>
              <span className="tnm-avatar" style={{ width: 28, height: 28, fontSize: 11 }}>{initials}</span>
              <Icon name="chevronDown" size={14} />
            </button>
            {menu && (
              <div className="tnm-menu sign-out">
                <div className="truncate px-2.5 py-2 font-mono text-[12px] text-muted">{user}</div>
                <button type="button" onClick={async () => { await logout(); nav("/login"); }} className="flex items-center gap-2">
                  <Icon name="logout" size={15} /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="mb-5 mt-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="tnm-eyebrow">Workspace</div>
          <h1 className="mt-1.5 text-[30px] font-semibold leading-[44px] tracking-[-0.035em]">
            {greeting()}{user ? `, ${user}` : ""}.
          </h1>
        </div>
        {stats.statuses.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {groups.ok > 0 && <Pill tone="ok">{groups.ok} active</Pill>}
            {groups.warn > 0 && <Pill tone="warn">{groups.warn} review</Pill>}
            {groups.danger > 0 && <Pill tone="danger">{groups.danger} suspended / ter</Pill>}
            {groups.other > 0 && <Pill tone="none">{groups.other} unknown</Pill>}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.15fr_1fr_1fr]">
        <ModuleCard hero className="lg:row-span-2" num="01 — Capture" icon="token" title="Get Token" cta="Get Started" shortcut="Ctrl 1"
          chips={["Proxy", "Fingerprint", "Bypass", "OAuth"]} onClick={() => nav("/app/gettoken")}
          desc="Automated browser with proxy, fingerprint and bypass. Captures OAuth tokens, reads mail and classifies KDP status." />
        <ModuleCard num="02 — Inspect" icon="filter" title="Filter" cta="Explore" onClick={() => nav("/app/filter")}
          stat={stats.total !== null ? <><b>{stats.total}</b>accounts</> : "—"}
          desc="Search accounts by email or status and inspect mail. Reads directly from this machine's data." />
        <ModuleCard num="03 — Distribute" icon="share" title="Share" cta="Share Now" onClick={() => nav("/app/share")}
          stat={stats.keys !== null ? <><b>{stats.keys}</b>keys · <b className="ml-1">{stats.peers ?? 0}</b>sources</> : "—"}
          desc="Share read data with other machines on the same LAN, per account, each with its own key." />
        <button type="button" onClick={() => nav("/app/settings")} className="tnm-row lg:col-span-2">
          <span className="tnm-card__icon"><Icon name="gear" size={18} /></span>
          <div>
            <div className="tnm-row__title">Settings</div>
            <div className="tnm-row__desc">Manage hosts, ports and network.</div>
          </div>
          <div className="tnm-row__end">
            {stats.net?.ip && <span className="tnm-meta hidden sm:inline">UI :{window.location.port || "80"} · Share :{stats.sharePort ?? "?"}</span>}
            <span className="tnm-kbd">Ctrl 4</span>
            <Icon name="right" size={18} className="tnm-row__chev" />
          </div>
        </button>
      </div>
    </Shell>
  );
}