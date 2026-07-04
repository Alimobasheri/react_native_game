/**
 * Water-rise playback scrubber (visual only).
 */
(function (global) {
  "use strict";

  function createPlaybackController(opts) {
    let elapsedSec = 0;
    let playing = false;
    let rafId = null;
    let lastTs = 0;
    const onTick = opts.onTick || (() => {});

    function getWaterSpeed() {
      return Math.max(20, Number(opts.getWaterSpeed?.()) || 350);
    }

    function getRowHeight() {
      return Math.max(8, Number(opts.getRowHeight?.()) || 24);
    }

    function getTotalRows() {
      return Math.max(0, Number(opts.getTotalRows?.()) || 0);
    }

    function computeWaterRowIndex() {
      const rowHeight = getRowHeight();
      const speed = getWaterSpeed();
      if (rowHeight <= 0) return 0;
      return (elapsedSec * speed) / rowHeight;
    }

    function getWaterColumnState(columns) {
      const cols = Math.max(1, Number(columns) || 6);
      const waterRowIndex = computeWaterRowIndex();
      const rowFrac = waterRowIndex - Math.floor(waterRowIndex);
      const waterColIndex = rowFrac * cols;
      return {
        waterColIndex,
        waterCol: Math.min(cols - 1, Math.max(0, Math.floor(waterColIndex))),
      };
    }

    function emitTick(playingFlag) {
      const columns = Math.max(1, Number(opts.getColumns?.()) || 6);
      const colState = getWaterColumnState(columns);
      onTick({
        elapsedSec,
        waterRowIndex: computeWaterRowIndex(),
        activeRow: getActiveRow(),
        waterColIndex: colState.waterColIndex,
        waterCol: colState.waterCol,
        playing: playingFlag,
      });
    }

    function getActiveRow() {
      const idx = Math.floor(computeWaterRowIndex());
      const total = getTotalRows();
      return total > 0 ? Math.min(total - 1, Math.max(0, idx)) : -1;
    }

    function getElapsedSec() {
      return elapsedSec;
    }

    function setElapsedSec(sec) {
      elapsedSec = Math.max(0, Number(sec) || 0);
      emitTick(playing);
    }

    function getMaxElapsedSec() {
      const total = getTotalRows();
      const rowHeight = getRowHeight();
      const speed = getWaterSpeed();
      if (total <= 0 || speed <= 0) return 0;
      return (total * rowHeight) / speed;
    }

    function stop() {
      playing = false;
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      lastTs = 0;
      emitTick(false);
    }

    function play() {
      if (playing) return;
      playing = true;
      lastTs = 0;
      const loop = (ts) => {
        if (!playing) return;
        if (lastTs > 0) {
          const dt = (ts - lastTs) / 1000;
          elapsedSec += dt;
          const maxT = getMaxElapsedSec();
          if (elapsedSec >= maxT && maxT > 0) {
            elapsedSec = maxT;
            stop();
            return;
          }
          emitTick(true);
        }
        lastTs = ts;
        rafId = requestAnimationFrame(loop);
      };
      rafId = requestAnimationFrame(loop);
    }

    function toggle() {
      if (playing) {
        stop();
        return;
      }
      const maxT = getMaxElapsedSec();
      if (maxT > 0 && elapsedSec >= maxT - 0.01) {
        elapsedSec = 0;
      }
      play();
    }

    function replay() {
      stop();
      elapsedSec = 0;
      play();
    }

    function isAtEnd() {
      const maxT = getMaxElapsedSec();
      return maxT > 0 && elapsedSec >= maxT - 0.01;
    }

    function isPlaying() {
      return playing;
    }

    return {
      getWaterSpeed,
      getRowHeight,
      computeWaterRowIndex,
      getActiveRow,
      getElapsedSec,
      setElapsedSec,
      getMaxElapsedSec,
      rowEnterSec: (doc, row) => {
        if (global.StageDesignHazardSim?.rowEnterSec) {
          return global.StageDesignHazardSim.rowEnterSec(doc, row);
        }
        const rowHeight = getRowHeight();
        const speed = getWaterSpeed();
        return (row * rowHeight) / Math.max(1, speed);
      },
      rowLocalSec: (doc, row, elapsed) => {
        if (global.StageDesignHazardSim?.rowLocalSec) {
          return global.StageDesignHazardSim.rowLocalSec(doc, row, elapsed ?? elapsedSec);
        }
        const enter = (row * getRowHeight()) / Math.max(1, getWaterSpeed());
        return Math.max(0, (elapsed ?? elapsedSec) - enter);
      },
      play,
      replay,
      stop,
      toggle,
      isPlaying,
      isAtEnd,
    };
  }

  global.StageDesignPlayback = { createPlaybackController };
})(typeof window !== "undefined" ? window : globalThis);
