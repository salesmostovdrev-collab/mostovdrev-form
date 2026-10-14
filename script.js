document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("orderForm");
  const carInput = document.getElementById("carNumber");
  const trailerInput = document.getElementById("trailerNumber");
  const tripsInput = document.getElementById("tripsCount");
  const btnDecrease = document.getElementById("stepDecrease");
  const btnIncrease = document.getElementById("stepIncrease");
  const clearFormBtn = document.getElementById("clearFormBtn");
  const submitBtn = document.querySelector(".submit-btn");

  const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyUzLhnRnv9FC23_uKFeLWgEw5yo24q10n-Q4JBRmSYYvtvzbDFfsSbhbRK6qLctO8QEQ/exec";

  const calendarPopup = document.getElementById("customCalendarPopup");
  const calMonthYearTitle = document.getElementById("calMonthYearTitle");
  const calendarDaysGrid = document.getElementById("calendarDaysGrid");
  const calPrevMonth = document.getElementById("calPrevMonth");
  const calNextMonth = document.getElementById("calNextMonth");

  let activeInputId = null;
  let currentUiDate = new Date();

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  let selectedDates = {
    orderDate: new Date(today),
    docDate: null,
    waybillDate: null
  };

  const monthNames = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];

  const formatDateStr = (date) => {
    if (!date) return '';
    return String(date.getDate()).padStart(2, '0') + '.' + String(date.getMonth() + 1).padStart(2, '0') + '.' + date.getFullYear();
  };

  // Подставляем сегодняшнюю дату в заказ по умолчанию
  document.getElementById("orderDate").value = formatDateStr(selectedDates.orderDate);

  // Управление количеством рейсов (степпер)
  btnDecrease.addEventListener("click", () => {
    let current = parseInt(tripsInput.value, 10) || 1;
    if (current > 1) tripsInput.value = current - 1;
  });
  btnIncrease.addEventListener("click", () => {
    let current = parseInt(tripsInput.value, 10) || 1;
    if (current < 9) tripsInput.value = current + 1;
  });

  // Маски автомобильных номеров (Формат Республики Беларусь + разрешен прочерк)
  const applyCarMask = (input, isTrailer = false) => {
    let val = input.value.toUpperCase();

    // UX Улучшение: если для прицепа ввели дефис или прочерк, оставляем только его
    if (isTrailer && (val === '-' || val === '—' || val === '_')) {
      input.value = '-';
      return;
    }

    // Для всех остальных случаев очищаем всё, кроме букв и цифр
    val = val.replace(/[^A-ZА-Я0-9]/g, '');
    if (!isTrailer) {
      // Тягач: 1234 AB-7
      if (val.length > 4 && val.length <= 6) val = val.slice(0, 4) + ' ' + val.slice(4);
      else if (val.length > 6) val = val.slice(0, 4) + ' ' + val.slice(4, 6) + '-' + val.slice(6, 7);
    } else {
      // Прицеп: A 1234B-7
      if (val.length > 1 && val.length <= 5) val = val.slice(0, 1) + ' ' + val.slice(1);
      else if (val.length > 5 && val.length <= 6) val = val.slice(0, 1) + ' ' + val.slice(1, 5) + val.slice(5);
      else if (val.length > 6) val = val.slice(0, 1) + ' ' + val.slice(1, 5) + val.slice(5, 6) + '-' + val.slice(6, 7);
    }
    input.value = val;
  };
  carInput.addEventListener("input", () => applyCarMask(carInput, false));
  trailerInput.addEventListener("input", () => applyCarMask(trailerInput, true));

  // Открытие кастомного календаря
  document.querySelectorAll(".calendar-trigger, .input-with-icon input").forEach(el => {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      const targetId = el.getAttribute("data-target") || el.id;
      activeInputId = targetId;

      const inputEl = document.getElementById(targetId);
      const rect = inputEl.getBoundingClientRect();

      calendarPopup.style.top = `${window.scrollY + rect.bottom + 5}px`;
      calendarPopup.style.left = `${window.scrollX + rect.left}px`;
      calendarPopup.style.display = "block";

      currentUiDate = selectedDates[targetId] ? new Date(selectedDates[targetId]) : new Date(today);
      renderCalendar();
    });
  });

  // Скрытие календаря при клике в пустую область экрана
  document.addEventListener("click", (e) => {
    if (!calendarPopup.contains(e.target)) calendarPopup.style.display = "none";
  });

  // Навигация по месяцам в календаре
  calPrevMonth.addEventListener("click", (e) => { e.stopPropagation(); currentUiDate.setMonth(currentUiDate.getMonth() - 1); renderCalendar(); });
  calNextMonth.addEventListener("click", (e) => { e.stopPropagation(); currentUiDate.setMonth(currentUiDate.getMonth() + 1); renderCalendar(); });

  // Отрисовка дней в календаре с учетом ограничений дат
  function renderCalendar() {
    calendarDaysGrid.innerHTML = "";
    const year = currentUiDate.getFullYear();
    const month = currentUiDate.getMonth();

    calMonthYearTitle.textContent = `${monthNames[month]} ${year}`;

    const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7;
    const totalDays = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDayIndex; i++) {
      const emptyDiv = document.createElement("div");
      calendarDaysGrid.appendChild(emptyDiv);
    }

    for (let day = 1; day <= totalDays; day++) {
      const dayDiv = document.createElement("div");
      dayDiv.classList.add("calendar-day");
      dayDiv.textContent = day;

      const thisDate = new Date(year, month, day);

      // Логика блокировки прошлых дат
      let isDisabled = false;
      if (activeInputId === "orderDate" && thisDate < today) isDisabled = true;
      if (activeInputId === "docDate" && thisDate < firstDayOfMonth) isDisabled = true;

      if (isDisabled) {
        dayDiv.classList.add("disabled");
      } else {
        if (selectedDates[activeInputId] && thisDate.getTime() === selectedDates[activeInputId].getTime()) {
          dayDiv.classList.add("selected");
        }
        if (thisDate.getTime() === today.getTime()) {
          dayDiv.classList.add("today-marker");
        }

        dayDiv.addEventListener("click", (e) => {
          e.stopPropagation();
          selectedDates[activeInputId] = thisDate;
          document.getElementById(activeInputId).value = formatDateStr(thisDate);
          calendarPopup.style.display = "none";
        });
      }
      calendarDaysGrid.appendChild(dayDiv);
    }
  }

  // Мгновенная очистка всех полей формы
  clearFormBtn.addEventListener("click", () => {
    form.reset();
    selectedDates.orderDate = new Date(today);
    selectedDates.docDate = null;
    selectedDates.waybillDate = null;
    document.getElementById("orderDate").value = formatDateStr(selectedDates.orderDate);
    document.getElementById("docDate").value = "";
    document.getElementById("waybillDate").value = "";
    tripsInput.value = 1;
    document.querySelectorAll("input").forEach(el => el.classList.remove("invalid"));
    document.querySelectorAll(".error-message").forEach(el => el.style.display = "none");
  });

  // Валидация и отправка формы по сети на внешний сервер
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    let isValid = true;
    document.querySelectorAll("input").forEach(el => el.classList.remove("invalid"));
    document.querySelectorAll(".error-message").forEach(el => el.style.display = "none");

    if (!selectedDates.orderDate || selectedDates.orderDate < today) {
      document.getElementById("orderDate").classList.add("invalid");
      document.getElementById("orderDateError").style.display = "block";
      isValid = false;
    }
    if (!selectedDates.docDate || selectedDates.docDate < firstDayOfMonth) {
      document.getElementById("docDate").classList.add("invalid");
      document.getElementById("docDateError").style.display = "block";
      isValid = false;
    }
    if (!selectedDates.waybillDate) {
      document.getElementById("waybillDate").classList.add("invalid");
      document.getElementById("waybillDateError").style.display = "block";
      isValid = false;
    }

    // Проверка заполнения всех полей (Отчество теперь строго обязательно)
    const requiredFields = ["lastName", "firstName", "middleName", "docNumber", "waybillNumber", "carNumber", "trailerNumber"];
    requiredFields.forEach(id => {
      const input = document.getElementById(id);
      if (!input.value || input.value.trim() === "") {
        input.classList.add("invalid");
        isValid = false;
      }
    });

    if (!isValid) {
      const firstInvalid = document.querySelector("input.invalid");
      if (firstInvalid) firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    // Защита от повторных случайных кликов
    submitBtn.disabled = true;
    submitBtn.textContent = "Отправка заказа...";

    const formData = {
      orderDate: formatDateStr(selectedDates.orderDate),
      lastName: document.getElementById("lastName").value.trim(),
      firstName: document.getElementById("firstName").value.trim(),
      middleName: document.getElementById("middleName").value.trim(),
      docNumber: document.getElementById("docNumber").value.trim(),
      docDate: formatDateStr(selectedDates.docDate),
      waybillNumber: document.getElementById("waybillNumber").value.trim(),
      waybillDate: formatDateStr(selectedDates.waybillDate),
      carNumber: carInput.value.trim(),
      trailerNumber: trailerInput.value.trim(),
      tripsCount: parseInt(tripsInput.value, 10)
    };
    // Отправка сетевого POST-запроса через Fetch API
    fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(formData)
    })
      .then(() => {
        // Вызываем кастомное пастельное окно вместо системного alert
        const modal = document.getElementById("successModal");
        const closeBtn = document.getElementById("closeModalBtn");
        modal.style.display = "flex";
        closeBtn.onclick = () => {
          modal.style.display = "none";
          clearFormBtn.click(); // Очищаем поля формы только после согласия пользователя
        };
      })
      .catch(error => {
        console.error("Ошибка сети:", error);
        alert("Не удалось связаться с сервером. Проверьте подключение.");
      })
      .finally(() => {
        submitBtn.disabled = false;
        submitBtn.textContent = "Оформить заказ";
      });
  });
});
