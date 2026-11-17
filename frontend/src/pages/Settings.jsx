import { useEffect, useState } from "react";
import { Shell, BackBar, PageHead } from "../components/Shell";
import { Card, Button, Input, Field, Skeleton, Spinner } from "../components/ui";
import { useShareStatus } from "../components/ShareStatusPill";
import { cn } from "../lib/cn";
import { useToast } from "../lib/toast";
import { api } from "../lib/api";

// form key -> [section, key] for api.settingUpdate (unchanged mapping)
const MAP = {
  eoffice_host: ["eoffice", "host"],
  eoffice_timeout: ["eoffice", "timeout"],
  client_id: ["gettoken", "client_id"],
  share_port: ["share", "port"],
  ui_port: ["server", "ui_port"],
};

function Section({ title, desc, children }) {
  return (
    <div className="tnm-section max-md:!grid-cols-1 max-md:!gap-4">
      <div>
        <div className="tnm-section__title">{title}</div>
        <div className="tnm-section__desc">{desc}</div>
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export default function Settings() {
  const toast = useToast();
  const [net, setNet] = useState(null);
  const [form, setForm] = useState(null);
  const [orig, setOrig] = useState(null);
  const [saving, setSaving] = useState(false);
  const [eoTest, setEoTest] = useState(null);      // { ok, message } | "loading"
  const [needRestart, setNeedRestart] = useState(null); // { ui?: port, share?: port }
  const [restarting, setRestarting] = useState(false);
  const share = useShareStatus();

  async function testEoffice() {
    setEoTest("loading");
    try { setEoTest(await api.testEoffice(form.eoffice_host, Number(form.eoffice_timeout) || 10)); }
    catch (e) { setEoTest({ ok: false, message: e.message }); }
  }

  async function restartNow() {
    setRestarting(true);
    try {
      if (needRestart?.share) {
        const r = await api.serverRestart("share");
        r.ok === false ? toast.err("Cannot restart Share", r.message) : toast.ok("Share server restarted");
      }
      if (needRestart?.ui) {
        await api.serverRestart("ui");
        toast.info("Restarting…", `Opening port ${needRestart.ui}`);
        const { protocol, hostname, pathname } = window.location;
        // chờ process mới mở port rồi chuyển sang
        setTimeout(() => { window.location.href = `${protocol}//${hostname}:${needRestart.ui}${pathname}`; }, 3000);
        return;
      }
      setNeedRestart(null);
    } catch (e) {
      toast.err("Cannot restart", e.message);
    } finally { setRestarting(false); }
  }

  async function reload() {
    try {
      const r = await api.settings();
      setNet(r.network);
      const f = {
        eoffice_host: r.config.eoffice_host || "",
        eoffice_timeout: String(r.config.eoffice_timeout ?? 30),
        client_id: r.config.client_id || "",
        share_port: String(r.config.share_port ?? 8790),
        ui_port: String(r.config.ui_port ?? 8750),
      };
      setForm(f); setOrig(f);
    } catch (e) { toast.err("Cannot load settings", e.message); }
  }
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, []);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }
  const changed = form && orig ? Object.keys(MAP).filter((k) => form[k] !== orig[k]) : [];

  async function saveAll() {
    setSaving(true);
    try {
      // Same endpoint as before; only the fields that actually changed are sent.
      for (const k of changed) {
        const [section, key] = MAP[k];
        await api.settingUpdate(section, key, form[k]);
      }
      const r = {};
      if (changed.includes("ui_port")) r.ui = form.ui_port;
      if (changed.includes("share_port")) r.share = form.share_port;
      if (r.ui || r.share) setNeedRestart((x) => ({ ...(x || {}), ...r }));
      toast.ok("Saved", r.ui || r.share ? "Port changes need a restart." : "Settings updated.");
      await reload();
    } catch (e) {
      toast.err("Cannot save", e.message);
    } finally { setSaving(false); }
  }

  const num = (v) => v.replace(/[^\d]/g, "");

  return (
    <Shell maxW="max-w-5xl">
      <BackBar eyebrow="04 — Configure" />
      <PageHead title="Settings" desc="All configuration in one place." />

      {!form ? (
        <Card className="space-y-4 p-6"><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10" /></Card>
      ) : (
        <Card>
          <Section title="eOffice" desc="Server dùng để đăng nhập và nhận kết quả phân loại.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_160px]">
              <Field label="Host">
                <div className="flex gap-2">
                  <Input mono value={form.eoffice_host} placeholder="http://192.168.1.91" onChange={(e) => { set("eoffice_host", e.target.value); setEoTest(null); }} />
                  <Button variant="secondary" icon={eoTest === "loading" ? undefined : "plug"} disabled={eoTest === "loading" || !form.eoffice_host}
                    onClick={testEoffice} style={{ height: 40 }}>{eoTest === "loading" ? <Spinner size={14} /> : "Test"}</Button>
                </div>
              </Field>
              {eoTest && eoTest !== "loading" && (
                <div className="flex items-center gap-2 text-[13px] sm:col-span-2">
                  <span className={cn("tnm-dot", !eoTest.ok && "tnm-dot--danger")} />
                  <span className={eoTest.ok ? "text-ink" : "text-danger"}>{eoTest.message}</span>
                </div>
              )}
              <Field label="Timeout" className="sm:row-start-1 sm:col-start-2">
                <div className="relative">
                  <Input mono inputMode="numeric" value={form.eoffice_timeout} onChange={(e) => set("eoffice_timeout", num(e.target.value))} className="pr-12" />
                  <span className="tnm-meta pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">sec</span>
                </div>
              </Field>
            </div>
          </Section>

          <Section title="Get Token" desc="Ứng dụng OAuth dùng để đọc mail.">
            <Field label="OAuth client_id"><Input mono value={form.client_id} placeholder="client id" onChange={(e) => set("client_id", e.target.value)} /></Field>
          </Section>

          <Section title="Network" desc="Cổng cho Share và giao diện.">
            <div className="tnm-grid" style={{ gap: 16 }}>
              <div className="tnm-grid tnm-grid--2">
                <Field label="Share port"><Input mono inputMode="numeric" value={form.share_port} onChange={(e) => set("share_port", num(e.target.value))} /></Field>
                <Field label="UI port" badge={<span className="tnm-badge tnm-badge--warn" style={{ height: 20, fontSize: 11 }}>Needs restart</span>}>
                  <Input mono inputMode="numeric" value={form.ui_port} onChange={(e) => set("ui_port", num(e.target.value))} />
                </Field>
              </div>
              <div className="tnm-sysrow max-sm:!grid-cols-1">
                <div className="tnm-sys"><div className="tnm-eyebrow">LAN IP</div><div className="v">{net?.ip || "?"}</div></div>
                <div className="tnm-sys"><div className="tnm-eyebrow">Gateway MAC</div><div className="v">{net?.gateway_mac || "?"}</div></div>
                <div className="tnm-sys">
                  <div className="tnm-eyebrow">Share server</div>
                  <div className="v flex items-center gap-2 truncate">
                    {share && !share.unavailable && <span className={cn("tnm-dot", !share.running && "tnm-dot--danger")} />}
                    {share && !share.unavailable
                      ? (share.running ? `Running · :${share.port}` : `Off · :${share.port}`)
                      : (net?.ip ? `${net.ip}:${orig.share_port}` : "?")}
                  </div>
                </div>
              </div>
            </div>
          </Section>
        </Card>
      )}

      {needRestart && changed.length === 0 && (
        <div className="sticky bottom-6 mt-4 flex justify-end">
          <div className="tnm-savebar">
            <span className="tnm-dot tnm-dot--warn" />
            <span className="text-[13px]">
              Restart to apply {[needRestart.ui && `UI port ${needRestart.ui}`, needRestart.share && `Share port ${needRestart.share}`].filter(Boolean).join(" · ")}
            </span>
            <Button variant="secondary" disabled={restarting} onClick={() => setNeedRestart(null)}>Later</Button>
            <Button icon="rotate" disabled={restarting} onClick={restartNow}>{restarting ? "Restarting…" : "Restart now"}</Button>
          </div>
        </div>
      )}

      {changed.length > 0 && (
        <div className="sticky bottom-6 mt-4 flex justify-end">
          <div className="tnm-savebar">
            <span className="tnm-dot tnm-dot--warn" />
            <span className="text-[13px]">{changed.length} unsaved change{changed.length > 1 ? "s" : ""}</span>
            <Button variant="secondary" disabled={saving} onClick={() => setForm(orig)}>Discard</Button>
            <Button icon="check" disabled={saving} onClick={saveAll}>{saving ? "Saving…" : "Save changes"}</Button>
          </div>
        </div>
      )}
    </Shell>
  );
}