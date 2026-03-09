/**
 * 발성과 발음 수업 관리 시스템
 * 한국방송예술진흥원 | 윤소윤 교수
 */

// ========================================
// 데이터 관리
// ========================================

const DATA_KEY = 'kbas_breath_training_data';
const DELETE_PASSWORD = '2026';

const CLASS_NAMES = {
    'mon-am': '월요일 오전반',
    'mon-pm': '월요일 오후반',
    'tue-pm': '화요일 오후반'
};

// 데이터 초기화
function initData() {
    const existingData = localStorage.getItem(DATA_KEY);
    if (!existingData) {
        const initialData = {
            'mon-am': [],
            'mon-pm': [],
            'tue-pm': []
        };
        localStorage.setItem(DATA_KEY, JSON.stringify(initialData));
    }
}

// 전체 데이터 가져오기
function getData() {
    const data = localStorage.getItem(DATA_KEY);
    return data ? JSON.parse(data) : { 'mon-am': [], 'mon-pm': [], 'tue-pm': [] };
}

// 데이터 저장
function saveData(data) {
    localStorage.setItem(DATA_KEY, JSON.stringify(data));
}

// 특정 반의 학생 목록 가져오기
function getStudents(classId) {
    const data = getData();
    return data[classId] || [];
}

// 학생 추가
function addStudent(classId, student) {
    const data = getData();
    student.id = Date.now().toString();
    student.records = [];
    data[classId].push(student);
    saveData(data);
    return student;
}

// 학생 삭제
function deleteStudent(classId, studentId) {
    const data = getData();
    data[classId] = data[classId].filter(s => s.id !== studentId);
    saveData(data);
}

// 학생 찾기
function findStudent(classId, studentId) {
    const students = getStudents(classId);
    return students.find(s => s.id === studentId);
}

// 기록 추가
function addRecord(classId, studentId, record) {
    const data = getData();
    const student = data[classId].find(s => s.id === studentId);
    if (student) {
        student.records.push(record);
        // 날짜순 정렬
        student.records.sort((a, b) => new Date(a.date) - new Date(b.date));
        saveData(data);
    }
}

// 기록 수정
function updateRecord(classId, studentId, recordIndex, newRecord) {
    const data = getData();
    const student = data[classId].find(s => s.id === studentId);
    if (student && student.records[recordIndex]) {
        student.records[recordIndex] = newRecord;
        student.records.sort((a, b) => new Date(a.date) - new Date(b.date));
        saveData(data);
    }
}

// 기록 삭제
function deleteRecord(classId, studentId, recordIndex) {
    const data = getData();
    const student = data[classId].find(s => s.id === studentId);
    if (student) {
        student.records.splice(recordIndex, 1);
        saveData(data);
    }
}

// ========================================
// 유틸리티 함수
// ========================================

// 호흡 시간을 초로 변환
function breathTimeToSeconds(minutes, seconds) {
    return parseInt(minutes) * 60 + parseInt(seconds);
}

// 초를 호흡 시간 문자열로 변환
function secondsToBreathTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}'${seconds.toString().padStart(2, '0')}"`;
}

// 호흡 시간 변화 계산
function calculateChange(currentSeconds, previousSeconds) {
    const diff = currentSeconds - previousSeconds;
    if (diff > 0) {
        return { value: `+${diff}초`, class: 'positive' };
    } else if (diff < 0) {
        return { value: `${diff}초`, class: 'negative' };
    }
    return { value: '0초', class: 'neutral' };
}

// 날짜 포맷
function formatDate(dateStr) {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}월 ${day}일`;
}

// ========================================
// 페이지 네비게이션
// ========================================

let currentClass = null;
let currentStudent = null;

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
}

function showMainPage() {
    currentClass = null;
    currentStudent = null;
    showPage('main-page');
}

function showClassPage(classId) {
    currentClass = classId;
    currentStudent = null;
    document.getElementById('class-title').textContent = CLASS_NAMES[classId];
    renderStudentList();
    showPage('class-page');
}

function showStudentPage(studentId) {
    currentStudent = studentId;
    const student = findStudent(currentClass, studentId);
    if (student) {
        document.getElementById('student-name-title').textContent = student.name;
        document.getElementById('student-meta').textContent = `${student.year}학년 | ${student.dept}`;
        renderRecords();
        showPage('student-page');

        // 오늘 날짜를 기본값으로 설정
        document.getElementById('record-date').value = new Date().toISOString().split('T')[0];
    }
}

// ========================================
// 학생 목록 렌더링
// ========================================

function renderStudentList() {
    const students = getStudents(currentClass);
    const grid = document.getElementById('student-grid');

    if (students.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <p>등록된 학생이 없습니다.</p>
                <p>위의 "학생 등록하기" 버튼을 눌러 학생을 등록해주세요.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = students.map(student => {
        const latestRecord = student.records[student.records.length - 1];
        const breathSummary = latestRecord
            ? `최근 호흡: ${secondsToBreathTime(latestRecord.breathSeconds)}`
            : '기록 없음';

        return `
            <div class="student-card" data-student-id="${student.id}">
                <div class="name">${student.name}</div>
                <div class="info">${student.year}학년 | ${student.dept}</div>
                <div class="breath-summary">
                    <span class="label">호흡 기록:</span>
                    <span class="value">${student.records.length}회</span>
                </div>
            </div>
        `;
    }).join('');

    // 학생 카드 클릭 이벤트
    grid.querySelectorAll('.student-card').forEach(card => {
        card.addEventListener('click', () => {
            showStudentPage(card.dataset.studentId);
        });
    });
}

// ========================================
// 기록 테이블 렌더링
// ========================================

function renderRecords() {
    const student = findStudent(currentClass, currentStudent);
    if (!student) return;

    const tbody = document.getElementById('records-tbody');

    if (student.records.length === 0) {
        tbody.innerHTML = `
            <tr style="background: none; border: none; padding: 32px 16px;">
                <td colspan="6" style="text-align: center; color: var(--text-secondary); padding: 32px 16px; display: block;">
                    아직 기록이 없습니다.<br>위의 폼에서 첫 번째 기록을 추가해주세요.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = student.records.map((record, index) => {
        let changeHtml = '<span class="change neutral">-</span>';
        if (index > 0) {
            const change = calculateChange(
                record.breathSeconds,
                student.records[index - 1].breathSeconds
            );
            changeHtml = `<span class="change ${change.class}">${change.value}</span>`;
        }

        return `
            <tr>
                <td class="session-num" data-label="회차">${index + 1}회차</td>
                <td data-label="날짜">${formatDate(record.date)}</td>
                <td class="breath-time" data-label="호흡 시간">${secondsToBreathTime(record.breathSeconds)}</td>
                <td data-label="변화">${changeHtml}</td>
                <td class="note" data-label="배움 한 줄">${record.note || '-'}</td>
                <td class="actions">
                    <button class="action-btn edit" data-index="${index}">수정</button>
                    <button class="action-btn delete" data-index="${index}">삭제</button>
                </td>
            </tr>
        `;
    }).join('');

    // 수정/삭제 버튼 이벤트
    tbody.querySelectorAll('.action-btn.edit').forEach(btn => {
        btn.addEventListener('click', () => openEditModal(parseInt(btn.dataset.index)));
    });

    tbody.querySelectorAll('.action-btn.delete').forEach(btn => {
        btn.addEventListener('click', () => openDeleteModal('record', parseInt(btn.dataset.index)));
    });
}

// ========================================
// 모달 관리
// ========================================

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function openEditModal(recordIndex) {
    const student = findStudent(currentClass, currentStudent);
    if (!student || !student.records[recordIndex]) return;

    const record = student.records[recordIndex];
    const minutes = Math.floor(record.breathSeconds / 60);
    const seconds = record.breathSeconds % 60;

    document.getElementById('edit-record-index').value = recordIndex;
    document.getElementById('edit-date').value = record.date;
    document.getElementById('edit-minutes').value = minutes;
    document.getElementById('edit-seconds').value = seconds;
    document.getElementById('edit-note').value = record.note || '';

    openModal('edit-modal');
}

function openDeleteModal(type, index) {
    document.getElementById('delete-type').value = type;
    document.getElementById('delete-index').value = index;
    document.getElementById('delete-password').value = '';
    openModal('delete-modal');
}

// ========================================
// 이벤트 리스너 설정
// ========================================

function setupEventListeners() {
    // 반 선택 버튼
    document.querySelectorAll('.class-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            showClassPage(btn.dataset.class);
        });
    });

    // 뒤로가기 버튼
    document.getElementById('back-to-main').addEventListener('click', showMainPage);
    document.getElementById('back-to-class').addEventListener('click', () => {
        showClassPage(currentClass);
    });

    // 학생 등록 모달
    document.getElementById('register-student-btn').addEventListener('click', () => {
        document.getElementById('register-form').reset();
        document.getElementById('student-dept-custom').style.display = 'none';
        openModal('register-modal');
    });

    document.getElementById('close-register-modal').addEventListener('click', () => {
        closeModal('register-modal');
    });

    // 학과 직접입력 처리
    document.getElementById('student-dept').addEventListener('change', (e) => {
        const customInput = document.getElementById('student-dept-custom');
        if (e.target.value === '직접입력') {
            customInput.style.display = 'block';
            customInput.required = true;
        } else {
            customInput.style.display = 'none';
            customInput.required = false;
            customInput.value = '';
        }
    });

    // 학생 등록 폼
    document.getElementById('register-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('student-name').value.trim();
        const year = document.getElementById('student-year').value;
        let dept = document.getElementById('student-dept').value;

        // 직접입력인 경우 커스텀 입력값 사용
        if (dept === '직접입력') {
            dept = document.getElementById('student-dept-custom').value.trim();
        }

        if (name && year && dept) {
            addStudent(currentClass, { name, year, dept });
            closeModal('register-modal');
            renderStudentList();
        }
    });

    // 기록 추가 폼
    document.getElementById('record-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const date = document.getElementById('record-date').value;
        const minutes = document.getElementById('breath-minutes').value;
        const seconds = document.getElementById('breath-seconds').value;
        const note = document.getElementById('lesson-note').value.trim();

        if (date && minutes !== '' && seconds !== '') {
            const breathSeconds = breathTimeToSeconds(minutes, seconds);
            addRecord(currentClass, currentStudent, { date, breathSeconds, note });
            document.getElementById('record-form').reset();
            document.getElementById('record-date').value = new Date().toISOString().split('T')[0];
            renderRecords();
        }
    });

    // 기록 수정 모달
    document.getElementById('close-edit-modal').addEventListener('click', () => {
        closeModal('edit-modal');
    });

    document.getElementById('edit-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const index = parseInt(document.getElementById('edit-record-index').value);
        const date = document.getElementById('edit-date').value;
        const minutes = document.getElementById('edit-minutes').value;
        const seconds = document.getElementById('edit-seconds').value;
        const note = document.getElementById('edit-note').value.trim();

        const breathSeconds = breathTimeToSeconds(minutes, seconds);
        updateRecord(currentClass, currentStudent, index, { date, breathSeconds, note });
        closeModal('edit-modal');
        renderRecords();
    });

    // 삭제 모달
    document.getElementById('close-delete-modal').addEventListener('click', () => {
        closeModal('delete-modal');
    });

    document.getElementById('cancel-delete').addEventListener('click', () => {
        closeModal('delete-modal');
    });

    document.getElementById('delete-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const password = document.getElementById('delete-password').value;

        if (password !== DELETE_PASSWORD) {
            alert('비밀번호가 올바르지 않습니다.');
            return;
        }

        const type = document.getElementById('delete-type').value;
        const index = parseInt(document.getElementById('delete-index').value);

        if (type === 'record') {
            deleteRecord(currentClass, currentStudent, index);
            renderRecords();
        } else if (type === 'student') {
            deleteStudent(currentClass, currentStudent);
            showClassPage(currentClass);
        }

        closeModal('delete-modal');
    });

    // 학생 삭제 버튼
    document.getElementById('delete-student-btn').addEventListener('click', () => {
        openDeleteModal('student', 0);
    });

    // 모달 외부 클릭 시 닫기
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });

    // ESC 키로 모달 닫기
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.active').forEach(modal => {
                modal.classList.remove('active');
            });
        }
    });
}

// ========================================
// 앱 초기화
// ========================================

function init() {
    initData();
    setupEventListeners();
    showMainPage();
}

// DOM 로드 후 초기화
document.addEventListener('DOMContentLoaded', init);
