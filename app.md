---
name: Stones
description: Memory you can see. Five swipes to warm your first stones.
manifest_version: 1
enabled: true
visibility: private
---

# Stones

A working prototype of the knowledge-stones concept: **show people the agent is learning, don't tell them.**

## The idea

Sauna's memory is its moat, and it's invisible. Claude generates summaries you can't open. Sauna's memory is markdown files you can read and edit — a real advantage nobody can see.

This app makes it visible in two moves:

1. **Cold start.** Five real items pulled from what's already connected. One judgment each: would you have replied to this, is this urgent, accept or decline. Every answer appends one visible line to a memory file.
2. **The stove.** The stones. Each one is a memory file. **Size is heat capacity** — how long that file's knowledge stays in play. **Glow is current heat**, decaying at a rate its size sets. Big stones warm slowly and hold for weeks (RULES, SAUNA_IDENTITY). Small stones spike and cool by morning (RECENT_ACTIVITY).

Answering a card warms the stone it wrote to. You watch the memory form.

## Why size is heat capacity, not mass

The first version mapped size to entry count. Two unrelated numbers sharing a shape. In a real sauna a stone's size tells you how long it holds heat, not how much it contains — which is exactly how these files behave. A small stone blazing means something new and volatile just landed. A big stone warm means something foundational moved, which is rarer and matters more.

## Data

The `stones` table mirrors the real memory files in `memory/personal-zcVwv195/` — name, byte size, entry count, last write, and the actual most recent line. Seeded from disk (apps run on Cloudflare and can't read the workspace filesystem directly). The `cards` table holds real items pulled from Gmail and Google Calendar at seed time.

Answers write to `answers` and bump the target stone's `last_write` and `latest_line`, so the heat you see after a swipe is heat the swipe actually caused.

## Re-seeding

Seed rows are not created by the app itself. To refresh from disk, insert into `stones` / `cards` via `app_db_query` (see the session that built it). Clearing `answers` resets the cold start.

## Routes

- `GET /api/state` — stones + answer count
- `GET /api/cards` — unanswered cards
- `POST /api/answer` — `{ cardId, choice }`, appends a line and warms the stone
- `POST /api/reset` — clears answers, for demoing the cold start again
