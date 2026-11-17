import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Shell, BackBar, PageHead } from "../components/Shell";
import { Card, CardHead, CardBody, Button, Input, Field, Spinner, StatusBadge, Segmented, Checkbox, CopyBox, EmptyState, Pill, Skeleton, Icon } from "../components/ui";
import { cn } from "../lib/cn";
import { useToast } from "../lib/toast";
import { api } from "../lib/api";
import { ShareStatusPill } from "../components/ShareStatusPill";

export default function Share() {
  const location = useLocation();
  const preselect = location.state?.emails || [];
  const [tab, setTab] = useState("provide");
  const [net, setNet] = useState(null);

  useEffect(() => {
    api.settings().then((r) => setNet({ ip: r.network?.ip, port: r.config?.share_port, mac: r.network?.gateway_mac })).catch(() => { });
  }, []);

  return (
    <Shell>
      <BackBar eyebrow="03 — Distribute" />
      <PageHead title="Share data (LAN)"
        desc="Only read mail data is shared — never tokens or proxies. Both machines must be on the same network.">
        <ShareStatusPill prefix="Share URL"
          fallback={net?.ip ? <Pill tone="none">Share URL · {net.ip}{net.port ? `:${net.port}` : ""}</Pill> : null} />
      </PageHead>
      <div className="mb-4">
        <Segmented value={tab} onChange={setTab} options={[
          { value: "provide", label: "Provide", icon: "share" },
          { value: "receive", label: "Receive", icon: "receive" },
        ]} />
      </div>
      {tab === "provide" ? <Provider preselect={preselect} /> : <Consumer />}
    </Shell>
  );
}

/* ================= Provide ================= */

function Provider({ preselect }) {
  const toast = useToast();
  const [accounts, setAccounts] = useState([]);
  const [selected, setSelected] = useState(new Set(preselect));
  const [q, setQ] = useState("");
  const [label, setLabel] = useState("");
  const [created, setCreated] = useState(null);
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState(null);

  async function reload() {
    try {
      const [a, s] = await Promise.all([api.shareAccounts(), api.shareList()]);
      setAccounts(a.data || []);
      setShares(s.data || []);
    } catch (e) {
      toast.err("Cannot load", e.message);
    } finally { setLoading(false); }
  }
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, []);

  const visible = useMemo(() => {
    const k = q.trim().toLowerCase();
    return k ? accounts.filter((a) => a.Email.toLowerCase().includes(k)) : accounts;
  }, [accounts, q]);
  const allVisibleSelected = visible.length > 0 && visible.every((a) => selected.has(a.Email));
  const someVisibleSelected = visible.some((a) => selected.has(a.Email));

  function toggle(email) {
    const next = new Set(selected);
    next.has(email) ? next.delete(email) : next.add(email);
    setSelected(next);
  }
  function toggleVisible() {
    const next = new Set(selected);
    if (allVisibleSelected) visible.forEach((a) => next.delete(a.Email));
    else visible.forEach((a) => next.add(a.Email));
    setSelected(next);
  }

  async function createShare() {
    setCreating(true);
    try {
      const r = await api.shareCreate(label || "new machine", Array.from(selected));
      setCreated({ ...r, label: label || "new machine", count: selected.size });
      setLabel(""); setSelected(new Set());
      toast.ok("Key created", "Share the URL + key with the other machine.");
      reload();
    } catch (e) {
      toast.err("Cannot create key", e.message);
    } finally { setCreating(false); }
  }

  async function revoke(key) {
    setRevoking(key);
    try { await api.shareRevoke(key); toast.ok("Revoked"); await reload(); }
    catch (e) { toast.err("Cannot revoke", e.message); }
    finally { setRevoking(null); }
  }

  const activeKeys = shares.filter((s) => !s.Revoked);
  const revokedKeys = shares.filter((s) => s.Revoked);

  return (
    <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[1.2fr_1fr]">
      <div className="flex flex-col gap-3">
        <Card>
          <CardHead step="1" title="Pick accounts to share">
            <span className="tnm-meta">{selected.size} / {accounts.length} selected</span>
          </CardHead>
          <CardBody className="flex flex-col gap-3">
            <Input icon="search" placeholder="Lọc theo email…" value={q} onChange={(e) => setQ(e.target.value)} />
            {loading ? (
              <div className="space-y-2"><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
            ) : accounts.length === 0 ? (
              <EmptyState icon="inbox" title="No read accounts yet">Chạy Get Token để đọc mail trước khi share.</EmptyState>
            ) : (
              <div className="tnm-list max-h-72 overflow-auto">
                <label className="tnm-item tnm-item--head sticky top-0 z-[1]">
                  <Checkbox checked={allVisibleSelected} indeterminate={!allVisibleSelected && someVisibleSelected} onChange={toggleVisible} />
                  <span className="grow">Email{q && ` · ${visible.length} match`}</span><span>Status</span>
                </label>
                {visible.map((a) => (
                  <label key={a.Email} className="tnm-item cursor-pointer">
                    <Checkbox checked={selected.has(a.Email)} onChange={() => toggle(a.Email)} />
                    <span className="grow">{a.Email}</span>
                    <StatusBadge status={a.Status} />
                  </label>
                ))}
                {visible.length === 0 && <div className="p-4 text-center text-[13px] text-muted">Không có email nào khớp “{q}”.</div>}
              </div>
            )}
            <span className="tnm-hint">Để trống = share tất cả account.</span>
          </CardBody>
          <CardHead step="2" title="Create a key for the receiver" className="border-t border-line" />
          <CardBody>
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); createShare(); }}>
              <Input placeholder="Receiver name, e.g. PC-02" value={label} onChange={(e) => setLabel(e.target.value)} />
              <Button type="submit" icon="key" disabled={creating} style={{ height: 40 }}>
                {creating ? "Creating…" : selected.size ? `Create key · ${selected.size}` : "Create key · all"}
              </Button>
            </form>
          </CardBody>
        </Card>

        {created && (
          <div className="tnm-heropanel">
            <div className="flex items-center justify-between">
              <span className="tnm-eyebrow">Send this to {created.label}</span>
              <button type="button" className="text-heromuted hover:text-heroink" aria-label="Dismiss" onClick={() => setCreated(null)}><Icon name="x" size={16} /></button>
            </div>
            <KV label="URL" value={created.url} />
            <KV label="Key" value={created.key} />
            <KV label="Gateway MAC" value={created.gateway_mac || "(unavailable)"} />
          </div>
        )}
      </div>

      <Card>
        <CardHead title="Issued keys"><span className="tnm-meta">{activeKeys.length} active</span></CardHead>
        <CardBody className="flex flex-col gap-3">
          {loading ? <Skeleton className="h-28" /> : activeKeys.length === 0 ? (
            <EmptyState icon="key" title="No keys issued">Tạo key ở bước 2 rồi gửi URL + key cho máy nhận.</EmptyState>
          ) : activeKeys.map((s) => (
            <KeyCard key={s.Key} s={s} onRevoke={() => revoke(s.Key)} revoking={revoking === s.Key} />
          ))}
          {revokedKeys.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer list-none font-mono text-[12px] text-muted hover:text-ink">
                <span className="inline-block transition group-open:rotate-90">›</span> {revokedKeys.length} revoked
              </summary>
              <div className="mt-2 flex flex-col gap-2">
                {revokedKeys.map((s) => <KeyCard key={s.Key} s={s} />)}
              </div>
            </details>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function KeyCard({ s, onRevoke, revoking }) {
  const toast = useToast();
  const initials = (s.Label || "?").replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase() || "?";
  const n = s.Allowed_emails?.length || 0;
  return (
    <div className={cn("tnm-keycard", s.Revoked && "opacity-60")}>
      <div className="tnm-keycard__top">
        <span className="tnm-avatar tnm-avatar--sq">{initials}</span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-semibold">{s.Label}</div>
          <div className="tnm-meta">
            {n ? `${n} accounts` : "all accounts"}
            {/* Optional fields — shown only if the backend returns them (see API_TODO.md #4) */}
            {s.Created_at && ` · created ${String(s.Created_at).slice(0, 16).replace("T", " ")}`}
          </div>
        </div>
        <span className={cn("tnm-badge", s.Revoked ? "" : "tnm-badge--ok")}>{s.Revoked ? "Revoked" : "Active"}</span>
      </div>
      {!s.Revoked && <CopyBox mask value={s.Key} onCopied={() => toast.ok("Copied")} />}
      {(onRevoke || s.Last_pull_at || s.Pull_count) && (
        <div className="flex items-center justify-between">
          <span className="tnm-meta">
            {s.Last_pull_at ? `Last pull · ${String(s.Last_pull_at).slice(0, 16).replace("T", " ")}` : (s.Created_at ? "Never pulled" : "")}
            {s.Pull_count ? ` · ${s.Pull_count} pulls` : ""}
          </span>
          {onRevoke && <Button size="sm" variant="danger" icon="trash" disabled={revoking} onClick={onRevoke}>{revoking ? "Revoking…" : "Revoke"}</Button>}
        </div>
      )}
    </div>
  );
}

function KV({ label, value }) {
  const toast = useToast();
  return (
    <div className="flex flex-col gap-1.5">
      <div className="tnm-eyebrow">{label}</div>
      <CopyBox dark value={value} onCopied={() => toast.ok("Copied")} />
    </div>
  );
}

/* ================= Receive ================= */

function Consumer() {
  const toast = useToast();
  const [peers, setPeers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState("");
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [test, setTest] = useState(null);
  const [busy, setBusy] = useState(false);
  const [pulling, setPulling] = useState(null);

  async function reload() {
    try { setPeers((await api.peers()).data || []); }
    catch (e) { toast.err("Cannot load sources", e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, []);

  async function doTest() {
    setBusy(true); setTest(null);
    try { setTest(await api.peerTest(url, key)); }
    catch (e) { setTest({ ok: false, message: e.message }); }
    finally { setBusy(false); }
  }

  async function addPeer() {
    try {
      await api.peerAdd(name || url, url, key, test?.gateway_mac || null);
      setUrl(""); setKey(""); setName(""); setTest(null);
      toast.ok("Saved", "Source added.");
      reload();
    } catch (e) { toast.err("Cannot save", e.message); }
  }

  async function pull(id) {
    setPulling(id);
    try {
      const r = await api.peerPull(id);
      r.ok ? toast.ok("Pulled", r.message) : toast.err("Pull failed", r.message);
      reload();
    } catch (e) { toast.err("Pull failed", e.message); }
    finally { setPulling(null); }
  }

  async function remove(id) {
    try { await api.peerDelete(id); reload(); }
    catch (e) { toast.err("Cannot delete", e.message); }
  }

  return (
    <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[1fr_1.2fr]">
      <Card>
        <CardHead step="1" title="Add a source" sub="Dán URL + key nhận từ máy share." />
        <CardBody className="tnm-grid">
          <Field label="Nickname"><Input placeholder="PC-01" value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="URL"><Input mono placeholder="http://192.168.1.x:8790" value={url} onChange={(e) => { setUrl(e.target.value); setTest(null); }} /></Field>
          <Field label="Key"><Input mono placeholder="Key" value={key} onChange={(e) => { setKey(e.target.value); setTest(null); }} /></Field>
          {test && (
            <div className={cn("flex items-start gap-2 rounded-md border px-3 py-2.5 text-[13px]",
              test.ok ? "border-line bg-raised" : "border-line bg-raised")}>
              <span className={cn("tnm-dot mt-1.5", !test.ok && "tnm-dot--danger")} />
              <span>{test.message}{test.ok && test.gateway_mac && <span className="tnm-meta"> · MAC {test.gateway_mac}</span>}</span>
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="secondary" icon="plug" onClick={doTest} disabled={busy || !url || !key}>{busy ? <Spinner size={14} /> : "Test"}</Button>
            <Button icon="check" onClick={addPeer} disabled={!test?.ok}>Save source</Button>
          </div>
          {!test?.ok && <span className="tnm-hint">Test kết nối thành công rồi mới lưu được.</span>}
        </CardBody>
      </Card>

      <Card>
        <CardHead title="Saved sources"><span className="tnm-meta">{peers.length} sources</span></CardHead>
        <CardBody className="flex flex-col gap-2">
          {loading ? <Skeleton className="h-16" /> : peers.length === 0 ? (
            <EmptyState icon="server" title="No sources">Thêm nguồn ở bên trái để kéo dữ liệu từ máy khác.</EmptyState>
          ) : peers.map((p) => (
            <div key={p.ID} className="tnm-keycard !flex-row items-center">
              <span className="tnm-avatar tnm-avatar--sq">{(p.Name || "?").replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase() || "?"}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-semibold">{p.Name}</div>
                <div className="truncate font-mono text-[12px] text-muted">{p.Url}</div>
              </div>
              <Button size="sm" icon={pulling === p.ID ? undefined : "receive"} onClick={() => pull(p.ID)} disabled={pulling === p.ID}>
                {pulling === p.ID ? <><Spinner size={12} /> Pulling</> : "Pull"}
              </Button>
              <Button size="sm" variant="ghost" icon="trash" aria-label="Delete" title="Delete" onClick={() => remove(p.ID)} />
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}