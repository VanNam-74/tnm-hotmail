import { cn } from "../lib/cn";
import { Icon } from "./ui";

export const SHEET_COLUMNS = ["ID", "EMAIL", "Recovery", "Password", "Two_Fa"];


export function SheetColumns({ columns = SHEET_COLUMNS, dark = false, onCopy, className }) {
    function copy() {
        navigator.clipboard?.writeText(columns.join("\t"));
        onCopy?.();
    }
    return (
        <div className={cn("flex flex-col gap-2", className)}>
            <div className="flex items-center justify-between">
                <span className="tnm-eyebrow">Columns required · row 1</span>
                <button type="button" onClick={copy} className={cn("tnm-sheetcols__copy", dark && "is-dark")}>
                    <Icon name="copy" size={12} /> Copy header
                </button>
            </div>
            <div className={cn("tnm-sheetcols", dark && "is-dark")} role="table" aria-label="Required sheet columns">
                <div className="tnm-sheetcols__row" role="row">
                    {columns.map((c, i) => (
                        <div key={c} className="tnm-sheetcols__cell" role="columnheader">
                            <span className="tnm-sheetcols__letter">{String.fromCharCode(65 + i)}</span>
                            <span className="tnm-sheetcols__name">{c}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}