// Установка текущей даты по умолчанию
function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('date');
    if (!dateInput.value) {
        dateInput.value = today;
    }
}

// Сброс формы и установка начального состояния
function setupDefaultState() {
    setDefaultDate();
    document.getElementById('tabletsOtherInput').classList.remove('active');
    document.getElementById('nausea-section').classList.remove('active');
    
    document.querySelectorAll('.input-field[id]').forEach(el => {
        if (el.tagName === 'SELECT') {
            el.selectedIndex = 0;
        }
    });

    const otherTextInput = document.getElementById('tabletsOtherText');
    if (otherTextInput) {
        otherTextInput.value = '';
    }
}

// Заглушка для последней записи (вне Google Apps Script)
let lastEntry = {
    tablets: [],
    food: [],
    mealCount: '0',
    appetite: 'Хороший',
    stoolCount: 'Один',
    stoolConsistency: 'Камушки',
    nausea: '',
    vomiting: '',
    stress: 'Нет',
    leakage: 'Нет',
    condition: 'Активный'
};

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
        } else if (isOtherCheckbox && tablets.some(t => !standardTablets.includes(t) && t !== 'Другое' && t)) {
            checkbox.checked = true;
            otherTabletValue = tablets.find(t => !standardTablets.includes(t) && t !== 'Другое' && t) || '';
        }
    });
    document.getElementById('tabletsOtherText').value = otherTabletValue;
    document.getElementById('tabletsOtherInput').classList.toggle('active', document.getElementById('tabletsOther').checked);

    const food = entry.food || [];
    document.querySelectorAll('.checkbox-input[name="food"]').forEach(checkbox => {
        checkbox.checked = food.includes(checkbox.value);
    });

    document.getElementById('mealCount').value = entry.mealCount || '0';
    document.getElementById('appetite').value = entry.appetite || 'Хороший';
    document.getElementById('stoolCount').value = entry.stoolCount || 'Один';
    document.getElementById('stoolConsistency').value = entry.stoolConsistency || 'Камушки';
    document.getElementById('nausea').value = entry.nausea || '';
    document.getElementById('vomiting').value = entry.vomiting || '';
    document.getElementById('stress').value = entry.stress || 'Нет';
    document.getElementById('leakage').value = entry.leakage || 'Нет';
    document.getElementById('condition').value = entry.condition || 'Активный';

    const nauseaSection = document.getElementById('nausea-section');
    if (entry.nausea || entry.vomiting) {
        nauseaSection.classList.add('active');
    } else {
        nauseaSection.classList.remove('active');
    }
}

// Инициализация формы при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    setDefaultDate();
    populateForm(lastEntry);

    const otherCheckbox = document.getElementById('tabletsOther');
    if (otherCheckbox) {
        otherCheckbox.addEventListener('change', function() {
            const otherInputSection = document.getElementById('tabletsOtherInput');
            const otherTextInput = document.getElementById('tabletsOtherText');
            otherInputSection.classList.toggle('active', this.checked);
            if (!this.checked) {
                otherTextInput.value = '';
            }
        });
    }

    const resetButton = document.querySelector('.btn-secondary');
    if (resetButton) {
        resetButton.addEventListener('click', () => {
            document.getElementById('diaryForm').reset();
            setupDefaultState();
        });
    }
});

// Показать/скрыть секцию симптомов
function toggleSymptoms() {
    document.getElementById('nausea-section').classList.toggle('active');
}

// Обработка отправки формы
function handleSubmit(event) {
    event.preventDefault();

    const tabletsCheckboxes = document.querySelectorAll('.checkbox-input[name="tablets"]:checked');
    const tablets = Array.from(tabletsCheckboxes).map(cb => {
        if (cb.id === 'tabletsOther') {
            const otherText = document.getElementById('tabletsOtherText').value.trim();
            return otherText ? otherText : null;
        }
        return cb.value;
    }).filter(value => value !== null);

    const foodCheckboxes = document.querySelectorAll('.checkbox-input[name="food"]:checked');
    const food = Array.from(foodCheckboxes).map(cb => cb.value);

    const formData = {
        date: document.getElementById('date').value,
        tablets: tablets.length > 0 ? tablets : [],
        food: food.length > 0 ? food : [],
        mealCount: document.getElementById('mealCount').value || '0',
        appetite: document.getElementById('appetite').value,
        stoolCount: document.getElementById('stoolCount').value,
        stoolConsistency: document.getElementById('stoolConsistency').value,
        nausea: document.getElementById('nausea').value.trim(),
        vomiting: document.getElementById('vomiting').value.trim(),
        stress: document.getElementById('stress').value,
        leakage: document.getElementById('leakage').value,
        condition: document.getElementById('condition').value
    };

    if (!formData.date) {
        alert('Укажите дату!');
        document.getElementById('date').focus();
        return;
    }

    console.log("Данные формы:", formData);
    alert('Данные выведены в консоль, так как сохранение не поддерживается вне Google Apps Script.');
    document.getElementById('diaryForm').reset();
    setupDefaultState();
}
