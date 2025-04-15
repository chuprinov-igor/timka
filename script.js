// --- Заполнители для GitHub Actions ---
// Эти строки будут заменены реальными значениями во время сборки на GitHub Actions
const CLIENT_ID = '695105515343-g7kr237f3697hem1f0mrp97pm7dmmt3o.apps.googleusercontent.com';
const SPREADSHEET_ID = '1U8Pzxe2dUhIkykKRwo_Tv_9UVL47AcoAYm3bRW6MkFk';
const API_KEY = 'AIzaSyCLGuyFeUdv50ihEt-04zOKr_-MtfgPJH0';
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
    if (gapiInited) {
        console.log("GAPI инициализирован.");
        updateSigninStatus(authInstance.isSignedIn.get());
    }
}

// Обновление статуса авторизации и загрузка данных при входе
function updateSigninStatus(isSignedIn) {
    const authButton = document.getElementById('authorize_button');
    const signOutButton = document.getElementById('signout_button');
    if (isSignedIn) {
        authButton.style.display = 'none';
        signOutButton.style.display = 'block';
        loadLastEntry();
    } else {
        authButton.style.display = 'block';
        signOutButton.style.display = 'none';
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
    document.getElementById('mealCount')?.setValue('0');
    document.getElementById('appetite')?.setValue('Хороший');
    document.getElementById('stoolCount')?.setValue('Один');
    document.getElementById('stoolConsistency')?.setValue('Камушки');
    document.getElementById('stress')?.setValue('Нет');
    document.getElementById('leakage')?.setValue('Нет');
    document.getElementById('condition')?.setValue('Активный');
}

// Загрузка последней записи из Google Sheets
async function loadLastEntry() {
    if (!gapiClient || !authInstance || !authInstance.isSignedIn.get()) {
        console.log('Не авторизован или GAPI не готов для loadLastEntry');
        setupDefaultState();
        return;
    }
    try {
        const response = await gapiClient.sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Sheet1!A:L',
        });
        const data = response.result.values;
        if (data && data.length > 1) {
            const lastRow = data[data.length - 1];
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
            setupDefaultState();
        }
    } catch (error) {
        console.error('Ошибка загрузки последней записи:', error);
        handleError('Не удалось загрузить данные из Google Sheets.');
        setupDefaultState();
    }
}

// Заполнение формы данными последней записи
function populateForm(entry) {
    entry = entry || {};
    document.querySelectorAll('.checkbox-input[name="tablets"]').forEach(checkbox => {
        checkbox.checked = entry.tablets.includes(checkbox.value);
    });
    document.querySelectorAll('.checkbox-input[name="food"]').forEach(checkbox => {
        checkbox.checked = entry.food.includes(checkbox.value);
    });
    document.getElementById('mealCount')?.setValue(entry.mealCount || '0');
    document.getElementById('appetite')?.setValue(entry.appetite || 'Хороший');
    document.getElementById('stoolCount')?.setValue(entry.stoolCount || 'Один');
    document.getElementById('stoolConsistency')?.setValue(entry.stoolConsistency || 'Камушки');
    document.getElementById('nausea')?.setValue(entry.nausea || '');
    document.getElementById('vomiting')?.setValue(entry.vomiting || '');
    document.getElementById('stress')?.setValue(entry.stress || 'Нет');
    document.getElementById('leakage')?.setValue(entry.leakage || 'Нет');
    document.getElementById('condition')?.setValue(entry.condition || 'Активный');
}

// Сохранение данных в Google Sheets
async function saveToGoogleSheets(formData) {
    if (!gapiClient || !authInstance || !authInstance.isSignedIn.get()) {
        handleError('Не авторизован.');
        return;
    }
    const values = [
        [
            formData.date,
            formData.tablets.join(', '),
            formData.food.join(', '),
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
        await gapiClient.sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Sheet1!A1',
            valueInputOption: 'USER_ENTERED',
            resource: { values }
        });
        alert('Данные успешно сохранены!');
        setupDefaultState();
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        handleError('Ошибка при сохранении данных.');
    }
}

// Обработка отправки формы
function handleSubmit(event) {
    event.preventDefault();
    const tabletsCheckboxes = document.querySelectorAll('.checkbox-input[name="tablets"]:checked');
    const foodCheckboxes = document.querySelectorAll('.checkbox-input[name="food"]:checked');
    const formData = {
        date: document.getElementById('date')?.value,
        tablets: Array.from(tabletsCheckboxes).map(cb => cb.value),
        food: Array.from(foodCheckboxes).map(cb => cb.value),
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
        handleError('Укажите дату!');
        return;
    }
    if (authInstance && authInstance.isSignedIn.get()) {
        saveToGoogleSheets(formData);
    } else {
        handleError('Требуется авторизация.');
        signIn();
    }
}

// Универсальный обработчик ошибок
function handleError(message) {
    console.error(message);
    alert(message);
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    setDefaultDate();
    setupDefaultState();
    const otherCheckbox = document.getElementById('tabletsOther');
    if (otherCheckbox) {
        otherCheckbox.addEventListener('change', function() {
            const otherInputSection = document.getElementById('tabletsOtherInput');
            if (otherInputSection) {
                otherInputSection.classList.toggle('active', this.checked);
            }
        });
    }
});
