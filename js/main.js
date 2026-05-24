/* ---- 1. Nav scroll shadow, Reading Progress, Back to Top ---- */
const nav = document.getElementById('main-nav');
const progressBar = document.getElementById('reading-progress-bar');
const backToTopBtn = document.getElementById('back-to-top');

window.addEventListener('scroll', () => {
    // Nav shadow
    if (nav) nav.classList.toggle('nav--scrolled', window.scrollY > 20);
    
    // Reading progress
    const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (winScroll / height) * 100;
    if (progressBar) progressBar.style.width = scrolled + '%';
    
    // Back to top button
    if (backToTopBtn) {
        if (winScroll > 500) {
            backToTopBtn.classList.add('show');
        } else {
            backToTopBtn.classList.remove('show');
        }
    }
});

if (backToTopBtn) {
    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

/* ---- TOC: Scroll offset fix, close button, collapse button ---- */
const tocToggle = document.getElementById('toc-toggle');
const tocSidebar = document.getElementById('toc-sidebar');
const tocCloseBtn = document.getElementById('toc-close');

// Helper: scroll to anchor with nav offset
function scrollToAnchor(hash) {
    const target = document.querySelector(hash);
    if (!target) return;
    const navHeight = document.getElementById('main-nav')?.offsetHeight ?? 70;
    const targetTop = target.getBoundingClientRect().top + window.scrollY - navHeight - 16;
    window.scrollTo({ top: targetTop, behavior: 'smooth' });
}

// Intercept all TOC links with data-scroll
if (tocSidebar) {
    tocSidebar.querySelectorAll('a[data-scroll]').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            const hash = link.getAttribute('href');
            scrollToAnchor(hash);
            // Auto-close on small screens
            if (window.innerWidth <= 1450) {
                tocSidebar.classList.remove('show');
            }
        });
    });
}

// Open / close the sidebar (toggle button)
if (tocToggle && tocSidebar) {
    tocToggle.addEventListener('click', () => {
        if (window.innerWidth <= 1450) {
            tocSidebar.classList.toggle('show');
        } else {
            tocSidebar.classList.remove('hide-desktop');
            tocToggle.classList.remove('show-desktop');
        }
    });
}

// Close button inside sidebar
if (tocCloseBtn && tocSidebar) {
    tocCloseBtn.addEventListener('click', () => {
        if (window.innerWidth <= 1450) {
            tocSidebar.classList.remove('show');
        } else {
            tocSidebar.classList.add('hide-desktop');
            tocToggle.classList.add('show-desktop');
        }
    });
}

// Collapse sub-list toggle (Dynamic for all tasks)
const collapseBtns = document.querySelectorAll('.toc-collapse-btn');
collapseBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const parentLi = btn.closest('.toc-has-sub');
        if (!parentLi) return;
        
        const subList = parentLi.querySelector('.toc-sublist');
        if (subList) {
            const isOpen = subList.classList.toggle('toc-sublist--open');
            btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        }
    });
});

/* ---- 2. Section progress dots + nav highlight ---- */
const sections = document.querySelectorAll('section[id]');
const dots = document.querySelectorAll('.progress-dot');
const navLinks = document.querySelectorAll('.nav__links a');

const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const id = entry.target.id;
            dots.forEach(d => d.classList.toggle('active', d.dataset.target === id));
            navLinks.forEach(a => {
                const match = a.getAttribute('href') === '#' + id;
                a.classList.toggle('active', match);
            });
        }
    });
}, { rootMargin: '-40% 0px -40% 0px', threshold: 0 });

sections.forEach(s => sectionObserver.observe(s));

dots.forEach(dot => {
    dot.addEventListener('click', () => {
        document.getElementById(dot.dataset.target)?.scrollIntoView({ behavior: 'smooth' });
    });
});

/* ---- 3. Scroll reveal ---- */
const revealEls = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
            setTimeout(() => entry.target.classList.add('revealed'), i * 60);
            revealObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

revealEls.forEach(el => revealObserver.observe(el));

/* ---- 4. Ripple effect ---- */
document.querySelectorAll('.ripple-host').forEach(el => {
    el.addEventListener('click', function(e) {
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top  - size / 2;
        const ripple = document.createElement('span');
        ripple.className = 'ripple';
        ripple.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px;`;
        this.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
    });
});

/* ---- 5. Interactive Convolution Demo ---- */
(function () {
    // Kernel presets
    const PRESETS = {
        vertical:   [[ 1, 0,-1],[ 1, 0,-1],[ 1, 0,-1]],
        horizontal: [[ 1, 1, 1],[ 0, 0, 0],[-1,-1,-1]],
        sharpen:    [[ 0,-1, 0],[-1, 5,-1],[ 0,-1, 0]],
        blur:       [[ 1, 1, 1],[ 1, 1, 1],[ 1, 1, 1]],
        emboss:     [[-2,-1, 0],[-1, 1, 1],[ 0, 1, 2]],
        identity:   [[ 0, 0, 0],[ 0, 1, 0],[ 0, 0, 0]],
    };
    const KS = 3; // kernel always 3×3
    let N = 6, input = [], kernel = [], output = [], outSize, totalSteps, step = -1;
    let playing = false, playTimer = null, speed = 850;

    function makeDefaultInput(n) {
        const g = [];
        for (let r = 0; r < n; r++) {
            g[r] = [];
            for (let c = 0; c < n; c++) {
                g[r][c] = (r === c || r + c === n - 1 ||
                           r === Math.floor(n / 2) || c === Math.floor(n / 2)) ? 1 : 0;
            }
        }
        return g;
    }

    function calcOutput() {
        output = [];
        for (let r = 0; r < outSize; r++) {
            output[r] = [];
            for (let c = 0; c < outSize; c++) {
                let sum = 0;
                for (let kr = 0; kr < KS; kr++)
                    for (let kc = 0; kc < KS; kc++)
                        sum += input[r + kr][c + kc] * kernel[kr][kc];
                output[r][c] = sum;
            }
        }
    }

    function stepToRC(s) { return [Math.floor(s / outSize), s % outSize]; }

    // --- Render ---
    function renderInput() {
        const el = document.getElementById('cid-input-grid');
        if (!el) return;
        el.style.gridTemplateColumns = `repeat(${N}, 1fr)`;
        el.innerHTML = '';
        const [wr, wc] = step >= 0 ? stepToRC(step) : [-9, -9];
        for (let r = 0; r < N; r++) {
            for (let c = 0; c < N; c++) {
                const cell = document.createElement('div');
                cell.className = 'ci-cell';
                cell.dataset.val = input[r][c];
                cell.textContent = input[r][c];
                if (step >= 0 && r >= wr && r < wr + KS && c >= wc && c < wc + KS) {
                    const prod = input[r][c] * kernel[r - wr][c - wc];
                    cell.classList.add('window-cell');
                    cell.classList.add(prod > 0 ? 'wp-pos' : prod < 0 ? 'wp-neg' : 'wp-zero');
                }
                cell.addEventListener('click', () => {
                    input[r][c] = 1 - input[r][c];
                    calcOutput(); render();
                });
                el.appendChild(cell);
            }
        }
    }

    function renderKernel() {
        const el = document.getElementById('cid-kernel-grid');
        if (!el) return;
        el.innerHTML = '';
        el.style.gridTemplateColumns = `repeat(${KS}, 1fr)`;
        for (let r = 0; r < KS; r++) {
            for (let c = 0; c < KS; c++) {
                const inp = document.createElement('input');
                inp.type = 'number';
                inp.className = 'ck-cell' + (kernel[r][c] > 0 ? ' kp' : kernel[r][c] < 0 ? ' kn' : '');
                inp.value = kernel[r][c];
                inp.addEventListener('input', () => {
                    kernel[r][c] = parseFloat(inp.value) || 0;
                    inp.className = 'ck-cell' + (kernel[r][c] > 0 ? ' kp' : kernel[r][c] < 0 ? ' kn' : '');
                    calcOutput(); renderOutput(); renderFormula();
                    document.querySelectorAll('.conv-preset-btn').forEach(b => b.classList.remove('active'));
                });
                el.appendChild(inp);
            }
        }
    }

    function renderOutput() {
        const el = document.getElementById('cid-output-grid');
        if (!el) return;
        el.style.gridTemplateColumns = `repeat(${outSize}, 1fr)`;
        el.innerHTML = '';
        const maxAbs = Math.max(1, ...output.flat().map(Math.abs));
        for (let r = 0; r < outSize; r++) {
            for (let c = 0; c < outSize; c++) {
                const cell = document.createElement('div');
                cell.className = 'co-cell';
                const idx = r * outSize + c;
                if (step >= 0 && idx <= step) {
                    const v = output[r][c];
                    cell.textContent = v;
                    const intens = Math.abs(v) / maxAbs;
                    if (v > 0) {
                        cell.style.cssText = `background:rgba(58,111,244,${(0.08 + intens * 0.65).toFixed(2)});color:${intens > 0.5 ? '#fff' : 'var(--clr-primary-d)'};border-color:rgba(58,111,244,${(0.25 + intens * 0.5).toFixed(2)});`;
                    } else if (v < 0) {
                        cell.style.cssText = `background:rgba(239,68,68,${(0.08 + intens * 0.65).toFixed(2)});color:${intens > 0.5 ? '#fff' : '#b91c1c'};border-color:rgba(239,68,68,${(0.25 + intens * 0.5).toFixed(2)});`;
                    } else {
                        cell.style.cssText = 'background:rgba(180,180,180,.08);color:var(--clr-text-subtle);';
                    }
                    if (idx === step) cell.classList.add('co-current');
                } else {
                    cell.textContent = '?';
                    cell.classList.add('co-unknown');
                }
                el.appendChild(cell);
            }
        }
        const hint = document.getElementById('cid-output-hint');
        if (hint) hint.textContent = step >= totalSteps - 1
            ? '✅ 卷積完成！' : step >= 0
            ? `計算中 ${step + 1}/${totalSteps}` : '執行步驟後顯示結果';
    }

    function renderFormula() {
        const box = document.getElementById('cid-formula-box');
        if (!box) return;
        if (step < 0) {
            box.innerHTML = '<div class="formula-hint">點擊「下一步」或「▶ 播放」，即可逐步觀察卷積計算過程</div>';
            return;
        }
        const [wr, wc] = stepToRC(step);
        const result = output[wr][wc];
        const rc = result > 0 ? 'result-pos' : result < 0 ? 'result-neg' : 'result-zero';

        let exprRows = '', detailRows = '';
        for (let kr = 0; kr < KS; kr++) {
            let rowTerms = '', detailParts = '';
            for (let kc = 0; kc < KS; kc++) {
                const iv = input[wr + kr][wc + kc], kv = kernel[kr][kc], prod = iv * kv;
                const col = prod > 0 ? 'var(--clr-primary)' : prod < 0 ? 'var(--clr-danger)' : 'var(--clr-text-subtle)';
                
                if (kc === 0) {
                    if (kr === 0) {
                        rowTerms += `<span class="formula-plus"> = </span>`;
                    } else {
                        rowTerms += `<span class="formula-plus"> + </span>`;
                    }
                } else {
                    rowTerms += `<span class="formula-plus"> + </span>`;
                }
                
                rowTerms += `<span class="formula-term" style="color:${col};">(${iv}×${kv})</span>`;
                const dcol = prod > 0 ? 'var(--clr-primary-d)' : prod < 0 ? '#b91c1c' : 'var(--clr-text-subtle)';
                detailParts += `<span class="detail-term">input[${wr+kr}][${wc+kc}]<b>(${iv})</b>×kernel[${kr}][${kc}]<b>(${kv})</b>=<b style="color:${dcol}">${prod}</b></span>`;
                if (kc < KS - 1) detailParts += `<span class="detail-sep"> | </span>`;
            }
            exprRows += rowTerms;
            if (kr < KS - 1) exprRows += `<br>`;
            detailRows += `<div class="formula-detail-row">${detailParts}</div>`;
        }

        box.innerHTML = `
            <div class="formula-position">
                📍 位置 [${wr}, ${wc}] — 計算輸出特徵圖 F[${wr}][${wc}]
                <span class="formula-pos-note">覆蓋輸入 [${wr}~${wr+KS-1}][${wc}~${wc+KS-1}]</span>
            </div>
            <div class="formula-expr">
                ${exprRows}
                <span class="formula-equals">&nbsp;=&nbsp;</span>
                <span class="formula-result ${rc}">${result}</span>
            </div>
            <div class="formula-detail">${detailRows}</div>`;
    }

    function updateProgress() {
        const fill = document.getElementById('cid-progress-fill');
        const cur = document.getElementById('cid-step-cur');
        const tot = document.getElementById('cid-step-tot');
        if (fill) fill.style.width = (step < 0 ? 0 : (step + 1) / totalSteps * 100) + '%';
        if (cur)  cur.textContent  = step < 0 ? 0 : step + 1;
        if (tot)  tot.textContent  = totalSteps;
    }

    function updateButtons() {
        const bPrev = document.getElementById('cid-btn-prev');
        const bNext = document.getElementById('cid-btn-next');
        const bPlay = document.getElementById('cid-btn-play');
        if (bPrev) bPrev.disabled = step <= -1;
        if (bNext) bNext.disabled = step >= totalSteps - 1;
        if (bPlay) {
            bPlay.textContent = playing ? '⏸ 暫停' : '▶ 播放';
            bPlay.classList.toggle('playing', playing);
        }
    }

    function render() { renderInput(); renderKernel(); renderOutput(); renderFormula(); updateProgress(); updateButtons(); }

    // --- Actions ---
    function nextStep() { if (step < totalSteps - 1) { step++; render(); } else stopPlay(); }
    function prevStep() { if (step > -1) { step--; render(); } }
    function reset()    { stopPlay(); step = -1; render(); }
    function stopPlay() {
        playing = false;
        if (playTimer) { clearInterval(playTimer); playTimer = null; }
        updateButtons();
    }
    function startPlay() {
        if (step >= totalSteps - 1) step = -1;
        playing = true; updateButtons();
        playTimer = setInterval(() => { step >= totalSteps - 1 ? stopPlay() : nextStep(); }, speed);
    }

    function setInputSize(n) {
        N = n; input = makeDefaultInput(n);
        outSize = n - KS + 1; totalSteps = outSize * outSize;
        step = -1; stopPlay(); calcOutput(); render();
        const il = document.getElementById('input-size-label');
        const ol = document.getElementById('output-size-label');
        if (il) il.textContent = `(${N}×${N})`;
        if (ol) ol.textContent = `(${outSize}×${outSize})`;
    }

    function setPreset(name) {
        if (PRESETS[name]) kernel = PRESETS[name].map(r => [...r]);
        step = -1; stopPlay(); calcOutput(); render();
    }

    function init() {
        if (!document.getElementById('cid-input-grid')) return;
        N = 6; input = makeDefaultInput(N);
        kernel = PRESETS.vertical.map(r => [...r]);
        outSize = N - KS + 1; totalSteps = outSize * outSize; step = -1;
        calcOutput(); render();

        // Size buttons
        document.querySelectorAll('.conv-size-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                document.querySelectorAll('.conv-size-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                setInputSize(parseInt(this.dataset.size));
            });
        });

        // Preset buttons
        document.querySelectorAll('.conv-preset-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                document.querySelectorAll('.conv-preset-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                setPreset(this.dataset.preset);
            });
        });

        // Input action buttons
        document.getElementById('cid-btn-random')?.addEventListener('click', () => {
            input = Array.from({length: N}, () => Array.from({length: N}, () => Math.random() > 0.5 ? 1 : 0));
            calcOutput(); step = -1; render();
        });
        document.getElementById('cid-btn-clear')?.addEventListener('click', () => {
            input = Array.from({length: N}, () => Array(N).fill(0));
            calcOutput(); step = -1; render();
        });
        document.getElementById('cid-btn-fill')?.addEventListener('click', () => {
            input = Array.from({length: N}, () => Array(N).fill(1));
            calcOutput(); step = -1; render();
        });

        // Playback controls
        document.getElementById('cid-btn-reset')?.addEventListener('click', reset);
        document.getElementById('cid-btn-prev')?.addEventListener('click', prevStep);
        document.getElementById('cid-btn-next')?.addEventListener('click', nextStep);
        document.getElementById('cid-btn-play')?.addEventListener('click', () => playing ? stopPlay() : startPlay());
        document.getElementById('cid-speed-select')?.addEventListener('change', e => {
            speed = parseInt(e.target.value);
            if (playing) { stopPlay(); startPlay(); }
        });
    }

    // Init on DOM ready
    document.readyState === 'loading'
        ? document.addEventListener('DOMContentLoaded', init)
        : init();
})();


