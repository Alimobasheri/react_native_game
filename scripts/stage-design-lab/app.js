/**
 * Stage Design Lab — canvas-first UX (refactored).
 */
(function () {
  "use strict";

  const S = () => window.StageDesignSchema;
  const R = () => window.StageDesignRenderer;
  const E = () => window.StageDesignExport;
  const Sim = () => window.StageDesignHazardSim;
  const F = () => window.StageDesignFairness;
  const Cat = () => window.StageDesignHazardCatalog;
  const IX = () => window.StageDesignInteraction;

  const composer = window.StageDesignComposer.createComposer(S().createEmptyDocument());

  let useComposerMode = true;
  let pathLabPreviewOnly = false;
  let showDeviceFrame = false;
  let showMarkers = true;
  let showLabels = true;
  let animateHazards = true;
  let lastView = null;
  let syncJsonFromDoc = true;
  let sidebarSection = "stage";

  let playbackState = { waterRowIndex: 0, waterColIndex: 0, waterCol: 0, activeRow: -1, playing: false, elapsedSec: 0 };

  const interaction = IX().createInteractionController({
    initialTool: "select",
    initialTemplateKind: "hazard_platform",
    onChange: () => {
      updateToolbarUi();
      updateMachineryPaletteVisibility();
      tryRender({ scrollMode: "preserve", suppressStatus: true });
    },
  });

  const playback = window.StageDesignPlayback.createPlaybackController({
    getWaterSpeed: () => Number(el("sd_waterSpeed")?.value) || composer.getDocument().playback.waterSpeedPxPerSec,
    getRowHeight: () => Number(el("sd_rowHeight")?.value) || composer.getDocument().grid.rowHeightPx,
    getTotalRows: () => composer.getDocument().flattened?.totalRows || 0,
    getColumns: () => composer.getDocument().grid?.columns || 6,
    onTick: (t) => {
      playbackState = t;
      if (el("sd_scrubber")) {
        el("sd_scrubber").max = String(playback.getMaxElapsedSec() || 1);
        el("sd_scrubber").value = String(t.elapsedSec);
      }
      updatePlaybackUi(t);
      tryRender({ scrollMode: t.playing ? "active" : "preserve", suppressStatus: true });
    },
  });

  function el(id) {
    return document.getElementById(id);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function setStatus(text, isError) {
    const node = el("status");
    if (!node) return;
    node.className = isError ? "error" : "ok";
    node.textContent = text;
  }

  function setFairnessStatus(reportOrWarnings) {
    const node = el("fairnessStatus");
    if (!node) return;
    const warnings = Array.isArray(reportOrWarnings) ? reportOrWarnings : reportOrWarnings?.warnings || [];
    if (!warnings.length) {
      node.className = "ok";
      node.textContent = "Reachability OK — every row has a path from the row below";
      return;
    }
    node.className = "error";
    node.innerHTML = escapeHtml(warnings[0]);
    if (warnings[0].match(/row (\d+)/)) {
      const link = document.createElement("button");
      link.type = "button";
      link.className = "linkBtn";
      link.textContent = " Jump to row";
      link.onclick = () => {
        const m = warnings[0].match(/row (\d+)/);
        if (m) goToRow(Number(m[1]));
      };
      node.appendChild(link);
    }
  }

  function readRenderOptions() {
    const cell = S().clampInt(Number(el("cellSize")?.value) || 22, 6, 70);
    if (el("cellSize")) el("cellSize").value = String(cell);
    return { cell, gap: 3, pad: 16, axisPadLeft: 34, axisPadTop: 30 };
  }

  function getSelectedBounds() {
    const hzId = composer.getSelectedHazardId();
    if (!hzId) return null;
    const hz = (composer.getDocument().hazards || []).find((h) => h.id === hzId);
    return hz ? S().getHazardBounds(hz) : null;
  }

  function updateStatusBar() {
    const bar = el("canvasStatusBar");
    if (!bar) return;
    const hover = interaction.getHoverCell();
    const doc = composer.getDocument();
    const parts = [];
    if (hover) {
      const row = doc.flattened?.rows?.[hover.globalRowIndex];
      parts.push(`Row ${hover.globalRowIndex} · Col ${hover.col}`);
      if (row?.macroPhase) parts.push(row.macroPhase.toUpperCase());
      if (row?.gaps?.length) parts.push(`gap [${row.gaps.join(",")}]`);
    } else {
      parts.push("Hover grid for row · col");
    }
    const selHz = composer.getSelectedHazardId();
    if (selHz) {
      const hz = (doc.hazards || []).find((h) => h.id === selHz);
      if (hz) {
        const cat = Cat()?.getByKind?.(hz.kind);
        parts.push(`${cat?.templateName || hz.kind}: ${Cat()?.boundsLabel?.(S().getHazardBounds(hz))}`);
      }
    }
    const tool = interaction.getTool();
    if (tool === "machinery") parts.push("One drag = one steel slab — exact rows/cols you select");
    if (tool === "paint") parts.push("Click cells to toggle block / gap");
    bar.textContent = parts.join(" · ");
  }

  function updateToolbarUi() {
    const tool = interaction.getTool();
    document.querySelectorAll(".toolBtn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tool === tool);
    });
  }

  function updateMachineryPaletteVisibility() {
    const pal = el("machineryPalette");
    if (pal) pal.classList.toggle("hidden", interaction.getTool() !== "machinery");
  }

  function updateTimelinePlayhead() {
    const bar = el("macroTimeline");
    if (!bar || !bar.querySelector(".timelineChunk")) return;
    let head = bar.querySelector(".timelinePlayhead");
    if (!head) {
      head = document.createElement("div");
      head.className = "timelinePlayhead";
      bar.appendChild(head);
    }
    const doc = composer.getDocument();
    const total = doc.flattened?.totalRows || 0;
    if (total <= 0) {
      head.style.display = "none";
      return;
    }
    head.style.display = "block";
    const rowFrac = Math.max(0, Math.min(total, playbackState.waterRowIndex ?? 0)) / total;
    head.style.left = `${rowFrac * 100}%`;
  }

  function updatePlaybackUi(t) {
    const doc = composer.getDocument();
    const wp = Sim()?.waterPosition?.(doc, t.elapsedSec);
    const waterRow = wp?.waterRowIndex ?? t.waterRowIndex ?? 0;
    if (el("sd_playbackTime")) {
      el("sd_playbackTime").textContent = `${t.elapsedSec.toFixed(2)}s · water row ${waterRow.toFixed(1)}`;
    }
    const atEnd = playback.isAtEnd?.() && !t.playing;
    if (el("btnWaterPlay")) el("btnWaterPlay").textContent = t.playing ? "Pause" : atEnd ? "Replay" : "Play";
    updateTimelinePlayhead();
    const hzId = composer.getSelectedHazardId();
    const phaseEl = el("hazardPhaseReadout");
    if (phaseEl && hzId && Sim()?.compute) {
      doc.playback = doc.playback || {};
      doc.playback.rowHeightPx = Number(el("sd_rowHeight")?.value) || doc.grid.rowHeightPx;
      doc.playback.waterSpeedPxPerSec = Number(el("sd_waterSpeed")?.value) || doc.stage.waterSpeedPxPerSec;
      const hz = (doc.hazards || []).find((h) => h.id === hzId);
      if (hz?.phases?.length) {
        const local = Sim().hazardAnimLocalSec(doc, hz, t.elapsedSec);
        const waiting = Sim().hazardAnimWaiting?.(doc, hz, t.elapsedSec);
        const pressDur = hz.params?.pressDurationSec ?? 0.8;
        if (waiting && hz.kind === "hazard_platform") {
          const needRow = Sim().hazardAnimStartRow(doc, hz);
          phaseEl.textContent = `waiting · water row ${waterRow.toFixed(1)} → need row ${needRow}`;
        } else if (hz.kind === "hazard_platform") {
          if (local <= 0) {
            phaseEl.textContent = "ready";
          } else if (local < pressDur) {
            phaseEl.textContent = `pressing ${Math.round((local / pressDur) * 100)}%`;
          } else {
            phaseEl.textContent = "held";
          }
        } else {
          let acc = 0;
          for (const ph of hz.phases) {
            if (local <= acc + ph.durationSec) {
              const p = ph.durationSec > 0 ? ((local - acc) / ph.durationSec) * 100 : 100;
              phaseEl.textContent = `${ph.name} ${Math.round(Math.max(0, p))}% @ ${local.toFixed(2)}s`;
              return;
            }
            acc += ph.durationSec;
          }
          phaseEl.textContent = hz.phases[hz.phases.length - 1]?.name || "—";
        }
      } else phaseEl.textContent = "";
    } else if (phaseEl) phaseEl.textContent = "";
  }

  function goToRow(rowIndex) {
    playback.stop();
    const doc = composer.getDocument();
    const rowHeight = Number(el("sd_rowHeight")?.value) || doc.grid.rowHeightPx;
    const speed = Number(el("sd_waterSpeed")?.value) || doc.stage.waterSpeedPxPerSec;
    const t = (rowIndex * rowHeight) / Math.max(1, speed);
    playback.setElapsedSec(t);
    composer.setSelectedGlobalRows([rowIndex]);
    tryRender({ scrollMode: "active", scrollBehavior: "smooth" });
    renderSelectionPanel();
  }

  function syncDocumentToJsonTextarea() {
    if (!syncJsonFromDoc) return;
    const ta = el("input");
    if (ta) ta.value = S().exportDocumentJson(composer.getDocument(), true);
  }

  function renderCatalogCards() {
    const root = el("catalogCards");
    if (!root || !Cat()) return;
    root.innerHTML = "";
    Cat().getAll().forEach((item) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className =
        "catalogCard" + (interaction.getSelectedTemplateKind() === item.kind ? " selected" : "");
      card.innerHTML = `<span class="catalogFlash">${escapeHtml(item.playerFlash || "—")}</span>
        <span class="catalogName">${escapeHtml(item.templateName)}</span>
        <span class="catalogDesc">${escapeHtml(item.description)}</span>`;
      card.addEventListener("click", () => {
        interaction.setSelectedTemplateKind(item.kind);
        document.querySelectorAll(".catalogCard").forEach((c) => c.classList.remove("selected"));
        card.classList.add("selected");
        setStatus(`${item.templateName} — drag a rectangle on the grid.`);
      });
      root.appendChild(card);
    });
  }

  function renderSegmentList() {
    const list = el("segmentList");
    if (!list) return;
    const doc = composer.getDocument();
    const sel = composer.getSelectedSegment()?.id;
    list.innerHTML = "";
    doc.segments.forEach((seg) => {
      const item = document.createElement("div");
      item.className = "segmentItem" + (seg.id === sel ? " selected" : "");
      item.innerHTML = `<span class="phaseTag phase-${seg.macroPhase}">${seg.macroPhase}</span>
        <span class="segLabel">${escapeHtml(seg.label)}</span>
        <span class="segMeta">${seg.rows.length} rows</span>`;
      item.addEventListener("click", () => {
        composer.setSelectedSegment(seg.id);
        composer.setSelectedHazardId(null);
        sidebarSection = "selection";
        refreshUi();
      });
      list.appendChild(item);
    });
  }

  function renderTimeline() {
    const bar = el("macroTimeline");
    if (!bar) return;
    const doc = composer.getDocument();
    const total = doc.flattened?.totalRows || 0;
    bar.innerHTML = "";
    if (!total) {
      bar.textContent = "Add segments to see macro timeline";
      return;
    }
    let rowOffset = 0;
    (doc.segments || []).forEach((seg) => {
      const pct = (seg.rows.length / total) * 100;
      const chunk = document.createElement("button");
      chunk.type = "button";
      chunk.className = `timelineChunk phase-${seg.macroPhase}`;
      chunk.style.flex = `0 0 ${pct}%`;
      chunk.title = `${seg.label} (${seg.rows.length} rows, ${seg.macroPhase})`;
      chunk.textContent = seg.label.length > 10 ? seg.label.slice(0, 9) + "…" : seg.label;
      chunk.addEventListener("click", () => {
        composer.setSelectedSegment(seg.id);
        composer.setSelectedGlobalRows([rowOffset]);
        goToRow(rowOffset);
      });
      bar.appendChild(chunk);
      rowOffset += seg.rows.length;
    });
    const icons = document.createElement("div");
    icons.className = "timelineHazards";
    (doc.hazards || []).forEach((hz) => {
      const b = S().getHazardBounds(hz);
      const cat = Cat()?.getByKind?.(hz.kind);
      const dot = document.createElement("span");
      dot.className = "timelineHzDot hz-" + (cat?.icon || "generic");
      dot.style.left = `${((b.rowStart + 0.5) / total) * 100}%`;
      dot.title = `${cat?.templateName || hz.kind} @ ${Cat()?.boundsLabel?.(b)}`;
      dot.addEventListener("click", (ev) => {
        ev.stopPropagation();
        composer.setSelectedHazardId(hz.id);
        composer.setSelectedGlobalRows([b.rowStart]);
        goToRow(b.rowStart);
      });
      icons.appendChild(dot);
    });
    bar.appendChild(icons);
    updateTimelinePlayhead();
  }

  function renderGapBar(rowIndex) {
    const root = el("gapBarEditor");
    if (!root) return;
    const doc = composer.getDocument();
    const columns = doc.grid.columns;
    const row = doc.flattened?.rows?.[rowIndex];
    if (!row) {
      root.innerHTML = "<div class='mutedHint'>Select a row on the canvas.</div>";
      return;
    }
    root.innerHTML = "";
    for (let c = 0; c < columns; c++) {
      const cell = document.createElement("button");
      cell.type = "button";
      const isGap = row.gaps.includes(c);
      cell.className = "gapBarCell" + (isGap ? " isGap" : " isBlock");
      cell.textContent = isGap ? "gap" : "blk";
      cell.title = `Col ${c} — click to toggle`;
      cell.addEventListener("click", () => {
        composer.toggleCell(rowIndex, c);
        refreshAfterMutation();
      });
      root.appendChild(cell);
    }
  }

  function renderHazardInspector() {
    const panel = el("selectionPanel");
    if (!panel) return;
    const doc = composer.getDocument();
    const hzId = composer.getSelectedHazardId();
    const rows = composer.getSelectedGlobalRows();
    const seg = composer.getSelectedSegment();

    if (hzId) {
      const hz = (doc.hazards || []).find((h) => h.id === hzId);
      if (!hz) return;
      const cat = Cat()?.getByKind?.(hz.kind);
      const b = S().getHazardBounds(hz);
      const p = hz.params || {};
      panel.innerHTML = `
        <div class="inspectorCard">
          <div class="inspectorFlash">${escapeHtml(cat?.playerFlash || "")}</div>
          <div class="inspectorTitle">${escapeHtml(cat?.templateName || hz.kind)}</div>
          <div class="inspectorDesc">${escapeHtml(cat?.description || "")}</div>
        </div>
        <div class="boundsGrid">
          <label>Row start <input id="insp_rowStart" type="number" value="${b.rowStart}" /></label>
          <label>Row end <input id="insp_rowEnd" type="number" value="${b.rowEnd}" /></label>
          <label>Col start <input id="insp_colStart" type="number" value="${b.colStart}" /></label>
          <label>Col end <input id="insp_colEnd" type="number" value="${b.colEnd}" /></label>
        </div>
        <div id="hazardParams"></div>
        <div class="toolRow">
          <button type="button" id="btnDeleteHazard">Delete</button>
          <button type="button" id="btnDupHazard">Duplicate</button>
        </div>
        <details class="pathLabAdv"><summary>Advanced (engine IDs)</summary>
          <code>${escapeHtml(hz.kind)} · ${escapeHtml(hz.id)}</code></details>`;

      const paramsRoot = el("hazardParams");
      const totalRows = doc.flattened?.totalRows || 1;
      const defaultStartRow = p.animStartRow ?? b.rowStart;
      const ease = p.pressEase || "ease-out";
      if (hz.kind === "hazard_platform") {
        paramsRoot.innerHTML = `
          <label>Start when water reaches row
            <input id="insp_animStartRow" type="number" min="0" max="${totalRows - 1}" step="1" value="${defaultStartRow}" />
          </label>
          <p class="mutedHint">Press begins the moment water row hits this number (matches playback readout). Row 0 = bottom.</p>
          <label>Press easing
            <select id="insp_pressEase">
              <option value="ease-out">Ease out — snap at end</option>
              <option value="ease-in-out">Ease in-out — smooth</option>
              <option value="ease-in">Ease in — slow start</option>
              <option value="linear">Linear</option>
            </select>
          </label>
          <label>Press toward
            <select id="insp_pressDir">
              <option value="right">Right →</option>
              <option value="left">← Left</option>
            </select>
          </label>
          <label>Press distance (cols) <input id="insp_pressCols" type="number" min="0" max="6" value="${p.pressCols ?? 1}" /></label>
          <label>Press duration (sec) <input id="insp_pressDur" type="number" step="0.05" min="0.1" value="${p.pressDurationSec ?? 0.8}" /></label>`;
        if (el("insp_pressDir")) el("insp_pressDir").value = p.pressDirection || "right";
        if (el("insp_pressEase")) el("insp_pressEase").value = ease;
      } else if (hz.kind === "hazard_iris_clamp") {
        paramsRoot.innerHTML = `
          <label>Gap when open (cols) <input id="insp_openGap" type="number" value="${p.openGapCols ?? doc.grid.columns - 2}" /></label>
          <label>Gap when closed (cols) <input id="insp_closedGap" type="number" value="${p.closedGapCols ?? 2}" /></label>
          <label>Close speed (sec) <input id="insp_closeDur" type="number" step="0.05" value="${p.closeDurationSec ?? 0.9}" /></label>
          <label>Telegraph rows <input id="insp_telegraph" type="number" value="${p.telegraphRows ?? 2}" /></label>`;
      } else if (hz.kind === "hazard_vise") {
        paramsRoot.innerHTML = `
          <p class="mutedHint">Legacy paired-jaw wizard. Prefer <strong>Steel platform</strong> — one slab per drag.</p>`;
      } else if (hz.kind === "hazard_buzz_wheel") {
        paramsRoot.innerHTML = `<label>Spin speed (RPM) <input id="insp_spinRpm" type="number" value="${p.spinRpm ?? 120}" /></label>`;
      } else if (hz.kind === "hazard_tilt_gate") {
        paramsRoot.innerHTML = `<label>Drop speed (sec) <input id="insp_closeDur" type="number" step="0.05" value="${p.closeDurationSec ?? 0.7}" /></label>`;
      }

      const applyBounds = () => {
        composer.updateHazardBounds(hzId, {
          rowStart: Number(el("insp_rowStart").value),
          rowEnd: Number(el("insp_rowEnd").value),
          colStart: Number(el("insp_colStart").value),
          colEnd: Number(el("insp_colEnd").value),
        });
        const patch = { params: {} };
        if (el("insp_openGap")) patch.params.openGapCols = Number(el("insp_openGap").value);
        if (el("insp_closedGap")) patch.params.closedGapCols = Number(el("insp_closedGap").value);
        if (el("insp_closeDur")) patch.params.closeDurationSec = Number(el("insp_closeDur").value);
        if (el("insp_telegraph")) patch.params.telegraphRows = Number(el("insp_telegraph").value);
        if (el("insp_pressDir")) patch.params.pressDirection = el("insp_pressDir").value;
        if (el("insp_pressCols")) patch.params.pressCols = Number(el("insp_pressCols").value);
        if (el("insp_pressDur")) {
          patch.params.pressDurationSec = Number(el("insp_pressDur").value);
          const pressing = (hz.phases || []).find((ph) => ph.name === "pressing");
          if (pressing) pressing.durationSec = patch.params.pressDurationSec;
        }
        if (el("insp_pressEase")) patch.params.pressEase = el("insp_pressEase").value;
        if (el("insp_animStartRow")) {
          patch.params.animStartRow = Number(el("insp_animStartRow").value);
          patch.params.animStartSec = null;
        }
        if (el("insp_startGap")) patch.params.startGapCols = Number(el("insp_startGap").value);
        if (el("insp_endGap")) patch.params.endGapCols = Number(el("insp_endGap").value);
        if (el("insp_spinRpm")) patch.params.spinRpm = Number(el("insp_spinRpm").value);
        composer.updateHazard(hzId, patch);
        refreshAfterMutation();
      };
      panel.querySelectorAll("input, select").forEach((n) => n.addEventListener("change", applyBounds));
      el("btnDeleteHazard")?.addEventListener("click", () => {
        deleteSelectedHazard();
      });
      el("btnDupHazard")?.addEventListener("click", () => {
        const copy = JSON.parse(JSON.stringify(hz));
        delete copy.id;
        copy.bounds = { ...b, rowStart: b.rowEnd + 1, rowEnd: b.rowEnd + (b.rowEnd - b.rowStart) + 1 };
        composer.createHazardInBounds(copy.kind, copy.bounds, { params: copy.params, phases: copy.phases });
        refreshAfterMutation();
      });
      return;
    }

    if (rows.length) {
      const r = rows[0];
      const row = doc.flattened?.rows?.[r];
      panel.innerHTML = `
        <div class="inspectorTitle">Row ${r}</div>
        <div class="mutedHint">Click gap bar to toggle columns. Paint tool also works on canvas.</div>
        <div id="gapBarEditor"></div>
        <label>Macro phase
          <select id="sd_rowPhaseOverride">
            ${S().MACRO_PHASES.map((ph) => `<option value="${ph}" ${row?.macroPhase === ph ? "selected" : ""}>${ph}</option>`).join("")}
          </select>
        </label>
        <div class="toolRow">
          <button type="button" id="btnAddMarkerRow">+ Marker</button>
          <select id="hz_markerKind">${S().MARKER_KINDS.map((m) => `<option value="${m.id}">${m.label}</option>`).join("")}</select>
        </div>`;
      renderGapBar(r);
      el("sd_rowPhaseOverride")?.addEventListener("change", () => {
        composer.setSelectedRowMacroPhase(el("sd_rowPhaseOverride").value);
        refreshAfterMutation();
      });
      el("btnAddMarkerRow")?.addEventListener("click", () => {
        const kind = el("hz_markerKind")?.value || "praise";
        composer.addMarker({ globalRowIndex: r, kind, label: kind === "tap_saved" ? "TAP!" : kind });
        refreshAfterMutation();
      });
      return;
    }

    if (seg) {
      const introBinding = (composer.getDocument().proceduralBindings || []).find(
        (b) => b.segmentId === seg.id && b.fn === "composePressIntroShaft"
      );
      const canRerollIntro = seg.source === "procedural" && introBinding;
      panel.innerHTML = `
        <div class="inspectorTitle">${escapeHtml(seg.label)}</div>
        <div class="mutedHint">${seg.rows.length} rows · ${seg.macroPhase}${canRerollIntro ? ` · seed ${introBinding.params?.seed ?? 0}` : ""}</div>
        <div class="toolRow">
          <button type="button" id="btnDupSegment">Duplicate</button>
          <button type="button" id="btnDeleteSegment">Delete</button>
          ${canRerollIntro ? `<button type="button" id="btnRerollIntroSegment">Re-roll intro shaft</button>` : `<button type="button" id="btnRerollSegment">Re-roll path</button>`}
        </div>
        <details id="pathLabFold" class="pathLabAdv">
          <summary>Generate path segment…</summary>
          <div class="pathLabBody compact">
            <label>Segment
              <select id="pl_segment_inline" class="pathLabSelect">
                <option value="flowMultipath">flowMultipath</option>
                <option value="tensionArc">tensionArc</option>
                <option value="climaxMultipath">climaxMultipath</option>
                <option value="releaseRestZone">releaseRestZone</option>
              </select>
            </label>
            <label>Rows <input id="pl_rowCount_inline" class="smallInput" type="number" value="12" /></label>
            <button id="btnPathLabInsert" type="button">Insert as segment</button>
            <button id="btnFullStageLoop" type="button">Full stage loop</button>
          </div>
        </details>`;
      el("btnDupSegment")?.addEventListener("click", () => {
        composer.duplicateSegment(seg.id);
        refreshAfterMutation();
      });
      el("btnDeleteSegment")?.addEventListener("click", () => {
        composer.deleteSegment(seg.id);
        refreshAfterMutation();
      });
      el("btnRerollSegment")?.addEventListener("click", () => {
        if (seg.source === "pathLab") composer.rerollSegment(seg.id);
        refreshAfterMutation();
      });
      el("btnRerollIntroSegment")?.addEventListener("click", () => {
        rerollIntroShaftForSelectedSegment();
      });
      el("btnPathLabInsert")?.addEventListener("click", insertPathLabAsSegment);
      el("btnFullStageLoop")?.addEventListener("click", importFullStageLoop);
      return;
    }

    panel.innerHTML = `<div class="emptyState">
      <strong>Nothing selected</strong>
      <p>Use <em>Select</em> and click a row, segment, or machinery region.</p>
      <p>Use <em>Machinery</em>, pick a template card, drag on the grid.</p>
      <p>Use <em>Paint</em> to toggle orange blocks vs gaps.</p>
    </div>`;
  }

  function renderSelectionPanel() {
    renderHazardInspector();
  }

  function updateHistoryButtons() {
    if (el("btnUndo")) el("btnUndo").disabled = !composer.canUndo();
    if (el("btnRedo")) el("btnRedo").disabled = !composer.canRedo();
    if (el("btnDeleteSelection")) el("btnDeleteSelection").disabled = !composer.getSelectedHazardId();
  }

  function deleteSelectedHazard() {
    const hzId = composer.getSelectedHazardId();
    if (!hzId) return false;
    composer.deleteHazard(hzId);
    refreshAfterMutation();
    setStatus("Deleted machinery.");
    return true;
  }

  function syncComposerFieldsFromDoc() {
    const doc = composer.getDocument();
    if (el("sd_stageIndex")) el("sd_stageIndex").value = String(doc.stage.index ?? 1);
    if (el("sd_stageName")) el("sd_stageName").value = doc.stage.displayName || "";
    if (el("sd_hazard")) el("sd_hazard").value = doc.stage.signatureHazardId || "none";
    if (el("sd_waterSpeed")) el("sd_waterSpeed").value = String(doc.stage.waterSpeedPxPerSec ?? 350);
    if (el("sd_rowHeight")) el("sd_rowHeight").value = String(doc.grid.rowHeightPx ?? 24);
    if (el("sd_columns")) el("sd_columns").value = String(doc.grid.columns ?? 6);
    if (el("sd_notes")) el("sd_notes").value = doc.meta?.notes || "";
    updateHistoryButtons();
    if (el("sd_scrubber")) el("sd_scrubber").max = String(playback.getMaxElapsedSec() || 60);
    renderSegmentList();
    renderTimeline();
    renderCatalogCards();
    renderSelectionPanel();
    syncDocumentToJsonTextarea();
    const fair = F()?.computeFairnessReport ? F().computeFairnessReport(doc) : { warnings: S().computeFairnessWarnings(doc) };
    setFairnessStatus(fair);
    updateStatusBar();
  }

  function refreshUi() {
    document.querySelectorAll(".sidebarSection").forEach((sec) => {
      sec.classList.toggle("hidden", sec.dataset.section !== sidebarSection);
    });
    syncComposerFieldsFromDoc();
  }

  function refreshAfterMutation() {
    syncComposerFieldsFromDoc();
    tryRender({ scrollMode: "preserve" });
  }

  function getRenderLevel() {
    if (pathLabPreviewOnly && typeof PathLab !== "undefined") {
      const level = PathLab.buildLevel(readPathLabConfig(mergePathLabTuning()));
      return { columns: level.columns, rows: level.rows, mode: "pathLab" };
    }
    return { ...S().documentToRenderLevel(composer.getDocument()), mode: "composer" };
  }

  function tryRender(opts) {
    opts = opts || {};
    const canvas = el("canvas");
    const canvasWrap = el("canvasWrap");
    if (!canvas || !canvasWrap) return;

    const ro = readRenderOptions();
    const level = getRenderLevel();
    const doc = composer.getDocument();

    if (!level?.rows?.length) {
      R().renderStageCanvas(canvas, null, { canvasWrap, ...ro });
      if (el("stats")) el("stats").textContent = "—";
      return;
    }

    let hazardSim = null;
    if (useComposerMode && Sim()?.compute && doc.hazards?.length) {
      doc.playback = doc.playback || {};
      doc.playback.rowHeightPx = Number(el("sd_rowHeight")?.value) || doc.grid.rowHeightPx;
      doc.playback.waterSpeedPxPerSec = Number(el("sd_waterSpeed")?.value) || doc.stage.waterSpeedPxPerSec;
      const elapsed = playbackState.elapsedSec || 0;
      hazardSim = Sim().compute(doc, elapsed);
    }

    const result = R().renderStageCanvas(canvas, level, {
      canvasWrap,
      ...ro,
      showGaps: true,
      showCoins: false,
      animTime: performance.now(),
      activeRow: playbackState.activeRow,
      waterRowIndex: playbackState.waterRowIndex,
      selectedRows: composer.getSelectedGlobalRows(),
      hazardSim,
      hazards: doc.hazards,
      markers: doc.markers,
      animateHazards,
      playing: playbackState.playing,
      playbackElapsedSec: playbackState.elapsedSec,
      showMarkers,
      showLabels,
      showDeviceFrame,
      showLegend: true,
      hoverCell: interaction.getHoverCell(),
      dragRect: interaction.getDragRect(),
      selectedBounds: getSelectedBounds(),
    });

    lastView = result.lastView;
    if (result.stats && el("stats")) {
      el("stats").textContent = `${result.stats.rowCount} rows · ${result.stats.totalBlocks} blocks · tool=${interaction.getTool()}`;
    }

    if (opts.scrollMode === "bottom") R().scrollCanvasToBottom(canvasWrap);
    else if (opts.scrollMode === "active" && playbackState.activeRow >= 0) {
      R().scrollCanvasToRow(canvasWrap, lastView, playbackState.activeRow, opts.scrollBehavior || "auto");
    }
    updateStatusBar();
    if (!opts.suppressStatus) setStatus(`${doc.stage.displayName} — ${doc.flattened.totalRows} rows`);
  }

  function commitComposerFields() {
    composer.updateStageMeta({
      index: Number(el("sd_stageIndex")?.value),
      displayName: el("sd_stageName")?.value,
      signatureHazardId: el("sd_hazard")?.value,
      waterSpeedPxPerSec: Number(el("sd_waterSpeed")?.value),
      notes: el("sd_notes")?.value,
    });
    composer.setGridColumns(Number(el("sd_columns")?.value));
    refreshAfterMutation();
  }

  function mergePathLabTuning() {
    const base = typeof PathLab !== "undefined" ? PathLab.defaultGapTuning() : {};
    let extra = {};
    try {
      extra = JSON.parse((el("pl_tuningJson")?.value || "").trim() || "{}");
    } catch (_) {
      extra = {};
    }
    return Object.assign({}, base, extra);
  }

  function readPathLabConfig(tuning) {
    const segEl = el("pl_segment_inline") || el("pl_segment");
    const rowsEl = el("pl_rowCount_inline") || el("pl_rowCount");
    return {
      segment: segEl?.value || "flowMultipath",
      columns: Number(el("sd_columns")?.value) || 6,
      rowCount: Number(rowsEl?.value) || 48,
      pathRunId: Number(el("pl_pathRunId")?.value) || 0,
      streamStart: Number(el("pl_streamStart")?.value) || 0,
      advanceStream: Boolean(el("pl_advanceStream")?.checked),
      tuning,
      overrides: {},
    };
  }

  function insertPathLabAsSegment() {
    if (typeof PathLab === "undefined") return setStatus("PathLab not loaded.", true);
    const level = PathLab.buildLevel(readPathLabConfig(mergePathLabTuning()));
    composer.importPathLabLevel(level, readPathLabConfig(mergePathLabTuning()), `Path: ${el("pl_segment")?.value}`, composer.getSelectedSegment()?.macroPhase || "flow");
    refreshAfterMutation();
    setStatus(`Inserted ${level.rows.length} rows.`);
  }

  function importFullStageLoop() {
    composer.importDirectedMacroLoop(() => readPathLabConfig(mergePathLabTuning()), mergePathLabTuning);
    refreshAfterMutation();
    setStatus("Imported FLOW→RELEASE loop.");
  }

  function handleCanvasPointerDown(ev) {
    if (!lastView) return;
    const canvasWrap = el("canvasWrap");
    interaction.pointerDown(ev, {
      lastView,
      hitTestCell: R().hitTestCell,
      columns: composer.getDocument().grid.columns,
      rowCount: lastView.rowCount,
      canvasWrap,
      selectedBounds: getSelectedBounds(),
      onCreate: (result) => {
        composer.applyTemplateInBounds(result.kind, result.bounds);
        sidebarSection = "selection";
        refreshAfterMutation();
        const cat = Cat()?.getByKind?.(result.kind);
        setStatus(`Placed ${cat?.templateName || result.kind} at ${Cat()?.boundsLabel?.(result.bounds)}`);
      },
      onResizeEnd: (result) => {
        const hzId = composer.getSelectedHazardId();
        if (hzId) {
          composer.updateHazardBounds(hzId, result.bounds);
          refreshAfterMutation();
        }
      },
    });
  }

  function handleCanvasClick(ev) {
    if (!lastView || interaction.consumeClick?.()) return;
    const rect = el("canvas").getBoundingClientRect();
    const hit = R().hitTestCell(lastView, ev.clientX - rect.left, ev.clientY - rect.top);
    if (!hit) return;
    const tool = interaction.getTool();

    if (tool === "paint") {
      composer.toggleCell(hit.globalRowIndex, hit.col);
      composer.setSelectedGlobalRows([hit.globalRowIndex]);
      composer.setSelectedHazardId(null);
      sidebarSection = "selection";
      refreshAfterMutation();
      return;
    }

    if (tool !== "select") return;

    const hz = composer.findHazardAtCell(hit.globalRowIndex, hit.col);
    if (hz) {
      composer.setSelectedHazardId(hz.id);
      composer.setSelectedGlobalRows([hit.globalRowIndex]);
      sidebarSection = "selection";
      refreshUi();
      tryRender({ scrollMode: "preserve" });
      return;
    }

    if (ev.shiftKey) {
      const cur = composer.getSelectedGlobalRows();
      composer.setSelectedGlobalRows(
        cur.includes(hit.globalRowIndex) ? cur.filter((i) => i !== hit.globalRowIndex) : [...cur, hit.globalRowIndex]
      );
    } else {
      composer.setSelectedGlobalRows([hit.globalRowIndex]);
      composer.setSelectedHazardId(null);
      const hitSeg = composer.globalToSegmentLocal(hit.globalRowIndex);
      if (hitSeg) composer.setSelectedSegment(hitSeg.segment.id);
    }
    sidebarSection = "selection";
    refreshUi();
    tryRender({ scrollMode: "preserve" });
  }

  function showOnboarding() {
    if (localStorage.getItem("sdl_tour_done")) return;
    setStatus("Tip 1/3: Paint tool (B) toggles gaps. Machinery tool (M) — pick a card, drag on grid. Play to preview.");
    setTimeout(() => setStatus("Tip 2/3: Status bar shows Row · Col under your cursor."), 4000);
    setTimeout(() => {
      setStatus("Tip 3/3: Select a placed hazard to edit bounds in the sidebar.");
      localStorage.setItem("sdl_tour_done", "1");
    }, 8000);
  }

  function wireUi() {
    document.querySelectorAll(".toolBtn").forEach((btn) => {
      btn.addEventListener("click", () => {
        interaction.setTool(btn.dataset.tool);
        updateToolbarUi();
        updateMachineryPaletteVisibility();
      });
    });

    document.querySelectorAll(".sidebarTab").forEach((tab) => {
      tab.addEventListener("click", () => {
        sidebarSection = tab.dataset.section;
        document.querySelectorAll(".sidebarTab").forEach((t) => t.classList.toggle("active", t === tab));
        refreshUi();
      });
    });

    ["sd_stageIndex", "sd_stageName", "sd_hazard", "sd_waterSpeed", "sd_rowHeight", "sd_columns", "sd_notes"].forEach((id) => {
      el(id)?.addEventListener("change", commitComposerFields);
    });

    el("sd_preset")?.addEventListener("change", () => {
      const idx = Number(el("sd_preset").value);
      if (!idx) return;
      const preset = S().STAGE_PRESETS.find((p) => p.index === idx);
      if (!preset) return;
      composer.updateStageMeta({ index: preset.index, displayName: preset.displayName, signatureHazardId: preset.signatureHazardId });
      if ([2, 3, 4].includes(idx)) composer.loadStageSkeleton(idx);
      el("sd_preset").value = "";
      refreshAfterMutation();
      setStatus(`Loaded Stage ${idx} — ${preset.displayName}`);
    });

    el("btnAddSegment")?.addEventListener("click", () => {
      composer.addSegment({ label: "New segment", macroPhase: el("sd_newPhase")?.value || "flow", rowCount: Number(el("sd_newRows")?.value) || 4 });
      refreshAfterMutation();
    });

    el("btnInsertPressTeach")?.addEventListener("click", () => {
      const result = composer.insertPressTeach({ macroPhase: "flow", difficulty01: 0.2 });
      if (!result) {
        setStatus("Press intro shaft generator unavailable.", true);
        return;
      }
      refreshAfterMutation();
      const rowCount = result.segment?.rows?.length ?? 0;
      const hazardCount = result.result?.hazards?.length ?? 0;
      const warnCount = result.result?.harmonizerWarnings?.length ?? 0;
      setStatus(
        warnCount
          ? `Inserted press intro shaft (${rowCount} rows, ${hazardCount} slabs). Harmonizer: ${warnCount} note(s).`
          : `Inserted press intro shaft (${rowCount} rows, ${hazardCount} slabs).`
      );
    });

    el("btnInsertPathChicanePreview")?.addEventListener("click", () => {
      const result = composer.insertPathChicanePreview({ macroPhase: "flow", difficulty01: 0.2 });
      if (!result) return setStatus("Path preview unavailable.", true);
      refreshAfterMutation();
      setStatus(`Inserted path chicane preview (${result.segment?.rows?.length ?? 0} rows, no steel).`);
    });

    el("btnInsertPathChicaneShaft")?.addEventListener("click", () => {
      const result = composer.insertPathChicaneShaft({ macroPhase: "flow", difficulty01: 0.2 });
      if (!result) return setStatus("Path chicane shaft unavailable.", true);
      refreshAfterMutation();
      setStatus(
        `Inserted path chicane shaft (${result.segment?.rows?.length ?? 0} rows, ${result.result?.hazards?.length ?? 0} slabs).`
      );
    });

    function rerollIntroShaftForSelectedSegment() {
      const seg = composer.getSelectedSegment();
      const result = composer.rerollPressIntroShaft({ segmentId: seg?.id });
      if (!result) {
        setStatus("No intro shaft to re-roll — insert one first, or select its segment.", true);
        return;
      }
      refreshAfterMutation();
      const rowCount = result.segment?.rows?.length ?? 0;
      const hazardCount = result.binding?.hazardIds?.length ?? 0;
      setStatus(`Re-rolled intro shaft (seed ${result.seed}, ${rowCount} rows, ${hazardCount} slabs).`);
    }

    el("btnRerollPressIntroShaft")?.addEventListener("click", () => {
      rerollIntroShaftForSelectedSegment();
    });

    function getInsertAnchorRow() {
      const sel = composer.getSelectedGlobalRows();
      if (sel.length) return sel[0];
      const seg = composer.getSelectedSegment();
      if (seg) {
        let offset = 0;
        for (const s of composer.getDocument().segments) {
          if (s.id === seg.id) return offset;
          offset += s.rows.length;
        }
      }
      return 0;
    }

    el("btnInsertRowsAbove")?.addEventListener("click", () => {
      const count = Number(el("sd_insertCount")?.value) || 1;
      const globalRowIndex = getInsertAnchorRow();
      composer.insertRows({ mode: "above", count, globalRowIndex });
      refreshAfterMutation();
      setStatus(`Inserted ${count} row(s) above row ${globalRowIndex}.`);
    });
    el("btnInsertRowsBelow")?.addEventListener("click", () => {
      const count = Number(el("sd_insertCount")?.value) || 1;
      const globalRowIndex = getInsertAnchorRow();
      composer.insertRows({ mode: "below", count, globalRowIndex });
      refreshAfterMutation();
      setStatus(`Inserted ${count} row(s) below row ${globalRowIndex}.`);
    });
    el("btnDeleteRows")?.addEventListener("click", () => {
      if (!composer.getSelectedGlobalRows().length) {
        setStatus("Select a row on the canvas first (Select tool → click a row).", true);
        return;
      }
      composer.deleteSelectedRows();
      refreshAfterMutation();
      setStatus("Deleted selected row(s).");
    });

    el("btnUndo")?.addEventListener("click", () => {
      if (!composer.canUndo()) return;
      composer.undo();
      refreshAfterMutation();
      setStatus("Undone.");
    });
    el("btnRedo")?.addEventListener("click", () => {
      if (!composer.canRedo()) return;
      composer.redo();
      refreshAfterMutation();
      setStatus("Redone.");
    });
    el("btnDeleteSelection")?.addEventListener("click", () => {
      deleteSelectedHazard();
    });
    el("btnClearCanvas")?.addEventListener("click", () => {
      if (
        !confirm(
          "Clear canvas?\n\nRemoves all machinery and markers, resets every row to default gaps.\nSegments and stage metadata stay."
        )
      ) {
        return;
      }
      composer.clearCanvas();
      playback.stop();
      playback.setElapsedSec(0);
      refreshAfterMutation();
      setStatus("Canvas cleared.");
    });

    el("btnGoToRow")?.addEventListener("click", () => goToRow(Number(el("goToRowInput")?.value) || 0));
    el("goToRowInput")?.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") goToRow(Number(el("goToRowInput").value) || 0);
    });

    el("toggleDeviceFrame")?.addEventListener("change", () => {
      showDeviceFrame = Boolean(el("toggleDeviceFrame").checked);
      tryRender({ scrollMode: "preserve" });
    });
    el("toggleShowMarkers")?.addEventListener("change", () => {
      showMarkers = Boolean(el("toggleShowMarkers").checked);
      tryRender({ scrollMode: "preserve" });
    });
    el("toggleShowLabels")?.addEventListener("change", () => {
      showLabels = Boolean(el("toggleShowLabels").checked);
      tryRender({ scrollMode: "preserve" });
    });

    el("btnCopyJson")?.addEventListener("click", async () => {
      try {
        await E().copyJsonForAgent(composer.getDocument());
        setStatus("JSON copied.");
      } catch (e) {
        setStatus(String(e.message), true);
      }
    });
    el("btnDownloadJson")?.addEventListener("click", () => E().downloadJson(composer.getDocument()));
    el("btnHandoffBundle")?.addEventListener("click", async () => {
      try {
        await E().exportHandoffBundle(composer.getDocument(), el("canvas"), el("canvasWrap"));
        setStatus("Handoff bundle downloaded.");
      } catch (e) {
        setStatus(String(e.message), true);
      }
    });

    el("btnScreenshotFull")?.addEventListener("click", async () => {
      try {
        await E().downloadCanvasPng(el("canvas"), `${S().slugifyStageName(composer.getDocument().stage.displayName)}.png`);
        setStatus("PNG downloaded.");
      } catch (e) {
        setStatus(String(e.message), true);
      }
    });
    el("btnScreenshotViewport")?.addEventListener("click", async () => {
      try {
        await E().downloadViewportPng(el("canvas"), el("canvasWrap"));
        setStatus("Viewport PNG downloaded.");
      } catch (e) {
        setStatus(String(e.message), true);
      }
    });
    el("btnScreenshotClipboard")?.addEventListener("click", async () => {
      try {
        await E().copyCanvasPng(el("canvas"));
        setStatus("PNG copied.");
      } catch (e) {
        setStatus(String(e.message), true);
      }
    });

    el("btnFormat")?.addEventListener("click", () => {
      try {
        syncJsonFromDoc = false;
        composer.setDocument(S().parseDocument(el("input").value));
        syncJsonFromDoc = true;
        refreshAfterMutation();
      } catch (e) {
        setStatus(String(e.message), true);
      }
    });

    el("sd_scrubber")?.addEventListener("input", () => {
      playback.stop();
      playback.setElapsedSec(Number(el("sd_scrubber").value));
    });
    el("btnWaterPlay")?.addEventListener("click", () => {
      if (playback.isAtEnd?.() && !playback.isPlaying()) {
        playback.replay();
      } else {
        playback.toggle();
      }
    });
    el("macroTimeline")?.addEventListener("click", (ev) => {
      if (ev.target.closest(".timelineChunk, .timelineHzDot")) return;
      const bar = el("macroTimeline");
      if (!bar) return;
      const rect = bar.getBoundingClientRect();
      if (!rect.width) return;
      const frac = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
      const maxT = playback.getMaxElapsedSec();
      if (maxT <= 0) return;
      playback.stop();
      playback.setElapsedSec(frac * maxT);
    });
    el("btnFit")?.addEventListener("click", () => tryRender({ scrollMode: "bottom" }));
    el("cellSize")?.addEventListener("change", () => tryRender({ scrollMode: "preserve" }));

    const canvas = el("canvas");
    canvas?.addEventListener("mousedown", handleCanvasPointerDown);
    canvas?.addEventListener("mousemove", (ev) => {
      if (!lastView) return;
      const rect = canvas.getBoundingClientRect();
      interaction.pointerMove(ev, {
        lastView,
        hitTestCell: R().hitTestCell,
        columns: composer.getDocument().grid.columns,
        rowCount: lastView.rowCount,
        canvasWrap: el("canvasWrap"),
      });
      updateStatusBar();
      if (interaction.getDragRect() || interaction.getResizeState()) {
        tryRender({ scrollMode: "preserve", suppressStatus: true });
      }
    });
    canvas?.addEventListener("mouseup", (ev) => {
      interaction.pointerUp(ev, {
        lastView,
        hitTestCell: R().hitTestCell,
        columns: composer.getDocument().grid.columns,
        rowCount: lastView?.rowCount || 0,
        canvasWrap: el("canvasWrap"),
        onCreate: (result) => {
          composer.applyTemplateInBounds(result.kind, result.bounds);
          sidebarSection = "selection";
          refreshAfterMutation();
        },
        onResizeEnd: (result) => {
          const hzId = composer.getSelectedHazardId();
          if (hzId) {
            composer.updateHazardBounds(hzId, result.bounds);
            refreshAfterMutation();
          }
        },
      });
      tryRender({ scrollMode: "preserve", suppressStatus: true });
    });
    canvas?.addEventListener("mouseleave", () => {
      interaction.setHoverCell(null);
      updateStatusBar();
    });
    canvas?.addEventListener("click", handleCanvasClick);

    window.addEventListener("keydown", (ev) => {
      if (ev.target.matches("input, textarea, select")) return;
      const mod = ev.metaKey || ev.ctrlKey;
      if (mod && ev.code === "KeyZ" && !ev.shiftKey) {
        ev.preventDefault();
        if (composer.canUndo()) {
          composer.undo();
          refreshAfterMutation();
          setStatus("Undone.");
        }
        return;
      }
      if (mod && (ev.code === "KeyY" || (ev.code === "KeyZ" && ev.shiftKey))) {
        ev.preventDefault();
        if (composer.canRedo()) {
          composer.redo();
          refreshAfterMutation();
          setStatus("Redone.");
        }
        return;
      }
      if (ev.code === "Delete" || ev.code === "Backspace") {
        if (deleteSelectedHazard()) ev.preventDefault();
        return;
      }
      if (ev.code === "KeyV") interaction.setTool("select");
      if (ev.code === "KeyB") interaction.setTool("paint");
      if (ev.code === "KeyM") interaction.setTool("machinery");
      updateToolbarUi();
      updateMachineryPaletteVisibility();
    });

    new ResizeObserver(() => tryRender({ scrollMode: "preserve" })).observe(document.body);

    function tickBuzzSpinPreview() {
      const hasBuzz = composer.getDocument().hazards?.some((h) => h.kind === "hazard_buzz_wheel");
      if (hasBuzz && animateHazards && !playback.isPlaying()) {
        tryRender({ scrollMode: "preserve", suppressStatus: true });
      }
      requestAnimationFrame(tickBuzzSpinPreview);
    }
    requestAnimationFrame(tickBuzzSpinPreview);

    updateToolbarUi();
    renderCatalogCards();
    refreshUi();
    playback.setElapsedSec(0);
    tryRender({ scrollMode: "bottom" });
    showOnboarding();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wireUi);
  else wireUi();

  window.StageDesignApp = { composer, tryRender, refreshAfterMutation, goToRow, interaction };
})();
