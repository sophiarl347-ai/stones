import type { AppCtx, AppHandler } from "@sauna/apps-runtime";
import { Hono } from "hono";
import { eq, asc, sql as dsql } from "drizzle-orm";
import { makeDb, stones, cards, answers } from "./db";

const app = new Hono<{ Bindings: { sql: any; websocket: any; ctx: AppCtx } }>();

type Option = { label: string; line: string; stone?: string };

const LLMS = `# Stones

A working prototype of "knowledge stones": memory you can see.

Each stone is one real memory file. Size is heat capacity (how long that file's
knowledge stays in play). Glow is current heat, decaying at a rate its size sets.
Answering a cold-start card appends a line to a memory file and warms its stone.

Cards are NOT binary. Each card carries an options array of the real moves a
person would actually make (open it elsewhere and delete the email, snooze,
reply, ignore) — a two-button version loses the behaviour it is trying to learn.

## Routes

GET  /api/state   -> { stones: [...], answered: n, total: n }
GET  /api/cards   -> { cards: [...] } unanswered, each with options: [{label,line,stone}]
POST /api/answer  -> body { cardId: number, optionIndex: number }
POST /api/reset   -> clears answers so the cold start can be demoed again

## Stone fields

file, label, mark, capacityHrs, entries, bytes, lastWrite (ISO), latestLine,
latestSrc, holds, ord

Heat is computed in the client: v = 0.5 ^ (hoursSinceWrite / (capacityHrs / 6)).
`;

function parseOptions(row: { options: string; choiceA: string; choiceB: string; lineA: string; lineB: string; stoneFile: string }): Option[] {
  try {
    const parsed = JSON.parse(row.options || "[]");
    if (Array.isArray(parsed) && parsed.length > 0) return parsed as Option[];
  } catch (e) {
    console.error("bad options json on card: " + String(e));
  }
  const legacy: Option[] = [];
  if (row.choiceA) legacy.push({ label: row.choiceA, line: row.lineA, stone: row.stoneFile });
  if (row.choiceB) legacy.push({ label: row.choiceB, line: row.lineB, stone: row.stoneFile });
  return legacy;
}

app.get("/llms.txt", (c) => c.text(LLMS));

app.get("/api/state", async (c) => {
  const db = makeDb(c.env);
  const rows = await db.query.stones.findMany({ orderBy: (t) => asc(t.ord) });
  const answered = await db.select({ n: dsql<number>`count(*)` }).from(answers).all();
  const total = await db.select({ n: dsql<number>`count(*)` }).from(cards).all();
  return c.json({
    stones: rows,
    written: await db.query.answers.findMany({ orderBy: (t) => asc(t.id) }),
    answered: Number(answered[0]?.n ?? 0),
    total: Number(total[0]?.n ?? 0),
  });
});

app.get("/api/cards", async (c) => {
  const db = makeDb(c.env);
  const all = await db.query.cards.findMany({ orderBy: (t) => asc(t.ord) });
  const done = await db.query.answers.findMany();
  const doneIds = new Set(done.map((a) => a.cardId));
  const open = all
    .filter((x) => !doneIds.has(x.id))
    .map((x) => ({
      id: x.id, kind: x.kind, source: x.source, title: x.title,
      detail: x.detail, meta: x.meta, question: x.question,
      fromName: x.fromName, fromEmail: x.fromEmail, snippet: x.snippet,
      receivedAt: x.receivedAt, unread: x.unread,
      whenLabel: x.whenLabel, location: x.location, recurrence: x.recurrence,
      stoneFile: x.stoneFile, ord: x.ord,
      options: parseOptions(x),
    }));
  return c.json({ cards: open });
});

app.post("/api/answer", async (c) => {
  const body = await c.req.json<{ cardId?: number; optionIndex?: number; customLine?: string }>();
  const cardId = Number(body.cardId);
  const idx = Number(body.optionIndex ?? 0);
  const custom = (body.customLine || "").trim();
  if (!cardId) return c.json({ error: "cardId required" }, 400);

  const db = makeDb(c.env);
  const card = await db.query.cards.findFirst({ where: eq(cards.id, cardId) });
  if (!card) return c.json({ error: "no such card" }, 404);

  const options = parseOptions(card);
  const chosen = custom
    ? { label: "in her own words", line: custom, stone: card.stoneFile }
    : options[idx];
  if (!chosen) return c.json({ error: "no such option" }, 400);

  const targetFile = chosen.stone || card.stoneFile;
  const now = new Date().toISOString();

  await db.insert(answers).values({
    cardId,
    choice: chosen.label,
    line: chosen.line,
    stoneFile: targetFile,
    createdAt: now,
  }).run();

  const target = await db.query.stones.findFirst({ where: eq(stones.file, targetFile) });
  if (target) {
    await db.update(stones).set({
      lastWrite: now,
      latestLine: chosen.line,
      latestSrc: "You just taught me this, from " + card.source + ".",
      entries: target.entries + 1,
      bytes: target.bytes + chosen.line.length,
    }).where(eq(stones.file, targetFile)).run();
  } else {
    console.error("answer wrote to unknown stone file: " + targetFile);
  }

  return c.json({ ok: true, line: chosen.line, stoneFile: targetFile, at: now });
});

app.post("/api/reset", async (c) => {
  const db = makeDb(c.env);
  await db.delete(answers).run();
  return c.json({ ok: true });
});

export default {
  fetch: (req, env, ctx) => app.fetch(req, { ...env, ctx }),
} satisfies AppHandler;
