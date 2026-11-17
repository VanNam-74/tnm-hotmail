import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useToast } from "../lib/toast";
import { Button, Checkbox, Field, Input, Spinner, Icon } from "../components/ui";

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(username, password, remember);
      nav("/app");
    } catch (e2) {
      toast.err("Sign in failed", e2.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="grid w-full max-w-[880px] overflow-hidden rounded-xl border border-line bg-surface md:grid-cols-[1fr_1.05fr]" style={{ boxShadow: "var(--shadow-hero)" }}>
        {/* Black brand slab */}
        <div className="relative hidden flex-col justify-between bg-hero p-8 text-heroink md:flex">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-[14px] border border-heroline"><Icon name="mail" size={20} /></div>
            <div>
              <div className="text-[16px] font-semibold tracking-tight">TNM Hotmail</div>
              <div className="tnm-eyebrow" style={{ color: "var(--hero-muted)" }}>Token · Filter · Share</div>
            </div>
          </div>
          <svg viewBox="0 0 160 96" className="my-8 w-40" aria-hidden="true">
            {Array.from({ length: 4 }).map((_, r) => Array.from({ length: 6 }).map((_, c) => (
              <circle key={`${r}-${c}`} cx={8 + c * 28} cy={8 + r * 26} r="2.5" fill="var(--hero-muted)" />
            )))}
          </svg>
          <div>
            <div className="text-[28px] font-semibold leading-8 tracking-[-0.025em]">Capture. Inspect.<br />Distribute.</div>
            <p className="mt-3 max-w-[30ch] text-[14px] leading-[22px] text-heromuted">Một công cụ cho token, mail và chia sẻ dữ liệu trong mạng LAN.</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="flex flex-col justify-center gap-4 p-8 md:p-10">
          <div>
            <div className="tnm-eyebrow">Sign in</div>
            <h1 className="mt-1.5 text-[28px] font-semibold leading-8 tracking-[-0.025em]">Welcome back</h1>
            <p className="mt-1.5 text-[14px] text-muted">Authenticate via eoffice to continue.</p>
          </div>
          <Field label="Username">
            <Input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus autoComplete="username" />
          </Field>
          <Field label="Password">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </Field>
          <label className="flex items-center gap-2.5 text-[13px] text-muted">
            <Checkbox checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            Remember me
          </label>
          <Button type="submit" size="lg" className="mt-1 w-full justify-center" disabled={loading}>
            {loading ? <Spinner size={16} /> : <>Sign in <Icon name="arrowRight" size={16} /></>}
          </Button>
        </form>
      </div>
    </div>
  );
}
