// --- Заполнители для GitHub Actions ---
// Эти строки будут заменены реальными значениями во время сборки на GitHub Actions
const CLIENT_ID = '{{ GITHUB_SECRET_CLIENT_ID }}';
const SPREADSHEET_ID = '{{ GITHUB_SECRET_SPREADSHEET_ID }}';
const API_KEY = '{{ GITHUB_SECRET_API_KEY }}';
// ---------------------------------------

const DISCOVERY_DOCS = ["https://sheets.googleapis.com/$discovery/rest?version=v4"];
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

let gapiInited = false;
let gisInited = false;
let gapiClient = null; // Для хранения клиента GAPI
let authInstance = null; // Для хранения экземпляра Auth2

// Функции обратного вызова для загрузки скриптов Google
function gapiLoaded() {
  gapi.load('client:auth2', initializeGapiClient);
}

function gisLoaded() {
  // Пока не используем GIS напрямую для auth2, но полезно иметь
  gisInited = true;
  checkInitComplete();
}

// Инициализация GAPI Client
async function initializeGapiClient() {
  try {
    await gapi.client.init({
      apiKey: API_KEY,
      clientId: CLIENT_ID,
      discoveryDocs: DISCOVERY_DOCS,
      scope: SCOPES
    });
    gapiInited = true;
    gapiClient = gapi.client; // Сохраняем клиент
    authInstance = gapi.auth2.getAuthInstance(); // Сохраняем Auth2
    authInstance.isSignedIn.listen(updateSigninStatus); // Устанавливаем слушатель статуса входа
    checkInitComplete();
  } catch (error) {
    console.error('Ошибка инициализации gapi.client:', error);
    handleError('Ошибка инициализации Google API Client. Проверьте API Key и Client ID.');
  }
}

// Проверяем, загружены ли обе библиотеки и инициализирован ли GAPI
function checkInitComplete() {
    // Для текущей реализации достаточно gapiInited
    if (gapiInited) {
        console.log("GAPI инициализирован.");
        // Начальная проверка статуса входа
        updateSigninStatus(authInstance.isSignedIn.get());
    }
}

// Обновление статуса авторизации и загрузка данных при входе
function updateSigninStatus(isSignedIn) {
  const authButton = document.getElementById('authorize_button'); // Предполагаем, что есть кнопка для входа/выхода
  const saveButton = document.querySelector('button[type="submit"]');

  if (isSignedIn) {
    console.log("Пользователь авторизован.");
    if (authButton) authButton.textContent = 'Выйти из Google';
    if (saveButton) saveButton.disabled = false;
    // Загружаем последнюю запись ТОЛЬКО если пользователь вошел
    loadLastEntry();
  } else {
    console.log("Пользователь не авторизован.");
    if (authButton) authButton.textContent = 'Авторизоваться в Google';
    if (saveButton) saveButton.disabled = true; // Блокируем сохранение без авторизации
    // Предлагаем войти, если нужно (можно сделать кнопку)
    // signIn(); // Не вызываем автоматически при загрузке, лучше по кнопке
  }
}

// Функция для входа
function signIn() {
    if (authInstance) {
        authInstance.signIn();
    } else {
        handleError("Ошибка: Google Auth не инициализирован.");
    }
}

// Функция для выхода
function signOut() {
     if (authInstance) {
        authInstance.signOut();
    } else {
        handleError("Ошибка: Google Auth не инициализирован.");
    }
}


// --- Остальной ваш код (без изменений или с мелкими правками) ---

// Установка текущей даты по умолчанию
function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('date');
    if (dateInput && !dateInput.value) { // Проверка существования элемента
        dateInput.value = today;
    }
}

// Сброс формы и установка начального состояния
function setupDefaultState() {
    setDefaultDate();
    const tabletsOtherInput = document.getElementById('tabletsOtherInput');
    if (tabletsOtherInput) tabletsOtherInput.classList.remove('active');
    const nauseaSection = document.getElementById('nausea-section');
    if (nauseaSection) nauseaSection.classList.remove('active');

    document.querySelectorAll('.input-field[id]').forEach(el => {
        if (el.tagName === 'SELECT') {
            el.selectedIndex = 0; // Сброс select
        } else if (el.type === 'checkbox' || el.type === 'radio') {
            el.checked = false; // Сброс чекбоксов/радио
        } else if (el.type !== 'button' && el.type !== 'submit' && el.type !== 'reset') {
           // Не сбрасываем дату, она устанавливается в setDefaultDate
           if (el.id !== 'date') {
               el.value = ''; // Сброс остальных полей ввода
           }
        }
    });

    const otherTextInput = document.getElementById('tabletsOtherText');
    if (otherTextInput) {
        otherTextInput.value = '';
    }
    // Сброс обязательных полей к значениям по умолчанию, если они есть
    const mealCount = document.getElementById('mealCount');
    if (mealCount) mealCount.value = '0';
    const appetite = document.getElementById('appetite');
    if (appetite) appetite.value = 'Хороший';
     const stoolCount = document.getElementById('stoolCount');
    if (stoolCount) stoolCount.value = 'Один';
     const stoolConsistency = document.getElementById('stoolConsistency');
    if (stoolConsistency) stoolConsistency.value = 'Камушки';
    const stress = document.getElementById('stress');
    if (stress) stress.value = 'Нет';
     const leakage = document.getElementById('leakage');
    if (leakage) leakage.value = 'Нет';
    const condition = document.getElementById('condition');
    if (condition) condition.value = 'Активный';

     // Убедимся, что секция симптомов скрыта при сбросе
     if (nauseaSection) nauseaSection.classList.remove('active');
     const nauseaInput = document.getElementById('nausea');
     if (nauseaInput) nauseaInput.value = '';
     const vomitingInput = document.getElementById('vomiting');
     if (vomitingInput) vomitingInput.value = '';

}

// Заглушка для последней записи (можно убрать, если загрузка всегда успешна)
// let lastEntry = { ... }; // Уже не так нужна, т.к. грузим из Sheets

// Заполнение формы данными последней записи
function populateForm(entry) {
    entry = entry || {}; // На случай если запись пустая

    // Таблетки
    const tablets = entry.tablets || [];
    let otherTabletValue = '';
    const standardTablets = ['Апоквел (2р/д)', 'Урсосан (1р/д)', 'Энтерол (2р/д)', 'Лактобиф (1р/д)']; // Стандартные значения
    document.querySelectorAll('.checkbox-input[name="tablets"]').forEach(checkbox => {
        const isStandard = standardTablets.includes(checkbox.value);
        const isOtherCheckbox = checkbox.id === 'tabletsOther';
        checkbox.checked = false; // Сначала сбросить

        if (tablets.includes(checkbox.value)) {
            checkbox.checked = true;
        } else if (isOtherCheckbox) {
            // Ищем значение в 'tablets', которое не является стандартным
            const otherVal = tablets.find(t => t && !standardTablets.includes(t));
            if (otherVal) {
                checkbox.checked = true;
                otherTabletValue = otherVal;
            }
        }
    });
    const tabletsOtherText = document.getElementById('tabletsOtherText');
    const tabletsOtherInput = document.getElementById('tabletsOtherInput');
    const tabletsOtherCheckbox = document.getElementById('tabletsOther');
    if (tabletsOtherText) tabletsOtherText.value = otherTabletValue;
    if (tabletsOtherInput && tabletsOtherCheckbox) {
        tabletsOtherInput.classList.toggle('active', tabletsOtherCheckbox.checked);
    }

    // Еда
    const food = entry.food || [];
    document.querySelectorAll('.checkbox-input[name="food"]').forEach(checkbox => {
        checkbox.checked = food.includes(checkbox.value);
    });

    // Остальные поля
    const mealCount = document.getElementById('mealCount');
    if (mealCount) mealCount.value = entry.mealCount || '0';
    const appetite = document.getElementById('appetite');
    if (appetite) appetite.value = entry.appetite || 'Хороший';
    const stoolCount = document.getElementById('stoolCount');
    if (stoolCount) stoolCount.value = entry.stoolCount || 'Один';
    const stoolConsistency = document.getElementById('stoolConsistency');
    if (stoolConsistency) stoolConsistency.value = entry.stoolConsistency || 'Камушки';
    const nausea = document.getElementById('nausea');
    if (nausea) nausea.value = entry.nausea || '';
    const vomiting = document.getElementById('vomiting');
    if (vomiting) vomiting.value = entry.vomiting || '';
    const stress = document.getElementById('stress');
    if (stress) stress.value = entry.stress || 'Нет';
    const leakage = document.getElementById('leakage');
    if (leakage) leakage.value = entry.leakage || 'Нет';
    const condition = document.getElementById('condition');
    if (condition) condition.value = entry.condition || 'Активный';

    // Секция тошноты
    const nauseaSection = document.getElementById('nausea-section');
    if (nauseaSection) {
        if (entry.nausea || entry.vomiting) {
            nauseaSection.classList.add('active');
        } else {
            nauseaSection.classList.remove('active');
        }
    }
}


// Загрузка последней записи из Google Sheets
async function loadLastEntry() {
    if (!gapiClient || !authInstance || !authInstance.isSignedIn.get()) {
        console.log('Не авторизован или GAPI не готов для loadLastEntry');
        // Можно показать сообщение пользователю или просто не загружать
        setupDefaultState(); // Установить состояние по умолчанию, если не можем загрузить
        return;
    }

    console.log('Загрузка последней записи...');
    try {
        // Определяем последнюю строку. Важно: Убедитесь, что в таблице ЕСТЬ данные, иначе range может быть некорректным.
        // Лучше сначала получить метаданные или просто запросить большой диапазон и взять последнюю строку.
        // Запрашиваем последние N строк (например, 10) и берем последнюю непустую
        const range = 'Sheet1!A:L'; // Берем все колонки
        const response = await gapiClient.sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: range,
        });

        const data = response.result.values;
        if (data && data.length > 1) { // Проверяем, что есть хотя бы одна строка данных (не считая заголовка)
            // Ищем последнюю строку с датой (первый столбец)
            let lastRow = null;
            for (let i = data.length - 1; i >= 0; i--) {
                if (data[i][0]) { // Если первый столбец (дата) не пустой
                    lastRow = data[i];
                    break;
                }
            }

            if (lastRow) {
                 console.log('Последняя запись найдена:', lastRow);
                 const lastEntry = {
                    // Индексы соответствуют столбцам A=0, B=1, ... L=11
                    tablets: lastRow[1] ? lastRow[1].split(',').map(s => s.trim()).filter(Boolean) : [],
                    food: lastRow[2] ? lastRow[2].split(',').map(s => s.trim()).filter(Boolean) : [],
                    mealCount: lastRow[3] || '0',
                    appetite: lastRow[4] || 'Хороший',
                    stoolCount: lastRow[5] || 'Один',
                    stoolConsistency: lastRow[6] || 'Камушки',
                    nausea: lastRow[7] || '',
                    vomiting: lastRow[8] || '',
                    stress: lastRow[9] || 'Нет',
                    leakage: lastRow[10] || 'Нет',
                    condition: lastRow[11] || 'Активный'
                };
                populateForm(lastEntry);
            } else {
                 console.log('В таблице нет строк с данными, используем значения по умолчанию.');
                 setupDefaultState(); // Если данных нет, ставим умолчания
            }
        } else {
            console.log('В таблице нет строк данных (кроме заголовка?), используем значения по умолчанию.');
            setupDefaultState(); // Если данных нет, ставим умолчания
        }
    } catch (error) {
        console.error('Ошибка загрузки последней записи:', error);
        handleError('Не удалось загрузить данные из Google Sheets. ' + (error?.result?.error?.message || error.message));
        setupDefaultState(); // При ошибке ставим умолчания
    }
}

// Инициализация формы при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    setDefaultDate(); // Установить дату сразу
    setupDefaultState(); // Установить начальное состояние формы до загрузки данных

    // Найти и настроить кнопку сброса
     const resetButton = document.querySelector('.btn-secondary'); // Или используйте более точный селектор/ID
    if (resetButton) {
        resetButton.addEventListener('click', (e) => {
            e.preventDefault(); // Предотвратить стандартное поведение кнопки, если она в форме
            if (confirm('Вы уверены, что хотите сбросить форму к значениям по умолчанию?')) {
                 document.getElementById('diaryForm').reset(); // Сначала стандартный сброс HTML
                 setupDefaultState(); // Затем наша функция для установки умолчаний
            }
        });
    }

    // Настроить чекбокс "Другое" для таблеток
    const otherCheckbox = document.getElementById('tabletsOther');
    if (otherCheckbox) {
        otherCheckbox.addEventListener('change', function() {
            const otherInputSection = document.getElementById('tabletsOtherInput');
            const otherTextInput = document.getElementById('tabletsOtherText');
            if (otherInputSection) {
                otherInputSection.classList.toggle('active', this.checked);
            }
            if (!this.checked && otherTextInput) {
                otherTextInput.value = ''; // Очистить поле, если чекбокс снят
            }
        });
    }

    // Назначить обработчик отправки формы
    const form = document.getElementById('diaryForm');
    if (form) {
        form.addEventListener('submit', handleSubmit);
    }

    // Добавить кнопки входа/выхода (если их еще нет в HTML)
    // Пример: <button id="authorize_button" onclick="signIn()">Авторизоваться</button>
    //         <button id="signout_button" onclick="signOut()" style="display: none;">Выйти</button> // Изначально скрыта

    // --- Важно: GAPI инициализация запускается через onload в HTML ---
    // Не вызываем initGapiClient() прямо здесь
});

// Показать/скрыть секцию симптомов
function toggleSymptoms() {
    const nauseaSection = document.getElementById('nausea-section');
    if (nauseaSection) {
         nauseaSection.classList.toggle('active');
    }
}

// Сохранение данных в Google Sheets
async function saveToGoogleSheets(formData) {
    if (!gapiClient || !authInstance || !authInstance.isSignedIn.get()) {
         handleError('Не авторизован или GAPI не готов для сохранения.');
        return;
    }

    console.log("Сохранение данных:", formData);

    // Преобразуем массивы в строки
    const tabletsString = formData.tablets.join(', ');
    const foodString = formData.food.join(', ');

    const values = [
        [
            formData.date,          // A
            tabletsString,          // B
            foodString,             // C
            formData.mealCount,     // D
            formData.appetite,      // E
            formData.stoolCount,    // F
            formData.stoolConsistency, // G
            formData.nausea,        // H
            formData.vomiting,      // I
            formData.stress,        // J
            formData.leakage,       // K
            formData.condition      // L
        ]
    ];

    try {
        const response = await gapiClient.sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Sheet1!A1', // Указываем начало диапазона, Sheets сам найдет первую пустую строку
            valueInputOption: 'USER_ENTERED', // Или 'RAW', если не нужно автоформатирование дат/чисел
            insertDataOption: 'INSERT_ROWS', // Вставлять как новые строки
            resource: {
                values: values
            }
        });
        console.log('Данные сохранены:', response);
        alert('Данные успешно сохранены в Google Sheets!');
        document.getElementById('diaryForm').reset();
        setupDefaultState(); // Сброс формы к начальному состоянию
        // Опционально: Перезагрузить последнюю запись, чтобы форма обновилась,
        // но это может быть излишне после только что сделанной записи.
        // loadLastEntry();
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        handleError('Ошибка при сохранении данных: ' + (error?.result?.error?.message || error.message));
    }
}

// Обработка отправки формы
function handleSubmit(event) {
    event.preventDefault(); // Предотвращаем стандартную отправку формы

    // Собираем данные из формы
    const tabletsCheckboxes = document.querySelectorAll('.checkbox-input[name="tablets"]:checked');
    const tablets = Array.from(tabletsCheckboxes).map(cb => {
        if (cb.id === 'tabletsOther') {
            // Берем значение из текстового поля, если "Другое" выбрано и поле не пустое
            const otherText = document.getElementById('tabletsOtherText')?.value.trim();
            return otherText ? otherText : null; // Возвращаем null, если поле пустое, чтобы отфильтровать
        }
        return cb.value;
    }).filter(value => value !== null && value !== ''); // Убираем пустые значения

    const foodCheckboxes = document.querySelectorAll('.checkbox-input[name="food"]:checked');
    const food = Array.from(foodCheckboxes).map(cb => cb.value);

    const formData = {
        date: document.getElementById('date')?.value,
        tablets: tablets, // Массив строк
        food: food,       // Массив строк
        mealCount: document.getElementById('mealCount')?.value || '0',
        appetite: document.getElementById('appetite')?.value || 'Хороший',
        stoolCount: document.getElementById('stoolCount')?.value || 'Один',
        stoolConsistency: document.getElementById('stoolConsistency')?.value || 'Камушки',
        nausea: document.getElementById('nausea')?.value.trim() || '', // Убираем пробелы, ставим '' если пусто
        vomiting: document.getElementById('vomiting')?.value.trim() || '',
        stress: document.getElementById('stress')?.value || 'Нет',
        leakage: document.getElementById('leakage')?.value || 'Нет',
        condition: document.getElementById('condition')?.value || 'Активный'
    };

    // Простая валидация
    if (!formData.date) {
        handleError('Ошибка: Укажите дату!');
        document.getElementById('date')?.focus();
        return;
    }

    // Проверяем авторизацию перед сохранением
    if (authInstance && authInstance.isSignedIn.get()) {
        saveToGoogleSheets(formData);
    } else {
        handleError('Требуется авторизация в Google для сохранения данных.');
        // Предлагаем войти
        signIn();
    }
}

// Универсальный обработчик ошибок для вывода сообщений
function handleError(message) {
    console.error(message);
    alert(message); // Или используйте более красивое уведомление на странице
}
