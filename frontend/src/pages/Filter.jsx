import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Shell, BackBar, PageHead } from "../components/Shell";
import { Card, CardFoot, Button, Textarea, Select, Field, StatusBadge, SkeletonRows, Spinner, Icon, Checkbox, Segmented, EmptyState } from "../components/ui";
import { cn } from "../lib/cn";
import { api } from "../lib/api";
import { useToast } from "../lib/toast";
import { DateRangePicker } from "../components/DateRangePicker";

const LIMIT = 25;
const EMPTY = { email: "", accId: "", status: "", dateFrom: "", dateTo: "" };

const isLive = (s) => (s || "").toLowerCase().includes("active");
const dieDate = (r) => isLive(r.Status) ? "—" : ((r.Read_time || "").slice(0, 10) || "—");
const splitList = (s) => s.split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean);
const hasFilter = (f) => !!(f.accId || f.email || f.status || f.dateFrom || f.dateTo);

function toCSV(rows) {
  const head = ["ID", "Email", "Status", "Source", "Date die", "Read"];
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = rows.map((r) => [r.Ext_id ?? r.ID, r.Email, r.Status, r.Source === "shared" ? "Shared" : "Local", dieDate(r), (r.Read_time || "").slice(0, 10)].map(esc).join(","));
  return [head.join(","), ...lines].join("\n");
}
function downloadBlob(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function downloadCSV(rows, name) {
  downloadBlob(new Blob(["\ufeff" + toCSV(rows)], { type: "text/csv;charset=utf-8" }), name);
}
const toPayload = (f) => ({
  emails: f.email ? splitList(f.email) : null,
  account_ids: f.accId ? splitList(f.accId) : null,
  status: f.status,
  date_range: { from: f.dateFrom || null, to: f.dateTo || null },
});

export default function Filter() {
  const nav = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statuses, setStatuses] = useState([]);
  const [form, setForm] = useState(EMPTY);       // what the user is typing
  const [applied, setApplied] = useState(EMPTY); // what the table currently shows
  const [sel, setSel] = useState(new Map());     // ID -> row (kept across pages)
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [rechecking, setRechecking] = useState(false);


  async function exportAll() {
    setExporting(true);
    try {
      const { blob, name } = await api.filterExport(toPayload(applied));
      downloadBlob(blob, name);
      toast.ok("Exported", `${total} accounts`);
    } catch (e) {
      downloadCSV(rows, `tnm-accounts-page${page}.csv`);
      toast.info("Exported current page only", e.message);
    } finally { setExporting(false); }
  }

  async function recheck() {
    setRechecking(true);
    try {
      const r = await api.gettokenRecheck(Array.from(sel.keys()));
      if (r.ok === false) { toast.err("Cannot re-check", r.message); return; }
      toast.info("Re-check started", r.message);
      setSel(new Map());
      nav("/app/gettoken");
    } catch (e) {
      toast.err("Cannot re-check", e.message);
    } finally { setRechecking(false); }
  }

  const load = useCallback(async (p = 1, f = form) => {
    setLoading(true);
    try {
      const payload = toPayload(f);
      const r = hasFilter(f) ? await api.search(payload, p, LIMIT) : await api.profiles(p, LIMIT);
      setRows(r.data || []);
      setTotal(r.total || 0);
      if (r.all_status) setStatuses(r.all_status);
      setPage(p);
      setApplied(f);
    } catch (e) {
      toast.err("Cannot load", e.message);
    } finally {
      setLoading(false);
    }
  }, [form, toast]);

  useEffect(() => { load(1, EMPTY); /* eslint-disable-next-line */ }, []);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }
  function apply(next = form) { setForm(next); load(1, next); }
  function reset() { apply(EMPTY); }
  function clearOne(keys) { const next = { ...applied }; keys.forEach((k) => { next[k] = ""; }); apply(next); }

  async function openDetail(id) {
    setDetailLoading(true);
    setDetail({ open: true, data: null });
    try { setDetail({ open: true, data: await api.detail(id) }); }
    catch (e) { toast.err("Cannot load detail", e.message); setDetail(null); }
    finally { setDetailLoading(false); }
  }

  function toggle(r) {
    const next = new Map(sel);
    next.has(r.ID) ? next.delete(r.ID) : next.set(r.ID, r);
    setSel(next);
  }
  const pageAllSelected = rows.length > 0 && rows.every((r) => sel.has(r.ID));
  const pageSomeSelected = rows.some((r) => sel.has(r.ID));
  function toggleAll() {
    const next = new Map(sel);
    if (pageAllSelected) rows.forEach((r) => next.delete(r.ID));
    else rows.forEach((r) => next.set(r.ID, r));
    setSel(next);
  }

  const pages = Math.max(1, Math.ceil(total / LIMIT));
  const from = total === 0 ? 0 : (page - 1) * LIMIT + 1;
  const to = Math.min(page * LIMIT, total);
  const statusTotal = statuses.reduce((a, s) => a + (s.count || 0), 0);

  const chips = [];
  if (applied.email) chips.push({ k: ["email"], label: "Email", value: `${splitList(applied.email).length} entered` });
  if (applied.accId) chips.push({ k: ["accId"], label: "ID", value: `${splitList(applied.accId).length} entered` });
  if (applied.dateFrom || applied.dateTo) chips.push({ k: ["dateFrom", "dateTo"], label: "Date die", value: `${applied.dateFrom || "…"} → ${applied.dateTo || "…"}` });

  return (
    <Shell>
      <BackBar eyebrow="02 — Inspect" />
      <PageHead title="Filter" desc="Tìm theo email, import ID, ngày die hoặc trạng thái. Đọc trực tiếp dữ liệu trên máy này.">
        <Button variant="secondary" icon="download" disabled={total === 0 || exporting} onClick={exportAll}>
          {exporting ? "Exporting…" : `Export CSV${total ? ` · ${total}` : ""}`}
        </Button>
      </PageHead>

      {/* Filter tray */}
      <Card className="p-4">
        <form className="grid grid-cols-1 items-end gap-3 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr_.95fr_.8fr_auto]"
          onSubmit={(e) => { e.preventDefault(); apply(); }}>
          <Field label="Email">
            <Textarea rows={1} value={form.email} placeholder="Một hoặc nhiều email…" className="max-h-40"
              onChange={(e) => set("email", e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) apply(); }} />
          </Field>
          <Field label="Import ID">
            <Textarea mono rows={1} value={form.accId} placeholder="73800, 73833…" className="max-h-40"
              onChange={(e) => set("accId", e.target.value)} />
          </Field>
          <Field label="Date die">
            <DateRangePicker value={{ from: form.dateFrom, to: form.dateTo }}
              onApply={(r) => setForm((f) => ({ ...f, dateFrom: r.from, dateTo: r.to }))} />
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={(e) => set("status", e.target.value)}>
              <option value="">All statuses</option>
              {statuses.map((s) => <option key={s.status} value={s.status}>{s.status} ({s.count})</option>)}
            </Select>
          </Field>
          <div className="flex gap-2">
            <Button variant="secondary" icon="rotate" aria-label="Reset" title="Reset" onClick={reset} style={{ height: 40, width: 40 }} />
            <Button type="submit" icon="filter" style={{ height: 40 }}>Apply</Button>
          </div>
        </form>
      </Card>

      {/* Chips + status segmented */}
      <div className="mb-3 mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="tnm-chipbar">
          {chips.map((c) => (
            <span key={c.label} className="tnm-fchip"><b>{c.label}</b> {c.value}
              <button type="button" className="x" aria-label={`Clear ${c.label}`} onClick={() => clearOne(c.k)}><Icon name="x" size={11} strokeWidth={2.4} /></button>
            </span>
          ))}
          <span className="tnm-meta">{total} accounts</span>
        </div>
        {statuses.length > 0 && (
          <div className="max-w-full overflow-x-auto">
            <Segmented value={applied.status}
              onChange={(v) => apply({ ...applied, status: v })}
              options={[{ value: "", label: "All", count: statusTotal }, ...statuses.map((s) => ({ value: s.status, label: s.status, count: s.count }))]} />
          </div>
        )}
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-6"><SkeletonRows rows={8} cols={6} /></div>
        ) : rows.length === 0 ? (
          <div className="p-6">
            <EmptyState icon="inbox" title="Không có account nào khớp"
              action={hasFilter(applied) && <Button size="sm" variant="secondary" icon="rotate" onClick={reset}>Reset filters</Button>}>
              {hasFilter(applied) ? "Thử bỏ bớt bộ lọc hoặc nhập email khác." : "Chưa có dữ liệu trên máy này. Chạy Get Token hoặc Pull từ Share."}
            </EmptyState>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="tnm-table">
              <thead>
                <tr>
                  <th className="c-check"><Checkbox checked={pageAllSelected} indeterminate={!pageAllSelected && pageSomeSelected} onChange={toggleAll} aria-label="Select page" /></th>
                  <th>ID</th><th>Email</th><th>Status</th><th>Source</th><th>Date die</th><th>Read</th><th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.ID} className={cn(sel.has(r.ID) && "is-selected")}>
                    <td className="c-check"><Checkbox checked={sel.has(r.ID)} onChange={() => toggle(r)} aria-label={`Select ${r.Email}`} /></td>
                    <td className="c-id">{r.Ext_id ?? r.ID}</td>
                    <td className="c-email">{r.Email}</td>
                    <td><StatusBadge status={r.Status} /></td>
                    <td className="c-mono">{r.Source === "shared" ? "Shared" : "Local"}</td>
                    <td className="c-mono">{dieDate(r)}</td>
                    <td className="c-mono">{(r.Read_time || "").slice(0, 10) || "—"}</td>
                    <td className="c-end">
                      <Button size="sm" variant="secondary" className="row-action" onClick={() => openDetail(r.ID)}>
                        Detail <Icon name="arrow" size={14} className="tnm-ico" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && total > 0 && (
          <CardFoot>
            <span className="tnm-meta">Showing {from}–{to} of {total}</span>
            <div className="tnm-pager">
              <button type="button" disabled={page <= 1} onClick={() => load(page - 1, applied)} aria-label="Previous"><Icon name="back" size={14} /></button>
              <button type="button" aria-current="page">{page}</button>
              <span className="px-1 font-mono text-[12px] text-muted">/ {pages}</span>
              <button type="button" disabled={page >= pages} onClick={() => load(page + 1, applied)} aria-label="Next"><Icon name="right" size={14} /></button>
            </div>
          </CardFoot>
        )}
      </Card>

      {/* Bulk action bar */}
      {sel.size > 0 && (
        <div className="pointer-events-none sticky bottom-6 mt-4 flex justify-center">
          <div className="tnm-bulkbar pointer-events-auto">
            {sel.size} selected
            <span className="sep" />
            <Button size="sm" variant="secondary" icon="share"
              onClick={() => nav("/app/share", { state: { emails: Array.from(sel.values()).map((r) => r.Email) } })}>Share</Button>
            <Button size="sm" variant="secondary" icon="download"
              onClick={() => downloadCSV(Array.from(sel.values()), `tnm-accounts-selected.csv`)}>Export</Button>
            <Button size="sm" variant="secondary" icon="x" onClick={() => setSel(new Map())}>Clear</Button>
            <Button size="sm" variant="invert" icon="rotate" disabled={rechecking} onClick={recheck}>
              {rechecking ? "Queuing…" : "Re-check"}
            </Button>
          </div>
        </div>
      )}

      {detail?.open && <DetailModal loading={detailLoading} data={detail.data} onClose={() => setDetail(null)} />}
    </Shell>
  );
}

function DetailModal({ loading, data, onClose }) {
  const emails = data?.emails || [];
  const [sel, setSel] = useState(0);
  useEffect(() => { setSel(0); }, [data]);
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  const mail = emails[sel];
  const acc = data?.account;

  return (
    <div className="tnm-modal-backdrop" onClick={onClose}>
      <div className="tnm-modal flex h-[82vh] w-[1040px] max-w-full flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-line px-5 py-4">
          <span className="tnm-card__icon"><Icon name="mail" size={18} /></span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-semibold tracking-tight">{acc?.Email || (loading ? "Loading…" : "—")}</div>
            <div className="mt-0.5 flex items-center gap-2">
              {acc && <StatusBadge status={acc.Status} />}
              <span className="tnm-meta">{emails.length} mails</span>
            </div>
          </div>
          <Button variant="secondary" icon="x" aria-label="Close" onClick={onClose} />
        </div>
        <div className="flex min-h-0 flex-1">
          <div className="w-[320px] shrink-0 overflow-auto border-r border-line">
            {loading ? (
              <div className="flex justify-center p-6"><Spinner size={22} /></div>
            ) : emails.length === 0 ? (
              <div className="p-5"><EmptyState icon="inbox" title="No mail">Account này chưa có mail nào được đọc.</EmptyState></div>
            ) : emails.map((m, i) => (
              <button type="button" key={i} onClick={() => setSel(i)} className={cn("tnm-mailitem", i === sel && "is-active")}>
                <span className="tnm-avatar tnm-avatar--sq shrink-0" style={{ width: 28, height: 28, borderRadius: 8, fontSize: 10 }}>{m.initials}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium">{m.subject}</div>
                  <div className="truncate font-mono text-[11px] text-muted">{m.name} · {m.receivedDateTime}</div>
                </div>
              </button>
            ))}
          </div>
          <div className="min-w-0 flex-1 bg-raised">
            {mail ? (
              <div className="flex h-full flex-col">
                <div className="border-b border-line px-5 py-4">
                  <div className="text-[16px] font-semibold tracking-tight">{mail.subject}</div>
                  <div className="mt-1 font-mono text-[12px] text-muted">{mail.name} · {mail.email} · {mail.receivedDateTime}</div>
                </div>
                <iframe title="mail" sandbox="" className="w-full flex-1 bg-white"
                  srcDoc={mail.content || `<p style="font-family:sans-serif">${mail.preview || ""}</p>`} />
              </div>
            ) : (
              <div className="grid h-full place-items-center p-6 text-sm text-muted">{loading ? "" : "Select a mail to read."}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}