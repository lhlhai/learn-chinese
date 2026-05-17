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
    lessonsNew: [], // Bộ hình & Bộ thanh
    grammar: [],
    reading: [],
    listening: [],
    roadmap: [],
    srsData: JSON.parse(localStorage.getItem('srs_data')) || {},
    streak: JSON.parse(localStorage.getItem('streak_data')) || { count: 0, lastDate: null },
    currentView: 'home',
    currentLesson: null,
    currentGrammarIndex: 0,
    reviewQueue: [],
    currentCardIndex: 0,
    isFlipped: false,
    practiceWord: null,
    currentWriters: [],
    isRecording: false,
    recognition: null,
    learningMode: 'traditional' // 'traditional' hoặc 'radical_phonetic'
};

// Initialize App
async function init() {
    try {
        const [vocabRes, lessonsRes, lessonsNewRes, grammarRes, readingRes, listeningRes, roadmapRes] = await Promise.all([
            fetch('data/vocab.json'),
            fetch('data/lessons.json'),
            fetch('data/lessons_new.json'),
            fetch('data/grammar.json'),
            fetch('data/reading.json'),
            fetch('data/listening.json'),
            fetch('data/roadmap.json')
        ]);
        state.vocab = await vocabRes.json();
        state.lessons = await lessonsRes.json();
        state.lessonsNew = await lessonsNewRes.json();
        state.grammar = await grammarRes.json();
        state.reading = await readingRes.json();
        state.listening = await listeningRes.json();
        state.roadmap = await roadmapRes.json();
        
        initSpeechRecognition();
        updateStreak();
        render();
        
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

// Speech Recognition Init
function initSpeechRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        state.recognition = new SpeechRecognition();
        state.recognition.lang = 'zh-CN';
        state.recognition.interimResults = false;
        state.recognition.maxAlternatives = 1;

        state.recognition.onresult = (event) => {
            const result = event.results[0][0].transcript;
            handleSpeechResult(result);
        };

        state.recognition.onend = () => {
            state.isRecording = false;
            render();
        };

        state.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            state.isRecording = false;
            render();
        };
    }
}

function handleSpeechResult(result) {
    const target = state.practiceWord ? state.practiceWord.hanzi : "";
    const resultEl = document.getElementById('recognition-output');
    if (resultEl) {
        const isCorrect = result.includes(target) || target.includes(result);
        resultEl.innerHTML = `
            <p>Bạn đã nói: <strong style="color: var(--primary)">${result}</strong></p>
            <p>${isCorrect ? '✅ Phát âm rất tốt!' : '❌ Thử lại nhé, cố lên!'}</p>
        `;
    }
}

// SRS Logic
function updateSRS(wordId, success) {
    if (!CONFIG.SRS_ENABLED) return;
    let item = state.srsData[wordId] || {
        interval: 0,
        repetitions: 0,
        easeFactor: 2.5,
        nextReview: new Date().toISOString().split('T')[0]
    };
    if (success) {
        if (item.repetitions === 0) item.interval = 1;
        else if (item.repetitions === 1) item.interval = 3;
        else item.interval = Math.round(item.interval * item.easeFactor);
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
    if (lastDate === yesterdayStr) state.streak.count++;
    else if (lastDate !== today) state.streak.count = 1;
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
        if (view === 'reading_detail') state.currentReading = params;
        if (view === 'listening_detail') state.currentListening = params;
    }
    render();
    window.scrollTo(0, 0);
}

function render() {
    const main = document.querySelector('main');
    const streakEl = document.querySelector('.streak-count');
    if (streakEl) streakEl.textContent = state.streak.count;

    switch (state.currentView) {
        case 'home': renderHome(main); break;
        case 'lesson': renderLesson(main); break;
        case 'review': renderReview(main); break;
        case 'practice': renderStrokeOrder(main); break;
        case 'grammar': renderGrammar(main); break;
        case 'list': renderLessonList(main); break;
        case 'practice_menu': renderPracticeMenu(main); break;
        case 'reading_list': renderReadingList(main); break;
        case 'reading_detail': renderReadingDetail(main); break;
        case 'listening_list': renderListeningList(main); break;
        case 'listening_detail': renderListeningDetail(main); break;
        case 'speaking_practice': renderSpeakingPractice(main); break;
        case 'roadmap': renderRoadmap(main); break;
        case 'learning_mode': renderLearningMode(main); break;
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
            <h3>Chọn kiểu học</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-top: 1rem;">
                <button class="btn btn-secondary" onclick="navigate('learning_mode')">📚 Chế độ học</button>
                <button class="btn btn-secondary" onclick="navigate('practice_menu')">🎯 Luyện tập</button>
            </div>
        </div>
        <div class="card">
            <h3>Kỹ năng hôm nay</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-top: 1rem;">
                <button class="btn btn-secondary" onclick="navigate('speaking_practice')">🗣️ Luyện nói</button>
                <button class="btn btn-secondary" onclick="navigate('listening_list')">🎧 Luyện nghe</button>
                <button class="btn btn-secondary" onclick="navigate('reading_list')">📖 Đọc hiểu</button>
                <button class="btn btn-secondary" onclick="navigate('roadmap')">🗺️ Lộ trình</button>
            </div>
        </div>
    `;
}

function renderLearningMode(container) {
    container.innerHTML = `
        <button class="btn btn-secondary" style="width: auto; margin-bottom: 1rem;" onclick="navigate('home')">← Quay lại</button>
        <h2>Chọn kiểu học</h2>
        <div class="card" onclick="state.learningMode = 'traditional'; navigate('list')">
            <h3>📖 Học theo bài</h3>
            <p>Học từ vựng theo các bài học có tổ chức theo chủ đề.</p>
        </div>
        <div class="card" onclick="state.learningMode = 'radical_phonetic'; navigate('list')">
            <h3>🔤 Học theo Bộ hình & Bộ thanh</h3>
            <p>Học từ vựng theo bộ thủ (radical) và bộ thanh (phonetic) để nhớ lâu hơn.</p>
        </div>
    `;
}

function renderPracticeMenu(container) {
    container.innerHTML = `
        <h2>Trung tâm Luyện tập</h2>
        <div class="card" onclick="navigate('speaking_practice')">
            <h3>🗣️ Luyện nói</h3>
            <p>Nhận diện giọng nói và kiểm tra phát âm.</p>
        </div>
        <div class="card" onclick="navigate('listening_list')">
            <h3>🎧 Luyện nghe</h3>
            <p>Bài tập nghe hiểu hội thoại và câu đơn.</p>
        </div>
        <div class="card" onclick="navigate('reading_list')">
            <h3>📖 Đọc hiểu</h3>
            <p>Các đoạn văn ngắn theo cấp độ HSK.</p>
        </div>
    `;
}

function renderReadingList(container) {
    let html = '<h2>Bài tập Đọc hiểu</h2>';
    state.reading.forEach(item => {
        html += `
            <div class="lesson-item" onclick="navigate('reading_detail', ${JSON.stringify(item).replace(/"/g, '&quot;')})">
                <div class="lesson-info">
                    <h3>${item.title}</h3>
                    <p>Cấp độ: ${item.level}</p>
                </div>
                <span>➔</span>
            </div>
        `;
    });
    container.innerHTML = html;
}

function renderReadingDetail(container) {
    const item = state.currentReading;
    container.innerHTML = `
        <button class="btn btn-secondary" style="width: auto; margin-bottom: 1rem;" onclick="navigate('reading_list')">← Quay lại</button>
        <div class="card">
            <h2>${item.title}</h2>
            <p class="roadmap-month">${item.level}</p>
            <div class="passage-content" style="margin-top: 1rem;">
                <p>${item.content}</p>
                <small style="color: var(--accent); display: block; margin-top: 0.5rem;">${item.pinyin}</small>
            </div>
            <button class="btn btn-secondary" onclick="toggleTranslation()">Xem dịch nghĩa</button>
            <div id="translation" class="hidden" style="margin-top: 1rem; padding: 1rem; background: rgba(255,255,255,0.05); border-radius: 8px;">
                ${item.translation}
            </div>
        </div>
        <h3>Câu hỏi kiểm tra</h3>
        ${item.questions.map((q, qIdx) => `
            <div class="card question-card">
                <p><strong>Câu ${qIdx + 1}:</strong> ${q.q}</p>
                <div style="margin-top: 1rem;">
                    ${q.options.map((opt, oIdx) => `
                        <button class="option-btn" onclick="checkAnswer(this, ${oIdx}, ${q.answer})">${opt}</button>
                    `).join('')}
                </div>
            </div>
        `).join('')}
    `;
}

function renderListeningList(container) {
    let html = '<h2>Bài tập Luyện nghe</h2>';
    state.listening.forEach(item => {
        html += `
            <div class="lesson-item" onclick="navigate('listening_detail', ${JSON.stringify(item).replace(/"/g, '&quot;')})">
                <div class="lesson-info">
                    <h3>${item.title}</h3>
                    <p>Cấp độ: ${item.level}</p>
                </div>
                <span>➔</span>
            </div>
        `;
    });
    container.innerHTML = html;
}

function renderListeningDetail(container) {
    const item = state.currentListening;
    container.innerHTML = `
        <button class="btn btn-secondary" style="width: auto; margin-bottom: 1rem;" onclick="navigate('listening_list')">← Quay lại</button>
        <div class="card" style="text-align: center;">
            <h2>${item.title}</h2>
            <p class="roadmap-month">${item.level}</p>
            <div style="margin: 2rem 0;">
                <button class="mic-btn" onclick="speak('${item.audio_text}')">🔊</button>
                <p>Nhấn để nghe</p>
            </div>
        </div>
        <h3>Câu hỏi nghe hiểu</h3>
        ${item.questions.map((q, qIdx) => `
            <div class="card question-card">
                <p><strong>Câu ${qIdx + 1}:</strong> ${q.q}</p>
                <div style="margin-top: 1rem;">
                    ${q.options.map((opt, oIdx) => `
                        <button class="option-btn" onclick="checkAnswer(this, ${oIdx}, ${q.answer})">${opt}</button>
                    `).join('')}
                </div>
            </div>
        `).join('')}
    `;
}

function renderSpeakingPractice(container) {
    const word = state.practiceWord || state.vocab[Math.floor(Math.random() * state.vocab.length)];
    state.practiceWord = word;
    container.innerHTML = `
        <button class="btn btn-secondary" style="width: auto; margin-bottom: 1rem;" onclick="navigate('home')">← Quay lại</button>
        <div class="card" style="text-align: center;">
            <h2>Luyện phát âm</h2>
            <div style="margin: 2rem 0;">
                <span style="font-size: 3rem; font-weight: bold; display: block;">${word.hanzi}</span>
                <span style="color: var(--accent); font-size: 1.5rem;">${word.pinyin}</span>
                <p style="margin-top: 0.5rem;">${word.meaning}</p>
            </div>
            <button class="btn btn-secondary" style="width: auto;" onclick="speak('${word.hanzi}')">🔊 Nghe mẫu</button>
            <hr style="margin: 1.5rem 0; border: 0; border-top: 1px solid #333;">
            <button class="mic-btn ${state.isRecording ? 'recording' : ''}" onclick="toggleRecording()">
                ${state.isRecording ? '🛑' : '🎤'}
            </button>
            <p>${state.isRecording ? 'Đang nghe...' : 'Nhấn mic để nói'}</p>
            <div id="recognition-output" class="recognition-result">
                <p style="color: #888;">Kết quả sẽ hiển thị tại đây</p>
            </div>
            <button class="btn" onclick="navigate('speaking_practice', null)">Từ khác ➔</button>
        </div>
    `;
}

function renderRoadmap(container) {
    let html = '<h2>Lộ trình học tập HSK 2-3</h2>';
    state.roadmap.forEach(item => {
        html += `
            <div class="roadmap-item">
                <div class="roadmap-month">${item.month} <span class="roadmap-status">${item.status === 'in-progress' ? '🔄 Đang học' : '⏳ Chờ'}</span></div>
                <h3>${item.title}</h3>
                <p><strong>Mục tiêu:</strong> ${item.goal}</p>
                <ul style="margin-left: 1.5rem; margin-top: 0.5rem;">
                    ${item.tasks.map(t => `<li>${t}</li>`).join('')}
                </ul>
            </div>
        `;
    });
    container.innerHTML = html;
}

// Actions
window.toggleRecording = function() {
    if (!state.recognition) {
        alert("Trình duyệt của bạn không hỗ trợ nhận diện giọng nói.");
        return;
    }
    if (state.isRecording) {
        state.recognition.stop();
    } else {
        state.isRecording = true;
        state.recognition.start();
        render();
    }
};

window.checkAnswer = function(btn, selected, correct) {
    const options = btn.parentElement.querySelectorAll('.option-btn');
    options.forEach(opt => opt.disabled = true);
    if (selected === correct) {
        btn.classList.add('correct');
    } else {
        btn.classList.add('wrong');
        options[correct].classList.add('correct');
    }
};

window.toggleTranslation = function() {
    const el = document.getElementById('translation');
    el.classList.toggle('hidden');
};

window.flipCard = function() { state.isFlipped = !state.isFlipped; render(); };
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
    if (dueWords.length > 0) navigate('review', dueWords);
    else alert('Không có từ nào cần ôn tập hôm nay!');
};

// Hanzi Writer Integration - Luyện viết (GIỮ NGUYÊN)
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
    state.currentWriters = [];
    setTimeout(() => {
        if (typeof HanziWriter !== 'undefined') {
            characters.forEach((char, index) => {
                const writer = HanziWriter.create(`char-${index}`, char, {
                    width: 150, height: 150, padding: 5, strokeAnimationSpeed: 1, delayBetweenStrokes: 500
                });
                state.currentWriters.push(writer);
            });
            animateSequentially(0);
        }
    }, 100);
}

function animateSequentially(index) {
    if (index < state.currentWriters.length) {
        state.currentWriters[index].animateCharacter({ onComplete: () => animateSequentially(index + 1) });
    }
}

function renderGrammar(container) {
    let html = `<button class="btn btn-secondary" style="width: auto; margin-bottom: 1rem;" onclick="navigate('home')">← Quay lại</button><h2>Ngữ pháp</h2><div class="grammar-nav" style="display: flex; gap: 0.5rem; margin-bottom: 1rem; overflow-x: auto;">`;
    state.grammar.forEach((g, index) => {
        html += `<button class="btn ${state.currentGrammarIndex === index ? '' : 'btn-secondary'}" style="white-space: nowrap; font-size: 0.8rem;" onclick="state.currentGrammarIndex = ${index}; render()">${g.title}</button>`;
    });
    html += `</div>`;
    if (state.grammar.length > 0) {
        const grammar = state.grammar[state.currentGrammarIndex];
        html += `<div class="card"><h3>${grammar.title}</h3><p style="margin: 1rem 0;">${grammar.description}</p><div style="background: #f0f0f0; padding: 1rem; border-radius: 8px; margin: 1rem 0; color: #333;"><strong>Cấu trúc:</strong> ${grammar.structure}</div><h4 style="margin-top: 1rem;">Ví dụ:</h4>${grammar.examples.map(ex => `<div class="dialogue-line" onclick="speak('${ex.hanzi}')"><div style="font-size: 1.2rem; font-weight: bold; margin-bottom: 0.5rem;">${ex.hanzi}</div><div style="color: var(--accent); margin-bottom: 0.5rem;">${ex.pinyin}</div><div style="color: #888;">${ex.vn}</div></div>`).join('')}</div>`;
    }
    container.innerHTML = html;
}

function renderLessonList(container) {
    let html = '<h2>Danh sách bài học</h2>';
    
    // Chọn danh sách bài học dựa trên chế độ học
    const lessons = state.learningMode === 'radical_phonetic' ? state.lessonsNew : state.lessons;
    
    lessons.forEach(lesson => {
        const type = lesson.type ? ` (${lesson.type === 'radical' ? 'Bộ hình' : 'Bộ thanh'})` : '';
        html += `<div class="lesson-item" onclick="navigate('lesson', ${JSON.stringify(lesson).replace(/"/g, '&quot;')})"><div class="lesson-info"><h3>${lesson.title}${type}</h3><p>${lesson.vocab_ids.length} từ vựng</p></div><span>➔</span></div>`;
    });
    container.innerHTML = html;
}

function renderLesson(container) {
    const lesson = state.currentLesson;
    const vocab = state.vocab.filter(v => lesson.vocab_ids.includes(v.id));
    const typeLabel = lesson.type ? (lesson.type === 'radical' ? '(Bộ hình)' : '(Bộ thanh)') : '';
    
    let html = `<button class="btn btn-secondary" style="width: auto; margin-bottom: 1rem;" onclick="navigate('home')">← Quay lại</button><h2>${lesson.title} ${typeLabel}</h2>`;
    
    if (lesson.description) {
        html += `<div class="card"><p>${lesson.description}</p></div>`;
    }
    
    if (lesson.dialogue) {
        html += `<div class="card"><h3>Hội thoại</h3>${lesson.dialogue.map(d => `<div class="dialogue-line" onclick="speak('${d.hanzi}')"><span class="speaker">${d.speaker}:</span><span class="hanzi-sm">${d.hanzi}</span><br><small>${d.pinyin}</small><br><small style="color: #888">${d.vn}</small></div>`).join('')}</div>`;
    }
    
    html += `<h3>Từ vựng</h3>${vocab.map(v => `<div class="card"><div style="display: flex; justify-content: space-between; align-items: center;"><div onclick="speak('${v.hanzi}')" style="flex: 1; cursor: pointer;"><span style="font-size: 1.5rem; font-weight: bold;">${v.hanzi}</span><span style="color: var(--accent); margin-left: 10px;">${v.pinyin}</span></div><span onclick="speak('${v.hanzi}')" style="cursor: pointer; font-size: 1.2rem;">🔊</span></div><p>${v.meaning}</p><button class="btn btn-secondary" style="width: auto; margin-top: 0.5rem; font-size: 0.8rem;" onclick="navigate('practice', ${JSON.stringify(v).replace(/"/g, '&quot;')})">✍️ Luyện viết</button></div>`).join('')}<button class="btn" onclick="startReviewFromLesson()">Ôn tập bài này</button>`;
    container.innerHTML = html;
}

function renderReview(container) {
    if (state.currentCardIndex >= state.reviewQueue.length) {
        container.innerHTML = `<div class="card" style="text-align: center;"><h2>Hoàn thành!</h2><p>Bạn đã hoàn thành tất cả các thẻ ôn tập.</p><button class="btn" onclick="navigate('home')">Về trang chủ</button></div>`;
        return;
    }
    const word = state.reviewQueue[state.currentCardIndex];
    container.innerHTML = `<div class="flashcard-container"><div class="flashcard ${state.isFlipped ? 'flipped' : ''}" onclick="flipCard()"><div class="flashcard-front"><div class="hanzi">${word.hanzi}</div><p>Nhấn để xem nghĩa</p></div><div class="flashcard-back"><div class="pinyin">${word.pinyin}</div><div class="meaning">${word.meaning}</div><div class="example">${word.example}</div><button class="btn btn-secondary" style="width: auto; margin-top: 1rem;" onclick="event.stopPropagation(); speak('${word.hanzi}')">🔊 Nghe</button></div></div></div><div class="srs-controls ${state.isFlipped ? '' : 'hidden'}"><button class="btn btn-secondary" onclick="handleSRS(false)">Quên</button><button class="btn" onclick="handleSRS(true)">Nhớ</button></div>`;
}

function updateNav() {
    document.querySelectorAll('.nav-item').forEach(item => {
        const onclickAttr = item.getAttribute('onclick');
        if (onclickAttr) {
            const match = onclickAttr.match(/'([^']+)'/);
            if (match) {
                const view = match[1];
                if (view === state.currentView) item.classList.add('active');
                else item.classList.remove('active');
            }
        }
    });
}

window.navigate = navigate;
window.startReviewFromLesson = function() {
    const lesson = state.currentLesson;
    const vocab = state.vocab.filter(v => lesson.vocab_ids.includes(v.id));
    navigate('review', vocab);
};
window.replayStroke = function() { if (state.currentWriters.length > 0) { state.currentWriters.forEach(w => w.reset()); animateSequentially(0); } };
window.resetStroke = function() { if (state.currentWriters.length > 0) { state.currentWriters.forEach(w => w.reset()); } };

init();
