// scripts.js

// Константы для OAuth2
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID; // Замените на ваш CLIENT_ID из Secrets
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET; // Замените на ваш CLIENT_SECRET из Secrets
const REDIRECT_URI = 'http://localhost:3000/oauth2callback'; // URI перенаправления
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets']; // Разрешения для доступа к таблицам

// Инициализация OAuth2 клиента
function getOAuth2Client() {
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
}

// Функция для получения токена доступа
async function getAccessToken(oAuth2Client) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });

  console.log('Авторизуйтесь по ссылке:', authUrl);

  // Получение кода авторизации (пользователь должен скопировать его из браузера)
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const code = await new Promise((resolve) => {
    rl.question('Введите код авторизации: ', (code) => {
      rl.close();
      resolve(code);
    });
  });

  const { tokens } = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);
  return oAuth2Client;
}

// Функция для получения последней записи из таблицы
async function getLastEntry() {
  const oAuth2Client = getOAuth2Client();
  await getAccessToken(oAuth2Client);

  const sheets = google.sheets({ version: 'v4', auth: oAuth2Client });
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID; // Замените на ваш SPREADSHEET_ID

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'A:Z', // Укажите диапазон данных
    });

    const data = response.data.values;

    if (!data || data.length <= 1) {
      return {
        tablets: [],
        food: [],
        mealCount: '0',
        appetite: 'Хороший',
        stoolCount: 'Один',
        stoolConsistency: 'Камушки',
        nausea: 'Нет',
        vomiting: 'Нет',
        stress: 'Нет',
        leakage: 'Нет',
        condition: 'Активный',
      };
    }

    const lastRow = data[data.length - 1];
    return {
      tablets: lastRow[1] ? lastRow[1].split(', ') : [],
      food: lastRow[2] ? lastRow[2].split(', ') : [],
      mealCount: lastRow[3] || '0',
      appetite: lastRow[4] || 'Хороший',
      stoolCount: lastRow[5] || 'Один',
      stoolConsistency: lastRow[6] || 'Камушки',
      nausea: lastRow[7] || 'Нет',
      vomiting: lastRow[8] || 'Нет',
      stress: lastRow[9] || 'Нет',
      leakage: lastRow[10] || 'Нет',
      condition: lastRow[11] || 'Активный',
    };
  } catch (error) {
    console.error('Ошибка при получении данных:', error);
    throw error;
  }
}

// Функция для сохранения данных в таблицу
async function saveEntry(formData) {
  const oAuth2Client = getOAuth2Client();
  await getAccessToken(oAuth2Client);

  const sheets = google.sheets({ version: 'v4', auth: oAuth2Client });
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

  const rowData = [
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
    formData.condition,
  ];

  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'A:Z', // Укажите диапазон данных
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: [rowData],
      },
    });

    console.log('Данные успешно сохранены!');
  } catch (error) {
    console.error('Ошибка при сохранении данных:', error);
    throw error;
  }
}
