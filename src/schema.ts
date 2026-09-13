import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// One row per real memory file.
export const stones = sqliteTable("stones", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  file: text("file").notNull(),              // e.g. "RULES.md"
  label: text("label").notNull(),            // e.g. "RULES"
  mark: text("mark").notNull(),              // single letter drawn on the stone
  capacityHrs: integer("capacity_hrs").notNull(),  // how long it holds heat
  entries: integer("entries").notNull().default(0),
  bytes: integer("bytes").notNull().default(0),
  lastWrite: text("last_write").notNull(),   // ISO
  latestLine: text("latest_line").notNull().default(""),
  latestSrc: text("latest_src").notNull().default(""),
  holds: text("holds").notNull().default(""),
  ord: integer("ord").notNull().default(0),
});

// Real items pulled from connected accounts at seed time.
export const cards = sqliteTable("cards", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  kind: text("kind").notNull(),              // email | event | message
  source: text("source").notNull(),          // "Gmail · personal"
  title: text("title").notNull(),
  detail: text("detail").notNull().default(""),
  meta: text("meta").notNull().default(""),
  question: text("question").notNull(),
  choiceA: text("choice_a").notNull(),
  choiceB: text("choice_b").notNull(),
  lineA: text("line_a").notNull(),           // the line written if A
  lineB: text("line_b").notNull(),
  stoneFile: text("stone_file").notNull(),   // which stone this writes to
  ord: integer("ord").notNull().default(0),
});

export const answers = sqliteTable("answers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  cardId: integer("card_id").notNull(),
  choice: text("choice").notNull(),          // "a" | "b"
  line: text("line").notNull(),
  stoneFile: text("stone_file").notNull(),
  createdAt: text("created_at").notNull(),
});

export const stonesRelations = relations(stones, () => ({}));
export const cardsRelations = relations(cards, () => ({}));
export const answersRelations = relations(answers, () => ({}));
