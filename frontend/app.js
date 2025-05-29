let calendar;

const SHIFTS_KEY = 'shifts';
const EVENTS_KEY = 'events';

// 근무 일정 저장
async function saveShiftToStorage(start, end) {
  const existing = (await localforage.getItem(SHIFTS_KEY)) || [];
  existing.push({ start: start.toISOString(), end: end.toISOString() });
  await localforage.setItem(SHIFTS_KEY, existing);
}

// 일반 일정 저장
async function saveEventToStorage(title, start, end) {
  const existing = (await localforage.getItem(EVENTS_KEY)) || [];
  existing.push({ title, start: start.toISOString(), end: end.toISOString() });
  await localforage.setItem(EVENTS_KEY, existing);
}

// 월급 계산기
async function updateSalary() {
  const wage = parseInt(document.getElementById('hourly-wage').value) || 0;
  const data = (await localforage.getItem(SHIFTS_KEY)) || [];

  const currentDate = calendar.getDate();
  const viewYear = currentDate.getFullYear();
  const viewMonth = currentDate.getMonth();

  // 월별 근무 계산
  const monthlyShifts = data.filter(shift => {
    const d = new Date(shift.start);
    return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
  });

  let totalMinutes = 0;
  monthlyShifts.forEach(shift => {
    const start = new Date(shift.start);
    const end = new Date(shift.end);
    totalMinutes += (end - start) / (1000 * 60);
  });

  const hours = Math.floor(totalMinutes / 60);
  const mins = Math.round(totalMinutes % 60);
  const salary = Math.floor((totalMinutes / 60) * wage);

  document.getElementById('total-time').textContent = `${hours}시간 ${mins}분`;
  document.getElementById('total-salary').textContent = `${salary.toLocaleString()}원`;
}

// 근무 일정 저장
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

// 일반 일정 저장
async function loadEvents() {
  const data = (await localforage.getItem(EVENTS_KEY)) || [];
  data.forEach(evt => {
    calendar.addEvent({
      title: evt.title,
      start: evt.start,
      end: evt.end,
      backgroundColor: '#3788d8',
      borderColor: '#3788d8'
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
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    nowIndicator: true,
    editable: true,
    selectable: true,
    datesSet: updateSalary,
    select: async function (info) {
      const type = prompt('이벤트 유형 선택: 1) 근무 2) 일반');
      if (type !== '1' && type !== '2') return;
      const { start, end } = info;
      let title = '';
      let bg = '';
      if (type === '1') {
        title = '근무';
        bg = '#4CAF50';
        await saveShiftToStorage(start, end);
      } else {
        title = prompt('일정 이름 입력:');
        if (!title) return;
        bg = '#3788d8';
        await saveEventToStorage(title, start, end);
      }
      calendar.addEvent({ title, start, end, backgroundColor: bg, borderColor: bg });
      updateSalary();
    }
  });
  calendar.render();

  loadShifts();
  loadEvents();
  updateSalary();

  // 시급 입력
  wageInput.addEventListener('input', updateSalary);

  // 일정 목록 보기 기능 구현
  document.getElementById('show-events-button').addEventListener('click', function () {
    const listEl = document.getElementById('event-list');
    const isVisible = listEl.style.display === 'block';

    if (isVisible) {
      listEl.style.display = 'none';
    } else {
      listEl.innerHTML = '';
      const events = calendar.getEvents();
      if (events.length === 0) {
        listEl.innerHTML = '<li>등록된 일정이 없습니다.</li>';
      } else {
        events.forEach(event => {
          const li = document.createElement('li');
          li.textContent = `${event.title} (${event.startStr})`;
          const del = document.createElement('button');
          del.textContent = '❌';
          del.style.marginLeft = '10px';
          del.addEventListener('click', () => {
            event.remove();
            li.remove();
            if (event.title === '근무') updateSalary();
          });
          li.appendChild(del);
          listEl.appendChild(li);
        });
      }
      listEl.style.display = 'block';
    }
  });
});