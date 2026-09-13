# Stones

**Memory you can see.** A working prototype of the knowledge-stones concept.

Each stone is one real memory file. **Size is heat capacity** — how long that file's knowledge stays in play. **Glow is current heat**, decaying at a rate its size sets. Big stones warm slowly and hold for weeks (rules, identity). Small stones spike and cool by morning (the nightly activity log).

The cold start pulls five real items from already-connected accounts and asks for one judgment each. Every answer appends a visible line to a memory file and warms the stone it wrote to. You watch the memory form instead of being told it happened.

heat = 0.5 ^ (hours since write / (capacity / 6))

## Why not size = entry count

The first version mapped size to how many entries a file held. Two unrelated numbers sharing a shape. In a real sauna a stone's size tells you how long it holds heat, not how much it contains — which is exactly how these files behave.

## Stack

Hono + Drizzle over app-owned SQLite, React frontend, deployed as a Sauna app.

---

Designed and directed by [Sophia Levin](https://sophialevin.co). Built with Sauna AI.
