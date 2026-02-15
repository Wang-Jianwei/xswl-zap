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
      height: 100vh;
      overflow: hidden;
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
      height: 100%;
      overflow: hidden;
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
      flex: 1;
      min-height: 0;
    }
    .view.is-active {
      display: flex;
      flex-direction: column;
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
    .card.fit {
      display: flex;
      flex-direction: column;
      flex: 1;
      overflow: hidden;
      box-sizing: border-box;
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
    .topology-layout-new {
      display: flex;
      flex-direction: column;
      gap: 10px;
      flex: 1;
      border: 1px solid var(--vscode-panel-border);
      border-radius: 6px;
      background: var(--vscode-editor-background);
      overflow: hidden;
    }
    .topology-toolbar {
      display: flex;
      gap: 8px;
      padding: 8px;
      border-bottom: 1px solid var(--vscode-panel-border);
      background: var(--vscode-editorWidget-background);
      align-items: center;
    }
    .topology-canvas-container {
      position: relative;
      flex: 1;
      overflow: hidden;
      cursor: grab;
      background-image: radial-gradient(var(--vscode-panel-border) 1px, transparent 0);
      background-size: 20px 20px;
    }
    .topology-canvas-container:active {
      cursor: grabbing;
    }
    #topologyConnections {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 2; /* Move above nodes so connections are visible on top of ports */
    }
    #topologyNodes {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 1;
      pointer-events: none; /* Nodes inside will have pointer-events: auto */
    }
    .t-node {
      position: absolute;
      border: 1px solid var(--vscode-widget-border);
      background: var(--vscode-editorWidget-background);
      border-radius: 6px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      padding: 0;
      min-width: 120px;
      pointer-events: auto;
      user-select: none;
      display: flex;
      flex-direction: column;
    }
    .t-node-header {
      padding: 6px 8px;
      background: var(--vscode-titleBar-activeBackground);
      color: var(--vscode-titleBar-activeForeground);
      border-top-left-radius: 5px;
      border-top-right-radius: 5px;
      font-weight: 600;
      font-size: 12px;
      cursor: grab;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .t-node-header:active { cursor: grabbing; }
    .t-node-body {
      padding: 8px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .t-port {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      height: 24px;
      position: relative;
    }
    .t-port-point {
      width: 10px;
      height: 10px;
      background: var(--vscode-button-background);
      border: 1px solid var(--vscode-button-border);
      border-radius: 50%;
      cursor: crosshair;
      flex-shrink: 0;
    }
    .t-port-point:hover {
      background: var(--vscode-button-hoverBackground);
      transform: scale(1.2);
    }
    .t-port-label {
      font-size: 11px;
      padding: 0 4px;
      color: var(--vscode-foreground);
    }
    /* Virtual Ports: Simple Pill */
    .t-node.virtual {
      min-width: auto;
      border-color: var(--vscode-charts-blue);
    }
    .t-node.virtual .t-node-header {
      background: var(--vscode-charts-blue);
      color: white;
      padding: 4px 8px;
    }
    /* SVG Styles */
    .connection-line {
      fill: none;
      stroke: var(--line-color, var(--vscode-charts-blue, #569cd6));
      stroke-width: 2.5px;
      stroke-linecap: round;
      pointer-events: stroke; /* Allow clicking the line to delete */
      cursor: pointer;
      transition: stroke-width 0.1s ease;
    }
    .connection-line:hover {
      stroke: var(--vscode-charts-red, #f14c4c);
      stroke-width: 4px;
    }
    .connection-line.draft {
      stroke: var(--vscode-descriptionForeground, #ccccccb3);
      stroke-dasharray: 4, 4;
      pointer-events: none;
    }
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
    .device-manager {
      border-top: 1px solid var(--vscode-panel-border);
      padding: 8px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex-shrink: 0;
      max-height: 30vh;
      overflow: auto;
      background: color-mix(in srgb, var(--vscode-editor-background) 95%, var(--vscode-sideBar-background) 5%);
    }
    .device-row {
      border: 1px solid var(--vscode-panel-border);
      border-radius: 4px;
      padding: 6px;
      display: grid;
      grid-template-columns: 1fr 120px 1fr 1fr 1fr auto;
      gap: 6px;
      align-items: center;
      background: var(--vscode-editorWidget-background);
    }
    .device-row input,
    .device-row select {
      padding: 4px 6px;
      font-size: 11px;
    }
    .board-detail-grid {
      margin-top: 4px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
      font-size: 11px;
    }
    .board-detail-grid .full { grid-column: 1 / span 2; }
    .board-detail-grid label {
      color: var(--vscode-descriptionForeground);
      display: block;
      margin-bottom: 2px;
      font-size: 10px;
    }
    .board-bind-hint {
      font-size: 10px;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 4px;
      padding: 4px 6px;
      border-radius: 4px;
      background: color-mix(in srgb, var(--vscode-editor-background) 90%, var(--vscode-sideBar-background) 10%);
      border: 1px solid var(--vscode-panel-border);
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
        <div class="card fit">
          <h3>拓扑编辑（内嵌可视化）</h3>
          <div class="topology-mode">
            <button id="topologyVisualMode">可视化模式</button>
            <button id="topologyYamlMode" class="secondary">YAML 高级模式</button>
            <button id="btnTopologyLoad">从工作区加载</button>
            <button id="btnTopologyToYaml" class="secondary">从可视化生成 YAML</button>
          </div>

          <div id="topologyVisualSection" class="topology-layout-new">
            <div class="topology-toolbar">
              <div class="line inline" style="margin:0;">
                <button id="btnAddVirtualPort">新增虚拟端口</button>
                <button id="btnAddBoard">新增板卡</button>
                <button id="btnAutoLayout" class="secondary">自动排列</button>
              </div>
              <div class="help" style="margin-left:auto; font-size:12px;">
                拖拽标题移动 | 拖拽端口连线 | 点击连线删除
              </div>
            </div>

            <div class="device-manager">
              <div class="line inline" style="margin:0;">
                <strong>设备管理器</strong>
                <button id="btnAddDevice" class="secondary">新增设备</button>
              </div>
              <div id="deviceManagerRows" class="help">暂无设备，请先新增（支持物理/虚拟设备）。</div>
            </div>
            
            <div id="topologyCanvasContainer" class="topology-canvas-container">
              <!-- SVG Layer for Links (Z-Index 0) -->
              <svg id="topologyConnections" width="100%" height="100%">
                <defs>
                  <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#569cd6" />
                  </marker>
                </defs>
              </svg>
              <!-- HTML Layer for Nodes (Z-Index 1) -->
              <div id="topologyNodes"></div>
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
      expandedBoards: new Set(), // Track expanded state separately
    };

    function escapeHtml(value) {
      return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }
    
    function escapeAttr(value) {
        return String(value).replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }

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
    const deviceManagerRows = document.getElementById("deviceManagerRows");
    const btnAddDevice = document.getElementById("btnAddDevice");
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
          deviceTemplateId: "dev-pxi-0",
          driver: "pxi",
          device: "pxi-mock-0",
          resource: "dev0",
          cardIndex: "1",
          detail: "",
        },
      ],
      bindings: {},
    };
    state.deviceRegistry = [
      {
        id: "dev-pxi-0",
        type: "physical",
        driver: "pxi",
        device: "pxi-mock-0",
        resource: "dev0",
      },
      {
        id: "dev-virt-0",
        type: "virtual",
        driver: "virtual",
        device: "virtual-device-0",
        resource: "virt://device/0",
      },
    ];

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
      // No-op: State is now managed directly by visual interaction
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

    function syncDeviceRegistryFromBoards() {
      const existingKeys = new Set(
        state.deviceRegistry.map((item) => [item.driver, item.device, item.resource].join("|"))
      );
      for (const board of state.topology.boards) {
        const key = [board.driver || "", board.device || "", board.resource || ""].join("|");
        if (!board.device || existingKeys.has(key)) {
          continue;
        }
        state.deviceRegistry.push({
          id: "dev-import-" + String(state.deviceRegistry.length + 1),
          type: String(board.driver || "").toLowerCase() === "virtual" ? "virtual" : "physical",
          driver: board.driver || "",
          device: board.device || "",
          resource: board.resource || "",
        });
        existingKeys.add(key);
      }
    }

    function applyDeviceTemplateToBoard(board, deviceId) {
      if (!board || !deviceId) {
        return false;
      }
      const device = state.deviceRegistry.find((item) => item.id === deviceId);
      if (!device) {
        return false;
      }
      board.deviceTemplateId = device.id;
      board.driver = device.driver;
      board.device = device.device;
      board.resource = device.resource;
      return true;
    }

    function syncBoardsBoundToDevice(deviceId) {
      if (!deviceId) {
        return;
      }
      for (const board of state.topology.boards) {
        if (board.deviceTemplateId === deviceId) {
          applyDeviceTemplateToBoard(board, deviceId);
        }
      }
    }

    function buildDeviceTemplateOptions(board) {
      const selected = board.deviceTemplateId
        ? state.deviceRegistry.find((item) => item.id === board.deviceTemplateId)
        : state.deviceRegistry.find(
            (item) => item.driver === board.driver && item.device === board.device && item.resource === board.resource
          );
      const options = ['<option value="">自定义</option>'];
      for (const item of state.deviceRegistry) {
        const label = item.id + " [" + (item.type === "virtual" ? "虚拟" : "物理") + "] " + item.resource;
        options.push(
          '<option value="' + escapeAttr(item.id) + '"' +
            (selected && selected.id === item.id ? ' selected' : '') +
          '>' + escapeHtml(label) + '</option>'
        );
      }
      return options.join("");
    }

    function renderDeviceManager() {
      if (!deviceManagerRows) {
        return;
      }
      if (!Array.isArray(state.deviceRegistry) || state.deviceRegistry.length === 0) {
        deviceManagerRows.innerHTML = "暂无设备，请先新增（支持物理/虚拟设备）。";
        return;
      }
      deviceManagerRows.innerHTML = state.deviceRegistry.map((item) =>
        '<div class="device-row" data-device-id="' + escapeAttr(item.id) + '">' +
          '<input data-field="id" value="' + escapeAttr(item.id) + '" placeholder="设备ID" />' +
          '<select data-field="type">' +
            '<option value="physical"' + (item.type === "physical" ? ' selected' : '') + '>物理</option>' +
            '<option value="virtual"' + (item.type === "virtual" ? ' selected' : '') + '>虚拟</option>' +
          '</select>' +
          '<input data-field="driver" value="' + escapeAttr(item.driver) + '" placeholder="driver" />' +
          '<input data-field="device" value="' + escapeAttr(item.device) + '" placeholder="device" />' +
          '<input data-field="resource" value="' + escapeAttr(item.resource) + '" placeholder="resource" />' +
          '<button data-action="delete-device" class="secondary">删除</button>' +
        '</div>'
      ).join("");
    }

    function ensureLayout() {
      if (!state.topology.layout) {
        state.topology.layout = {};
      }
      // Initialize layout if empty
      let y = 50;
      state.topology.virtualPorts.forEach((vp, i) => {
        if (!state.topology.layout[vp]) {
            state.topology.layout[vp] = { x: 50, y: y };
            y += 60;
        }
      });
      
      let x = 300;
      y = 50;
      state.topology.boards.forEach((board, i) => {
        if (!state.topology.layout[board.id]) {
            state.topology.layout[board.id] = { x: x, y: y };
            y += 150;
            if (y > 400) { y = 50; x += 250; }
        }
      });
    }

    function getPortPosition(nodeId, portName, isVirtual) {
        // Try to get position from DOM
        // Note: Use simple attribute selector to avoid escaping issues in querySelector string
        const container = document.getElementById("topologyNodes");
        if (container) {
             const points = Array.from(container.querySelectorAll('.t-port-point'));
             const el = points.find(p => p.getAttribute('data-node') === nodeId && p.getAttribute('data-port') === portName);
             
             if (el) {
                const rect = el.getBoundingClientRect();
                const canvasContainer = document.getElementById("topologyCanvasContainer");
                // Fallback to client coords if container not found (should not happen)
                const containerRect = canvasContainer ? canvasContainer.getBoundingClientRect() : { left: 0, top: 0 };
    
                return {
                    x: rect.left - containerRect.left + (rect.width / 2),
                    y: rect.top - containerRect.top + (rect.height / 2)
                };
             }
        }

        // Fallback to estimation if not rendered yet (should rarely happen in visual mode)
        const layout = state.topology.layout[nodeId] || { x:0, y:0 };
        if (isVirtual) {
            return { x: layout.x + 90, y: layout.y + 36 }; 
        } else {
            const board = state.topology.boards.find(b => b.id === nodeId);
            if (!board) return { x: layout.x, y: layout.y };
            const ports = parseCsv(board.portsCsv);
            const index = ports.indexOf(portName);
            // approximate: header ~30px, driver ~15px, port ~24px height
            return { x: layout.x + 12, y: layout.y + 45 + (index * 24) + 12 };
        }
    }

    function renderTopologyVisual() {
      ensureLayout();
      const nodesContainer = document.getElementById("topologyNodes");
      const connectionsContainer = document.getElementById("topologyConnections");
      if (!nodesContainer || !connectionsContainer) return;

      nodesContainer.innerHTML = "";
      
      // Render Virtual Ports (Source Nodes)
      const palette = ["#3794ff", "#89d185", "#b180d7", "#cca700", "#d18616", "#f14c4c", "#00bcd4", "#9c27b0"];
      
      state.topology.virtualPorts.forEach((vp, idx) => {
        const pos = state.topology.layout[vp];
        const color = palette[idx % palette.length];
        
        const el = document.createElement("div");
        el.className = "t-node virtual";
        el.style.left = pos.x + "px";
        el.style.top = pos.y + "px";
        el.style.width = "100px";
        el.style.borderColor = color; // Border color
        el.setAttribute("data-id", vp);
        el.setAttribute("data-type", "virtual");
        
        el.innerHTML = 
            '<div class="t-node-header" style="background:' + color + '; filter:brightness(0.9);">' + escapeHtml(vp) + 
            ' <span style="cursor:pointer;margin-left:4px;" data-action="delete-vp">×</span></div>' +
            '<div class="t-port" style="justify-content:flex-end; padding-right:0;">' +
             '<div class="t-port-point" style="background:' + color + '; border-color:' + color + ';" data-port="' + escapeAttr(vp) + '" data-node="' + escapeAttr(vp) + '"></div>' +
            '</div>';
        nodesContainer.appendChild(el);
      });

      // Render Boards (Target Nodes)
      state.topology.boards.forEach(board => {
        const pos = state.topology.layout[board.id];
        const el = document.createElement("div");
        el.className = "t-node";
        el.style.left = pos.x + "px";
        el.style.top = pos.y + "px";
        el.setAttribute("data-id", board.id);
        el.setAttribute("data-type", "board");

        const portsOnBoard = parseCsv(board.portsCsv);
        const portsHtml = portsOnBoard.map(p => {
            // Find if this port is bound
            let boundColor = "";
            for (const [vPort, binding] of Object.entries(state.topology.bindings)) {
                if (binding && binding.boardId === board.id && binding.boardPort === p) {
                    const vIdx = state.topology.virtualPorts.indexOf(vPort);
                    if (vIdx !== -1) {
                         boundColor = palette[vIdx % palette.length];
                    }
                    break;
                }
            }
            
            // Simplify label: any digits in port name -> show digits only (p1 -> 1, port2 -> 2)
            const portText = String(p);
            let digits = "";
            for (const ch of portText) {
              if (ch >= "0" && ch <= "9") {
                digits += ch;
              }
            }
            const label = digits.length > 0 ? digits : portText;

            const style = boundColor ? ('style="background:' + boundColor + '; border-color:' + boundColor + ';"') : '';
            
            return '<div class="t-port">' +
                '<div class="t-port-point" ' + style + ' data-port="' + escapeAttr(p) + '" data-node="' + escapeAttr(board.id) + '"></div>' +
                '<span class="t-port-label">' + escapeHtml(label) + '</span>' +
            '</div>';
        }).join("");

        const isExpanded = state.expandedBoards.has(board.id);
        const toggleIcon = isExpanded ? "▼" : "▶";
           const templateOptions = buildDeviceTemplateOptions(board);
          const isTemplateBound = Boolean(board.deviceTemplateId);
          const headerStateIcon = isTemplateBound ? "🔒" : "◌";
          const headerStateTitle = isTemplateBound ? "模板绑定中" : "自定义配置";
          const bindState = isTemplateBound ? "bound" : "custom";
          const bindHint = isTemplateBound
           ? ("🔒 已绑定模板 " + String(board.deviceTemplateId || "") + "（编辑字段将自动切换为自定义）")
           : "✎ 当前为自定义配置（可选择模板启用自动同步）";
        
        let detailsHtml = "";
        if (isExpanded) {
             detailsHtml = '<div style="margin-top:8px; padding-top:6px; border-top:1px solid var(--vscode-widget-border);">' +
             '<div class="board-bind-hint" data-bind-state="' + escapeAttr(bindState) + '" data-template-id="' + escapeAttr(board.deviceTemplateId || "") + '">' + escapeHtml(bindHint) + '</div>' +
             '<div class="board-detail-grid">' +
               '<div class="full"><label>设备模板</label><select data-action="board-device-template" data-board-id="' + escapeAttr(board.id) + '">' + templateOptions + '</select></div>' +
               '<div><label>Driver</label><input data-action="board-driver" data-board-id="' + escapeAttr(board.id) + '" value="' + escapeAttr(board.driver || "") + '" /></div>' +
               '<div><label>Device</label><input data-action="board-device" data-board-id="' + escapeAttr(board.id) + '" value="' + escapeAttr(board.device || "") + '" /></div>' +
               '<div><label>Resource</label><input data-action="board-resource" data-board-id="' + escapeAttr(board.id) + '" value="' + escapeAttr(board.resource || "") + '" /></div>' +
               '<div><label>Card Index</label><input data-action="board-card-index" data-board-id="' + escapeAttr(board.id) + '" value="' + escapeAttr(board.cardIndex || "") + '" /></div>' +
               '<div class="full"><label>Detail</label><input data-action="board-detail" data-board-id="' + escapeAttr(board.id) + '" value="' + escapeAttr(board.detail || "") + '" /></div>' +
             '</div>' +
            '</div>';
        } else {
             detailsHtml = '<div style="margin-top:4px; padding-top:4px; border-top:1px solid var(--vscode-widget-border); font-size:10px; color:var(--vscode-descriptionForeground)">' + escapeHtml(board.driver) + '</div>';
        }

        el.innerHTML = 
            '<div class="t-node-header" style="display:flex; align-items:center;">' +
             '<span data-action="toggle-expand-label" data-id="' + escapeAttr(board.id) + '" style="flex:1; cursor:pointer;">' + escapeHtml(board.id) + '</span>' +
             '<span title="' + escapeAttr(headerStateTitle) + '" style="margin-right:4px; font-size:10px;">' + headerStateIcon + '</span>' +
               '<span data-action="toggle-expand" data-id="' + escapeAttr(board.id) + '" style="cursor:pointer; padding:0 4px;font-size:10px;">' + toggleIcon + '</span>' +
            '</div>' +
            '<div class="t-node-body">' +
                portsHtml +
                detailsHtml +
            '</div>';
        nodesContainer.appendChild(el);
      });

          renderDeviceManager();

      // Defer connection rendering to next frame
      requestAnimationFrame(() => renderConnections());
    }

    function renderConnections() {
      const connectionsContainer = document.getElementById("topologyConnections");
      if (!connectionsContainer) return;

      const vPorts = state.topology.virtualPorts;
      const palette = ["#3794ff", "#89d185", "#b180d7", "#cca700", "#d18616", "#f14c4c", "#00bcd4", "#9c27b0"];
      let svgContent = "";
      
      for (const [vPort, target] of Object.entries(state.topology.bindings)) {
          if (!target || !target.boardId) continue;
          
          const start = getPortPosition(vPort, vPort, true);
          const end = getPortPosition(target.boardId, target.boardPort, false);
          
          const vIdx = vPorts.indexOf(vPort);
          const color = vIdx === -1 ? "#888" : palette[vIdx % palette.length];

          // Bezier Curve
          const cp1 = { x: start.x + 50, y: start.y };
          const cp2 = { x: end.x - 50,  y: end.y };
          
          const d = "M " + start.x + " " + start.y + " C " + cp1.x + " " + cp1.y + ", " + cp2.x + " " + cp2.y + ", " + end.x + " " + end.y;
          
          svgContent += '<path d="' + d + '" class="connection-line" style="--line-color: ' + color + '"' + 
                ' data-vport="' + escapeAttr(vPort) + '"' +
                ' onclick="removeBinding(\\\'' + escapeAttr(vPort) + '\\\')"' +
            '><title>Click to remove binding</title></path>';
      }
      
      // If dragging a line
      if (state.drag && state.drag.type === "line" && state.drag.startNode) {
         const startPos = getPortPosition(state.drag.startNode, state.drag.startPort, state.drag.isVirtual);
         const endX = state.drag.currentX; 
         const endY = state.drag.currentY;
         const d = "M " + startPos.x + " " + startPos.y + " L " + endX + " " + endY;
         svgContent += '<path d="' + d + '" class="connection-line draft" />';
      }

      connectionsContainer.innerHTML = svgContent;
    }

    // Expose for onclick
    window.removeBinding = function(vPort) {
        if (state.topology.bindings[vPort]) {
            delete state.topology.bindings[vPort];
            renderTopologyVisual();
        }
    };


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
        if (board.deviceTemplateId) {
          lines.push("    deviceTemplate: " + scalar(board.deviceTemplateId));
        }
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
              deviceTemplateId: "",
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
            currentInstance = { id: "", deviceTemplate: "", driver: "", device: "", resource: "", cardIndex: "" };
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
          } else if (key === "deviceTemplate") {
            currentInstance.deviceTemplate = value;
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
        board.deviceTemplateId = instance.deviceTemplate || board.deviceTemplateId || "";
      }

      state.topology.virtualPorts = virtualPorts.length > 0 ? virtualPorts : ["vna-port1", "vna-port2"];
      state.topology.boards = boards.length > 0 ? boards : [
        {
          id: "card1",
          kind: "board",
          portsCsv: "p1,p2",
          deviceTemplateId: "dev-pxi-0",
          driver: "pxi",
          device: "pxi-mock-0",
          resource: "dev0",
          cardIndex: "1",
          detail: "",
        },
      ];
      state.topology.bindings = bindings;
      sanitizeBindings();
      syncDeviceRegistryFromBoards();
      renderDeviceManager();
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

    // --- Topology Canvas Interaction ---
    const canvasContainer = document.getElementById("topologyCanvasContainer");
    
    canvasContainer.addEventListener("mousedown", (e) => {
        const target = e.target;
        if (!target) return;
        
        // 1. Drag Node (Header)
        const header = target.closest(".t-node-header");
        if (header) {
            const removeBtn = target.closest('[data-action="delete-vp"]');
            if (removeBtn) return; // Don't drag if clicking remove

            const node = header.closest(".t-node");
            const id = node.getAttribute("data-id");
            if (!state.topology.layout[id]) return;

            const box = node.getBoundingClientRect();
            const cBox = canvasContainer.getBoundingClientRect();
            
            state.drag = {
                active: true,
                type: "node",
                id: id,
                moved: false,
                startX: e.clientX,
                startY: e.clientY,
                offsetX: e.clientX - box.left,
                offsetY: e.clientY - box.top,
                cLeft: cBox.left,
                cTop: cBox.top
            };
            return;
        }

        // 2. Drag Connection (Port)
        const portPoint = target.closest(".t-port-point");
        if (portPoint) {
            const portName = portPoint.getAttribute("data-port");
            const nodeId = portPoint.getAttribute("data-node");
            const isVirtual = portPoint.closest(".t-node").classList.contains("virtual");
            
            // We only support dragging form Virtual Port -> Board Port for binding creation
            if (!isVirtual) return;

            const cBox = canvasContainer.getBoundingClientRect();
            state.drag = {
                active: true,
                type: "line",
              moved: true,
                startNode: nodeId,
                startPort: portName,
                isVirtual: true,
                cLeft: cBox.left,
                cTop: cBox.top,
                currentX: e.clientX - cBox.left,
                currentY: e.clientY - cBox.top
            };
            renderTopologyVisual(); // draw draft line
            return;
        }
    });

    window.addEventListener("mousemove", (e) => {
        if (!state.drag || !state.drag.active) return;

        if (state.drag.type === "node") {
            const dx = Math.abs(e.clientX - (state.drag.startX || 0));
            const dy = Math.abs(e.clientY - (state.drag.startY || 0));
            if (!state.drag.moved && dx < 5 && dy < 5) {
                return;
            }
            state.drag.moved = true;
            const x = e.clientX - state.drag.cLeft - state.drag.offsetX;
            const y = e.clientY - state.drag.cTop - state.drag.offsetY;
            state.topology.layout[state.drag.id] = { x, y };
            renderTopologyVisual();
        } else if (state.drag.type === "line") {
            state.drag.currentX = e.clientX - state.drag.cLeft;
            state.drag.currentY = e.clientY - state.drag.cTop;
            renderTopologyVisual();
        }
    });

    window.addEventListener("mouseup", (e) => {
        if (!state.drag || !state.drag.active) return;

      const dragType = state.drag.type;
      const dragMoved = Boolean(state.drag.moved);

        if (state.drag.type === "line") {
             // Check drop target
             const target = e.target;
             const portPoint = target ? target.closest(".t-port-point") : null;
             
             if (portPoint) {
                 const endNodeId = portPoint.getAttribute("data-node");
                 const endPortName = portPoint.getAttribute("data-port");
                 const isVirtual = portPoint.closest(".t-node").classList.contains("virtual");
                 
                 // Valid drop: From Virtual to Board (non-virtual)
                 if (!isVirtual && state.drag.isVirtual) {
                     const vPort = state.drag.startNode;
                     state.topology.bindings[vPort] = {
                         boardId: endNodeId,
                         boardPort: endPortName
                     };
                 }
             }
        }
        
        state.drag = { active: false };
        if (dragType === "line" || dragMoved) {
          renderTopologyVisual();
        }
    });

    canvasContainer.addEventListener("click", (e) => {
        const target = e.target;
        if (!(target instanceof HTMLElement)) return;
        
        // Handle expand toggle
        const toggleBtn = target.closest('[data-action="toggle-expand"]');
        if (toggleBtn) {
             const boardId = toggleBtn.getAttribute("data-id");
             if (state.expandedBoards.has(boardId)) {
                 state.expandedBoards.delete(boardId);
             } else {
                 state.expandedBoards.add(boardId);
             }
             renderTopologyVisual();
             e.stopPropagation(); // prevent other clicks
             return;
        }

        if (target.getAttribute("data-action") === "delete-vp") {
            const vPort = target.closest(".t-node").getAttribute("data-id");
            state.topology.virtualPorts = state.topology.virtualPorts.filter(p => p !== vPort);
            delete state.topology.bindings[vPort];
            renderTopologyVisual();
        }
    });

    canvasContainer.addEventListener("dblclick", (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      const label = target.closest('[data-action="toggle-expand-label"]');
      if (!label) {
        return;
      }
      const boardId = label.getAttribute("data-id") || "";
      if (!boardId) {
        return;
      }
      if (state.expandedBoards.has(boardId)) {
        state.expandedBoards.delete(boardId);
      } else {
        state.expandedBoards.add(boardId);
      }
      renderTopologyVisual();
      e.preventDefault();
      e.stopPropagation();
    });

    canvasContainer.addEventListener("input", (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      const boardId = target.getAttribute("data-board-id") || "";
      if (!boardId) {
        return;
      }
      const board = state.topology.boards.find((item) => item.id === boardId);
      if (!board) {
        return;
      }
      const action = target.getAttribute("data-action");
      if (!action) {
        return;
      }
      if (action === "board-driver") {
        board.deviceTemplateId = "";
        board.driver = String(target.value || "").trim();
      } else if (action === "board-device") {
        board.deviceTemplateId = "";
        board.device = String(target.value || "").trim();
      } else if (action === "board-resource") {
        board.deviceTemplateId = "";
        board.resource = String(target.value || "").trim();
      } else if (action === "board-card-index") {
        board.cardIndex = String(target.value || "").trim();
      } else if (action === "board-detail") {
        board.detail = String(target.value || "").trim();
      }
    });

    canvasContainer.addEventListener("change", (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      const action = target.getAttribute("data-action");
      if (action !== "board-device-template") {
        return;
      }
      const boardId = target.getAttribute("data-board-id") || "";
      const selectedDeviceId = String(target.value || "");
      if (!boardId) {
        return;
      }
      const board = state.topology.boards.find((item) => item.id === boardId);
      if (!board) {
        return;
      }
      if (!selectedDeviceId) {
        board.deviceTemplateId = "";
        renderTopologyVisual();
        return;
      }
      if (!applyDeviceTemplateToBoard(board, selectedDeviceId)) {
        return;
      }
      renderTopologyVisual();
    });

    document.getElementById("btnAutoLayout").addEventListener("click", () => {
         state.topology.layout = {}; // Clear layout to force re-calc
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

    document.getElementById("btnAddVirtualPort").addEventListener("click", async () => {
      syncBoardsFromDom();
      const name = await openModal({
        title: "添加虚拟端口",
        body: "请输入虚拟端口名称",
        inputLabel: "Port Name",
        inputValue: "vna-port" + (state.topology.virtualPorts.length + 1)
      });
      if (name && !state.topology.virtualPorts.includes(name)) {
        state.topology.virtualPorts.push(name);
        renderTopologyVisual();
      }
    });

    document.getElementById("btnAddBoard").addEventListener("click", () => {
      syncBoardsFromDom();
      const preferred = state.deviceRegistry[0] || null;
      state.topology.boards.push({
        id: "card" + String(state.topology.boards.length + 1),
        kind: "board",
        portsCsv: "p1,p2",
        deviceTemplateId: preferred ? preferred.id : "",
        driver: preferred ? preferred.driver : "pxi",
        device: preferred ? preferred.device : ("pxi-mock-" + String(state.topology.boards.length)),
        resource: preferred ? preferred.resource : ("dev" + String(state.topology.boards.length)),
        cardIndex: String(state.topology.boards.length + 1),
        detail: "",
      });
      renderTopologyVisual();
    });

    btnAddDevice.addEventListener("click", () => {
      const index = state.deviceRegistry.length + 1;
      state.deviceRegistry.push({
        id: "device-" + String(index),
        type: "virtual",
        driver: "virtual",
        device: "virtual-device-" + String(index),
        resource: "virt://device/" + String(index),
      });
      renderTopologyVisual();
      setStatus("已新增设备，可在设备管理器中继续编辑。");
    });

    deviceManagerRows.addEventListener("input", (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      const row = target.closest(".device-row");
      if (!row) {
        return;
      }
      const originalId = row.getAttribute("data-device-id") || "";
      const field = target.getAttribute("data-field") || "";
      if (!originalId || !field) {
        return;
      }
      const device = state.deviceRegistry.find((item) => item.id === originalId);
      if (!device) {
        return;
      }
      const nextValue = String(target.value || "").trim();
      if (field === "id") {
        if (!nextValue || state.deviceRegistry.some((item) => item.id === nextValue && item !== device)) {
          return;
        }
        const previousId = device.id;
        device.id = nextValue;
        for (const board of state.topology.boards) {
          if (board.deviceTemplateId === previousId) {
            board.deviceTemplateId = nextValue;
          }
        }
        row.setAttribute("data-device-id", nextValue);
      } else if (field === "type") {
        device.type = nextValue === "virtual" ? "virtual" : "physical";
        if (device.type === "virtual" && !device.driver) {
          device.driver = "virtual";
        }
      } else if (field === "driver") {
        device.driver = nextValue;
      } else if (field === "device") {
        device.device = nextValue;
      } else if (field === "resource") {
        device.resource = nextValue;
      }
      syncBoardsBoundToDevice(device.id);
      renderTopologyVisual();
    });

    deviceManagerRows.addEventListener("click", (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      if (target.getAttribute("data-action") !== "delete-device") {
        return;
      }
      const row = target.closest(".device-row");
      const deviceId = row ? row.getAttribute("data-device-id") : "";
      if (!deviceId) {
        return;
      }
      for (const board of state.topology.boards) {
        if (board.deviceTemplateId === deviceId) {
          board.deviceTemplateId = "";
        }
      }
      state.deviceRegistry = state.deviceRegistry.filter((item) => item.id !== deviceId);
      renderTopologyVisual();
    });

    // Old auto-bind button removed
    // document.getElementById("btnAutoBind").addEventListener("click", () => { ... });

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

  syncDeviceRegistryFromBoards();
  renderDeviceManager();
    renderTopologyVisual();
    setTopologyMode("visual");

    post("app-init", {});
  </script>
</body>
</html>`;
}
