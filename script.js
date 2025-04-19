// --- Учетные данные (замените для локального тестирования) ---
const CLIENT_ID = '{{ GITHUB_SECRET_CLIENT_ID }}'; // Замените на ваш Client ID
const SPREADSHEET_ID = '{{ GITHUB_SECRET_SPREADSHEET_ID }}'; // Замените на ID таблицы
const API_KEY = '{{ GITHUB_SECRET_API_KEY }}'; // Замените на ваш API Key (может быть не нужен для Sheets API с OAuth)
// ---------------------------------------

// Области доступа для Google Sheets API
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';
// Discovery Doc для Google Sheets API
const DISCOVERY_DOCS = ["https://sheets.googleapis.com/$discovery/rest?version=v4"];

let tokenClient; // Клиент для получения токена доступа
let gapiInited = false; // Флаг инициализации GAPI client
let gisInited = false; // Флаг инициализации GIS
let accessToken = null; // Хранение токена доступа

// ----- Инициализация -----

// Вызывается после загрузки скрипта GAPI Client (api.js)
function gapiClientLoaded() {
    console.log('gapiClientLoaded вызвана');
    gapi.load('client', initializeGapiClient); // Загружаем только 'client'
}

// Инициализация GAPI Client (но без API Key/Client ID на этом этапе)
async function initializeGapiClient() {
    console.log('Инициализация GAPI Client...');
    try {
        // Инициализируем только базовый клиент
        // API Key здесь необязателен, т.к. аутентификация будет через OAuth токен
        await gapi.client.init({
             apiKey: API_KEY, // API Key нужен, если вы делаете НЕаутентифицированные запросы к публичным данным
             discoveryDocs: DISCOVERY_DOCS,
        });
        gapiInited = true;
        console.log('GAPI Client базово инициализирован.');
        // Попробовать загрузить данные, если токен уже есть (например, после обновления страницы)
        tryEnableButtonsAndLoadData();
    } catch (error) {
        console.error('Ошибка инициализации gapi.client:', error);
        handleError('Ошибка инициализации базового GAPI Client: ' + (error?.details || error.message));
    }
}

// Вызывается после загрузки скрипта GIS (gsi/client)
function gisLoaded() {
    console.log('gisLoaded вызвана');
    // 1. Инициализируем Token Client для получения access_token
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: tokenCallback, // Функция, которая будет вызвана после получения токена
        error_callback: (error) => { // Обработка ошибок получения токена
             console.error('Ошибка получения токена:', error);
             handleError(`Ошибка авторизации: ${error.message || 'Не удалось получить токен.'}`);
             updateSigninStatus(false); // Обновляем статус на "не вошел"
        }
    });
    gisInited = true;
    console.log('GIS инициализирован, Token Client создан.');
    // Попробовать загрузить данные, если GAPI уже готово
    tryEnableButtonsAndLoadData();

    // 2. Отображаем кнопку "Sign in with Google"
    google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: handleCredentialResponse // Функция для обработки ID токена (не access!)
    });
    google.accounts.id.renderButton(
        document.getElementById('g_id_signin'), // Контейнер для кнопки
        { theme: 'outline', size: 'large', text: 'signin_with', shape: 'rectangular' } // Настройки внешнего вида
    );
    // Можно скрыть кнопку, если пользователь уже вошел (если есть токен)
    // google.accounts.id.prompt(); // Показать One Tap prompt, если нужно
}

// ----- Обработка Аутентификации и Авторизации -----

// Callback после успешного входа через кнопку Google (получаем ID токен)
function handleCredentialResponse(response) {
    console.log("Получен Credential Response (ID токен):", response);
    // ID токен сам по себе не дает доступа к API.
    // Теперь нам нужно запросить Access Token с нужными SCOPES.
    requestAccessToken();
}

// Функция для запроса Access Token
function requestAccessToken() {
    console.log('Запрос Access Token...');
    // Если пользователь не выбрал аккаунт или закрыл окно, callback в initTokenClient НЕ будет вызван
    // Можно добавить prompt_consent, чтобы всегда запрашивать разрешение
    // tokenClient.requestAccessToken({prompt: 'consent'});
     if (tokenClient) {
        tokenClient.requestAccessToken({});
     } else {
        console.error("Token Client не инициализирован.");
        handleError("Ошибка: Клиент авторизации не готов.");
     }
}

// Callback после получения Access Token (или ошибки)
function tokenCallback(tokenResponse) {
    if (tokenResponse && tokenResponse.access_token) {
        console.log('Получен Access Token:', tokenResponse.access_token);
        accessToken = tokenResponse.access_token;
        // Устанавливаем токен для GAPI Client
        gapi.client.setToken({ access_token: accessToken });
        updateSigninStatus(true); // Обновляем UI - пользователь вошел
        // Загружаем данные после успешной авторизации
        loadLastEntry();
    } else {
        // Это может случиться, если пользователь отклонил запрос прав доступа
        console.error('Не удалось получить Access Token.', tokenResponse);
        const errorMsg = tokenResponse?.error_description || tokenResponse?.error || 'Не удалось получить токен доступа.';
        handleError('Ошибка авторизации: ' + errorMsg);
        updateSigninStatus(false);
    }
}

// Обработчик кнопки выхода
function handleSignoutClick() {
    console.log('Выполняется выход из аккаунта');
    if (accessToken) {
        // Отзываем токен (хорошая практика)
        google.accounts.oauth2.revoke(accessToken, () => {
            console.log('Токен доступа отозван.');
        });
        accessToken = null;
        gapi.client.setToken(null); // Очищаем токен в GAPI
    }
    // Отключаем автоматический выбор аккаунта при следующем входе
    google.accounts.id.disableAutoSelect();
    updateSigninStatus(false); // Обновляем UI
    setupDefaultState(); // Сброс формы
}

// ----- Управление UI и данными -----

// Попытка включить кнопки и загрузить данные, если оба клиента готовы и есть токен
function tryEnableButtonsAndLoadData() {
    // Эта функция может быть вызвана дважды (после gapi init и gis init)
    // Выполняем основную логику только когда оба готовы
    if (gapiInited && gisInited) {
        console.log('GAPI и GIS готовы.');
        // Проверяем, есть ли уже токен (например, после обновления страницы,
        // если сессия на стороне Google еще активна, но это ненадежно без явного сохранения токена)
        // В данном примере мы НЕ сохраняем токен между сессиями,
        // поэтому при перезагрузке страницы пользователь должен будет снова войти.

        // Настраиваем обработчики
        const signOutButton = document.getElementById('signout_button');
        if (signOutButton) {
             signOutButton.onclick = handleSignoutClick;
        } else {
             console.warn("Кнопка выхода не найдена");
        }
        // Начальное состояние - пользователь не вошел
        updateSigninStatus(false);
    }
}

// Обновление статуса авторизации в интерфейсе
function updateSigninStatus(signedIn) {
    const signinButtonContainer = document.getElementById('g_id_signin');
    const signoutButton = document.getElementById('signout_button');
    const saveButton = document.querySelector('button[type="submit"]');

    console.log("Обновление статуса входа:", signedIn);

    if (signedIn && accessToken) {
        console.log("Пользователь авторизован.");
        if (signinButtonContainer) signinButtonContainer.style.display = 'none'; // Скрыть кнопку Google
        if (signoutButton) signoutButton.style.display = 'inline-block'; // Показать кнопку выхода
        if (saveButton) saveButton.disabled = false; // Включить кнопку сохранения
        // Загрузка данных происходит в tokenCallback после получения токена
    } else {
        console.log("Пользователь не авторизован.");
        if (signinButtonContainer) signinButtonContainer.style.display = 'block'; // Показать кнопку Google
        if (signoutButton) signoutButton.style.display = 'none'; // Скрыть кнопку выхода
        if (saveButton) saveButton.disabled = true; // Отключить кнопку сохранения
        // setupDefaultState(); // Сбрасываем форму при выходе
    }
}

// Установка текущей даты по умолчанию
function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('date');
    if (dateInput && !dateInput.value) {
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

    // Сбрасываем все поля формы
    const form = document.getElementById('diaryForm');
    if (form) form.reset();

    // Дополнительно устанавливаем значения по умолчанию для select и скрытых полей
    const mealCount = document.getElementById('mealCount');
    if (mealCount) mealCount.value = '3'; // Установите ваше значение по умолчанию
    const appetite = document.getElementById('appetite');
    if (appetite) appetite.value = 'Хороший';
    const stoolCount = document.getElementById('stoolCount');
    if (stoolCount) stoolCount.value = 'Один';
    const stoolConsistency = document.getElementById('stoolConsistency');
    if (stoolConsistency) stoolConsistency.value = 'Камушки'; // Или 'Оформленный'
    const stress = document.getElementById('stress');
    if (stress) stress.value = 'Нет';
    const leakage = document.getElementById('leakage');
    if (leakage) leakage.value = 'Нет';
    const condition = document.getElementById('condition');
    if (condition) condition.value = 'Активный';

    // Скрываем поле "Другие таблетки" если чекбокс не отмечен
     const otherCheckbox = document.getElementById('tabletsOther');
     const otherInputSection = document.getElementById('tabletsOtherInput');
     if (otherCheckbox && otherInputSection) {
         otherInputSection.classList.toggle('active', otherCheckbox.checked);
     }

     // Убеждаемся, что секция симптомов скрыта
     if (nauseaSection) nauseaSection.classList.remove('active');
}


// Заполнение формы данными последней записи (без изменений)
function populateForm(entry) {
    entry = entry || {};
    console.log("Заполнение формы данными:", entry);

    // Дата (не обновляем, оставляем текущую или выбранную пользователем)
    // const dateInput = document.getElementById('date');
    // if (dateInput && entry.date) dateInput.value = entry.date;

    const tablets = entry.tablets || [];
    let otherTabletValue = '';
    const standardTablets = ['Апоквел (2р/д)', 'Урсосан (1р/д)', 'Энтерол (2р/д)', 'Лактобиф (1р/д)'];
    document.querySelectorAll('.checkbox-input[name="tablets"]').forEach(checkbox => {
        const isOtherCheckbox = checkbox.id === 'tabletsOther';
        checkbox.checked = false; // Сначала сбрасываем

        if (tablets.includes(checkbox.value)) {
            checkbox.checked = true;
        } else if (!isOtherCheckbox) {
             // Проверяем стандартные таблетки
             if (tablets.includes(checkbox.value)) {
                  checkbox.checked = true;
             }
        } else { // Это чекбокс "Другое"
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

    const food = entry.food || [];
    document.querySelectorAll('.checkbox-input[name="food"]').forEach(checkbox => {
        checkbox.checked = food.includes(checkbox.value);
    });

    const mealCount = document.getElementById('mealCount');
    if (mealCount) mealCount.value = entry.mealCount !== undefined ? entry.mealCount : '3'; // Значение по умолчанию '3'
    const appetite = document.getElementById('appetite');
    if (appetite) appetite.value = entry.appetite || 'Хороший';
    const stoolCount = document.getElementById('stoolCount');
    if (stoolCount) stoolCount.value = entry.stoolCount || 'Один';
    const stoolConsistency = document.getElementById('stoolConsistency');
    if (stoolConsistency) stoolConsistency.value = entry.stoolConsistency || 'Камушки'; // Или 'Оформленный'
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

    const nauseaSection = document.getElementById('nausea-section');
    if (nauseaSection) {
        // Показываем секцию симптомов, если есть данные о тошноте или рвоте
        const shouldBeActive = !!(entry.nausea || entry.vomiting);
        nauseaSection.classList.toggle('active', shouldBeActive);
        // Если секция неактивна, очищаем поля
        // if (!shouldBeActive) {
        //     if(nausea) nausea.value = '';
        //     if(vomiting) vomiting.value = '';
        // }
    }
}


// Загрузка последней записи из Google Sheets
async function loadLastEntry() {
    // Убедимся, что GAPI клиент инициализирован и есть токен
    if (!gapiInited || !accessToken) {
        console.log('GAPI не готов или нет токена для loadLastEntry');
        // Не сбрасываем форму здесь, ждем явного выхода или ошибки
        return;
    }
     // Убедимся, что Sheets API загружен (может быть не загружен при первой загрузке)
     if (!gapi.client.sheets) {
        console.log("Sheets API еще не загружен, загружаем...");
        try {
            await gapi.client.load(DISCOVERY_DOCS[0]);
            console.log("Sheets API успешно загружен.");
        } catch (error) {
            console.error('Ошибка загрузки Sheets API:', error);
            handleError('Не удалось загрузить Google Sheets API: ' + (error?.result?.error?.message || error.message));
            return; // Не можем продолжить без API
        }
    }


    console.log('Загрузка последней записи...');
    try {
        const range = 'Лист1!A2:L'; // Убедитесь, что диапазон соответствует вашим столбцам
        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: range,
        });

        const data = response.result.values;
        if (data && data.length > 1) { // Проверяем, есть ли строки кроме заголовка
             let lastRow = null;
             // Ищем последнюю строку с непустой датой (столбец A, индекс 0)
             for (let i = data.length - 1; i > 0; i--) { // Начинаем с конца, пропускаем заголовок (i > 0)
                 if (data[i] && data[i][0] && data[i][0].trim() !== '') {
                     lastRow = data[i];
                     break;
                 }
             }

            if (lastRow) {
                console.log('Последняя запись найдена:', lastRow);
                 // Индексы соответствуют столбцам A=0, B=1, ..., L=11
                const lastEntry = {
                    // date: lastRow[0] || '', // Дату не восстанавливаем, используем текущую
                    tablets: lastRow[1] ? lastRow[1].split(',').map(s => s.trim()).filter(Boolean) : [],
                    food: lastRow[2] ? lastRow[2].split(',').map(s => s.trim()).filter(Boolean) : [],
                    mealCount: lastRow[3] !== undefined ? lastRow[3] : '3', // Значение по умолчанию
                    appetite: lastRow[4] || 'Хороший',
                    stoolCount: lastRow[5] || 'Один',
                    stoolConsistency: lastRow[6] || 'Камушки', // Или 'Оформленный'
                    nausea: lastRow[7] || '',
                    vomiting: lastRow[8] || '',
                    stress: lastRow[9] || 'Нет',
                    leakage: lastRow[10] || 'Нет',
                    condition: lastRow[11] || 'Активный'
                };
                populateForm(lastEntry);
            } else {
                console.log('В таблице нет строк с данными (кроме заголовка?), используем значения по умолчанию.');
                setupDefaultState(); // Если записей нет, ставим дефолт
            }
        } else {
            console.log('В таблице нет строк данных (или только заголовок), используем значения по умолчанию.');
            setupDefaultState(); // Если записей нет, ставим дефолт
        }
    } catch (error) {
        console.error('Ошибка загрузки последней записи:', error);
        // Если ошибка связана с аутентификацией (401), возможно, токен истек
        if (error.status === 401) {
             handleError('Сессия истекла или недействительна. Пожалуйста, войдите снова.');
             accessToken = null; // Сбрасываем недействительный токен
             gapi.client.setToken(null);
             updateSigninStatus(false); // Показываем кнопку входа
        } else {
            handleError('Не удалось загрузить данные из Google Sheets: ' + (error?.result?.error?.message || error.message));
        }
        setupDefaultState(); // В случае ошибки загрузки, ставим дефолт
    }
}

// Сохранение данных в Google Sheets (без изменений в логике API вызова)
async function saveToGoogleSheets(formData) {
    // Проверка GAPI и токена
    if (!gapiInited || !accessToken) {
        handleError('Не авторизован или GAPI не готов для сохранения.');
        updateSigninStatus(false); // Показать кнопку входа, если проблема с авторизацией
        return;
    }

    // Убедимся, что Sheets API загружен
     if (!gapi.client.sheets) {
        console.log("Sheets API еще не загружен перед сохранением, загружаем...");
        try {
            await gapi.client.load(DISCOVERY_DOCS[0]);
             console.log("Sheets API успешно загружен для сохранения.");
        } catch (error) {
            console.error('Ошибка загрузки Sheets API перед сохранением:', error);
            handleError('Не удалось загрузить Google Sheets API для сохранения: ' + (error?.result?.error?.message || error.message));
            return; // Не можем продолжить без API
        }
    }

    console.log("Сохранение данных:", formData);

    const tabletsString = formData.tablets.join(', ');
    const foodString = formData.food.join(', ');

    const values = [
        [
            formData.date,
            tabletsString,
            foodString,
            formData.mealCount,
            formData.appetite,
            formData.stoolCount,
            formData.stoolConsistency,
            formData.nausea,
            formData.vomiting,
            formData.stress,
            formData.leakage,
            formData.condition
        ]
    ];

    try {
        const response = await gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Sheet1!A1', // Добавляем в конец таблицы, начиная с A1
            valueInputOption: 'USER_ENTERED', // Обрабатывать как ввод пользователя (для форматов дат и т.д.)
            insertDataOption: 'INSERT_ROWS', // Вставить как новые строки
            resource: {
                values: values
            }
        });
        console.log('Данные сохранены:', response);
        alert('Данные успешно сохранены в Google Sheets!');
        // Не сбрасываем форму здесь, а загружаем последнюю запись,
        // которая теперь включает только что сохраненную
        loadLastEntry(); // Перезагружаем данные, чтобы отразить последнее состояние

         // Очистка только специфичных полей после успешного сохранения, если нужно
         // document.getElementById('nausea').value = '';
         // document.getElementById('vomiting').value = '';
         // Можно оставить дату и таблетки/еду для следующего дня

    } catch (error) {
        console.error('Ошибка сохранения:', error);
         // Если ошибка связана с аутентификацией (401), возможно, токен истек
        if (error.status === 401) {
             handleError('Сессия истекла или недействительна. Пожалуйста, войдите снова, чтобы сохранить данные.');
             accessToken = null; // Сбрасываем недействительный токен
             gapi.client.setToken(null);
             updateSigninStatus(false); // Показываем кнопку входа
        } else {
           handleError('Ошибка при сохранении данных: ' + (error?.result?.error?.message || error.message));
        }
    }
}

// Обработка отправки формы (без изменений в логике сбора данных)
function handleSubmit(event) {
    event.preventDefault(); // Предотвращаем стандартную отправку формы

    // Собираем данные с формы
    const tabletsCheckboxes = document.querySelectorAll('.checkbox-input[name="tablets"]:checked');
    const tablets = Array.from(tabletsCheckboxes).map(cb => {
        if (cb.id === 'tabletsOther') {
            // Берем значение из текстового поля, если "Другое" выбрано
            const otherText = document.getElementById('tabletsOtherText')?.value.trim();
            return otherText ? otherText : null; // Возвращаем null, если поле пустое
        }
        return cb.value;
    }).filter(value => value !== null && value !== ''); // Убираем пустые значения

    const foodCheckboxes = document.querySelectorAll('.checkbox-input[name="food"]:checked');
    const food = Array.from(foodCheckboxes).map(cb => cb.value);

    const formData = {
        date: document.getElementById('date')?.value,
        tablets: tablets,
        food: food,
        mealCount: document.getElementById('mealCount')?.value || '3', // Значение по умолчанию
        appetite: document.getElementById('appetite')?.value || 'Хороший',
        stoolCount: document.getElementById('stoolCount')?.value || 'Один',
        stoolConsistency: document.getElementById('stoolConsistency')?.value || 'Камушки', // Или 'Оформленный'
        nausea: document.getElementById('nausea')?.value.trim() || '',
        vomiting: document.getElementById('vomiting')?.value.trim() || '',
        stress: document.getElementById('stress')?.value || 'Нет',
        leakage: document.getElementById('leakage')?.value || 'Нет',
        condition: document.getElementById('condition')?.value || 'Активный'
    };

    // Проверка даты
    if (!formData.date) {
        handleError('Ошибка: Укажите дату!');
        document.getElementById('date')?.focus();
        return;
    }

    // Проверка авторизации перед сохранением
    if (accessToken) {
        saveToGoogleSheets(formData);
    } else {
        handleError('Требуется авторизация в Google для сохранения данных.');
        // Запрашиваем токен снова, если его нет
        requestAccessToken();
    }
}

// Показать/скрыть секцию симптомов (без изменений)
function toggleSymptoms() {
    const nauseaSection = document.getElementById('nausea-section');
    if (nauseaSection) {
        nauseaSection.classList.toggle('active');
    }
}

// Универсальный обработчик ошибок (без изменений)
function handleError(message) {
    console.error("Ошибка приложения:", message);
    alert("Произошла ошибка: " + message); // Показываем пользователю
}

// Инициализация формы и обработчиков событий при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM загружен. Настройка формы и событий.");
    setDefaultDate();
    setupDefaultState(); // Устанавливаем начальное состояние формы

    // Обработчик кнопки сброса
    const resetButton = document.querySelector('.btn-secondary');
    if (resetButton) {
        resetButton.addEventListener('click', () => {
            if (confirm('Вы уверены, что хотите сбросить форму к значениям по умолчанию?')) {
                // document.getElementById('diaryForm').reset(); // reset() может быть недостаточно
                setupDefaultState(); // Используем нашу функцию для полного сброса
            }
        });
    }

    // Обработчик чекбокса "Другие таблетки"
    const otherCheckbox = document.getElementById('tabletsOther');
    const otherInputSection = document.getElementById('tabletsOtherInput');
    const otherTextInput = document.getElementById('tabletsOtherText');
    if (otherCheckbox && otherInputSection && otherTextInput) {
        otherCheckbox.addEventListener('change', function() {
            otherInputSection.classList.toggle('active', this.checked);
            if (!this.checked) {
                otherTextInput.value = ''; // Очищаем поле, если чекбокс снят
            } else {
                otherTextInput.focus(); // Ставим фокус при активации
            }
        });
        // Начальное состояние при загрузке
        otherInputSection.classList.toggle('active', otherCheckbox.checked);
    }

    // Назначаем обработчик отправки формы
    const form = document.getElementById('diaryForm');
    if (form) {
        form.removeEventListener('submit', handleSubmit); // Убираем старый, если есть
        form.addEventListener('submit', handleSubmit); // Добавляем новый
    } else {
        console.error("Форма #diaryForm не найдена!");
    }
});
