import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Search, FileText, Save } from "lucide-react";
import { listCatalog, saveCatalogItem } from "@/lib/crm.functions";

type Row = Awaited<ReturnType<typeof listCatalog>>[number];

export function Catalog({ pw }: { pw: string }) {
  const list = useServerFn(listCatalog);
  const { data: rows = [], refetch } = useQuery({ queryKey: ["catalog"], queryFn: () => list({ data: { pw } }) });
  const [tab, setTab] = useState<"item" | "datasheet">("item");
  const [q, setQ] = useState("");
  const shown = rows.filter((r) => r.kind === tab && (r.name.includes(q) || r.key.includes(q)));
  const groups = [...new Set(shown.map((r) => r.category_title ?? r.category))];

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="space-y-2 p-3">
        <div className="grid grid-cols-2 gap-1.5">
          <button onClick={() => setTab("item")} className={`rounded-lg py-2 text-sm ${tab === "item" ? "bg-primary font-semibold text-primary-foreground" : "bg-muted"}`}>الأصناف والأسعار</button>
          <button onClick={() => setTab("datasheet")} className={`rounded-lg py-2 text-sm ${tab === "datasheet" ? "bg-primary font-semibold text-primary-foreground" : "bg-muted"}`}>الكتالوجات PDF</button>
        </div>
        <div className="relative">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث عن صنف..." className="w-full rounded-lg border bg-card py-2 pl-3 pr-9 text-sm" />
        </div>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto px-3 pb-6">
        {groups.map((g) => (
          <section key={g}>
            {tab === "item" && <h2 className="mb-2 text-sm font-bold text-primary">{g}</h2>}
            <div className="space-y-2">
              {shown.filter((r) => (r.category_title ?? r.category) === g).map((r) => <ItemRow key={r.key} r={r} pw={pw} onSaved={() => refetch()} />)}
            </div>
          </section>
        ))}
        {!shown.length && <p className="py-10 text-center text-sm text-muted-foreground">لا توجد أصناف</p>}
      </div>
    </div>
  );
}

function ItemRow({ r, pw, onSaved }: { r: Row; pw: string; onSaved: () => void }) {
  const save = useServerFn(saveCatalogItem);
  const [name, setName] = useState(r.name);
  const [price, setPrice] = useState(r.price == null ? "" : String(r.price));
  const [pdf, setPdf] = useState(r.pdf_url ?? "");
  const [active, setActive] = useState(r.active);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const dirty = name !== r.name || price !== (r.price == null ? "" : String(r.price)) || pdf !== (r.pdf_url ?? "") || active !== r.active;

  async function submit() {
    setBusy(true); setMsg("");
    try {
      await save({ data: { pw, key: r.key, name, unit: r.unit, price: price === "" ? null : Number(price), pdf_url: pdf, active } });
      setMsg("تم الحفظ ✓"); onSaved();
    } catch (e) { setMsg(e instanceof Error ? e.message : "خطأ"); }
    finally { setBusy(false); }
  }

  return (
    <div className={`rounded-xl border bg-card p-3 ${active ? "" : "opacity-60"}`}>
      <textarea value={name} onChange={(e) => setName(e.target.value)} rows={2} className="w-full resize-none rounded-md bg-transparent text-sm font-medium outline-none focus:bg-muted" />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {r.kind === "item" ? (
          <label className="flex items-center gap-1 text-sm">
            <span className="text-muted-foreground">السعر $</span>
            <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="w-24 rounded-md border bg-background px-2 py-1" />
            <span className="text-xs text-muted-foreground">/ {r.unit}</span>
          </label>
        ) : (
          <div className="flex w-full items-center gap-1">
            <FileText className="h-4 w-4 shrink-0 text-primary" />
            <input value={pdf} onChange={(e) => setPdf(e.target.value)} placeholder="رابط PDF" dir="ltr" className="flex-1 rounded-md border bg-background px-2 py-1 text-xs" />
            {r.pdf_url && <a href={r.pdf_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">فتح</a>}
          </div>
        )}
        <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> مفعّل</label>
        <button disabled={!dirty || busy} onClick={submit} className="mr-auto flex items-center gap-1 rounded-md bg-primary px-3 py-1 text-xs text-primary-foreground disabled:opacity-40">
          <Save className="h-3.5 w-3.5" /> حفظ
        </button>
      </div>
      {msg && <p className="mt-1 text-xs text-muted-foreground">{msg}</p>}
    </div>
  );
}
