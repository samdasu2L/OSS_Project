document.addEventListener('DOMContentLoaded', function () {
    const calendarEl = document.getElementById('calendar-container');

    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'ko',
        selectable: true,
        dateClick: function (info) {
            const title = prompt('일정 제목을 입력하세요:');
            if (title) {
                calendar.addEvent({
                    title: title,
                    start: info.dateStr,
                    allDay: true
                });
            }
        }
    });

    calendar.render();
});

//알바 월급 계산
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

// 시간표 클릭 시 과목 입력, 수정, 삭제
document.querySelectorAll('#timetable td').forEach(cell => {
    cell.addEventListener('click', function () {
        const current = cell.textContent.trim();

        if (current === '') {
            const subject = prompt('과목명을 입력하세요:');
            if (subject !== null && subject.trim() !== '') {
                cell.textContent = subject;
            }
        } else {
            const action = prompt(`현재 과목: "${current}"\n수정하려면 새 과목명을 입력하고,\n삭제하려면 "삭제"라고 입력하세요:`);

            if (action === null) return;

            if (action.trim() === '삭제') {
                cell.textContent = '';
            } else if (action.trim() !== '') {
                cell.textContent = action.trim();
            }
        }
    });
});

// 시간표 저장 + 새로고침해도 불러오기 코드
const STORAGE_KEY = 'timetableData';
document.querySelectorAll('#timetable td').forEach((cell, index) => {
  cell.setAttribute('data-cell-id', index);
});

function saveTimetable() {
  const data = {};
  document.querySelectorAll('#timetable td').forEach(cell => {
    const id = cell.getAttribute('data-cell-id');
    const value = cell.textContent.trim();
    data[id] = value;
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadTimetable() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const data = JSON.parse(saved);
    document.querySelectorAll('#timetable td').forEach(cell => {
      const id = cell.getAttribute('data-cell-id');
      if (data[id]) {
        cell.textContent = data[id];
      }
    });
  }
}

loadTimetable();