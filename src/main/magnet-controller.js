const MAGNET_EDGES = ["left", "right", "top", "bottom"];

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
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
  const width = Math.max(1, Math.round(bounds.width));
  const height = Math.max(1, Math.round(bounds.height));
  const minX = workArea.x;
  const maxX = workArea.x + Math.max(0, workArea.width - width);
  const minY = workArea.y;
  const maxY = workArea.y + Math.max(0, workArea.height - height);
  const next = {
    x: Math.round(clamp(bounds.x, minX, maxX)),
    y: Math.round(clamp(bounds.y, minY, maxY)),
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
  isMagnetEdge,
  meterSideForEdge,
  pointInRect,
  snapExpandedBounds
};
