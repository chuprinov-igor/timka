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
    const authButtonDiv = document.getElementById('buttonDiv');
    const signoutButton = document.getElementById('signout_button');
    const saveButton = document.querySelector('button[type="submit"]');

    if (signedIn) {
        console.log("Пользователь авторизован.");
        if (authButtonDiv) authButtonDiv.style.display = 'none';
        if (signoutButton) signoutButton.style.display = 'inline-block';
        if (saveButton) saveButton.disabled = false;
        loadLastEntry();
    } else {
        console.log("Пользователь не авторизован.");
        if (authButtonDiv) {
            authButtonDiv.style.display = 'block'; // Показываем div для кнопки GIS
            // Кнопка GIS будет отрисована внутри buttonDiv
        }
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

    // Кнопка входа GIS автоматически появится, так как buttonDiv будет виден
}

// ... остальной код JavaScript без изменений ...

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
