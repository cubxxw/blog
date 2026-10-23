// The room's monitor is a read-only presentation of the same live workspace.
// CSS3D may hide that plane while it is out of view, at which point its scroll
// boxes can lose their offsets. Keep the last interactive offsets until the
// same DOM becomes interactive again; never learn the monitor's clamped zero.
export function createWorkspaceScrollState() {
  let checkpoint = null;
  return {
    capture(workspace) {
      if (!workspace || checkpoint?.workspace === workspace) return false;
      const entries = [];
      for (const node of [workspace, ...workspace.querySelectorAll('*')]) {
        const top = node.scrollTop, left = node.scrollLeft;
        if (!Number.isFinite(top) || !Number.isFinite(left) || top === 0 && left === 0) continue;
        entries.push({ node, top, left, content: node.firstChild });
      }
      checkpoint = { workspace, entries };
      return true;
    },
    restore(workspace) {
      if (!checkpoint || checkpoint.workspace !== workspace) return false;
      const { entries } = checkpoint; checkpoint = null;
      for (const { node, top, left, content } of entries) {
        // Closing or navigating an app while the room is open must not apply
        // an old article's offset to its replacement or a different document.
        if (!node.isConnected || !workspace.contains(node) || node.firstChild !== content) continue;
        node.scrollLeft = left; node.scrollTop = top;
      }
      return true;
    },
    dispose() { checkpoint = null; }
  };
}
