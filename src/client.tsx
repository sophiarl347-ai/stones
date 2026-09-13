import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

type Stone = {
  id: number; file: string; label: string; mark: string;
  capacityHrs: number; entries: number; bytes: number;
  lastWrite: string; latestLine: string; latestSrc: string; holds: string; ord: number;
};
type Card = {
  id: number; kind: string; source: string; title: string; detail: string; meta: string;
  question: string; choiceA: string; choiceB: string; stoneFile: string; ord: number;
};

const EMBER = "#FE6427";
const CREAM = "#EFEAE3";

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
    <div
      onClick={onClick}
      style={{ cursor: "pointer", textAlign: "center", transition: "transform .3s ease",
               transform: selected ? "translateY(-8px)" : "none" }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block", overflow: "visible" }}>
        <defs>
          <radialGradient id={gid} cx="50%" cy="50%" r="54%">
            <stop offset="0%" stopColor={EMBER} stopOpacity={(v * 0.75).toFixed(2)} />
            <stop offset="52%" stopColor={EMBER} stopOpacity={(v * 0.3).toFixed(2)} />
            <stop offset="100%" stopColor={EMBER} stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={size / 2 - 2} fill={`url(#${gid})`} />
        <polygon
          points={polyPoints(size, s.ord + 1)}
          fill={CREAM}
          stroke={selected ? CREAM : "none"}
          strokeWidth={selected ? 3 : 0}
        />
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

function ColdStart({ cards, onDone }: { cards: Card[]; onDone: (warmed: string[]) => void }) {
  const [i, setI] = useState(0);
  const [written, setWritten] = useState<{ line: string; stone: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const card = cards[i];
  const total = cards.length;

  async function answer(choice: "a" | "b") {
    if (!card || busy) return;
    setBusy(true);
    try {
      const r = await fetch("/api/answer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cardId: card.id, choice }),
      });
      const j = await r.json();
      const next = [...written, { line: j.line as string, stone: j.stoneFile as string }];
      setWritten(next);
      if (i + 1 >= total) onDone(next.map((w) => w.stone));
      else setI(i + 1);
    } finally {
      setBusy(false);
    }
  }

  if (!card) return null;

  return (
    <div style={{ maxWidth: 620, margin: "0 auto", padding: "10px 0 40px" }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 26 }}>
        {cards.map((_, n) => (
          <div key={n} style={{
            height: 3, flex: 1, borderRadius: 2,
            background: n < i ? EMBER : n === i ? "rgba(254,100,39,.45)" : "#3a3c3f",
          }} />
        ))}
      </div>

      <div style={{ fontFamily: "Archivo, sans-serif", fontSize: 11, letterSpacing: ".14em",
                    textTransform: "uppercase", color: "#8b8a8e", marginBottom: 14 }}>
        {i + 1} of {total} · from your {card.source}
      </div>

      <div style={{ background: "#1e2022", border: "1px solid #3a3c3f", borderRadius: 14, padding: "22px 24px" }}>
        <div style={{ fontFamily: "Archivo, sans-serif", fontWeight: 700, fontSize: 19,
                      lineHeight: 1.3, letterSpacing: "-.2px" }}>
          {card.title}
        </div>
        {card.detail ? (
          <div style={{ fontSize: 14.5, lineHeight: 1.55, color: "#b9b5ae", marginTop: 9 }}>{card.detail}</div>
        ) : null}
        {card.meta ? (
          <div style={{ fontFamily: "Archivo, sans-serif", fontSize: 11, letterSpacing: ".12em",
                        textTransform: "uppercase", color: "#6f6e73", marginTop: 12 }}>
            {card.meta}
          </div>
        ) : null}
      </div>

      <div style={{ fontSize: 16, lineHeight: 1.5, margin: "22px 0 14px", color: CREAM }}>
        {card.question}
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => answer("a")} disabled={busy} style={btn(true)}>{card.choiceA}</button>
        <button onClick={() => answer("b")} disabled={busy} style={btn(false)}>{card.choiceB}</button>
      </div>

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

function btn(primary: boolean): React.CSSProperties {
  return {
    flex: 1, padding: "14px 16px", borderRadius: 12, cursor: "pointer",
    fontFamily: "Archivo, sans-serif", fontWeight: 700, fontSize: 13.5,
    letterSpacing: ".04em",
    border: primary ? "1px solid rgba(254,100,39,.5)" : "1px solid #3a3c3f",
    background: primary ? "rgba(254,100,39,.14)" : "transparent",
    color: primary ? "#FFB694" : "#b9b5ae",
  };
}

function Stove({ stones, justWarmed }: { stones: Stone[]; justWarmed: string[] }) {
  const [now, setNow] = useState(() => Date.now());
  const [selected, setSelected] = useState<number | null>(null);
  const [uniform, setUniform] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const sorted = useMemo(
    () => [...stones].sort((a, b) => b.capacityHrs - a.capacityHrs),
    [stones]
  );
  const sel = selected == null ? sorted[0] : sorted.find((s) => s.id === selected) ?? sorted[0];
  const selHeat = sel ? heatOf(sel, now) : null;

  const sizeOf = (s: Stone) =>
    uniform ? 128 : Math.round(86 + Math.sqrt(s.capacityHrs / 720) * 150);

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
        <div style={{ background: "#1e2022", border: "1px solid #3a3c3f", borderRadius: 12,
                      padding: "18px 22px" }}>
          <div style={{ fontFamily: "Archivo, sans-serif", fontWeight: 800, fontSize: 18,
                        letterSpacing: "-.3px" }}>
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
            <div style={{ marginTop: 13, borderLeft: `2px solid ${EMBER}`, paddingLeft: 13,
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
        <div style={{ color: "#8b8a8e", fontSize: 14, marginTop: 9, maxWidth: 860, lineHeight: 1.5 }}>
          {phase === "cold"
            ? "Real items from accounts you've already connected. Every answer appends one line to a memory file and warms the stone it wrote to. Nothing here is invented."
            : "Each stone is one real memory file. Big stones warm slowly and hold for weeks, like rules and identity. Small stones spike and cool by morning, like the nightly activity log. Click one to see the line that heated it."}
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
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
