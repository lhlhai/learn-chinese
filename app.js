// Configuration
const CONFIG = {
    SPEECH_ENABLED: true,
    SRS_ENABLED: true,
    OFFLINE_MODE: true,
    STROKE_ORDER_ENABLED: true,
    GRAMMAR_ENABLED: true
};

// State Management
const state = {
    vocab: [],
    lessons: [],
    grammar: [],
    srsData: JSON.parse(localStorage.getItem('srs_data')) || {},
    streak: JSON.parse(localStorage.getItem('streak_data')) || { count: 0, lastDate: null },
    currentView: 'home',
    currentLesson: null,
    currentGrammarIndex: 0,
    reviewQueue: [],
    currentCardIndex: 0,
    isFlipped: false,
    practiceWord: null,
    currentWriters: []
};

// Initialize App
async function init() {
    try {
        const [vocabRes, lessonsRes, grammarRes] = await Promise.all([
            fetch('data/vocab.json'),
            fetch('data/lessons.json'),
            fetch('data/grammar.json')
        ]);
        state.vocab = await vocabRes.json();
        state.lessons = await lessonsRes.json();
        state.grammar = await grammarRes.json();
        
        updateStreak();
        render();
        
        // Register Service Worker
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('sw.js')
                    .then(reg => console.log('SW registered'))
                    .catch(err => console.log('SW registration failed', err));
            });
        }
    } catch (error) {
        console.error('Initialization failed:', error);
    }
}

// SRS Logic (SM-2 Variation)
function updateSRS(wordId, success) {
    if (!CONFIG.SRS_ENABLED) return;

    let item = state.srsData[wordId] || {
        interval: 0,
        repetitions: 0,
        easeFactor: 2.5,
        nextReview: new Date().toISOString().split('T')[0]
    };

    if (success) {
        if (item.repetitions === 0) {
            item.interval = 1;
        } else if (item.repetitions === 1) {
            item.interval = 3;
        } else {
            item.interval = Math.round(item.interval * item.easeFactor);
        }
        item.repetitions++;
    } else {
        item.repetitions = 0;
        item.interval = 1;
        item.easeFactor = Math.max(1.3, item.easeFactor - 0.2);
    }

    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + item.interval);
    item.nextReview = nextDate.toISOString().split('T')[0];

    state.srsData[wordId] = item;
    localStorage.setItem('srs_data', JSON.stringify(state.srsData));
}

// Streak Logic
function updateStreak() {
    const today = new Date().toISOString().split('T')[0];
    const lastDate = state.streak.lastDate;

    if (lastDate === today) return;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (lastDate === yesterdayStr) {
        state.streak.count++;
    } else if (lastDate !== today) {
        state.streak.count = 1;
    }
    
    state.streak.lastDate = today;
    localStorage.setItem('streak_data', JSON.stringify(state.streak));
}

// Speech Synthesis
function speak(text) {
    if (!CONFIG.SPEECH_ENABLED) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    window.speechSynthesis.speak(utterance);
}

// Routing & Rendering
function navigate(view, params = null) {
    state.currentView = view;
    if (params) {
        if (view === 'lesson') state.currentLesson = params;
        if (view === 'review') {
            state.reviewQueue = params;
            state.currentCardIndex = 0;
            state.isFlipped = false;
        }
        if (view === 'practice') state.practiceWord = params;
    }
    render();
    window.scrollTo(0, 0);
}

function render() {
    const main = document.querySelector('main');
    const streakEl = document.querySelector('.streak-count');
    streakEl.textContent = state.streak.count;

    switch (state.currentView) {
        case 'home':
            renderHome(main);
            break;
        case 'lesson':
            renderLesson(main);
            break;
        case 'review':
            renderReview(main);
            break;
        case 'practice':
            renderStrokeOrder(main);
            break;
        case 'grammar':
            renderGrammar(main);
            break;
        case 'list':
            renderLessonList(main);
            break;
    }
    
    updateNav();
}

function renderHome(container) {
    const today = new Date().toISOString().split('T')[0];
    const dueWords = state.vocab.filter(v => {
        const srs = state.srsData[v.id];
        return !srs || srs.nextReview <= today;
    });

    container.innerHTML = `
        <div class="card">
            <h2>Chào mừng bạn!</h2>
            <p>Hôm nay bạn có <strong>${dueWords.length}</strong> từ cần ôn tập.</p>
            <button class="btn" onclick="startReview()">Bắt đầu ôn tập</button>
        </div>
        <div class="card">
            <h3>Bài học tiếp theo</h3>
            <p>${state.lessons.length > 0 ? state.lessons[0].title : 'Chưa có bài học'}</p>
            ${state.lessons.length > 0 ? `<button class="btn btn-secondary" onclick="navigate('lesson', state.lessons[0])">Học ngay</button>` : ''}
        </div>
    `;
}

function renderLessonList(container) {
    let html = '<h2>Danh sách bài học</h2>';
    state.lessons.forEach(lesson => {
        html += `
            <div class="lesson-item" onclick="navigate('lesson', ${JSON.stringify(lesson).replace(/"/g, '&quot;')})">
                <div class="lesson-info">
                    <h3>${lesson.title}</h3>
                    <p>${lesson.vocab_ids.length} từ vựng</p>
                </div>
                <span>➔</span>
            </div>
        `;
    });
    container.innerHTML = html;
}

function renderLesson(container) {
    const lesson = state.currentLesson;
    const vocab = state.vocab.filter(v => lesson.vocab_ids.includes(v.id));
    
    let html = `
        <button class="btn btn-secondary" style="width: auto; margin-bottom: 1rem;" onclick="navigate('home')">← Quay lại</button>
        <h2>${lesson.title}</h2>
        <div class="card">
            <h3>Hội thoại</h3>
            ${lesson.dialogue.map(d => `
                <div class="dialogue-line" onclick="speak('${d.hanzi}')">
                    <span class="speaker">${d.speaker}:</span>
                    <span class="hanzi-sm">${d.hanzi}</span><br>
                    <small>${d.pinyin}</small><br>
                    <small style="color: #888">${d.vn}</small>
                </div>
            `).join('')}
        </div>
        <h3>Từ vựng</h3>
        ${vocab.map(v => `
            <div class="card">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div onclick="speak('${v.hanzi}')" style="flex: 1; cursor: pointer;">
                        <span style="font-size: 1.5rem; font-weight: bold;">${v.hanzi}</span>
                        <span style="color: var(--accent); margin-left: 10px;">${v.pinyin}</span>
                    </div>
                    <span onclick="speak('${v.hanzi}')" style="cursor: pointer; font-size: 1.2rem;">🔊</span>
                </div>
                <p>${v.meaning}</p>
                ${CONFIG.STROKE_ORDER_ENABLED ? `<button class="btn btn-secondary" style="width: auto; margin-top: 0.5rem; font-size: 0.8rem;" onclick="navigate('practice', ${JSON.stringify(v).replace(/"/g, '&quot;')})">✍️ Luyện viết</button>` : ''}
            </div>
        `).join('')}
        <button class="btn" onclick="startReviewFromLesson()">Ôn tập bài này</button>
    `;
    container.innerHTML = html;
}

function renderReview(container) {
    if (state.currentCardIndex >= state.reviewQueue.length) {
        container.innerHTML = `
            <div class="card" style="text-align: center;">
                <h2>Hoàn thành!</h2>
                <p>Bạn đã hoàn thành tất cả các thẻ ôn tập.</p>
                <button class="btn" onclick="navigate('home')">Về trang chủ</button>
            </div>
        `;
        return;
    }

    const word = state.reviewQueue[state.currentCardIndex];
    container.innerHTML = `
        <div class="flashcard-container">
            <div class="flashcard ${state.isFlipped ? 'flipped' : ''}" onclick="flipCard()">
                <div class="flashcard-front">
                    <div class="hanzi">${word.hanzi}</div>
                    <p>Nhấn để xem nghĩa</p>
                </div>
                <div class="flashcard-back">
                    <div class="pinyin">${word.pinyin}</div>
                    <div class="meaning">${word.meaning}</div>
                    <div class="example">${word.example}</div>
                    <button class="btn btn-secondary" style="width: auto; margin-top: 1rem;" onclick="event.stopPropagation(); speak('${word.hanzi}')">🔊 Nghe</button>
                </div>
            </div>
        </div>
        <div class="srs-controls ${state.isFlipped ? '' : 'hidden'}">
            <button class="btn btn-secondary" onclick="handleSRS(false)">Quên</button>
            <button class="btn" onclick="handleSRS(true)">Nhớ</button>
        </div>
    `;
}

function renderStrokeOrder(container) {
    const word = state.practiceWord;
    const characters = Array.from(word.hanzi);
    
    container.innerHTML = `
        <button class="btn btn-secondary" style="width: auto; margin-bottom: 1rem;" onclick="navigate('lesson', state.currentLesson)">← Quay lại</button>
        <h2>Luyện viết: ${word.hanzi}</h2>
        <div class="card">
            <p style="text-align: center; margin-bottom: 1rem;">${word.meaning} (${word.pinyin})</p>
            <div id="stroke-targets" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 10px;">
                ${characters.map((char, index) => `<div id="char-${index}" style="background: white; border: 1px solid #ccc; border-radius: 8px;"></div>`).join('')}
            </div>
            <div class="stroke-controls">
                <button class="stroke-btn" onclick="replayStroke()">▶ Phát lại</button>
                <button class="stroke-btn" onclick="resetStroke()">🔄 Đặt lại</button>
            </div>
        </div>
    `;
    
    // Initialize HanziWriter for each character
    state.currentWriters = [];
    setTimeout(() => {
        if (typeof HanziWriter !== 'undefined') {
            characters.forEach((char, index) => {
                const writer = HanziWriter.create(`char-${index}`, char, {
                    width: 150,
                    height: 150,
                    padding: 5,
                    strokeAnimationSpeed: 1,
                    delayBetweenStrokes: 500,
                    strokeColor: '#e63946'
                });
                state.currentWriters.push(writer);
            });
            
            // Animate characters sequentially
            animateSequentially(0);
        }
    }, 100);
}

function animateSequentially(index) {
    if (index < state.currentWriters.length) {
        state.currentWriters[index].animateCharacter({
            onComplete: () => animateSequentially(index + 1)
        });
    }
}

function renderGrammar(container) {
    let html = `
        <button class="btn btn-secondary" style="width: auto; margin-bottom: 1rem;" onclick="navigate('home')">← Quay lại</button>
        <h2>Ngữ pháp tiếng Trung</h2>
        <div class="grammar-nav" style="display: flex; gap: 0.5rem; margin-bottom: 1rem; overflow-x: auto;">
    `;
    
    state.grammar.forEach((g, index) => {
        html += `<button class="btn ${state.currentGrammarIndex === index ? '' : 'btn-secondary'}" style="white-space: nowrap; font-size: 0.8rem;" onclick="state.currentGrammarIndex = ${index}; render()">${g.title}</button>`;
    });
    
    html += `</div>`;
    
    if (state.grammar.length > 0) {
        const grammar = state.grammar[state.currentGrammarIndex];
        html += `
            <div class="card">
                <h3>${grammar.title}</h3>
                <p style="margin: 1rem 0;">${grammar.description}</p>
                <div style="background: #f0f0f0; padding: 1rem; border-radius: 8px; margin: 1rem 0; color: #333;">
                    <strong>Cấu trúc:</strong> ${grammar.structure}
                </div>
                <h4 style="margin-top: 1rem;">Ví dụ:</h4>
                ${grammar.examples.map(ex => `
                    <div class="dialogue-line" onclick="speak('${ex.hanzi}')">
                        <div style="font-size: 1.2rem; font-weight: bold; margin-bottom: 0.5rem;">${ex.hanzi}</div>
                        <div style="color: var(--accent); margin-bottom: 0.5rem;">${ex.pinyin}</div>
                        <div style="color: #888;">${ex.vn}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    container.innerHTML = html;
}

// Actions
window.flipCard = function() {
    state.isFlipped = !state.isFlipped;
    render();
};

window.handleSRS = function(success) {
    const word = state.reviewQueue[state.currentCardIndex];
    updateSRS(word.id, success);
    state.currentCardIndex++;
    state.isFlipped = false;
    render();
};

window.startReview = function() {
    const today = new Date().toISOString().split('T')[0];
    const dueWords = state.vocab.filter(v => {
        const srs = state.srsData[v.id];
        return !srs || srs.nextReview <= today;
    });
    if (dueWords.length > 0) {
        navigate('review', dueWords);
    } else {
        alert('Không có từ nào cần ôn tập hôm nay!');
    }
};

window.startReviewFromLesson = function() {
    const lesson = state.currentLesson;
    const vocab = state.vocab.filter(v => lesson.vocab_ids.includes(v.id));
    navigate('review', vocab);
};

window.replayStroke = function() {
    if (state.currentWriters.length > 0) {
        state.currentWriters.forEach(w => w.reset());
        animateSequentially(0);
    }
};

window.resetStroke = function() {
    if (state.currentWriters.length > 0) {
        state.currentWriters.forEach(w => w.reset());
    }
};

window.navigate = navigate;

function updateNav() {
    document.querySelectorAll('.nav-item').forEach(item => {
        const onclickAttr = item.getAttribute('onclick');
        if (onclickAttr) {
            const match = onclickAttr.match(/'([^']+)'/);
            if (match) {
                const view = match[1];
                if (view === state.currentView || (view === 'home' && state.currentView === 'review')) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            }
        }
    });
}

// Start App
init();
