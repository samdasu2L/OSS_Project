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
