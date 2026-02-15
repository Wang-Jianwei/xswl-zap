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
          <button data-action="open-visual-topology" class="secondary">打开可视化拓扑编辑器</button>
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
          <h3>拓扑 YAML</h3>
          <div class="line"><textarea id="topologyYaml" placeholder="在这里查看或编辑当前工作区拓扑 YAML"></textarea></div>
          <div class="actions">
            <button id="btnTopologyLoad">从工作区加载</button>
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
    const topologyYaml = document.getElementById("topologyYaml");
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
        topologyYaml: topologyYaml.value,
        activate: false,
      });
    });
    document.getElementById("btnWorkspaceSaveActivate").addEventListener("click", () => {
      post("workspace-save", {
        workspaceId: workspaceId.value.trim(),
        topologyId: topologyId.value.trim(),
        topologyYaml: topologyYaml.value,
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
        topologyYaml: topologyYaml.value,
        activate: false,
      });
    });
    document.getElementById("btnTopologySaveActivate").addEventListener("click", () => {
      post("workspace-save", {
        workspaceId: workspaceId.value.trim(),
        topologyId: topologyId.value.trim(),
        topologyYaml: topologyYaml.value,
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

    post("app-init", {});
  </script>
</body>
</html>`;
}
