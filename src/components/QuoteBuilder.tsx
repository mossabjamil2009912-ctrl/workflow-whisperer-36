import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Search, FilePlus2, Save, Minus, Plus, Trash2, Check, Zap, Battery, Sun, Box, ShieldCheck, Server, Home, Cpu, Cable, Wrench, Printer, History } from "lucide-react";
import { listCatalog, listCustomers, saveQuote, listQuotes } from "@/lib/crm.functions";
import logoClean from "@/assets/actes-logo-clean.png";

type Row = Awaited<ReturnType<typeof listCatalog>>[number];
type Line = { key: string; name: string; unit: string | null; price: number; qty: number; specs: string[] };

const TABLES: { k: string; t: string; i: typeof Zap }[] = [
  { k: "inverters", t: "الإنفرترات", i: Zap },
  { k: "batteries", t: "البطاريات", i: Battery },
  { k: "panels", t: "الألواح الشمسية", i: Sun },
  { k: "dc_boxes", t: "صناديق حماية DC", i: Box },
  { k: "ac_panel", t: "لوحات حماية AC", i: ShieldCheck },
  { k: "racks", t: "راكات وكبائن التخزين", i: Server },
  { k: "stands", t: "استندات المنظومات", i: Home },
  { k: "battery_controls", t: "كنترولات وحماية البطاريات", i: Cpu },
  { k: "cables", t: "الكنشات والكابلات", i: Cable },
  { k: "custom", t: "أصناف مخصصة وخدمات", i: Wrench },
];

const usd = (n: number) => "$" + n.toLocaleString("en-US", { maximumFractionDigits: 2 });
const specsOf = (r: Row) => (Array.isArray(r.specs) ? (r.specs as unknown[]).map(String) : []);
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function quoteHtml(no: string, cust: { name: string; phone: string; city: string }, lines: Line[], notes: string) {
  const total = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const logo = new URL(logoClean, location.origin).href;
  const rows = lines.map((l, i) => `<tr><td>${i + 1}</td><td><b>${esc(l.name)}</b>${l.specs.length ? `<ul>${l.specs.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>` : ""}</td><td>${l.qty} ${esc(l.unit ?? "")}</td><td>${usd(l.price)}</td><td><b>${usd(l.price * l.qty)}</b></td></tr>`).join("");
  return `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>${no}</title><link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;800&display=swap" rel="stylesheet"><style>
  @page{size:A4;margin:12mm}body{font-family:Cairo,sans-serif;color:#1d2433;margin:0}
  .hd{display:flex;justify-content:space-between;align-items:center;background:#141a26;color:#fff;padding:18px 24px;border-bottom:6px solid #f5a300}
  .hd img{height:54px}.hd h1{margin:0;font-size:26px;color:#f5a300}.hd small{opacity:.8}
  .info{display:grid;grid-template-columns:1fr 1fr;gap:6px 24px;padding:16px 24px;background:#f6f7f9;font-size:14px}
  table{width:100%;border-collapse:collapse;margin-top:14px;font-size:13px}th{background:#f5a300;color:#141a26;padding:9px;text-align:right}
  td{border-bottom:1px solid #e3e6ea;padding:9px;vertical-align:top}ul{margin:4px 0 0;padding-right:16px;color:#5b6474;font-size:11.5px}
  .tot{display:flex;justify-content:flex-end;margin-top:14px}.tot div{background:#141a26;color:#fff;padding:12px 22px;border-radius:8px;font-size:18px}.tot b{color:#f5a300}
  .terms{margin-top:22px;font-size:12px;color:#5b6474;border-top:2px solid #f5a300;padding-top:10px}
  </style></head><body><div class="hd"><div><h1>عرض سعر</h1><small>${no} — ${new Date().toLocaleDateString("ar-EG")}</small></div><img src="${logo}"></div>
  <div class="info"><div>العميل: <b>${esc(cust.name || "-")}</b></div><div>الهاتف: <b dir="ltr">${esc(cust.phone || "-")}</b></div><div>المدينة: <b>${esc(cust.city || "-")}</b></div><div>العملة: <b>دولار أمريكي</b></div></div>
  <div style="padding:0 24px"><table><thead><tr><th>#</th><th>الصنف والمواصفات</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="tot"><div>الإجمالي الكلي: <b>${usd(total)}</b></div></div>
  ${notes ? `<p style="margin-top:14px"><b>ملاحظات:</b> ${esc(notes)}</p>` : ""}
  <div class="terms"><b>الشروط:</b> العرض ساري لمدة 7 أيام · الأسعار بالدولار الأمريكي · الضمان حسب ضمان الشركة المصنعة لكل صنف.<br>ACTES للطاقة الشمسية</div></div>
  <script>onload=()=>setTimeout(()=>print(),400)</script></body></html>`;
}

export function QuoteBuilder({ pw, initialCustomerId }: { pw: string; initialCustomerId?: string | null }) {
  const listC = useServerFn(listCatalog), listCu = useServerFn(listCustomers), save = useServerFn(saveQuote), listQ = useServerFn(listQuotes);
  const { data: rows = [] } = useQuery({ queryKey: ["catalog"], queryFn: () => listC({ data: { pw } }) });
  const { data: customers = [] } = useQuery({ queryKey: ["quote-customers"], queryFn: () => listCu({ data: { pw } }) });
  const { data: quotes = [], refetch: refetchQ } = useQuery({ queryKey: ["quotes"], queryFn: () => listQ({ data: { pw } }) });

  const [active, setActive] = useState("inverters");
  const [q, setQ] = useState("");
  const [lines, setLines] = useState<Record<string, Line>>({});
  const [custId, setCustId] = useState<string | null>(initialCustomerId ?? null);
  const [cust, setCust] = useState({ name: "", phone: "", city: "" });
  const [notes, setNotes] = useState("");
  const [custom, setCustom] = useState({ name: "", price: "", unit: "" });
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showHist, setShowHist] = useState(false);

  const items = useMemo(() => rows.filter((r) => r.kind === "item" && r.active), [rows]);
  const byCat = useMemo(() => {
    const m: Record<string, Row[]> = {};
    for (const r of items) (m[r.category] ??= []).push(r);
    return m;
  }, [items]);
  const list = (active === "custom" ? [] : byCat[active] ?? []).filter((r) => !q || (r.name + r.key).toLowerCase().includes(q.toLowerCase()));
  const chosen = Object.values(lines);
  const total = chosen.reduce((s, l) => s + l.price * l.qty, 0);
  const countIn = (k: string) => chosen.filter((l) => (k === "custom" ? l.key.startsWith("CUSTOM_") : byCat[k]?.some((r) => r.key === l.key))).length;

  const toggle = (r: Row) => setLines((p) => {
    const n = { ...p };
    if (n[r.key]) delete n[r.key];
    else n[r.key] = { key: r.key, name: r.name, unit: r.unit, price: Number(r.price ?? 0), qty: 1, specs: specsOf(r) };
    return n;
  });
  const setQty = (k: string, qty: number) => setLines((p) => (p[k] ? { ...p, [k]: { ...p[k], qty: Math.max(1, qty || 1) } } : p));
  const remove = (k: string) => setLines((p) => { const n = { ...p }; delete n[k]; return n; });
  const addCustom = () => {
    const price = Number(custom.price);
    if (!custom.name.trim() || !(price >= 0)) return;
    const key = "CUSTOM_" + Date.now();
    setLines((p) => ({ ...p, [key]: { key, name: custom.name.trim(), unit: custom.unit || null, price, qty: 1, specs: [] } }));
    setCustom({ name: "", price: "", unit: "" });
  };
  const pickCustomer = (id: string) => {
    setCustId(id || null);
    const c = customers.find((x) => x.id === id);
    if (c) setCust({ name: c.name ?? "", phone: c.phone, city: c.city ?? "" });
  };
  if (custId && !cust.phone) { const c = customers.find((x) => x.id === custId); if (c) setCust({ name: c.name ?? "", phone: c.phone, city: c.city ?? "" }); }

  const [no, setNo] = useState<string | null>(null);
  const generate = () => {
    if (!chosen.length) return setMsg("اختر صنفا واحدا على الأقل");
    const w = window.open("", "_blank");
    if (!w) return setMsg("اسمح بالنوافذ المنبثقة لعرض السعر");
    w.document.write(quoteHtml(no ?? "ACTES-Q-مسودة", cust, chosen, notes));
    w.document.close();
  };
  const doSave = async () => {
    if (!chosen.length) return setMsg("اختر صنفا واحدا على الأقل");
    setBusy(true); setMsg(null);
    try {
      const r = await save({ data: { pw, customer_id: custId, customer_name: cust.name || null, phone: cust.phone || null, city: cust.city || null, notes: notes || null, items: chosen } });
      setNo(r.quote_no); setMsg(`تم الحفظ: ${r.quote_no}`); void refetchQ();
    } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  };
  const loadQuote = (qt: (typeof quotes)[number]) => {
    const its = (qt.items as unknown as Line[]) ?? [];
    setLines(Object.fromEntries(its.map((l) => [l.key, l])));
    setCustId(qt.customer_id); setCust({ name: qt.customer_name ?? "", phone: qt.phone ?? "", city: qt.city ?? "" });
    setNotes(qt.notes ?? ""); setNo(qt.quote_no); setShowHist(false);
  };

  return (
    <div className="grid gap-3 p-3 lg:h-full lg:grid-cols-[minmax(0,1fr)_360px] lg:overflow-hidden">
      <section className="flex min-h-0 flex-col gap-3">
        <div className="flex items-center gap-2">
          <h2 className="flex items-center gap-2 text-lg font-bold"><FilePlus2 className="h-5 w-5 text-primary" />إنشاء عرض سعر</h2>
          <button onClick={() => setShowHist((v) => !v)} className="mr-auto flex items-center gap-1 rounded-lg bg-muted px-3 py-1.5 text-xs font-semibold hover:bg-muted/70"><History className="h-4 w-4" />العروض المحفوظة ({quotes.length})</button>
        </div>
        {showHist && (
          <div className="max-h-56 overflow-y-auto rounded-xl border bg-muted/30 p-2 animate-in fade-in slide-in-from-top-2">
            {quotes.length === 0 ? <p className="p-3 text-center text-sm text-muted-foreground">لا توجد عروض محفوظة</p> : quotes.map((qt) => (
              <button key={qt.id} onClick={() => loadQuote(qt)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-right text-sm hover:bg-card">
                <span className="font-bold text-primary">{qt.quote_no}</span><span className="flex-1 truncate">{qt.customer_name || qt.phone || "-"}</span><span className="font-semibold">{usd(Number(qt.total))}</span>
              </button>))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {TABLES.map((t) => { const n = countIn(t.k), all = t.k === "custom" ? 0 : byCat[t.k]?.length ?? 0; return (
            <button key={t.k} onClick={() => { setActive(t.k); setQ(""); }}
              className={`group relative flex flex-col items-start gap-1 rounded-xl border p-2.5 text-right transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${active === t.k ? "border-primary bg-primary text-primary-foreground shadow-lg" : "bg-card"}`}>
              <t.i className={`h-5 w-5 ${active === t.k ? "" : "text-primary"}`} />
              <span className="text-xs font-bold leading-tight">{t.t}</span>
              <span className="text-[10px] opacity-70">{t.k === "custom" ? "إدخال حر" : `${all} صنف`}</span>
              {n > 0 && <span className="absolute -top-1.5 -left-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground animate-in zoom-in">{n}</span>}
            </button>); })}
        </div>

        <div key={active} className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-2 border-b bg-muted/40 p-2.5">
            <span className="font-bold">{TABLES.find((t) => t.k === active)?.t}</span>
            {active !== "custom" && <label className="mr-auto flex items-center gap-1 rounded-lg border bg-background px-2"><Search className="h-4 w-4 text-muted-foreground" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث..." className="w-36 bg-transparent py-1 text-sm outline-none" /></label>}
          </div>
          {active === "custom" ? (
            <div className="grid gap-2 p-3 sm:grid-cols-[1fr_110px_90px_auto]">
              <input value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} placeholder="اسم الصنف أو الخدمة (مثل أجور التركيب)" className="rounded-lg border bg-background px-3 py-2 text-sm" />
              <input value={custom.price} onChange={(e) => setCustom({ ...custom, price: e.target.value })} type="number" min={0} placeholder="السعر $" className="rounded-lg border bg-background px-3 py-2 text-sm" />
              <input value={custom.unit} onChange={(e) => setCustom({ ...custom, unit: e.target.value })} placeholder="الوحدة" className="rounded-lg border bg-background px-3 py-2 text-sm" />
              <button onClick={addCustom} className="flex items-center justify-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"><Plus className="h-4 w-4" />إضافة</button>
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-card text-xs text-muted-foreground"><tr className="border-b"><th className="w-10 p-2" /><th className="p-2 text-right">الصنف</th><th className="p-2 text-right">السعر</th><th className="w-40 p-2 text-right">الكمية</th></tr></thead>
                <tbody>
                  {list.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">لا توجد أصناف</td></tr>}
                  {list.map((r) => { const l = lines[r.key]; const sp = specsOf(r); return (
                    <tr key={r.key} onClick={() => toggle(r)} className={`cursor-pointer border-b transition-colors ${l ? "bg-primary/10" : "hover:bg-muted/50"}`}>
                      <td className="p-2"><span className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all ${l ? "border-primary bg-primary text-primary-foreground scale-110" : "border-muted-foreground/40"}`}>{l && <Check className="h-3.5 w-3.5" />}</span></td>
                      <td className="p-2"><div className="font-semibold">{r.name}</div>{sp.length > 0 && <div className="line-clamp-1 text-[11px] text-muted-foreground">{sp.slice(0, 3).join(" · ")}</div>}</td>
                      <td className="whitespace-nowrap p-2 font-bold text-primary">{r.price != null ? usd(Number(r.price)) : "-"}{r.unit && <span className="text-[10px] font-normal text-muted-foreground"> / {r.unit}</span>}</td>
                      <td className="p-2" onClick={(e) => l && e.stopPropagation()}>
                        {l && (
                          <div className="flex items-center gap-1 animate-in fade-in zoom-in-95 duration-200">
                            <button onClick={() => setQty(r.key, l.qty - 1)} className="rounded-md bg-muted p-1"><Minus className="h-3.5 w-3.5" /></button>
                            <input type="number" min={1} value={l.qty} onChange={(e) => setQty(r.key, Number(e.target.value))} autoFocus className="w-14 rounded-md border bg-background px-1 py-0.5 text-center text-sm font-bold" />
                            <button onClick={() => setQty(r.key, l.qty + 1)} className="rounded-md bg-muted p-1"><Plus className="h-3.5 w-3.5" /></button>
                          </div>)}
                      </td>
                    </tr>); })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <aside className="flex min-h-0 flex-col gap-2 rounded-xl border bg-card p-3 shadow-sm">
        <h3 className="font-bold">العميل</h3>
        <select value={custId ?? ""} onChange={(e) => pickCustomer(e.target.value)} className="rounded-lg border bg-background px-2 py-1.5 text-sm">
          <option value="">— عميل جديد / بدون —</option>
          {customers.map((c) => <option key={c.id} value={c.id}>{c.name || c.phone} {c.name ? `(${c.phone})` : ""}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <input value={cust.name} onChange={(e) => setCust({ ...cust, name: e.target.value })} placeholder="الاسم" className="rounded-lg border bg-background px-2 py-1.5 text-sm" />
          <input value={cust.city} onChange={(e) => setCust({ ...cust, city: e.target.value })} placeholder="المدينة" className="rounded-lg border bg-background px-2 py-1.5 text-sm" />
          <input dir="ltr" value={cust.phone} onChange={(e) => setCust({ ...cust, phone: e.target.value })} placeholder="الهاتف" className="col-span-2 rounded-lg border bg-background px-2 py-1.5 text-sm" />
        </div>
        <h3 className="mt-1 flex items-center justify-between font-bold">الأصناف المختارة <span className="rounded-full bg-primary px-2 text-xs text-primary-foreground">{chosen.length}</span></h3>
        <ul className="min-h-24 flex-1 space-y-1.5 overflow-y-auto">
          {chosen.length === 0 && <li className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">اضغط على أي صنف من الجداول لإضافته</li>}
          {chosen.map((l) => (
            <li key={l.key} className="flex items-center gap-2 rounded-lg bg-muted/50 p-2 text-xs animate-in fade-in slide-in-from-left-2">
              <div className="min-w-0 flex-1"><div className="truncate font-semibold">{l.name}</div><div className="text-muted-foreground">{l.qty} × {usd(l.price)}</div></div>
              <b className="text-primary">{usd(l.qty * l.price)}</b>
              <button onClick={() => remove(l.key)} className="rounded p-1 text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></button>
            </li>))}
        </ul>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="ملاحظات على العرض (اختياري)" rows={2} className="rounded-lg border bg-background px-2 py-1.5 text-sm" />
        <div className="flex items-center justify-between rounded-xl bg-ink px-4 py-3 text-ink-foreground">
          <span className="text-sm">الإجمالي</span><span className="text-xl font-extrabold text-primary">{usd(total)}</span>
        </div>
        {msg && <p className="text-center text-xs font-semibold text-primary">{msg}</p>}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={generate} className="flex items-center justify-center gap-1.5 rounded-lg bg-primary py-2.5 text-sm font-bold text-primary-foreground shadow transition hover:opacity-90"><Printer className="h-4 w-4" />إنشاء عرض السعر</button>
          <button onClick={doSave} disabled={busy} className="flex items-center justify-center gap-1.5 rounded-lg border-2 border-primary py-2.5 text-sm font-bold text-primary transition hover:bg-primary/10 disabled:opacity-50"><Save className="h-4 w-4" />{busy ? "جارٍ الحفظ..." : "حفظ عرض السعر"}</button>
        </div>
      </aside>
    </div>
  );
}
