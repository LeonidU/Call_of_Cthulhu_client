// Lightweight i18n: EN / RU

const STRINGS = {
  en: {
    // App / auth
    appTitle: 'Call of Cthulhu', appSubtitle: 'Remote Play',
    investigatorName: 'Investigator Name', investigatorNamePh: 'How others see you',
    username: 'Username', usernamePh: 'Enter username',
    password: 'Password', passwordPh: 'Enter password',
    register: 'Register', enter: 'Enter', signIn: 'Sign in',
    loading: 'Consulting the stars...',
    haveAccount: 'Already have an account?', noAccount: "Don't have an account?",
    logout: 'Logout', admin: 'Admin',

    // Pending
    awaitingApproval: 'Awaiting Approval',
    pendingMsg: 'has been registered but requires administrator approval before you can access the game.',
    pendingHint: 'Contact your game master or admin to get approved.',
    checkStatus: 'Check Status', checking: 'Checking...',

    // Admin
    administration: 'Administration', userManagement: 'User management',
    pendingApproval: 'Pending Approval', noPending: 'No pending requests.',
    allUsers: 'All Users', approve: 'Approve', reject: 'Reject',
    makeAdmin: 'Make Admin', removeAdmin: 'Remove Admin',
    approved: 'APPROVED', pending: 'PENDING', you: 'you', game: 'Game',

    // Parties
    yourExpeditions: 'Your Expeditions', welcome: 'Welcome',
    noParties: 'No expeditions yet. Create a new party or join one with an invite code.',
    createNewParty: 'Create New Party', partyName: 'Party name', create: 'Create',
    joinParty: 'Join Party', inviteCode: 'Invite code', join: 'Join',
    investigator: 'investigator', investigators: 'investigators', keeper: 'KEEPER',

    // Character creation
    createInvestigator: 'Create Investigator', step: 'STEP', of: 'OF',
    identity: 'Identity', avatar: 'Avatar', clickUpload: 'Click to upload',
    characterName: 'Character Name', occupation: 'Occupation',
    age: 'Age', residence: 'Residence', birthplace: 'Birthplace',
    next: 'Next', back: 'Back',
    characteristics: 'Characteristics', rollAll: 'Roll All',
    hitPoints: 'Hit Points', magicPoints: 'Magic Points', sanity: 'Sanity', moveRate: 'Move Rate',
    skills: 'Skills', occupationPoints: 'Occupation Points', personalPoints: 'Personal Points',
    weaponsEquipment: 'Equipment & Weapons',
    weaponsHint: 'Select weapons your investigator carries. Each weapon shows its damage, skill, and type.',
    weaponsSelected: 'weapon(s) selected',
    biography: 'Biography',
    bioHint: "Flesh out your investigator's background. All fields are optional but help create a richer campaign.",
    descBackstory: 'Description & Backstory', idealsPrinciples: 'Ideals & Principles',
    significantPeople: 'Significant People', significantPlaces: 'Significant Places',
    possessions: 'Possessions & Equipment', injuriesScars: 'Injuries & Scars',
    phobias: 'Phobias & Obsessions',
    review: 'Review', reviewInvestigator: 'Review Investigator',
    trainedSkills: 'TRAINED SKILLS', noSkillsAllocated: 'No skills allocated (base values apply)',
    creating: 'Creating...',

    // Game tabs
    tabDice: 'Dice Roll', tabCharacter: 'Character', tabBattle: 'Battle',
    tabSpells: 'Spells', tabArtifacts: 'Artifacts', tabLog: 'Log',

    // Dice
    dice: 'Dice', skillForChecks: 'Skill (for skill checks)', noSkill: '— No skill —',
    roll: 'Roll', rolling: 'Casting the bones...', allSkills: 'ALL SKILLS',
    criticalSuccess: 'Critical Success', extremeSuccess: 'Extreme Success',
    hardSuccess: 'Hard Success', success: 'Success', failure: 'Failure', fumble: 'Fumble',

    // Character sheet
    luck: 'Luck', improveSkill: 'IMPROVE SKILL', selectSkill: 'Select skill...',
    improve: 'Improve', inventory: 'INVENTORY', edit: 'Edit', save: 'Save',
    saving: 'Saving...', saved: 'Saved', cancel: 'Cancel',
    inventoryPh: 'List items your investigator is carrying — cash, tools, documents, curios, ammunition, provisions...',
    inventoryEmpty: 'Empty. Click to add items...',
    weaponsHeader: 'WEAPONS & EQUIPMENT', knownSpells: 'KNOWN SPELLS',
    biographyHeader: 'BIOGRAPHY', saveInventory: 'Save Inventory',
    noInvestigators: 'No investigators in this party yet.',
    noCharacterYet: "You haven't created a character for this party.",

    // Battle / Encounter
    noEncounter: 'No active encounter.', startEncounter: 'Start Encounter',
    newEncounter: 'New Encounter', name: 'Name', type: 'Type',
    battle: 'Battle', chase: 'Chase', round: 'Round', turn: "'s turn",
    add: 'Add', nextTurn: 'Next Turn', end: 'End',
    addParticipants: 'Add Participants', playerCharacters: 'Player Characters',
    npcs: 'NPCs', addToEncounter: 'Add to Encounter',
    active: 'ACTIVE', incapacitated: 'INCAPACITATED', revive: 'Revive',
    applyDamage: 'Apply Damage', target: 'Target', damageAmount: 'Damage (positive = hurt, negative = heal)',
    description: 'Description (optional)', result: 'Result',
    assignWeapon: 'Assign Weapon', current: 'current',
    firearmAttack: 'Firearm Attack', weapon: 'Weapon', range: 'Range', shots: 'Shots',
    pointBlank: 'Point Blank', normal: 'Normal', long: 'Long', extreme: 'Extreme',
    calledShot: 'Called shot', ammo: 'Ammo', empty: 'EMPTY!', fire: 'Fire!',
    shot: 'Shot', totalDamage: 'total damage', ammoRemaining: 'Ammo remaining', close: 'Close',
    allShotsMissed: 'All shots missed.', noAmmo: 'Click! No ammunition.',
    meleeAttack: 'Melee Attack', defender: 'Defender', attackerSkill: 'Attacker Skill %',
    defenderDodge: 'Defender Dodge %', attack: 'Attack!', dodged: 'DODGED!',
    failedDodge: 'Failed to dodge', attackMisses: 'The attack misses.',
    autoDetected: 'Auto-detected from sheet', setForNpc: 'Set for NPC', noDodge: '0 = no dodge attempt',
    damage: 'damage', down: 'DOWN',

    // Chase
    chaseTrack: 'CHASE TRACK', yourTurn: 'YOUR TURN', movement: 'Movement',
    speedCheck: 'Speed Check', obstacle: 'obstacle', hazard: 'hazard', barrier: 'barrier',
    attempt: 'Attempt', regular: 'Regular', hard: 'Hard',
    locations: 'locations', pass: 'PASS', fail: 'FAIL',
    chaseRules: 'Chase Rules:',
    chaseRulesText: 'Each round, participants make a Speed Check (CON roll). Pass = +1 movement, Fail = −1 movement. The Keeper can place obstacles (fail = −1 mov), hazards (fail = −1 mov + damage), or barriers (must pass to continue).',

    // Spells
    castSpell: 'Cast Spell', spell: 'Spell', selectSpell: 'Select spell...',
    knownSpellsGroup: 'Known Spells', allSpellsGroup: 'All Spells',
    npcCaster: 'NPC Caster (optional)', channeling: 'Channeling...',
    learnNewSpell: 'LEARN NEW SPELL', learn: 'Learn', character: 'Character',
    spellGrimoire: 'SPELL GRIMOIRE', spellSucceeds: 'Spell Succeeds', spellFails: 'Spell Fails',

    // Artifacts
    noArtifacts: 'No artifacts have been revealed yet. The Keeper holds the secrets...',
    hiddenArtifacts: 'HIDDEN ARTIFACTS', revealToPlayers: 'Reveal to Players',
    addArtifact: 'Add Artifact', artifactName: 'Artifact name',
    uploadArtifact: 'Upload Artifact', allArtifacts: 'All Artifacts',
    revealed: 'REVEALED', hidden: 'HIDDEN', reveal: 'Reveal',

    // GM panel
    artifacts: 'artifacts', members: 'members', events: 'events',
    addPlayer: 'Add Player', addToParty: 'Add to Party', partyMembers: 'Party Members',
    gameTime: 'Game Time', setTime: 'Set Time', advance: 'Advance',
    setTimePh: 'Set time (e.g. March 15, 1925 — 3:00 PM)',
    minutes: 'Minutes', hours: 'Hours', days: 'Days', weeks: 'Weeks', months: 'Months',
    gmDiceRoll: 'GM Dice Roll', rollForNpc: 'Roll for NPC / Event',
    quickReference: 'Quick Reference',

    // Timer
    timer: 'Timer', sessionTimer: 'SESSION TIMER',
    timerLabel: 'Label (optional)', timerLabelPh: 'e.g. Ritual countdown',
    duration: 'Duration', start: 'Start', pause: 'Pause', resume: 'Resume',
    reset: 'Reset', clear: 'Clear', timeUp: "TIME'S UP",

    // Action log
    noActions: 'No actions recorded yet.',
    rolled: 'rolled', revealedArtifact: 'revealed artifact:',
    changed: 'changed', improved: 'improved', took: 'took', healed: 'healed',
    started: 'started', ended: 'ended encounter:', fires: 'fires', at: 'at',
    reloads: 'reloads', casts: 'casts', learnedSpell: 'learned spell',
    attacks: 'attacks', with: 'with', advancedTime: 'advanced time', setTimeTo: 'set time to',
    faces: 'faces', speedCheckLog: 'speed check',

    // Common
    language: 'Language', openingGate: 'Opening the gate...',
  },

  ru: {
    // App / auth
    appTitle: 'Зов Ктулху', appSubtitle: 'Удалённая игра',
    investigatorName: 'Имя сыщика', investigatorNamePh: 'Как вас будут видеть другие',
    username: 'Логин', usernamePh: 'Введите логин',
    password: 'Пароль', passwordPh: 'Введите пароль',
    register: 'Регистрация', enter: 'Войти', signIn: 'Войти',
    loading: 'Вопрошаем звёзды...',
    haveAccount: 'Уже есть аккаунт?', noAccount: 'Нет аккаунта?',
    logout: 'Выйти', admin: 'Админ',

    // Pending
    awaitingApproval: 'Ожидание одобрения',
    pendingMsg: 'зарегистрирован, но требует одобрения администратора для доступа к игре.',
    pendingHint: 'Свяжитесь с Хранителем или администратором для одобрения.',
    checkStatus: 'Проверить статус', checking: 'Проверка...',

    // Admin
    administration: 'Администрирование', userManagement: 'Управление пользователями',
    pendingApproval: 'Ожидают одобрения', noPending: 'Нет заявок.',
    allUsers: 'Все пользователи', approve: 'Одобрить', reject: 'Отклонить',
    makeAdmin: 'Сделать админом', removeAdmin: 'Снять админа',
    approved: 'ОДОБРЕН', pending: 'ОЖИДАЕТ', you: 'вы', game: 'Игра',

    // Parties
    yourExpeditions: 'Ваши экспедиции', welcome: 'Добро пожаловать',
    noParties: 'Пока нет экспедиций. Создайте отряд или присоединитесь по коду приглашения.',
    createNewParty: 'Создать отряд', partyName: 'Название отряда', create: 'Создать',
    joinParty: 'Присоединиться', inviteCode: 'Код приглашения', join: 'Войти',
    investigator: 'сыщик', investigators: 'сыщиков', keeper: 'ХРАНИТЕЛЬ',

    // Character creation
    createInvestigator: 'Создание сыщика', step: 'ШАГ', of: 'ИЗ',
    identity: 'Личность', avatar: 'Аватар', clickUpload: 'Нажмите для загрузки',
    characterName: 'Имя персонажа', occupation: 'Профессия',
    age: 'Возраст', residence: 'Место жительства', birthplace: 'Место рождения',
    next: 'Далее', back: 'Назад',
    characteristics: 'Характеристики', rollAll: 'Бросить всё',
    hitPoints: 'Очки здоровья', magicPoints: 'Очки магии', sanity: 'Рассудок', moveRate: 'Скорость',
    skills: 'Навыки', occupationPoints: 'Очки профессии', personalPoints: 'Личные очки',
    weaponsEquipment: 'Снаряжение и оружие',
    weaponsHint: 'Выберите оружие вашего сыщика. Для каждого указаны урон, навык и тип.',
    weaponsSelected: 'оружия выбрано',
    biography: 'Биография',
    bioHint: 'Опишите прошлое вашего сыщика. Все поля необязательны, но помогают создать насыщенную кампанию.',
    descBackstory: 'Описание и предыстория', idealsPrinciples: 'Идеалы и принципы',
    significantPeople: 'Значимые люди', significantPlaces: 'Значимые места',
    possessions: 'Имущество и снаряжение', injuriesScars: 'Раны и шрамы',
    phobias: 'Фобии и мании',
    review: 'Проверка', reviewInvestigator: 'Проверка сыщика',
    trainedSkills: 'ИЗУЧЕННЫЕ НАВЫКИ', noSkillsAllocated: 'Навыки не распределены (базовые значения)',
    creating: 'Создание...',

    // Game tabs
    tabDice: 'Бросок', tabCharacter: 'Персонаж', tabBattle: 'Бой',
    tabSpells: 'Заклинания', tabArtifacts: 'Артефакты', tabLog: 'Журнал',

    // Dice
    dice: 'Кости', skillForChecks: 'Навык (для проверок)', noSkill: '— Без навыка —',
    roll: 'Бросок', rolling: 'Бросаем кости...', allSkills: 'ВСЕ НАВЫКИ',
    criticalSuccess: 'Критический успех', extremeSuccess: 'Экстремальный успех',
    hardSuccess: 'Трудный успех', success: 'Успех', failure: 'Провал', fumble: 'Фамбл',

    // Character sheet
    luck: 'Удача', improveSkill: 'УЛУЧШИТЬ НАВЫК', selectSkill: 'Выберите навык...',
    improve: 'Улучшить', inventory: 'ИНВЕНТАРЬ', edit: 'Изменить', save: 'Сохранить',
    saving: 'Сохранение...', saved: 'Сохранено', cancel: 'Отмена',
    inventoryPh: 'Перечислите предметы: деньги, инструменты, документы, диковинки, патроны, провизия...',
    inventoryEmpty: 'Пусто. Нажмите, чтобы добавить предметы...',
    weaponsHeader: 'ОРУЖИЕ И СНАРЯЖЕНИЕ', knownSpells: 'ИЗВЕСТНЫЕ ЗАКЛИНАНИЯ',
    biographyHeader: 'БИОГРАФИЯ', saveInventory: 'Сохранить инвентарь',
    noInvestigators: 'В этом отряде пока нет сыщиков.',
    noCharacterYet: 'Вы ещё не создали персонажа для этого отряда.',

    // Battle / Encounter
    noEncounter: 'Нет активной сцены.', startEncounter: 'Начать сцену',
    newEncounter: 'Новая сцена', name: 'Название', type: 'Тип',
    battle: 'Бой', chase: 'Погоня', round: 'Раунд', turn: ' — ход',
    add: 'Добавить', nextTurn: 'След. ход', end: 'Завершить',
    addParticipants: 'Добавить участников', playerCharacters: 'Персонажи игроков',
    npcs: 'НИП', addToEncounter: 'Добавить в сцену',
    active: 'АКТИВЕН', incapacitated: 'ВЫБЫЛИ', revive: 'Оживить',
    applyDamage: 'Нанести урон', target: 'Цель', damageAmount: 'Урон (плюс = ранить, минус = лечить)',
    description: 'Описание (необязательно)', result: 'Итог',
    assignWeapon: 'Выдать оружие', current: 'текущее',
    firearmAttack: 'Стрельба', weapon: 'Оружие', range: 'Дистанция', shots: 'Выстрелы',
    pointBlank: 'В упор', normal: 'Обычная', long: 'Дальняя', extreme: 'Предельная',
    calledShot: 'Прицельный выстрел', ammo: 'Патроны', empty: 'ПУСТО!', fire: 'Огонь!',
    shot: 'Выстрел', totalDamage: 'суммарный урон', ammoRemaining: 'Осталось патронов', close: 'Закрыть',
    allShotsMissed: 'Все выстрелы мимо.', noAmmo: 'Щёлк! Патронов нет.',
    meleeAttack: 'Ближний бой', defender: 'Защитник', attackerSkill: 'Навык атакующего %',
    defenderDodge: 'Уклонение защитника %', attack: 'Атака!', dodged: 'УКЛОНИЛСЯ!',
    failedDodge: 'Не уклонился', attackMisses: 'Атака промахнулась.',
    autoDetected: 'Определено по листу', setForNpc: 'Задайте для НИП', noDodge: '0 = без уклонения',
    damage: 'урон', down: 'ПОВЕРЖЕН',

    // Chase
    chaseTrack: 'ТРЕК ПОГОНИ', yourTurn: 'ВАШ ХОД', movement: 'Движение',
    speedCheck: 'Проверка скорости', obstacle: 'препятствие', hazard: 'опасность', barrier: 'барьер',
    attempt: 'Попытка', regular: 'Обычная', hard: 'Трудная',
    locations: 'позиций', pass: 'УСПЕХ', fail: 'ПРОВАЛ',
    chaseRules: 'Правила погони:',
    chaseRulesText: 'Каждый раунд участники делают Проверку скорости (бросок ВЫН). Успех = +1 позиция, провал = −1. Хранитель может выставить препятствия (провал = −1), опасности (провал = −1 и урон) или барьеры (нужно пройти).',

    // Spells
    castSpell: 'Сотворить заклинание', spell: 'Заклинание', selectSpell: 'Выберите заклинание...',
    knownSpellsGroup: 'Известные', allSpellsGroup: 'Все заклинания',
    npcCaster: 'НИП-заклинатель (необяз.)', channeling: 'Взываем...',
    learnNewSpell: 'ИЗУЧИТЬ ЗАКЛИНАНИЕ', learn: 'Изучить', character: 'Персонаж',
    spellGrimoire: 'ГРИМУАР', spellSucceeds: 'Заклинание удалось', spellFails: 'Заклинание не удалось',

    // Artifacts
    noArtifacts: 'Артефакты ещё не раскрыты. Хранитель бережёт свои тайны...',
    hiddenArtifacts: 'СКРЫТЫЕ АРТЕФАКТЫ', revealToPlayers: 'Показать игрокам',
    addArtifact: 'Добавить артефакт', artifactName: 'Название артефакта',
    uploadArtifact: 'Загрузить артефакт', allArtifacts: 'Все артефакты',
    revealed: 'РАСКРЫТ', hidden: 'СКРЫТ', reveal: 'Показать',

    // GM panel
    artifacts: 'артефакты', members: 'участники', events: 'события',
    addPlayer: 'Добавить игрока', addToParty: 'Добавить в отряд', partyMembers: 'Участники отряда',
    gameTime: 'Игровое время', setTime: 'Задать время', advance: 'Продвинуть',
    setTimePh: 'Время (напр. 15 марта 1925, 15:00)',
    minutes: 'Минут', hours: 'Часов', days: 'Дней', weeks: 'Недель', months: 'Месяцев',
    gmDiceRoll: 'Бросок Хранителя', rollForNpc: 'Бросок за НИП / событие',
    quickReference: 'Быстрая справка',

    // Timer
    timer: 'Таймер', sessionTimer: 'ТАЙМЕР СЕССИИ',
    timerLabel: 'Метка (необязательно)', timerLabelPh: 'напр. Отсчёт ритуала',
    duration: 'Длительность', start: 'Запустить', pause: 'Пауза', resume: 'Продолжить',
    reset: 'Сброс', clear: 'Убрать', timeUp: 'ВРЕМЯ ВЫШЛО',

    // Action log
    noActions: 'Пока нет записей.',
    rolled: 'бросает', revealedArtifact: 'раскрыл артефакт:',
    changed: 'изменил', improved: 'улучшил', took: 'получает', healed: 'исцелён на',
    started: 'начал', ended: 'завершил сцену:', fires: 'стреляет из', at: 'по',
    reloads: 'перезаряжает', casts: 'творит', learnedSpell: 'изучил заклинание',
    attacks: 'атакует', with: 'используя', advancedTime: 'продвинул время', setTimeTo: 'установил время',
    faces: 'сталкивается с', speedCheckLog: 'проверка скорости',

    // Common
    language: 'Язык', openingGate: 'Открываем врата...',
  },
}

export function getLang() {
  try {
    const u = JSON.parse(localStorage.getItem('cthulhu_user') || '{}')
    if (u.language === 'ru' || u.language === 'en') return u.language
  } catch {}
  return localStorage.getItem('cthulhu_lang') || 'en'
}

export function setLang(lang) {
  localStorage.setItem('cthulhu_lang', lang)
  try {
    const u = JSON.parse(localStorage.getItem('cthulhu_user') || '{}')
    u.language = lang
    localStorage.setItem('cthulhu_user', JSON.stringify(u))
  } catch {}
}

/** Translate a key. Falls back to English, then to the key itself. */
export function t(key, lang) {
  const l = lang || getLang()
  return (STRINGS[l] && STRINGS[l][key]) || STRINGS.en[key] || key
}

/** Pick the localized name for a DB object that has name / name_ru. */
export function localName(obj, lang) {
  if (!obj) return ''
  const l = lang || getLang()
  if (l === 'ru') return obj.name_ru || obj.skill_name_ru || obj.spell_name_ru || obj.name || obj.skill_name || obj.spell_name || ''
  return obj.name || obj.skill_name || obj.spell_name || ''
}

/** Localized name from a (name, name_ru) pair. */
export function pickName(nameEn, nameRu, lang) {
  const l = lang || getLang()
  return (l === 'ru' && nameRu) ? nameRu : nameEn
}

export default { t, getLang, setLang, localName, pickName }
