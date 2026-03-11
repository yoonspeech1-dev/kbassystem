/**
 * 발성과 발음 수업 관리 시스템
 * 한국방송예술진흥원 | 윤소윤 교수
 */

// ========================================
// Supabase 설정
// ========================================

const SUPABASE_URL = 'https://cjnxhjofzrcdnqtwdbeb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqbnhoam9menJjZG5xdHdkYmViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMDI5MjQsImV4cCI6MjA4ODc3ODkyNH0.dU9rbRKBPz4pNH6MDW1_xNQEbIJYT9fwfkNZIL_MWvk';

let supabase;
try {
    const { createClient } = window.supabase;
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (e) {
    console.error('Supabase 초기화 오류:', e);
}

const DELETE_PASSWORD = '2026';

const CLASS_NAMES = {
    'mon-am': '월요일 오전반',
    'mon-pm': '월요일 오후반',
    'tue-pm': '화요일 오후반'
};

// ========================================
// 데이터 관리 (Supabase)
// ========================================

// 특정 반의 학생 목록 가져오기
async function getStudents(classId) {
    if (!supabase) {
        console.error('Supabase가 초기화되지 않았습니다.');
        return [];
    }

    try {
        const { data, error } = await supabase
            .from('students')
            .select('*, records(*)')
            .eq('class_id', classId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('학생 조회 오류:', error);
            return [];
        }

        // records를 날짜순 정렬
        return data.map(student => ({
            ...student,
            records: (student.records || []).sort((a, b) => new Date(a.date) - new Date(b.date))
        }));
    } catch (e) {
        console.error('학생 조회 예외:', e);
        return [];
    }
}

// 학생 추가
async function addStudent(classId, student) {
    const { data, error } = await supabase
        .from('students')
        .insert({
            class_id: classId,
            name: student.name,
            year: student.year,
            dept: student.dept
        })
        .select()
        .single();

    if (error) {
        console.error('학생 등록 오류:', error);
        alert('학생 등록에 실패했습니다.');
        return null;
    }

    return { ...data, records: [] };
}

// 학생 삭제
async function deleteStudent(classId, studentId) {
    const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', studentId);

    if (error) {
        console.error('학생 삭제 오류:', error);
        alert('학생 삭제에 실패했습니다.');
    }
}

// 학생 찾기
async function findStudent(classId, studentId) {
    const { data, error } = await supabase
        .from('students')
        .select('*, records(*)')
        .eq('id', studentId)
        .single();

    if (error) {
        console.error('학생 조회 오류:', error);
        return null;
    }

    return {
        ...data,
        records: (data.records || []).sort((a, b) => new Date(a.date) - new Date(b.date))
    };
}

// 기록 추가
async function addRecord(classId, studentId, record) {
    const { error } = await supabase
        .from('records')
        .insert({
            student_id: studentId,
            date: record.date,
            breath_seconds: record.breathSeconds,
            note: record.note || ''
        });

    if (error) {
        console.error('기록 추가 오류:', error);
        alert('기록 추가에 실패했습니다.');
    }
}

// 기록 수정
async function updateRecord(classId, studentId, recordId, newRecord) {
    const { error } = await supabase
        .from('records')
        .update({
            date: newRecord.date,
            breath_seconds: newRecord.breathSeconds,
            note: newRecord.note || ''
        })
        .eq('id', recordId);

    if (error) {
        console.error('기록 수정 오류:', error);
        alert('기록 수정에 실패했습니다.');
    }
}

// 기록 삭제
async function deleteRecord(classId, studentId, recordId) {
    const { error } = await supabase
        .from('records')
        .delete()
        .eq('id', recordId);

    if (error) {
        console.error('기록 삭제 오류:', error);
        alert('기록 삭제에 실패했습니다.');
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
let currentStudentData = null;

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
}

function showMainPage() {
    currentClass = null;
    currentStudent = null;
    currentStudentData = null;
    showPage('main-page');
}

async function showClassPage(classId) {
    currentClass = classId;
    currentStudent = null;
    currentStudentData = null;
    document.getElementById('class-title').textContent = CLASS_NAMES[classId];
    showPage('class-page');
    try {
        await renderStudentList();
    } catch (e) {
        console.error('학생 목록 로드 오류:', e);
        document.getElementById('student-grid').innerHTML = '<div class="empty-state"><p>데이터를 불러올 수 없습니다.</p></div>';
    }
}

async function showStudentPage(studentId) {
    currentStudent = studentId;
    const student = await findStudent(currentClass, studentId);
    if (student) {
        currentStudentData = student;
        document.getElementById('student-name-title').textContent = student.name;
        document.getElementById('student-meta').textContent = `${student.year}학년 | ${student.dept}`;
        renderRecords();
        showPage('student-page');

        // 오늘 날짜를 기본값으로 설정
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('breath-date').value = today;
        document.getElementById('note-date').value = today;
    }
}

// ========================================
// 학생 목록 렌더링
// ========================================

async function renderStudentList() {
    const grid = document.getElementById('student-grid');
    grid.innerHTML = '<div class="loading">불러오는 중...</div>';

    const students = await getStudents(currentClass);

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
            ? `최근 호흡: ${secondsToBreathTime(latestRecord.breath_seconds)}`
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
    const student = currentStudentData;
    if (!student) return;

    const list = document.getElementById('records-list');

    if (student.records.length === 0) {
        list.innerHTML = `
            <div class="records-empty">
                아직 기록이 없습니다.<br>호흡 시간을 기록해주세요.
            </div>
        `;
        return;
    }

    // 최신 기록이 위로 오도록 역순 표시
    const reversedRecords = [...student.records].reverse();

    list.innerHTML = reversedRecords.map((record, revIdx) => {
        const index = student.records.length - 1 - revIdx;

        let changeHtml = '<span class="change neutral">-</span>';
        if (index > 0) {
            const change = calculateChange(
                record.breath_seconds,
                student.records[index - 1].breath_seconds
            );
            changeHtml = `<span class="change ${change.class}">${change.value}</span>`;
        }

        const noteClass = record.note ? 'record-note' : 'record-note empty';
        const noteText = record.note || '배움 미입력';

        return `
            <div class="record-item">
                <div class="record-header">
                    <span class="record-num">${index + 1}회차</span>
                    <span class="record-date">${formatDate(record.date)}</span>
                    <div class="record-actions">
                        <button class="edit-btn" data-record-id="${record.id}" data-index="${index}">수정</button>
                        <button class="delete-btn" data-record-id="${record.id}">삭제</button>
                    </div>
                </div>
                <div class="record-body">
                    <div class="record-breath">
                        <span class="time">${secondsToBreathTime(record.breath_seconds)}</span>
                        ${changeHtml}
                    </div>
                    <div class="${noteClass}">${noteText}</div>
                </div>
            </div>
        `;
    }).join('');

    // 수정/삭제 버튼 이벤트
    list.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => openEditModal(btn.dataset.recordId, parseInt(btn.dataset.index)));
    });

    list.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => openDeleteModal('record', btn.dataset.recordId));
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

function openEditModal(recordId, recordIndex) {
    const student = currentStudentData;
    if (!student || !student.records[recordIndex]) return;

    const record = student.records[recordIndex];
    const minutes = Math.floor(record.breath_seconds / 60);
    const seconds = record.breath_seconds % 60;

    document.getElementById('edit-record-id').value = recordId;
    document.getElementById('edit-date').value = record.date;
    document.getElementById('edit-minutes').value = minutes;
    document.getElementById('edit-seconds').value = seconds;
    document.getElementById('edit-note').value = record.note || '';

    openModal('edit-modal');
}

function openDeleteModal(type, id) {
    document.getElementById('delete-type').value = type;
    document.getElementById('delete-id').value = id;
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
    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('student-name').value.trim();
        const year = document.getElementById('student-year').value;
        let dept = document.getElementById('student-dept').value;

        // 직접입력인 경우 커스텀 입력값 사용
        if (dept === '직접입력') {
            dept = document.getElementById('student-dept-custom').value.trim();
        }

        if (name && year && dept) {
            await addStudent(currentClass, { name, year, dept });
            closeModal('register-modal');
            await renderStudentList();
        }
    });

    // 호흡 시간 기록 폼
    document.getElementById('breath-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const date = document.getElementById('breath-date').value;
        const minutes = document.getElementById('breath-minutes').value;
        const seconds = document.getElementById('breath-seconds').value;

        if (date && minutes !== '' && seconds !== '') {
            const breathSeconds = breathTimeToSeconds(minutes, seconds);
            await addRecord(currentClass, currentStudent, { date, breathSeconds, note: '' });
            document.getElementById('breath-minutes').value = '';
            document.getElementById('breath-seconds').value = '';

            // 학생 데이터 다시 불러오기
            currentStudentData = await findStudent(currentClass, currentStudent);
            renderRecords();
            alert('호흡 기록이 저장되었습니다.');
        }
    });

    // 배움 한 줄 저장 폼
    document.getElementById('note-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const date = document.getElementById('note-date').value;
        const note = document.getElementById('lesson-note').value.trim();

        if (date && note) {
            const student = currentStudentData;
            if (student) {
                // 해당 날짜의 기록 찾기
                const record = student.records.find(r => r.date === date);
                if (record) {
                    await updateRecord(currentClass, currentStudent, record.id, {
                        date: record.date,
                        breathSeconds: record.breath_seconds,
                        note: note
                    });
                    document.getElementById('lesson-note').value = '';

                    // 학생 데이터 다시 불러오기
                    currentStudentData = await findStudent(currentClass, currentStudent);
                    renderRecords();
                    alert('배움 한 줄이 저장되었습니다.');
                } else {
                    alert('해당 날짜에 호흡 기록이 없습니다.\n먼저 호흡 시간을 기록해주세요.');
                }
            }
        }
    });

    // 기록 수정 모달
    document.getElementById('close-edit-modal').addEventListener('click', () => {
        closeModal('edit-modal');
    });

    document.getElementById('edit-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const recordId = document.getElementById('edit-record-id').value;
        const date = document.getElementById('edit-date').value;
        const minutes = document.getElementById('edit-minutes').value;
        const seconds = document.getElementById('edit-seconds').value;
        const note = document.getElementById('edit-note').value.trim();

        const breathSeconds = breathTimeToSeconds(minutes, seconds);
        await updateRecord(currentClass, currentStudent, recordId, { date, breathSeconds, note });
        closeModal('edit-modal');

        // 학생 데이터 다시 불러오기
        currentStudentData = await findStudent(currentClass, currentStudent);
        renderRecords();
    });

    // 삭제 모달
    document.getElementById('close-delete-modal').addEventListener('click', () => {
        closeModal('delete-modal');
    });

    document.getElementById('cancel-delete').addEventListener('click', () => {
        closeModal('delete-modal');
    });

    document.getElementById('delete-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const password = document.getElementById('delete-password').value;

        if (password !== DELETE_PASSWORD) {
            alert('비밀번호가 올바르지 않습니다.');
            return;
        }

        const type = document.getElementById('delete-type').value;
        const id = document.getElementById('delete-id').value;

        if (type === 'record') {
            await deleteRecord(currentClass, currentStudent, id);
            currentStudentData = await findStudent(currentClass, currentStudent);
            renderRecords();
        } else if (type === 'student') {
            await deleteStudent(currentClass, currentStudent);
            showClassPage(currentClass);
        }

        closeModal('delete-modal');
    });

    // 학생 삭제 버튼
    document.getElementById('delete-student-btn').addEventListener('click', () => {
        openDeleteModal('student', currentStudent);
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
    setupEventListeners();
    showMainPage();
}

// DOM 로드 후 초기화
document.addEventListener('DOMContentLoaded', init);
