import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

type Stone = {
  id: number; file: string; label: string; mark: string;
  capacityHrs: number; entries: number; bytes: number;
  lastWrite: string; latestLine: string; latestSrc: string; holds: string; ord: number;
};
type Opt = { label: string; line: string; stone?: string };
type Card = {
  id: number; kind: string; source: string; title: string; detail: string; meta: string;
  question: string; options: Opt[]; stoneFile: string; ord: number;
  fromName?: string; fromEmail?: string; snippet?: string; receivedAt?: string;
  unread?: number; whenLabel?: string; location?: string; recurrence?: string;
};

const EMBER = "#FE6427";
const CREAM = "#EFEAE3";

// sender domain -> registrable domain, so brand logos resolve
// (team@ohhey.depop.com -> depop.com, info@email.meetup.com -> meetup.com)
function brandDomain(email: string) {
  const at = email.lastIndexOf("@");
  const host = (at >= 0 ? email.slice(at + 1) : email).trim().toLowerCase();
  const parts = host.split(".").filter(Boolean);
  if (parts.length <= 2) return host;
  return parts.slice(-2).join(".");
}

function heatOf(s: Stone, now: number) {
  const hrs = (now - Date.parse(s.lastWrite)) / 36e5;
  const halfLife = s.capacityHrs / 6;
  const v = Math.max(0, Math.min(1, Math.pow(0.5, Math.max(0, hrs) / halfLife)));
  let level = "COLD";
  if (v > 0.85) level = "BLAZING";
  else if (v > 0.55) level = "HOT";
  else if (v > 0.28) level = "WARM";
  else if (v > 0.1) level = "COOL";
  return { v, level, hrs };
}

function holdLabel(cap: number) {
  if (cap >= 600) return "holds for weeks";
  if (cap >= 300) return "holds for days";
  if (cap >= 150) return "holds about a day";
  return "cold by morning";
}

function ago(hrs: number) {
  if (hrs < 0.02) return "just now";
  if (hrs < 1) return Math.round(hrs * 60) + " min ago";
  if (hrs < 48) return Math.round(hrs * 10) / 10 + " hr ago";
  return Math.round(hrs / 24 * 10) / 10 + " days ago";
}

function polyPoints(size: number, seed: number) {
  const pts: string[] = [];
  const k = 8;
  for (let i = 0; i < k; i++) {
    const ang = (i / k) * Math.PI * 2 - Math.PI / 2;
    const wobble = 0.74 + 0.26 * Math.abs(Math.sin(seed * 3.7 + i * 2.1));
    const r = size * 0.46 * wobble;
    pts.push((size / 2 + r * Math.cos(ang)).toFixed(1) + "," + (size / 2 + r * Math.sin(ang)).toFixed(1));
  }
  return pts.join(" ");
}

function StoneSvg({ s, now, size, selected, onClick }: {
  s: Stone; now: number; size: number; selected: boolean; onClick: () => void;
}) {
  const { v, level } = heatOf(s, now);
  const gid = "h" + s.id;
  return (
    <div onClick={onClick}
         style={{ cursor: "pointer", textAlign: "center", transition: "transform .3s ease",
                  transform: selected ? "translateY(-8px)" : "none" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block", overflow: "visible" }}>
        <defs>
          <radialGradient id={gid} cx="50%" cy="50%" r="54%">
            <stop offset="0%" stopColor={EMBER} stopOpacity={(v * 0.75).toFixed(2)} />
            <stop offset="52%" stopColor={EMBER} stopOpacity={(v * 0.3).toFixed(2)} />
            <stop offset="100%" stopColor={EMBER} stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={size / 2 - 2} fill={`url(#${gid})`} />
        <polygon points={polyPoints(size, s.ord + 1)} fill={CREAM}
                 stroke={selected ? CREAM : "none"} strokeWidth={selected ? 3 : 0} />
        <text x={size / 2} y={size / 2 + size * 0.15} fontSize={size * 0.32}
              textAnchor="middle" fontFamily="Archivo, sans-serif" fontWeight={800} fill="#1b1b1b">
          {s.mark}
        </text>
      </svg>
      <div style={{ fontFamily: "Archivo, sans-serif", fontSize: 11, letterSpacing: ".13em",
                    textTransform: "uppercase", color: "#8b8a8e", marginTop: 6, lineHeight: 1.7 }}>
        <b style={{ color: CREAM, fontWeight: 700 }}>{s.label}</b><br />
        <span style={{ color: EMBER }}>{level}</span>
      </div>
    </div>
  );
}

function optBtn(): React.CSSProperties {
  return {
    width: "100%", textAlign: "left", padding: "13px 15px", borderRadius: 12, cursor: "pointer",
    fontFamily: "Manrope, sans-serif", fontWeight: 600, fontSize: 14.5, lineHeight: 1.35,
    border: "1px solid #3a3c3f", background: "transparent", color: "#e6e2db", marginBottom: 8,
  };
}

function ColdStart({ cards, onDone }: { cards: Card[]; onDone: (warmed: string[]) => void }) {
  const [i, setI] = useState(0);
  const [written, setWritten] = useState<{ line: string; stone: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [ownOpen, setOwnOpen] = useState(false);
  const [own, setOwn] = useState("");
  const card = cards[i];
  const total = cards.length;

  async function send(payload: { optionIndex?: number; customLine?: string }) {
    if (!card || busy) return;
    setBusy(true);
    try {
      const r = await fetch("/api/answer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cardId: card.id, ...payload }),
      });
      const j = await r.json();
      const next = [...written, { line: j.line as string, stone: j.stoneFile as string }];
      setWritten(next);
      setOwn("");
      setOwnOpen(false);
      if (i + 1 >= total) onDone(next.map((w) => w.stone));
      else setI(i + 1);
    } finally {
      setBusy(false);
    }
  }

  if (!card) return null;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "10px 0 40px" }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 26 }}>
        {cards.map((_, n) => (
          <div key={n} style={{ height: 3, flex: 1, borderRadius: 2,
            background: n < i ? EMBER : n === i ? "rgba(254,100,39,.45)" : "#3a3c3f" }} />
        ))}
      </div>

      <div style={{ fontFamily: "Archivo, sans-serif", fontSize: 11, letterSpacing: ".14em",
                    textTransform: "uppercase", color: "#8b8a8e", marginBottom: 14 }}>
        {i + 1} of {total} · from your {card.source}
      </div>

      {card.kind === "email" ? (
        <div style={{ background: "#141617", border: "1px solid #3a3c3f", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px",
                        borderBottom: "1px solid #2a2c2e", background: "#1b1d1e" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#8b8a8e" strokeWidth="1.8">
              <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m2 7 10 6 10-6" />
            </svg>
            <span style={{ fontFamily: "Archivo, sans-serif", fontSize: 10.5, letterSpacing: ".12em",
                           textTransform: "uppercase", color: "#8b8a8e" }}>{card.source}</span>
            {card.unread ? (
              <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6,
                             fontFamily: "Archivo, sans-serif", fontSize: 10, letterSpacing: ".12em",
                             textTransform: "uppercase", color: EMBER }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: EMBER }} />unread
              </span>
            ) : null}
          </div>
          <div style={{ display: "flex", gap: 12, padding: "15px 16px 16px" }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, flex: "none", overflow: "hidden",
                          background: "#fff", display: "flex",
                          alignItems: "center", justifyContent: "center" }}>
              <img
                src={`https://www.google.com/s2/favicons?sz=128&domain=${brandDomain(card.fromEmail || "")}`}
                alt=""
                width={24}
                height={24}
                style={{ display: "block" }}
                onError={(e: any) => {
                  const el = e.currentTarget as HTMLImageElement;
                  el.style.display = "none";
                  const parent = el.parentElement;
                  if (parent) {
                    parent.style.background = "#3a3c3f";
                    parent.style.color = CREAM;
                    parent.style.fontFamily = "Archivo, sans-serif";
                    parent.style.fontWeight = "700";
                    parent.style.fontSize = "15px";
                    parent.textContent = (card.fromName || card.fromEmail || "?").trim().charAt(0).toUpperCase();
                  }
                }}
              />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 14.5, color: CREAM }}>
                  {card.fromName || card.fromEmail}
                </span>
                {card.receivedAt ? (
                  <span style={{ marginLeft: "auto", fontSize: 12, color: "#6f6e73", whiteSpace: "nowrap" }}>
                    {card.receivedAt}
                  </span>
                ) : null}
              </div>
              {card.fromEmail && card.fromName ? (
                <div style={{ fontSize: 12, color: "#6f6e73", marginTop: 1 }}>{card.fromEmail}</div>
              ) : null}
              <div style={{ fontWeight: 600, fontSize: 15.5, lineHeight: 1.35, color: CREAM, marginTop: 8 }}>
                {card.title}
              </div>
              {card.snippet ? (
                <div style={{ fontSize: 13.5, lineHeight: 1.5, color: "#8b8a8e", marginTop: 5 }}>
                  {card.snippet}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ background: "#141617", border: "1px solid #3a3c3f", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px",
                        borderBottom: "1px solid #2a2c2e", background: "#1b1d1e" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#8b8a8e" strokeWidth="1.8">
              <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            <span style={{ fontFamily: "Archivo, sans-serif", fontSize: 10.5, letterSpacing: ".12em",
                           textTransform: "uppercase", color: "#8b8a8e" }}>{card.source}</span>
            {card.recurrence ? (
              <span style={{ marginLeft: "auto", fontFamily: "Archivo, sans-serif", fontSize: 10,
                             letterSpacing: ".12em", textTransform: "uppercase", color: "#8b8a8e" }}>
                {card.recurrence}
              </span>
            ) : null}
          </div>
          <div style={{ padding: "16px" }}>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ width: 4, borderRadius: 3, background: EMBER, flex: "none" }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: "Archivo, sans-serif", fontWeight: 700, fontSize: 17,
                              lineHeight: 1.25, color: CREAM }}>{card.title}</div>
                {card.whenLabel ? (
                  <div style={{ fontSize: 13.5, color: "#b9b5ae", marginTop: 5 }}>{card.whenLabel}</div>
                ) : null}
                {card.location ? (
                  <div style={{ fontSize: 13, color: "#8b8a8e", marginTop: 3 }}>{card.location}</div>
                ) : null}
              </div>
            </div>
            {card.detail ? (
              <div style={{ fontSize: 13.5, lineHeight: 1.55, color: "#8b8a8e", marginTop: 12,
                            borderTop: "1px solid #2a2c2e", paddingTop: 11 }}>{card.detail}</div>
            ) : null}
          </div>
        </div>
      )}

      <div style={{ fontSize: 16, lineHeight: 1.5, margin: "22px 0 14px", color: CREAM }}>{card.question}</div>

      {card.options.map((o, n) => (
        <button key={n} onClick={() => send({ optionIndex: n })} disabled={busy} style={optBtn()}>{o.label}</button>
      ))}

      {!ownOpen ? (
        <button onClick={() => setOwnOpen(true)} disabled={busy}
                style={{ width: "100%", textAlign: "left", padding: "13px 15px", borderRadius: 12,
                         cursor: "pointer", background: "rgba(254,100,39,.09)",
                         border: `1px dashed ${EMBER}`, color: "#FFB694",
                         fontFamily: "Manrope, sans-serif", fontWeight: 600, fontSize: 14.5,
                         display: "flex", alignItems: "center", gap: 9, marginTop: 2 }}>
          <span style={{ fontSize: 17, lineHeight: 1 }}>+</span>
          None of these — I'd do something else
        </button>
      ) : (
        <div style={{ marginTop: 6 }}>
          <textarea
            value={own}
            onChange={(e) => setOwn((e.target as HTMLTextAreaElement).value)}
            placeholder="What would you actually do? This gets written down word for word."
            rows={3}
            style={{ width: "100%", background: "#1e2022", border: `1px solid ${EMBER}`, borderRadius: 12,
                     color: CREAM, padding: "12px 14px", fontFamily: "Manrope, sans-serif",
                     fontSize: 14.5, lineHeight: 1.45, resize: "vertical" }}
          />
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button onClick={() => send({ customLine: own })} disabled={busy || !own.trim()}
                    style={{ ...optBtn(), width: "auto", marginBottom: 0, fontFamily: "Archivo, sans-serif",
                             fontWeight: 700, fontSize: 13, letterSpacing: ".04em",
                             border: "1px solid rgba(254,100,39,.5)", background: "rgba(254,100,39,.14)",
                             color: "#FFB694", opacity: own.trim() ? 1 : 0.45 }}>
              Write that down
            </button>
            <button onClick={() => { setOwnOpen(false); setOwn(""); }}
                    style={{ background: "none", border: 0, cursor: "pointer", color: "#8b8a8e",
                             fontFamily: "Archivo, sans-serif", fontSize: 11, letterSpacing: ".12em",
                             textTransform: "uppercase" }}>
              cancel
            </button>
          </div>
        </div>
      )}

      {written.length > 0 ? (
        <div style={{ marginTop: 28, borderTop: "1px solid #3a3c3f", paddingTop: 16 }}>
          <div style={{ fontFamily: "Archivo, sans-serif", fontSize: 10.5, letterSpacing: ".14em",
                        textTransform: "uppercase", color: EMBER, marginBottom: 10 }}>
            written to memory so far
          </div>
          {written.map((w, n) => (
            <div key={n} style={{ borderLeft: `2px solid ${EMBER}`, paddingLeft: 12, marginBottom: 10 }}>
              <div style={{ fontSize: 13.5, lineHeight: 1.5, color: "#e6e2db" }}>{w.line}</div>
              <div style={{ fontSize: 11.5, color: "#8b8a8e", marginTop: 3 }}>→ {w.stone}</div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Stove({ stones, justWarmed }: { stones: Stone[]; justWarmed: string[] }) {
  const [now, setNow] = useState(() => Date.now());
  const [selected, setSelected] = useState<number | null>(null);
  const [uniform, setUniform] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const sorted = useMemo(() => [...stones].sort((a, b) => b.capacityHrs - a.capacityHrs), [stones]);
  const sel = selected == null ? sorted[0] : sorted.find((s) => s.id === selected) ?? sorted[0];
  const selHeat = sel ? heatOf(sel, now) : null;
  const sizeOf = (s: Stone) => uniform ? 128 : Math.round(86 + Math.sqrt(s.capacityHrs / 720) * 150);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                    gap: 16, flexWrap: "wrap", borderBottom: "1px solid #3a3c3f", paddingBottom: 12 }}>
        <div style={{ fontFamily: "Archivo, sans-serif", fontSize: 11, letterSpacing: ".13em",
                      textTransform: "uppercase", color: "#8b8a8e" }}>
          {uniform ? "uniform stones · heat alone carries it" : "size = heat capacity · glow = current heat"}
        </div>
        <div style={{ display: "flex", border: "1px solid #3a3c3f", borderRadius: 999, overflow: "hidden" }}>
          <button onClick={() => setUniform(false)} style={tog(!uniform)}>Capacity</button>
          <button onClick={() => setUniform(true)} style={tog(uniform)}>Uniform</button>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center",
                    gap: 18, flexWrap: "wrap", padding: "30px 0 20px" }}>
        {sorted.map((s) => (
          <div key={s.id} style={{ position: "relative" }}>
            {justWarmed.includes(s.file) ? (
              <div style={{ position: "absolute", top: -8, left: "50%", transform: "translateX(-50%)",
                            fontFamily: "Archivo, sans-serif", fontSize: 9.5, letterSpacing: ".12em",
                            textTransform: "uppercase", color: EMBER, whiteSpace: "nowrap" }}>
                you warmed this
              </div>
            ) : null}
            <StoneSvg s={s} now={now} size={sizeOf(s)} selected={sel?.id === s.id}
                      onClick={() => setSelected(s.id)} />
          </div>
        ))}
      </div>

      {sel && selHeat ? (
        <div style={{ background: "#1e2022", border: "1px solid #3a3c3f", borderRadius: 12, padding: "18px 22px" }}>
          <div style={{ fontFamily: "Archivo, sans-serif", fontWeight: 800, fontSize: 18, letterSpacing: "-.3px" }}>
            {sel.label} · <span style={{ color: EMBER }}>{selHeat.level}</span>
          </div>
          <div style={{ fontFamily: "Archivo, sans-serif", fontSize: 11, letterSpacing: ".1em",
                        textTransform: "uppercase", color: "#8b8a8e", marginTop: 5 }}>
            {holdLabel(sel.capacityHrs)} · {sel.entries} entries · {(sel.bytes / 1024).toFixed(1)} KB · last write {ago(selHeat.hrs)}
          </div>
          {sel.holds ? (
            <div style={{ fontSize: 14.5, lineHeight: 1.55, marginTop: 11, color: "#d8d4cd" }}>{sel.holds}</div>
          ) : null}
          {sel.latestLine ? (
            <div style={{ marginTop: 13, borderLeft: `2px solid ${EMBER}`,
                          background: "rgba(254,100,39,.055)", padding: "10px 0 10px 13px" }}>
              <div style={{ fontFamily: "Archivo, sans-serif", fontSize: 10.5, letterSpacing: ".12em",
                            textTransform: "uppercase", color: EMBER, marginBottom: 5 }}>
                the line that heated it
              </div>
              <div style={{ fontSize: 13.5, lineHeight: 1.5, color: "#e6e2db" }}>{sel.latestLine}</div>
              {sel.latestSrc ? (
                <div style={{ fontSize: 11.5, color: "#8b8a8e", marginTop: 6 }}>{sel.latestSrc}</div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function tog(on: boolean): React.CSSProperties {
  return {
    border: 0, cursor: "pointer", padding: "6px 13px",
    fontFamily: "Archivo, sans-serif", fontSize: 10.5, letterSpacing: ".1em",
    textTransform: "uppercase",
    background: on ? CREAM : "transparent",
    color: on ? "#1b1b1b" : "#8b8a8e",
  };
}

type Written = { id: number; cardId: number; choice: string; line: string; stoneFile: string; createdAt: string };

// Lines that imply a real action, not just a preference.
const ACTION_HINTS = [
  { match: /unsubscrib/i, label: "Unsubscribe from LinkedIn invitation digests", where: "Gmail" },
  { match: /decline/i, label: "Decline the Tuesday networking RSVP", where: "Google Calendar" },
  { match: /archive/i, label: "Archive marketplace promos", where: "Gmail" },
];

function Summary({ written, onContinue }: { written: Written[]; onContinue: () => void }) {
  const actionable = written
    .map((w) => ({ w, hit: ACTION_HINTS.find((a) => a.match.test(w.line)) }))
    .filter((x) => x.hit);

  return (
    <div style={{ maxWidth: 680, margin: "0 auto" }}>
      <div style={{ fontFamily: "Archivo, sans-serif", fontSize: 11, letterSpacing: ".14em",
                    textTransform: "uppercase", color: EMBER, marginBottom: 14 }}>
        {written.length} lines written
      </div>

      {written.map((w) => (
        <div key={w.id} style={{ borderLeft: `2px solid ${EMBER}`, paddingLeft: 13, marginBottom: 14 }}>
          <div style={{ fontSize: 14.5, lineHeight: 1.5, color: "#e6e2db" }}>{w.line}</div>
          <div style={{ fontFamily: "Archivo, sans-serif", fontSize: 10.5, letterSpacing: ".1em",
                        textTransform: "uppercase", color: "#6f6e73", marginTop: 5 }}>
            → {w.stoneFile}
          </div>
        </div>
      ))}

      {actionable.length > 0 ? (
        <div style={{ marginTop: 26, background: "#1e2022", border: `1px solid rgba(254,100,39,.3)`,
                      borderRadius: 14, padding: "18px 20px" }}>
          <div style={{ fontFamily: "Archivo, sans-serif", fontWeight: 700, fontSize: 16, color: CREAM }}>
            {actionable.length} of these imply an action
          </div>
          <div style={{ fontSize: 13.5, lineHeight: 1.55, color: "#8b8a8e", marginTop: 7 }}>
            Nothing has happened yet. Read the lines above first, then decide. If one of them is broader than you meant, fix it before it runs.
          </div>
          <div style={{ marginTop: 14 }}>
            {actionable.map(({ w, hit }) => (
              <div key={w.id} style={{ display: "flex", alignItems: "center", gap: 10,
                                       padding: "11px 0", borderTop: "1px solid #2a2c2e" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: EMBER, flex: "none" }} />
                <span style={{ fontSize: 14, color: "#e6e2db" }}>{hit!.label}</span>
                <span style={{ marginLeft: "auto", fontFamily: "Archivo, sans-serif", fontSize: 10,
                               letterSpacing: ".1em", textTransform: "uppercase", color: "#6f6e73" }}>
                  {hit!.where}
                </span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
            <button disabled title="Not wired up yet"
                    style={{ padding: "12px 16px", borderRadius: 11, border: "1px solid #3a3c3f",
                             background: "transparent", color: "#6f6e73",
                             fontFamily: "Archivo, sans-serif", fontWeight: 700, fontSize: 13,
                             cursor: "not-allowed" }}>
              Do these for me (not built yet)
            </button>
            <button onClick={onContinue}
                    style={{ padding: "12px 16px", borderRadius: 11,
                             border: "1px solid rgba(254,100,39,.5)", background: "rgba(254,100,39,.14)",
                             color: "#FFB694", fontFamily: "Archivo, sans-serif", fontWeight: 700,
                             fontSize: 13, cursor: "pointer" }}>
              Just remember them →
            </button>
          </div>
        </div>
      ) : (
        <button onClick={onContinue}
                style={{ marginTop: 22, padding: "13px 18px", borderRadius: 12,
                         border: "1px solid rgba(254,100,39,.5)", background: "rgba(254,100,39,.14)",
                         color: "#FFB694", fontFamily: "Archivo, sans-serif", fontWeight: 700,
                         fontSize: 13.5, cursor: "pointer" }}>
          See the stones →
        </button>
      )}
    </div>
  );
}

function App() {
  const [stones, setStones] = useState<Stone[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [warmed, setWarmed] = useState<string[]>([]);
  const [phase, setPhase] = useState<"loading" | "cold" | "stove">("loading");

  async function load() {
    const [a, b] = await Promise.all([
      fetch("/api/state").then((r) => r.json()),
      fetch("/api/cards").then((r) => r.json()),
    ]);
    setStones(a.stones ?? []);
    setCards(b.cards ?? []);
    setPhase((b.cards ?? []).length > 0 ? "cold" : "stove");
  }

  useEffect(() => { load(); }, []);

  async function reset() {
    await fetch("/api/reset", { method: "POST" });
    setWarmed([]);
    await load();
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", padding: "22px 16px 60px",
                  display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 1180, background: "#26282A",
                    borderRadius: 6, padding: "38px clamp(20px,4vw,52px) 30px" }}>

        <h1 style={{ fontFamily: "Archivo, sans-serif", fontWeight: 800, fontSize: "clamp(24px,3.4vw,32px)",
                     letterSpacing: "-.8px", color: CREAM, lineHeight: 1.15 }}>
          {phase === "cold"
            ? <>Five questions. <span style={{ color: EMBER }}>Then you'll see what I learned.</span></>
            : <>My memory as stones. <span style={{ color: EMBER }}>Size is how long it holds heat.</span></>}
        </h1>
        <div style={{ color: "#8b8a8e", fontSize: 14, marginTop: 9, maxWidth: 880, lineHeight: 1.5 }}>
          {phase === "cold"
            ? "These are real. Your inbox, your calendar. Answer one and watch what I write down. If none of the options fit, say what you'd actually do. That's the answer I learn most from."
            : "Every stone is a memory file. Big ones hold heat for weeks, like your rules. Small ones cool by morning. Tap one to read the line that warmed it."}
        </div>

        <div style={{ marginTop: 26 }}>
          {phase === "loading" ? (
            <div style={{ color: "#8b8a8e", padding: "40px 0" }}>Loading…</div>
          ) : phase === "cold" ? (
            <ColdStart cards={cards} onDone={async (w) => { setWarmed(w); await load(); setPhase("stove"); }} />
          ) : (
            <Stove stones={stones} justWarmed={warmed} />
          )}
        </div>

        <div style={{ marginTop: 16, borderTop: "1px solid #3a3c3f", paddingTop: 12,
                      display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap",
                      fontFamily: "Archivo, sans-serif", fontSize: 10.5, letterSpacing: ".1em",
                      textTransform: "uppercase", color: "#6f6e73" }}>
          <span>heat = 0.5 ^ (hours since write / (capacity / 6))</span>
          <button onClick={reset} style={{ background: "none", border: 0, cursor: "pointer",
                                           color: EMBER, font: "inherit", letterSpacing: ".1em" }}>
            run the cold start again
          </button>
        </div>

        <div style={{ padding: "22px 0 4px", textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "#6f6e73", letterSpacing: ".02em", lineHeight: 1.6 }}>
            © 2026 Sophia Levin. All rights reserved.
            <br />
            <a href="https://sophialevin.co" target="_blank" rel="noreferrer"
               style={{ color: "#6f6e73", textDecoration: "none", borderBottom: "1px solid rgba(255,255,255,.18)" }}>SophiaLevin.co</a>
          </div>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
