// --- Учетные данные (замените для локального тестирования) ---
const CLIENT_ID = '{{ GITHUB_SECRET_CLIENT_ID }}'; // Замените на ваш Client ID
const SPREADSHEET_ID = '{{ GITHUB_SECRET_SPREADSHEET_ID }}'; // Замените на ID таблицы
const API_KEY = '{{ GITHUB_SECRET_API_KEY }}'; // Замените на ваш API Key
// ---------------------------------------
const DISCOVERY_DOCS = ["https://sheets.googleapis.com/$discovery/rest?version=v4"];
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

let gapiInited = false;
let gisInited = false;
let gapiClient = null;
let isSignedIn = false;

// Функция загрузки GAPI
function gapiLoaded() {
    console.log('gapiLoaded вызвана');
    gapi.load('client', initializeGapiClient);
}

// Функция загрузки Google Identity Services
function gisLoaded() {
    console.log('Google Identity Services загружен');
    
    // Инициализация Google Identity Services
    google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: handleCredentialResponse,
        scope: SCOPES
    });
    
    // Отображаем кнопку авторизации
    google.accounts.id.renderButton(
        document.getElementById("buttonDiv"),
        { theme: "outline", size: "large", text: "signin_with" }
    );

    // Автоматический показ формы входа, если нужно (опционально)
    // google.accounts.id.prompt();
    
    gisInited = true;
    checkInitComplete();
}

// Инициализация GAPI Client
async function initializeGapiClient() {
    try {
        console.log('Инициализация GAPI с API_KEY:', API_KEY);
        await gapi.client.init({
            apiKey: API_KEY,
            discoveryDocs: DISCOVERY_DOCS
        });
        
        gapiInited = true;
        gapiClient = gapi.client;
        console.log('GAPI успешно инициализирован');
        checkInitComplete();
    } catch (error) {
        console.error('Ошибка инициализации gapi.client:', error);
        handleError('Ошибка инициализации Google API Client: ' + (error?.details || error.message));
    }
}

// Обработка ответа после успешной авторизации
function handleCredentialResponse(response) {
    console.log("Получены креденциалы:", response);
    
    try {
        const credential = response.credential;
        
        // Используем ID-токен как токен доступа для GAPI
        gapi.client.setToken({
            access_token: credential
        });
        
        console.log('Токен установлен успешно');
        isSignedIn = true;
        updateSigninStatus(true);
    } catch (error) {
        console.error('Ошибка обработки авторизации:', error);
        handleError('Ошибка авторизации: ' + error.message);
    }
}

// Проверка завершения инициализации API
function checkInitComplete() {
    if (gapiInited && gisInited) {
        console.log("Все API инициализированы.");
        
        // Проверяем, есть ли активный токен
        const token = gapi.client.getToken();
        if (token) {
            console.log("Найден активный токен:", token);
            isSignedIn = true;
            updateSigninStatus(true);
        } else {
            console.log("Активный токен не найден");
            isSignedIn = false;
            updateSigninStatus(false);
        }
    }
}

// Обновление статуса авторизации в интерфейсе
function updateSigninStatus(signedIn) {
    const authButton = document.getElementById('buttonDiv');
    const signoutButton = document.getElementById('signout_button');
    const saveButton = document.querySelector('button[type="submit"]');

    if (signedIn) {
        console.log("Пользователь авторизован.");
        if (authButton) authButton.style.display = 'none';
        if (signoutButton) signoutButton.style.display = 'inline-block';
        if (saveButton) saveButton.disabled = false;
        loadLastEntry();
    } else {
        console.log("Пользователь не авторизован.");
        if (authButton) authButton.style.display = 'inline-block';
        if (signoutButton) signoutButton.style.display = 'none';
        if (saveButton) saveButton.disabled = true;
        setupDefaultState();
    }
}

// Функция для выхода
function signOut() {
    console.log('Выполняется выход из аккаунта...');
    
    // Очищаем токен
    gapi.client.setToken(null);
    isSignedIn = false;
    
    // Обновляем интерфейс
    updateSigninStatus(false);
    
    // Показываем возможность входа снова
    const authButton = document.getElementById('buttonDiv');
    if (authButton) {
        google.accounts.id.renderButton(
            authButton,
            { theme: "outline", size: "large", text: "signin_with" }
        );
        authButton.style.display = 'inline-block';
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

    document.querySelectorAll('.input-field[id]').forEach(el => {
        if (el.tagName === 'SELECT') {
            el.selectedIndex = 0;
        } else if (el.type === 'checkbox' || el.type === 'radio') {
            el.checked = false;
        } else if (el.type !== 'button' && el.type !== 'submit' && el.type !== 'reset') {
            if (el.id !== 'date') {
                el.value = '';
            }
        }
    });

    const otherTextInput = document.getElementById('tabletsOtherText');
    if (otherTextInput) otherTextInput.value = '';
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
    const nauseaInput = document.getElementById('nausea');
    if (nauseaInput) nauseaInput.value = '';
    const vomitingInput = document.getElementById('vomiting');
    if (vomitingInput) vomitingInput.value = '';
}

// Заполнение формы данными последней записи
function populateForm(entry) {
    entry = entry || {};

    const tablets = entry.tablets || [];
    let otherTabletValue = '';
    const standardTablets = ['Апоквел (2р/д)', 'Урсосан (1р/д)', 'Энтерол (2р/д)', 'Лактобиф (1р/д)'];
    document.querySelectorAll('.checkbox-input[name="tablets"]').forEach(checkbox => {
        const isStandard = standardTablets.includes(checkbox.value);
        const isOtherCheckbox = checkbox.id === 'tabletsOther';
        checkbox.checked = false;

        if (tablets.includes(checkbox.value)) {
            checkbox.checked = true;
        } else if (isOtherCheckbox) {
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
    if (!gapiClient || !isSignedIn) {
        console.log('Не авторизован или GAPI не готов для loadLastEntry');
        setupDefaultState();
        return;
    }

    console.log('Загрузка последней записи...');
    try {
        const range = 'Sheet1!A:L';
        const response = await gapiClient.sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: range,
        });

        const data = response.result.values;
        if (data && data.length > 1) {
            let lastRow = null;
            for (let i = data.length - 1; i >= 0; i--) {
                if (data[i][0]) {
                    lastRow = data[i];
                    break;
                }
            }

            if (lastRow) {
                console.log('Последняя запись найдена:', lastRow);
                const lastEntry = {
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
                setupDefaultState();
            }
        } else {
            console.log('В таблице нет строк данных (кроме заголовка?), используем значения по умолчанию.');
            setupDefaultState();
        }
    } catch (error) {
        console.error('Ошибка загрузки последней записи:', error);
        handleError('Не удалось загрузить данные из Google Sheets: ' + (error?.result?.error?.message || error.message));
        setupDefaultState();
    }
}

// Сохранение данных в Google Sheets
async function saveToGoogleSheets(formData) {
    if (!gapiClient || !isSignedIn) {
        handleError('Не авторизован или GAPI не готов для сохранения.');
        return;
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
        const response = await gapiClient.sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Sheet1!A1',
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            resource: {
                values: values
            }
        });
        console.log('Данные сохранены:', response);
        alert('Данные успешно сохранены в Google Sheets!');
        document.getElementById('diaryForm').reset();
        setupDefaultState();
        loadLastEntry();
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        handleError('Ошибка при сохранении данных: ' + (error?.result?.error?.message || error.message));
    }
}

// Обработка отправки формы
function handleSubmit(event) {
    event.preventDefault();

    const tabletsCheckboxes = document.querySelectorAll('.checkbox-input[name="tablets"]:checked');
    const tablets = Array.from(tabletsCheckboxes).map(cb => {
        if (cb.id === 'tabletsOther') {
            const otherText = document.getElementById('tabletsOtherText')?.value.trim();
            return otherText ? otherText : null;
        }
        return cb.value;
    }).filter(value => value !== null && value !== '');

    const foodCheckboxes = document.querySelectorAll('.checkbox-input[name="food"]:checked');
    const food = Array.from(foodCheckboxes).map(cb => cb.value);

    const formData = {
        date: document.getElementById('date')?.value,
        tablets: tablets,
        food: food,
        mealCount: document.getElementById('mealCount')?.value || '0',
        appetite: document.getElementById('appetite')?.value || 'Хороший',
        stoolCount: document.getElementById('stoolCount')?.value || 'Один',
        stoolConsistency: document.getElementById('stoolConsistency')?.value || 'Камушки',
        nausea: document.getElementById('nausea')?.value.trim() || '',
        vomiting: document.getElementById('vomiting')?.value.trim() || '',
        stress: document.getElementById('stress')?.value || 'Нет',
        leakage: document.getElementById('leakage')?.value || 'Нет',
        condition: document.getElementById('condition')?.value || 'Активный'
    };

    if (!formData.date) {
        handleError('Ошибка: Укажите дату!');
        document.getElementById('date')?.focus();
        return;
    }

    if (isSignedIn) {
        saveToGoogleSheets(formData);
    } else {
        handleError('Требуется авторизация в Google для сохранения данных.');
        google.accounts.id.prompt(); // Показываем диалог авторизации
    }
}

// Показать/скрыть секцию симптомов
function toggleSymptoms() {
    const nauseaSection = document.getElementById('nausea-section');
    if (nauseaSection) {
        nauseaSection.classList.toggle('active');
    }
}

// Универсальный обработчик ошибок
function handleError(message) {
    console.error(message);
    alert(message);
}

// Инициализация формы
document.addEventListener('DOMContentLoaded', () => {
    setDefaultDate();
    setupDefaultState();

    const resetButton = document.querySelector('.btn-secondary');
    if (resetButton) {
        resetButton.addEventListener('click', () => {
            if (confirm('Вы уверены, что хотите сбросить форму к значениям по умолчанию?')) {
                document.getElementById('diaryForm').reset();
                setupDefaultState();
            }
        });
    }

    const otherCheckbox = document.getElementById('tabletsOther');
    if (otherCheckbox) {
        otherCheckbox.addEventListener('change', function() {
            const otherInputSection = document.getElementById('tabletsOtherInput');
            const otherTextInput = document.getElementById('tabletsOtherText');
            if (otherInputSection) {
                otherInputSection.classList.toggle('active', this.checked);
            }
            if (!this.checked && otherTextInput) {
                otherTextInput.value = '';
            }
        });
    }

    const form = document.getElementById('diaryForm');
    if (form) {
        form.addEventListener('submit', handleSubmit);
    }
    
    const signoutButton = document.getElementById('signout_button');
    if (signoutButton) {
        signoutButton.addEventListener('click', signOut);
    }
});
