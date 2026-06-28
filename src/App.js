import { useState, useRef, useEffect } from "react";
import { db } from "./firebase";
import { collection, addDoc, onSnapshot, orderBy, query, serverTimestamp } from "firebase/firestore";

// ─── DATA ────────────────────────────────────────────────────────────────────

const OUVRAGES = [
  { id: "fenetre", label: "Fenêtre", icon: "🪟" },
  { id: "porte", label: "Porte", icon: "🚪" },
  { id: "volet_roulant", label: "Volet roulant", icon: "⬛" },
  { id: "volet_battant", label: "Volet battant", icon: "🔲" },
  { id: "coulissant", label: "Coulissant", icon: "↔️" },
  { id: "portail", label: "Portail", icon: "🏗️" },
  { id: "cloture", label: "Clôture", icon: "🔗" },
  { id: "pergola", label: "Pergola", icon: "⛺" },
  { id: "veranda", label: "Véranda", icon: "🏠" },
  { id: "store_banne", label: "Store banne", icon: "☂️" },
  { id: "store_interieur", label: "Store intérieur", icon: "🪟" },
  { id: "garage", label: "Porte de garage", icon: "🚗" },
  { id: "autre", label: "Autre", icon: "➕" },
];

const RAL_COLORS = [
  { code: "RAL 9016", name: "Blanc signalisation", hex: "#F1F0EA" },
  { code: "RAL 9010", name: "Blanc pur", hex: "#F4F4F4" },
  { code: "RAL 9005", name: "Noir foncé", hex: "#0A0A0A" },
  { code: "RAL 7016", name: "Gris anthracite", hex: "#383E42" },
  { code: "RAL 7015", name: "Gris ardoise", hex: "#5C6268" },
  { code: "RAL 7035", name: "Gris clair", hex: "#CBD0CC" },
  { code: "RAL 8014", name: "Brun sépia", hex: "#4E3B2A" },
  { code: "RAL 8017", name: "Brun chocolat", hex: "#3E2723" },
  { code: "RAL 6005", name: "Vert mousse", hex: "#2D4A3E" },
  { code: "RAL 5010", name: "Bleu gentiane", hex: "#1F4788" },
  { code: "RAL 3009", name: "Rouge oxyde", hex: "#6D2B2B" },
  { code: "RAL 1013", name: "Blanc perlé", hex: "#EAE6D7" },
  { code: "RAL 1015", name: "Ivoire clair", hex: "#E8DABE" },
  { code: "RAL 6009", name: "Vert sapin", hex: "#27352A" },
  { code: "RAL 8019", name: "Gris brun", hex: "#3D3635" },
];

const OUTILS_SPECIAUX = [
  "Échelle > 6m", "Nacelle / échafaudage", "Perceuse à percussion",
  "Meuleuse", "Niveau laser", "Chalumeau / décapeur",
  "Aspirateur industriel", "Clé dynamométrique",
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const getOuvrage = (id) => OUVRAGES.find((o) => o.id === id);
const couleurLabel = (item) =>
  item.couleurRAL ? `${item.couleurRAL.code} — ${item.couleurRAL.name}` : item.couleurCustom || "Non définie";

const emptyItem = () => ({
  uid: Date.now() + Math.random(),
  type: "", labelAutre: "", largeur: "", hauteur: "",
  avecProfondeur: false, profondeur: "", reference: "",
  couleurRAL: null, couleurCustom: "", bicolore: false,
  couleurInt: null, couleurIntCustom: "", notes: "", photos: [],
});

const emptyForm = () => ({
  chantierNom: "", chantierAdresse: "", clientNom: "", clientTel: "", technicien: "",
  date: new Date().toISOString().slice(0, 10),
  items: [], promesses: "", outils: [], observations: "", photos: [],
  sigMacon: null, sigClient: null, nomMacon: "", nomClient: "",
});

// ─── STYLES ──────────────────────────────────────────────────────────────────

const C = { orange: "#E8500A", dark: "#1A1A1A", bg: "#F5F4F0", white: "#fff", gray: "#888", light: "#E0DDD8", soft: "#FAFAFA", border: "#F0EEE9" };

const S = {
  app: { minHeight: "100vh", background: C.bg, fontFamily: "'Inter', system-ui, sans-serif", color: C.dark },
  header: { background: "#1C1C1C", padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 100 },
  headerLogo: { width: 34, height: 34, background: C.orange, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 },
  body: { maxWidth: 640, margin: "0 auto", padding: "18px 14px 60px" },
  card: { background: C.white, borderRadius: 14, padding: 18, marginBottom: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
  cardTitle: { fontSize: 12, fontWeight: 700, color: C.gray, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 },
  label: { fontSize: 13, fontWeight: 600, color: "#444", marginBottom: 5, display: "block" },
  input: { width: "100%", padding: "11px 13px", borderRadius: 10, border: `1.5px solid ${C.light}`, fontSize: 15, fontFamily: "inherit", background: C.soft, boxSizing: "border-box", marginBottom: 12, outline: "none" },
  textarea: { width: "100%", padding: "11px 13px", borderRadius: 10, border: `1.5px solid ${C.light}`, fontSize: 14, fontFamily: "inherit", background: C.soft, boxSizing: "border-box", marginBottom: 12, outline: "none", resize: "vertical", minHeight: 70 },
  row: { display: "flex", gap: 10 },
  flex1: { flex: 1 },
  btnPrimary: { width: "100%", padding: "15px", background: C.orange, color: "#fff", border: "none", borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: "pointer", marginTop: 6 },
  btnSecondary: { width: "100%", padding: "13px", background: "#F0EEE9", color: "#333", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", marginTop: 6 },
  btnSmall: { padding: "8px 14px", background: "#F0EEE9", color: "#555", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btnDanger: { padding: "8px 14px", background: "#FEE8E8", color: "#C0392B", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btnGreen: { width: "100%", padding: "15px", background: "#2E7D32", color: "#fff", border: "none", borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: "pointer", marginTop: 6 },
  checkRow: { display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: `1px solid ${C.border}`, cursor: "pointer" },
  checkbox: (c) => ({ width: 22, height: 22, borderRadius: 6, border: c ? "none" : "2px solid #CCC", background: c ? C.orange : C.white, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }),
  tag: (g) => ({ display: "inline-block", padding: "3px 9px", background: g ? "#E8F5E9" : "#FFF0E8", color: g ? "#2E7D32" : C.orange, borderRadius: 20, fontSize: 11, fontWeight: 600, marginRight: 5, marginBottom: 5 }),
  ouvrageGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 },
  ouvrageBtn: (a) => ({ background: a ? C.orange : "#F5F4F0", border: a ? `2px solid ${C.orange}` : "2px solid transparent", borderRadius: 12, padding: "11px 6px", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, cursor: "pointer" }),
  ralGrid: { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 7 },
  ralSwatch: (s, h) => ({ width: "100%", aspectRatio: "1", borderRadius: 7, background: h, border: s ? `3px solid ${C.orange}` : `2px solid ${C.light}`, cursor: "pointer", transform: s ? "scale(1.12)" : "scale(1)" }),
  photoGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 8 },
  photoThumb: { aspectRatio: "1", borderRadius: 9, objectFit: "cover", width: "100%", border: `2px solid ${C.light}` },
  photoAdd: { aspectRatio: "1", borderRadius: 9, border: "2px dashed #CCC", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", background: "#F9F8F5", gap: 3 },
  sigCanvas: { border: `2px solid ${C.light}`, borderRadius: 12, background: C.soft, width: "100%", touchAction: "none", cursor: "crosshair", display: "block" },
  itemCard: { background: "#FFF8F5", border: `1.5px solid #FFDCC8`, borderRadius: 12, padding: 13, marginBottom: 10 },
  itemNum: { width: 26, height: 26, borderRadius: "50%", background: C.orange, color: "#fff", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  summaryRow: { display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13, gap: 10 },
  summaryKey: { color: C.gray, fontWeight: 500, flexShrink: 0 },
  summaryVal: { color: C.dark, fontWeight: 600, textAlign: "right" },
};

// ─── SIGNATURE CANVAS ────────────────────────────────────────────────────────

function SignatureCanvas({ label, onSave }) {
  const ref = useRef(null);
  const drawing = useRef(false);
  const [signed, setSigned] = useState(false);
  const getPos = (e, c) => {
    const r = c.getBoundingClientRect();
    if (e.touches) return { x: (e.touches[0].clientX - r.left) * (c.width / r.width), y: (e.touches[0].clientY - r.top) * (c.height / r.height) };
    return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) };
  };
  const start = (e) => { e.preventDefault(); drawing.current = true; const c = ref.current; const ctx = c.getContext("2d"); const p = getPos(e, c); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
  const draw = (e) => { e.preventDefault(); if (!drawing.current) return; const c = ref.current; const ctx = c.getContext("2d"); ctx.strokeStyle = "#1A1A1A"; ctx.lineWidth = 2.5; ctx.lineCap = "round"; const p = getPos(e, c); ctx.lineTo(p.x, p.y); ctx.stroke(); setSigned(true); };
  const stop = (e) => { e?.preventDefault(); drawing.current = false; if (signed && ref.current) onSave(ref.current.toDataURL()); };
  const clear = () => { ref.current.getContext("2d").clearRect(0, 0, ref.current.width, ref.current.height); setSigned(false); onSave(null); };
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, color: C.gray, marginBottom: 5, fontStyle: "italic" }}>{label}</div>
      <canvas ref={ref} width={560} height={150} style={{ ...S.sigCanvas, height: 110 }}
        onMouseDown={start} onMouseMove={draw} onMouseUp={stop} onMouseLeave={stop}
        onTouchStart={start} onTouchMove={draw} onTouchEnd={stop} />
      <div style={{ display: "flex", gap: 8, marginTop: 5 }}>
        {signed && <button style={S.btnSmall} onClick={stop}>✅ Valider</button>}
        <button style={S.btnDanger} onClick={clear}>🗑️ Effacer</button>
      </div>
    </div>
  );
}

// ─── RAL PICKER ──────────────────────────────────────────────────────────────

function RalPicker({ value, customValue, onChange, onCustomChange }) {
  return (
    <div>
      <div style={S.ralGrid}>
        {RAL_COLORS.map((c) => (
          <div key={c.code} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <div style={S.ralSwatch(value?.code === c.code, c.hex)} onClick={() => { onChange(value?.code === c.code ? null : c); onCustomChange(""); }} title={`${c.code}`} />
            <span style={{ fontSize: 7, color: C.gray, textAlign: "center" }}>{c.code.replace("RAL ", "")}</span>
          </div>
        ))}
      </div>
      <input style={{ ...S.input, marginTop: 8, marginBottom: 4 }} value={customValue} placeholder="Ou saisir RAL personnalisé…"
        onChange={(e) => { onCustomChange(e.target.value); onChange(null); }} />
      {value && <div style={{ fontSize: 12, color: C.orange, fontWeight: 700, marginBottom: 6 }}>✓ {value.code} — {value.name}</div>}
    </div>
  );
}

// ─── ADD ITEM FORM ────────────────────────────────────────────────────────────

function AddItemForm({ onValidate, onCancel, index }) {
  const [item, setItem] = useState(emptyItem());
  const fileRef = useRef(null);
  const upd = (k, v) => setItem((p) => ({ ...p, [k]: v }));
  const handlePhoto = (e) => {
    Array.from(e.target.files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => setItem((p) => ({ ...p, photos: [...p.photos, ev.target.result] }));
      reader.readAsDataURL(file);
    });
  };
  const canValidate = item.type && item.largeur && item.hauteur;

  return (
    <div style={{ ...S.card, border: `2px solid ${C.orange}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={S.itemNum}>{index}</div>
          <span style={{ fontSize: 15, fontWeight: 700 }}>Nouveau relevé</span>
        </div>
        {onCancel && <button style={S.btnDanger} onClick={onCancel}>✕ Annuler</button>}
      </div>

      <div style={S.cardTitle}>Type d'ouvrage</div>
      <div style={S.ouvrageGrid}>
        {OUVRAGES.map((o) => (
          <button key={o.id} style={S.ouvrageBtn(item.type === o.id)} onClick={() => upd("type", o.id)}>
            <span style={{ fontSize: 22 }}>{o.icon}</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: item.type === o.id ? "#fff" : "#333", textAlign: "center" }}>{o.label}</span>
          </button>
        ))}
      </div>
      {item.type === "autre" && (
        <div style={{ marginTop: 10 }}>
          <label style={S.label}>Préciser</label>
          <input style={S.input} value={item.labelAutre} onChange={(e) => upd("labelAutre", e.target.value)} placeholder="Ex: Claustra, moustiquaire…" />
        </div>
      )}

      {item.type && (
        <>
          <div style={{ marginTop: 14 }}>
            <label style={S.label}>Référence / modèle</label>
            <input style={S.input} value={item.reference} onChange={(e) => upd("reference", e.target.value)} placeholder="Ex: Oknoplast PIXEL, Bubendorff…" />
          </div>

          <div style={S.cardTitle}>📐 Dimensions (mm)</div>
          <div style={S.row}>
            <div style={S.flex1}><label style={S.label}>Largeur *</label><input style={S.input} type="number" value={item.largeur} onChange={(e) => upd("largeur", e.target.value)} placeholder="1200" /></div>
            <div style={S.flex1}><label style={S.label}>Hauteur *</label><input style={S.input} type="number" value={item.hauteur} onChange={(e) => upd("hauteur", e.target.value)} placeholder="1400" /></div>
          </div>

          <div style={{ ...S.checkRow, marginBottom: 10 }} onClick={() => upd("avecProfondeur", !item.avecProfondeur)}>
            <div style={S.checkbox(item.avecProfondeur)}>{item.avecProfondeur && <span style={{ color: "#fff", fontSize: 13 }}>✓</span>}</div>
            <span style={{ fontSize: 13 }}>Préciser la profondeur / tableau</span>
          </div>
          {item.avecProfondeur && (
            <div style={{ marginBottom: 10 }}>
              <label style={S.label}>Profondeur (mm)</label>
              <input style={S.input} type="number" value={item.profondeur} onChange={(e) => upd("profondeur", e.target.value)} placeholder="80" />
            </div>
          )}
          {item.largeur && item.hauteur && (
            <div style={{ background: "#FFF0E8", borderRadius: 8, padding: "7px 12px", marginBottom: 12, fontSize: 12, color: C.orange, fontWeight: 700 }}>
              📏 Surface : {((+item.largeur * +item.hauteur) / 1000000).toFixed(3)} m²
            </div>
          )}

          <div style={S.cardTitle}>🎨 Couleur RAL extérieure</div>
          <RalPicker value={item.couleurRAL} customValue={item.couleurCustom} onChange={(v) => upd("couleurRAL", v)} onCustomChange={(v) => upd("couleurCustom", v)} />

          <div style={S.checkRow} onClick={() => upd("bicolore", !item.bicolore)}>
            <div style={S.checkbox(item.bicolore)}>{item.bicolore && <span style={{ color: "#fff", fontSize: 13 }}>✓</span>}</div>
            <span style={{ fontSize: 13 }}>Bicolore — couleur intérieure différente</span>
          </div>
          {item.bicolore && (
            <div style={{ marginTop: 10 }}>
              <div style={S.cardTitle}>🎨 Couleur RAL intérieure</div>
              <RalPicker value={item.couleurInt} customValue={item.couleurIntCustom || ""} onChange={(v) => upd("couleurInt", v)} onCustomChange={(v) => upd("couleurIntCustom", v)} />
            </div>
          )}

          <div style={{ marginTop: 10 }}>
            <label style={S.label}>Notes / particularités</label>
            <textarea style={S.textarea} value={item.notes} onChange={(e) => upd("notes", e.target.value)} placeholder="Feuillure, tableau biais, obstacle, détail important…" />
          </div>

          <div style={S.cardTitle}>📸 Photos</div>
          <input ref={fileRef} type="file" accept="image/*" multiple capture="environment" style={{ display: "none" }} onChange={handlePhoto} />
          <div style={S.photoGrid}>
            {item.photos.map((p, i) => (
              <div key={i} style={{ position: "relative" }}>
                <img src={p} style={S.photoThumb} alt="" />
                <button onClick={() => setItem((prev) => ({ ...prev, photos: prev.photos.filter((_, j) => j !== i) }))} style={{ position: "absolute", top: 3, right: 3, background: "#C0392B", color: "#fff", border: "none", borderRadius: "50%", width: 20, height: 20, cursor: "pointer", fontSize: 11 }}>✕</button>
              </div>
            ))}
            <div style={S.photoAdd} onClick={() => fileRef.current.click()}>
              <span style={{ fontSize: 26, color: "#CCC" }}>+</span>
              <span style={{ fontSize: 10, color: "#AAA" }}>Photo</span>
            </div>
          </div>

          <button style={{ ...S.btnGreen, opacity: canValidate ? 1 : 0.4 }} onClick={() => canValidate && onValidate(item)} disabled={!canValidate}>
            ✅ Valider ce relevé
          </button>
          {!canValidate && <div style={{ textAlign: "center", fontSize: 12, color: C.gray, marginTop: 4 }}>Largeur et hauteur obligatoires</div>}
        </>
      )}
    </div>
  );
}

// ─── ITEM SUMMARY CARD ───────────────────────────────────────────────────────

function ItemSummaryCard({ item, index, onDelete }) {
  const [open, setOpen] = useState(false);
  const o = getOuvrage(item.type);
  const label = item.type === "autre" ? (item.labelAutre || "Autre") : o?.label;
  return (
    <div style={S.itemCard}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={S.itemNum}>{index}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{o?.icon} {label}</div>
            <div style={{ fontSize: 12, color: C.gray }}>{item.largeur}×{item.hauteur} mm{item.reference ? ` — ${item.reference}` : ""}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button style={S.btnSmall} onClick={() => setOpen(!open)}>{open ? "▲" : "▼"}</button>
          {onDelete && <button style={S.btnDanger} onClick={onDelete}>🗑️</button>}
        </div>
      </div>
      {open && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #FFDCC8" }}>
          {item.avecProfondeur && item.profondeur && <div style={{ fontSize: 12, color: "#555", marginBottom: 3 }}>Profondeur : {item.profondeur} mm</div>}
          <div style={{ fontSize: 12, color: "#555", marginBottom: 3 }}>Couleur ext. : {couleurLabel(item)}</div>
          {item.bicolore && <div style={{ fontSize: 12, color: "#555", marginBottom: 3 }}>Couleur int. : {item.couleurInt ? `${item.couleurInt.code}` : item.couleurIntCustom || "—"}</div>}
          {item.notes && <div style={{ fontSize: 12, color: "#777", fontStyle: "italic" }}>📝 {item.notes}</div>}
          {item.photos?.length > 0 && <div style={S.photoGrid}>{item.photos.map((p, i) => <img key={i} src={p} style={S.photoThumb} alt="" />)}</div>}
        </div>
      )}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

const STEPS = ["Chantier", "Relevés", "Options", "Signatures", "Récap"];

export default function App() {
  const [step, setStep] = useState(0);
  const [fiches, setFiches] = useState([]);
  const [view, setView] = useState("home");
  const [form, setForm] = useState(emptyForm());
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // ── Firestore sync ──
  useEffect(() => {
    const q = query(collection(db, "fiches"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setFiches(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  const addItem = (item) => { setForm((f) => ({ ...f, items: [...f.items, { ...item, uid: Date.now() + Math.random() }] })); setAdding(false); };
  const deleteItem = (uid) => setForm((f) => ({ ...f, items: f.items.filter((i) => i.uid !== uid) }));
  const toggleOutil = (o) => setForm((f) => ({ ...f, outils: f.outils.includes(o) ? f.outils.filter((x) => x !== o) : [...f.outils, o] }));

  const handleGlobalPhoto = (e) => {
    Array.from(e.target.files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => setForm((f) => ({ ...f, photos: [...f.photos, ev.target.result] }));
      reader.readAsDataURL(file);
    });
  };

  const saveFiche = async () => {
    setSaving(true);
    try {
      await addDoc(collection(db, "fiches"), { ...form, createdAt: serverTimestamp() });
      setForm(emptyForm()); setStep(0); setAdding(false); setView("list");
    } catch (e) {
      alert("Erreur de sauvegarde : " + e.message);
    }
    setSaving(false);
  };

  // ── Steps ──

  const renderStep0 = () => (
    <div>
      <div style={S.card}>
        <div style={S.cardTitle}>Informations chantier</div>
        <label style={S.label}>Nom du chantier / Client</label>
        <input style={S.input} value={form.chantierNom} onChange={(e) => set("chantierNom", e.target.value)} placeholder="Ex: Mme Martin – Manosque" />
        <label style={S.label}>Adresse</label>
        <input style={S.input} value={form.chantierAdresse} onChange={(e) => set("chantierAdresse", e.target.value)} placeholder="12 rue des Lilas, 04100 Manosque" />
        <div style={S.row}>
          <div style={S.flex1}><label style={S.label}>Nom client</label><input style={S.input} value={form.clientNom} onChange={(e) => set("clientNom", e.target.value)} placeholder="Prénom Nom" /></div>
          <div style={S.flex1}><label style={S.label}>Téléphone</label><input style={S.input} value={form.clientTel} onChange={(e) => set("clientTel", e.target.value)} placeholder="06 …" type="tel" /></div>
        </div>
        <div style={S.row}>
          <div style={S.flex1}><label style={S.label}>Technicien</label><input style={S.input} value={form.technicien} onChange={(e) => set("technicien", e.target.value)} placeholder="Prénom" /></div>
          <div style={S.flex1}><label style={S.label}>Date</label><input style={S.input} type="date" value={form.date} onChange={(e) => set("date", e.target.value)} /></div>
        </div>
      </div>
      <button style={S.btnPrimary} onClick={() => setStep(1)} disabled={!form.chantierNom}>Commencer les relevés →</button>
    </div>
  );

  const renderStep1 = () => (
    <div>
      {form.items.length > 0 && (
        <div style={S.card}>
          <div style={S.cardTitle}>✅ Relevés validés ({form.items.length})</div>
          {form.items.map((item, i) => <ItemSummaryCard key={item.uid} item={item} index={i + 1} onDelete={() => deleteItem(item.uid)} />)}
        </div>
      )}
      {adding ? (
        <AddItemForm index={form.items.length + 1} onValidate={addItem} onCancel={form.items.length > 0 ? () => setAdding(false) : null} />
      ) : (
        <button style={{ ...S.btnPrimary, background: form.items.length === 0 ? C.orange : "#333" }} onClick={() => setAdding(true)}>
          ➕ {form.items.length === 0 ? "Ajouter le premier relevé" : "Ajouter un autre relevé"}
        </button>
      )}
      {form.items.length > 0 && !adding && (
        <div style={S.row}>
          <button style={{ ...S.btnSecondary, flex: 1 }} onClick={() => setStep(0)}>← Retour</button>
          <button style={{ ...S.btnPrimary, flex: 2, marginTop: 6 }} onClick={() => setStep(2)}>Options →</button>
        </div>
      )}
      {form.items.length === 0 && !adding && <button style={S.btnSecondary} onClick={() => setStep(0)}>← Retour</button>}
    </div>
  );

  const renderStep2 = () => (
    <div>
      <div style={S.card}>
        <div style={S.cardTitle}>🤝 Promesses faites au client</div>
        <textarea style={S.textarea} value={form.promesses} onChange={(e) => set("promesses", e.target.value)} placeholder={"- Enlever les rideaux avant intervention\n- Protéger le parquet\n- Rappeler le client la veille"} />
      </div>
      <div style={S.card}>
        <div style={S.cardTitle}>🔧 Outils non standards</div>
        {OUTILS_SPECIAUX.map((o) => (
          <div key={o} style={S.checkRow} onClick={() => toggleOutil(o)}>
            <div style={S.checkbox(form.outils.includes(o))}>{form.outils.includes(o) && <span style={{ color: "#fff", fontSize: 13 }}>✓</span>}</div>
            <span style={{ fontSize: 14 }}>{o}</span>
          </div>
        ))}
        <div style={{ marginTop: 10 }}>
          <label style={S.label}>Autre outil</label>
          <input style={{ ...S.input, marginBottom: 0 }} value={form.observations} onChange={(e) => set("observations", e.target.value)} placeholder="Clé Allen M8, outillage spécifique…" />
        </div>
      </div>
      <div style={S.card}>
        <div style={S.cardTitle}>📸 Photos générales du chantier</div>
        <input ref={fileRef} type="file" accept="image/*" multiple capture="environment" style={{ display: "none" }} onChange={handleGlobalPhoto} />
        <div style={S.photoGrid}>
          {form.photos.map((p, i) => (
            <div key={i} style={{ position: "relative" }}>
              <img src={p} style={S.photoThumb} alt="" />
              <button onClick={() => setForm((f) => ({ ...f, photos: f.photos.filter((_, j) => j !== i) }))} style={{ position: "absolute", top: 3, right: 3, background: "#C0392B", color: "#fff", border: "none", borderRadius: "50%", width: 20, height: 20, cursor: "pointer", fontSize: 11 }}>✕</button>
            </div>
          ))}
          <div style={S.photoAdd} onClick={() => fileRef.current.click()}>
            <span style={{ fontSize: 26, color: "#CCC" }}>+</span>
            <span style={{ fontSize: 10, color: "#AAA" }}>Photo</span>
          </div>
        </div>
      </div>
      <div style={S.row}>
        <button style={{ ...S.btnSecondary, flex: 1 }} onClick={() => setStep(1)}>← Relevés</button>
        <button style={{ ...S.btnPrimary, flex: 2, marginTop: 6 }} onClick={() => setStep(3)}>Signatures →</button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div>
      <div style={S.card}>
        <div style={S.cardTitle}>✍️ Signature Poseur</div>
        <label style={S.label}>Nom du poseur</label>
        <input style={S.input} value={form.nomMacon} onChange={(e) => set("nomMacon", e.target.value)} placeholder="Prénom Nom" />
        <SignatureCanvas label="Signer ci-dessous (poseur)" onSave={(d) => set("sigMacon", d)} />
        {form.sigMacon && <img src={form.sigMacon} style={{ height: 55, border: "1px solid #E0DDD8", borderRadius: 8 }} alt="" />}
      </div>
      <div style={S.card}>
        <div style={S.cardTitle}>✍️ Signature Client</div>
        <label style={S.label}>Nom du client</label>
        <input style={S.input} value={form.nomClient} onChange={(e) => set("nomClient", e.target.value)} placeholder="Prénom Nom" />
        <div style={{ background: "#FFFBF0", border: "1px solid #F5D67A", borderRadius: 10, padding: "9px 13px", marginBottom: 12, fontSize: 12, color: "#7A6000" }}>
          ⚠️ En signant, le client confirme avoir contrôlé et validé toutes les mesures et promesses indiquées.
        </div>
        <SignatureCanvas label="Signer ci-dessous (client)" onSave={(d) => set("sigClient", d)} />
        {form.sigClient && <img src={form.sigClient} style={{ height: 55, border: "1px solid #E0DDD8", borderRadius: 8 }} alt="" />}
      </div>
      <div style={S.row}>
        <button style={{ ...S.btnSecondary, flex: 1 }} onClick={() => setStep(2)}>← Retour</button>
        <button style={{ ...S.btnPrimary, flex: 2, marginTop: 6 }} onClick={() => setStep(4)}>Voir le récap →</button>
      </div>
    </div>
  );

  const renderRecap = (readOnly = false) => (
    <div>
      <div style={S.card}>
        <div style={S.cardTitle}>📋 Chantier</div>
        {[["Client", form.chantierNom], ["Adresse", form.chantierAdresse], ["Contact", form.clientNom + (form.clientTel ? ` — ${form.clientTel}` : "")], ["Technicien", form.technicien], ["Date", form.date]].map(([k, v]) =>
          v ? <div key={k} style={S.summaryRow}><span style={S.summaryKey}>{k}</span><span style={S.summaryVal}>{v}</span></div> : null
        )}
      </div>
      <div style={S.card}>
        <div style={S.cardTitle}>📐 Relevés ({form.items.length})</div>
        {form.items.map((item, i) => <ItemSummaryCard key={item.uid || i} item={item} index={i + 1} />)}
      </div>
      {form.promesses && <div style={S.card}><div style={S.cardTitle}>🤝 Promesses</div><p style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-line", color: "#333", margin: 0 }}>{form.promesses}</p></div>}
      {form.outils.length > 0 && <div style={S.card}><div style={S.cardTitle}>🔧 Outils</div>{form.outils.map((o) => <span key={o} style={S.tag()}>{o}</span>)}{form.observations && <p style={{ fontSize: 12, color: "#555", marginTop: 6, margin: 0 }}>{form.observations}</p>}</div>}
      {form.photos.length > 0 && <div style={S.card}><div style={S.cardTitle}>📸 Photos chantier</div><div style={S.photoGrid}>{form.photos.map((p, i) => <img key={i} src={p} style={S.photoThumb} alt="" />)}</div></div>}
      <div style={S.card}>
        <div style={S.cardTitle}>✍️ Signatures</div>
        <div style={S.row}>
          <div style={S.flex1}>
            <div style={{ fontSize: 11, color: C.gray, marginBottom: 4 }}>Poseur — {form.nomMacon || "—"}</div>
            {form.sigMacon ? <img src={form.sigMacon} style={{ width: "100%", height: 65, border: "1px solid #E0DDD8", borderRadius: 8, objectFit: "contain" }} alt="" /> : <div style={{ height: 65, border: "2px dashed #CCC", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#CCC", fontSize: 11 }}>Non signé</div>}
          </div>
          <div style={S.flex1}>
            <div style={{ fontSize: 11, color: C.gray, marginBottom: 4 }}>Client — {form.nomClient || "—"}</div>
            {form.sigClient ? <img src={form.sigClient} style={{ width: "100%", height: 65, border: "1px solid #E0DDD8", borderRadius: 8, objectFit: "contain" }} alt="" /> : <div style={{ height: 65, border: "2px dashed #CCC", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#CCC", fontSize: 11 }}>Non signé</div>}
          </div>
        </div>
      </div>
      {!readOnly && (
        <>
          <button style={{ ...S.btnPrimary, opacity: saving ? 0.6 : 1 }} onClick={saveFiche} disabled={saving}>
            {saving ? "⏳ Enregistrement…" : "☁️ Enregistrer & synchroniser"}
          </button>
          <button style={S.btnSecondary} onClick={() => setStep(3)}>← Modifier</button>
        </>
      )}
    </div>
  );

  const renderNew = () => (
    <div>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
        {STEPS.map((s, i) => (
          <div key={s} style={{ display: "flex", alignItems: "center", flex: 1 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", background: step >= i ? C.orange : "#D0CEC9", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 700 }}>{step > i ? "✓" : i + 1}</div>
              <div style={{ fontSize: 8, fontWeight: step === i ? 700 : 400, color: step === i ? C.orange : "#999", textTransform: "uppercase", textAlign: "center" }}>{s}</div>
            </div>
            {i < STEPS.length - 1 && <div style={{ flex: 1, height: 2, background: step > i ? C.orange : "#D0CEC9", marginBottom: 14 }} />}
          </div>
        ))}
      </div>
      {step === 0 && renderStep0()}
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
      {step === 4 && renderRecap(false)}
    </div>
  );

  return (
    <div style={S.app}>
      <div style={S.header}>
        <div style={S.headerLogo}>🏗️</div>
        <div>
          <div style={{ color: "#fff", fontSize: 15, fontWeight: 700 }}>Isol Confort</div>
          <div style={{ color: "#777", fontSize: 11 }}>Prise de mesure terrain</div>
        </div>
        {view !== "home" && (
          <button onClick={() => { setView("home"); setStep(0); setAdding(false); }} style={{ marginLeft: "auto", background: "transparent", border: "1px solid #444", color: "#CCC", borderRadius: 8, padding: "5px 11px", fontSize: 11, cursor: "pointer" }}>🏠</button>
        )}
      </div>
      <div style={S.body}>
        {view === "home" && (
          <div>
            <div style={{ textAlign: "center", padding: "36px 0 26px" }}>
              <div style={{ fontSize: 56, marginBottom: 10 }}>📐</div>
              <div style={{ fontSize: 21, fontWeight: 800, marginBottom: 5 }}>Prise de mesure</div>
              <div style={{ fontSize: 13, color: C.gray }}>Isol Confort — Outil terrain</div>
            </div>
            <button style={{ ...S.btnPrimary, fontSize: 17, padding: 18 }} onClick={() => { setForm(emptyForm()); setStep(0); setAdding(false); setView("new"); }}>
              ➕ Nouvelle fiche de mesure
            </button>
            <button style={S.btnSecondary} onClick={() => setView("list")}>
              📁 Fiches enregistrées {loading ? "…" : `(${fiches.length})`}
            </button>
            <div style={{ ...S.card, marginTop: 22, background: "#FFF0E8", boxShadow: "none" }}>
              <div style={{ fontSize: 12, color: C.orange, fontWeight: 700, marginBottom: 5 }}>☁️ Synchronisation active</div>
              <div style={{ fontSize: 12, color: "#7A3800", lineHeight: 1.7 }}>
                Toutes les fiches sont sauvegardées en temps réel et accessibles par tous les employés depuis n'importe quel appareil.
              </div>
            </div>
          </div>
        )}
        {view === "new" && renderNew()}
        {view === "list" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
              <button style={S.btnSmall} onClick={() => setView("home")}>← Retour</button>
              <span style={{ fontSize: 17, fontWeight: 800 }}>Fiches ({fiches.length})</span>
            </div>
            {loading && <div style={{ textAlign: "center", color: "#AAA", padding: 40 }}>⏳ Chargement…</div>}
            {!loading && fiches.length === 0 && <div style={{ textAlign: "center", color: "#AAA", padding: 40 }}>Aucune fiche enregistrée</div>}
            {fiches.map((f) => (
              <div key={f.id} style={{ ...S.card, cursor: "pointer" }} onClick={() => { setForm(f); setView("detail"); }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{f.chantierNom}</div>
                    <div style={{ color: C.gray, fontSize: 12, marginTop: 2 }}>{f.chantierAdresse}</div>
                    <div style={{ marginTop: 7 }}>
                      {(f.items || []).map((item, i) => { const o = getOuvrage(item.type); return <span key={i} style={S.tag()}>{o?.icon} {item.type === "autre" ? item.labelAutre : o?.label}</span>; })}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 11, color: C.gray }}>{f.date}</div>
                    <div style={{ fontSize: 11, color: C.gray }}>{(f.items || []).length} relevé(s)</div>
                    <div style={{ marginTop: 5 }}>
                      {f.sigClient && <span style={S.tag("green")}>✅ Client</span>}
                      {f.sigMacon && <span style={S.tag("green")}>✅ Poseur</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {view === "detail" && (
          <div>
            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              <button style={S.btnSmall} onClick={() => setView("list")}>← Retour</button>
              <span style={{ fontSize: 17, fontWeight: 800, flex: 1 }}>{form.chantierNom}</span>
            </div>
            {renderRecap(true)}
          </div>
        )}
      </div>
    </div>
  );
}
