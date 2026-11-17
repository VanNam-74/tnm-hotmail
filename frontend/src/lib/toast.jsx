import { createContext, useContext, useCallback, useState } from "react";
import { cn } from "./cn";

const ToastCtx = createContext(null);
let idSeq = 0;

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);

  const dismiss = useCallback((id) => {
    setItems((list) => list.map((t) => (t.id === id ? { ...t, show: false } : t)));
    setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), 380);
  }, []);

  const toast = useCallback((kind, title, msg) => {
    const id = ++idSeq;
    setItems((list) => [...list, { id, kind, title, msg, show: false }]);
    requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        setItems((list) => list.map((t) => (t.id === id ? { ...t, show: true } : t)))
      )
    );
    setTimeout(() => dismiss(id), 3800);
  }, [dismiss]);

  const api = {
    ok: (t, m) => toast("ok", t, m),
    err: (t, m) => toast("err", t, m),
    info: (t, m) => toast("info", t, m),
  };

  const dotColor = { ok: "#4cc38a", err: "#ff7a6e", info: "#a3a3a8" };

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="toasts">
        {items.map((t) => (
          <div key={t.id} className={cn("toast", t.show && "show")}>
            <span className="dot" style={{ background: dotColor[t.kind] }} />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold">{t.title}</div>
              {t.msg && <div className="msg mt-0.5 text-[12.5px]">{t.msg}</div>}
            </div>
            <button type="button" className="text-[15px] leading-none text-heromuted hover:text-heroink" onClick={() => dismiss(t.id)}>×</button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx);
}
