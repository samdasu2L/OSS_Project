document.addEventListener('DOMContentLoaded', function () {
    const calendarEl = document.getElementById('calendar-container');

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'timeGridWeek',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    nowIndicator: true,
    editable: true,
    selectable: true,
    select: function (info) {
      const modal = new bootstrap.Modal(document.getElementById('shiftModal'));
      modal.show();

      const startTime = info.startStr.slice(0, 16).replace('T', ' ');
      const endTime = info.endStr.slice(0, 16).replace('T', ' ');
      document.getElementById('shift-info-text').innerText = `선택한 시간: ${startTime} ~ ${endTime}`;

      document.getElementById('save-shift-btn').onclick = function () {
        calendar.addEvent({
          title: '근무',
          start: info.start,
          end: info.end
        });
        modal.hide();
      };
    },
    events: []
  });

  calendar.render();
});
    function formatTime(date) {
        return date.toLocaleString('ko-KR', {
            dateStyle: 'medium',
            timeStyle: 'short'
        });
    }

    document.getElementById('save-shift-btn').addEventListener('click', async function () {
        if (!selectedShift) return;

        const { start, end } = selectedShift;

        calendar.addEvent({
            title: '근무',
            start,
            end,
            backgroundColor: '#4CAF50',
            borderColor: '#4CAF50'
        });

        const oldData = (await localforage.getItem('shifts')) || [];
        oldData.push({ start: start.toISOString(), end: end.toISOString() });
        await localforage.setItem('shifts', oldData);

        updateSalary();

        const modal = bootstrap.Modal.getInstance(document.getElementById('shiftModal'));
        modal.hide();
    });

     // 시급 변경 시 월급 재계산
    document.getElementById('hourly-wage').addEventListener('input', updateSalary);

    // 월급 계산 함수
    async function updateSalary() {
        const wage = parseInt(document.getElementById('hourly-wage').value);
        const data = (await localforage.getItem('shifts')) || [];

        let totalMinutes = 0;

        for (const shift of data) {
            const start = new Date(shift.start);
            const end = new Date(shift.end);
            const diff = dateFns.differenceInMinutes(end, start);
            totalMinutes += diff;
        }

        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        const salary = wage && !isNaN(wage) ? Math.floor((totalMinutes / 60) * wage) : 0;

        document.getElementById('total-time').textContent = `${hours}시간 ${minutes}분`;
        document.getElementById('total-salary').textContent = `${salary.toLocaleString()}원`;
    }

    // 새로고침 시 기록 복원
    async function loadShifts() {
        const data = (await localforage.getItem('shifts')) || [];
        for (const shift of data) {
            calendar.addEvent({
                title: '근무',
                start: shift.start,
                end: shift.end,
                backgroundColor: '#4CAF50',
                borderColor: '#4CAF50'
            });
        }

        updateSalary();
    }

    loadShifts();

    document.getElementById('show-events-button').addEventListener('click', function () {
    const eventList = document.getElementById('event-list');
    eventList.innerHTML = ''; 

    const events = calendar.getEvents();
    if (events.length === 0) {
        eventList.innerHTML = '<li>등록된 일정이 없습니다.</li>';
        return;
    }

    events.forEach(event => {
        const li = document.createElement('li');
        li.textContent = `${event.title} (${event.startStr})`;

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '❌';
        deleteBtn.style.marginLeft = '10px';
        deleteBtn.addEventListener('click', function () {
            event.remove(); 
            li.remove(); 
        });

        li.appendChild(deleteBtn);
        eventList.appendChild(li);
    });
});

// 알바 월급 계산기
document.getElementById('salary-form').addEventListener('submit', function (e) {
    e.preventDefault();

    const hourlyRate = parseFloat(document.getElementById('hourly-rate').value);
    const hoursWorked = parseFloat(document.getElementById('hours-worked').value);

    if (!isNaN(hourlyRate) && !isNaN(hoursWorked)) {
        const total = hourlyRate * hoursWorked;
        document.getElementById('salary-result').textContent = `예상 월급: ${total.toLocaleString()}원`;
    } else {
        document.getElementById('salary-result').textContent = '유효한 값을 입력해주세요.';
    }
});

const STORAGE_KEY = 'timetableData';
const COLOR_PALETTE = ['#FFB6C1', '#FFDEAD', '#ADD8E6', '#90EE90', '#DDA0DD', '#FFFACD', '#E6E6FA'];

// 셀에 고유 ID 부여
document.querySelectorAll('#timetable td').forEach((cell, index) => {
    cell.setAttribute('data-cell-id', index);
});

// 과목명을 일정한 색상으로 고정
const subjectColorMap = new Map();
const usedColors = new Set();

function getColorForSubject(subject) {
    if (subjectColorMap.has(subject)) {
        return subjectColorMap.get(subject);
    }

    let availableColors = COLOR_PALETTE.filter(color => !usedColors.has(color));
    if (availableColors.length === 0) {
        availableColors = [...COLOR_PALETTE];
    }

    const selected = availableColors[Math.floor(Math.random() * availableColors.length)];
    subjectColorMap.set(subject, selected);
    usedColors.add(selected);

    return selected;
}


// 저장 함수
function saveTimetable() {
    const data = {};
    document.querySelectorAll('#timetable td').forEach(cell => {
        const id = cell.getAttribute('data-cell-id');
        const value = cell.textContent.trim();
        data[id] = value; 
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// 복원 함수
function loadTimetable() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        const data = JSON.parse(saved);
        document.querySelectorAll('#timetable td').forEach(cell => {
            const id = cell.getAttribute('data-cell-id');
            const subject = data[id];
            if (subject && cell.cellIndex !== 0) {
                cell.textContent = subject;
                cell.style.backgroundColor = getColorForSubject(subject);
            } else if (subject) {
                cell.textContent = subject;
            }
        });
    }
}

document.querySelectorAll('#timetable td').forEach(cell => {
    if (cell.cellIndex === 0) return;

    cell.addEventListener('click', function () {
        const current = cell.textContent.trim();
        const id = cell.getAttribute('data-cell-id');

        if (current === '') {
            const subject = prompt('과목명을 입력하세요:');
            if (subject !== null && subject.trim() !== '') {
                cell.textContent = subject;
                cell.style.backgroundColor = getColorForSubject(subject);
                saveTimetable();
            }
        } else {
            const action = prompt(`현재 과목: "${current}"\n수정하려면 새 과목명을 입력하고,\n삭제하려면 "삭제"라고 입력하세요:`);

            if (action === null) return;

            if (action.trim() === '삭제') {
                cell.textContent = '';
                cell.style.backgroundColor = '';
                saveTimetable();
            } else if (action.trim() !== '') {
                const newSubject = action.trim();
                cell.textContent = newSubject;
                cell.style.backgroundColor = getColorForSubject(newSubject);
                saveTimetable();
            }
        }
    });
});