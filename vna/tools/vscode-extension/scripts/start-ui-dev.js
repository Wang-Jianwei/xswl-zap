const http = require('http');
const fs = require('fs');
const path = require('path');
const { Module } = require('module');
const { exec } = require('child_process');

const PORT = Number(process.env.UI_DEV_PORT || 3000);
const GRPC_ADDRESS = String(process.env.XSWL_ZAP_GRPC_ADDRESS || '127.0.0.1:50051');
const GRPC_DEADLINE_MS = Number(process.env.XSWL_ZAP_GRPC_DEADLINE_MS || 2000);

const sessionQueues = new Map();
const sessionLive = new Map();

function createSessionId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function getQueue(sessionId) {
  if (!sessionQueues.has(sessionId)) {
    sessionQueues.set(sessionId, []);
  }
  return sessionQueues.get(sessionId);
}

function pushMessage(sessionId, payload) {
  const queue = getQueue(sessionId);
  queue.push(payload);
}

function flushMessages(sessionId) {
  const queue = getQueue(sessionId);
  const out = queue.slice();
  queue.length = 0;
  return out;
}

function stopLiveStream(sessionId) {
  const current = sessionLive.get(sessionId);
  if (current && current.abortController) {
    current.abortController.abort();
  }
  sessionLive.delete(sessionId);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-cache',
  });
  res.end(JSON.stringify(payload));
}

function safeErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

const originalRequire = Module.prototype.require;
Module.prototype.require = function patchedRequire(id) {
  if (id === 'vscode') {
    return {
      Webview: class {},
      Uri: {
        file: (p) => ({ toString: () => 'file://' + p, fsPath: p }),
        parse: (s) => ({ toString: () => s, fsPath: s }),
      },
    };
  }
  return originalRequire.call(this, id);
};

try {
  const uiModulePath = path.resolve(__dirname, '../out/src/unifiedControlCenter.js');
  const serviceClientModulePath = path.resolve(__dirname, '../out/src/serviceClient.js');
  if (!fs.existsSync(uiModulePath) || !fs.existsSync(serviceClientModulePath)) {
    console.error('Build output missing. Please run "npm run build" first.');
    process.exit(1);
  }

  const { buildUnifiedControlCenterHtml } = require(uiModulePath);
  const { ServiceClient } = require(serviceClientModulePath);
  const client = new ServiceClient({ address: GRPC_ADDRESS, deadlineMs: GRPC_DEADLINE_MS });

  const mockWebview = {
    cspSource: '*',
    asWebviewUri: (uri) => uri,
  };

  let html = buildUnifiedControlCenterHtml(mockWebview, 'nonce-dev');

  // Relax CSP for dev environment to allow fetch and inline scripts
  // Use [\s\S]*? to match across newlines if necessary
  html = html.replace(
    /<meta http-equiv="Content-Security-Policy"[\s\S]*?>/, 
    '<meta http-equiv="Content-Security-Policy" content="default-src \'self\' \'unsafe-inline\'; img-src * data:; style-src * \'unsafe-inline\'; script-src * \'unsafe-inline\' \'unsafe-eval\'; connect-src *;" />'
  );

  const devBridgeScript = `
  <script nonce="nonce-dev">
    (function () {
      const sessionId = Math.random().toString(36).slice(2) + Date.now().toString(36);
      let disposed = false;

      window.acquireVsCodeApi = () => ({
        postMessage: function(message) {
          fetch('/api/message?sid=' + encodeURIComponent(sessionId), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(message || {}),
          }).catch(error => {
            console.error('Dev bridge send failed', error);
          });
        },
        getState: () => ({}),
        setState: () => {},
      });

      async function pollLoop() {
        while (!disposed) {
          try {
            const response = await fetch('/api/poll?sid=' + encodeURIComponent(sessionId));
            if (!response.ok) throw new Error('Poll failed');
            const payload = await response.json();
            const messages = Array.isArray(payload.messages) ? payload.messages : [];
            for (const message of messages) {
              window.postMessage(message, '*');
            }
          } catch (error) {
            console.error('Bridge poll error:', error);
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
          await new Promise((resolve) => setTimeout(resolve, 120));
        }
      }

      window.addEventListener('beforeunload', () => {
        disposed = true;
        navigator.sendBeacon('/api/dispose?sid=' + encodeURIComponent(sessionId), '');
      });

      // Start polling
      pollLoop();
    })();
  </script>
  `;

  const devStyleOverride = `
  <style>
    /* Default Dark Theme for Dev Bridge */
    :root {
      --vscode-font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      --vscode-font-weight: 400;
      --vscode-font-size: 13px;
      --vscode-editor-background: #1e1e1e;
      --vscode-foreground: #cccccc;
      --vscode-panel-border: #454545;
      --vscode-sideBar-background: #252526;
      --vscode-sideBar-foreground: #cccccc;
      --vscode-editor-inactiveSelectionBackground: #3a3d41;
      --vscode-button-background: #0e639c;
      --vscode-button-foreground: #ffffff;
      --vscode-button-hoverBackground: #1177bb;
      --vscode-button-secondaryBackground: #3a3d41;
      --vscode-button-secondaryForeground: #ffffff;
      --vscode-button-secondaryHoverBackground: #45494e;
      --vscode-focusBorder: #007fd4;
      --vscode-descriptionForeground: #ccccccb3;
      --vscode-editorWidget-background: #252526;
      --vscode-input-border: #3c3c3c;
      --vscode-input-foreground: #cccccc;
      --vscode-input-background: #3c3c3c;
      --vscode-settings-headerForeground: #e7e7e7;
      --vscode-list-hoverBackground: #2a2d2e;
      --vscode-list-activeSelectionBackground: #37373d;
      --vscode-list-activeSelectionForeground: #ffffff;
      --vscode-charts-blue: #3794ff;
      --vscode-charts-red: #f14c4c;
      --vscode-charts-green: #89d185;
      --vscode-charts-yellow: #cca700;
      --vscode-charts-orange: #d18616;
      --vscode-charts-purple: #b180d7;
    }
    body {
      background-color: var(--vscode-editor-background);
      color: var(--vscode-foreground);
    }
  </style>
  `;

  // Inject BEFORE </head> to ensure style overrides are applied
  html = html.replace('</head>', devStyleOverride + devBridgeScript + '</head>');

  async function handleControlCenterMessage(sessionId, payload) {
    const workspaceId = String(payload.workspaceId || '').trim();
    const topologyId = String(payload.topologyId || '').trim();
    const topologyYaml = String(payload.topologyYaml || '');
    const instanceId = String(payload.instanceId || 'inst0').trim() || 'inst0';
    const sampleCountRaw = Number(payload.sampleCount || 256);
    const sampleCount = Number.isInteger(sampleCountRaw) && sampleCountRaw > 0 ? sampleCountRaw : 256;
    const mode = payload.mode === 'time' ? 'time' : 'frequency';

    if (payload.type === 'app-init') {
      const list = await client.listWorkspaceTopologies();
      pushMessage(sessionId, {
        type: 'workspace-list-result',
        items: list.items,
        activeWorkspaceId: list.activeWorkspaceId,
      });
      const status = await client.getServiceStatus();
      pushMessage(sessionId, { type: 'service-status-result', ok: true, status });
      return;
    }

    if (payload.type === 'service-status') {
      const status = await client.getServiceStatus();
      pushMessage(sessionId, { type: 'service-status-result', ok: true, status });
      return;
    }

    if (payload.type === 'workspace-list') {
      const list = await client.listWorkspaceTopologies();
      pushMessage(sessionId, {
        type: 'workspace-list-result',
        items: list.items,
        activeWorkspaceId: list.activeWorkspaceId,
      });
      return;
    }

    if (payload.type === 'workspace-load') {
      const item = await client.getWorkspaceTopology(workspaceId);
      pushMessage(sessionId, { type: 'workspace-load-result', ok: true, item });
      return;
    }

    if (payload.type === 'workspace-save') {
      const result = await client.upsertWorkspaceTopology(workspaceId, topologyId, topologyYaml, Boolean(payload.activate));
      pushMessage(sessionId, {
        type: 'workspace-save-result',
        ok: result.ok,
        message: result.ok
          ? 'Saved workspace ' + workspaceId + (Boolean(payload.activate) ? ' and activated.' : '.')
          : 'Save failed',
      });
      if (result.ok) {
        const list = await client.listWorkspaceTopologies();
        pushMessage(sessionId, {
          type: 'workspace-list-result',
          items: list.items,
          activeWorkspaceId: list.activeWorkspaceId,
        });
      }
      return;
    }

    if (payload.type === 'workspace-activate') {
      const result = await client.setActiveWorkspace(workspaceId);
      pushMessage(sessionId, {
        type: 'workspace-activate-result',
        ok: result.ok,
        message: result.ok ? 'Active workspace switched to ' + workspaceId + '.' : 'Activate failed',
      });
      if (result.ok) {
        const list = await client.listWorkspaceTopologies();
        pushMessage(sessionId, {
          type: 'workspace-list-result',
          items: list.items,
          activeWorkspaceId: list.activeWorkspaceId,
        });
      }
      return;
    }

    if (payload.type === 'open-visual-topology') {
      pushMessage(sessionId, {
        type: 'app-error',
        message: 'Browser mode does not support opening another VS Code webview command.',
      });
      return;
    }

    if (payload.type === 'scan-get') {
      const scan = await client.getScanState(instanceId);
      pushMessage(sessionId, { type: 'scan-state-result', ok: true, ...scan });
      return;
    }

    if (payload.type === 'scan-set') {
      const desiredState = payload.scanState === 'single' || payload.scanState === 'hold' ? payload.scanState : 'continuous';
      const scan = await client.setScanState(instanceId, desiredState);
      pushMessage(sessionId, { type: 'scan-state-result', ok: true, ...scan });
      return;
    }

    if (payload.type === 'waveform-snapshot') {
      const waveform = await client.acquireWaveform(instanceId, sampleCount, mode, 'frame', 0, []);
      pushMessage(sessionId, { type: 'waveform-frame', waveform });
      return;
    }

    if (payload.type === 'waveform-live-start') {
      stopLiveStream(sessionId);
      const started = await client.setScanState(instanceId, 'continuous');
      pushMessage(sessionId, { type: 'scan-state-result', ok: true, ...started });
      pushMessage(sessionId, { type: 'live-state', active: true });

      const abortController = new AbortController();
      sessionLive.set(sessionId, { abortController });

      client
        .streamWaveform(
          instanceId,
          sampleCount,
          mode,
          'frame',
          0,
          [],
          0,
          async (waveform) => {
            pushMessage(sessionId, { type: 'waveform-frame', waveform });
          },
          abortController.signal,
        )
        .then(() => {
          if (sessionLive.get(sessionId)?.abortController === abortController) {
            sessionLive.delete(sessionId);
            pushMessage(sessionId, { type: 'live-state', active: false });
          }
        })
        .catch((error) => {
          if (sessionLive.get(sessionId)?.abortController === abortController) {
            sessionLive.delete(sessionId);
            pushMessage(sessionId, { type: 'app-error', message: safeErrorMessage(error) });
            pushMessage(sessionId, { type: 'live-state', active: false });
          }
        });
      return;
    }

    if (payload.type === 'waveform-live-stop') {
      stopLiveStream(sessionId);
      try {
        await client.setScanState(instanceId, 'hold');
      } catch {
        // ignore
      }
      const scan = await client.getScanState(instanceId);
      pushMessage(sessionId, { type: 'scan-state-result', ok: true, ...scan });
      pushMessage(sessionId, { type: 'live-state', active: false });
      return;
    }
  }

  const server = http.createServer(async (req, res) => {
    const requestPath = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const sid = String(requestPath.searchParams.get('sid') || '');

    if (req.method === 'GET' && requestPath.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }

    if (req.method === 'GET' && requestPath.pathname === '/api/poll') {
      if (!sid) {
        sendJson(res, 400, { ok: false, error: 'missing sid' });
        return;
      }
      sendJson(res, 200, { ok: true, messages: flushMessages(sid) });
      return;
    }

    if (req.method === 'POST' && requestPath.pathname === '/api/dispose') {
      if (sid) {
        stopLiveStream(sid);
        sessionQueues.delete(sid);
      }
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === 'POST' && requestPath.pathname === '/api/message') {
      if (!sid) {
        sendJson(res, 400, { ok: false, error: 'missing sid' });
        return;
      }
      try {
        const body = await parseBody(req);
        await handleControlCenterMessage(sid, body || {});
        sendJson(res, 200, { ok: true });
      } catch (error) {
        pushMessage(sid, { type: 'app-error', message: safeErrorMessage(error) });
        sendJson(res, 500, { ok: false, error: safeErrorMessage(error) });
      }
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
  });

  const startCmd = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  const tryListen = (port, allowFallback) => {
    server.listen(port, () => {
      console.log(`UI Dev Server running at http://localhost:${port}`);
      console.log(`Bridging to gRPC backend at ${GRPC_ADDRESS} (deadline ${GRPC_DEADLINE_MS}ms)`);
      const openCommand = process.platform === 'win32'
        ? `start "" "http://localhost:${port}"`
        : `${startCmd} "http://localhost:${port}"`;
      exec(openCommand, (error) => {
        if (error) {
          console.warn(`Browser auto-open failed: ${safeErrorMessage(error)}. You can open http://localhost:${port} manually.`);
        }
      });
    });

    server.once('error', (error) => {
      if (allowFallback && error && error.code === 'EADDRINUSE') {
        console.warn(`Port ${port} is in use, retrying on ${port + 1}...`);
        tryListen(port + 1, false);
        return;
      }
      console.error(`Failed to bind UI dev server on port ${port}: ${safeErrorMessage(error)}`);
      process.exit(1);
    });
  };

  tryListen(PORT, true);

  process.on('SIGINT', () => {
    for (const sid of sessionLive.keys()) {
      stopLiveStream(sid);
    }
    client.dispose();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    for (const sid of sessionLive.keys()) {
      stopLiveStream(sid);
    }
    client.dispose();
    process.exit(0);
  });
} catch (error) {
  console.error('Failed to start UI dev server:', safeErrorMessage(error));
  process.exit(1);
}
