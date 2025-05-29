let calendar;
let selectedShift = null;

const SHIFTS_KEY = 'shifts';

async function saveShiftToStorage(start, end) {
  const existing = (await localforage.getItem(SHIFTS_KEY)) || [];
  existing.push({ start: start.toISOString(), end: end.toISOString() });
  await localforage.setItem(SHIFTS_KEY, existing);
}

// 월급 계산기
async function updateSalary() {
  const wage = parseInt(document.getElementById('hourly-wage').value) || 0;
  const data = (await localforage.getItem(SHIFTS_KEY)) || [];
  let totalMinutes = 0;
  data.forEach(shift => {
    const start = new Date(shift.start);
    const end = new Date(shift.end);
    totalMinutes += (end - start) / (1000 * 60);
  });
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  const salary = Math.floor((totalMinutes / 60) * wage);
  document.getElementById('total-time').textContent = `${hours}시간 ${minutes}분`;
  document.getElementById('total-salary').textContent = `${salary.toLocaleString()}원`;
}

// 저장
async function loadShifts() {
  const data = (await localforage.getItem(SHIFTS_KEY)) || [];
  data.forEach(shift => {
    calendar.addEvent({
      title: '근무',
      start: shift.start,
      end: shift.end,
      backgroundColor: '#4CAF50',
      borderColor: '#4CAF50'
    });
  });
}

document.addEventListener('DOMContentLoaded', function () {
  const calendarEl = document.getElementById('calendar-container');
  const wageInput = document.getElementById('hourly-wage');
  const showEventsBtn = document.getElementById('show-events-button');
  const eventListEl = document.getElementById('event-list');

  // 캘린더 초기화
  calendar = new FullCalendar.Calendar(calendarEl, {
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
      // 근무,일반 일정 구분 선택
      const type = prompt("이벤트 유형을 선택하세요. 1: 근무, 2: 일반 일정");
      if (type !== '1' && type !== '2') return;
      const { start, end } = info;
      let title = '';
      let backgroundColor = '';
      if (type === '1') {
        title = '근무';
        backgroundColor = '#4CAF50';
        saveShiftToStorage(start, end);
        updateSalary();
      } else {
        title = prompt('일정 이름을 입력하세요:');
        if (!title) return;
      }
      calendar.addEvent({
        title,
        start,
        end,
        backgroundColor,
        borderColor: backgroundColor
      });
    }
  });
  calendar.render();

  // 시급 입력 시 계산
  wageInput.addEventListener('input', updateSalary);

  // 기존 근무 일정 불러오기 및 급여 계산
  loadShifts().then(updateSalary);

  // 일정 목록 보기
  showEventsBtn.addEventListener('click', async function () {
    eventListEl.innerHTML = '';
    const events = calendar.getEvents();
    if (events.length === 0) {
      eventListEl.innerHTML = '<li>등록된 일정이 없습니다.</li>';
      return;
    }
    for (const event of events) {
      const li = document.createElement('li');
      li.textContent = `${event.title} (${event.startStr.replace('T', ' ')})`;
      const btn = document.createElement('button');
      btn.textContent = '❌';
      btn.style.marginLeft = '10px';
      btn.addEventListener('click', async () => {
        if (event.title === '근무') {
          const data = (await localforage.getItem(SHIFTS_KEY)) || [];
          const filtered = data.filter(s => s.start !== event.start.toISOString() || s.end !== event.end.toISOString());
          await localforage.setItem(SHIFTS_KEY, filtered);
          updateSalary();
        }
        event.remove();
        li.remove();
      });
      li.appendChild(btn);
      eventListEl.appendChild(li);
    }
  });
});