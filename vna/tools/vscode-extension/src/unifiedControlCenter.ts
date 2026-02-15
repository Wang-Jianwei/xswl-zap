import * as vscode from "vscode";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildUnifiedControlCenterHtml(webview: vscode.Webview, nonce: string): string {
  const title = escapeHtml("XSWL VNA Control Center");
  const cspSource = webview.cspSource;

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${cspSource} data:; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    :root {
      color-scheme: light dark;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
    }
    .app {
      display: grid;
      grid-template-columns: 280px 1fr;
      min-height: 100vh;
    }
    .sidebar {
      border-right: 1px solid var(--vscode-panel-border);
      background: var(--vscode-sideBar-background);
      color: var(--vscode-sideBar-foreground);
      padding: 12px;
      overflow-y: auto;
    }
    .brand {
      font-weight: 600;
      margin-bottom: 12px;
    }
    .menu-group {
      margin-bottom: 10px;
      border: 1px solid var(--vscode-panel-border);
      border-radius: 6px;
      overflow: hidden;
    }
    .menu-title {
      width: 100%;
      text-align: left;
      padding: 8px 10px;
      border: 0;
      cursor: pointer;
      color: inherit;
      background: var(--vscode-editor-inactiveSelectionBackground);
    }
    .submenu {
      display: none;
      padding: 8px;
      gap: 6px;
      flex-direction: column;
      background: var(--vscode-sideBar-background);
    }
    .menu-group.is-open .submenu {
      display: flex;
    }
    .submenu button,
    .actions button,
    .inline button,
    .dialog-actions button {
      border: 1px solid var(--vscode-button-border, transparent);
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      padding: 6px 10px;
      border-radius: 4px;
      cursor: pointer;
      text-align: left;
    }
    .submenu button.secondary,
    .actions button.secondary,
    .inline button.secondary,
    .dialog-actions button.secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    .submenu button.is-active {
      outline: 1px solid var(--vscode-focusBorder);
    }
    .content {
      display: flex;
      flex-direction: column;
      min-width: 0;
      min-height: 0;
    }
    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--vscode-panel-border);
      padding: 10px 12px;
      gap: 10px;
    }
    .status {
      color: var(--vscode-descriptionForeground);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 70%;
    }
    .view {
      display: none;
      padding: 12px;
      overflow: auto;
      min-height: 0;
    }
    .view.is-active {
      display: block;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 10px;
      margin-bottom: 10px;
    }
    .card {
      border: 1px solid var(--vscode-panel-border);
      border-radius: 6px;
      padding: 10px;
      background: var(--vscode-editorWidget-background);
    }
    .card h3 {
      margin: 0 0 8px;
      font-size: 1em;
    }
    .line {
      margin: 6px 0;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .line.inline {
      flex-direction: row;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }
    input, select, textarea {
      width: 100%;
      border: 1px solid var(--vscode-input-border);
      color: var(--vscode-input-foreground);
      background: var(--vscode-input-background);
      padding: 6px 8px;
      border-radius: 4px;
      font: inherit;
    }
    textarea {
      min-height: 180px;
      resize: vertical;
      font-family: var(--vscode-editor-font-family, var(--vscode-font-family));
    }
    .actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .table-wrap {
      border: 1px solid var(--vscode-panel-border);
      border-radius: 6px;
      overflow: hidden;
    }
    table { width: 100%; border-collapse: collapse; }
    th, td {
      border-bottom: 1px solid var(--vscode-panel-border);
      padding: 8px;
      text-align: left;
      vertical-align: top;
    }
    tr:last-child td { border-bottom: 0; }
    .tag {
      display: inline-block;
      border: 1px solid var(--vscode-panel-border);
      border-radius: 999px;
      padding: 1px 8px;
      margin-left: 8px;
      color: var(--vscode-descriptionForeground);
    }
    .canvas-wrap {
      border: 1px solid var(--vscode-panel-border);
      border-radius: 6px;
      overflow: hidden;
      height: 340px;
      background: var(--vscode-editor-background);
      position: relative;
    }
    canvas { width: 100%; height: 100%; display: block; }
    .help { color: var(--vscode-descriptionForeground); }
    .modal {
      position: fixed;
      inset: 0;
      background: var(--vscode-editorWidget-background);
      display: none;
      align-items: center;
      justify-content: center;
      padding: 12px;
    }
    .modal.is-open { display: flex; }
    .dialog {
      width: min(520px, 100%);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 8px;
      background: var(--vscode-editor-background);
      padding: 12px;
    }
    .dialog h3 { margin: 0 0 8px; }
    .dialog-actions {
      margin-top: 12px;
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    .topology-mode { display: flex; gap: 8px; margin-bottom: 8px; }
    .topology-layout {
      display: grid;
      grid-template-columns: 280px 1fr;
      gap: 10px;
    }
    .chip-list { display: flex; flex-wrap: wrap; gap: 6px; }
    .chip {
      border: 1px solid var(--vscode-input-border);
      border-radius: 999px;
      background: var(--vscode-input-background);
      padding: 3px 8px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
    }
    .chip[draggable="true"] {
      cursor: grab;
    }
    .chip.is-bound {
      border-color: var(--vscode-charts-blue);
    }
    .chip button {
      border: none;
      border-radius: 10px;
      width: 16px;
      height: 16px;
      cursor: pointer;
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    .topology-boards { display: flex; flex-direction: column; gap: 8px; }
    .topology-board {
      border: 1px solid var(--vscode-panel-border);
      border-radius: 6px;
      padding: 8px;
      background: var(--vscode-editorWidget-background);
    }
    .topology-board-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .topology-board-grid .full { grid-column: 1 / span 2; }
    .board-port-slots {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-top: 4px;
    }
    .board-port-slot {
      border: 1px dashed var(--vscode-input-border);
      border-radius: 4px;
      min-height: 30px;
      padding: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      background: color-mix(in srgb, var(--vscode-editor-background) 95%, var(--vscode-sideBar-background) 5%);
    }
    .board-port-slot.is-drop-target {
      border-color: var(--vscode-focusBorder);
      background: color-mix(in srgb, var(--vscode-button-background) 15%, var(--vscode-editor-background) 85%);
    }
    .slot-left {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
    }
    .slot-hint {
      color: var(--vscode-descriptionForeground);
      font-size: 11px;
    }
    .hidden { display: none; }
  </style>
</head>
<body>
  <div class="app">
    <aside class="sidebar">
      <div class="brand">XSWL VNA Control Center</div>

      <div class="menu-group is-open" data-group="workspace">
        <button class="menu-title" data-menu-toggle="workspace">工作区管理</button>
        <div class="submenu">
          <button data-view="workspace" class="is-active">工作区配置</button>
          <button data-action="open-new-workspace-modal" class="secondary">新建工作区（弹框）</button>
        </div>
      </div>

      <div class="menu-group" data-group="topology">
        <button class="menu-title" data-menu-toggle="topology">拓扑管理</button>
        <div class="submenu">
          <button data-view="topology">拓扑编辑</button>
          <button data-action="open-visual-topology" class="secondary">打开独立拓扑编辑器</button>
        </div>
      </div>

      <div class="menu-group" data-group="scan">
        <button class="menu-title" data-menu-toggle="scan">扫描控制</button>
        <div class="submenu">
          <button data-view="scan">扫描状态</button>
          <button data-view="waveform" class="secondary">实时波形</button>
        </div>
      </div>
    </aside>

    <main class="content">
      <div class="topbar">
        <strong>${title}</strong>
        <div class="status" id="statusLine">准备就绪</div>
      </div>

      <section id="view-workspace" class="view is-active">
        <div class="grid">
          <div class="card">
            <h3>当前工作区</h3>
            <div class="line"><label>Workspace ID</label><input id="workspaceId" placeholder="例如: ws-default" /></div>
            <div class="line"><label>Topology ID</label><input id="topologyId" placeholder="例如: topo-main" /></div>
            <div class="actions">
              <button id="btnWorkspaceLoad">加载</button>
              <button id="btnWorkspaceSave">保存</button>
              <button id="btnWorkspaceSaveActivate" class="secondary">保存并激活</button>
            </div>
          </div>
          <div class="card">
            <h3>服务状态</h3>
            <div id="serviceStatus" class="help">未加载</div>
            <div class="actions" style="margin-top:8px;"><button id="btnRefreshService">刷新状态</button></div>
          </div>
        </div>

        <div class="table-wrap">
          <table>
            <thead><tr><th>Workspace</th><th>Topology</th><th>更新时间</th><th>状态</th><th>操作</th></tr></thead>
            <tbody id="workspaceRows"></tbody>
          </table>
        </div>
      </section>

      <section id="view-topology" class="view">
        <div class="card">
          <h3>拓扑编辑（内嵌可视化）</h3>
          <div class="topology-mode">
            <button id="topologyVisualMode">可视化模式</button>
            <button id="topologyYamlMode" class="secondary">YAML 高级模式</button>
            <button id="btnTopologyLoad">从工作区加载</button>
            <button id="btnTopologyToYaml" class="secondary">从可视化生成 YAML</button>
          </div>

          <div id="topologyVisualSection" class="topology-layout">
            <div class="card">
              <h3>虚拟 VNA 端口</h3>
              <div class="line inline">
                <input id="newVirtualPort" placeholder="例如: vna-port3" />
                <button id="btnAddVirtualPort">添加</button>
              </div>
              <div id="topologyVirtualPorts" class="chip-list"></div>
            </div>

            <div>
              <div class="card" style="margin-bottom:8px;">
                <div class="line inline">
                  <h3 style="margin:0;">板卡与端口</h3>
                  <button id="btnAddBoard">新增板卡</button>
                  <button id="btnAutoBind" class="secondary">自动绑定</button>
                </div>
                <div class="help" style="margin-bottom:8px;">拖拽左侧虚拟端口到下方板卡端口槽位完成绑定</div>
                <div id="topologyBoards" class="topology-boards"></div>
              </div>

              <div class="card">
                <h3>绑定关系（虚拟端口 -> 板卡端口）</h3>
                <div class="table-wrap">
                  <table>
                    <thead><tr><th>Virtual Port</th><th>Board Endpoint</th><th>操作</th></tr></thead>
                    <tbody id="topologyBindingRows"></tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <div id="topologyYamlSection" class="hidden">
            <div class="line"><textarea id="topologyYaml" placeholder="virtual_vna:\n  ports:\n    - vna-port1\nboards:\n  - id: card1\n    kind: board\n    ports:\n      - p1\nbindings:\n  - vna_port: vna-port1\n    board_id: card1\n    board_port: p1\ninstances:\n  - id: card1\n    driver: pxi\n    device: pxi-mock-0\n    resource: dev0"></textarea></div>
          </div>

          <div class="actions">
            <button id="btnTopologySave">保存拓扑</button>
            <button id="btnTopologySaveActivate" class="secondary">保存并激活</button>
          </div>
        </div>
      </section>

      <section id="view-scan" class="view">
        <div class="grid">
          <div class="card">
            <h3>扫描控制</h3>
            <div class="line"><label>Instance ID</label><input id="instanceId" value="inst0" /></div>
            <div class="line inline">
              <button id="btnScanGet">读取状态</button>
              <button id="btnScanContinuous">Continuous</button>
              <button id="btnScanSingle" class="secondary">Single</button>
              <button id="btnScanHold" class="secondary">Hold</button>
            </div>
            <div id="scanStatus" class="help" style="margin-top:8px;">scan=unknown</div>
          </div>
          <div class="card">
            <h3>采集参数</h3>
            <div class="line"><label>Sample Count</label><input id="sampleCount" value="256" /></div>
            <div class="line"><label>Mode</label><select id="mode"><option value="frequency">frequency</option><option value="time">time</option></select></div>
            <div class="line inline">
              <button id="btnSnapshot">单次采集</button>
              <button id="btnLiveStart">开始实时</button>
              <button id="btnLiveStop" class="secondary">停止实时</button>
            </div>
          </div>
        </div>
      </section>

      <section id="view-waveform" class="view">
        <div class="card">
          <div class="line inline">
            <strong>波形预览</strong>
            <span class="tag" id="waveMeta">暂无数据</span>
          </div>
          <div class="canvas-wrap">
            <canvas id="waveCanvas"></canvas>
          </div>
          <div class="help" id="waveHint" style="margin-top:8px;">支持 snapshot 和 live；live 可在“扫描控制”页启停。</div>
        </div>
      </section>
    </main>
  </div>

  <div id="modal" class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
    <div class="dialog">
      <h3 id="modalTitle">提示</h3>
      <div id="modalBody" class="help"></div>
      <div id="modalInputLine" class="line" style="display:none;"><label id="modalInputLabel"></label><input id="modalInput" /></div>
      <div class="dialog-actions">
        <button id="modalCancel" class="secondary">取消</button>
        <button id="modalConfirm">确定</button>
      </div>
    </div>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();

    const state = {
      items: [],
      activeWorkspaceId: "",
      liveActive: false,
      latestWaveform: null,
      modalResolver: null,
    };

    const statusLine = document.getElementById("statusLine");
    const workspaceRows = document.getElementById("workspaceRows");
    const workspaceId = document.getElementById("workspaceId");
    const topologyId = document.getElementById("topologyId");
    const topologyVisualMode = document.getElementById("topologyVisualMode");
    const topologyYamlMode = document.getElementById("topologyYamlMode");
    const topologyVisualSection = document.getElementById("topologyVisualSection");
    const topologyYamlSection = document.getElementById("topologyYamlSection");
    const topologyYaml = document.getElementById("topologyYaml");
    const newVirtualPort = document.getElementById("newVirtualPort");
    const topologyVirtualPorts = document.getElementById("topologyVirtualPorts");
    const topologyBoards = document.getElementById("topologyBoards");
    const topologyBindingRows = document.getElementById("topologyBindingRows");
    const instanceId = document.getElementById("instanceId");
    const sampleCount = document.getElementById("sampleCount");
    const mode = document.getElementById("mode");
    const serviceStatus = document.getElementById("serviceStatus");
    const scanStatus = document.getElementById("scanStatus");
    const waveMeta = document.getElementById("waveMeta");
    const waveHint = document.getElementById("waveHint");
    const canvas = document.getElementById("waveCanvas");

    const modal = document.getElementById("modal");
    const modalTitle = document.getElementById("modalTitle");
    const modalBody = document.getElementById("modalBody");
    const modalInputLine = document.getElementById("modalInputLine");
    const modalInputLabel = document.getElementById("modalInputLabel");
    const modalInput = document.getElementById("modalInput");
    const modalCancel = document.getElementById("modalCancel");
    const modalConfirm = document.getElementById("modalConfirm");

    state.topologyMode = "visual";
    state.draggingVirtualPort = "";
    state.topology = {
      virtualPorts: ["vna-port1", "vna-port2"],
      boards: [
        {
          id: "card1",
          kind: "board",
          portsCsv: "p1,p2",
          driver: "pxi",
          device: "pxi-mock-0",
          resource: "dev0",
          cardIndex: "1",
          detail: "",
        },
      ],
      bindings: {},
    };

    function setStatus(text) {
      statusLine.textContent = text;
    }

    function switchView(viewName) {
      for (const node of document.querySelectorAll(".view")) {
        node.classList.remove("is-active");
      }
      const view = document.getElementById("view-" + viewName);
      if (view) {
        view.classList.add("is-active");
      }

      for (const node of document.querySelectorAll(".submenu button[data-view]")) {
        node.classList.toggle("is-active", node.getAttribute("data-view") === viewName);
      }
    }

    function toggleMenu(groupName) {
      const group = document.querySelector('.menu-group[data-group="' + groupName + '"]');
      if (!group) {
        return;
      }
      group.classList.toggle("is-open");
    }

    function formatDateTime(ms) {
      if (!Number.isFinite(ms) || ms <= 0) {
        return "-";
      }
      return new Date(ms).toLocaleString();
    }

    function renderWorkspaceRows() {
      workspaceRows.innerHTML = "";
      for (const item of state.items) {
        const tr = document.createElement("tr");
        const active = item.workspaceId === state.activeWorkspaceId ? "active" : "idle";
        tr.innerHTML =
          '<td>' + escapeHtml(item.workspaceId) + '</td>' +
          '<td>' + escapeHtml(item.topologyId) + '</td>' +
          '<td>' + escapeHtml(formatDateTime(item.updatedAtMs)) + '</td>' +
          '<td>' + escapeHtml(active) + '</td>' +
          '<td><button data-action="pick" data-workspace="' + escapeAttr(item.workspaceId) + '">选择</button> ' +
          '<button class="secondary" data-action="activate" data-workspace="' + escapeAttr(item.workspaceId) + '">激活</button></td>';
        workspaceRows.appendChild(tr);
      }
      if (state.items.length === 0) {
        const tr = document.createElement("tr");
        tr.innerHTML = '<td colspan="5" class="help">暂无工作区记录</td>';
        workspaceRows.appendChild(tr);
      }
    }

    function parseCsv(text) {
      return String(text || "")
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
    }

    function scalar(text) {
      const raw = String(text || "").trim();
      if (/^[A-Za-z0-9_./:-]+$/.test(raw)) {
        return raw;
      }
      return "'" + raw.replace(/'/g, "''") + "'";
    }

    function dequote(text) {
      const raw = String(text || "").trim();
      if (raw.length >= 2 && raw.startsWith("'") && raw.endsWith("'")) {
        return raw.slice(1, -1).replace(/''/g, "'");
      }
      if (raw.length >= 2 && raw.startsWith('"') && raw.endsWith('"')) {
        return raw.slice(1, -1);
      }
      return raw;
    }

    function buildEndpoints() {
      const endpoints = [];
      for (const board of state.topology.boards) {
        for (const port of parseCsv(board.portsCsv)) {
          endpoints.push({ boardId: board.id, boardPort: port });
        }
      }
      return endpoints;
    }

    function getBoundVirtualPort(boardId, boardPort) {
      for (const vPort of state.topology.virtualPorts) {
        const binding = state.topology.bindings[vPort];
        if (binding && binding.boardId === boardId && binding.boardPort === boardPort) {
          return vPort;
        }
      }
      return "";
    }

    function syncBoardsFromDom() {
      const nextBoards = [];
      for (const node of topologyBoards.querySelectorAll(".topology-board")) {
        nextBoards.push({
          id: String(node.querySelector("[data-field='id']").value || "").trim(),
          kind: String(node.querySelector("[data-field='kind']").value || "board"),
          portsCsv: String(node.querySelector("[data-field='portsCsv']").value || "").trim(),
          driver: String(node.querySelector("[data-field='driver']").value || "").trim(),
          device: String(node.querySelector("[data-field='device']").value || "").trim(),
          resource: String(node.querySelector("[data-field='resource']").value || "").trim(),
          cardIndex: String(node.querySelector("[data-field='cardIndex']").value || "").trim(),
          detail: String(node.querySelector("[data-field='detail']").value || "").trim(),
        });
      }
      state.topology.boards = nextBoards.filter((item) => item.id.length > 0);
      if (state.topology.boards.length === 0) {
        state.topology.boards.push({
          id: "card1",
          kind: "board",
          portsCsv: "p1,p2",
          driver: "pxi",
          device: "pxi-mock-0",
          resource: "dev0",
          cardIndex: "1",
          detail: "",
        });
      }
    }

    function sanitizeBindings() {
      const endpoints = new Set(buildEndpoints().map((item) => item.boardId + "." + item.boardPort));
      const next = {};
      for (const vPort of state.topology.virtualPorts) {
        const binding = state.topology.bindings[vPort];
        if (!binding) {
          continue;
        }
        const key = String(binding.boardId || "") + "." + String(binding.boardPort || "");
        if (endpoints.has(key)) {
          next[vPort] = { boardId: binding.boardId, boardPort: binding.boardPort };
        }
      }
      state.topology.bindings = next;
    }

    function renderTopologyVisual() {
      topologyVirtualPorts.innerHTML = "";
      for (const vPort of state.topology.virtualPorts) {
        const bound = Boolean(state.topology.bindings[vPort]);
        const chip = document.createElement("span");
        chip.className = "chip" + (bound ? " is-bound" : "");
        chip.setAttribute("draggable", "true");
        chip.setAttribute("data-action", "drag-vport");
        chip.setAttribute("data-vport", vPort);
        chip.innerHTML = '<span>' + escapeHtml(vPort) + (bound ? ' <span class="slot-hint">(bound)</span>' : '') + '</span><button data-action="remove-vport" data-vport="' + escapeAttr(vPort) + '">×</button>';
        topologyVirtualPorts.appendChild(chip);
      }

      topologyBoards.innerHTML = "";
      state.topology.boards.forEach((board, index) => {
        const portSlots = parseCsv(board.portsCsv)
          .map((boardPort) => {
            const boundVPort = getBoundVirtualPort(board.id, boardPort);
            const rightPart = boundVPort
              ? '<span class="chip is-bound"><span>' + escapeHtml(boundVPort) + '</span><button data-action="unbind-slot" data-vport="' + escapeAttr(boundVPort) + '">×</button></span>'
              : '<span class="slot-hint">Drop virtual port here</span>';
            return '<div class="board-port-slot" data-action="drop-slot" data-board-id="' + escapeAttr(board.id) + '" data-board-port="' + escapeAttr(boardPort) + '">' +
              '<span class="slot-left"><strong>' + escapeHtml(boardPort) + '</strong><span class="slot-hint">board port</span></span>' +
              rightPart +
            '</div>';
          })
          .join("");

        const el = document.createElement("div");
        el.className = "topology-board";
        el.innerHTML =
          '<div class="line inline"><strong>Board ' + String(index + 1) + '</strong><button class="secondary" data-action="remove-board" data-index="' + String(index) + '">删除</button></div>' +
          '<div class="topology-board-grid">' +
            '<div class="line"><label>ID</label><input data-field="id" value="' + escapeAttr(board.id) + '" /></div>' +
            '<div class="line"><label>Kind</label><select data-field="kind"><option value="board"' + (board.kind === "board" ? " selected" : "") + '>board</option><option value="virtual-vna"' + (board.kind === "virtual-vna" ? " selected" : "") + '>virtual-vna</option></select></div>' +
            '<div class="line"><label>Driver</label><input data-field="driver" value="' + escapeAttr(board.driver) + '" /></div>' +
            '<div class="line"><label>Device</label><input data-field="device" value="' + escapeAttr(board.device) + '" /></div>' +
            '<div class="line"><label>Resource</label><input data-field="resource" value="' + escapeAttr(board.resource) + '" /></div>' +
            '<div class="line"><label>CardIndex</label><input data-field="cardIndex" value="' + escapeAttr(board.cardIndex) + '" /></div>' +
            '<div class="line full"><label>Ports (comma-separated)</label><input data-field="portsCsv" value="' + escapeAttr(board.portsCsv) + '" /></div>' +
            '<div class="line full"><label>Drop Slots</label><div class="board-port-slots">' + (portSlots || '<span class="slot-hint">先填写端口列表</span>') + '</div></div>' +
            '<div class="line full"><label>Detail</label><input data-field="detail" value="' + escapeAttr(board.detail) + '" /></div>' +
          '</div>';
        topologyBoards.appendChild(el);
      });

      topologyBindingRows.innerHTML = "";
      const endpoints = buildEndpoints();
      for (const vPort of state.topology.virtualPorts) {
        const binding = state.topology.bindings[vPort] || { boardId: "", boardPort: "" };
        const tr = document.createElement("tr");
        const selectedKey = binding.boardId && binding.boardPort ? binding.boardId + "." + binding.boardPort : "";
        const options = ['<option value="">(unbound)</option>']
          .concat(
            endpoints.map((item) => {
              const key = item.boardId + "." + item.boardPort;
              const selected = key === selectedKey ? " selected" : "";
              return '<option value="' + escapeAttr(key) + '"' + selected + '>' + escapeHtml(key) + '</option>';
            }),
          )
          .join("");
        tr.innerHTML =
          '<td>' + escapeHtml(vPort) + '</td>' +
          '<td><select data-action="binding-select" data-vport="' + escapeAttr(vPort) + '">' + options + '</select></td>' +
          '<td><button class="secondary" data-action="binding-clear" data-vport="' + escapeAttr(vPort) + '">清空</button></td>';
        topologyBindingRows.appendChild(tr);
      }
    }

    function topologyToYaml() {
      syncBoardsFromDom();
      sanitizeBindings();
      const lines = [];
      lines.push("virtual_vna:");
      lines.push("  ports:");
      for (const vPort of state.topology.virtualPorts) {
        lines.push("    - " + scalar(vPort));
      }

      lines.push("boards:");
      for (const board of state.topology.boards) {
        lines.push("  - id: " + scalar(board.id));
        lines.push("    kind: " + scalar(board.kind || "board"));
        const ports = parseCsv(board.portsCsv);
        if (ports.length > 0) {
          lines.push("    ports:");
          for (const port of ports) {
            lines.push("      - " + scalar(port));
          }
        }
        if (board.detail) {
          lines.push("    detail: " + scalar(board.detail));
        }
      }

      lines.push("bindings:");
      for (const vPort of state.topology.virtualPorts) {
        const binding = state.topology.bindings[vPort];
        if (!binding) {
          continue;
        }
        lines.push("  - vna_port: " + scalar(vPort));
        lines.push("    board_id: " + scalar(binding.boardId));
        lines.push("    board_port: " + scalar(binding.boardPort));
      }

      lines.push("instances:");
      for (const board of state.topology.boards) {
        lines.push("  - id: " + scalar(board.id));
        lines.push("    driver: " + scalar(board.driver));
        lines.push("    device: " + scalar(board.device));
        lines.push("    resource: " + scalar(board.resource));
        if (board.cardIndex) {
          lines.push("    cardIndex: " + scalar(board.cardIndex));
        }
      }
      return lines.join("\\n");
    }

    function parseTopologyYaml(yamlText) {
      const text = String(yamlText || "");
      const lines = text.split(/\\r?\\n/);
      const virtualPorts = [];
      const boards = [];
      const bindings = {};
      const instanceMap = {};
      let section = "";
      let currentBoard = null;
      let currentBinding = null;
      let currentInstance = null;
      let inVirtualPorts = false;
      let inBoardPorts = false;

      function flushBoard() {
        if (currentBoard) {
          boards.push(currentBoard);
          currentBoard = null;
        }
      }

      function flushBinding() {
        if (currentBinding && currentBinding.vnaPort && currentBinding.boardId && currentBinding.boardPort) {
          bindings[currentBinding.vnaPort] = { boardId: currentBinding.boardId, boardPort: currentBinding.boardPort };
        }
        currentBinding = null;
      }

      function flushInstance() {
        if (currentInstance && currentInstance.id) {
          instanceMap[currentInstance.id] = currentInstance;
        }
        currentInstance = null;
      }

      for (const line of lines) {
        const trim = line.trim();
        if (!trim || trim.startsWith("#")) {
          continue;
        }
        if (trim === "virtual_vna:" || trim === "virtualVna:") {
          flushBoard();
          flushBinding();
          flushInstance();
          section = "virtual";
          inVirtualPorts = false;
          continue;
        }
        if (trim === "boards:") {
          flushBoard();
          flushBinding();
          flushInstance();
          section = "boards";
          inBoardPorts = false;
          continue;
        }
        if (trim === "bindings:") {
          flushBoard();
          flushBinding();
          flushInstance();
          section = "bindings";
          continue;
        }
        if (trim === "instances:") {
          flushBoard();
          flushBinding();
          flushInstance();
          section = "instances";
          continue;
        }

        if (section === "virtual") {
          if (trim === "ports:") {
            inVirtualPorts = true;
            continue;
          }
          if (inVirtualPorts && trim.startsWith("- ")) {
            virtualPorts.push(dequote(trim.slice(2)));
          }
          continue;
        }

        if (section === "boards") {
          if (trim.startsWith("- ")) {
            flushBoard();
            inBoardPorts = false;
            currentBoard = {
              id: "",
              kind: "board",
              portsCsv: "",
              driver: "",
              device: "",
              resource: "",
              cardIndex: "",
              detail: "",
            };
            const inline = trim.slice(2).trim();
            if (inline.startsWith("id:")) {
              currentBoard.id = dequote(inline.slice(3));
            }
            continue;
          }
          if (!currentBoard) {
            continue;
          }
          const pos = trim.indexOf(":");
          if (pos < 0) {
            continue;
          }
          const key = trim.slice(0, pos).trim();
          const value = dequote(trim.slice(pos + 1));
          if (key === "id") {
            currentBoard.id = value;
          } else if (key === "kind") {
            currentBoard.kind = value || "board";
          } else if (key === "detail") {
            currentBoard.detail = value;
          } else if (key === "ports") {
            inBoardPorts = true;
          }
          if (inBoardPorts && trim.startsWith("- ")) {
            const merged = parseCsv(currentBoard.portsCsv);
            merged.push(dequote(trim.slice(2)));
            currentBoard.portsCsv = Array.from(new Set(merged)).join(",");
          }
          continue;
        }

        if (section === "bindings") {
          if (trim.startsWith("- ")) {
            flushBinding();
            currentBinding = { vnaPort: "", boardId: "", boardPort: "" };
            const inline = trim.slice(2).trim();
            if (inline.startsWith("vna_port:")) {
              currentBinding.vnaPort = dequote(inline.slice("vna_port:".length));
            }
            continue;
          }
          if (!currentBinding) {
            continue;
          }
          const pos = trim.indexOf(":");
          if (pos < 0) {
            continue;
          }
          const key = trim.slice(0, pos).trim();
          const value = dequote(trim.slice(pos + 1));
          if (key === "vna_port") {
            currentBinding.vnaPort = value;
          } else if (key === "board_id") {
            currentBinding.boardId = value;
          } else if (key === "board_port") {
            currentBinding.boardPort = value;
          }
          continue;
        }

        if (section === "instances") {
          if (trim.startsWith("- ")) {
            flushInstance();
            currentInstance = { id: "", driver: "", device: "", resource: "", cardIndex: "" };
            const inline = trim.slice(2).trim();
            if (inline.startsWith("id:")) {
              currentInstance.id = dequote(inline.slice(3));
            }
            continue;
          }
          if (!currentInstance) {
            continue;
          }
          const pos = trim.indexOf(":");
          if (pos < 0) {
            continue;
          }
          const key = trim.slice(0, pos).trim();
          const value = dequote(trim.slice(pos + 1));
          if (key === "id") {
            currentInstance.id = value;
          } else if (key === "driver") {
            currentInstance.driver = value;
          } else if (key === "device") {
            currentInstance.device = value;
          } else if (key === "resource") {
            currentInstance.resource = value;
          } else if (key === "cardIndex") {
            currentInstance.cardIndex = value;
          }
        }
      }

      flushBoard();
      flushBinding();
      flushInstance();

      for (const board of boards) {
        const instance = instanceMap[board.id];
        if (!instance) {
          continue;
        }
        board.driver = instance.driver || board.driver;
        board.device = instance.device || board.device;
        board.resource = instance.resource || board.resource;
        board.cardIndex = instance.cardIndex || board.cardIndex;
      }

      state.topology.virtualPorts = virtualPorts.length > 0 ? virtualPorts : ["vna-port1", "vna-port2"];
      state.topology.boards = boards.length > 0 ? boards : [
        {
          id: "card1",
          kind: "board",
          portsCsv: "p1,p2",
          driver: "pxi",
          device: "pxi-mock-0",
          resource: "dev0",
          cardIndex: "1",
          detail: "",
        },
      ];
      state.topology.bindings = bindings;
      sanitizeBindings();
      renderTopologyVisual();
    }

    function setTopologyMode(modeName) {
      state.topologyMode = modeName === "yaml" ? "yaml" : "visual";
      const visual = state.topologyMode === "visual";
      topologyVisualSection.classList.toggle("hidden", !visual);
      topologyYamlSection.classList.toggle("hidden", visual);
      topologyVisualMode.classList.toggle("secondary", !visual);
      topologyYamlMode.classList.toggle("secondary", visual);
      if (!visual) {
        topologyYaml.value = topologyToYaml();
      }
    }

    function getTopologyYamlForSave() {
      if (state.topologyMode === "yaml") {
        return String(topologyYaml.value || "");
      }
      return topologyToYaml();
    }

    function drawWaveform(payload) {
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return;
      }

      const traces = Array.isArray(payload.traces) ? payload.traces : [];
      const points = traces.flatMap((trace) => Array.isArray(trace.points) ? trace.points : []);
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      if (points.length === 0) {
        ctx.fillStyle = "rgba(127,127,127,0.8)";
        ctx.fillText("No waveform points", 16, 24);
        return;
      }

      const xs = points.map((point) => Number(point.x));
      const ys = points.map((point) => Number(point.y));
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      const padX = 40;
      const padY = 20;
      const spanX = Math.max(maxX - minX, 1e-9);
      const spanY = Math.max(maxY - minY, 1e-9);

      ctx.strokeStyle = "rgba(127,127,127,0.5)";
      ctx.lineWidth = 1;
      ctx.strokeRect(padX, padY, Math.max(0, width - padX * 2), Math.max(0, height - padY * 2));

      const palette = [
        "#4ec9b0",
        "#569cd6",
        "#c586c0",
        "#dcdcaa",
      ];

      traces.forEach((trace, index) => {
        const tracePoints = Array.isArray(trace.points) ? trace.points : [];
        if (tracePoints.length === 0) {
          return;
        }
        ctx.beginPath();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = String(trace.color || palette[index % palette.length]);
        tracePoints.forEach((point, pointIndex) => {
          const x = padX + ((Number(point.x) - minX) / spanX) * (width - padX * 2);
          const y = height - padY - ((Number(point.y) - minY) / spanY) * (height - padY * 2);
          if (pointIndex === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });
        ctx.stroke();
      });
    }

    function escapeHtml(value) {
      return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }

    function escapeAttr(value) {
      return escapeHtml(String(value));
    }

    function openModal(options) {
      modalTitle.textContent = options.title || "提示";
      modalBody.textContent = options.body || "";
      const hasInput = Boolean(options.inputLabel);
      modalInputLine.style.display = hasInput ? "flex" : "none";
      modalInputLabel.textContent = options.inputLabel || "";
      modalInput.value = options.inputValue || "";
      modal.classList.add("is-open");
      if (hasInput) {
        modalInput.focus();
        modalInput.select();
      } else {
        modalConfirm.focus();
      }

      return new Promise((resolve) => {
        state.modalResolver = resolve;
      });
    }

    function closeModal(result) {
      modal.classList.remove("is-open");
      const resolver = state.modalResolver;
      state.modalResolver = null;
      resolver?.(result);
    }

    function post(type, payload) {
      vscode.postMessage({ type, ...payload });
    }

    document.querySelectorAll("[data-menu-toggle]").forEach((node) => {
      node.addEventListener("click", () => {
        toggleMenu(node.getAttribute("data-menu-toggle"));
      });
    });

    document.querySelectorAll("[data-view]").forEach((node) => {
      node.addEventListener("click", () => {
        const view = node.getAttribute("data-view");
        if (view) {
          switchView(view);
        }
      });
    });

    document.querySelectorAll("[data-action='open-visual-topology']").forEach((node) => {
      node.addEventListener("click", () => post("open-visual-topology", {}));
    });

    topologyVirtualPorts.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      syncBoardsFromDom();
      const action = target.getAttribute("data-action");
      if (action !== "remove-vport") {
        return;
      }
      const vPort = String(target.getAttribute("data-vport") || "");
      if (!vPort) {
        return;
      }
      state.topology.virtualPorts = state.topology.virtualPorts.filter((item) => item !== vPort);
      delete state.topology.bindings[vPort];
      renderTopologyVisual();
    });

    topologyVirtualPorts.addEventListener("dragstart", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      const action = target.getAttribute("data-action");
      const vPort = String(target.getAttribute("data-vport") || "");
      if (action !== "drag-vport" || !vPort) {
        return;
      }
      state.draggingVirtualPort = vPort;
      if (event.dataTransfer) {
        event.dataTransfer.setData("text/plain", vPort);
        event.dataTransfer.effectAllowed = "move";
      }
    });

    topologyVirtualPorts.addEventListener("dragend", () => {
      state.draggingVirtualPort = "";
    });

    topologyBoards.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      syncBoardsFromDom();
      if (target.getAttribute("data-action") !== "remove-board") {
        if (target.getAttribute("data-action") === "unbind-slot") {
          const vPort = String(target.getAttribute("data-vport") || "");
          if (vPort) {
            delete state.topology.bindings[vPort];
            renderTopologyVisual();
          }
        }
        return;
      }
      const index = Number(target.getAttribute("data-index") || "-1");
      if (!Number.isInteger(index) || index < 0 || index >= state.topology.boards.length) {
        return;
      }
      state.topology.boards.splice(index, 1);
      syncBoardsFromDom();
      sanitizeBindings();
      renderTopologyVisual();
    });

    topologyBoards.addEventListener("dragover", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      const slot = target.closest(".board-port-slot");
      if (!(slot instanceof HTMLElement)) {
        return;
      }
      event.preventDefault();
      slot.classList.add("is-drop-target");
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "move";
      }
    });

    topologyBoards.addEventListener("dragleave", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      const slot = target.closest(".board-port-slot");
      if (!(slot instanceof HTMLElement)) {
        return;
      }
      slot.classList.remove("is-drop-target");
    });

    topologyBoards.addEventListener("drop", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      const slot = target.closest(".board-port-slot");
      if (!(slot instanceof HTMLElement)) {
        return;
      }
      event.preventDefault();
      slot.classList.remove("is-drop-target");
      syncBoardsFromDom();

      const boardId = String(slot.getAttribute("data-board-id") || "");
      const boardPort = String(slot.getAttribute("data-board-port") || "");
      const dragged = (event.dataTransfer && event.dataTransfer.getData("text/plain")) || state.draggingVirtualPort || "";
      if (!dragged || !boardId || !boardPort) {
        return;
      }
      if (!state.topology.virtualPorts.includes(dragged)) {
        return;
      }
      state.topology.bindings[dragged] = { boardId, boardPort };
      renderTopologyVisual();
    });

    topologyBindingRows.addEventListener("change", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLSelectElement)) {
        return;
      }
      syncBoardsFromDom();
      if (target.getAttribute("data-action") !== "binding-select") {
        return;
      }
      const vPort = String(target.getAttribute("data-vport") || "");
      const selected = String(target.value || "");
      if (!selected) {
        delete state.topology.bindings[vPort];
        return;
      }
      const pos = selected.indexOf(".");
      if (pos <= 0) {
        return;
      }
      state.topology.bindings[vPort] = {
        boardId: selected.slice(0, pos),
        boardPort: selected.slice(pos + 1),
      };
    });

    topologyBindingRows.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      syncBoardsFromDom();
      if (target.getAttribute("data-action") !== "binding-clear") {
        return;
      }
      const vPort = String(target.getAttribute("data-vport") || "");
      delete state.topology.bindings[vPort];
      renderTopologyVisual();
    });

    topologyVisualMode.addEventListener("click", () => {
      if (state.topologyMode === "yaml") {
        parseTopologyYaml(topologyYaml.value);
      }
      setTopologyMode("visual");
    });

    topologyYamlMode.addEventListener("click", () => {
      setTopologyMode("yaml");
    });

    document.getElementById("btnAddVirtualPort").addEventListener("click", () => {
      const value = String(newVirtualPort.value || "").trim();
      if (!value) {
        return;
      }
      if (!state.topology.virtualPorts.includes(value)) {
        state.topology.virtualPorts.push(value);
      }
      newVirtualPort.value = "";
      renderTopologyVisual();
    });

    document.getElementById("btnAddBoard").addEventListener("click", () => {
      syncBoardsFromDom();
      state.topology.boards.push({
        id: "card" + String(state.topology.boards.length + 1),
        kind: "board",
        portsCsv: "p1,p2",
        driver: "pxi",
        device: "pxi-mock-" + String(state.topology.boards.length),
        resource: "dev" + String(state.topology.boards.length),
        cardIndex: String(state.topology.boards.length + 1),
        detail: "",
      });
      renderTopologyVisual();
    });

    document.getElementById("btnAutoBind").addEventListener("click", () => {
      syncBoardsFromDom();
      const endpoints = buildEndpoints();
      if (endpoints.length === 0) {
        return;
      }
      state.topology.bindings = {};
      state.topology.virtualPorts.forEach((vPort, index) => {
        const endpoint = endpoints[index % endpoints.length];
        state.topology.bindings[vPort] = { boardId: endpoint.boardId, boardPort: endpoint.boardPort };
      });
      renderTopologyVisual();
    });

    document.getElementById("btnTopologyToYaml").addEventListener("click", () => {
      topologyYaml.value = topologyToYaml();
      setStatus("已从可视化模型生成 YAML");
    });

    document.querySelectorAll("[data-action='open-new-workspace-modal']").forEach((node) => {
      node.addEventListener("click", async () => {
        const name = await openModal({
          title: "新建工作区",
          body: "请输入新的 workspaceId，并可直接用于保存拓扑。",
          inputLabel: "workspaceId",
          inputValue: workspaceId.value || "",
        });
        if (!name || !String(name).trim()) {
          return;
        }
        workspaceId.value = String(name).trim();
        setStatus("已填充新 workspaceId，可继续保存/激活。");
      });
    });

    workspaceRows.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      const action = target.getAttribute("data-action");
      const ws = target.getAttribute("data-workspace") || "";
      if (!action || !ws) {
        return;
      }
      if (action === "pick") {
        workspaceId.value = ws;
        post("workspace-load", { workspaceId: ws });
        setStatus("正在加载工作区: " + ws);
      } else if (action === "activate") {
        post("workspace-activate", { workspaceId: ws });
        setStatus("正在激活工作区: " + ws);
      }
    });

    document.getElementById("btnWorkspaceLoad").addEventListener("click", () => {
      post("workspace-load", { workspaceId: workspaceId.value.trim() });
    });
    document.getElementById("btnWorkspaceSave").addEventListener("click", () => {
      post("workspace-save", {
        workspaceId: workspaceId.value.trim(),
        topologyId: topologyId.value.trim(),
        topologyYaml: getTopologyYamlForSave(),
        activate: false,
      });
    });
    document.getElementById("btnWorkspaceSaveActivate").addEventListener("click", () => {
      post("workspace-save", {
        workspaceId: workspaceId.value.trim(),
        topologyId: topologyId.value.trim(),
        topologyYaml: getTopologyYamlForSave(),
        activate: true,
      });
    });
    document.getElementById("btnTopologyLoad").addEventListener("click", () => {
      post("workspace-load", { workspaceId: workspaceId.value.trim() });
    });
    document.getElementById("btnTopologySave").addEventListener("click", () => {
      post("workspace-save", {
        workspaceId: workspaceId.value.trim(),
        topologyId: topologyId.value.trim(),
        topologyYaml: getTopologyYamlForSave(),
        activate: false,
      });
    });
    document.getElementById("btnTopologySaveActivate").addEventListener("click", () => {
      post("workspace-save", {
        workspaceId: workspaceId.value.trim(),
        topologyId: topologyId.value.trim(),
        topologyYaml: getTopologyYamlForSave(),
        activate: true,
      });
    });
    document.getElementById("btnRefreshService").addEventListener("click", () => post("service-status", {}));

    document.getElementById("btnScanGet").addEventListener("click", () => {
      post("scan-get", { instanceId: instanceId.value.trim() });
    });
    document.getElementById("btnScanContinuous").addEventListener("click", () => {
      post("scan-set", { instanceId: instanceId.value.trim(), scanState: "continuous" });
    });
    document.getElementById("btnScanSingle").addEventListener("click", () => {
      post("scan-set", { instanceId: instanceId.value.trim(), scanState: "single" });
    });
    document.getElementById("btnScanHold").addEventListener("click", () => {
      post("scan-set", { instanceId: instanceId.value.trim(), scanState: "hold" });
    });
    document.getElementById("btnSnapshot").addEventListener("click", () => {
      post("waveform-snapshot", {
        instanceId: instanceId.value.trim(),
        sampleCount: Number(sampleCount.value),
        mode: mode.value,
      });
      switchView("waveform");
    });
    document.getElementById("btnLiveStart").addEventListener("click", () => {
      post("waveform-live-start", {
        instanceId: instanceId.value.trim(),
        sampleCount: Number(sampleCount.value),
        mode: mode.value,
      });
      switchView("waveform");
    });
    document.getElementById("btnLiveStop").addEventListener("click", () => {
      post("waveform-live-stop", { instanceId: instanceId.value.trim() });
    });

    modalCancel.addEventListener("click", () => closeModal(null));
    modalConfirm.addEventListener("click", () => {
      const withInput = modalInputLine.style.display !== "none";
      closeModal(withInput ? modalInput.value : true);
    });
    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        closeModal(null);
      }
    });

    window.addEventListener("message", async (event) => {
      const payload = event.data || {};
      const type = String(payload.type || "");
      if (type === "workspace-list-result") {
        state.items = Array.isArray(payload.items) ? payload.items : [];
        state.activeWorkspaceId = String(payload.activeWorkspaceId || "");
        renderWorkspaceRows();
        return;
      }
      if (type === "workspace-load-result") {
        if (!payload.ok || !payload.item) {
          setStatus("加载失败: " + String(payload.error || payload.message || "unknown"));
          return;
        }
        const item = payload.item;
        workspaceId.value = String(item.workspaceId || "");
        topologyId.value = String(item.topologyId || "");
        topologyYaml.value = String(item.topologyYaml || "");
        parseTopologyYaml(topologyYaml.value);
        setStatus("已加载工作区: " + workspaceId.value);
        return;
      }
      if (type === "workspace-save-result" || type === "workspace-activate-result") {
        const ok = Boolean(payload.ok);
        const message = String(payload.message || payload.error || "");
        setStatus(message || (ok ? "操作成功" : "操作失败"));
        if (!ok) {
          await openModal({ title: "操作失败", body: message || "未知错误" });
        }
        return;
      }
      if (type === "service-status-result") {
        if (!payload.ok) {
          serviceStatus.textContent = "服务状态读取失败: " + String(payload.error || "unknown");
          return;
        }
        const data = payload.status || {};
        serviceStatus.textContent =
          "ready=" + String(Boolean(data.ready)) +
          ", state=" + String(data.state || "") +
          ", instances=" + String(data.instanceCount || 0) +
          ", addr=" + String(data.bindAddress || "") + ":" + String(data.port || 0);
        return;
      }
      if (type === "scan-state-result") {
        if (!payload.ok) {
          scanStatus.textContent = "scan 状态失败: " + String(payload.error || "unknown");
          return;
        }
        scanStatus.textContent = "scan=" + String(payload.scanState || "") + ", stream=" + String(Boolean(payload.streamActive));
        return;
      }
      if (type === "waveform-frame") {
        const waveform = payload.waveform || null;
        if (!waveform) {
          return;
        }
        state.latestWaveform = waveform;
        drawWaveform(waveform);
        const traces = Array.isArray(waveform.traces) ? waveform.traces.length : 0;
        const points = Array.isArray(waveform.points) ? waveform.points.length : 0;
        waveMeta.textContent = "frame=" + String(waveform.frameType || "unknown") + ", traces=" + String(traces) + ", points=" + String(points);
        waveHint.textContent = "timestampNs=" + String(waveform.timestampNs || 0) + ", mode=" + String(waveform.frameType || "unknown");
        return;
      }
      if (type === "live-state") {
        state.liveActive = Boolean(payload.active);
        setStatus(state.liveActive ? "实时采集中..." : "实时采集已停止");
        return;
      }
      if (type === "app-error") {
        const message = String(payload.message || "unknown");
        setStatus("错误: " + message);
        await openModal({ title: "错误", body: message });
      }
    });

    window.addEventListener("resize", () => {
      if (state.latestWaveform) {
        drawWaveform(state.latestWaveform);
      }
    });

    renderTopologyVisual();
    setTopologyMode("visual");

    post("app-init", {});
  </script>
</body>
</html>`;
}
