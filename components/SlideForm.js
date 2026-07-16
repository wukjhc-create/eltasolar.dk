// Formular til oprettelse/redigering af ELTA Standard-slides (server-renderet)

const CATEGORIES = [
  "Ejerskab", "Solcellemontage", "Elektriker", "Kvalitet", "Dokumentation",
  "Kundeservice", "Sikkerhed", "Effektivitet", "Oprydning", "Holdånd",
  "ELTA Academy", "Generel information",
];
const BACKGROUNDS = [
  ["solskin", "Solskin (cremehvid)"],
  ["blaek", "Blæk (mørkeblå)"],
  ["solgul", "Solgul"],
  ["groen", "Grøn"],
  ["gradient_sol", "Gradient: creme → solgul"],
  ["gradient_blaek", "Gradient: mørkeblå → lilla"],
  ["billede", "Baggrundsbillede (kræver URL)"],
];
const DAY_NAMES = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];

const input = "w-full rounded-lg border border-slate-300 p-2 text-sm";
const label = "mb-1 mt-3 block text-xs font-semibold uppercase tracking-wide text-slate-500";

export default function SlideForm({ action, slide, submitLabel }) {
  const s = slide || {};
  const days = String(s.weekdays || "").split(",").filter(Boolean).map(Number);
  return (
    <form action={action}>
      {s.id && <input type="hidden" name="id" value={s.id} />}

      <label className={label}>Titel (det store hovedbudskab)</label>
      <input name="title" defaultValue={s.title || ""} required maxLength={120} className={input} />

      <label className={label}>Undertitel</label>
      <input name="subtitle" defaultValue={s.subtitle || ""} maxLength={200} className={input} />

      <label className={label}>Brødtekst (kort)</label>
      <textarea name="body" defaultValue={s.body || ""} rows={2} maxLength={600} className={input} />

      <label className={label}>Punkter (ét pr. linje, 3–8 anbefales)</label>
      <textarea name="bullet_points" defaultValue={s.bullet_points || ""} rows={6} maxLength={1500} className={input} />

      <label className={label}>Afsluttende slogan</label>
      <input name="footer_text" defaultValue={s.footer_text || ""} maxLength={250} className={input} />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>Kategori</label>
          <select name="category" defaultValue={s.category || "Generel information"} className={input}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>Ikon / emoji</label>
          <input name="icon" defaultValue={s.icon || ""} maxLength={20} placeholder="☀️" className={input} />
        </div>
        <div>
          <label className={label}>Baggrund</label>
          <select name="background_type" defaultValue={s.background_type || "solskin"} className={input}>
            {BACKGROUNDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>Tekstfarve</label>
          <select name="text_color" defaultValue={s.text_color || "moerk"} className={input}>
            <option value="moerk">Mørk tekst</option>
            <option value="lys">Lys tekst</option>
          </select>
        </div>
        <div>
          <label className={label}>Tekstplacering</label>
          <select name="text_alignment" defaultValue={s.text_alignment || "venstre"} className={input}>
            <option value="venstre">Venstre</option>
            <option value="center">Centreret</option>
          </select>
        </div>
        <div>
          <label className={label}>Visningstid (sek., tom = standard)</label>
          <input name="display_duration" type="number" min={3} max={120} defaultValue={s.display_duration || ""} className={input} />
        </div>
        <div>
          <label className={label}>Prioritet</label>
          <select name="priority" defaultValue={String(s.priority || 1)} className={input}>
            <option value="1">Normal</option>
            <option value="2">Vigtig (vises dobbelt så ofte)</option>
          </select>
        </div>
        <div>
          <label className={label}>Billede-URL (vises i siden)</label>
          <input name="image_url" defaultValue={s.image_url || ""} maxLength={500} placeholder="https://..." className={input} />
        </div>
      </div>

      <label className={label}>Baggrundsbillede-URL (kun ved baggrund = billede)</label>
      <input name="background_image_url" defaultValue={s.background_image_url || ""} maxLength={500} placeholder="https://..." className={input} />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>Startdato (valgfri)</label>
          <input name="start_date" type="date" defaultValue={s.start_date || ""} className={input} />
        </div>
        <div>
          <label className={label}>Slutdato (valgfri)</label>
          <input name="end_date" type="date" defaultValue={s.end_date || ""} className={input} />
        </div>
      </div>

      <label className={label}>Ugedage (ingen markeret = alle dage)</label>
      <div className="flex flex-wrap gap-3">
        {DAY_NAMES.map((name, i) => (
          <label key={name} className="flex items-center gap-1.5 text-sm text-slate-700">
            <input type="checkbox" name={`day_${i + 1}`} defaultChecked={days.includes(i + 1)} />
            {name}
          </label>
        ))}
      </div>

      <button type="submit" className="btn-primary mt-4">{submitLabel}</button>
    </form>
  );
}
