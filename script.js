// --- Заполнители для GitHub Actions ---
const CLIENT_ID = '{{ GITHUB_SECRET_CLIENT_ID }}';
const SPREADSHEET_ID = '{{ GITHUB_SECRET_SPREADSHEET_ID }}';
const API_KEY = '{{ GITHUB_SECRET_API_KEY }}';
// ---------------------------------------

const DISCOVERY_DOCS = ["https://sheets.googleapis.com/$discovery/rest?version=v4"];
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

let gapiInited = false;
let gisInited = false;
let gapiClient = null;
let authInstance = null;

// Функции обратного вызова для загрузки скриптов Google
function gapiLoaded() {
    gapi.load('client:auth2', initializeGapiClient);
}

function gisLoaded() {
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
        gapiClient = gapi.client;
        authInstance = gapi.auth2.getAuthInstance();
        authInstance.isSignedIn.listen(updateSigninStatus);
        checkInitComplete();
    } catch (error) {
        console.error('Ошибка инициализации gapi.client:', error);
        handleError('Ошибка инициализации Google API Client. Проверьте API Key и Client ID.');
    }
}

// Проверяем, загружены ли библиотеки и инициализирован ли GAPI
function checkInitComplete() {
    if (gapiInited) {
        console.log("GAPI инициализирован.");
        updateSigninStatus(authInstance.isSignedIn.get());
    }
}

// Обновление статуса авторизации
function updateSigninStatus(isSignedIn) {
    const authButton = document.getElementById('authorize_button');
    const signoutButton = document.getElementById('signout_button');
    const saveButton = document.querySelector('button[type="submit"]');

    if (isSignedIn) {
        console.log("Пользователь авторизован.");
        authButton.style.display = 'none';
        signoutButton.style.display = 'inline-block';
        saveButton.disabled = false;
        loadLastEntry();
    } else {
        console.log("Пользователь не авторизован.");
        authButton.style.display = 'inline-block';
        signoutButton.style.display = 'none';
        saveButton.disabled = true;
        setupDefaultState();
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
    if (!gapiClient || !authInstance || !authInstance.isSignedIn.get()) {
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
    if (!gapiClient || !authInstance || !authInstance.isSignedIn.get()) {
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
       
