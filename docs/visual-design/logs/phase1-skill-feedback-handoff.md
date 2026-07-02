# Phase 1 skill feedback — handoff

**Updated:** 2026-06-30  
**Scope:** Player-experience-roadmap P1 — skill praise Wave 3 refactor

---

## Done

| Area | Path / value |
|------|----------------|
| Near Miss | `nearMissDetection.ts` — tap window `RAPID_TAP_WINDOW_MS`, threat session, latch grace |
| SAVED vs Near Miss | `tapCoachDetection.ts` — SAVED only if pin duration ≥ `resolveLatchGraceMs` |
| NICE! | `steerPraiseDetection.ts` — topology shift only; clean stitch (no brush/side/pin) |
| Zig-zag tap | `zigzagTapDetection.ts` — alternating tap streak; `minStreak: 3` |
| Router | `praiseRouter.ts` — up to 2 distinct word flashes; SAVED blocks near_miss |
| Stack anim | `praiseEmitter.ts` + `feedbackFlashAnim.ts` — `stackIndex`, `WORD_STACK_GAP_REF_PX` |
| Config | `skillFeedback.ts` — `near_miss`, `zigzag_tap` families; `funnel_thread` removed |
| Removed | `ceilingDodgeDetection.ts`, geometry `zigzag_chain` enabled:false, TIGHT! |
| Tests | `src/Game/feedback/__tests__/` — 113 unit tests |

---

## Ignition rules (Wave 3)

- **Near Miss** — pin threat (brush/pin/stitch) + qualifying tap + threat ends; not real latch escape.
- **SAVED!** — latched pin ≥ grace ms + travel; brief pin → Near Miss only.
- **NICE!** — gap shift row-to-row, clean stitch, steer proof; no scrape-without-shift.
- **ZIG-ZAG!** — alternating taps within `streakWindowMs`; not geometry paddle.
- **Dual words** — e.g. NICE! + Near Miss! same frame, stacked vertically.
- **Near Miss +N** — speed/diff only; clearance ignored.

---

## Not done (next)

- **Phase 2:** GREAT!/PERFECT! + coins
- **Device tuning:** `near_miss` tiers, `zigzag_tap.minStreak`, `latchGraceMs` after founder runs

---

## Device QA checklist (Wave 3)

1. Tap under dropping ceiling before latch → **Near Miss!** (tiered by speed/diff).
2. Pinned 1s+, tap out → **SAVED!** only.
3. Brief pin at high speed → **Near Miss!** not SAVED.
4. Clean gap shift → **NICE!**; can stack with Near Miss.
5. Alt-tap left-right-left → **ZIG-ZAG!** (any path).
6. Funnel pass → no **TIGHT!**.
7. Wide chute tap drift → silence on NICE!.
8. TAP / ×2 HUD unchanged.

---

## Verify

```bash
npm test -- --watchAll=false src/Game/feedback/__tests__
```
