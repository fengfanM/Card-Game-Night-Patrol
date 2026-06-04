# Mobile Tap Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make mobile combat cards play reliably with one tap while preserving the existing desktop drag-to-target experience.

**Architecture:** Keep desktop behavior unchanged behind the existing `compact` viewport split. On mobile, card activation becomes click/tap-first: playable cards call `onPlayCard(uid)` directly, show the existing burst feedback, and leave horizontal hand scrolling intact. Drag remains desktop-first so mobile touch gestures are not fighting native horizontal scroll.

**Tech Stack:** React 18, TypeScript, Vite, CSS mobile media queries, Playwright Core for verification.

---

## Root Cause And Decision

Mobile currently asks the player to drag a card out of a horizontally scrollable hand. The card CSS uses `touch-action: pan-x` so horizontal scrolling can work, but the same gesture competes with pointer dragging. MDN documents that browsers can fire `pointercancel` when a touch gesture is taken over for viewport manipulation, which matches the user complaint that dragging is easy to lose. WCAG 2.2 target-size guidance also favors large, direct touch targets; the mobile cards are already large enough, so the right product solution is to make each card itself the action target.

Chosen UX:

- Mobile: tap a playable card to use it immediately.
- Attack cards auto-target the enemy.
- Defense/skill self-buff cards auto-target the player.
- Unplayable or unaffordable cards stay disabled and cannot fire.
- The hand remains horizontally scrollable.
- Desktop: no behavior change; drag-to-target and hover fan remain.

## File Structure

- Modify `src/App.tsx`: split mobile tap activation from desktop drag activation inside `CombatScreen`; expose clear labels/tooltips for cards.
- Modify `src/styles.css`: add mobile-only tap affordances, remove mobile drag transform path, preserve desktop card fan and drag visuals.
- Create `scripts/qa-mobile-tap-cards.mjs`: Playwright smoke test for mobile tap use, mobile scroll stability, and desktop drag preservation.

## Task 1: Mobile Tap Interaction

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add a shared play feedback helper**

Inside `CombatScreen`, replace the inline burst logic in `releaseDragAt` with:

```ts
  const showPlayFeedback = (target: "player" | "enemy") => {
    const id = Date.now();
    setBurst({ id, target, kind: target === "enemy" ? "strike" : "shield" });
    window.setTimeout(() => {
      setBurst((current) => (current?.id === id ? null : current));
    }, 520);
  };
```

- [ ] **Step 2: Route desktop drag through the helper**

Update `releaseDragAt` to:

```ts
  const releaseDragAt = (uid: string, point: { x: number; y: number }) => {
    const card = combat.hand.find((item) => item.uid === uid);
    const target = card ? dropTargetForCard(card) : null;
    if (!target || dragHitTarget(point) !== target) return;
    showPlayFeedback(target);
    onPlayCard(uid);
  };
```

- [ ] **Step 3: Add mobile tap play handler**

Add:

```ts
  const playCardByTap = (card: CardInstance) => {
    if (!compact) return;
    if (cardDef(card).unplayable) return;
    const cost = cardCost(card);
    if (typeof cost !== "number" || player.energy < cost) return;
    const target = dropTargetForCard(card);
    showPlayFeedback(target);
    onPlayCard(card.uid);
  };
```

- [ ] **Step 4: Stop starting drag on mobile**

When rendering `GameCard`, use:

```tsx
onClick={compact ? () => playCardByTap(card) : undefined}
onPointerDown={compact ? undefined : (event) => beginDrag(card, event)}
onPointerMove={compact ? undefined : moveDrag}
onPointerUp={compact ? undefined : endDrag}
onPointerCancel={compact ? undefined : () => setDrag(null)}
```

- [ ] **Step 5: Add mobile semantic copy through attributes only**

Pass `tapHint={compact ? mobileCardHint(card, disabled) : undefined}` to `GameCard`, then implement:

```ts
function mobileCardHint(card: CardInstance, disabled: boolean) {
  if (disabled) return "当前不可使用";
  return dropTargetForCard(card) === "enemy" ? "点击攻击妖物" : "点击立即使用";
}
```

The hint must be an attribute, not visible instructional text.

## Task 2: Mobile Tap Visual Affordance

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Extend `GameCard` props**

Add `tapHint?: string` to the prop type and render:

```tsx
data-tap-hint={tapHint}
aria-label={tapHint ? `${cardName(card)}，${tapHint}` : cardName(card)}
```

- [ ] **Step 2: Add compact mode class to combat view**

Change the section class to:

```tsx
<section className={`combat-view ${compact ? "combat-compact-tap" : ""}`}>
```

- [ ] **Step 3: Add mobile-only tap affordance styles**

Inside `@media (max-width: 680px)`, add:

```css
.combat-compact-tap .play-drop-zone,
.combat-compact-tap .target-ghost {
  display: none;
}

.combat-compact-tap .card-mode-hand {
  touch-action: pan-x;
}

.combat-compact-tap .card-mode-hand:not(:disabled)::after {
  content: attr(data-tap-hint);
  position: absolute;
  right: 9px;
  bottom: 8px;
  min-height: 24px;
  display: grid;
  place-items: center;
  padding: 0 8px;
  border: 1px solid rgba(121, 219, 203, 0.42);
  border-radius: 5px;
  background: rgba(5, 12, 12, 0.72);
  color: rgba(194, 255, 241, 0.92);
  font-size: 0.62rem;
  font-weight: 900;
}

.combat-compact-tap .card-mode-hand:active:not(:disabled) {
  transform: translateY(-7px) scale(0.98);
  filter: brightness(1.08);
}
```

- [ ] **Step 4: Preserve desktop styles**

Confirm these selectors are only inside the mobile media query or behind `.combat-compact-tap`; desktop `.card-mode-hand.is-dragging` and `:hover` must remain unchanged.

## Task 3: Automated QA Script

**Files:**
- Create: `scripts/qa-mobile-tap-cards.mjs`

- [ ] **Step 1: Create the script**

The script should launch Playwright Core against a URL argument:

```js
import { chromium } from "playwright-core";

const url = process.argv[2] || "http://127.0.0.1:5173/";
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
  "/Users/bytedance/Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-arm64/chrome-headless-shell";

const browser = await chromium.launch({ executablePath, headless: true });
```

- [ ] **Step 2: Verify mobile tap plays a card**

In a 390×844 mobile viewport, start a run, enter combat, record enemy HP and energy, tap the first enabled attack card, then assert enemy HP or energy changed.

- [ ] **Step 3: Verify mobile hand remains scrollable**

Use `page.evaluate` to set `.hand-fan.scrollLeft = 300`, then assert scrollLeft increased and no card rectangles overlap.

- [ ] **Step 4: Verify desktop drag still works**

In a 1440×900 desktop viewport, enter combat, assert `canvasCount === 1`, card `position === "absolute"`, drag an attack card to the enemy, and assert enemy HP changed.

- [ ] **Step 5: Print JSON result**

Return a compact JSON object with `mobileTap`, `mobileScroll`, and `desktopDrag` booleans.

## Verification Checklist

- [ ] `npm run build` passes.
- [ ] Mobile local QA confirms card tap changes combat state.
- [ ] Mobile local QA confirms horizontal hand scroll still works.
- [ ] Mobile local QA confirms no card overlap.
- [ ] Desktop local QA confirms Phaser canvas still exists.
- [ ] Desktop local QA confirms drag-to-enemy still works.
- [ ] Production Cloudflare mobile QA passes after deploy.

## Self-Review

Spec coverage: mobile click-to-use, desktop preservation, touch-scroll conflict, visual feedback, and verification are all covered.

Placeholder scan: no TBD or vague implementation-only steps remain.

Type consistency: all planned functions use existing `CardInstance`, `cardDef`, `cardCost`, `dropTargetForCard`, and `onPlayCard` names from `src/App.tsx`.
