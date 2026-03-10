export type RiskStatus = 'draft' | 'voting_in_progress' | 'assessed' | 'in_treatment' | 'monitoring'

export interface Risk {
  id: string
  title: string
  category: string
  status: RiskStatus
  likelihood: number | null
  impact: number | null
  score: number | null
  description: string
  causes?: string
  consequences?: string
  owner: string
  createdAt: string
  nextReview?: string
  dispersionFlag?: boolean
}

export const risks: Risk[] = [
  {
    id: 'r1',
    title: 'Витік персональних даних клієнтів',
    category: 'Технологічний / Кібер',
    status: 'monitoring',
    likelihood: 4,
    impact: 5,
    score: 18,
    description: 'Можливий витік даних через вразливість в API платіжного шлюзу. Зачеплені дані понад 50 000 клієнтів.',
    causes: 'Застаріла версія бібліотеки авторизації. Відсутність ротації ключів API.',
    consequences: 'Штраф регулятора до 2% обороту. Репутаційна шкода. Відтік клієнтів.',
    owner: 'u1',
    createdAt: '2024-10-15',
    nextReview: '2025-04-15',
    dispersionFlag: true,
  },
  {
    id: 'r2',
    title: 'Зміна регуляторних вимог НБУ',
    category: 'Комплаєнс / Регуляторний',
    status: 'draft',
    likelihood: null,
    impact: null,
    score: null,
    description: 'НБУ планує посилити вимоги до достатності капіталу для небанківських фінансових організацій.',
    causes: 'Глобальне посилення регулювання фінансового сектору після кризи 2023 року.',
    consequences: 'Необхідність доформування резервів на суму до 500 млн грн. Обмеження кредитного портфеля.',
    owner: 'u1',
    createdAt: '2024-11-02',
  },
  {
    id: 'r3',
    title: 'Звільнення ключових IT-спеціалістів',
    category: 'Операційний / Персонал',
    status: 'in_treatment',
    likelihood: 4,
    impact: 3,
    score: 12,
    description: 'Високий попит на ринку праці створює ризик відходу ключових розробників платіжної системи.',
    owner: 'u1',
    createdAt: '2024-10-20',
    nextReview: '2025-01-20',
  },
  {
    id: 'r4',
    title: 'Збій платіжної інфраструктури',
    category: 'Операційний / Технологічний',
    status: 'assessed',
    likelihood: 2,
    impact: 5,
    score: 10,
    description: 'Можливий збій основного платіжного процесора через технічні несправності або DDoS-атаку.',
    owner: 'u1',
    createdAt: '2024-10-28',
    nextReview: '2025-01-28',
  },
  {
    id: 'r5',
    title: 'Шахрайство з боку третіх осіб',
    category: 'Фінансовий',
    status: 'monitoring',
    likelihood: 3,
    impact: 4,
    score: 12,
    description: 'Участілі випадки шахрайства з використанням скомпрометованих облікових даних клієнтів.',
    owner: 'u1',
    createdAt: '2024-09-12',
    nextReview: '2025-03-12',
  },
  {
    id: 'r6',
    title: 'Недостатній рівень кіберграмотності персоналу',
    category: 'Операційний / Персонал',
    status: 'draft',
    likelihood: null,
    impact: null,
    score: null,
    description: 'Співробітники схильні відкривати фішингові листи, що створює загрозу компрометації внутрішніх систем.',
    owner: 'u1',
    createdAt: '2024-11-05',
  },
  {
    id: 'r7',
    title: 'Концентрація ключових клієнтів',
    category: 'Стратегічний',
    status: 'assessed',
    likelihood: 2,
    impact: 3,
    score: 6,
    description: 'Три найбільших клієнти формують 60% виручки, що створює високу залежність.',
    owner: 'u1',
    createdAt: '2024-10-01',
    nextReview: '2025-04-01',
  },
]
