import type { AppCtx, AppHandler } from "@sauna/apps-runtime";
import { Hono } from "hono";
import { eq, asc, sql as dsql } from "drizzle-orm";
import { makeDb, stones, cards, answers } from "./db";

const app = new Hono<{ Bindings: { sql: any; websocket: any; ctx: AppCtx } }>();

const LLMS = `# Stones

A working prototype of "knowledge stones": memory you can see.

Each stone is one real memory file. Size is heat capacity (how long that file's
knowledge stays in play). Glow is current heat, decaying at a rate its size sets.
Answering a cold-start card appends a line to a memory file and warms its stone.

## Routes

GET  /api/state            -> { stones: [...], answered: n, total: n }
GET  /api/cards            -> { cards: [...] }  unanswered cold-start cards, in order
POST /api/answer           -> body { cardId: number, choice: "a" | "b" }
                              appends the matching line, warms the target stone
POST /api/reset            -> clears answers so the cold start can be demoed again

## Stone fields

file, label, mark, capacityHrs, entries, bytes, lastWrite (ISO), latestLine,
latestSrc, holds, ord

Heat is computed in the client: v = 0.5 ^ (hoursSinceWrite / (capacityHrs / 6)).
`;

app.get("/llms.txt", (c) => c.text(LLMS));

app.get("/api/state", async (c) => {
  const db = makeDb(c.env);
  const rows = await db.query.stones.findMany({ orderBy: (t) => asc(t.ord) });
  const answered = await db.select({ n: dsql<number>`count(*)` }).from(answers).all();
  const total = await db.select({ n: dsql<number>`count(*)` }).from(cards).all();
  return c.json({
    stones: rows,
    answered: Number(answered[0]?.n ?? 0),
    total: Number(total[0]?.n ?? 0),
  });
});

app.get("/api/cards", async (c) => {
  const db = makeDb(c.env);
  const all = await db.query.cards.findMany({ orderBy: (t) => asc(t.ord) });
  const done = await db.query.answers.findMany();
  const doneIds = new Set(done.map((a) => a.cardId));
  return c.json({ cards: all.filter((x) => !doneIds.has(x.id)) });
});

app.post("/api/answer", async (c) => {
  const body = await c.req.json<{ cardId?: number; choice?: string }>();
  const cardId = Number(body.cardId);
  const choice = body.choice === "b" ? "b" : "a";
  if (!cardId) return c.json({ error: "cardId required" }, 400);

  const db = makeDb(c.env);
  const card = await db.query.cards.findFirst({ where: eq(cards.id, cardId) });
  if (!card) return c.json({ error: "no such card" }, 404);

  const line = choice === "a" ? card.lineA : card.lineB;
  const now = new Date().toISOString();

  await db.insert(answers).values({
    cardId,
    choice,
    line,
    stoneFile: card.stoneFile,
    createdAt: now,
  }).run();

  const target = await db.query.stones.findFirst({ where: eq(stones.file, card.stoneFile) });
  if (target) {
    await db.update(stones).set({
      lastWrite: now,
      latestLine: line,
      latestSrc: "You just taught me this, from " + card.source + ".",
      entries: target.entries + 1,
      bytes: target.bytes + line.length,
    }).where(eq(stones.file, card.stoneFile)).run();
  } else {
    console.error("answer wrote to unknown stone file: " + card.stoneFile);
  }

  return c.json({ ok: true, line, stoneFile: card.stoneFile, at: now });
});

app.post("/api/reset", async (c) => {
  const db = makeDb(c.env);
  await db.delete(answers).run();
  return c.json({ ok: true });
});

export default {
  fetch: (req, env, ctx) => app.fetch(req, { ...env, ctx }),
} satisfies AppHandler;
