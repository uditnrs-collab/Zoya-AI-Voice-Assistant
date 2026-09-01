// Webpage Scroll and Tap/Click Control Utility for ZOYA

export interface TapResult {
  success: boolean;
  elementName?: string;
  errorReason?: "notFound" | "ambiguous" | "safety";
  safetyMessage?: string;
}

export interface ProgrammaticScrollOptions {
  direction?: "up" | "down" | "left" | "right" | "top" | "bottom";
  amount?: "small" | "medium" | "large" | number;
  targetSelector?: string;
  behavior?: ScrollBehavior;
  targetElement?: HTMLElement | null;
  useCssTransformFallback?: boolean;
}

export interface ScrollResult {
  success: boolean;
  deltaY: number;
  deltaX: number;
  targetType: "active-screen-viewer" | "container" | "window" | "document" | "iframe" | "css-transform";
  targetName?: string;
  newScrollTop?: number;
}

// Safety list for irreversible or destructive actions
const SENSITIVE_KEYWORDS = [
  "delete",
  "remove account",
  "factory reset",
  "send money",
  "buy",
  "purchase",
  "pay",
  "checkout",
  "clear all",
  "permanent",
  "format",
];

/**
 * Calculates pixel offset based on screen height and amount preset or exact number
 */
function calculateScrollDelta(
  direction: "up" | "down" | "left" | "right" | "top" | "bottom",
  amount: "small" | "medium" | "large" | number = "medium"
): { deltaY: number; deltaX: number } {
  if (typeof window === "undefined") return { deltaY: 0, deltaX: 0 };

  const vh = window.innerHeight || 800;
  const vw = window.innerWidth || 1200;

  let pixelsY = Math.max(380, Math.round(vh * 0.55));
  let pixelsX = Math.max(300, Math.round(vw * 0.45));

  if (typeof amount === "number") {
    pixelsY = Math.abs(amount);
    pixelsX = Math.abs(amount);
  } else if (amount === "small") {
    pixelsY = Math.max(180, Math.round(vh * 0.25));
    pixelsX = Math.max(150, Math.round(vw * 0.20));
  } else if (amount === "large") {
    pixelsY = Math.max(700, Math.round(vh * 0.85));
    pixelsX = Math.max(600, Math.round(vw * 0.75));
  }

  let deltaY = 0;
  let deltaX = 0;

  if (direction === "down") deltaY = pixelsY;
  else if (direction === "up") deltaY = -pixelsY;
  else if (direction === "right") deltaX = pixelsX;
  else if (direction === "left") deltaX = -pixelsX;
  else if (direction === "top") deltaY = -999999;
  else if (direction === "bottom") deltaY = 999999;

  return { deltaY, deltaX };
}

/**
 * Renders on-screen visual HUD Glider indicating scroll action
 */
function showScrollHudIndicator(
  direction: string,
  pixelDelta: number,
  targetLabel?: string
) {
  if (typeof document === "undefined") return;

  try {
    const existingIndicator = document.getElementById("zoya-scroll-hud-indicator");
    if (existingIndicator) {
      existingIndicator.remove();
    }

    const indicator = document.createElement("div");
    indicator.id = "zoya-scroll-hud-indicator";
    indicator.className =
      "fixed z-[9999] pointer-events-none transition-all duration-400 ease-out flex items-center gap-2.5 px-4 py-2 rounded-full bg-black/90 border border-[#00E5FF] text-[#00E5FF] font-mono text-xs font-bold tracking-widest shadow-[0_0_35px_rgba(0,229,255,0.7)] backdrop-blur-xl";
    indicator.style.left = "50%";
    indicator.style.transform = "translateX(-50%)";
    indicator.style.top = direction.includes("down") || direction.includes("bottom") ? "32%" : "68%";
    indicator.style.opacity = "0";

    const arrow =
      direction.includes("down") || direction.includes("bottom")
        ? "▼"
        : direction.includes("right")
        ? "▶"
        : direction.includes("left")
        ? "◀"
        : "▲";

    const labelText = targetLabel ? ` [${targetLabel.toUpperCase()}]` : "";
    const distText = Math.abs(pixelDelta) > 50000 ? "FULL PAGE" : `${Math.abs(pixelDelta)}PX`;

    indicator.innerHTML = `
      <span class="text-sm animate-bounce">${arrow}</span>
      <span>ZOYA SCROLLING ${direction.toUpperCase()} (${distText})${labelText}</span>
      <span class="text-sm animate-bounce">${arrow}</span>
    `;

    document.body.appendChild(indicator);

    requestAnimationFrame(() => {
      indicator.style.opacity = "1";
      indicator.style.top =
        direction.includes("down") || direction.includes("bottom") ? "42%" : "58%";
    });

    setTimeout(() => {
      indicator.style.opacity = "0";
      setTimeout(() => indicator.remove(), 400);
    }, 1200);
  } catch (e) {
    console.warn("HUD scroll indicator notice:", e);
  }
}

/**
 * Applies CSS-based scroll positioning / transform fallback for custom viewports (like shared screen containers)
 */
export function applyCssScrollTransform(
  container: HTMLElement,
  deltaY: number,
  deltaX: number = 0
): boolean {
  if (!container) return false;

  try {
    const currentY = parseFloat(container.getAttribute("data-zoya-scroll-y") || "0");
    const currentX = parseFloat(container.getAttribute("data-zoya-scroll-x") || "0");

    let newY = currentY - deltaY;
    let newX = currentX - deltaX;

    // Constrain within bounds if possible
    const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight);
    if (maxScroll > 0) {
      newY = Math.max(-maxScroll, Math.min(0, newY));
    }

    container.setAttribute("data-zoya-scroll-y", newY.toString());
    container.setAttribute("data-zoya-scroll-x", newX.toString());

    // Apply smooth CSS transform to inner target or container itself
    const innerContent =
      container.querySelector<HTMLElement>("[data-scroll-content], video, canvas, img, .scroll-target") ||
      (container.firstElementChild as HTMLElement) ||
      container;

    innerContent.style.transition = "transform 0.25s cubic-bezier(0.25, 1, 0.5, 1)";
    innerContent.style.transform = `translate3d(${newX}px, ${newY}px, 0)`;

    return true;
  } catch (err) {
    console.warn("CSS scroll transform notice:", err);
    return false;
  }
}

/**
 * Robust Programmatic Scrolling Automation for Active Browser Context & Shared Screen Viewports
 */
export function programmaticScroll(
  options: ProgrammaticScrollOptions = {}
): ScrollResult {
  if (typeof window === "undefined") {
    return { success: false, deltaY: 0, deltaX: 0, targetType: "window" };
  }

  const {
    direction = "down",
    amount = "medium",
    targetSelector,
    behavior = "smooth",
    targetElement,
    useCssTransformFallback = true,
  } = options;

  const { deltaY, deltaX } = calculateScrollDelta(direction, amount);
  let scrolled = false;
  let targetType: ScrollResult["targetType"] = "window";
  let targetName: string | undefined;
  let newScrollTop: number | undefined;

  // 1. Explicit Target Element or Selector
  if (targetElement || targetSelector) {
    const el = targetElement || (targetSelector ? document.querySelector<HTMLElement>(targetSelector) : null);
    if (el) {
      const prevTop = el.scrollTop;
      const prevLeft = el.scrollLeft;

      if (direction === "top") {
        el.scrollTo({ top: 0, behavior });
      } else if (direction === "bottom") {
        el.scrollTo({ top: el.scrollHeight, behavior });
      } else {
        el.scrollBy({ top: deltaY, left: deltaX, behavior });
      }

      if (el.scrollTop !== prevTop || el.scrollLeft !== prevLeft || el.scrollHeight > el.clientHeight) {
        scrolled = true;
        targetType = "container";
        targetName = el.getAttribute("aria-label") || el.getAttribute("id") || el.tagName.toLowerCase();
        newScrollTop = el.scrollTop;
      } else if (useCssTransformFallback) {
        // Fallback to CSS transform positioning
        const cssScrolled = applyCssScrollTransform(el, deltaY, deltaX);
        if (cssScrolled) {
          scrolled = true;
          targetType = "css-transform";
          targetName = "shared-screen-viewport";
        }
      }
    }
  }

  // 2. Active Shared Screen Viewports & Screen Vision Containers
  if (!scrolled) {
    const screenContainers = Array.from(
      document.querySelectorAll<HTMLElement>(
        "[data-screen-viewport], [data-screen-stream], .screen-vision-preview, .screen-stream-container, [data-scroll-viewport]"
      )
    );

    for (const sEl of screenContainers) {
      if (sEl.scrollHeight > sEl.clientHeight + 10 || sEl.scrollWidth > sEl.clientWidth + 10) {
        sEl.scrollBy({ top: deltaY, left: deltaX, behavior });
        scrolled = true;
        targetType = "active-screen-viewer";
        targetName = "Screen Feed";
        newScrollTop = sEl.scrollTop;
        break;
      } else if (useCssTransformFallback) {
        applyCssScrollTransform(sEl, deltaY, deltaX);
        scrolled = true;
        targetType = "active-screen-viewer";
        targetName = "Screen Feed (CSS)";
        break;
      }
    }
  }

  // 3. Open Modals, Dialogs & Active Scrollable DOM Containers
  if (!scrolled) {
    try {
      const allContainers = Array.from(
        document.querySelectorAll<HTMLElement>(
          "[role='dialog'], .fixed, [aria-modal='true'], main, section, article, div.overflow-y-auto, div.overflow-auto, ul, ol, form, #root"
        )
      );

      const scrollableElements: { el: HTMLElement; score: number; isModal: boolean }[] = [];

      for (const el of allContainers) {
        if (el.scrollHeight > el.clientHeight + 12 && el.clientHeight > 45) {
          const style = window.getComputedStyle(el);
          const overflowY = style.overflowY || style.overflow;
          const isScrollableStyle =
            overflowY === "auto" ||
            overflowY === "scroll" ||
            overflowY === "overlay" ||
            el.classList.contains("overflow-y-auto") ||
            el.classList.contains("overflow-auto") ||
            el.classList.contains("overflow-scroll") ||
            el.classList.contains("overflow-y-scroll");

          if (isScrollableStyle || el.scrollHeight > el.clientHeight + 60) {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0 && rect.top < window.innerHeight && rect.bottom > 0) {
              const zIndex = parseInt(style.zIndex, 10) || 0;
              const isModal =
                el.getAttribute("role") === "dialog" ||
                el.getAttribute("aria-modal") === "true" ||
                style.position === "fixed" ||
                style.position === "absolute";
              const score = (isModal ? 2000 : 0) + zIndex + (rect.width * rect.height) / 1000;
              scrollableElements.push({ el, score, isModal });
            }
          }
        }
      }

      scrollableElements.sort((a, b) => b.score - a.score);

      for (const item of scrollableElements) {
        const el = item.el;
        const prevTop = el.scrollTop;
        if (direction === "top") {
          el.scrollTo({ top: 0, behavior });
        } else if (direction === "bottom") {
          el.scrollTo({ top: el.scrollHeight, behavior });
        } else {
          el.scrollBy({ top: deltaY, left: deltaX, behavior });
        }

        if (el.scrollTop !== prevTop || el.scrollHeight > el.clientHeight) {
          scrolled = true;
          targetType = item.isModal ? "container" : "container";
          targetName = el.getAttribute("aria-label") || el.getAttribute("id") || el.tagName.toLowerCase();
          newScrollTop = el.scrollTop;
          break;
        }
      }
    } catch (e) {
      console.warn("Modal/container scroll inspection notice:", e);
    }
  }

  // 4. Primary Browser Window, documentElement, and document.body
  try {
    if (direction === "top") {
      window.scrollTo({ top: 0, behavior });
      if (document.documentElement) document.documentElement.scrollTo({ top: 0, behavior });
      if (document.body) document.body.scrollTo({ top: 0, behavior });
    } else if (direction === "bottom") {
      const maxH = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
      window.scrollTo({ top: maxH, behavior });
      if (document.documentElement) document.documentElement.scrollTo({ top: maxH, behavior });
      if (document.body) document.body.scrollTo({ top: maxH, behavior });
    } else {
      window.scrollBy({ top: deltaY, left: deltaX, behavior });
      if (document.documentElement) {
        document.documentElement.scrollBy({ top: deltaY, left: deltaX, behavior });
      }
      if (document.body) {
        document.body.scrollBy({ top: deltaY, left: deltaX, behavior });
      }
      if (document.scrollingElement) {
        document.scrollingElement.scrollBy({ top: deltaY, left: deltaX, behavior });
      }
    }
    scrolled = true;
    newScrollTop = window.scrollY || document.documentElement.scrollTop;
  } catch (e) {
    console.warn("Main window scroll notice:", e);
  }

  // 5. Parent Window (if nested in iframe)
  try {
    if (window.parent && window.parent !== window) {
      if (direction === "top") {
        window.parent.scrollTo({ top: 0, behavior });
      } else if (direction === "bottom") {
        window.parent.scrollTo({ top: 999999, behavior });
      } else {
        window.parent.scrollBy({ top: deltaY, left: deltaX, behavior });
      }
      targetType = "iframe";
    }
  } catch (_) {
    // Cross-origin iframe boundary, ignore safely
  }

  // 6. Dispatch Synthetic Events (Wheel, Touch, Keydown) for Active Event Listeners
  try {
    const activeTarget = document.activeElement || document.body;

    const wheelEvent = new WheelEvent("wheel", {
      deltaY,
      deltaX,
      deltaMode: 0,
      bubbles: true,
      cancelable: true,
      view: window,
    });
    activeTarget.dispatchEvent(wheelEvent);
    window.dispatchEvent(wheelEvent);

    const key =
      direction === "down"
        ? amount === "large"
          ? "PageDown"
          : "ArrowDown"
        : direction === "up"
        ? amount === "large"
          ? "PageUp"
          : "ArrowUp"
        : direction === "top"
        ? "Home"
        : direction === "bottom"
        ? "End"
        : "ArrowDown";

    const keyCode =
      key === "PageDown" ? 34 : key === "PageUp" ? 33 : key === "Home" ? 36 : key === "End" ? 35 : key === "ArrowDown" ? 40 : 38;

    const keyEvent = new KeyboardEvent("keydown", {
      key,
      code: key,
      keyCode,
      which: keyCode,
      bubbles: true,
      cancelable: true,
    });
    activeTarget.dispatchEvent(keyEvent);
  } catch (e) {
    console.warn("Synthetic scroll event dispatch notice:", e);
  }

  // Show Visual HUD Glider on screen
  showScrollHudIndicator(direction, deltaY || deltaX, targetName);

  return {
    success: scrolled,
    deltaY,
    deltaX,
    targetType,
    targetName,
    newScrollTop,
  };
}

/**
 * Standard scrollPage wrapper backward-compatible with all existing handlers
 */
export function scrollPage(
  direction: "up" | "down" | "left" | "right" | "top" | "bottom" = "down",
  amount: "small" | "medium" | "large" | number = "medium",
  targetSelector?: string
): boolean {
  const result = programmaticScroll({
    direction,
    amount,
    targetSelector,
  });
  return result.success;
}

/**
 * Scrolls to a specific position (top, bottom, or pixel offset)
 */
export function scrollToPosition(
  position: "top" | "bottom" | "start" | "end" | number,
  targetSelector?: string,
  behavior: ScrollBehavior = "smooth"
): boolean {
  if (typeof position === "number") {
    const el = targetSelector ? document.querySelector<HTMLElement>(targetSelector) : window;
    if (el && "scrollTo" in el) {
      el.scrollTo({ top: position, behavior });
      showScrollHudIndicator("to position", position);
      return true;
    }
  }

  const dir = position === "top" || position === "start" ? "top" : "bottom";
  return scrollPage(dir, "large", targetSelector);
}

/**
 * Scrolls a specific target element into the center of the viewport
 */
export function scrollToElement(selectorOrText: string): boolean {
  if (typeof document === "undefined") return false;

  let el = document.querySelector<HTMLElement>(selectorOrText);
  if (!el) {
    const all = Array.from(document.querySelectorAll<HTMLElement>("*"));
    const match = all.find(
      (node) =>
        node.textContent &&
        node.textContent.toLowerCase().includes(selectorOrText.toLowerCase()) &&
        node.children.length === 0
    );
    if (match) el = match;
  }

  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    showScrollHudIndicator("to element", 0, el.tagName.toLowerCase());
    return true;
  }

  return false;
}

/**
 * Specialized scroll controller for shared screen content viewports
 */
export function scrollSharedScreenContent(
  direction: "up" | "down" | "left" | "right" | "top" | "bottom",
  amount: "small" | "medium" | "large" | number = "medium"
): boolean {
  return scrollPage(direction, amount, "[data-screen-viewport], [data-screen-stream], .screen-vision-preview");
}

export function getVisibleInteractiveElements(): {
  element: HTMLElement;
  text: string;
  role: string;
  rect: DOMRect;
}[] {
  if (typeof document === "undefined") return [];

  const selector = [
    "a[href]",
    "button",
    "input",
    "select",
    "textarea",
    "[role='button']",
    "[role='link']",
    "[role='option']",
    "[role='checkbox']",
    "[role='tab']",
    "[role='menuitem']",
    "[role='searchbox']",
    "[onclick]",
    ".cursor-pointer",
    "[tabindex]:not([tabindex='-1'])",
    "img",
    "summary",
    "video",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "p", "span", "div", "label", "li", "article", "section", "td", "th"
  ].join(",");

  const rawElements = Array.from(document.querySelectorAll<HTMLElement>(selector));
  const results: { element: HTMLElement; text: string; role: string; rect: DOMRect }[] = [];

  for (const el of rawElements) {
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;

    // Must be near or inside current viewport
    if (rect.bottom < -100 || rect.top > window.innerHeight + 100) continue;

    const style = window.getComputedStyle(el);
    if (style.visibility === "hidden" || style.display === "none" || style.opacity === "0") {
      continue;
    }

    let text = (
      el.innerText ||
      el.textContent ||
      el.getAttribute("aria-label") ||
      el.getAttribute("title") ||
      el.getAttribute("placeholder") ||
      el.getAttribute("alt") ||
      (el as HTMLInputElement).value ||
      ""
    ).trim();

    if (!text) {
      const titleEl = el.querySelector("title, svg title");
      if (titleEl) text = titleEl.textContent?.trim() || "";
    }

    // Filter out huge structural containers unless they have cursor-pointer or button semantics
    if (
      el.children.length > 6 &&
      !el.getAttribute("onclick") &&
      el.tagName !== "BUTTON" &&
      el.tagName !== "A" &&
      !el.classList.contains("cursor-pointer")
    ) {
      continue;
    }

    results.push({
      element: el,
      text,
      role: el.getAttribute("role") || el.tagName.toLowerCase(),
      rect,
    });
  }

  return results;
}

function dispatchFullTap(targetEl: HTMLElement): string {
  // Find nearest clickable container (button, link, role=button, cursor-pointer) or targetEl
  let clickableTarget: HTMLElement = targetEl;
  let curr: HTMLElement | null = targetEl;
  while (curr && curr !== document.body && curr !== document.documentElement) {
    if (
      curr.tagName === "BUTTON" ||
      curr.tagName === "A" ||
      curr.getAttribute("role") === "button" ||
      curr.getAttribute("onclick") ||
      curr.classList.contains("cursor-pointer")
    ) {
      clickableTarget = curr;
      break;
    }
    curr = curr.parentElement;
  }

  // Scroll target into middle of viewport
  try {
    clickableTarget.scrollIntoView({ behavior: "smooth", block: "center" });
  } catch (e) {}

  const rect = clickableTarget.getBoundingClientRect();
  const clientX = rect.left + (rect.width > 0 ? rect.width / 2 : 10);
  const clientY = rect.top + (rect.height > 0 ? rect.height / 2 : 10);

  // Visual Ripple & Pulse Ring Overlay
  const pulse = document.createElement("div");
  pulse.style.position = "fixed";
  pulse.style.top = `${rect.top}px`;
  pulse.style.left = `${rect.left}px`;
  pulse.style.width = `${Math.max(rect.width, 36)}px`;
  pulse.style.height = `${Math.max(rect.height, 36)}px`;
  pulse.style.borderRadius = "12px";
  pulse.style.border = "3px solid #00E5FF";
  pulse.style.backgroundColor = "rgba(0, 229, 255, 0.3)";
  pulse.style.boxShadow = "0 0 35px #00E5FF, inset 0 0 25px #00E5FF";
  pulse.style.pointerEvents = "none";
  pulse.style.zIndex = "999999";
  pulse.style.transition = "all 0.4s ease-out";

  document.body.appendChild(pulse);
  setTimeout(() => {
    pulse.style.opacity = "0";
    pulse.style.transform = "scale(1.25)";
    setTimeout(() => pulse.remove(), 400);
  }, 300);

  // Focus
  try {
    clickableTarget.focus();
  } catch (e) {}

  // Dispatch full interaction event sequence
  const eventOptions = {
    bubbles: true,
    cancelable: true,
    view: window,
    clientX,
    clientY,
    screenX: clientX,
    screenY: clientY,
    button: 0,
    buttons: 1,
  };

  try {
    if (typeof PointerEvent !== "undefined") {
      clickableTarget.dispatchEvent(new PointerEvent("pointerdown", eventOptions));
    }
    if (typeof TouchEvent !== "undefined") {
      try {
        const touch = new Touch({
          identifier: Date.now(),
          target: clickableTarget,
          clientX,
          clientY,
        });
        clickableTarget.dispatchEvent(
          new TouchEvent("touchstart", {
            bubbles: true,
            cancelable: true,
            touches: [touch],
            targetTouches: [touch],
            changedTouches: [touch],
          })
        );
      } catch (touchErr) {}
    }
    clickableTarget.dispatchEvent(new MouseEvent("mousedown", eventOptions));

    if (typeof PointerEvent !== "undefined") {
      clickableTarget.dispatchEvent(new PointerEvent("pointerup", eventOptions));
    }
    if (typeof TouchEvent !== "undefined") {
      try {
        const touch = new Touch({
          identifier: Date.now(),
          target: clickableTarget,
          clientX,
          clientY,
        });
        clickableTarget.dispatchEvent(
          new TouchEvent("touchend", {
            bubbles: true,
            cancelable: true,
            touches: [],
            targetTouches: [],
            changedTouches: [touch],
          })
        );
      } catch (touchErr) {}
    }
    clickableTarget.dispatchEvent(new MouseEvent("mouseup", eventOptions));

    // Native click
    clickableTarget.click();

    // Synthetic click event
    clickableTarget.dispatchEvent(new MouseEvent("click", eventOptions));
  } catch (err) {
    console.error("Tap dispatch error:", err);
    clickableTarget.click();
  }

  const targetName =
    clickableTarget.innerText ||
    clickableTarget.getAttribute("aria-label") ||
    clickableTarget.getAttribute("title") ||
    clickableTarget.tagName.toLowerCase();

  return targetName.trim().slice(0, 40) || "button";
}

export function tapElement(targetQuery: string): TapResult {
  if (typeof document === "undefined") {
    return { success: false, errorReason: "notFound" };
  }

  const rawTarget = targetQuery.toLowerCase().trim();

  // Safety Check
  for (const word of SENSITIVE_KEYWORDS) {
    if (rawTarget.includes(word)) {
      return {
        success: false,
        errorReason: "safety",
        safetyMessage: `Boss, kya aap "${word}" action par tap karne ke liye confirm karte hain?`,
      };
    }
  }

  const candidates = getVisibleInteractiveElements();
  if (candidates.length === 0) {
    return { success: false, errorReason: "notFound" };
  }

  // Position / Ordinal Detection
  let selectedCandidate: HTMLElement | null = null;
  let elementName = "";

  const isFirst =
    rawTarget.includes("pehle") ||
    rawTarget.includes("pehla") ||
    rawTarget.includes("first") ||
    rawTarget.includes("1st") ||
    rawTarget.includes("top");

  const isSecond =
    rawTarget.includes("doosre") ||
    rawTarget.includes("doosra") ||
    rawTarget.includes("second") ||
    rawTarget.includes("2nd");

  const isThird =
    rawTarget.includes("teesre") ||
    rawTarget.includes("teesra") ||
    rawTarget.includes("third") ||
    rawTarget.includes("3rd");

  const isGenericYaha =
    rawTarget.includes("yaha") ||
    rawTarget.includes("yahan") ||
    rawTarget.includes("ispe") ||
    rawTarget.includes("is pe") ||
    rawTarget.includes("isko") ||
    rawTarget === "here" ||
    rawTarget === "this";

  if (isFirst && candidates.length >= 1) {
    selectedCandidate = candidates[0].element;
    elementName = candidates[0].text || "Pehla result/button";
  } else if (isSecond && candidates.length >= 2) {
    selectedCandidate = candidates[1].element;
    elementName = candidates[1].text || "Doosra result/button";
  } else if (isThird && candidates.length >= 3) {
    selectedCandidate = candidates[2].element;
    elementName = candidates[2].text || "Teesra result/button";
  } else if (isGenericYaha && candidates.length > 0) {
    // Pick the element closest to viewport center or top prominent button
    const centerViewportY = window.innerHeight / 2;
    let closestIndex = 0;
    let minDistance = Infinity;

    candidates.forEach((cand, idx) => {
      const dist = Math.abs(cand.rect.top + cand.rect.height / 2 - centerViewportY);
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = idx;
      }
    });

    selectedCandidate = candidates[closestIndex].element;
    elementName = candidates[closestIndex].text || "Selected element";
  } else {
    // Clean target query
    const cleanQuery = rawTarget
      .replace(/\b(zoya|tap|click|karo|is|ispe|button|link|option|select|pe|par|ko|open|khol|do)\b/gi, "")
      .trim();

    if (cleanQuery) {
      // 1. Check exact or substring match
      const matched = candidates.find(
        (c) => c.text.toLowerCase().includes(cleanQuery) || cleanQuery.includes(c.text.toLowerCase())
      );

      if (matched) {
        selectedCandidate = matched.element;
        elementName = matched.text || cleanQuery;
      } else {
        // 2. Word token fuzzy match
        const tokens = cleanQuery.split(/\s+/);
        const fuzzyMatched = candidates.find((c) =>
          tokens.some((token) => token.length > 1 && c.text.toLowerCase().includes(token))
        );

        if (fuzzyMatched) {
          selectedCandidate = fuzzyMatched.element;
          elementName = fuzzyMatched.text;
        }
      }
    }
  }

  // Fallback if still no target selected
  if (!selectedCandidate && candidates.length > 0) {
    selectedCandidate = candidates[0].element;
    elementName = candidates[0].text || "Element";
  }

  if (!selectedCandidate) {
    return { success: false, errorReason: "notFound" };
  }

  const tappedName = dispatchFullTap(selectedCandidate);
  return { success: true, elementName: elementName || tappedName };
}
