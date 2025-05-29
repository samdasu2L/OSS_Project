let calendar;
const SHIFTS_KEY   = 'shifts';
const EVENTS_KEY   = 'events';
const STORAGE_KEY  = 'timetableData';

const COLOR_PALETTE   = ['#FFB6C1','#FFDEAD','#ADD8E6','#90EE90','#DDA0DD','#FFFACD','#E6E6FA'];
const subjectColorMap = new Map();
function getColorForSubject(subject) {
  if (subjectColorMap.has(subject)) return subjectColorMap.get(subject);
  const available = COLOR_PALETTE.filter(c => ![...subjectColorMap.values()].includes(c));
  const color     = available.length ? available[0] : COLOR_PALETTE[0];
  subjectColorMap.set(subject, color);
  return color;
}

function generateId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 5);
}

// 근무 일정 등록
async function saveShift(title, start, end) {
  const list = (await localforage.getItem(SHIFTS_KEY)) || [];
  const id = generateId();
  list.push({ id, start: start.toISOString(), end: end.toISOString() });
  await localforage.setItem(SHIFTS_KEY, list);
  return id;
}

// 일반 일정 등록
async function saveEvent(title, start, end) {
  const list = (await localforage.getItem(EVENTS_KEY)) || [];
  const id = generateId();
  list.push({ id, title, start: start.toISOString(), end: end.toISOString() });
  await localforage.setItem(EVENTS_KEY, list);
  return id;
}

// 일반, 근무 일정 데이터 저장
async function loadData() {
  const shifts = (await localforage.getItem(SHIFTS_KEY)) || [];
  shifts.forEach(s => {
    calendar.addEvent({
      id:             s.id,
      title:          '근무',
      start:          s.start,
      end:            s.end,
      backgroundColor:'#4caf50',
      borderColor:    '#4caf50'
    });
  });
  const events = (await localforage.getItem(EVENTS_KEY)) || [];
  events.forEach(e => {
    calendar.addEvent({
      id:             e.id,
      title:          e.title,
      start:          e.start,
      end:            e.end,
      backgroundColor:'#3788d8',
      borderColor:    '#3788d8'
    });
  });
}

// ─── 월급 계산기 ───
async function updateSalary() {
  const wage = parseInt(document.getElementById('hourly-wage').value) || 0;
  const data = (await localforage.getItem(SHIFTS_KEY)) || [];
  const year  = calendar.getDate().getFullYear();
  const month = calendar.getDate().getMonth();

  let totalMinutes = 0;
  data.forEach(s => {
    const st = new Date(s.start);
    if (st.getFullYear() === year && st.getMonth() === month) {
      totalMinutes += (new Date(s.end) - st) / (1000 * 60);
    }
  });

  const hours  = Math.floor(totalMinutes / 60);
  const mins   = Math.round(totalMinutes % 60);
  const salary = Math.floor((totalMinutes / 60) * wage);

  document.getElementById('total-time').textContent   = `${hours}시간 ${mins}분`;
  document.getElementById('total-salary').textContent = `${salary.toLocaleString()}원`;
}

// 버튼
function setupToggle(btnId, listId, populateFn) {
  const btn   = document.getElementById(btnId);
  const list  = document.getElementById(listId);
  btn.addEventListener('click', () => {
    list.classList.toggle('is-open');
    if (list.classList.contains('is-open')) populateFn();
  });
}

// 일반 일정 등록
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

    const startTime = new Date(evt.start).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'});
    const endTime   = new Date(evt.end)  .toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'});
    const diffMs    = new Date(evt.end)  - new Date(evt.start);
    const h         = Math.floor(diffMs / (1000*60*60));
    const m         = Math.round((diffMs % (1000*60*60)) / (1000*60));
    const duration  = m===0 ? `${h}시간` : `${h}시간 ${m}분`;

    text.textContent = `${evt.title}: ${startTime} ~ ${endTime} (${duration})`;

    const delBtn = document.createElement('button');
    delBtn.textContent = '❌';
    delBtn.addEventListener('click', async () => {
      const updated = (await localforage.getItem(EVENTS_KEY)) || [];
      await localforage.setItem(EVENTS_KEY, updated.filter(e => e.id !== evt.id));
      populateEventList();
    });

    li.append(text, delBtn);
    listEl.append(li);
  });
}

// 근무 일정 등록
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

    const startTime = new Date(s.start).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'});
    const endTime   = new Date(s.end)  .toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'});
    const diffMs    = new Date(s.end)  - new Date(s.start);
    const h         = Math.floor(diffMs / (1000*60*60));
    const m         = Math.round((diffMs % (1000*60*60)) / (1000*60));
    const duration  = m===0 ? `${h}시간` : `${h}시간 ${m}분`;

    text.textContent = `근무: ${startTime} ~ ${endTime} (${duration})`;

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

document.addEventListener('DOMContentLoaded', async () => {

  calendar = new FullCalendar.Calendar(
    document.getElementById('calendar-container'),
    {
      initialView: 'dayGridMonth',
      headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' },
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
          calendar.addEvent({ id, title: '근무', start, end, backgroundColor: '#4caf50', borderColor: '#4caf50' });
        } else {
          const title = prompt('일정 이름 입력:');
          if (!title) return;
          const id = await saveEvent(title, start, end);
          calendar.addEvent({ id, title, start, end, backgroundColor: '#3788d8', borderColor: '#3788d8' });
        }
        updateSalary();
      }
    }
  );
  calendar.render();

  await loadData();
  updateSalary();

  document.getElementById('hourly-wage').addEventListener('input', updateSalary);

  setupToggle('show-events-button', 'event-list',   populateEventList);
  setupToggle('show-shifts-button', 'shift-list',   populateShiftList);

  // 시간표
  document.querySelectorAll('#timetable td').forEach((cell, idx) => {
    cell.dataset.cellId = idx;
  });

  const modalEl       = document.getElementById('timetableActionModal');
  const timetableModal= new bootstrap.Modal(modalEl);

  function saveTimetable() {
    const data = {};
    document.querySelectorAll('#timetable td').forEach(cell => {
      data[cell.dataset.cellId] = cell.textContent.trim();
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
  function loadTimetable() {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    document.querySelectorAll('#timetable td').forEach(cell => {
      const txt = saved[cell.dataset.cellId];
      if (txt && cell.cellIndex !== 0) {
        cell.textContent = txt;
        cell.style.backgroundColor = getColorForSubject(txt);
      }
    });
  }

  loadTimetable();

  document.querySelectorAll('#timetable td').forEach(cell => {
    if (cell.cellIndex === 0) return;
    cell.addEventListener('click', () => {
      const cur = cell.textContent.trim();
      if (!cur) {
        const subj = prompt('과목명을 입력하세요:');
        if (subj?.trim()) {
          cell.textContent = subj.trim();
          cell.style.backgroundColor = getColorForSubject(subj.trim());
          saveTimetable();
        }
        return;
      }
      timetableModal.show();
      document.getElementById('btnModify').onclick = () => {
        const ns = prompt('새 과목명을 입력하세요:', cur);
        if (ns?.trim()) {
          cell.textContent = ns.trim();
          cell.style.backgroundColor = getColorForSubject(ns.trim());
          saveTimetable();
        }
        timetableModal.hide();
      };
      document.getElementById('btnDelete').onclick = () => {
        if (confirm(`"${cur}" 과목을 정말 삭제하시겠습니까?`)) {
          cell.textContent = '';
          cell.style.backgroundColor = '';
          saveTimetable();
        }
        timetableModal.hide();
      };
    });
  });

});