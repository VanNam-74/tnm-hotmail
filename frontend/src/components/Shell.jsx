import { useNavigate } from "react-router-dom";
import { Icon } from "./ui";

export function Shell({ children, maxW = "max-w-6xl" }) {
  return (
    <div className="h-full overflow-auto">
      <div className={`mx-auto ${maxW} px-8 py-8`}>{children}</div>
    </div>
  );
}

// Breadcrumb: "← Overview" + mono module number (matches the numbers on the Overview cards)
export function BackBar({ to = "/app", eyebrow }) {
  const nav = useNavigate();
  return (
    <div className="tnm-crumb">
      <button type="button" className="tnm-back" onClick={() => nav(to)}>
        <Icon name="back" size={15} />
        Overview
      </button>
      {eyebrow && <span className="tnm-eyebrow">{eyebrow}</span>}
    </div>
  );
}

export function PageHead({ title, desc, children }) {
  return (
    <div className="tnm-pagehead">
      <div className="min-w-0">
        <h1>{title}</h1>
        {desc && <p>{desc}</p>}
      </div>
      {children && <div className="tnm-pagehead__end">{children}</div>}
    </div>
  );
}
