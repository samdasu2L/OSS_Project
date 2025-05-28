let calendar;
let selectedShift = null;

const SHIFTS_KEY = 'shifts';

document.addEventListener('DOMContentLoaded', function () {
  const calendarEl = document.getElementById('calendar-container');
  const shiftModalEl = document.getElementById('shiftModal');
  const shiftInfoText = document.getElementById('shift-info-text');
  const saveShiftBtn = document.getElementById('save-shift-btn');
  const showEventsBtn = document.getElementById('show-events-button');
  const eventListEl = document.getElementById('event-list');
  const wageInput = document.getElementById('hourly-wage');

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
      selectedShift = info;
      const modal = new bootstrap.Modal(shiftModalEl);
      modal.show();
      const startTime = info.startStr.slice(0, 16).replace('T', ' ');
      const endTime = info.endStr.slice(0, 16).replace('T', ' ');
      shiftInfoText.innerText = `선택한 시간: ${startTime} ~ ${endTime}`;
    },
    events: []
  });
  calendar.render();

  // 저장
  saveShiftBtn.addEventListener('click', async function () {
    if (!selectedShift) return;
    const { start, end } = selectedShift;
    calendar.addEvent({
      title: '근무',
      start,
      end,
      backgroundColor: '#4CAF50',
      borderColor: '#4CAF50'
    });
    const existing = (await localforage.getItem(SHIFTS_KEY)) || [];
    existing.push({ start: start.toISOString(), end: end.toISOString() });
    await localforage.setItem(SHIFTS_KEY, existing);
    updateSalary();
    const modal = bootstrap.Modal.getInstance(shiftModalEl);
    modal.hide();
    selectedShift = null;
  });

  // 시급 입력 시 계산
  wageInput.addEventListener('input', updateSalary);

  // 일정 목록 보기
  showEventsBtn.addEventListener('click', function () {
    eventListEl.innerHTML = '';
    const events = calendar.getEvents();
    if (events.length === 0) {
      eventListEl.innerHTML = '<li>등록된 일정이 없습니다.</li>';
      return;
    }
    events.forEach(event => {
      const li = document.createElement('li');
      li.textContent = `${event.title} (${event.startStr.replace('T', ' ')})`;
      const btn = document.createElement('button');
      btn.textContent = '❌';
      btn.style.marginLeft = '10px';
      btn.addEventListener('click', async function () {
        const data = (await localforage.getItem(SHIFTS_KEY)) || [];
        const filtered = data.filter(s => s.start !== event.start.toISOString() || s.end !== event.end.toISOString());
        await localforage.setItem(SHIFTS_KEY, filtered);
        event.remove();
        li.remove();
        updateSalary();
      });
      li.appendChild(btn);
      eventListEl.appendChild(li);
    });
  });

  loadShifts();
});

async function updateSalary() {
  const wage = parseInt(document.getElementById('hourly-wage').value) || 0;
  const data = (await localforage.getItem(SHIFTS_KEY)) || [];
  let totalMinutes = 0;
  data.forEach(shift => {
    const start = new Date(shift.start);
    const end = new Date(shift.end);
    const diffMinutes = (end - start) / (1000 * 60);
    totalMinutes += diffMinutes;
  });
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  const salary = Math.floor((totalMinutes / 60) * wage);
  document.getElementById('total-time').textContent = `${hours}시간 ${minutes}분`;
  document.getElementById('total-salary').textContent = `${salary.toLocaleString()}원`;
}

// 저장된 근무 확인
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
  updateSalary();
}