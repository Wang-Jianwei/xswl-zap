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
      display: flex;
      height: 100vh;
      overflow: hidden;
      position: relative;
    }
    .sidebar-stub {
      width: 48px;
      flex-shrink: 0;
      background: var(--vscode-activityBar-background);
      border-right: 1px solid var(--vscode-activityBar-border);
      display: flex;
      flex-direction: column;
      align-items: center;
      padding-top: 8px;
      z-index: 20;
    }
    .content-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      position: relative;
      min-width: 0;
      z-index: 10;
      transition: margin-left 0.2s ease-in-out; 
    }
    /* Setup Drawer: Push mode */
    .setup-drawer {
      position: relative; /* Changed from absolute to flow in flex container */
      width: 0; /* Collapsed by default */
      min-width: 0; 
      background: var(--vscode-sideBar-background);
      border-right: 1px solid var(--vscode-panel-border);
      /* transform: translateX(-100%);  Removed transform for push effect */
      transition: width 0.2s ease-in-out;
      z-index: 15;
      display: flex;
      flex-direction: column;
      overflow: hidden; /* Hide content when collapsed */
      flex-shrink: 0; /* Prevent flex shrink */
    }
    .setup-drawer.open {
      width: 260px; /* Expanded width */
      /* box-shadow removed as it's not floating anymore */
    }
    
    /* Reuse sl-tab styles but adapt for stub */
    .stub-tab {
      width: 40px;
      height: 40px;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      cursor: pointer;
      color: var(--vscode-activityBar-inactiveForeground);
    }
    .stub-tab:hover {
      color: var(--vscode-activityBar-foreground);
      background: rgba(255, 255, 255, 0.1);
    }
    .stub-tab.active {
      color: var(--vscode-activityBar-foreground);
    }
    .stub-tab.active::before {
      content: "";
      position: absolute;
      left: 4px;
      width: 3px;
      height: 24px;
      background: var(--vscode-activityBar-activeBorder);
      border-radius: 2px;
    }
    
    .drawer-header {
      padding: 8px 12px;
      font-weight: 600;
      border-bottom: 1px solid var(--vscode-panel-border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: var(--vscode-sideBarSectionHeader-background);
      color: var(--vscode-sideBarSectionHeader-foreground);
      min-height: 36px;
    }
    
    /* Breadcrumb style */
    .drawer-breadcrumb {
        font-size: 11px;
        color: var(--vscode-descriptionForeground);
        display: flex;
        align-items: center;
        gap: 4px;
        flex: 1;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
    }
    .drawer-breadcrumb span:last-child {
        color: var(--vscode-foreground);
        font-weight: 600;
    }

    .drawer-content {
      flex: 1;
      overflow: hidden;
      padding: 0;
      display: flex;
      flex-direction: column; /* Ensure drawer content stacks vertically */
    }

    /* Setup page override */
    .setup-page {
      display: none;
      flex: 1;
      flex-direction: row; /* FORCE ROW LAYOUT: TABS | CONTENT */
      overflow: hidden;
      padding: 0;
    }
    /* Force Row Layout for Setup Page */
    .setup-page.active {
      display: flex !important;
      flex-direction: row !important; /* Ensure Tabs (Left) | Content (Right) */
      align-items: stretch;
    }

    .sp-tabs {
        display: flex;
        flex-direction: column; /* Vertical Tabs */
        width: 80px; 
        flex-shrink: 0;
        border-right: 1px solid var(--vscode-panel-border);
        border-bottom: none;
        background: var(--vscode-sideBar-background); 
        overflow-y: auto;
        overflow-x: hidden;
    }
    .sp-tab {
        padding: 8px 4px; 
        cursor: pointer;
        font-size: 11px;
        border-right: none;
        border-bottom: 1px solid var(--vscode-panel-border);
        background: transparent;
        color: var(--vscode-sideBar-foreground); /* Use sidebar foreground */
        opacity: 0.7;
        /* flex: 1 removed so they don't stretch */
        min-height: 48px; 
        display: flex;
        flex-direction: row; /* Ensure content flows horizontally */
        align-items: center;
        justify-content: center;
        text-align: center;
        line-height: 1.2;
        word-break: normal; /* Allow normal breaking */
        flex: 0 0 auto;
        white-space: normal; /* Force wrapping if needed */
    }
    .sp-tab:hover {
        background: var(--vscode-list-hoverBackground);
        opacity: 1;
    }
    .sp-tab.active {
        background: var(--vscode-list-activeSelectionBackground);
        color: var(--vscode-list-activeSelectionForeground);
        border-bottom: 1px solid var(--vscode-panel-border);
        /* box-shadow: inset 3px 0 0 var(--vscode-tab-activeBorder);  Remove left border indicator */
        font-weight: 600;
        opacity: 1;
    }
    
    /* Content panel background should be slightly different if needed, but let's keep simple */
    .sp-content-panel {
        display: none;
        flex: 1; /* Take remaining space */
        padding: 16px; /* Increases padding */
        flex-direction: column;
        gap: 12px;
        overflow-y: auto; 
        background: var(--vscode-editor-background); /* Distinct from sidebar */
    }
    .sp-content-panel.active {
        display: flex;
    }

    /* Legacy sidebar removed */
    .sidebar { display: none; }

    .sidebar-hint {
      color: var(--vscode-descriptionForeground);
      font-size: 12px;
      margin-bottom: 2px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .sidebar-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .sidebar-item {
      border: 1px solid var(--vscode-panel-border);
      border-left: 3px solid var(--vscode-charts-blue);
      border-radius: 4px;
      padding: 6px 8px;
      background: var(--vscode-editorWidget-background);
      font-size: 12px;
      cursor: pointer;
    }
    .sidebar-item.secondary {
      border-left-color: var(--vscode-charts-green);
    }
    .sidebar-group {
      border: 1px solid var(--vscode-panel-border);
      border-radius: 6px;
      overflow: hidden;
      background: var(--vscode-editorWidget-background);
    }
    .sidebar-group-title {
      padding: 8px 10px;
      background: var(--vscode-editor-inactiveSelectionBackground);
      font-weight: 600;
      border-bottom: 1px solid var(--vscode-panel-border);
    }
    .sidebar-group-actions {
      padding: 8px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    
    /* New Setup Layout: Vertical Tabs + Content */
    .setup-container {
      display: flex;
      height: 100%;
      overflow: hidden;
    }
    .setup-left-nav {
      width: 48px;
      flex-shrink: 0;
      background: var(--vscode-activityBar-background);
      border-right: 1px solid var(--vscode-activityBar-border);
      display: flex;
      flex-direction: column;
      align-items: center;
      padding-top: 8px;
      gap: 4px;
    }
    .sl-tab {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      cursor: pointer;
      color: var(--vscode-activityBar-inactiveForeground);
      font-size: 18px; /* Icon size */
      position: relative;
    }
    .sl-tab:hover {
      color: var(--vscode-activityBar-foreground);
      background: rgba(255, 255, 255, 0.1);
    }
    .sl-tab.active {
      color: var(--vscode-activityBar-foreground);
    }
    .sl-tab.active::before {
      content: "";
      position: absolute;
      left: -4px;
      top: 8px;
      bottom: 8px;
      width: 3px;
      background: var(--vscode-activityBar-activeBorder);
      border-radius: 2px;
    }
    
    .setup-right-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      background: var(--vscode-sideBar-background);
    }
    .setup-page {
      display: none;
      padding: 10px;
      flex-direction: column;
      gap: 8px;
    }
    .setup-page.active {
      display: flex;
    }
    .sp-header {
      font-size: 11px;
      font-weight: bold;
      text-transform: uppercase;
      color: var(--vscode-sideBarSectionHeader-foreground);
      padding-bottom: 6px;
      border-bottom: 1px solid var(--vscode-panel-border);
      margin-bottom: 6px;
    }
    .sp-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 6px 8px;
      border-radius: 4px;
      cursor: pointer;
      background: var(--vscode-list-hoverBackground);
      border: 1px solid transparent;
      margin-bottom: 4px;
    }
    .sp-item-title { font-weight: 500; font-size: 12px; }
    .sp-item-desc { font-size: 11px; opacity: 0.8; }
    .sp-item:hover {
      background: var(--vscode-list-activeSelectionBackground);
      color: var(--vscode-list-activeSelectionForeground);
    }

    /* Sub-menu styles within Setup Page */
    .sp-accordion {
      border: 1px solid var(--vscode-panel-border);
      border-radius: 4px;
      margin-bottom: 6px;
      overflow: hidden;
      background: var(--vscode-editorWidget-background);
    }
    .sp-accordion-header {
      padding: 6px 8px;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: var(--vscode-editor-inactiveSelectionBackground);
      font-weight: 600;
      font-size: 11px;
    }
    .sp-accordion-header:hover {
      background: var(--vscode-list-hoverBackground);
    }
    .sp-accordion-body {
      display: none;
      padding: 4px;
      flex-direction: column;
      gap: 2px;
    }
    .sp-accordion.open .sp-accordion-body {
      display: flex;
    }
    .sp-sub-item {
      padding: 4px 8px;
      font-size: 11px;
      cursor: pointer;
      border-radius: 3px;
      color: var(--vscode-foreground);
    }
    .sp-sub-item:hover {
      background: var(--vscode-list-hoverBackground);
    }

    /* LEGACY/UNUSED CSS REMOVED OR KEPT MINIMAL IF NEEDED */
    .setup-nav { display: none; } 
    .setup-section { display: none; }

    .sidebar-pane button,
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
    .sidebar-pane button.secondary,
    .actions button.secondary,
    .inline button.secondary,
    .dialog-actions button.secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    .sidebar-pane button.is-active {
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
    .topbar-actions {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
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
    .sc-modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 999;
      align-items: center;
      justify-content: center;
    }
    .sc-modal.is-open {
      display: flex;
    }
    .sc-modal-container {
      background: var(--vscode-editorWidget-background);
      border: 1px solid var(--vscode-widget-border);
      width: 900px;
      height: 700px;
      max-width: 95%;
      max-height: 95%;
      box-shadow: 0 12px 24px rgba(0, 0, 0, 0.6);
      display: grid;
      grid-template-columns: 200px 1fr;
      grid-template-rows: auto 1fr auto;
      overflow: hidden;
      border-radius: 6px;
    }
    .sc-modal-header {
      grid-column: 1 / span 2;
      padding: 12px 16px;
      background: var(--vscode-titleBar-activeBackground);
      color: var(--vscode-titleBar-activeForeground);
      border-bottom: 1px solid var(--vscode-widget-border);
      font-weight: 600;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .sc-modal-close {
      cursor: pointer;
      opacity: 0.8;
      font-size: 16px;
    }
    .sc-modal-close:hover { opacity: 1; }
    
    .sc-sidebar {
      background: var(--vscode-sideBar-background);
      border-right: 1px solid var(--vscode-widget-border);
      display: flex;
      flex-direction: column;
      padding: 10px 0;
    }
    .sc-nav-item {
      padding: 10px 16px;
      cursor: pointer;
      color: var(--vscode-sideBar-foreground);
      border-left: 3px solid transparent;
      opacity: 0.8;
    }
    .sc-nav-item:hover {
      background: var(--vscode-list-hoverBackground);
      opacity: 1;
    }
    .sc-nav-item.active {
      background: var(--vscode-list-activeSelectionBackground);
      color: var(--vscode-list-activeSelectionForeground);
      border-left-color: var(--vscode-activityBar-activeBorder);
      font-weight: 600;
      opacity: 1;
    }
    
    .sc-content {
      background: var(--vscode-editor-background);
      padding: 24px;
      overflow: auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    
    .sc-tab-pane {
      display: none;
      flex-direction: column;
      height: 100%;
      gap: 12px;
    }
    .sc-tab-pane.active {
      display: flex;
    }
    
    .sc-section-title {
      font-size: 14px;
      font-weight: 600;
      border-bottom: 1px solid var(--vscode-widget-border);
      padding-bottom: 8px;
      margin-bottom: 12px;
      color: var(--vscode-foreground);
    }

    .readonly-tag {
      display: none;
      margin-left: 6px;
      padding: 1px 6px;
      border-radius: 10px;
      border: 1px solid var(--vscode-errorForeground);
      color: var(--vscode-errorForeground);
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.02em;
    }
    .status-chip {
      display: inline-block;
      padding: 1px 8px;
      border-radius: 999px;
      border: 1px solid var(--vscode-panel-border);
      font-size: 11px;
      line-height: 1.4;
      background: var(--vscode-editorWidget-background);
    }
    .status-chip.idle {
      color: var(--vscode-descriptionForeground);
    }
    .status-chip.active {
      color: var(--vscode-testing-iconPassed);
      border-color: var(--vscode-testing-iconPassed);
    }
    .status-chip.active-readonly {
      color: var(--vscode-errorForeground);
      border-color: var(--vscode-errorForeground);
    }
    tr.workspace-row-active-readonly {
      background: color-mix(in srgb, var(--vscode-editor-background) 88%, var(--vscode-errorForeground) 12%);
    }

    .sc-modal-footer {
      grid-column: 1 / span 2;
      border-top: 1px solid var(--vscode-widget-border);
      padding: 12px 16px;
      text-align: right;
      background: var(--vscode-editorWidget-background);
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    
    /* Layout Overrides for inside modal */
    .sc-content .topology-layout-new {
       height: 100%;
       min-height: 400px;
       border: 1px solid var(--vscode-widget-border);
    }
    .sc-content .device-manager {
       max-height: 200px;
    }

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
    <div class="app">
      <!-- Activity Bar / Nav Stub -->
      <aside class="sidebar-stub">
        <div class="stub-tab active" data-target="home" title="Home / Channels">
           <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor"><path d="M8.354 1.146a.5.5 0 0 0-.708 0l-6 6A.5.5 0 0 0 1.5 7.5v7a.5.5 0 0 0 .5.5h4.5a.5.5 0 0 0 .5-.5v-4h2v4a.5.5 0 0 0 .5.5H14a.5.5 0 0 0 .5-.5v-7a.5.5 0 0 0-.146-.354L13 5.793V2.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v1.293L8.354 1.146zM2.5 14V7.707l5.5-5.5 5.5 5.5V14H10v-4a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5v4H2.5z"/></svg>
        </div>
        <div style="height:1px; width:32px; background:var(--vscode-activityBar-foreground); opacity:0.2; margin:4px 0;"></div>
        
        <div class="stub-tab" data-target="stim" title="Stimulus">
          <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor"><path d="M9.5 1.5a.5.5 0 0 1 .5.5v2.793l2.854 2.853a.5.5 0 0 1 0 .708l-2.854 2.853V14a.5.5 0 0 1-1 0v-2.793L6.146 8.354a.5.5 0 0 1 0-.708L9 4.793V2a.5.5 0 0 1 .5-.5z"/></svg>
        </div>
        <div class="stub-tab" data-target="resp" title="Response">
          <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor"><path d="M4 2.5l.5-.5h7l.5.5v11l-.5.5h-7l-.5-.5v-11zM5 3v10h6V3H5z"/></svg>
        </div>
        <div class="stub-tab" data-target="cal" title="Calibration">
          <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor"><path d="M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2zm0 11a5 5 0 1 1 0-10 5 5 0 0 1 0 10zM8 4a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"/></svg>
        </div>
        <div class="stub-tab" data-target="trig" title="Trigger">
          <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor"><path d="M11.354 5.646L8.5 2.793V1.5a.5.5 0 0 0-1 0v1.293L4.646 5.646a.5.5 0 1 0 .708.708L7.5 4.207V13.5a.5.5 0 0 0 1 0V4.207l2.146 2.147a.5.5 0 0 0 .708-.708z"/></svg>
        </div>
        <div class="stub-tab" data-target="anal" title="Analysis">
          <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor"><path d="M14.5 13.5h-13v-1h13v1zm0-3h-13v-1h13v1zm0-3h-13v-1h13v1zm-4-4v-1h-6v1h6z"/></svg>
        </div>
        <div style="flex:1"></div>
        <div class="stub-tab" data-target="sys" title="System">
          <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 13a6 6 0 1 1 0-12 6 6 0 0 1 0 12zm0-9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm0 5a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"/></svg>
        </div>
      </aside>

      <!-- Flyout Drawer -->
      <div id="setupDrawer" class="setup-drawer">
         <div class="drawer-header">
           <div id="drawerBreadcrumb" class="drawer-breadcrumb">
               <span>Setup</span><span>/</span><span id="bcMain">Stimulus</span><span id="bcSubSep">/</span><span id="bcSub">Frequency</span>
           </div>
           <!-- <span class="drawer-close" id="drawerClose">✕</span> Optional close X if needed -->
         </div>
         <div class="drawer-content">
            <!-- STIMULUS -->
            <div id="page-stim" class="setup-page active">
              <div class="sp-tabs">
                  <div class="sp-tab active" data-tab="stim-freq">Frequency<br>Range</div>
                  <div class="sp-tab" data-tab="stim-pwr">Power<br>Level</div>
                  <div class="sp-tab" data-tab="stim-swp">Sweep<br>Points</div>
              </div>
              
              <div id="panel-stim-freq" class="sp-content-panel active">
                  <div class="sp-item" data-view="workspace">
                     <div class="sp-item-title">Frequency Control</div>
                  </div>
                  <div class="line"><label>Start</label><input value="10 MHz"></div>
                  <div class="line"><label>Stop</label><input value="6 GHz"></div>
                  <div class="line"><label>Center</label><input value="3.005 GHz"></div>
                  <div class="line"><label>Span</label><input value="5.99 GHz"></div>
              </div>
              
              <div id="panel-stim-pwr" class="sp-content-panel">
                 <div class="sp-item" data-action="setup-placeholder">Power Settings</div>
                 <div class="line"><label>Source Power</label><input value="-10 dBm"></div>
                 <div class="line"><label>Slope</label><input value="0 dB/GHz"></div>
              </div>

              <div id="panel-stim-swp" class="sp-content-panel">
                 <div class="sp-item" data-view="scan">Sweep Settings</div>
                 <div class="line"><label>Points</label><input value="201"></div>
                 <div class="line"><label>IF Bandwidth</label><input value="1 kHz"></div>
              </div>
            </div>

            <!-- RESPONSE -->
            <div id="page-resp" class="setup-page">
              <div class="sp-tabs">
                  <div class="sp-tab active" data-tab="resp-meas">Measure<br>Param</div>
                  <div class="sp-tab" data-tab="resp-fmt">Format<br>Scale</div>
              </div>
              
              <div id="panel-resp-meas" class="sp-content-panel active">
                   <div class="sp-item" data-action="setup-placeholder">S-Parameters</div>
                   <div class="chip-list">
                       <span class="chip is-bound">S11</span>
                       <span class="chip">S21</span>
                       <span class="chip">S12</span>
                       <span class="chip">S22</span>
                   </div>
              </div>
              
              <div id="panel-resp-fmt" class="sp-content-panel">
                  <div class="sp-item" data-action="setup-placeholder">Format</div>
                  <div class="line">
                      <select>
                          <option>Log Mag</option>
                          <option>Phase</option>
                          <option>Smith Chart</option>
                      </select>
                  </div>
                  <div class="sp-item" data-action="setup-placeholder">Autoscale</div>
              </div>
            </div>

            <!-- CALIBRATION -->
            <div id="page-cal" class="setup-page">
              <div class="sp-tabs">
                  <div class="sp-tab active" data-tab="cal-basic">Basic<br>Cal</div>
                  <div class="sp-tab" data-tab="cal-adv">Advanced<br>Settings</div>
              </div>
              <div id="panel-cal-basic" class="sp-content-panel active">
                  <div class="sp-item" data-view="topology">Launch Topology Editor</div>
                  <div class="sp-item" data-action="open-visual-topology">Port Manager</div>
              </div>
              <div id="panel-cal-adv" class="sp-content-panel">
                  <div class="sp-item">Cal Kit Definitions</div>
              </div>
            </div>
            
            <!-- TRIGGER -->
            <div id="page-trig" class="setup-page">
               <div class="sp-tabs"><div class="sp-tab active" data-tab="trig-src">Source</div></div>
               <div id="panel-trig-src" class="sp-content-panel active">
                   <div class="sp-item" data-view="scan">Trigger Source</div>
                   <div class="line">
                       <select><option>Internal</option><option>External</option><option>Manual</option></select>
                   </div>
               </div>
            </div>
            
            <!-- ANALYSIS -->
             <div id="page-anal" class="setup-page">
               <div class="sp-tabs"><div class="sp-tab active" data-tab="anal-mk">Markers</div></div>
               <div id="panel-anal-mk" class="sp-content-panel active">
                   <div class="sp-item" data-view="waveform">Marker Setup</div>
                   <div class="actions"><button class="secondary">+ Add Marker</button></div>
               </div>
            </div>
            
             <!-- SYSTEM -->
             <div id="page-sys" class="setup-page">
               <div class="sp-tabs"><div class="sp-tab active" data-tab="sys-ws">Workspace</div></div>
               <div id="panel-sys-ws" class="sp-content-panel active">
                   <div class="sp-item" data-view="workspace">Workspace Manager</div>
               </div>
            </div>
         </div>
      </div>

    <main class="content-area"> <!-- Was main.content -->

      <div class="topbar">
        <strong>${title}</strong>
        <div class="topbar-actions">
          <button id="workspaceStatusBtn" class="secondary">WS: <span id="workspaceStatusText">(未激活)</span><span id="workspaceReadonlyTag" class="readonly-tag">READONLY</span></button>
          <button id="topbarWorkspaceBtn" class="secondary">Workspace</button>
          <div class="status" id="statusLine">准备就绪</div>
        </div>
      </div>

      <!-- Workspace & Topology Views Moved to Modal -->
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

  <!-- System Configuration Modal -->
  <div id="sysConfigModal" class="sc-modal" role="dialog">
    <div class="sc-modal-container">
      
      <!-- Header -->
      <div class="sc-modal-header">
        <span>⚙️ System Configuration</span>
        <span id="closeSysconfig" class="sc-modal-close">✕</span>
      </div>

      <!-- Sidebar -->
      <div class="sc-sidebar">
        <div class="sc-nav-item active" data-target="sys-topo">Topology</div>
        <div class="sc-nav-item" data-target="sys-ws">Workspace List</div>
        <div class="sc-nav-item" data-target="sys-hw">Hardware</div>
        <div class="sc-nav-item" data-target="sys-lic">Licenses</div>
      </div>

      <!-- Main Content -->
      <div class="sc-content">
        
        <!-- Tab: Topology (Visual Editor) -->
        <div id="tab-pane-sys-topo" class="sc-tab-pane active">
           <div class="sc-section-title">Visual Topology Editor</div>
           
           <div class="topology-mode">
              <button id="topologyVisualMode">Visual Mode</button>
              <button id="topologyYamlMode" class="secondary">YAML Mode</button>
              <button id="btnAutoLayout" class="secondary">Auto Layout</button>
              <button id="btnAddVirtualPort">Add Port</button>
              <button id="btnAddBoard">Add Board</button>
           </div>

           <!-- Topology Visual Canvas -->
           <div id="topologyVisualSection" class="topology-layout-new" style="flex:1; display:flex; flex-direction:column; min-height:0;">
              <div class="topology-toolbar">
                 <div class="help" style="font-size:12px;">Drag headers to move | Drag ports to connect | Click lines to delete</div>
              </div>
              <div id="topologyCanvasContainer" class="topology-canvas-container" style="flex:1; overflow:hidden;">
                <svg id="topologyConnections" width="100%" height="100%" style="position:absolute; top:0; left:0; z-index:0; pointer-events:none;">
                   <defs>
                      <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#569cd6" />
                      </marker>
                   </defs>
                </svg>
                <div id="topologyNodes" style="position:absolute; top:0; left:0; z-index:1; width:100%; height:100%;"></div>
              </div>
           </div>

           <!-- Helper YAML Section (Hidden by default) -->
           <div id="topologyYamlSection" class="hidden" style="flex:1;">
              <textarea id="topologyYaml" style="width:100%; height:100%; font-family:monospace;" placeholder="YAML definition..."></textarea>
           </div>
        </div>
        
        <!-- Tab: Workspace (Management) -->
        <div id="tab-pane-sys-ws" class="sc-tab-pane">
            <div class="sc-section-title">Workspace Manager</div>
            <div class="card">
               <div class="line inline">
                 <label>Current Workspace ID:</label>
                 <input id="workspaceId" placeholder="e.g. ws-default" style="flex:1;" />
                 <label>Topology ID:</label>
                 <input id="topologyId" placeholder="e.g. topo-main" style="flex:1;" />
               </div>
               <div class="actions" style="margin-top:8px;">
                 <button id="btnWorkspaceLoad">Load</button>
                 <button id="btnWorkspaceSave">Save</button>
                 <button id="btnWorkspaceSaveActivate" class="secondary">Save & Activate</button>
                 <button id="btnRefreshService" class="secondary">Refresh Service</button>
               </div>
               <div id="serviceStatus" class="help" style="margin-top:6px;">Service: Unknown</div>
               <div id="precheckDiagnostics" class="help" style="margin-top:8px; padding:8px; border:1px solid var(--vscode-panel-border); border-radius:4px; display:none;"></div>
            </div>
            
            <div class="table-wrap" style="flex:1; margin-top:12px;">
              <table>
                <thead><tr><th>Workspace</th><th>Topology</th><th>Updated</th><th>Status</th><th>Action</th></tr></thead>
                <tbody id="workspaceRows"></tbody>
              </table>
            </div>
            <!-- Hidden Helpers for old logic if needed -->
            <button id="btnTopologyLoad" style="display:none;">(Hidden Load)</button>
            <button id="btnTopologyToYaml" style="display:none;">(Hidden Sync)</button>
            <button id="btnTopologySave" style="display:none;">(Hidden Save)</button>
            <button id="btnTopologySaveActivate" style="display:none;">(Hidden SaveAct)</button>
        </div>

        <!-- Tab: Hardware (Device Manager) -->
        <div id="tab-pane-sys-hw" class="sc-tab-pane">
            <div class="sc-section-title">Hardware & Device Registry</div>
             <div class="device-manager" style="flex:1; max-height:none;">
                <div class="line inline" style="margin:0; margin-bottom:8px;">
                  <button id="btnAddDevice">Add Device Definition</button>
                  <span class="help">Define physical or virtual hardware resources here.</span>
                </div>
                <div id="deviceManagerRows">Waiting for devices...</div>
             </div>
        </div>

        <!-- Tab: Licenses -->
        <div id="tab-pane-sys-lic" class="sc-tab-pane">
             <div class="sc-section-title">License Management</div>
             <div class="help">No license modules loaded.</div>
        </div>

      </div>
      
      <!-- Footer -->
      <div class="sc-modal-footer">
        <span style="margin-right:auto; font-size:11px; color:#d85555; padding-top:6px;">⚠️ Applying changes might reset measurement state.</span>
        <button id="cancelSysconfig" class="secondary">Close</button>
        <button id="applySysconfig">Apply & Save Topology</button>
      </div>
      
    </div>
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
      workspaceReadonly: false,
      lastSaveRequest: null,
      lastPrecheck: null,
      lastPrecheckUpdatedAtMs: 0,
      lastLockSnapshot: null,
      lastLockSnapshotUpdatedAtMs: 0,
      lastDiagnosticPayload: null,
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
    const precheckDiagnostics = document.getElementById("precheckDiagnostics");
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
    const workspaceStatusText = document.getElementById("workspaceStatusText");
    const workspaceReadonlyTag = document.getElementById("workspaceReadonlyTag");
    const workspaceStatusBtn = document.getElementById("workspaceStatusBtn");
    const topbarWorkspaceBtn = document.getElementById("topbarWorkspaceBtn");

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

      // If switching to waveform, we might want to ensure drawer is closed or home tab is active
      if (viewName === "waveform") {
         const drawer = document.getElementById('setupDrawer');
         if (drawer) drawer.classList.remove('open');
         const homeTab = document.querySelector('[data-target="home"]');
         if (homeTab) {
             document.querySelectorAll('.stub-tab').forEach(t => t.classList.remove('active'));
             homeTab.classList.add('active');
         }
      }
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
        const isActive = item.workspaceId === state.activeWorkspaceId;
        const active = isActive
          ? (state.workspaceReadonly ? "active-readonly" : "active")
          : "idle";
        if (active === "active-readonly") {
          tr.className = "workspace-row-active-readonly";
        }
        tr.innerHTML =
          '<td>' + escapeHtml(item.workspaceId) + '</td>' +
          '<td>' + escapeHtml(item.topologyId) + '</td>' +
          '<td>' + escapeHtml(formatDateTime(item.updatedAtMs)) + '</td>' +
          '<td><span class="status-chip ' + escapeAttr(active) + '">' + escapeHtml(active) + '</span></td>' +
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

    function setWorkspaceReadonly(readonly, reason) {
      state.workspaceReadonly = Boolean(readonly);
      if (workspaceReadonlyTag) {
        workspaceReadonlyTag.style.display = state.workspaceReadonly ? "inline-block" : "none";
      }
      const buttonIds = [
        "btnWorkspaceSave",
        "btnWorkspaceSaveActivate",
        "btnTopologySave",
        "btnTopologySaveActivate",
        "btnAddVirtualPort",
        "btnAddBoard",
        "btnAutoLayout",
        "applySysconfig",
      ];
      buttonIds.forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
          el.disabled = state.workspaceReadonly;
          el.title = state.workspaceReadonly ? "只读模式：资源占用中，禁止编辑" : "";
        }
      });

      const canvasContainer = document.getElementById("topologyCanvasContainer");
      if (canvasContainer) {
        canvasContainer.style.pointerEvents = state.workspaceReadonly ? "none" : "auto";
        canvasContainer.style.opacity = state.workspaceReadonly ? "0.9" : "1";
      }

      if (state.workspaceReadonly) {
        setStatus(reason || "只读模式：资源占用中，可查看不可编辑");
      }

      if (Array.isArray(state.items) && state.items.length > 0) {
        renderWorkspaceRows();
      }
    }

    function submitWorkspaceSave(activate, closeModalAfter) {
      if (state.workspaceReadonly) {
        setStatus("只读模式下禁止保存，请先解除冲突后重试");
        return;
      }
      const wsValue = String(workspaceId?.value || "").trim();
      const topoValue = String(topologyId?.value || "").trim() || "topo-main";
      if (!wsValue) {
        setStatus("请先填写 Workspace ID");
        return;
      }
      state.lastSaveRequest = {
        workspaceId: wsValue,
        topologyId: topoValue,
        activate: Boolean(activate),
      };
      setStatus(
        (activate ? "正在保存并激活工作区: " : "正在保存工作区: ") +
        wsValue +
        " (topology=" +
        topoValue +
        ")",
      );
      post("workspace-save", {
        workspaceId: wsValue,
        topologyId: topoValue,
        topologyYaml: getTopologyYamlForSave(),
        activate: Boolean(activate),
      });
      if (closeModalAfter) {
        closeSystemModal();
      }
    }

    function extractSelectorsFromPrecheck(precheck) {
      const conflicts = Array.isArray(precheck && precheck.lockConflicts) ? precheck.lockConflicts : [];
      const selectorMap = new Map();
      conflicts.forEach((item) => {
        const selector = item && item.selector ? item.selector : {};
        const resourceId = String(selector.resourceId || "").trim();
        if (!resourceId) {
          return;
        }
        selectorMap.set(resourceId, {
          type: 1,
          resourceId,
        });
      });
      return Array.from(selectorMap.values());
    }

    function aggregateConflictGroups(lockConflicts) {
      const resourceMap = new Map();
      lockConflicts.forEach((item) => {
        const selector = item && item.selector ? item.selector : {};
        const owner = item && item.holderOwner ? item.holderOwner : {};
        const resourceId = String(selector.resourceId || "unknown-resource");
        const holderWorkspace = String(owner.workspaceId || "unknown-workspace");
        const holderActor = String(owner.actor || "unknown-actor");
        const holderKey = holderWorkspace + "/" + holderActor;

        let group = resourceMap.get(resourceId);
        if (!group) {
          group = {
            resourceId,
            total: 0,
            holders: new Map(),
          };
          resourceMap.set(resourceId, group);
        }

        group.total += 1;
        const holderCount = Number(group.holders.get(holderKey) || 0);
        group.holders.set(holderKey, holderCount + 1);
      });

      return Array.from(resourceMap.values())
        .map((group) => ({
          resourceId: group.resourceId,
          total: group.total,
          holders: Array.from(group.holders.entries())
            .map((entry) => ({ holder: entry[0], count: Number(entry[1]) }))
            .sort((left, right) => {
              if (right.count !== left.count) {
                return right.count - left.count;
              }
              return left.holder.localeCompare(right.holder);
            }),
        }))
        .sort((left, right) => {
          if (right.total !== left.total) {
            return right.total - left.total;
          }
          return left.resourceId.localeCompare(right.resourceId);
        });
    }

    function aggregateSnapshotGroups(snapshotLeases) {
      const resourceMap = new Map();
      snapshotLeases.forEach((lease) => {
        const selector = lease && lease.selector ? lease.selector : {};
        const owner = lease && lease.owner ? lease.owner : {};
        const resourceId = String(selector.resourceId || "unknown-resource");
        const holderWorkspace = String(owner.workspaceId || "unknown-workspace");
        const holderActor = String(owner.actor || "unknown-actor");
        const holderKey = holderWorkspace + "/" + holderActor;

        let group = resourceMap.get(resourceId);
        if (!group) {
          group = {
            resourceId,
            total: 0,
            holders: new Map(),
          };
          resourceMap.set(resourceId, group);
        }

        group.total += 1;
        let holderInfo = group.holders.get(holderKey);
        if (!holderInfo) {
          holderInfo = { count: 0, leaseIds: [] };
          group.holders.set(holderKey, holderInfo);
        }
        holderInfo.count += 1;
        const leaseId = String(lease && lease.leaseId ? lease.leaseId : "");
        if (leaseId && holderInfo.leaseIds.length < 2) {
          holderInfo.leaseIds.push(leaseId);
        }
      });

      return Array.from(resourceMap.values())
        .map((group) => ({
          resourceId: group.resourceId,
          total: group.total,
          holders: Array.from(group.holders.entries())
            .map((entry) => ({
              holder: entry[0],
              count: Number(entry[1].count || 0),
              leaseIds: Array.isArray(entry[1].leaseIds) ? entry[1].leaseIds : [],
            }))
            .sort((left, right) => {
              if (right.count !== left.count) {
                return right.count - left.count;
              }
              return left.holder.localeCompare(right.holder);
            }),
        }))
        .sort((left, right) => {
          if (right.total !== left.total) {
            return right.total - left.total;
          }
          return left.resourceId.localeCompare(right.resourceId);
        });
    }

    async function copyTextToClipboard(text) {
      const content = String(text || "");
      if (!content) {
        return false;
      }
      try {
        if (navigator && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
          await navigator.clipboard.writeText(content);
          return true;
        }
      } catch {
      }

      const textarea = document.createElement("textarea");
      textarea.value = content;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      let copied = false;
      try {
        copied = document.execCommand("copy");
      } catch {
        copied = false;
      }
      document.body.removeChild(textarea);
      return copied;
    }

    function buildPrecheckCopySummary() {
      if (state.lastDiagnosticPayload && typeof state.lastDiagnosticPayload === "object") {
        const payload = state.lastDiagnosticPayload;
        const lines = [];
        lines.push("[XSWL VNA] Precheck Diagnostics");
        lines.push("workspace=" + String(payload.workspaceId || "unknown-workspace") + ", topology=" + String(payload.topologyId || "unknown-topology"));
        lines.push("code=" + String(payload.code || "PRECHECK_FAILED") + ", message=" + String(payload.message || "precheck failed"));
        lines.push("updatedAt=" + String(payload.updatedAtIso || "-"));
        lines.push("schema=" + String(payload.schemaVersion || "-") + ", requestId=" + String(payload.requestId || "-") + ", channel=" + String(payload.channel || "-"));
        lines.push(
          "topologyErrors=" +
          String(payload.counts && typeof payload.counts.topologyErrors === "number" ? payload.counts.topologyErrors : 0) +
          ", lockConflicts=" +
          String(payload.counts && typeof payload.counts.lockConflicts === "number" ? payload.counts.lockConflicts : 0) +
          ", snapshotLeases=" +
          String(payload.counts && typeof payload.counts.snapshotLeases === "number" ? payload.counts.snapshotLeases : -1),
        );
        lines.push("fingerprint=" + String(payload.conflictFingerprint || "-"));
        if (payload.retryAdvice) {
          lines.push(
            "retryAdvice=" +
            String(payload.retryAdvice.recommendation || "-") +
            ", delayMs=" +
            String(payload.retryAdvice.retryDelayMs || 0) +
            ", autoRetry=" +
            String(Boolean(payload.retryAdvice.autoRetrySuggested)),
          );
        }
        return lines.join("\n");
      }

      const precheck = state.lastPrecheck || null;
      if (!precheck) {
        return "No precheck diagnostics available.";
      }

      const workspaceValue = String(workspaceId && workspaceId.value ? workspaceId.value : "").trim() || "unknown-workspace";
      const topologyValue = String(topologyId && topologyId.value ? topologyId.value : "").trim() || "unknown-topology";
      const code = String(precheck.code || "PRECHECK_FAILED");
      const message = String(precheck.message || "precheck failed");
      const topologyErrors = Array.isArray(precheck.topologyErrors) ? precheck.topologyErrors : [];
      const lockConflicts = Array.isArray(precheck.lockConflicts) ? precheck.lockConflicts : [];
      const conflictGroups = aggregateConflictGroups(lockConflicts);
      const snapshot = state.lastLockSnapshot && Array.isArray(state.lastLockSnapshot.leases)
        ? state.lastLockSnapshot
        : null;
      const snapshotGroups = snapshot ? aggregateSnapshotGroups(snapshot.leases) : [];

      const lines = [];
      lines.push("[XSWL VNA] Precheck Diagnostics");
      lines.push("workspace=" + workspaceValue + ", topology=" + topologyValue);
      lines.push("code=" + code + ", message=" + message);
      lines.push("updatedAt=" + formatDateTime(state.lastPrecheckUpdatedAtMs));
      lines.push("topologyErrors=" + String(topologyErrors.length) + ", lockConflicts=" + String(lockConflicts.length));

      if (topologyErrors.length > 0) {
        lines.push("TopologyErrors:");
        topologyErrors.slice(0, 5).forEach((item) => {
          lines.push("- " + String(item && item.message ? item.message : "invalid topology"));
        });
      }

      if (conflictGroups.length > 0) {
        lines.push("ConflictGroups:");
        conflictGroups.slice(0, 8).forEach((group) => {
          lines.push("- resource=" + group.resourceId + ", conflicts=" + String(group.total));
          group.holders.slice(0, 4).forEach((holder) => {
            lines.push("  - holder=" + holder.holder + ", count=" + String(holder.count));
          });
        });
      }

      if (!snapshot) {
        lines.push("LockSnapshot: unavailable");
      } else {
        lines.push("LockSnapshot: leases=" + String(snapshot.leases.length) + ", updatedAt=" + formatDateTime(state.lastLockSnapshotUpdatedAtMs));
        snapshotGroups.slice(0, 8).forEach((group) => {
          lines.push("- resource=" + group.resourceId + ", leases=" + String(group.total));
          group.holders.slice(0, 4).forEach((holder) => {
            const leaseText = holder.leaseIds.length > 0 ? ", lease=" + holder.leaseIds.join(",") : "";
            lines.push("  - holder=" + holder.holder + ", count=" + String(holder.count) + leaseText);
          });
        });
      }

      return lines.join("\n");
    }

    function buildPrecheckCopyJson() {
      if (state.lastDiagnosticPayload && typeof state.lastDiagnosticPayload === "object") {
        return JSON.stringify(state.lastDiagnosticPayload, null, 2);
      }
      const precheck = state.lastPrecheck || null;
      if (!precheck) {
        return "{}";
      }
      const workspaceValue = String(workspaceId && workspaceId.value ? workspaceId.value : "").trim() || "unknown-workspace";
      const topologyValue = String(topologyId && topologyId.value ? topologyId.value : "").trim() || "unknown-topology";
      const lockConflicts = Array.isArray(precheck.lockConflicts) ? precheck.lockConflicts : [];
      const conflictGroups = aggregateConflictGroups(lockConflicts);
      const snapshot = state.lastLockSnapshot && Array.isArray(state.lastLockSnapshot.leases)
        ? state.lastLockSnapshot
        : null;
      const snapshotGroups = snapshot ? aggregateSnapshotGroups(snapshot.leases) : [];
      const payload = {
        workspaceId: workspaceValue,
        topologyId: topologyValue,
        code: String(precheck.code || "PRECHECK_FAILED"),
        message: String(precheck.message || "precheck failed"),
        updatedAt: formatDateTime(state.lastPrecheckUpdatedAtMs),
        counts: {
          topologyErrors: Array.isArray(precheck.topologyErrors) ? precheck.topologyErrors.length : 0,
          lockConflicts: lockConflicts.length,
          snapshotLeases: snapshot && Array.isArray(snapshot.leases) ? snapshot.leases.length : -1,
        },
        conflictGroups,
        snapshotGroups,
      };
      return JSON.stringify(payload, null, 2);
    }

    function applyRetryAdviceAction() {
      const payload = state.lastDiagnosticPayload && typeof state.lastDiagnosticPayload === "object"
        ? state.lastDiagnosticPayload
        : null;
      const advice = payload && payload.retryAdvice ? payload.retryAdvice : null;
      const recommendation = advice ? String(advice.recommendation || "") : "";

      if (recommendation === "retry-save") {
        if (state.workspaceReadonly) {
          setWorkspaceReadonly(false, "已退出只读模式，执行建议动作：重试保存");
        }
        const last = state.lastSaveRequest;
        if (last && last.workspaceId) {
          workspaceId.value = last.workspaceId;
          topologyId.value = last.topologyId;
          submitWorkspaceSave(Boolean(last.activate), false);
        } else {
          submitWorkspaceSave(true, false);
        }
        return;
      }

      if (recommendation === "switch-readonly") {
        setWorkspaceReadonly(true, "已执行建议动作：切换只读模式");
        openSystemModal("sys-topo");
        return;
      }

      if (recommendation === "fix-topology") {
        setWorkspaceReadonly(false, "已执行建议动作：请修复拓扑后重试");
        openSystemModal("sys-topo");
        setTopologyMode("yaml");
        setStatus("建议已执行：切换到 YAML 模式，请先修复拓扑错误");
        return;
      }

      if (recommendation === "contact-holder") {
        const selectors = extractSelectorsFromPrecheck(state.lastPrecheck);
        post("workspace-lock-snapshot", {
          workspaceId: String(workspaceId?.value || "").trim(),
          topologyYaml: getTopologyYamlForSave(),
          selectors,
        });
        setStatus("建议已执行：已刷新锁快照，请联系占用方后重试");
        return;
      }

      setStatus("暂无可执行的建议动作");
    }

    function renderPrecheckDiagnostics(precheck) {
      if (!precheckDiagnostics) {
        return;
      }
      if (!precheck) {
        state.lastPrecheck = null;
        state.lastPrecheckUpdatedAtMs = 0;
        state.lastLockSnapshot = null;
        state.lastLockSnapshotUpdatedAtMs = 0;
        state.lastDiagnosticPayload = null;
        precheckDiagnostics.style.display = "none";
        precheckDiagnostics.innerHTML = "";
        return;
      }

      state.lastPrecheck = precheck;
      state.lastPrecheckUpdatedAtMs = Date.now();

      const code = String(precheck.code || "PRECHECK_FAILED");
      const message = String(precheck.message || "precheck failed");
      const topologyErrors = Array.isArray(precheck.topologyErrors) ? precheck.topologyErrors : [];
      const lockConflicts = Array.isArray(precheck.lockConflicts) ? precheck.lockConflicts : [];
      const currentWorkspaceId = String(workspaceId && workspaceId.value ? workspaceId.value : "").trim() || "unknown-workspace";
      const currentTopologyId = String(topologyId && topologyId.value ? topologyId.value : "").trim() || "unknown-topology";
      const precheckUpdatedAt = formatDateTime(state.lastPrecheckUpdatedAtMs);

      const lines = [];
      lines.push('<div style="font-weight:600; color:var(--vscode-errorForeground);">Precheck Blocked: ' + escapeHtml(code) + '</div>');
      lines.push('<div style="margin-top:4px;">' + escapeHtml(message) + '</div>');
      lines.push('<div style="margin-top:4px; opacity:0.8;">workspace=' + escapeHtml(currentWorkspaceId) + ', topology=' + escapeHtml(currentTopologyId) + ', updatedAt=' + escapeHtml(precheckUpdatedAt) + '</div>');
      if (state.lastDiagnosticPayload && typeof state.lastDiagnosticPayload === "object") {
        const payload = state.lastDiagnosticPayload;
        const schemaVersion = String(payload.schemaVersion || "-");
        const requestId = String(payload.requestId || "-");
        const channel = String(payload.channel || "-");
        lines.push('<div style="margin-top:2px; opacity:0.8;">schema=' + escapeHtml(schemaVersion) + ', requestId=' + escapeHtml(requestId) + ', channel=' + escapeHtml(channel) + '</div>');
        lines.push('<div style="margin-top:2px; opacity:0.8;">fingerprint=' + escapeHtml(String(payload.conflictFingerprint || '-')) + '</div>');
        if (payload.retryAdvice) {
          lines.push(
            '<div style="margin-top:2px; opacity:0.8;">retry=' +
            escapeHtml(String(payload.retryAdvice.recommendation || '-')) +
            ', delayMs=' +
            escapeHtml(String(payload.retryAdvice.retryDelayMs || 0)) +
            ', autoRetry=' +
            escapeHtml(String(Boolean(payload.retryAdvice.autoRetrySuggested))) +
            '</div>',
          );
        }
      }

      if (topologyErrors.length > 0) {
        lines.push('<div style="margin-top:8px; font-weight:600;">Topology Errors</div>');
        lines.push('<ul style="margin:4px 0 0 16px; padding:0;">');
        topologyErrors.slice(0, 5).forEach((item) => {
          lines.push('<li>' + escapeHtml(String(item.message || "invalid topology")) + '</li>');
        });
        lines.push('</ul>');
      }

      if (lockConflicts.length > 0) {
        const groupedConflicts = aggregateConflictGroups(lockConflicts);
        lines.push('<div style="margin-top:8px; font-weight:600;">Resource Conflicts</div>');
        lines.push('<ul style="margin:4px 0 0 16px; padding:0;">');
        groupedConflicts.slice(0, 6).forEach((group) => {
          lines.push(
            '<li><strong>resource=' +
            escapeHtml(group.resourceId) +
            '</strong> (conflicts=' +
            String(group.total) +
            ', holders=' +
            String(group.holders.length) +
            ')</li>',
          );
          lines.push('<ul style="margin:2px 0 6px 16px; padding:0;">');
          group.holders.slice(0, 3).forEach((holder) => {
            lines.push('<li>holder=' + escapeHtml(holder.holder) + ', count=' + String(holder.count) + '</li>');
          });
          if (group.holders.length > 3) {
            lines.push('<li>... +' + String(group.holders.length - 3) + ' more holders</li>');
          }
          lines.push('</ul>');
        });
        if (groupedConflicts.length > 6) {
          lines.push('<li>... +' + String(groupedConflicts.length - 6) + ' more resources</li>');
        }
        lines.push('</ul>');
        lines.push('<div style="margin-top:8px; display:flex; gap:8px; flex-wrap:wrap;">');
        lines.push('<button data-action="precheck-retry" class="secondary">重试保存</button>');
        lines.push('<button data-action="precheck-readonly" class="secondary">只读打开拓扑</button>');
        lines.push('<button data-action="precheck-editable" class="secondary">退出只读模式</button>');
        lines.push('<button data-action="precheck-lock-snapshot" class="secondary">查看锁快照</button>');
        lines.push('<button data-action="precheck-apply-advice" class="secondary">执行建议动作</button>');
        lines.push('<button data-action="precheck-copy-summary" class="secondary">复制冲突摘要</button>');
        lines.push('<button data-action="precheck-copy-json" class="secondary">复制JSON摘要</button>');
        lines.push('</div>');
      }

      const snapshot = state.lastLockSnapshot && Array.isArray(state.lastLockSnapshot.leases)
        ? state.lastLockSnapshot
        : null;
      if (snapshot) {
        lines.push('<div style="margin-top:8px; font-weight:600;">Lock Snapshot</div>');
        lines.push('<div style="margin-top:4px; opacity:0.8;">updatedAt=' + escapeHtml(formatDateTime(state.lastLockSnapshotUpdatedAtMs)) + ', leases=' + String(snapshot.leases.length) + '</div>');
        if (snapshot.leases.length === 0) {
          lines.push('<div style="margin-top:4px;">No active leases on selected resources.</div>');
        } else {
          const groupedSnapshot = aggregateSnapshotGroups(snapshot.leases);
          lines.push('<ul style="margin:4px 0 0 16px; padding:0;">');
          groupedSnapshot.slice(0, 6).forEach((group) => {
            lines.push('<li><strong>resource=' + escapeHtml(group.resourceId) + '</strong> (leases=' + String(group.total) + ')</li>');
            lines.push('<ul style="margin:2px 0 6px 16px; padding:0;">');
            group.holders.slice(0, 3).forEach((holder) => {
              const leaseText = holder.leaseIds.length > 0
                ? ', lease=' + holder.leaseIds.map((id) => escapeHtml(id)).join(',')
                : '';
              lines.push('<li>holder=' + escapeHtml(holder.holder) + ', count=' + String(holder.count) + leaseText + '</li>');
            });
            if (group.holders.length > 3) {
              lines.push('<li>... +' + String(group.holders.length - 3) + ' more holders</li>');
            }
            lines.push('</ul>');
          });
          if (groupedSnapshot.length > 6) {
            lines.push('<li>... +' + String(groupedSnapshot.length - 6) + ' more resources</li>');
          }
          lines.push('</ul>');
        }
      }

      precheckDiagnostics.innerHTML = lines.join('');
      precheckDiagnostics.style.display = "block";
    }

    // -- DRAWER / STUB LOGIC --
    const drawer = document.getElementById('setupDrawer');
    const drawerClose = document.getElementById('drawerClose');
    const stubTabs = document.querySelectorAll('.stub-tab[data-target]');
    const drawerPages = document.querySelectorAll('.setup-page');
    // Breadcrumb Elements
    const bcMain = document.getElementById('bcMain');
    const bcSub = document.getElementById('bcSub');

    // Utility to get plain text from multiline tab
    function getTabLabel(el) {
        if (!el) return '';
        // Clone to not mess up original, replace <br> with space
        const clone = el.cloneNode(true);
        const brs = clone.getElementsByTagName('br');
        while (brs.length) {
            brs[0].parentNode.replaceChild(document.createTextNode(' '), brs[0]);
        }
        return clone.textContent.trim();
    }

    const separator = document.getElementById('bcSubSep');

    function updateBreadcrumb(main, sub) {
        if (bcMain) bcMain.textContent = main || '';
        if (bcSub) bcSub.textContent = sub || '';
        if (separator) separator.style.display = sub ? 'inline' : 'none';
    }

    function closeDrawer() {
        if (drawer) drawer.classList.remove('open');
        const activeView = document.querySelector('.view.is-active');
        if (activeView && activeView.id === 'view-waveform') {
            stubTabs.forEach(t => t.classList.toggle('active', t.getAttribute('data-target') === 'home'));
        } else {
             stubTabs.forEach(t => t.classList.remove('active'));
        }
    }

    if (drawerClose) {
        drawerClose.addEventListener('click', closeDrawer);
    }
    
    // Tab switching inside drawer
    document.querySelectorAll('.sp-tab').forEach(tab => {
        tab.addEventListener('click', () => {
             const parentPage = tab.closest('.setup-page');
             if (!parentPage) return;
             
             const targetId = tab.getAttribute('data-tab'); // e.g. stim-freq
             const targetPanel = document.getElementById('panel-' + targetId);
             
             // Deactivate siblings
             parentPage.querySelectorAll('.sp-tab').forEach(t => t.classList.remove('active'));
             tab.classList.add('active');
             
             parentPage.querySelectorAll('.sp-content-panel').forEach(p => p.classList.remove('active'));
             if (targetPanel) targetPanel.classList.add('active');
             
             // Update Breadcrumb Sub
             updateBreadcrumb(bcMain.textContent, getTabLabel(tab));
        });
    });
    
    stubTabs.forEach(tab => {
        tab.addEventListener('click', () => {
             const target = tab.getAttribute('data-target');
             const title = tab.getAttribute('title') || 'Setup';

             // Update active state on stub
             stubTabs.forEach(t => t.classList.remove('active'));
             tab.classList.add('active');

             if (target === 'home') {
                 closeDrawer();
                 switchView('waveform');
                 // Re-add active to home after closeDrawer might have cleared it
                 tab.classList.add('active'); 
             } else {
                 // Open drawer
                 if (drawer) {
                     drawer.classList.add('open');
                     // Switch page
                     drawerPages.forEach(p => p.classList.remove('active'));
                     const page = document.getElementById('page-' + target);
                     if (page) {
                         page.classList.add('active');
                         // Auto-select active tab inside page to update breadcrumb
                         const activeTab = page.querySelector('.sp-tab.active') || page.querySelector('.sp-tab');
                         if (activeTab) {
                             // Simulate click or just update state? Better update state manually to avoid side effects
                             // But actually we want the panel to be shown
                             const tabId = activeTab.getAttribute('data-tab');
                             const panel = document.getElementById('panel-' + tabId);
                             
                             // Reset tabs in this page
                             page.querySelectorAll('.sp-tab').forEach(t => t.classList.remove('active'));
                             activeTab.classList.add('active');
                             
                             page.querySelectorAll('.sp-content-panel').forEach(p => p.classList.remove('active'));
                             if (panel) panel.classList.add('active');
                             
                             updateBreadcrumb(title, getTabLabel(activeTab));
                         } else {
                             updateBreadcrumb(title, '');
                         }
                     } else {
                         // Fallback
                         const defaultPage = document.querySelector('.setup-page');
                         if(defaultPage) defaultPage.classList.add('active');
                         updateBreadcrumb(title, '');
                     }
                 }
             }
        });
    });

    if (workspaceStatusBtn) {
      workspaceStatusBtn.addEventListener("click", () => openSystemModal("sys-ws"));
    }
    if (topbarWorkspaceBtn) {
      topbarWorkspaceBtn.addEventListener("click", () => openSystemModal("sys-ws"));
    }

    // --- System Configuration Modal Logic ---
    const sysModal = document.getElementById('sysConfigModal');
    const closeSysBtn = document.getElementById('closeSysconfig');
    const cancelSysBtn = document.getElementById('cancelSysconfig');
    const applySysBtn = document.getElementById('applySysconfig');
    const sysNavItems = document.querySelectorAll('.sc-nav-item');
    const sysTabPanes = document.querySelectorAll('.sc-tab-pane');

    function openSystemModal(targetTab) {
        if (!sysModal) return;
        sysModal.classList.add('is-open');
        
        let tabName = targetTab || 'sys-topo'; // Default
        
        // Handle "workspace" or "topology" legacy names from data-view attributes
        if (targetTab === 'workspace') tabName = 'sys-ws';
        if (targetTab === 'topology') tabName = 'sys-topo';

        // Switch
        sysNavItems.forEach(nav => {
           if (nav.dataset.target === tabName) {
               nav.classList.add('active');
           } else {
               nav.classList.remove('active');
           }
        });
        
        sysTabPanes.forEach(pane => {
            if (pane.id === 'tab-pane-' + tabName) {
                pane.classList.add('active');
            } else {
                pane.classList.remove('active');
            }
        });
        
        // Refresh Topology
        if (tabName === 'sys-topo') {
             setTimeout(() => renderTopologyVisual(), 50);
        }
    }

    function closeSystemModal() {
        if (sysModal) sysModal.classList.remove('is-open');
    }

    if (closeSysBtn) closeSysBtn.addEventListener('click', closeSystemModal);
    if (cancelSysBtn) cancelSysBtn.addEventListener('click', closeSystemModal);
    
    // Switch tabs
    sysNavItems.forEach(item => {
        item.addEventListener('click', () => {
             // Deactivate old
             sysNavItems.forEach(n => n.classList.remove('active'));
             item.classList.add('active');
             
             const target = item.dataset.target;
             sysTabPanes.forEach(p => p.classList.remove('active'));
             const pane = document.getElementById('tab-pane-' + target);
             if (pane) pane.classList.add('active');
             
             if (target === 'sys-topo') {
                 setTimeout(() => renderTopologyVisual(), 0);
             }
        });
    });
    
    if (applySysBtn) {
        applySysBtn.addEventListener('click', () => {
             submitWorkspaceSave(true, true);
        });
    }

    // Intercept data-view clicks for modal targets
    document.querySelectorAll("[data-view]").forEach((node) => {
         const view = node.getAttribute("data-view");
         if (view === "workspace" || view === "topology") {
             // Remove old listener effectively by replacing logic?
             // Actually, we can just attach a new listener that stops propagation
             // But the old listener is already attached. 
             // Instead, let's modify the old listener logic if possible.
             // Since we can't, we rely on switchView failing gracefully (which it does).
             node.addEventListener("click", (e) => {
                 e.stopImmediatePropagation();
                 openSystemModal(view); // 'workspace' or 'topology'
             }, true); // Capture phase to beat the old listener?
         }
    });


    document.querySelectorAll("[data-setup-toggle]").forEach((node) => {

      node.addEventListener("click", () => {
        const section = node.closest(".setup-section");
        if (!section) {
          return;
        }
        const expanded = section.classList.toggle("is-open");
        const indicator = node.querySelector("span:last-child");
        if (indicator) {
          indicator.textContent = expanded ? "▼" : "▶";
        }
      });
    });

    document.querySelectorAll("[data-view]").forEach((node) => {
      node.addEventListener("click", (e) => {
        const view = node.getAttribute("data-view");
        
        // Intercept modal views
        if (view === "workspace" || view === "topology") {
             e.preventDefault();
             e.stopPropagation();
             openSystemModal(view);
             return;
        }

        if (view) {
          switchView(view);
        }
      }, true); // Use capture to intercept before any legacy listeners
    });

    document.querySelectorAll("[data-action='setup-placeholder']").forEach((node) => {
      node.addEventListener("click", () => {
        const label = node.getAttribute("data-label") || "Setup Item";
        setStatus("Setup 菜单：" + label + "（待接入）");
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
      submitWorkspaceSave(false, false);
    });
    document.getElementById("btnWorkspaceSaveActivate").addEventListener("click", () => {
      submitWorkspaceSave(true, false);
    });
    document.getElementById("btnTopologyLoad").addEventListener("click", () => {
      post("workspace-load", { workspaceId: workspaceId.value.trim() });
    });
    document.getElementById("btnTopologySave").addEventListener("click", () => {
      submitWorkspaceSave(false, false);
    });
    document.getElementById("btnTopologySaveActivate").addEventListener("click", () => {
      submitWorkspaceSave(true, false);
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
        if (workspaceStatusText) {
          workspaceStatusText.textContent = state.activeWorkspaceId || "(未激活)";
        }
        return;
      }
      if (type === "workspace-load-result") {
        if (!payload.ok || !payload.item) {
          setStatus("加载失败: " + String(payload.error || payload.message || "unknown"));
          return;
        }
        renderPrecheckDiagnostics(null);
        state.lastDiagnosticPayload = null;
        const item = payload.item;
        workspaceId.value = String(item.workspaceId || "");
        topologyId.value = String(item.topologyId || "");
        topologyYaml.value = String(item.topologyYaml || "");
        parseTopologyYaml(topologyYaml.value);
        if (workspaceStatusText) {
          workspaceStatusText.textContent = workspaceId.value || "(未激活)";
        }
        setStatus("已加载工作区: " + workspaceId.value);
        return;
      }
      if (type === "workspace-save-result" || type === "workspace-activate-result") {
        const ok = Boolean(payload.ok);
        const message = String(payload.message || payload.error || "");
        setStatus(message || (ok ? "操作成功" : "操作失败"));
        if (ok) {
          renderPrecheckDiagnostics(null);
          setWorkspaceReadonly(false, "");
          const currentWorkspaceId = String(workspaceId?.value || "").trim();
          if (workspaceStatusText && currentWorkspaceId) {
            workspaceStatusText.textContent = currentWorkspaceId;
          }
          post("workspace-list", {});
        }
        if (!ok) {
          state.lastDiagnosticPayload = payload.diagnosticPayload || null;
          renderPrecheckDiagnostics(payload.precheck || null);
          await openModal({ title: "操作失败", body: message || "未知错误" });
        }
        return;
      }
      if (type === "workspace-lock-snapshot-result") {
        const ok = Boolean(payload.ok);
        if (ok && payload.snapshot) {
          state.lastLockSnapshot = payload.snapshot;
          state.lastLockSnapshotUpdatedAtMs = Date.now();
          setStatus(String(payload.message || "锁快照已更新"));
          if (state.lastPrecheck) {
            renderPrecheckDiagnostics(state.lastPrecheck);
          }
        } else {
          state.lastLockSnapshot = null;
          state.lastLockSnapshotUpdatedAtMs = 0;
          setStatus(String(payload.message || "锁快照不可用"));
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

    if (precheckDiagnostics) {
      precheckDiagnostics.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
          return;
        }
        const action = target.getAttribute("data-action");
        if (!action) {
          return;
        }
        if (action === "precheck-retry") {
          if (state.workspaceReadonly) {
            setWorkspaceReadonly(false, "已退出只读模式，准备重试保存");
          }
          const last = state.lastSaveRequest;
          if (last && last.workspaceId) {
            workspaceId.value = last.workspaceId;
            topologyId.value = last.topologyId;
            submitWorkspaceSave(Boolean(last.activate), false);
          } else {
            submitWorkspaceSave(true, false);
          }
          return;
        }
        if (action === "precheck-readonly") {
          setWorkspaceReadonly(true, "已切换只读模式：检测到资源冲突");
          openSystemModal("sys-topo");
          return;
        }
        if (action === "precheck-editable") {
          setWorkspaceReadonly(false, "已退出只读模式");
          openSystemModal("sys-topo");
          return;
        }
        if (action === "precheck-lock-snapshot") {
          const selectors = extractSelectorsFromPrecheck(state.lastPrecheck);
          post("workspace-lock-snapshot", {
            workspaceId: String(workspaceId?.value || "").trim(),
            topologyYaml: getTopologyYamlForSave(),
            selectors,
          });
          setStatus("正在拉取锁快照...");
          return;
        }
        if (action === "precheck-apply-advice") {
          applyRetryAdviceAction();
          return;
        }
        if (action === "precheck-copy-summary") {
          copyTextToClipboard(buildPrecheckCopySummary()).then((copied) => {
            setStatus(copied ? "冲突摘要已复制到剪贴板" : "冲突摘要复制失败");
          });
          return;
        }
        if (action === "precheck-copy-json") {
          copyTextToClipboard(buildPrecheckCopyJson()).then((copied) => {
            setStatus(copied ? "JSON 摘要已复制到剪贴板" : "JSON 摘要复制失败");
          });
        }
      });
    }

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
