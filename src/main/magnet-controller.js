const MAGNET_EDGES = ["left", "right", "top", "bottom"];
const DEFAULT_MIN_SCALE_FACTOR = 0.5;
const DEFAULT_MAX_SCALE_FACTOR = 8;

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function validRect(rect) {
  return Number.isFinite(Number(rect?.x)) && Number.isFinite(Number(rect?.y)) &&
    Number.isFinite(Number(rect?.width)) && Number.isFinite(Number(rect?.height)) &&
    Number(rect.width) > 0 && Number(rect.height) > 0;
}

function normalizeScaleFactor(value, options = {}) {
  const minimum = Number.isFinite(Number(options?.minimum))
    ? Number(options.minimum)
    : DEFAULT_MIN_SCALE_FACTOR;
  const maximum = Number.isFinite(Number(options?.maximum))
    ? Number(options.maximum)
    : DEFAULT_MAX_SCALE_FACTOR;
  const factor = Number(value);
  if (!Number.isFinite(factor) || factor < minimum || factor > maximum) return null;
  return factor;
}

function intersectionArea(left, right) {
  if (!validRect(left) || !validRect(right)) return 0;
  const width = Math.max(0, Math.min(left.x + left.width, right.x + right.width) - Math.max(left.x, right.x));
  const height = Math.max(0, Math.min(left.y + left.height, right.y + right.height) - Math.max(left.y, right.y));
  return width * height;
}

function constrainBoundsToWorkArea(bounds, workArea) {
  if (!validRect(bounds) || !validRect(workArea)) return { ...bounds };
  const areaX = Math.round(Number(workArea.x));
  const areaY = Math.round(Number(workArea.y));
  const areaWidth = Math.max(1, Math.round(Number(workArea.width)));
  const areaHeight = Math.max(1, Math.round(Number(workArea.height)));
  const width = Math.min(areaWidth, Math.max(1, Math.round(Number(bounds.width))));
  const height = Math.min(areaHeight, Math.max(1, Math.round(Number(bounds.height))));
  return {
    x: Math.round(clamp(Number(bounds.x), areaX, areaX + areaWidth - width)),
    y: Math.round(clamp(Number(bounds.y), areaY, areaY + areaHeight - height)),
    width,
    height
  };
}

function resolveDisplayForBounds(displays, bounds, rememberedId = null, options = {}) {
  const candidates = Array.isArray(displays) ? displays.filter((display) => validRect(display?.bounds)) : [];
  if (!candidates.length) return null;
  const remembered = candidates.find((display) => String(display.id) === String(rememberedId));
  if (!validRect(bounds)) return remembered || candidates[0];

  const center = { x: Number(bounds.x) + Number(bounds.width) / 2, y: Number(bounds.y) + Number(bounds.height) / 2 };
  const hysteresis = Math.max(0, Number(options?.hysteresis) || 0);
  if (remembered && hysteresis > 0) {
    const rememberedBounds = remembered.bounds;
    const insideRememberedBand = center.x > rememberedBounds.x - hysteresis &&
      center.x < rememberedBounds.x + rememberedBounds.width + hysteresis &&
      center.y > rememberedBounds.y - hysteresis &&
      center.y < rememberedBounds.y + rememberedBounds.height + hysteresis;
    if (insideRememberedBand) return remembered;
  }
  const centered = candidates.find((display) =>
    center.x >= display.bounds.x && center.x <= display.bounds.x + display.bounds.width &&
    center.y >= display.bounds.y && center.y <= display.bounds.y + display.bounds.height
  );
  if (centered) return centered;

  const ranked = candidates
    .map((display, index) => ({
      display,
      index,
      area: intersectionArea(bounds, display.bounds),
      remembered: display === remembered ? 1 : 0,
      distance: Math.hypot(
        center.x - (display.bounds.x + display.bounds.width / 2),
        center.y - (display.bounds.y + display.bounds.height / 2)
      )
    }))
    .sort((left, right) => {
      if (right.area !== left.area) return right.area - left.area;
      if (left.area > 0 && right.area > 0 && right.remembered !== left.remembered) return right.remembered - left.remembered;
      return left.distance - right.distance || right.remembered - left.remembered || left.index - right.index;
    });
  return ranked[0].display;
}

function resolveScaleAnchor(bounds, anchor) {
  const center = {
    x: Number(bounds.x) + Number(bounds.width) / 2,
    y: Number(bounds.y) + Number(bounds.height) / 2
  };
  if (anchor && typeof anchor === "object") {
    return {
      x: anchor.x === "left" ? Number(bounds.x)
        : anchor.x === "right" ? Number(bounds.x) + Number(bounds.width)
          : center.x,
      y: anchor.y === "top" ? Number(bounds.y)
        : anchor.y === "bottom" ? Number(bounds.y) + Number(bounds.height)
          : center.y
    };
  }
  if (anchor === "left") return { x: Number(bounds.x), y: center.y };
  if (anchor === "right") return { x: Number(bounds.x) + Number(bounds.width), y: center.y };
  if (anchor === "top") return { x: center.x, y: Number(bounds.y) };
  if (anchor === "bottom") return { x: center.x, y: Number(bounds.y) + Number(bounds.height) };
  return center;
}

function scaleBoundsForDisplay(bounds, fromScaleFactor, toScaleFactor, anchor = "center") {
  if (!validRect(bounds)) return { ...bounds };
  const from = normalizeScaleFactor(fromScaleFactor);
  const to = normalizeScaleFactor(toScaleFactor);
  if (!from || !to || Math.abs(from - to) < 0.0001) return { ...bounds };
  const ratio = from / to;
  const width = Math.max(1, Math.round(Number(bounds.width) * ratio));
  const height = Math.max(1, Math.round(Number(bounds.height) * ratio));
  const anchorPoint = resolveScaleAnchor(bounds, anchor);
  return {
    x: Math.round(anchorPoint.x - (anchor?.x === "left" || anchor === "left" ? 0 : anchor?.x === "right" || anchor === "right" ? width : width / 2)),
    y: Math.round(anchorPoint.y - (anchor?.y === "top" || anchor === "top" ? 0 : anchor?.y === "bottom" || anchor === "bottom" ? height : height / 2)),
    width,
    height
  };
}

function isMagnetEdge(value) {
  return MAGNET_EDGES.includes(value);
}

function edgeDistances(bounds, workArea) {
  return {
    left: Math.abs(bounds.x - workArea.x),
    right: Math.abs(workArea.x + workArea.width - (bounds.x + bounds.width)),
    top: Math.abs(bounds.y - workArea.y),
    bottom: Math.abs(workArea.y + workArea.height - (bounds.y + bounds.height))
  };
}

function chooseSnapEdge(bounds, workArea, options = {}) {
  const threshold = Math.max(1, Number(options.threshold) || 28);
  const cornerHysteresis = Math.max(0, Number(options.cornerHysteresis) || 8);
  const previousEdge = isMagnetEdge(options.previousEdge) ? options.previousEdge : null;
  const distances = edgeDistances(bounds, workArea);
  const candidates = MAGNET_EDGES
    .filter((edge) => distances[edge] <= threshold)
    .sort((left, right) => distances[left] - distances[right]);
  if (!candidates.length) return null;
  const nearestDistance = distances[candidates[0]];
  if (previousEdge && candidates.includes(previousEdge) && distances[previousEdge] <= nearestDistance + cornerHysteresis) {
    return previousEdge;
  }
  return candidates[0];
}

function snapExpandedBounds(bounds, workArea, edge) {
  const constrained = constrainBoundsToWorkArea(bounds, workArea);
  const width = constrained.width;
  const height = constrained.height;
  const minX = workArea.x;
  const maxX = workArea.x + Math.max(0, workArea.width - width);
  const minY = workArea.y;
  const maxY = workArea.y + Math.max(0, workArea.height - height);
  const next = {
    x: Math.round(clamp(constrained.x, minX, maxX)),
    y: Math.round(clamp(constrained.y, minY, maxY)),
    width,
    height
  };
  if (edge === "left") next.x = Math.round(workArea.x);
  if (edge === "right") next.x = Math.round(workArea.x + workArea.width - width);
  if (edge === "top") next.y = Math.round(workArea.y);
  if (edge === "bottom") next.y = Math.round(workArea.y + workArea.height - height);
  return next;
}

function meterSideForEdge(edge, fallback = "left") {
  if (edge === "left") return "right";
  if (edge === "right") return "left";
  return fallback === "right" ? "right" : "left";
}

function collapsedBounds(expandedBounds, workArea, edge, options = {}) {
  const strip = Math.max(2, Math.round(Number(options.strip) || 7));
  const sideVisible = options.keepMeter
    ? clamp(Math.round(Number(options.sideVisible) || strip), strip, expandedBounds.width)
    : strip;
  const next = { ...expandedBounds };
  if (edge === "left") next.x = Math.round(workArea.x - expandedBounds.width + sideVisible);
  if (edge === "right") next.x = Math.round(workArea.x + workArea.width - sideVisible);
  if (edge === "top") next.y = Math.round(workArea.y - expandedBounds.height + strip);
  if (edge === "bottom") next.y = Math.round(workArea.y + workArea.height - strip);
  return next;
}

function collapsedShapeRects(bounds, edge, options = {}) {
  if (!validRect(bounds) || !isMagnetEdge(edge)) return [];
  const width = Math.max(1, Math.round(Number(bounds.width)));
  const height = Math.max(1, Math.round(Number(bounds.height)));
  const strip = clamp(Math.round(Number(options.strip) || 7), 1, Math.min(width, height));
  const visibleWidth = options.keepMeter
    ? clamp(Math.round(Number(options.sideVisible) || strip), strip, width)
    : strip;
  if (edge === "left") return [{ x: width - visibleWidth, y: 0, width: visibleWidth, height }];
  if (edge === "right") return [{ x: 0, y: 0, width: visibleWidth, height }];
  if (edge === "top") return [{ x: 0, y: height - strip, width, height: strip }];
  return [{ x: 0, y: 0, width, height: strip }];
}

function activationRect(expandedBounds, workArea, edge, options = {}) {
  const strip = Math.max(2, Math.round(Number(options.strip) || 7));
  const margin = Math.max(0, Math.round(Number(options.margin) || 6));
  const sideVisible = options.keepMeter
    ? clamp(Math.round(Number(options.sideVisible) || strip), strip, expandedBounds.width)
    : strip;
  if (edge === "left") {
    return { x: workArea.x, y: expandedBounds.y, width: sideVisible + margin, height: expandedBounds.height };
  }
  if (edge === "right") {
    return {
      x: workArea.x + workArea.width - sideVisible - margin,
      y: expandedBounds.y,
      width: sideVisible + margin,
      height: expandedBounds.height
    };
  }
  if (edge === "top") {
    return { x: expandedBounds.x, y: workArea.y, width: expandedBounds.width, height: strip + margin };
  }
  return {
    x: expandedBounds.x,
    y: workArea.y + workArea.height - strip - margin,
    width: expandedBounds.width,
    height: strip + margin
  };
}

function pointInRect(point, rect, margin = 0) {
  return point.x >= rect.x - margin &&
    point.x <= rect.x + rect.width + margin &&
    point.y >= rect.y - margin &&
    point.y <= rect.y + rect.height + margin;
}

module.exports = {
  MAGNET_EDGES,
  activationRect,
  chooseSnapEdge,
  collapsedBounds,
  collapsedShapeRects,
  isMagnetEdge,
  meterSideForEdge,
  pointInRect,
  constrainBoundsToWorkArea,
  intersectionArea,
  normalizeScaleFactor,
  resolveDisplayForBounds,
  scaleBoundsForDisplay,
  snapExpandedBounds
};
