/**
 * Runtime seam stamper for the Catppuccin glass layer.
 *
 * The glass stylesheet keys off stable data-* hooks (`data-dsh-glass-frame`,
 * `data-dsh-glass-trajectory`, `data-dsh-glass-stats`, …) that are NOT part
 * of the stock DSH markup, so this module stamps them onto the matching
 * elements at runtime — the stylesheet works with zero base edits. Each
 * selector uses only stable attributes already present in the stock UI
 * (`data-composer-card`, `data-conversation-composer-overlay`, `data-slot`,
 * ARIA roles) or lightningcss-preserved class-name substrings.
 *
 * Stamps are idempotent and inert without the `data-dsh-glass` root attribute
 * (the whole stylesheet is gated on it), so they are simply left in place when
 * the layer flips off — "off" still renders the exact stock UI.
 */
/**
 * Stamp the seams once, then keep them stamped as React remounts nodes.
 *
 * The observer callback is debounced through `requestAnimationFrame` (item
 * N): DSH chat streaming mutates the DOM per token, and re-stamping on
 * every single mutation would re-run every selector per token. One frame
 * merges all mutations into one `stampAll()` — a streamed burst of N
 * mutations costs 1 stamp pass, and a frame with no mutations costs
 * nothing (the dirty flag skips the no-op stamp). Stamping stays idempotent
 * and cheap: `stamp()` only sets attributes that are missing.
 *
 * @returns a disposer that disconnects the observer and cancels any
 *  pending frame.
 */
export declare function startGlassSeamStamper(): () => void;
//# sourceMappingURL=glass-seams.d.ts.map