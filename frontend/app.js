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
