// 初期化：イベントリスナーの登録
document.addEventListener('DOMContentLoaded', () => {
    const searchBtn = document.getElementById('btn-search');
    const prevBtn = document.getElementById('btn-prev');
    const nextBtn = document.getElementById('btn-next');
    const replaceBtn = document.getElementById('btn-replace');
    const replaceAllBtn = document.getElementById('btn-replace-all');
    const copyBtn = document.getElementById('btn-FnR-copy');
    const resetBtn = document.getElementById('btn-reset');
    const editor = document.getElementById('text-editor');
    const highlightLayer = document.getElementById('highlight-layer');
    const findInput = document.getElementById('find');
    const replaceInput = document.getElementById('replace');
    const caseSensitiveCheck = document.getElementById('case-sensitive');
    const errorMsg = document.getElementById('error-msg');
    const matchCountEl = document.getElementById('match-count');
    const currentMatchEl = document.getElementById('current-match');
    const editorContainer = document.querySelector('.editor-container');

    // 1. 要素の取得（重複しないように）
    // ...（ここに上記の要素取得コードをコピー）...

    // 2. イベントリスナーの登録
    if (searchBtn) searchBtn.addEventListener('click', performSearch);
    if (prevBtn) prevBtn.addEventListener('click', () => jumpMatch(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => jumpMatch(1));
    if (replaceBtn) replaceBtn.addEventListener('click', replaceOne);
    if (replaceAllBtn) replaceAllBtn.addEventListener('click', replaceAll);
    if (copyBtn) copyBtn.addEventListener('click', copyResult);
    if (resetBtn) resetBtn.addEventListener('click', resetAll);

    // 3. textarea のイベント
    if (editor) {
        editor.addEventListener('input', () => performSearch());
        editor.addEventListener('scroll', () => {
            highlightLayer.scrollTop = editor.scrollTop;
            highlightLayer.scrollLeft = editor.scrollLeft;
        });
    }

    // 4. チェックボックスのイベント
    if (caseSensitiveCheck) {
        caseSensitiveCheck.addEventListener('change', () => performSearch());
    }
});

// 状態管理
let matches = [];
let currentMatchIndex = -1;
let searchRegex = null;

// 要素の取得
const editor = document.getElementById('text-editor');
const highlightLayer = document.getElementById('highlight-layer');
const findInput = document.getElementById('find');
const replaceInput = document.getElementById('replace');
const caseSensitiveCheck = document.getElementById('case-sensitive');
const errorMsg = document.getElementById('error-msg');
const matchCountEl = document.getElementById('match-count');
const currentMatchEl = document.getElementById('current-match');
const editorContainer = document.querySelector('.editor-container');

// 初期化：editor-container に tabindex を付与（フォーカス可能にする）
if (editorContainer) {
    editorContainer.setAttribute('tabindex', '0');
}

// イベントリスナー
editor.addEventListener('input', () => { performSearch(); });

editor.addEventListener('scroll', () => {
    highlightLayer.scrollTop = editor.scrollTop;
    highlightLayer.scrollLeft = editor.scrollLeft;
});

caseSensitiveCheck.addEventListener('change', () => { performSearch(); });

// 検索実行
function performSearch() {
    const findText = findInput.value;
    const text = editor.value;
    matches = [];
    currentMatchIndex = -1;
    searchRegex = null;
    
    if (!findText) {
        highlightLayer.textContent = escapeHtml(text);
        matchCountEl.textContent = '一致: 0';
        currentMatchEl.textContent = '現在: 0/0';
        disableButtons(true);
        return;
    }
    
    try {
        const escapedFind = findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const flags = caseSensitiveCheck.checked ? 'g' : 'gi';
        searchRegex = new RegExp(escapedFind, flags);
        
        let match;
        while ((match = searchRegex.exec(text)) !== null) {
            matches.push({ start: match.index, end: match.index + match[0].length });
        }
        
        renderHighlights();
        matchCountEl.textContent = `一致: ${matches.length}`;
        
        if (matches.length > 0) {
            currentMatchIndex = 0;
            currentMatchEl.textContent = `現在: 1/${matches.length}`;
            disableButtons(false);
            setTimeout(() => scrollIntoView(matches[0]), 0);
        } else {
            currentMatchEl.textContent = '現在: 0/0';
            disableButtons(true);
        }
    } catch (e) {
        errorMsg.style.display = 'block';
        errorMsg.textContent = '検索エラーが発生しました';
        console.error(e);
    }
}

function renderHighlights() {
    const text = editor.value;
    if (!searchRegex) {
        highlightLayer.textContent = escapeHtml(text);
        return;
    }
    let result = '';
    let lastIndex = 0;
    const tempRegex = new RegExp(searchRegex.source, searchRegex.flags);
    let match;
    matches = []; 
    
    while ((match = tempRegex.exec(text)) !== null) {
        const start = match.index;
        const end = start + match[0].length;
        matches.push({ start, end });
        result += escapeHtml(text.slice(lastIndex, start));
        // ここがハイライトの核心！
        result += `<span class="match" data-index="${matches.length - 1}">${escapeHtml(match[0])}</span>`;
        lastIndex = end;
    }
    result += escapeHtml(text.slice(lastIndex));
    highlightLayer.innerHTML = result; // innerHTML で描画
    updateActiveHighlight();
}

function escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function updateActiveHighlight() {
    const spans = highlightLayer.querySelectorAll('.match');
    spans.forEach((span, index) => {
        span.classList.remove('active');
        if (index === currentMatchIndex) {
            span.classList.add('active');
            if (matches[index]) scrollIntoView(matches[index]);
        }
    });
}

function jumpMatch(direction) {
    if (matches.length === 0) return;
    currentMatchIndex += direction;
    if (currentMatchIndex < 0) currentMatchIndex = matches.length - 1;
    if (currentMatchIndex >= matches.length) currentMatchIndex = 0;
    updateActiveHighlight();
    currentMatchEl.textContent = `現在: ${currentMatchIndex + 1}/${matches.length}`;
}

function scrollIntoView(match) {
    const text = editor.value;
    const beforeText = text.substring(0, match.start);
    const lines = beforeText.split('\n');
    const lineCount = lines.length;
    const lineHeight = 22.4;
    const containerHeight = editor.clientHeight;
    const padding = 10;
    const targetScroll = Math.max(0, (lineCount * lineHeight) - (containerHeight / 2) + padding);
    editor.scrollTop = targetScroll;
    highlightLayer.scrollTop = targetScroll;
}

function replaceOne() {
    if (currentMatchIndex === -1 || matches.length === 0) return;
    const match = matches[currentMatchIndex];
    const text = editor.value;
    const replaceText = replaceInput.value;
    const newText = text.substring(0, match.start) + replaceText + text.substring(match.end);
    editor.value = newText;
    const newCursorPos = match.start + replaceText.length;
    editor.selectionStart = newCursorPos;
    editor.selectionEnd = newCursorPos;
    performSearch();
}

function replaceAll() {
    const findText = findInput.value;
    const replaceText = replaceInput.value;
    const text = editor.value;
    if (!findText) return;
    const escapedFind = findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const flags = caseSensitiveCheck.checked ? 'g' : 'gi';
    const regex = new RegExp(escapedFind, flags);
    const newText = text.replace(regex, replaceText);
    editor.value = newText;
    performSearch();
}

function disableButtons(disabled) {
    document.getElementById('btn-prev').disabled = disabled;
    document.getElementById('btn-next').disabled = disabled;
    document.getElementById('btn-replace').disabled = disabled;
    document.getElementById('btn-replace-all').disabled = disabled;
}

function resetAll() {
    editor.value = '';
    findInput.value = '';
    replaceInput.value = '';
    caseSensitiveCheck.checked = true;
    performSearch();
    errorMsg.style.display = 'none';
}

function copyResult() {
    const text = editor.value;
    navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById('btn-FnR-copy');
        const originalText = btn.textContent;
        btn.textContent = 'コピー完了！';
        setTimeout(() => { btn.textContent = originalText; }, 1000);
    }).catch(err => {
        console.error('コピー失敗:', err);
        alert('コピーに失敗しました');
    });
}