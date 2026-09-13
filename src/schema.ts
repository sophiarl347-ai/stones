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
  // show the item, not a summary of it
  fromName: text("from_name").notNull().default(""),
  fromEmail: text("from_email").notNull().default(""),
  snippet: text("snippet").notNull().default(""),
  receivedAt: text("received_at").notNull().default(""),
  unread: integer("unread").notNull().default(0),
  whenLabel: text("when_label").notNull().default(""),
  location: text("location").notNull().default(""),
  recurrence: text("recurrence").notNull().default(""),
  question: text("question").notNull(),
  // JSON array: [{ label, line, stone }] — real moves, not a binary.
  options: text("options").notNull().default("[]"),
  choiceA: text("choice_a").notNull().default(""),
  choiceB: text("choice_b").notNull().default(""),
  lineA: text("line_a").notNull().default(""),
  lineB: text("line_b").notNull().default(""),
  stoneFile: text("stone_file").notNull(),   // default stone if an option omits one
  ord: integer("ord").notNull().default(0),
});

export const answers = sqliteTable("answers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  cardId: integer("card_id").notNull(),
  choice: text("choice").notNull(),          // the option label
  line: text("line").notNull(),
  stoneFile: text("stone_file").notNull(),
  createdAt: text("created_at").notNull(),
});

export const stonesRelations = relations(stones, () => ({}));
export const cardsRelations = relations(cards, () => ({}));
export const answersRelations = relations(answers, () => ({}));
