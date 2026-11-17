import { useEffect, useRef, useState } from "react";
import { Shell, BackBar, PageHead } from "../components/Shell";
import { Card, CardHead, CardBody, CardFoot, Button, Input, Field, CopyBox, ProgressBar, Pill, Skeleton } from "../components/ui";
import { useToast } from "../lib/toast";
import { api } from "../lib/api";
import { SheetColumns } from "../components/SheetColumns";


const now = () => new Date().toLocaleTimeString("en-GB", { hour12: false });
const pick = (c) => ({
  client_id: c?.client_id ?? "",
  google_sheet_id: c?.google_sheet_id ?? "",
  google_sheet_name: c?.google_sheet_name ?? "",
  thread: String(c?.thread ?? 5),
});

export default function GetToken() {
  const toast = useToast();
  const [cfg, setCfg] = useState(null);
  const [saved, setSaved] = useState(null); // last saved snapshot → dirty state
  const [saving, setSaving] = useState(false);
  const [prog, setProg] = useState({ running: false, done: 0, total: 0, ok: 0, failed: 0, current: "" });
  const [imp, setImp] = useState({ running: false, done: 0, total: 0, ok: 0, failed: 0, current: "", errors: [] });
  const [log, setLog] = useState([]);
  const [lastRun, setLastRun] = useState(null);
  const [stopping, setStopping] = useState({ run: false, import: false });
  const poll = useRef(null);
  const impPoll = useRef(null);
  const lastCurrent = useRef({ run: "", imp: "" });

  const addLog = (text, kind) => setLog((l) => [...l.slice(-199), { t: now(), text, kind }]);
  // "HH:MM:SS message" (từ backend) → { t, text, kind }
  const parseLines = (lines = []) => lines.map((line) => {
    const m = /^(\d{2}:\d{2}:\d{2})\s+(.*)$/.exec(line) || [null, "", line];
    const text = m[2];
    return { t: m[1], text: text.replace(/^✕\s*/, ""), kind: text.startsWith("✕") ? "err" : / finished /.test(text) ? "ok" : undefined };
  });

  async function loadLastRun({ withLog = false } = {}) {
    try {
      const r = await api.gettokenHistory(1);
      const h = r.data?.[0] || null;
      setLastRun(h);
      if (withLog && h?.Log?.length) setLog(parseLines(h.Log));
    } catch { /* backend chưa có /history → bỏ qua */ }
  }

  async function loadCfg() {
    try {
      const c = await api.gettokenConfig();
      setCfg(c);
      setSaved(pick(c));
    } catch (e) {
      toast.err("Cannot load config", e.message);
      const c = { client_id: "", google_sheet_id: "", google_sheet_name: "", thread: 5, pending_accounts: 0 };
      setCfg(c);
      setSaved(pick(c));
    }
  }

  useEffect(() => {
    loadCfg();
    // Resume polling if a job is already running (same progress endpoints, called once on open)
    api.gettokenProgress().then(async (p) => {
      if (!p) return;
      setProg(p);
      if (p.running) {
        // khôi phục log của job đang chạy
        try { const r = await api.gettokenLog("run"); if (r.log?.length) setLog(parseLines(r.log)); } catch { /* ignore */ }
        addLog("Run in progress — reconnected");
        startPolling();
      } else {
        loadLastRun({ withLog: true });
      }
    }).catch(() => loadLastRun({ withLog: true }));
    api.gettokenImportProgress().then((p) => { if (p) { setImp(p); if (p.running) { addLog("Import in progress — reconnected"); startImportPolling(); } } }).catch(() => { });
    return () => { clearInterval(poll.current); clearInterval(impPoll.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function set(k, v) { setCfg((c) => ({ ...c, [k]: v })); }
  const dirty = cfg && saved && JSON.stringify(pick(cfg)) !== JSON.stringify(saved);

  async function saveConfig() {
    setSaving(true);
    try {
      await api.gettokenSaveConfig({
        client_id: cfg.client_id,
        google_sheet_id: cfg.google_sheet_id,
        google_sheet_name: cfg.google_sheet_name,
        thread: Number(cfg.thread) || 5,
      });
      toast.ok("Saved", "config.ini updated.");
      addLog("Config saved", "ok");
      await loadCfg();
    } catch (e) {
      toast.err("Cannot save", e.message);
    } finally { setSaving(false); }
  }

  function startPolling() {
    clearInterval(poll.current);
    poll.current = setInterval(async () => {
      try {
        const p = await api.gettokenProgress();
        setProg(p);
        if (p.current && p.current !== lastCurrent.current.run) { lastCurrent.current.run = p.current; addLog(`Processing ${p.current}`); }
        if (!p.running) {
          clearInterval(poll.current);
          addLog(`Run finished · ${p.ok} ok · ${p.failed} failed`, p.failed ? "err" : "ok");
          setStopping((x) => ({ ...x, run: false }));
          loadCfg();
          loadLastRun();
        }
      } catch { /* keep polling */ }
    }, 1000);
  }

  function startImportPolling() {
    clearInterval(impPoll.current);
    impPoll.current = setInterval(async () => {
      try {
        const p = await api.gettokenImportProgress();
        setImp(p);
        if (p.current && p.current !== lastCurrent.current.imp) { lastCurrent.current.imp = p.current; addLog(`Importing ${p.current}`); }
        if (!p.running) {
          clearInterval(impPoll.current);
          setStopping((x) => ({ ...x, import: false }));
          if (p.ok === 0 && p.failed > 0) {
            toast.err("Import finished", p.errors?.[0] || `${p.failed} failed`);
            addLog(p.errors?.[0] || `Import failed · ${p.failed}`, "err");
          } else {
            toast.ok("Import finished", `${p.ok} imported, ${p.failed} failed`);
            addLog(`Import finished · ${p.ok} imported · ${p.failed} failed`, p.failed ? "err" : "ok");
          }
          loadCfg();
        }
      } catch { /* keep polling */ }
    }, 1000);
  }

  async function runImport() {
    try {
      const r = await api.gettokenImport();
      if (!r.ok) { toast.err("Cannot import", r.message); addLog(r.message || "Cannot import", "err"); return; }
      toast.info("Importing", r.message);
      addLog(r.message || "Import started");
      setImp({ running: true, done: 0, total: 0, ok: 0, failed: 0, current: "", errors: [] });
      startImportPolling();
    } catch (e) { toast.err("Cannot import", e.message); }
  }

  async function run() {
    try {
      const r = await api.gettokenRun({});
      if (!r.ok) { toast.err("Cannot start", r.message); addLog(r.message || "Cannot start", "err"); return; }
      toast.info("Running", r.message);
      addLog(r.message || "Run started");
      setProg((p) => ({ ...p, running: true }));
      startPolling();
    } catch (e) { toast.err("Cannot start", e.message); }
  }

  async function stop(kind) {
    setStopping((x) => ({ ...x, [kind]: true }));
    try {
      const r = kind === "run" ? await api.gettokenStop() : await api.gettokenImportStop();
      if (r.ok === false) { toast.err("Cannot stop", r.message); setStopping((x) => ({ ...x, [kind]: false })); return; }
      toast.info("Stopping", r.message);
      addLog(r.message || "Stopping…");
    } catch (e) {
      toast.err("Cannot stop", e.message);
      setStopping((x) => ({ ...x, [kind]: false }));
    }
  }

  const busy = prog.running || imp.running;
  const state = prog.running ? ["warn", "Running"] : imp.running ? ["warn", "Importing"] : ["ok", "Idle"];
  const active = prog.running ? prog : imp.running ? imp : (prog.total > 0 ? prog : imp.total > 0 ? imp : null);

  return (
    <Shell>
      <BackBar eyebrow="01 — Capture" />
      <PageHead title="Get Token"
        desc="Automated login (proxy, fingerprint, bypass), reads mail and classifies — written straight to this machine." />

      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[1.35fr_1fr]">
        {/* -------- Configuration -------- */}
        <Card>
          <CardHead title="Configuration" sub={<>Maps to <span className="tnm-tag">config.ini</span></>}>
            {cfg && (dirty ? <span className="tnm-badge tnm-badge--warn">Unsaved</span> : <span className="tnm-badge tnm-badge--ok">Saved</span>)}
          </CardHead>
          {!cfg ? (
            <CardBody className="space-y-4"><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10" /></CardBody>
          ) : (
            <>
              <CardBody className="tnm-grid">
                <Field label="Google Sheet ID" tag="[GoogleSheetImport]">
                  <Input mono icon="sheet" value={cfg.google_sheet_id} onChange={(e) => set("google_sheet_id", e.target.value)} />
                </Field>
                <div className="tnm-grid tnm-grid--2">
                  <Field label="Sheet name">
                    <Input value={cfg.google_sheet_name} onChange={(e) => set("google_sheet_name", e.target.value)} />
                  </Field>
                  <Field label="Threads" tag="[AppSettings]" hint="Số trình duyệt chạy song song">
                    <Input mono inputMode="numeric" value={cfg.thread} onChange={(e) => set("thread", e.target.value.replace(/[^\d]/g, ""))} />
                  </Field>
                </div>
                <Field label="OAuth client_id">
                  <Input mono value={cfg.client_id} placeholder="Microsoft client id" onChange={(e) => set("client_id", e.target.value)} />
                </Field>
              </CardBody>
              <CardFoot>
                <span className="tnm-hint">{dirty ? "Lưu config trước khi Import / Run." : "Config đang dùng khớp với config.ini."}</span>
                <div className="flex gap-2">
                  <Button variant="secondary" disabled={!dirty} onClick={() => setCfg((c) => ({ ...c, ...saved }))}>Reset</Button>
                  <Button icon="check" disabled={!dirty || saving} onClick={saveConfig}>{saving ? "Saving…" : "Save config"}</Button>
                </div>
              </CardFoot>
            </>
          )}
        </Card>

        {/* -------- Run panel (the one black block on this page) -------- */}
        <div className="tnm-heropanel">
          <div className="flex items-center justify-between">
            <span className="tnm-eyebrow">Run</span>
            <Pill tone={state[0]} className="!border-heroline !bg-transparent !text-heromuted">
              {state[1]}
            </Pill>
          </div>

          <div>
            <div className="tnm-bignum">{cfg ? cfg.pending_accounts ?? 0 : "—"}</div>
            <div className="mt-2 text-[14px] text-heromuted">pending accounts chờ lấy token</div>
            {lastRun?.Finished_at && !busy && (
              <div className="mt-1.5 font-mono text-[12px] text-heromuted">
                Last {lastRun.Kind} · {String(lastRun.Finished_at).slice(5, 16)} · {lastRun.Ok} ok · {lastRun.Failed} failed{lastRun.Stopped ? " · stopped" : ""}
              </div>
            )}
          </div>

          {active && (
            <div className="space-y-2">
              <div className="flex justify-between font-mono text-[12px] text-heromuted">
                <span className="truncate pr-3">{active.running ? (active.current || "Starting…") : "Last job"}</span>
                <span>{active.done} / {active.total}</span>
              </div>
              <ProgressBar value={active.done} total={active.total} />
            </div>
          )}

          <div className="tnm-kv">
            <div><div className="tnm-eyebrow">Threads</div><div className="v">{cfg?.thread ?? "—"}</div></div>
            <div><div className="tnm-eyebrow">OK</div><div className="v">{active?.ok ?? lastRun?.Ok ?? 0}</div></div>
            <div><div className="tnm-eyebrow">Failed</div><div className="v">{active?.failed ?? lastRun?.Failed ?? 0}</div></div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="tnm-eyebrow">Share sheet (Viewer) with</div>
            {cfg?.service_account_email ? (
              <CopyBox dark value={cfg.service_account_email} onCopied={() => toast.ok("Copied")} />
            ) : (
              <div className="rounded-md border border-dashed border-heroline px-3.5 py-2.5 text-[13px] text-heromuted">
                service_account.json not found in the tnmhotmail folder.
              </div>
            )}
          </div>

          <SheetColumns dark onCopy={() => toast.ok("Copied", "Dán vào dòng 1 của Google Sheet")} />

          <div className="grid grid-cols-[1fr_1.4fr] gap-2">
            {imp.running ? (
              <Button variant="secondary" icon="x" className="justify-center" onClick={() => stop("import")} disabled={stopping.import}>
                {stopping.import ? "Stopping…" : "Stop import"}
              </Button>
            ) : (
              <Button variant="secondary" icon="download" className="justify-center" onClick={runImport} disabled={!cfg}>
                Import from Sheet
              </Button>
            )}
            {prog.running ? (
              <Button variant="invert" icon="x" className="justify-center" onClick={() => stop("run")} disabled={stopping.run}>
                {stopping.run ? "Stopping after current…" : "Stop"}
              </Button>
            ) : (
              <Button variant="invert" icon="play" className="justify-center" onClick={run} disabled={!cfg}>
                Run auto get token
              </Button>
            )}
          </div>

          <pre className="tnm-log">
            {log.length === 0 ? <span className="t">Chưa có hoạt động trong phiên này.</span> : log.map((l, i) => (
              <div key={i}><span className="t">{l.t}</span>  {l.kind === "ok" && <span className="ok">✓ </span>}{l.kind === "err" && <span className="err">✕ </span>}{l.text}</div>
            ))}
          </pre>
        </div>
      </div>
    </Shell>
  );
}