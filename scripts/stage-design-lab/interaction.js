/**
 * Canvas interaction — tools, hover, drag-rect placement, resize handles.
 */
(function (global) {
  "use strict";

  const TOOLS = ["select", "paint", "machinery", "preview"];

  function normalizeRect(r0, c0, r1, c1, maxRow, maxCol) {
    return {
      rowStart: Math.max(0, Math.min(r0, r1, maxRow)),
      rowEnd: Math.max(0, Math.min(Math.max(r0, r1), maxRow)),
      colStart: Math.max(0, Math.min(c0, c1, maxCol)),
      colEnd: Math.max(0, Math.min(Math.max(c0, c1), maxCol)),
    };
  }

  function rectFromBounds(b) {
    if (!b) return null;
    return {
      rowStart: b.rowStart,
      rowEnd: b.rowEnd,
      colStart: b.colStart,
      colEnd: b.colEnd,
    };
  }

  function createInteractionController(opts) {
    const onChange = opts.onChange || (() => {});
    let tool = opts.initialTool || "select";
    let hoverCell = null;
    let dragState = null;
    let selectedTemplateKind = opts.initialTemplateKind || "hazard_platform";
    let panning = false;
    let panStart = null;
    let priorTool = "select";

    function setTool(next) {
      if (!TOOLS.includes(next)) return;
      tool = next;
      dragState = null;
      onChange({ type: "tool", tool });
    }

    function getTool() {
      return tool;
    }

    function setSelectedTemplateKind(kind) {
      selectedTemplateKind = kind;
      onChange({ type: "template", kind });
    }

    function getSelectedTemplateKind() {
      return selectedTemplateKind;
    }

    let suppressNextClick = false;

    function consumeClick() {
      if (suppressNextClick) {
        suppressNextClick = false;
        return true;
      }
      return false;
    }

    function setHoverCell(cell) {
      hoverCell = cell;
      onChange({ type: "hover", cell });
    }

    function getHoverCell() {
      return hoverCell;
    }

    function getDragRect() {
      if (!dragState || dragState.mode !== "create") return null;
      return dragState.rect;
    }

    function getResizeState() {
      if (!dragState || dragState.mode !== "resize") return null;
      return dragState;
    }

    function hitTestHandle(lastView, bounds, cssX, cssY, hitTestCell) {
      if (!lastView || !bounds || !hitTestCell) return null;
      const handles = [
        { id: "nw", row: bounds.rowStart, col: bounds.colStart },
        { id: "ne", row: bounds.rowStart, col: bounds.colEnd },
        { id: "sw", row: bounds.rowEnd, col: bounds.colStart },
        { id: "se", row: bounds.rowEnd, col: bounds.colEnd },
      ];
      const { startX, startY, scale, cell, gap, rowCount } = lastView;
      const stride = cell + gap;
      for (const h of handles) {
        const rr = rowCount - 1 - h.row;
        const cx = startX + (h.col * stride + cell / 2) * scale;
        const cy = startY + (rr * stride + cell / 2) * scale;
        const dx = cssX - cx;
        const dy = cssY - cy;
        if (dx * dx + dy * dy <= Math.pow(Math.max(8, cell * scale * 0.35), 2)) {
          return h.id;
        }
      }
      return null;
    }

    function pointerDown(ev, ctx) {
      const { lastView, hitTestCell, columns, rowCount, selectedBounds, onCreate, onResizeStart } = ctx;
      if (!lastView) return false;
      const rect = ev.currentTarget.getBoundingClientRect();
      const cssX = ev.clientX - rect.left;
      const cssY = ev.clientY - rect.top;
      const hit = hitTestCell(lastView, cssX, cssY);
      if (!hit) return false;

      if (tool === "preview" || (tool === "select" && ev.button === 1)) {
        panning = true;
        panStart = { x: ev.clientX, y: ev.clientY, scrollLeft: ctx.canvasWrap.scrollLeft, scrollTop: ctx.canvasWrap.scrollTop };
        return true;
      }

      if (tool === "machinery") {
        dragState = {
          mode: "create",
          rect: normalizeRect(hit.globalRowIndex, hit.col, hit.globalRowIndex, hit.col, rowCount - 1, columns - 1),
          kind: selectedTemplateKind,
        };
        onChange({ type: "dragStart", rect: dragState.rect });
        return true;
      }

      if (tool === "select" && selectedBounds) {
        const handle = hitTestHandle(lastView, selectedBounds, cssX, cssY, hitTestCell);
        if (handle) {
          dragState = {
            mode: "resize",
            handle,
            bounds: { ...selectedBounds },
            startHit: hit,
          };
          if (onResizeStart) onResizeStart(dragState);
          return true;
        }
      }

      return false;
    }

    function pointerMove(ev, ctx) {
      const { lastView, hitTestCell, columns, rowCount, canvasWrap } = ctx;
      if (!lastView) return;
      const rect = ev.currentTarget.getBoundingClientRect();
      const cssX = ev.clientX - rect.left;
      const cssY = ev.clientY - rect.top;

      if (panning && panStart) {
        canvasWrap.scrollLeft = panStart.scrollLeft - (ev.clientX - panStart.x);
        canvasWrap.scrollTop = panStart.scrollTop - (ev.clientY - panStart.y);
        return;
      }

      const hit = hitTestCell(lastView, cssX, cssY);
      setHoverCell(hit);

      if (dragState?.mode === "create" && hit) {
        dragState.rect = normalizeRect(
          dragState.rect.rowStart,
          dragState.rect.colStart,
          hit.globalRowIndex,
          hit.col,
          rowCount - 1,
          columns - 1
        );
        onChange({ type: "dragMove", rect: dragState.rect });
      }

      if (dragState?.mode === "resize" && hit) {
        const b = { ...dragState.bounds };
        const h = dragState.handle;
        if (h.includes("n")) b.rowStart = hit.globalRowIndex;
        if (h.includes("s")) b.rowEnd = hit.globalRowIndex;
        if (h.includes("w")) b.colStart = hit.col;
        if (h.includes("e")) b.colEnd = hit.col;
        if (b.rowStart > b.rowEnd) [b.rowStart, b.rowEnd] = [b.rowEnd, b.rowStart];
        if (b.colStart > b.colEnd) [b.colStart, b.colEnd] = [b.colEnd, b.colStart];
        dragState.bounds = b;
        onChange({ type: "resizeMove", bounds: b });
      }
    }

    function pointerUp(ev, ctx) {
      if (panning) {
        panning = false;
        panStart = null;
        return null;
      }
      if (!dragState) return null;

      if (dragState.mode === "create") {
        const result = { type: "create", kind: dragState.kind, bounds: { ...dragState.rect } };
        dragState = null;
        suppressNextClick = true;
        onChange({ type: "dragEnd", bounds: result.bounds });
        if (ctx.onCreate) ctx.onCreate(result);
        return result;
      }

      if (dragState.mode === "resize") {
        const result = { type: "resize", bounds: { ...dragState.bounds } };
        const b = result.bounds;
        dragState = null;
        suppressNextClick = true;
        onChange({ type: "resizeEnd", bounds: b });
        if (ctx.onResizeEnd) ctx.onResizeEnd(result);
        return result;
      }
      return null;
    }

    function cancelDrag() {
      dragState = null;
      panning = false;
      panStart = null;
    }

    return {
      TOOLS,
      setTool,
      getTool,
      setSelectedTemplateKind,
      getSelectedTemplateKind,
      setHoverCell,
      getHoverCell,
      getDragRect,
      getResizeState,
      hitTestHandle,
      pointerDown,
      pointerMove,
      pointerUp,
      cancelDrag,
      consumeClick,
      normalizeRect,
      rectFromBounds,
    };
  }

  global.StageDesignInteraction = { TOOLS, createInteractionController, normalizeRect, rectFromBounds };
})(typeof window !== "undefined" ? window : globalThis);
