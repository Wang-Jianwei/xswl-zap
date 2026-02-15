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
      min-width: 92px;
      font-size: 12px;
      opacity: 0.9;
    }
    .row input, .row select, .row button, .row textarea {
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
      min-height: 320px;
      resize: vertical;
      line-height: 1.35;
    }
    button {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      padding: 6px 10px;
      cursor: pointer;
    }
    button.secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    .hint {
      margin-top: 8px;
      font-size: 12px;
      opacity: 0.85;
      white-space: pre-wrap;
    }
    .section-title {
      font-size: 12px;
      opacity: 0.9;
      margin: 10px 0 6px 0;
      font-weight: 600;
    }
    .mode-toggle {
      display: flex;
      gap: 8px;
      margin-bottom: 8px;
      flex-wrap: wrap;
    }
    .cards {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 8px;
    }
    .card {
      border: 1px solid var(--vscode-editorWidget-border, var(--vscode-panel-border));
      padding: 8px;
      border-radius: 4px;
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
      opacity: 0.95;
    }
    .card-grid {
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
    .field label {
      font-size: 11px;
      opacity: 0.85;
    }
    .full {
      grid-column: 1 / span 2;
    }
    .mini-map {
      font-size: 11px;
      opacity: 0.82;
      margin-top: 6px;
      white-space: pre-wrap;
    }
    .hidden {
      display: none;
    }
    .mapping-layout {
      display: grid;
      grid-template-columns: minmax(220px, 0.75fr) 1fr;
      gap: 10px;
      margin-bottom: 10px;
    }
    .mapping-panel {
      border: 1px solid var(--vscode-editorWidget-border, var(--vscode-panel-border));
      border-radius: 4px;
      padding: 8px;
      background: color-mix(in srgb, var(--vscode-editor-background) 96%, var(--vscode-sideBar-background) 4%);
    }
    .port-input-row {
      display: flex;
      gap: 6px;
      margin-bottom: 8px;
    }
    .chip-list {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .port-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: 1px solid var(--vscode-input-border);
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border-radius: 999px;
      padding: 4px 8px;
      font-size: 11px;
      user-select: none;
    }
    .port-chip[draggable="true"] {
      cursor: grab;
    }
    .port-chip.bound {
      border-color: var(--vscode-charts-blue);
    }
    .drop-zone {
      min-height: 34px;
      border: 1px dashed var(--vscode-input-border);
      border-radius: 4px;
      padding: 6px;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-items: center;
      background: color-mix(in srgb, var(--vscode-editor-background) 95%, var(--vscode-sideBar-background) 5%);
    }
    .drop-zone.active {
      border-color: var(--vscode-button-background);
      background: color-mix(in srgb, var(--vscode-button-background) 15%, var(--vscode-editor-background) 85%);
    }
    .muted {
      font-size: 11px;
      opacity: 0.72;
    }
    .link-diagram {
      font-size: 11px;
      opacity: 0.85;
      white-space: pre-wrap;
      margin-top: 6px;
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
    <label for="topologyId">Topology ID</label>
    <input id="topologyId" placeholder="topology-main" />
  </div>

  <div class="mode-toggle">
    <button id="visualModeBtn">Visual Mode</button>
    <button id="yamlModeBtn" class="secondary">YAML Mode (advanced)</button>
    <button id="addCardBtn" class="secondary">+ Add Card</button>
    <button id="autoAssignBtn" class="secondary">Auto Assign Ports</button>
  </div>

  <div id="visualSection">
    <div class="section-title">Port ↔ Card Visual Mapping</div>
    <div class="mapping-layout">
      <div class="mapping-panel">
        <div class="port-input-row">
          <input id="newPortInput" placeholder="vna-port3" />
          <button id="addPortBtn" class="secondary">+ Port</button>
        </div>
        <div id="portPool" class="chip-list"></div>
        <div class="muted" style="margin-top:8px;">Drag ports to card drop zones on the right.</div>
      </div>
      <div class="mapping-panel">
        <div class="section-title" style="margin-top:0;">Mapping Preview</div>
        <div id="mappingPreview" class="link-diagram"></div>
      </div>
    </div>

    <div class="section-title">Topology Cards</div>
    <div id="cards" class="cards"></div>
  </div>

  <div id="yamlSection" class="hidden">
    <div class="section-title">Raw Topology YAML (advanced)</div>
    <textarea id="topologyYaml" spellcheck="false" placeholder="instances:\n  - id: inst0\n    driver: pxi\n    device: pxi-mock-0\n    resource: dev0\n    ports:\n      - vna-port1\n      - vna-port2"></textarea>
  </div>

  <div class="row">
    <button id="loadBtn" class="secondary">Load Workspace</button>
    <button id="saveBtn">Save Topology</button>
    <button id="saveActivateBtn">Save + Activate</button>
    <button id="activateBtn" class="secondary">Set Active</button>
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
    const addCardBtn = document.getElementById('addCardBtn');
    const autoAssignBtn = document.getElementById('autoAssignBtn');
    const visualModeBtn = document.getElementById('visualModeBtn');
    const yamlModeBtn = document.getElementById('yamlModeBtn');
    const newPortInput = document.getElementById('newPortInput');
    const addPortBtn = document.getElementById('addPortBtn');
    const portPool = document.getElementById('portPool');
    const mappingPreview = document.getElementById('mappingPreview');

    let visualMode = true;
    let cards = [];
    let availablePorts = [];
    let portBindings = {};
    let draggingPort = '';

    function escapeHtml(value) {
      return String(value || '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
    }

    function createCard(seed) {
      const card = seed || {};
      return {
        id: String(card.id || ''),
        driver: String(card.driver || ''),
        device: String(card.device || ''),
        resource: String(card.resource || ''),
        cardIndex: String(card.cardIndex || ''),
        portsCsv: String(card.portsCsv || ''),
        detail: String(card.detail || ''),
      };
    }

    function parsePortsCsv(csv) {
      return String(csv || '')
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
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

    function toYamlFromCards(cardItems) {
      const lines = ['instances:'];
      for (const card of cardItems) {
        lines.push('  - id: ' + scalar(card.id));
        lines.push('    driver: ' + scalar(card.driver));
        lines.push('    device: ' + scalar(card.device));
        lines.push('    resource: ' + scalar(card.resource));
        if (String(card.cardIndex || '').trim().length > 0) {
          lines.push('    cardIndex: ' + scalar(card.cardIndex));
        }
        const ports = parsePortsCsv(card.portsCsv);
        if (ports.length > 0) {
          lines.push('    ports:');
          for (const p of ports) {
            lines.push('      - ' + scalar(p));
          }
        }
        if (String(card.detail || '').trim().length > 0) {
          lines.push('    detail: ' + scalar(card.detail));
        }
      }
      return lines.join('\n');
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

    function parseCardsFromYaml(yamlText) {
      const text = String(yamlText || '');
      if (text.trim().length === 0) {
        return [createCard({ id: 'inst0', driver: 'pxi', device: 'pxi-mock-0', resource: 'dev0', cardIndex: '1', portsCsv: 'vna-port1,vna-port2' })];
      }

      const lines = text.split(/\r?\n/);
      const result = [];
      let inInstances = false;
      let i = 0;

      function parseKeyValue(line) {
        const kv = line.split(':');
        if (kv.length < 2) {
          return null;
        }
        const key = kv.shift().trim();
        const value = kv.join(':').trim();
        return { key, value: dequote(value) };
      }

      while (i < lines.length) {
        const line = lines[i];
        const trimmed = line.trim();
        if (!inInstances) {
          if (trimmed === 'instances:') {
            inInstances = true;
          }
          i += 1;
          continue;
        }

        if (trimmed.length === 0) {
          i += 1;
          continue;
        }

        const cardStart = /^\s*-\s*/.test(line);
        if (!cardStart) {
          i += 1;
          continue;
        }

        const card = createCard({});
        const first = line.replace(/^\s*-\s*/, '').trim();
        if (first.length > 0) {
          const kv = parseKeyValue(first);
          if (kv && kv.key === 'id') {
            card.id = kv.value;
          }
        }

        i += 1;
        while (i < lines.length) {
          const next = lines[i];
          const nextTrim = next.trim();
          if (nextTrim.length === 0) {
            i += 1;
            continue;
          }
          if (/^\s*-\s*/.test(next)) {
            break;
          }

          const kv = parseKeyValue(nextTrim);
          if (!kv) {
            i += 1;
            continue;
          }
          if (kv.key === 'ports' && kv.value.length === 0) {
            const ports = [];
            i += 1;
            while (i < lines.length) {
              const portLine = lines[i];
              const portTrim = portLine.trim();
              if (!portTrim.startsWith('- ')) {
                break;
              }
              ports.push(dequote(portTrim.substring(2).trim()));
              i += 1;
            }
            card.portsCsv = ports.join(',');
            continue;
          }

          if (kv.key === 'driver') {
            card.driver = kv.value;
          } else if (kv.key === 'device') {
            card.device = kv.value;
          } else if (kv.key === 'resource') {
            card.resource = kv.value;
          } else if (kv.key === 'cardIndex') {
            card.cardIndex = kv.value;
          } else if (kv.key === 'detail') {
            card.detail = kv.value;
          }

          i += 1;
        }

        result.push(card);
      }

      if (result.length === 0) {
        throw new Error('Unable to parse topology YAML into visual cards.');
      }
      return result;
    }

    function syncPortsAndBindingsFromCards(cardItems) {
      const nextPorts = [];
      const nextBindings = {};
      for (let index = 0; index < cardItems.length; index += 1) {
        const ports = parsePortsCsv(cardItems[index].portsCsv);
        for (const p of ports) {
          if (!nextPorts.includes(p)) {
            nextPorts.push(p);
          }
          nextBindings[p] = index;
        }
      }
      if (nextPorts.length === 0) {
        nextPorts.push('vna-port1', 'vna-port2');
      }
      availablePorts = nextPorts;
      portBindings = nextBindings;
    }

    function assignedPortsForCard(index) {
      const ports = [];
      for (const p of availablePorts) {
        if (portBindings[p] === index) {
          ports.push(p);
        }
      }
      return ports;
    }

    function renderPortPool() {
      portPool.innerHTML = '';
      for (const p of availablePorts) {
        const boundCard = typeof portBindings[p] === 'number' ? Number(portBindings[p]) + 1 : 0;
        const chip = document.createElement('div');
        chip.className = 'port-chip' + (boundCard > 0 ? ' bound' : '');
        chip.setAttribute('draggable', 'true');
        chip.setAttribute('data-port', p);
        chip.innerHTML =
          '<span>' + escapeHtml(p) + (boundCard > 0 ? ' → Card' + String(boundCard) : '') + '</span>' +
          '<button class="secondary remove-port" data-port="' + escapeHtml(p) + '">×</button>';
        portPool.appendChild(chip);
      }

      for (const chip of portPool.querySelectorAll('.port-chip')) {
        chip.addEventListener('dragstart', (event) => {
          const port = chip.getAttribute('data-port') || '';
          draggingPort = port;
          if (event.dataTransfer) {
            event.dataTransfer.setData('text/plain', port);
            event.dataTransfer.effectAllowed = 'move';
          }
        });
      }

      for (const btn of portPool.querySelectorAll('.remove-port')) {
        btn.addEventListener('click', (event) => {
          event.preventDefault();
          const port = btn.getAttribute('data-port') || '';
          availablePorts = availablePorts.filter((item) => item !== port);
          delete portBindings[port];
          renderVisual();
          setHint('Port removed: ' + port);
        });
      }
    }

    function renderMappingPreview() {
      const lines = ['------------------------------'];
      for (let i = 0; i < cards.length; i += 1) {
        const c = cards[i];
        const ports = assignedPortsForCard(i);
        const left = ports.length > 0 ? ports.join(', ') : '(no ports)';
        const right = 'Card' + String(i + 1) + ' [' + (c.resource || 'resource addr...') + ']';
        lines.push(left + '  ->  ' + right);
      }
      lines.push('------------------------------');
      mappingPreview.textContent = lines.join('\n');
    }

    function collectCardsFromDom() {
      const nodes = cardsContainer.querySelectorAll('.card');
      const collected = [];
      for (let index = 0; index < nodes.length; index += 1) {
        const node = nodes[index];
        const ports = assignedPortsForCard(index);
        collected.push(createCard({
          id: node.querySelector('.field-id input').value,
          driver: node.querySelector('.field-driver input').value,
          device: node.querySelector('.field-device input').value,
          resource: node.querySelector('.field-resource input').value,
          cardIndex: node.querySelector('.field-card-index input').value,
          portsCsv: ports.join(','),
          detail: node.querySelector('.field-detail input').value,
        }));
      }
      return collected;
    }

    function bindDropZoneEvents() {
      for (const zone of cardsContainer.querySelectorAll('.drop-zone')) {
        zone.addEventListener('dragover', (event) => {
          event.preventDefault();
          zone.classList.add('active');
          if (event.dataTransfer) {
            event.dataTransfer.dropEffect = 'move';
          }
        });
        zone.addEventListener('dragleave', () => {
          zone.classList.remove('active');
        });
        zone.addEventListener('drop', (event) => {
          event.preventDefault();
          zone.classList.remove('active');
          const cardIndex = Number(zone.getAttribute('data-card-index') || '-1');
          const port = (event.dataTransfer && event.dataTransfer.getData('text/plain')) || draggingPort;
          if (cardIndex < 0 || !port) {
            return;
          }
          portBindings[port] = cardIndex;
          renderVisual();
          setHint('Mapped ' + port + ' → Card' + String(cardIndex + 1));
        });
      }

      for (const btn of cardsContainer.querySelectorAll('.unbind-port')) {
        btn.addEventListener('click', () => {
          const port = btn.getAttribute('data-port') || '';
          delete portBindings[port];
          renderVisual();
          setHint('Unbound port: ' + port);
        });
      }

      for (const button of cardsContainer.querySelectorAll('.remove-card')) {
        button.addEventListener('click', () => {
          const index = Number(button.getAttribute('data-index') || '-1');
          if (index < 0 || index >= cards.length) {
            return;
          }
          cards.splice(index, 1);
          const nextBindings = {};
          for (const p of availablePorts) {
            const target = portBindings[p];
            if (typeof target !== 'number') {
              continue;
            }
            if (target === index) {
              continue;
            }
            nextBindings[p] = target > index ? target - 1 : target;
          }
          portBindings = nextBindings;
          if (cards.length === 0) {
            cards.push(createCard({ id: 'inst0', driver: 'pxi', device: 'pxi-mock-0', resource: 'dev0', cardIndex: '1' }));
          }
          renderVisual();
        });
      }
    }

    function renderCards() {
      cardsContainer.innerHTML = '';
      for (let index = 0; index < cards.length; index += 1) {
        const card = cards[index];
        const ports = assignedPortsForCard(index);
        const wrapper = document.createElement('div');
        wrapper.className = 'card';
        wrapper.innerHTML =
          '<div class="card-head">' +
            '<div class="card-title">Card ' + String(index + 1) + '</div>' +
            '<button class="secondary remove-card" data-index="' + String(index) + '">Remove</button>' +
          '</div>' +
          '<div class="card-grid">' +
            '<div class="field field-id"><label>Instance ID</label><input value="' + escapeHtml(card.id) + '" placeholder="inst0" /></div>' +
            '<div class="field field-card-index"><label>Card Index</label><input value="' + escapeHtml(card.cardIndex) + '" placeholder="1" /></div>' +
            '<div class="field field-driver"><label>Driver</label><input value="' + escapeHtml(card.driver) + '" placeholder="pxi" /></div>' +
            '<div class="field field-device"><label>Device</label><input value="' + escapeHtml(card.device) + '" placeholder="pxi-mock-0" /></div>' +
            '<div class="field full field-resource"><label>Resource Address</label><input value="' + escapeHtml(card.resource) + '" placeholder="resource addr..." /></div>' +
            '<div class="field full"><label>Port Mapping (drop ports here)</label>' +
              '<div class="drop-zone" data-card-index="' + String(index) + '">' +
                (ports.length > 0
                  ? ports.map((p) => '<span class="port-chip bound">' + escapeHtml(p) + ' <button class="secondary unbind-port" data-port="' + escapeHtml(p) + '">×</button></span>').join('')
                  : '<span class="muted">Drop vna-port* here</span>') +
              '</div>' +
            '</div>' +
            '<div class="field full field-detail"><label>Detail</label><input value="' + escapeHtml(card.detail) + '" placeholder="detail..." /></div>' +
          '</div>';
        cardsContainer.appendChild(wrapper);
      }

      bindDropZoneEvents();
    }

    function renderVisual() {
      cards = collectCardsFromDom();
      renderCards();
      renderPortPool();
      renderMappingPreview();
    }

    function setMode(nextVisualMode) {
      visualMode = Boolean(nextVisualMode);
      if (visualMode) {
        try {
          cards = parseCardsFromYaml(topologyYamlInput.value);
          syncPortsAndBindingsFromCards(cards);
        } catch {
          if (cards.length === 0) {
            cards = [createCard({ id: 'inst0', driver: 'pxi', device: 'pxi-mock-0', resource: 'dev0', cardIndex: '1' })];
          }
          syncPortsAndBindingsFromCards(cards);
        }
        renderCards();
        renderPortPool();
        renderMappingPreview();
      } else {
        cards = collectCardsFromDom();
        topologyYamlInput.value = toYamlFromCards(cards);
      }

      visualSection.classList.toggle('hidden', !visualMode);
      yamlSection.classList.toggle('hidden', visualMode);
      visualModeBtn.classList.toggle('secondary', !visualMode);
      yamlModeBtn.classList.toggle('secondary', visualMode);
      addCardBtn.disabled = !visualMode;
      autoAssignBtn.disabled = !visualMode;
      addPortBtn.disabled = !visualMode;
      newPortInput.disabled = !visualMode;
    }

    function state() {
      const visualCards = visualMode ? collectCardsFromDom() : cards;
      const topologyYaml = visualMode
        ? toYamlFromCards(visualCards)
        : String(topologyYamlInput.value || '');

      return {
        workspaceId: String(workspaceIdInput.value || '').trim(),
        topologyId: String(topologyIdInput.value || '').trim(),
        topologyYaml,
      };
    }

    function setHint(text) {
      hint.textContent = text;
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
    }

    document.getElementById('reloadBtn').addEventListener('click', () => {
      vscode.postMessage({ type: 'workspace-list' });
      setHint('Reloading workspace list...');
    });

    addCardBtn.addEventListener('click', () => {
      cards = collectCardsFromDom();
      const index = cards.length;
      cards.push(createCard({
        id: 'inst' + String(index),
        driver: 'pxi',
        device: 'pxi-mock-' + String(index),
        resource: 'dev' + String(index),
        cardIndex: String(index + 1),
      }));
      renderCards();
      renderMappingPreview();
      setHint('Card added.');
    });

    autoAssignBtn.addEventListener('click', () => {
      cards = collectCardsFromDom();
      if (cards.length === 0) {
        setHint('No cards to assign. Add a card first.');
        return;
      }
      if (availablePorts.length === 0) {
        setHint('No ports available to assign.');
        return;
      }

      const nextBindings = {};
      for (let i = 0; i < availablePorts.length; i += 1) {
        nextBindings[availablePorts[i]] = i % cards.length;
      }
      portBindings = nextBindings;
      renderVisual();
      setHint('Ports auto-assigned to cards by sequence.');
    });

    addPortBtn.addEventListener('click', () => {
      const portName = String(newPortInput.value || '').trim();
      if (!portName) {
        setHint('Port name is required.');
        return;
      }
      if (availablePorts.includes(portName)) {
        setHint('Port already exists: ' + portName);
        return;
      }
      availablePorts.push(portName);
      renderPortPool();
      renderMappingPreview();
      newPortInput.value = '';
      setHint('Port added: ' + portName);
    });

    visualModeBtn.addEventListener('click', () => {
      setMode(true);
      setHint('Visual mode enabled. Drag ports to cards.');
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
        if (msg.ok && msg.item) {
          workspaceIdInput.value = msg.item.workspaceId || '';
          topologyIdInput.value = msg.item.topologyId || '';
          topologyYamlInput.value = msg.item.topologyYaml || '';
          try {
            cards = parseCardsFromYaml(topologyYamlInput.value);
            syncPortsAndBindingsFromCards(cards);
            setMode(true);
            setHint('Workspace loaded (visual): ' + String(msg.item.workspaceId || ''));
          } catch (error) {
            setMode(false);
            const msgText = error instanceof Error ? error.message : String(error);
            setHint('Workspace loaded in YAML mode: ' + msgText);
          }
        } else {
          setHint(msg.error || 'Workspace load failed.');
        }
        return;
      }
      if (msg.type === 'workspace-save-result') {
        setHint(msg.message || 'Save done.');
        if (msg.ok) {
          vscode.postMessage({ type: 'workspace-list' });
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

    cards = [createCard({ id: 'inst0', driver: 'pxi', device: 'pxi-mock-0', resource: 'dev0', cardIndex: '1', portsCsv: 'vna-port1,vna-port2' })];
    syncPortsAndBindingsFromCards(cards);
    setMode(true);
    vscode.postMessage({ type: 'workspace-list' });
  </script>
</body>
</html>`;
}
