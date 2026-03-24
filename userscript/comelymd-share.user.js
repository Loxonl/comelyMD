// ==UserScript==
// @name         ComelyMD Share — AI 对话分享
// @namespace    https://github.com/Loxonl/comelyMD
// @version      1.0.0
// @description  将 ChatGPT / Gemini 的 AI 回复一键分享到自建 ComelyMD 服务
// @author       Loxonl
// @match        https://chatgpt.com/*
// @match        https://chat.openai.com/*
// @match        https://gemini.google.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @connect      *
// @require      https://unpkg.com/turndown@7.1.3/dist/turndown.js
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // ─── 常量 ───
  const SCRIPT_ID = 'comelymd-share';
  const BRAND_GRADIENT = 'linear-gradient(135deg, #3b82f6, #6366f1, #a855f7)';
  const PROCESSED_ATTR = `data-${SCRIPT_ID}`;

  // ─── 安全 HTML 注入（DOMParser 方案，完全绕过 Trusted Types CSP）───
  function setHTML(targetEl, htmlStr) {
    const doc = new DOMParser().parseFromString(htmlStr, 'text/html');
    targetEl.textContent = '';
    while (doc.body.firstChild) {
      targetEl.appendChild(doc.body.firstChild);
    }
  }

  // ─── Turndown 实例 ───
  const td = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });

  // ─── 配置管理 ───
  function getConfig() {
    return {
      server: GM_getValue('server', ''),
      defaultBurn: GM_getValue('defaultBurn', false),
      defaultPwd: GM_getValue('defaultPwd', false),
      defaultExpire: GM_getValue('defaultExpire', '0'),
    };
  }
  function setConfig(cfg) {
    GM_setValue('server', cfg.server);
    GM_setValue('defaultBurn', cfg.defaultBurn);
    GM_setValue('defaultPwd', cfg.defaultPwd);
    GM_setValue('defaultExpire', cfg.defaultExpire);
  }

  // ─── 全局样式注入 ───
  function injectStyles() {
    if (document.getElementById(`${SCRIPT_ID}-styles`)) return;
    const style = document.createElement('style');
    style.id = `${SCRIPT_ID}-styles`;
    style.textContent = `
      .cmd-share-btn {
        display: inline-flex; align-items: center; justify-content: center;
        width: 28px; height: 28px; border-radius: 6px; cursor: pointer;
        background: transparent; border: none; color: inherit; padding: 0;
        opacity: 0.5; transition: all 0.2s; position: relative;
      }
      .cmd-share-btn:hover { opacity: 1; }
      .cmd-share-btn svg { width: 18px; height: 18px; }

      /* 遮罩层 */
      .cmd-overlay {
        position: fixed; inset: 0; background: rgba(0,0,0,0.5);
        z-index: 99998; display: flex; align-items: center; justify-content: center;
        animation: cmd-fade-in 0.2s ease;
      }
      @keyframes cmd-fade-in { from { opacity: 0; } to { opacity: 1; } }

      /* 面板 */
      .cmd-panel {
        background: #1a1c2e; color: #e4e5ea; border-radius: 16px;
        width: 380px; max-width: 90vw; box-shadow: 0 24px 64px rgba(0,0,0,0.4);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 14px; overflow: hidden;
        animation: cmd-slide-up 0.25s ease;
      }
      @keyframes cmd-slide-up { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }

      .cmd-panel-header {
        padding: 1.25rem 1.5rem; font-weight: 700; font-size: 15px;
        background: ${BRAND_GRADIENT}; color: #fff;
        display: flex; align-items: center; gap: 0.5rem;
      }
      .cmd-panel-header img { width: 22px; height: 22px; border-radius: 5px; }

      .cmd-panel-body { padding: 1.25rem 1.5rem; }

      .cmd-field { margin-bottom: 1rem; }
      .cmd-field label { display: block; font-size: 12px; color: #8b8fa3; margin-bottom: 0.4rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
      .cmd-field input[type="text"] {
        width: 100%; padding: 0.6rem 0.8rem; background: #0f1117; color: #e4e5ea;
        border: 1px solid #2a2d3a; border-radius: 8px; font-size: 13px;
        outline: none; transition: border-color 0.2s; box-sizing: border-box;
      }
      .cmd-field input[type="text"]:focus { border-color: #6366f1; }

      .cmd-opts { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 1rem; }
      .cmd-opt {
        display: flex; align-items: center; gap: 0.4rem; font-size: 13px;
        cursor: pointer; user-select: none; font-weight: 500;
      }
      .cmd-opt input[type="checkbox"] {
        appearance: none; -webkit-appearance: none; width: 16px; height: 16px;
        border: 2px solid #2a2d3a; border-radius: 4px; cursor: pointer;
        transition: all 0.15s; position: relative; background: #0f1117; flex-shrink: 0;
      }
      .cmd-opt input[type="checkbox"]:checked { background: #6366f1; border-color: #6366f1; }
      .cmd-opt input[type="checkbox"]:checked::after {
        content: '✓'; position: absolute; top: -1px; left: 2px; font-size: 12px; color: #fff; font-weight: 700;
      }

      .cmd-select {
        display: flex; align-items: center; gap: 0.4rem; font-size: 13px; font-weight: 500;
      }
      .cmd-select select {
        background: #0f1117; color: #e4e5ea; border: 1px solid #2a2d3a;
        border-radius: 6px; padding: 0.3rem 0.5rem; font-size: 12px; outline: none; cursor: pointer;
      }

      .cmd-panel-footer { display: flex; gap: 0.75rem; padding: 0 1.5rem 1.25rem; }
      .cmd-btn {
        flex: 1; padding: 0.65rem; border: none; border-radius: 8px;
        font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s;
        font-family: inherit;
      }
      .cmd-btn-primary { background: ${BRAND_GRADIENT}; color: #fff; box-shadow: 0 2px 8px rgba(99,102,241,0.3); }
      .cmd-btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
      .cmd-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
      .cmd-btn-cancel { background: #2a2d3a; color: #8b8fa3; }
      .cmd-btn-cancel:hover { color: #e4e5ea; }

      /* 结果态 */
      .cmd-result { text-align: center; padding: 0.5rem 0; }
      .cmd-result .icon { font-size: 2rem; margin-bottom: 0.75rem; }
      .cmd-result-url {
        width: 100%; padding: 0.55rem 0.7rem; background: #0f1117; color: #e4e5ea;
        border: 1px solid #2a2d3a; border-radius: 6px; font-size: 12px;
        font-family: monospace; margin: 0.75rem 0; text-align: center;
        outline: none; box-sizing: border-box;
      }
      .cmd-result-pwd {
        display: inline-block; font-family: monospace; font-size: 1.1rem; letter-spacing: 3px;
        background: rgba(99,102,241,0.15); padding: 0.3rem 0.8rem; border-radius: 6px;
        color: #818cf8; margin: 0.5rem 0; font-weight: 700;
      }

      /* 设置面板 Toast */
      .cmd-toast {
        position: fixed; left: 50%; bottom: 40px; transform: translateX(-50%);
        background: #1a1c2e; color: #e4e5ea; padding: 0.6rem 1.2rem;
        border-radius: 8px; font-size: 13px; font-weight: 500; z-index: 99999;
        box-shadow: 0 8px 24px rgba(0,0,0,0.4); animation: cmd-fade-in 0.2s ease;
      }
    `;
    document.head.appendChild(style);
  }

  // ─── 工具函数 ───
  function toast(msg, dur = 2500) {
    const el = document.createElement('div');
    el.className = 'cmd-toast';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), dur);
  }

  async function clipText(text) {
    try { await navigator.clipboard.writeText(text); } catch {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
    }
  }

  // ─── 分享按钮（纯 DOM API，兼容 Trusted Types）───
  function createShareIcon() {
    const btn = document.createElement('button');
    btn.className = 'cmd-share-btn';
    btn.title = '分享到 ComelyMD';
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', 'M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8');
    const polyline = document.createElementNS(ns, 'polyline');
    polyline.setAttribute('points', '16 6 12 2 8 6');
    const line = document.createElementNS(ns, 'line');
    line.setAttribute('x1', '12'); line.setAttribute('y1', '2');
    line.setAttribute('x2', '12'); line.setAttribute('y2', '15');
    svg.append(path, polyline, line);
    btn.appendChild(svg);
    return btn;
  }

  // ─── 面板 UI ───
  function showPanel(markdownContent) {
    const cfg = getConfig();

    // 首次使用：未配置服务器地址
    if (!cfg.server) {
      showSettingsPanel(() => showPanel(markdownContent));
      return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'cmd-overlay';
    setHTML(overlay, `
      <div class="cmd-panel">
        <div class="cmd-panel-header">
          <span>📤</span> 分享到 ComelyMD
        </div>
        <div class="cmd-panel-body" id="cmd-body">
          <div class="cmd-field">
            <label>服务器</label>
            <input type="text" id="cmd-server" value="${cfg.server}" placeholder="https://md.example.com">
          </div>
          <div class="cmd-opts">
            <label class="cmd-opt"><input type="checkbox" id="cmd-burn" ${cfg.defaultBurn ? 'checked' : ''}> 阅后即焚</label>
            <label class="cmd-opt"><input type="checkbox" id="cmd-pwd" ${cfg.defaultPwd ? 'checked' : ''}> 密码保护</label>
          </div>
          <div class="cmd-select">
            <span style="color:#8b8fa3;">过期:</span>
            <select id="cmd-expire">
              <option value="0" ${cfg.defaultExpire === '0' ? 'selected' : ''}>永不</option>
              <option value="5m" ${cfg.defaultExpire === '5m' ? 'selected' : ''}>5 分钟</option>
              <option value="1h" ${cfg.defaultExpire === '1h' ? 'selected' : ''}>1 小时</option>
              <option value="6h" ${cfg.defaultExpire === '6h' ? 'selected' : ''}>6 小时</option>
              <option value="24h" ${cfg.defaultExpire === '24h' ? 'selected' : ''}>24 小时</option>
              <option value="7d" ${cfg.defaultExpire === '7d' ? 'selected' : ''}>7 天</option>
              <option value="30d" ${cfg.defaultExpire === '30d' ? 'selected' : ''}>30 天</option>
            </select>
          </div>
        </div>
        <div class="cmd-panel-footer">
          <button class="cmd-btn cmd-btn-cancel" id="cmd-cancel">取消</button>
          <button class="cmd-btn cmd-btn-primary" id="cmd-submit">分享</button>
        </div>
      </div>
    `);
    document.body.appendChild(overlay);

    // 点击遮罩关闭
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('#cmd-cancel').addEventListener('click', () => overlay.remove());

    overlay.querySelector('#cmd-submit').addEventListener('click', () => {
      const server = overlay.querySelector('#cmd-server').value.trim().replace(/\/+$/, '');
      if (!server) { toast('⚠️ 请填写服务器地址'); return; }

      // 保存配置
      setConfig({
        server,
        defaultBurn: overlay.querySelector('#cmd-burn').checked,
        defaultPwd: overlay.querySelector('#cmd-pwd').checked,
        defaultExpire: overlay.querySelector('#cmd-expire').value,
      });

      const submitBtn = overlay.querySelector('#cmd-submit');
      submitBtn.disabled = true;
      submitBtn.textContent = '分享中…';

      // 构建 FormData
      const formBody = new URLSearchParams();
      formBody.append('markdown', markdownContent);
      if (overlay.querySelector('#cmd-burn').checked) formBody.append('is_burn', 'true');
      if (overlay.querySelector('#cmd-pwd').checked) formBody.append('with_password', 'true');
      const expire = overlay.querySelector('#cmd-expire').value;
      if (expire !== '0') formBody.append('expire_time', expire);

      GM_xmlhttpRequest({
        method: 'POST',
        url: `${server}/api/pages`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        data: formBody.toString(),
        onload(res) {
          try {
            const data = JSON.parse(res.responseText);
            const shareUrl = `${server}/p/${data.id}`;
            showResult(overlay, shareUrl, data.pwd || '');
          } catch {
            toast('❌ 服务器响应异常');
            submitBtn.disabled = false;
            submitBtn.textContent = '分享';
          }
        },
        onerror() {
          toast('❌ 网络请求失败，请检查服务器地址');
          submitBtn.disabled = false;
          submitBtn.textContent = '分享';
        }
      });
    });
  }

  function showResult(overlay, url, pwd) {
    const body = overlay.querySelector('#cmd-body');
    const footer = overlay.querySelector('.cmd-panel-footer');

    setHTML(body, `
      <div class="cmd-result">
        <div class="icon">✅</div>
        <div style="font-weight:600; margin-bottom:0.5rem;">分享成功</div>
        <input type="text" class="cmd-result-url" value="${url}" readonly>
        ${pwd ? `<div style="font-size:12px; color:#8b8fa3; margin-top:0.5rem;">密码</div><div class="cmd-result-pwd">${pwd}</div>` : ''}
      </div>
    `);

    setHTML(footer, `
      <button class="cmd-btn cmd-btn-cancel" id="cmd-close">关闭</button>
      <button class="cmd-btn cmd-btn-primary" id="cmd-copy">${pwd ? '复制链接和密码' : '复制链接'}</button>
    `);

    footer.querySelector('#cmd-close').addEventListener('click', () => overlay.remove());
    footer.querySelector('#cmd-copy').addEventListener('click', () => {
      const text = pwd ? `链接: ${url}\n密码: ${pwd}` : url;
      clipText(text);
      toast('✅ 已复制到剪贴板');
    });

    // 自动复制链接
    clipText(url);
  }

  // ─── 设置面板 ───
  function showSettingsPanel(onSave) {
    const cfg = getConfig();
    const overlay = document.createElement('div');
    overlay.className = 'cmd-overlay';
    setHTML(overlay, `
      <div class="cmd-panel">
        <div class="cmd-panel-header"><span>⚙️</span> ComelyMD 配置</div>
        <div class="cmd-panel-body">
          <div class="cmd-field">
            <label>服务器地址</label>
            <input type="text" id="cmd-cfg-server" value="${cfg.server}" placeholder="https://md.example.com">
          </div>
          <p style="font-size:12px; color:#8b8fa3; margin:0;">填写你自建的 ComelyMD 服务地址，首次使用必填。</p>
        </div>
        <div class="cmd-panel-footer">
          <button class="cmd-btn cmd-btn-cancel" id="cmd-cfg-cancel">取消</button>
          <button class="cmd-btn cmd-btn-primary" id="cmd-cfg-save">保存</button>
        </div>
      </div>
    `);
    document.body.appendChild(overlay);

    overlay.querySelector('#cmd-cfg-cancel').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#cmd-cfg-save').addEventListener('click', () => {
      const server = overlay.querySelector('#cmd-cfg-server').value.trim().replace(/\/+$/, '');
      if (!server) { toast('⚠️ 服务器地址不能为空'); return; }
      GM_setValue('server', server);
      toast('✅ 配置已保存');
      overlay.remove();
      if (onSave) onSave();
    });
  }

  // 注册油猴菜单
  GM_registerMenuCommand('⚙️ ComelyMD 设置', () => showSettingsPanel());

  // ─── 平台适配器 ───
  const adapters = {

    // ── ChatGPT ──
    chatgpt: {
      name: 'ChatGPT',
      match: () => /chat(gpt)?\.openai\.com|chatgpt\.com/.test(location.hostname),
      // 获取所有 AI 回复消息块
      getMessageBlocks: () => {
        // ChatGPT 的 assistant 消息通常在 [data-message-author-role="assistant"] 下
        // 或者在 article 标签内，其中包含 .prose 或 .markdown 类的内容区
        const blocks = [];
        document.querySelectorAll('[data-message-author-role="assistant"]').forEach(el => {
          const article = el.closest('article') || el.closest('[data-testid^="conversation-turn"]') || el;
          if (article && !blocks.includes(article)) blocks.push(article);
        });
        // 兜底：如果上面取不到，尝试通过 article 标签
        if (blocks.length === 0) {
          document.querySelectorAll('article').forEach(el => {
            // 排除用户消息（通常有 data-message-author-role="user"）
            if (!el.querySelector('[data-message-author-role="user"]')) {
              blocks.push(el);
            }
          });
        }
        return blocks;
      },
      // 获取操作按钮区域
      getActionBar: (block) => {
        // ChatGPT 按钮区通常在消息底部的 flex 容器中（包含复制、点赞等按钮）
        // 寻找包含 button 的末尾容器
        const candidates = block.querySelectorAll('.flex.items-center');
        for (let i = candidates.length - 1; i >= 0; i--) {
          const c = candidates[i];
          if (c.querySelector('button') && c.closest('article') === block) return c;
        }
        // 宽泛兜底：最后一组按钮
        const allBtns = block.querySelectorAll('button');
        if (allBtns.length > 0) {
          return allBtns[allBtns.length - 1].parentElement;
        }
        return null;
      },
      // 提取消息内容 HTML
      getContentHTML: (block) => {
        const prose = block.querySelector('.prose, .markdown, .markdown-body');
        return prose ? prose.innerHTML : block.innerHTML;
      },
    },

    // ── Gemini ──
    gemini: {
      name: 'Gemini',
      match: () => location.hostname.includes('gemini.google.com'),
      getMessageBlocks: () => {
        // Gemini 使用 <model-response> Angular 自定义标签
        return [...document.querySelectorAll('model-response')];
      },
      getActionBar: (block) => {
        // Gemini 的操作按钮是 Angular 的自定义组件标签：
        // <copy-button>, <thumb-up-button>, <thumb-down-button>, <regenerate-button>
        // 它们作为兄弟节点排列在同一个父容器中
        const copyBtn = block.querySelector('copy-button');
        if (copyBtn && copyBtn.parentElement) return copyBtn.parentElement;
        // 次选：从 more-menu-button-container 向上找
        const moreMenu = block.querySelector('.more-menu-button-container');
        if (moreMenu && moreMenu.parentElement) return moreMenu.parentElement;
        // 兜底：thumb-up-button 的父容器
        const thumbUp = block.querySelector('thumb-up-button');
        if (thumbUp && thumbUp.parentElement) return thumbUp.parentElement;
        return null;
      },
      getContentHTML: (block) => {
        // 内容层级: model-response > div > response-container > div.response-container > 内容
        const content = block.querySelector('.model-response-text, message-content, .response-container .markdown-main-panel');
        if (content) return content.innerHTML;
        // 兜底：从 response-container 自定义标签取内容
        const rc = block.querySelector('response-container');
        if (rc) return rc.innerHTML;
        return block.innerHTML;
      },
    },

    // ── 预留：Grok ──
    // grok: { name: 'Grok', match: () => location.hostname.includes('grok.com'), ... },

    // ── 预留：豆包 ──
    // doubao: { name: '豆包', match: () => location.hostname.includes('doubao.com'), ... },

    // ── 预留：Kimi ──
    // kimi: { name: 'Kimi', match: () => location.hostname.includes('kimi.moonshot.cn'), ... },
  };

  // ─── 核心注入逻辑 ───
  function getActiveAdapter() {
    return Object.values(adapters).find(a => a.match());
  }

  function injectShareButtons() {
    const adapter = getActiveAdapter();
    if (!adapter) return;

    const blocks = adapter.getMessageBlocks();
    blocks.forEach(block => {
      if (block.getAttribute(PROCESSED_ATTR)) return;

      const actionBar = adapter.getActionBar(block);
      // 按钮区可能尚在异步加载中（Gemini），不标记为已处理以允许下次重试
      if (!actionBar) return;

      block.setAttribute(PROCESSED_ATTR, '1');

      const btn = createShareIcon();
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const html = adapter.getContentHTML(block);
        const markdown = td.turndown(html);
        showPanel(markdown);
      });

      actionBar.appendChild(btn);
    });
  }

  // ─── 启动 ───
  function init() {
    if (!getActiveAdapter()) return;
    injectStyles();
    // 首次扫描
    injectShareButtons();
    // 持续监听新消息（节流：最多 500ms 触发一次）
    let debounceTimer = null;
    const observer = new MutationObserver(() => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(injectShareButtons, 500);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // 延迟启动，等页面完全加载
  if (document.readyState === 'complete') {
    setTimeout(init, 1500);
  } else {
    window.addEventListener('load', () => setTimeout(init, 1500));
  }

})();
