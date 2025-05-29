let calendar;
const SHIFTS_KEY = 'shifts';
const EVENTS_KEY = 'events';

function generateId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 5);
}

// 근무 일정 저장
async function saveShift(title, start, end) {
  const list = (await localforage.getItem(SHIFTS_KEY)) || [];
  const id = generateId();
  list.push({ id, start: start.toISOString(), end: end.toISOString() });
  await localforage.setItem(SHIFTS_KEY, list);
  return id;
}

// 일반 일정 저장
async function saveEvent(title, start, end) {
  const list = (await localforage.getItem(EVENTS_KEY)) || [];
  const id = generateId();
  list.push({ id, title, start: start.toISOString(), end: end.toISOString() });
  await localforage.setItem(EVENTS_KEY, list);
  return id;
}

// 일반 + 근무 일정 데이터 저장
async function loadData() {
  const shifts = (await localforage.getItem(SHIFTS_KEY)) || [];
  shifts.forEach(s => {
    calendar.addEvent({ id: s.id, title: '근무', start: s.start, end: s.end, backgroundColor: '#4caf50', borderColor: '#4caf50' });
  });
  const events = (await localforage.getItem(EVENTS_KEY)) || [];
  events.forEach(e => {
    calendar.addEvent({ id: e.id, title: e.title, start: e.start, end: e.end, backgroundColor: '#3788d8', borderColor: '#3788d8' });
  });
}

// 월급 계산기
async function updateSalary() {
  const wage = parseInt(document.getElementById('hourly-wage').value) || 0;
  const data = (await localforage.getItem(SHIFTS_KEY)) || [];
  const year = calendar.getDate().getFullYear();
  const month = calendar.getDate().getMonth();
  let totalMinutes = 0;
  data.forEach(s => {
    const st = new Date(s.start);
    if (st.getFullYear() === year && st.getMonth() === month) {
      totalMinutes += (new Date(s.end) - st) / 60000;
    }
  });
  const hours = Math.floor(totalMinutes / 60);
  const mins = Math.round(totalMinutes % 60);
  const salary = Math.floor((totalMinutes / 60) * wage);
  document.getElementById('total-time').textContent = `${hours}시간 ${mins}분`;
  document.getElementById('total-salary').textContent = `${salary.toLocaleString()}원`;
}

// 버튼
function setupToggle(btnId, listId, populateFn) {
  const btn = document.getElementById(btnId);
  const listEl = document.getElementById(listId);
  btn.addEventListener('click', () => {
    listEl.classList.toggle('is-open');
    if (listEl.classList.contains('is-open')) populateFn();
  });
}

// 일반 일정 목록
async function populateEventList() {
  const listEl = document.getElementById('event-list');
  listEl.innerHTML = '';
  const events = (await localforage.getItem(EVENTS_KEY)) || [];
  if (!events.length) {
    listEl.innerHTML = '<li>등록된 일정이 없습니다.</li>';
    return;
  }
  events.forEach(evt => {
    const li = document.createElement('li');
    const text = document.createElement('span');
    text.textContent = `${evt.title}: ${new Date(evt.start).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})} ~ ${new Date(evt.end).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})}`;
    const delBtn = document.createElement('button');
    delBtn.textContent = '❌';
    delBtn.addEventListener('click', async () => {
      text.textContent = `${evt.title} (${new Date(evt.start).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })})`;
      const updated = (await localforage.getItem(EVENTS_KEY)) || [];
      await localforage.setItem(EVENTS_KEY, updated.filter(e => e.id !== evt.id));
      populateEventList();
    });
    li.append(text, delBtn);
    listEl.append(li);
  });
}

// 근무 일정 목록
async function populateShiftList() {
  const listEl = document.getElementById('shift-list');
  listEl.innerHTML = '';
  const shifts = (await localforage.getItem(SHIFTS_KEY)) || [];
  if (!shifts.length) {
    listEl.innerHTML = '<li>등록된 근무 일정이 없습니다.</li>';
    return;
  }
  shifts.forEach(s => {
    const li = document.createElement('li');
    const text = document.createElement('span');
    text.textContent = `근무: ${new Date(s.start).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} ~ ${new Date(s.end).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`;
    const delBtn = document.createElement('button');
    delBtn.textContent = '❌';
    delBtn.addEventListener('click', async () => {
      calendar.getEventById(s.id)?.remove();
      const updated = (await localforage.getItem(SHIFTS_KEY)) || [];
      await localforage.setItem(SHIFTS_KEY, updated.filter(e => e.id !== s.id));
      updateSalary();
      populateShiftList();
    });
    li.append(text, delBtn);
    listEl.append(li);
  });
}

// 일정 등록
document.addEventListener('DOMContentLoaded', async () => {
  calendar = new FullCalendar.Calendar(
    document.getElementById('calendar-container'),
    {
      initialView: 'dayGridMonth',
      headerToolbar: { left:'prev,next today', center:'title', right:'dayGridMonth,timeGridWeek,timeGridDay' },
      nowIndicator: true,
      editable: true,
      selectable: true,
      datesSet: updateSalary,
      select: async info => {
        const choice = prompt('이벤트 유형: 1) 근무 2) 일반');
        if (choice !== '1' && choice !== '2') return;
        const { start, end } = info;
        if (choice === '1') {
          const id = await saveShift('근무', start, end);
          calendar.addEvent({ id, title:'근무', start, end, backgroundColor:'#4caf50', borderColor:'#4caf50' });
        } else {
          const title = prompt('일정 이름 입력:');
          if (!title) return;
          const id = await saveEvent(title, start, end);
          calendar.addEvent({ id, title, start, end, backgroundColor:'#3788d8', borderColor:'#3788d8' });
        }
        updateSalary();
      }
    }
  );
  calendar.render();
  await loadData();
  updateSalary();
  // 시급 입력 실시간 반영
  document.getElementById('hourly-wage').addEventListener('input', updateSalary);
  setupToggle('show-events-button', 'event-list', populateEventList);
  setupToggle('show-shifts-button', 'shift-list', populateShiftList);
});