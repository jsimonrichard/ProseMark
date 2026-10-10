/** Element that supports `closest` — kept narrow so unit tests can mock it. */
export interface HtmlWidgetClosestTarget {
  closest(
    selector: string,
  ): { getAttribute(name: string): string | null } | null;
}

/**
 * Resolve an anchor href from a click/mousedown target inside an HTML widget.
 * Returns null when the event is not on an `<a href>` (or a descendant).
 */
export function htmlWidgetLinkHref(
  target: HtmlWidgetClosestTarget | null,
): string | null {
  if (!target) return null;
  const anchor = target.closest('a[href]');
  if (!anchor) return null;
  const href = anchor.getAttribute('href');
  if (href == null || href.length === 0) return null;
  return href;
}

export function eventTargetForClosest(
  target: EventTarget | null,
): Element | null {
  if (target instanceof Element) return target;
  if (target instanceof Text) return target.parentElement;
  return null;
}
