import * as vscode from "vscode";

export function buildWorkspaceTopologyEditorHtml(webview: vscode.Webview, nonce: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Workspace Topology Editor</title>
  <style>
    body {
      margin: 0;
      padding: 12px;
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
    }
    .row {
      display: flex;
      gap: 8px;
      margin-bottom: 8px;
      align-items: center;
    }
    .row label {
      min-width: 120px;
      font-size: 12px;
      opacity: 0.9;
    }
    input, select, textarea, button {
      font-family: var(--vscode-font-family);
      font-size: 12px;
    }
    input, select, textarea {
      width: 100%;
      box-sizing: border-box;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      padding: 6px 8px;
    }
    textarea {
      min-height: 280px;
      resize: vertical;
      line-height: 1.35;
    }
    button {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      padding: 6px 10px;
      cursor: pointer;
      white-space: nowrap;
    }
    button.secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    .section-title {
      font-size: 12px;
      font-weight: 600;
      margin: 10px 0 6px;
      opacity: 0.92;
    }
    .mode-toggle {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 8px;
    }
    .hidden { display: none; }

    .mapping-layout {
      display: grid;
      grid-template-columns: minmax(260px, 0.9fr) 1fr;
      gap: 10px;
      margin-bottom: 10px;
    }
    .panel {
      border: 1px solid var(--vscode-editorWidget-border, var(--vscode-panel-border));
      border-radius: 4px;
      padding: 8px;
      background: color-mix(in srgb, var(--vscode-editor-background) 95%, var(--vscode-sideBar-background) 5%);
    }
    .chip-list {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: 1px solid var(--vscode-input-border);
      background: var(--vscode-input-background);
      border-radius: 999px;
      padding: 4px 8px;
      font-size: 11px;
      user-select: none;
    }
    .chip.bound {
      border-color: var(--vscode-charts-blue);
    }
    .chip[draggable="true"] {
      cursor: grab;
    }
    .tiny-btn {
      border: none;
      border-radius: 10px;
      padding: 0 6px;
      font-size: 11px;
      line-height: 16px;
      height: 16px;
      cursor: pointer;
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    .muted {
      font-size: 11px;
      opacity: 0.72;
    }
    .diagram {
      white-space: pre-wrap;
      font-size: 11px;
      opacity: 0.86;
      line-height: 1.4;
    }

    .cards {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 8px;
    }
    .card {
      border: 1px solid var(--vscode-editorWidget-border, var(--vscode-panel-border));
      border-radius: 4px;
      padding: 8px;
      background: color-mix(in srgb, var(--vscode-editor-background) 92%, var(--vscode-sideBar-background) 8%);
    }
    .card-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .card-title {
      font-size: 12px;
      font-weight: 600;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }
    .field > label {
      font-size: 11px;
      opacity: 0.85;
    }
    .full { grid-column: 1 / span 2; }

    .port-slot-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .port-slot {
      border: 1px dashed var(--vscode-input-border);
      border-radius: 4px;
      padding: 6px;
      background: color-mix(in srgb, var(--vscode-editor-background) 95%, var(--vscode-sideBar-background) 5%);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      min-height: 30px;
    }
    .port-slot.active {
      border-color: var(--vscode-button-background);
      background: color-mix(in srgb, var(--vscode-button-background) 15%, var(--vscode-editor-background) 85%);
    }
    .slot-left {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      min-width: 0;
    }

    .hint {
      margin-top: 8px;
      font-size: 12px;
      opacity: 0.85;
      white-space: pre-wrap;
    }
  </style>
</head>
<body>
  <div class="row">
    <label for="workspaceSelect">Workspace</label>
    <select id="workspaceSelect"></select>
    <button id="reloadBtn" class="secondary">Reload</button>
  </div>

  <div class="row">
    <label for="workspaceId">Workspace ID</label>
    <input id="workspaceId" placeholder="workspace-dev" />
  </div>

  <div class="row">
    <label for="topologyId">Topology ID (可选)</label>
    <select id="topologyId"></select>
  </div>

  <div class="mode-toggle">
    <button id="visualModeBtn">Visual Mode</button>
    <button id="yamlModeBtn" class="secondary">YAML Mode (advanced)</button>
    <button id="addCardBtn" class="secondary">+ Add Board Card</button>
    <button id="autoAssignBtn" class="secondary">Auto Assign</button>
    <select id="selectedCardSelect" style="max-width:180px;"></select>
    <button id="assignSelectedBtn" class="secondary">Assign To Selected</button>
    <button id="clearAssignBtn" class="secondary">Clear Assignments</button>
  </div>

  <div id="visualSection">
    <div class="section-title">Virtual VNA Ports ↔ Board Ports Binding</div>
    <div class="mapping-layout">
      <div class="panel">
        <div class="row" style="margin-bottom:8px;">
          <input id="newVirtualPortInput" placeholder="virtual vna port, e.g. vna-port3" />
          <button id="addVirtualPortBtn" class="secondary">+ Virtual Port</button>
        </div>
        <div id="virtualPortPool" class="chip-list"></div>
        <div class="muted" style="margin-top:8px;">Drag virtual ports to board port slots on cards.</div>
      </div>
      <div class="panel">
        <div class="section-title" style="margin-top:0;">Binding Preview</div>
        <div id="bindingPreview" class="diagram"></div>
      </div>
    </div>

    <div class="section-title">VNA Boards (board can also be virtual-vna)</div>
    <div id="cards" class="cards"></div>
  </div>

  <div id="yamlSection" class="hidden">
    <div class="section-title">Raw Topology YAML (advanced)</div>
    <textarea id="topologyYaml" spellcheck="false" placeholder="virtual_vna:\n  ports:\n    - vna-port1\nboards:\n  - id: card1\n    kind: board\n    ports:\n      - p1\nbindings:\n  - vna_port: vna-port1\n    board_id: card1\n    board_port: p1\ninstances:\n  - id: card1\n    driver: pxi\n    device: pxi-mock-0\n    resource: dev0"></textarea>
  </div>

  <div class="row">
    <button id="loadBtn" class="secondary">Load Workspace</button>
    <button id="saveBtn">Save Topology</button>
    <button id="saveActivateBtn">Save + Activate</button>
    <button id="activateBtn" class="secondary">Set Active</button>
    <button id="applyAdviceBtn" class="secondary" disabled>执行建议动作</button>
    <button id="copyDiagBtn" class="secondary" disabled>复制冲突摘要</button>
    <button id="copyDiagJsonBtn" class="secondary" disabled>复制JSON摘要</button>
  </div>

  <div id="hint" class="hint">Ready.</div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const workspaceSelect = document.getElementById('workspaceSelect');
    const workspaceIdInput = document.getElementById('workspaceId');
    const topologyIdInput = document.getElementById('topologyId');
    const topologyYamlInput = document.getElementById('topologyYaml');
    const visualSection = document.getElementById('visualSection');
    const yamlSection = document.getElementById('yamlSection');
    const cardsContainer = document.getElementById('cards');
    const hint = document.getElementById('hint');

    const visualModeBtn = document.getElementById('visualModeBtn');
    const yamlModeBtn = document.getElementById('yamlModeBtn');
    const addCardBtn = document.getElementById('addCardBtn');
    const autoAssignBtn = document.getElementById('autoAssignBtn');
    const selectedCardSelect = document.getElementById('selectedCardSelect');
    const assignSelectedBtn = document.getElementById('assignSelectedBtn');
    const clearAssignBtn = document.getElementById('clearAssignBtn');

    const newVirtualPortInput = document.getElementById('newVirtualPortInput');
    const addVirtualPortBtn = document.getElementById('addVirtualPortBtn');
    const virtualPortPool = document.getElementById('virtualPortPool');
    const bindingPreview = document.getElementById('bindingPreview');
    const applyAdviceBtn = document.getElementById('applyAdviceBtn');
    const copyDiagBtn = document.getElementById('copyDiagBtn');
    const copyDiagJsonBtn = document.getElementById('copyDiagJsonBtn');

    let visualMode = true;
    let cards = [];
    let virtualPorts = [];
    let bindings = {};
    let draggingVirtualPort = '';
    let lastDiagnosticSummary = '';
    let lastDiagnosticPayload = null;
    let lastDiagnosticSelectors = [];

    function escapeHtml(value) {
      return String(value || '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
    }

    function dequote(value) {
      const text = String(value || '').trim();
      if (text.length >= 2 && text.startsWith("'") && text.endsWith("'")) {
        return text.substring(1, text.length - 1).replaceAll("''", "'");
      }
      if (text.length >= 2 && text.startsWith('"') && text.endsWith('"')) {
        return text.substring(1, text.length - 1);
      }
      return text;
    }

    function scalar(text) {
      const raw = String(text || '');
      if (raw.length === 0) {
        return "''";
      }
      const safePattern = /^[A-Za-z0-9._/-]+$/;
      if (safePattern.test(raw)) {
        return raw;
      }
      return '\'' + raw.replaceAll('\'', '\'\'') + '\'';
    }

    function parseCsv(value) {
      return String(value || '')
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
    }

    function createCard(seed) {
      const card = seed || {};
      return {
        id: String(card.id || ''),
        driver: String(card.driver || ''),
        device: String(card.device || ''),
        resource: String(card.resource || ''),
        cardIndex: String(card.cardIndex || ''),
        boardKind: String(card.boardKind || 'board'),
        boardPortsCsv: String(card.boardPortsCsv || 'p1,p2'),
        detail: String(card.detail || ''),
      };
    }

    function getBoardPorts(card) {
      return parseCsv(card.boardPortsCsv);
    }

    function getBindingForEndpoint(cardIndex, boardPort) {
      for (const vPort of virtualPorts) {
        const b = bindings[vPort];
        if (b && b.cardIndex === cardIndex && b.boardPort === boardPort) {
          return vPort;
        }
      }
      return '';
    }

    function setHint(text) {
      hint.textContent = text;
    }

    function formatDateTime(ms) {
      const value = Number(ms || 0);
      if (!Number.isFinite(value) || value <= 0) {
        return '-';
      }
      return new Date(value).toLocaleString();
    }

    async function copyTextToClipboard(text) {
      const content = String(text || '');
      if (!content) {
        return false;
      }
      try {
        if (navigator && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
          await navigator.clipboard.writeText(content);
          return true;
        }
      } catch {
      }

      const textarea = document.createElement('textarea');
      textarea.value = content;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      let copied = false;
      try {
        copied = document.execCommand('copy');
      } catch {
        copied = false;
      }
      document.body.removeChild(textarea);
      return copied;
    }

    function updateDiagnosticSummary(summary) {
      lastDiagnosticSummary = String(summary || '').trim();
      if (copyDiagBtn) {
        copyDiagBtn.disabled = lastDiagnosticSummary.length === 0;
      }
    }

    function updateDiagnosticPayload(payload) {
      lastDiagnosticPayload = payload && typeof payload === 'object' ? payload : null;
      if (copyDiagJsonBtn) {
        copyDiagJsonBtn.disabled = !lastDiagnosticPayload;
      }
      if (applyAdviceBtn) {
        const advice = lastDiagnosticPayload && lastDiagnosticPayload.retryAdvice
          ? String(lastDiagnosticPayload.retryAdvice.recommendation || '')
          : '';
        applyAdviceBtn.disabled = !advice;
      }
    }

    function updateDiagnosticSelectors(selectors) {
      const items = Array.isArray(selectors) ? selectors : [];
      lastDiagnosticSelectors = items
        .map((item) => ({
          type: Number(item && item.type ? item.type : 1),
          resourceId: String(item && item.resourceId ? item.resourceId : '').trim(),
        }))
        .filter((item) => item.resourceId.length > 0);
    }

    function applyRetryAdvice() {
      const payload = lastDiagnosticPayload;
      const recommendation = payload && payload.retryAdvice
        ? String(payload.retryAdvice.recommendation || '')
        : '';

      if (recommendation === 'retry-save') {
        const s = state();
        vscode.postMessage({ type: 'workspace-save', ...s, activate: false });
        setHint('建议已执行：正在重试保存...');
        return;
      }

      if (recommendation === 'fix-topology') {
        setMode(false);
        setHint('建议已执行：已切换到 YAML 模式，请先修复拓扑错误。');
        return;
      }

      if (recommendation === 'contact-holder' || recommendation === 'switch-readonly') {
        const s = state();
        const selectors = lastDiagnosticSelectors.length > 0 ? lastDiagnosticSelectors : [];
        vscode.postMessage({
          type: 'workspace-lock-snapshot',
          workspaceId: s.workspaceId,
          topologyYaml: s.topologyYaml,
          selectors,
        });
        setHint('建议已执行：已刷新锁快照，请确认占用方后再重试。');
        return;
      }

      setHint('暂无可执行的建议动作。');
    }

    function refreshSelectedCardOptions() {
      selectedCardSelect.innerHTML = '';
      if (cards.length === 0) {
        const opt = document.createElement('option');
        opt.value = '-1';
        opt.textContent = 'No card';
        selectedCardSelect.appendChild(opt);
        return;
      }
      for (let i = 0; i < cards.length; i += 1) {
        const opt = document.createElement('option');
        opt.value = String(i);
        opt.textContent = 'Card ' + String(i + 1) + ' (' + (cards[i].id || 'id?') + ')';
        selectedCardSelect.appendChild(opt);
      }
    }

    function syncFromCards() {
      const nodes = cardsContainer.querySelectorAll('.card');
      const next = [];
      for (const node of nodes) {
        next.push(createCard({
          id: node.querySelector('.field-id input').value,
          driver: node.querySelector('.field-driver input').value,
          device: node.querySelector('.field-device input').value,
          resource: node.querySelector('.field-resource input').value,
          cardIndex: node.querySelector('.field-card-index input').value,
          boardKind: node.querySelector('.field-kind select').value,
          boardPortsCsv: node.querySelector('.field-board-ports input').value,
          detail: node.querySelector('.field-detail input').value,
        }));
      }
      cards = next;
    }

    function sanitizeBindings() {
      const validVirtualPorts = new Set(virtualPorts);
      const next = {};
      for (const vPort of virtualPorts) {
        const b = bindings[vPort];
        if (!b) {
          continue;
        }
        if (typeof b.cardIndex !== 'number' || b.cardIndex < 0 || b.cardIndex >= cards.length) {
          continue;
        }
        const boardPorts = getBoardPorts(cards[b.cardIndex]);
        if (!boardPorts.includes(String(b.boardPort || ''))) {
          continue;
        }
        next[vPort] = { cardIndex: b.cardIndex, boardPort: String(b.boardPort) };
      }
      bindings = next;
    }

    function renderVirtualPortPool() {
      virtualPortPool.innerHTML = '';
      for (const vPort of virtualPorts) {
        const b = bindings[vPort];
        const boundText = b ? ' → Card' + String(b.cardIndex + 1) + '.' + b.boardPort : '';
        const chip = document.createElement('div');
        chip.className = 'chip' + (b ? ' bound' : '');
        chip.setAttribute('draggable', 'true');
        chip.setAttribute('data-vport', vPort);
        chip.innerHTML =
          '<span>' + escapeHtml(vPort + boundText) + '</span>' +
          '<button class="tiny-btn remove-vport" data-vport="' + escapeHtml(vPort) + '">×</button>';
        virtualPortPool.appendChild(chip);
      }

      for (const chip of virtualPortPool.querySelectorAll('.chip')) {
        chip.addEventListener('dragstart', (event) => {
          const vPort = chip.getAttribute('data-vport') || '';
          draggingVirtualPort = vPort;
          if (event.dataTransfer) {
            event.dataTransfer.setData('text/plain', vPort);
            event.dataTransfer.effectAllowed = 'move';
          }
        });
      }

      for (const btn of virtualPortPool.querySelectorAll('.remove-vport')) {
        btn.addEventListener('click', (event) => {
          event.preventDefault();
          const vPort = btn.getAttribute('data-vport') || '';
          virtualPorts = virtualPorts.filter((item) => item !== vPort);
          delete bindings[vPort];
          renderVisual();
          setHint('Removed virtual port: ' + vPort);
        });
      }
    }

    function renderBindingPreview() {
      const lines = ['------------------------------'];
      for (const vPort of virtualPorts) {
        const b = bindings[vPort];
        if (!b) {
          lines.push(vPort + ' -> (unbound)');
          continue;
        }
        const card = cards[b.cardIndex];
        const cardTag = 'Card' + String(b.cardIndex + 1) + '(' + (card ? card.id : 'id?') + ')';
        lines.push(vPort + ' -> ' + cardTag + '.' + b.boardPort);
      }
      lines.push('------------------------------');
      bindingPreview.textContent = lines.join('\n');
    }

    function bindPortSlotEvents() {
      for (const slot of cardsContainer.querySelectorAll('.port-slot')) {
        slot.addEventListener('dragover', (event) => {
          event.preventDefault();
          slot.classList.add('active');
        });
        slot.addEventListener('dragleave', () => {
          slot.classList.remove('active');
        });
        slot.addEventListener('drop', (event) => {
          event.preventDefault();
          slot.classList.remove('active');
          const cardIndex = Number(slot.getAttribute('data-card-index') || '-1');
          const boardPort = String(slot.getAttribute('data-board-port') || '');
          const vPort = (event.dataTransfer && event.dataTransfer.getData('text/plain')) || draggingVirtualPort;
          if (cardIndex < 0 || !boardPort || !vPort) {
            return;
          }
          bindings[vPort] = { cardIndex, boardPort };
          renderVisual();
          setHint('Bound ' + vPort + ' -> Card' + String(cardIndex + 1) + '.' + boardPort);
        });
      }

      for (const btn of cardsContainer.querySelectorAll('.unbind-vport')) {
        btn.addEventListener('click', () => {
          const vPort = btn.getAttribute('data-vport') || '';
          delete bindings[vPort];
          renderVisual();
          setHint('Unbound ' + vPort);
        });
      }

      for (const button of cardsContainer.querySelectorAll('.remove-card')) {
        button.addEventListener('click', () => {
          const index = Number(button.getAttribute('data-index') || '-1');
          if (index < 0 || index >= cards.length) {
            return;
          }
          cards.splice(index, 1);
          const next = {};
          for (const vPort of virtualPorts) {
            const b = bindings[vPort];
            if (!b) {
              continue;
            }
            if (b.cardIndex === index) {
              continue;
            }
            next[vPort] = {
              cardIndex: b.cardIndex > index ? b.cardIndex - 1 : b.cardIndex,
              boardPort: b.boardPort,
            };
          }
          bindings = next;
          if (cards.length === 0) {
            cards.push(createCard({ id: 'card1', driver: 'pxi', device: 'pxi-mock-0', resource: 'dev0', cardIndex: '1' }));
          }
          renderVisual();
        });
      }
    }

    function renderCards() {
      cardsContainer.innerHTML = '';
      for (let index = 0; index < cards.length; index += 1) {
        const card = cards[index];
        const boardPorts = getBoardPorts(card);

        const slotHtml = boardPorts.length > 0
          ? boardPorts.map((boardPort) => {
              const boundVPort = getBindingForEndpoint(index, boardPort);
              const right = boundVPort
                ? '<span class="chip bound">' + escapeHtml(boundVPort) + ' <button class="tiny-btn unbind-vport" data-vport="' + escapeHtml(boundVPort) + '">×</button></span>'
                : '<span class="muted">Drop virtual port here</span>';
              return '<div class="port-slot" data-card-index="' + String(index) + '" data-board-port="' + escapeHtml(boardPort) + '">' +
                '<span class="slot-left"><strong>' + escapeHtml(boardPort) + '</strong><span class="muted">board port</span></span>' +
                right +
              '</div>';
            }).join('')
          : '<div class="muted">Define board ports first (comma-separated).</div>';

        const wrapper = document.createElement('div');
        wrapper.className = 'card';
        wrapper.innerHTML =
          '<div class="card-head">' +
            '<div class="card-title">Card ' + String(index + 1) + '</div>' +
            '<button class="secondary remove-card" data-index="' + String(index) + '">Remove</button>' +
          '</div>' +
          '<div class="grid">' +
            '<div class="field field-id"><label>Board ID</label><input value="' + escapeHtml(card.id) + '" placeholder="card1" /></div>' +
            '<div class="field field-card-index"><label>Card Index</label><input value="' + escapeHtml(card.cardIndex) + '" placeholder="1" /></div>' +
            '<div class="field field-kind"><label>Board Kind</label>' +
              '<select>' +
                '<option value="board"' + (card.boardKind === 'board' ? ' selected' : '') + '>board</option>' +
                '<option value="virtual-vna"' + (card.boardKind === 'virtual-vna' ? ' selected' : '') + '>virtual-vna</option>' +
              '</select>' +
            '</div>' +
            '<div class="field field-driver"><label>Driver</label><input value="' + escapeHtml(card.driver) + '" placeholder="pxi" /></div>' +
            '<div class="field field-device"><label>Device</label><input value="' + escapeHtml(card.device) + '" placeholder="pxi-mock-0" /></div>' +
            '<div class="field field-resource"><label>Resource</label><input value="' + escapeHtml(card.resource) + '" placeholder="dev0" /></div>' +
            '<div class="field full field-board-ports"><label>Board Ports (comma-separated)</label><input value="' + escapeHtml(card.boardPortsCsv) + '" placeholder="p1,p2,p3" /></div>' +
            '<div class="field full"><label>Bindings (virtual port -> board port)</label><div class="port-slot-list">' + slotHtml + '</div></div>' +
            '<div class="field full field-detail"><label>Detail</label><input value="' + escapeHtml(card.detail) + '" placeholder="detail..." /></div>' +
          '</div>';

        cardsContainer.appendChild(wrapper);
      }

      bindPortSlotEvents();
    }

    function renderVisual() {
      syncFromCards();
      sanitizeBindings();
      refreshSelectedCardOptions();
      renderCards();
      renderVirtualPortPool();
      renderBindingPreview();
    }

    function parseFromYaml(yamlText) {
      const text = String(yamlText || '');
      const lines = text.split(/\r?\n/);

      const parsedCards = [];
      const parsedVirtualPorts = [];
      const parsedBindings = {};

      let section = '';
      let inVirtualPorts = false;
      let inBoardPorts = false;
      let inBindingItem = false;
      let currentBoard = null;
      let currentBinding = null;
      let currentInstance = null;

      function flushBoard() {
        if (currentBoard) {
          parsedCards.push(createCard(currentBoard));
          currentBoard = null;
        }
      }

      function flushBinding() {
        if (currentBinding && currentBinding.vnaPort && currentBinding.boardId && currentBinding.boardPort) {
          parsedBindings[currentBinding.vnaPort] = {
            boardId: currentBinding.boardId,
            boardPort: currentBinding.boardPort,
          };
        }
        currentBinding = null;
      }

      function flushInstance() {
        if (!currentInstance) {
          return;
        }
        if (!currentInstance.id) {
          currentInstance = null;
          return;
        }

        const existing = parsedCards.find((c) => c.id === currentInstance.id);
        if (existing) {
          existing.driver = currentInstance.driver || existing.driver;
          existing.device = currentInstance.device || existing.device;
          existing.resource = currentInstance.resource || existing.resource;
          existing.cardIndex = currentInstance.cardIndex || existing.cardIndex;
        } else {
          parsedCards.push(createCard(currentInstance));
        }
        currentInstance = null;
      }

      for (let i = 0; i < lines.length; i += 1) {
        const raw = lines[i];
        const trim = raw.trim();
        if (!trim || trim.startsWith('#')) {
          continue;
        }

        if (trim === 'virtual_vna:' || trim === 'virtualVna:') {
          flushBoard();
          flushBinding();
          flushInstance();
          section = 'virtual';
          inVirtualPorts = false;
          continue;
        }
        if (trim === 'boards:') {
          flushBoard();
          flushBinding();
          flushInstance();
          section = 'boards';
          inBoardPorts = false;
          continue;
        }
        if (trim === 'bindings:') {
          flushBoard();
          flushBinding();
          flushInstance();
          section = 'bindings';
          inBindingItem = false;
          continue;
        }
        if (trim === 'instances:') {
          flushBoard();
          flushBinding();
          flushInstance();
          section = 'instances';
          continue;
        }

        if (section === 'virtual') {
          if (trim === 'ports:') {
            inVirtualPorts = true;
            continue;
          }
          if (inVirtualPorts && trim.startsWith('- ')) {
            parsedVirtualPorts.push(dequote(trim.substring(2).trim()));
            continue;
          }
        }

        if (section === 'boards') {
          if (trim.startsWith('- ')) {
            flushBoard();
            inBoardPorts = false;
            currentBoard = createCard({});
            const inline = trim.substring(2).trim();
            if (inline.startsWith('id:')) {
              currentBoard.id = dequote(inline.substring(3).trim());
            }
            continue;
          }
          if (!currentBoard) {
            continue;
          }
          const kvPos = trim.indexOf(':');
          if (kvPos < 0) {
            continue;
          }
          const key = trim.substring(0, kvPos).trim();
          const val = dequote(trim.substring(kvPos + 1).trim());
          if (key === 'id') {
            currentBoard.id = val;
          } else if (key === 'kind') {
            currentBoard.boardKind = val || 'board';
          } else if (key === 'ports') {
            inBoardPorts = true;
          } else if (key === 'detail') {
            currentBoard.detail = val;
          }

          if (inBoardPorts && trim.startsWith('- ')) {
            const p = dequote(trim.substring(2).trim());
            const merged = parseCsv(currentBoard.boardPortsCsv);
            if (!merged.includes(p)) {
              merged.push(p);
            }
            currentBoard.boardPortsCsv = merged.join(',');
          }
          continue;
        }

        if (section === 'bindings') {
          if (trim.startsWith('- ')) {
            flushBinding();
            inBindingItem = true;
            currentBinding = { vnaPort: '', boardId: '', boardPort: '' };
            const inline = trim.substring(2).trim();
            if (inline.startsWith('vna_port:')) {
              currentBinding.vnaPort = dequote(inline.substring('vna_port:'.length).trim());
            }
            continue;
          }
          if (!inBindingItem || !currentBinding) {
            continue;
          }
          const kvPos = trim.indexOf(':');
          if (kvPos < 0) {
            continue;
          }
          const key = trim.substring(0, kvPos).trim();
          const val = dequote(trim.substring(kvPos + 1).trim());
          if (key === 'vna_port') {
            currentBinding.vnaPort = val;
          } else if (key === 'board_id') {
            currentBinding.boardId = val;
          } else if (key === 'board_port') {
            currentBinding.boardPort = val;
          }
          continue;
        }

        if (section === 'instances') {
          if (trim.startsWith('- ')) {
            flushInstance();
            currentInstance = { id: '', driver: '', device: '', resource: '', cardIndex: '', boardKind: 'board', boardPortsCsv: '', detail: '' };
            const inline = trim.substring(2).trim();
            if (inline.startsWith('id:')) {
              currentInstance.id = dequote(inline.substring(3).trim());
            }
            continue;
          }
          if (!currentInstance) {
            continue;
          }
          const kvPos = trim.indexOf(':');
          if (kvPos < 0) {
            continue;
          }
          const key = trim.substring(0, kvPos).trim();
          const val = dequote(trim.substring(kvPos + 1).trim());
          if (key === 'id') {
            currentInstance.id = val;
          } else if (key === 'driver') {
            currentInstance.driver = val;
          } else if (key === 'device') {
            currentInstance.device = val;
          } else if (key === 'resource') {
            currentInstance.resource = val;
          } else if (key === 'cardIndex') {
            currentInstance.cardIndex = val;
          }
          continue;
        }
      }

      flushBoard();
      flushBinding();
      flushInstance();

      if (parsedCards.length === 0) {
        parsedCards.push(createCard({ id: 'card1', driver: 'pxi', device: 'pxi-mock-0', resource: 'dev0', cardIndex: '1', boardKind: 'board', boardPortsCsv: 'p1,p2' }));
      }

      const nextVirtualPorts = parsedVirtualPorts.length > 0 ? parsedVirtualPorts : ['vna-port1', 'vna-port2'];

      const boardIdToIndex = {};
      for (let i = 0; i < parsedCards.length; i += 1) {
        boardIdToIndex[parsedCards[i].id] = i;
      }

      const nextBindings = {};
      for (const vPort of nextVirtualPorts) {
        const b = parsedBindings[vPort];
        if (!b) {
          continue;
        }
        const idx = boardIdToIndex[b.boardId];
        if (typeof idx !== 'number') {
          continue;
        }
        const boardPorts = getBoardPorts(parsedCards[idx]);
        if (!boardPorts.includes(b.boardPort)) {
          continue;
        }
        nextBindings[vPort] = { cardIndex: idx, boardPort: b.boardPort };
      }

      return {
        cards: parsedCards,
        virtualPorts: nextVirtualPorts,
        bindings: nextBindings,
      };
    }

    function toYamlModel() {
      const effectiveCards = visualMode ? cards : parseFromYaml(topologyYamlInput.value).cards;
      const lines = [];

      lines.push('virtual_vna:');
      lines.push('  ports:');
      for (const vPort of virtualPorts) {
        lines.push('    - ' + scalar(vPort));
      }

      lines.push('boards:');
      for (const card of effectiveCards) {
        lines.push('  - id: ' + scalar(card.id));
        lines.push('    kind: ' + scalar(card.boardKind || 'board'));
        const boardPorts = getBoardPorts(card);
        if (boardPorts.length > 0) {
          lines.push('    ports:');
          for (const p of boardPorts) {
            lines.push('      - ' + scalar(p));
          }
        }
        if (String(card.detail || '').trim().length > 0) {
          lines.push('    detail: ' + scalar(card.detail));
        }
      }

      lines.push('bindings:');
      for (const vPort of virtualPorts) {
        const b = bindings[vPort];
        if (!b) {
          continue;
        }
        const card = effectiveCards[b.cardIndex];
        if (!card) {
          continue;
        }
        lines.push('  - vna_port: ' + scalar(vPort));
        lines.push('    board_id: ' + scalar(card.id));
        lines.push('    board_port: ' + scalar(b.boardPort));
      }

      lines.push('instances:');
      for (const card of effectiveCards) {
        lines.push('  - id: ' + scalar(card.id));
        lines.push('    driver: ' + scalar(card.driver));
        lines.push('    device: ' + scalar(card.device));
        lines.push('    resource: ' + scalar(card.resource));
        if (String(card.cardIndex || '').trim().length > 0) {
          lines.push('    cardIndex: ' + scalar(card.cardIndex));
        }
      }

      return lines.join('\n');
    }

    function setMode(nextVisualMode) {
      visualMode = Boolean(nextVisualMode);
      if (visualMode) {
        const parsed = parseFromYaml(topologyYamlInput.value);
        cards = parsed.cards;
        virtualPorts = parsed.virtualPorts;
        bindings = parsed.bindings;
        renderVisual();
      } else {
        topologyYamlInput.value = toYamlModel();
      }

      visualSection.classList.toggle('hidden', !visualMode);
      yamlSection.classList.toggle('hidden', visualMode);
      visualModeBtn.classList.toggle('secondary', !visualMode);
      yamlModeBtn.classList.toggle('secondary', visualMode);
      addCardBtn.disabled = !visualMode;
      autoAssignBtn.disabled = !visualMode;
      selectedCardSelect.disabled = !visualMode;
      assignSelectedBtn.disabled = !visualMode;
      clearAssignBtn.disabled = !visualMode;
      addVirtualPortBtn.disabled = !visualMode;
      newVirtualPortInput.disabled = !visualMode;
    }

    function state() {
      if (visualMode) {
        syncFromCards();
        sanitizeBindings();
      }
      const topologyIdValue = String(topologyIdInput.value || '').trim() || 'topo-main';
      return {
        workspaceId: String(workspaceIdInput.value || '').trim(),
        topologyId: topologyIdValue,
        topologyYaml: visualMode ? toYamlModel() : String(topologyYamlInput.value || ''),
      };
    }

    function ensureTopologyOption(topologyId) {
      const value = String(topologyId || '').trim();
      if (!value) {
        return;
      }
      const exists = Array.from(topologyIdInput.options).some((opt) => String(opt.value || '') === value);
      if (!exists) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        topologyIdInput.appendChild(option);
      }
    }

    function setTopologyOptions(items, preferredTopologyId) {
      const values = new Set(['topo-main']);
      for (const item of Array.isArray(items) ? items : []) {
        const topologyId = String(item && item.topologyId ? item.topologyId : '').trim();
        if (topologyId) {
          values.add(topologyId);
        }
      }

      const previousValue = String(topologyIdInput.value || '').trim();
      topologyIdInput.innerHTML = '';
      Array.from(values).sort((left, right) => left.localeCompare(right)).forEach((value) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        topologyIdInput.appendChild(option);
      });

      const preferred = String(preferredTopologyId || '').trim() || previousValue || 'topo-main';
      ensureTopologyOption(preferred);
      topologyIdInput.value = preferred;
    }

    function setWorkspaceList(items, activeWorkspaceId) {
      workspaceSelect.innerHTML = '';
      for (const item of items) {
        const option = document.createElement('option');
        option.value = item.workspaceId;
        const activeFlag = item.isActive ? ' [active]' : '';
        option.textContent = String(item.workspaceId) + String(activeFlag);
        workspaceSelect.appendChild(option);
      }

      if (activeWorkspaceId) {
        workspaceSelect.value = activeWorkspaceId;
      }

      if (workspaceSelect.value) {
        workspaceIdInput.value = workspaceSelect.value;
      }

      setTopologyOptions(items, String(topologyIdInput.value || '').trim());
    }

    document.getElementById('reloadBtn').addEventListener('click', () => {
      vscode.postMessage({ type: 'workspace-list' });
      setHint('Reloading workspace list...');
    });

    addCardBtn.addEventListener('click', () => {
      syncFromCards();
      const index = cards.length;
      cards.push(createCard({
        id: 'card' + String(index + 1),
        driver: 'pxi',
        device: 'pxi-mock-' + String(index),
        resource: 'dev' + String(index),
        cardIndex: String(index + 1),
        boardKind: 'board',
        boardPortsCsv: 'p1,p2',
      }));
      renderVisual();
      selectedCardSelect.value = String(index);
      setHint('Board card added.');
    });

    addVirtualPortBtn.addEventListener('click', () => {
      const vPort = String(newVirtualPortInput.value || '').trim();
      if (!vPort) {
        setHint('Virtual VNA port name is required.');
        return;
      }
      if (virtualPorts.includes(vPort)) {
        setHint('Virtual port already exists: ' + vPort);
        return;
      }
      virtualPorts.push(vPort);
      renderVisual();
      newVirtualPortInput.value = '';
      setHint('Virtual port added: ' + vPort);
    });

    autoAssignBtn.addEventListener('click', () => {
      syncFromCards();
      if (cards.length === 0) {
        setHint('No board cards available.');
        return;
      }
      const endpoints = [];
      for (let i = 0; i < cards.length; i += 1) {
        for (const bp of getBoardPorts(cards[i])) {
          endpoints.push({ cardIndex: i, boardPort: bp });
        }
      }
      if (endpoints.length === 0) {
        setHint('No board ports found on cards.');
        return;
      }
      bindings = {};
      for (let i = 0; i < virtualPorts.length; i += 1) {
        const endpoint = endpoints[i % endpoints.length];
        bindings[virtualPorts[i]] = { cardIndex: endpoint.cardIndex, boardPort: endpoint.boardPort };
      }
      renderVisual();
      setHint('Auto assigned virtual ports to board ports.');
    });

    assignSelectedBtn.addEventListener('click', () => {
      syncFromCards();
      const selected = Number(selectedCardSelect.value || '-1');
      if (selected < 0 || selected >= cards.length) {
        setHint('Please select a valid card.');
        return;
      }
      const boardPorts = getBoardPorts(cards[selected]);
      if (boardPorts.length === 0) {
        setHint('Selected card has no board ports.');
        return;
      }
      for (let i = 0; i < virtualPorts.length; i += 1) {
        bindings[virtualPorts[i]] = { cardIndex: selected, boardPort: boardPorts[i % boardPorts.length] };
      }
      renderVisual();
      selectedCardSelect.value = String(selected);
      setHint('Assigned all virtual ports to selected card board ports.');
    });

    clearAssignBtn.addEventListener('click', () => {
      bindings = {};
      renderVisual();
      setHint('All bindings cleared.');
    });

    visualModeBtn.addEventListener('click', () => {
      setMode(true);
      setHint('Visual mode enabled. Bind virtual ports to board ports.');
    });

    yamlModeBtn.addEventListener('click', () => {
      setMode(false);
      setHint('YAML mode enabled (advanced).');
    });

    document.getElementById('loadBtn').addEventListener('click', () => {
      const s = state();
      if (!s.workspaceId) {
        setHint('Workspace ID is required.');
        return;
      }
      vscode.postMessage({ type: 'workspace-load', workspaceId: s.workspaceId });
      setHint('Loading workspace ' + s.workspaceId + ' ...');
    });

    document.getElementById('saveBtn').addEventListener('click', () => {
      const s = state();
      vscode.postMessage({ type: 'workspace-save', ...s, activate: false });
      setHint('Saving workspace ' + s.workspaceId + ' ...');
    });

    document.getElementById('saveActivateBtn').addEventListener('click', () => {
      const s = state();
      vscode.postMessage({ type: 'workspace-save', ...s, activate: true });
      setHint('Saving and activating workspace ' + s.workspaceId + ' ...');
    });

    document.getElementById('activateBtn').addEventListener('click', () => {
      const s = state();
      if (!s.workspaceId) {
        setHint('Workspace ID is required.');
        return;
      }
      vscode.postMessage({ type: 'workspace-activate', workspaceId: s.workspaceId });
      setHint('Activating workspace ' + s.workspaceId + ' ...');
    });

    copyDiagBtn.addEventListener('click', async () => {
      if (!lastDiagnosticSummary) {
        setHint('暂无可复制的冲突摘要。');
        return;
      }
      const copied = await copyTextToClipboard(lastDiagnosticSummary);
      setHint(copied ? '冲突摘要已复制到剪贴板。' : '冲突摘要复制失败。');
    });

    copyDiagJsonBtn.addEventListener('click', async () => {
      if (!lastDiagnosticPayload) {
        setHint('暂无可复制的 JSON 摘要。');
        return;
      }
      const copied = await copyTextToClipboard(JSON.stringify(lastDiagnosticPayload, null, 2));
      setHint(copied ? 'JSON 摘要已复制到剪贴板。' : 'JSON 摘要复制失败。');
    });

    applyAdviceBtn.addEventListener('click', () => {
      applyRetryAdvice();
    });

    workspaceSelect.addEventListener('change', () => {
      const selected = String(workspaceSelect.value || '').trim();
      workspaceIdInput.value = selected;
      if (selected) {
        vscode.postMessage({ type: 'workspace-load', workspaceId: selected });
      }
    });

    window.addEventListener('message', (event) => {
      const msg = event.data || {};
      if (msg.type === 'workspace-list-result') {
        setWorkspaceList(msg.items || [], msg.activeWorkspaceId || '');
        setHint('Loaded ' + (Array.isArray(msg.items) ? msg.items.length : 0) + ' workspace configs.');
        return;
      }
      if (msg.type === 'workspace-load-result') {
        updateDiagnosticSummary('');
        updateDiagnosticPayload(null);
        updateDiagnosticSelectors([]);
        if (msg.ok && msg.item) {
          workspaceIdInput.value = msg.item.workspaceId || '';
          ensureTopologyOption(msg.item.topologyId || 'topo-main');
          topologyIdInput.value = msg.item.topologyId || 'topo-main';
          topologyYamlInput.value = msg.item.topologyYaml || '';
          const parsed = parseFromYaml(topologyYamlInput.value);
          cards = parsed.cards;
          virtualPorts = parsed.virtualPorts;
          bindings = parsed.bindings;
          setMode(true);
          setHint('Workspace loaded: ' + String(msg.item.workspaceId || ''));
        } else {
          setHint(msg.error || 'Workspace load failed.');
        }
        return;
      }
      if (msg.type === 'workspace-save-result') {
        const precheck = msg.precheck || null;
        if (!msg.ok && precheck) {
          const updatedAtText = formatDateTime(msg.diagnosticUpdatedAtMs || Date.now());
          const conflictCount = Number(
            msg.conflictCount ?? (Array.isArray(precheck.lockConflicts) ? precheck.lockConflicts.length : 0),
          );
          const snapshotLeaseCount = Number(msg.snapshotLeaseCount ?? -1);
          const diagnosticPayload = msg.diagnosticPayload && typeof msg.diagnosticPayload === 'object'
            ? msg.diagnosticPayload
            : null;
          const schemaVersion = diagnosticPayload ? String(diagnosticPayload.schemaVersion || '-') : '-';
          const requestId = String(msg.diagnosticRequestId || (diagnosticPayload ? diagnosticPayload.requestId : '') || '-');
          const fingerprint = diagnosticPayload ? String(diagnosticPayload.conflictFingerprint || '-') : '-';
          const retryAdvice = diagnosticPayload && diagnosticPayload.retryAdvice
            ? String(diagnosticPayload.retryAdvice.recommendation || '-')
            : '-';
          const retryDelayMs = diagnosticPayload && diagnosticPayload.retryAdvice
            ? String(diagnosticPayload.retryAdvice.retryDelayMs || 0)
            : '0';
          const workspaceText = String(workspaceIdInput.value || '').trim() || 'unknown-workspace';
          const topologyText = String(topologyIdInput.value || '').trim() || 'unknown-topology';
          const hintLines = [msg.message || 'Save blocked by precheck.'];
          hintLines.push('workspace=' + workspaceText + ', topology=' + topologyText);
          hintLines.push('updatedAt=' + updatedAtText + ', conflicts=' + String(conflictCount) + ', snapshotLeases=' + String(snapshotLeaseCount));
          hintLines.push('schema=' + schemaVersion + ', requestId=' + requestId);
          hintLines.push('fingerprint=' + fingerprint + ', retry=' + retryAdvice + ', delayMs=' + retryDelayMs);
          if (msg.lockSnapshotSummary) {
            hintLines.push(String(msg.lockSnapshotSummary));
          }
          setHint(hintLines.join('\n'));
          updateDiagnosticSummary(String(msg.diagnosticSummary || msg.lockSnapshotSummary || hintLines.join('\n')));
          updateDiagnosticPayload(msg.diagnosticPayload || null);
          updateDiagnosticSelectors(msg.lockSnapshotSelectors || []);
        } else {
          setHint(msg.message || 'Save done.');
          updateDiagnosticSummary('');
          updateDiagnosticPayload(null);
          updateDiagnosticSelectors([]);
        }
        if (msg.ok) {
          vscode.postMessage({ type: 'workspace-list' });
        }
        return;
      }
      if (msg.type === 'workspace-lock-snapshot-result') {
        if (msg.ok && msg.snapshot && Array.isArray(msg.snapshot.leases)) {
          const leases = msg.snapshot.leases;
          if (leases.length === 0) {
            setHint('Lock snapshot: no active leases on selected resources.');
          } else {
            const first = leases[0] || {};
            const resourceId = String(first?.selector?.resourceId || 'unknown-resource');
            const workspaceId = String(first?.owner?.workspaceId || 'unknown-workspace');
            const actor = String(first?.owner?.actor || 'unknown-actor');
            setHint('Lock snapshot: resource=' + resourceId + ', holder=' + workspaceId + '/' + actor);
          }
        }
        return;
      }
      if (msg.type === 'workspace-activate-result') {
        setHint(msg.message || 'Activate done.');
        if (msg.ok) {
          vscode.postMessage({ type: 'workspace-list' });
        }
      }
    });

    cards = [createCard({
      id: 'card1',
      driver: 'pxi',
      device: 'pxi-mock-0',
      resource: 'dev0',
      cardIndex: '1',
      boardKind: 'board',
      boardPortsCsv: 'p1,p2',
      detail: '',
    })];
    virtualPorts = ['vna-port1', 'vna-port2'];
    bindings = { 'vna-port1': { cardIndex: 0, boardPort: 'p1' }, 'vna-port2': { cardIndex: 0, boardPort: 'p2' } };

    setMode(true);
    updateDiagnosticSummary('');
    updateDiagnosticPayload(null);
    updateDiagnosticSelectors([]);
    vscode.postMessage({ type: 'workspace-list' });
  </script>
</body>
</html>`;
}
