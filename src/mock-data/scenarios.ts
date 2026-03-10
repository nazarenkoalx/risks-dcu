export interface ScenarioTask {
  id: string
  title: string
  assignee: string
  dueDate: string
  status: 'pending' | 'in_progress' | 'done'
}

export interface Scenario {
  id: string
  riskId: string
  type: 'mitigate' | 'accept' | 'transfer' | 'avoid'
  title: string
  description: string
  tasks: ScenarioTask[]
}

export const scenarios: Scenario[] = [
  {
    id: 'sc1',
    riskId: 'r1',
    type: 'mitigate',
    title: 'Усунення вразливості API',
    description: 'Провести аудит безпеки API та закрити виявлені вразливості.',
    tasks: [
      { id: 't1', title: 'Провести пентест API', assignee: 'IT Security', dueDate: '2024-11-01', status: 'done' },
      { id: 't2', title: 'Оновити правила WAF', assignee: 'DevOps', dueDate: '2024-11-15', status: 'in_progress' },
      { id: 't3', title: 'Впровадити шифрування даних у спокої', assignee: 'Backend Team', dueDate: '2024-12-01', status: 'pending' },
    ],
  },
  {
    id: 'sc2',
    riskId: 'r3',
    type: 'mitigate',
    title: 'Утримання ключових спеціалістів',
    description: 'Розробити програму утримання та передачі знань для критичних IT-ролей.',
    tasks: [
      { id: 't4', title: 'Провести аналіз ринкових зарплат', assignee: 'HR', dueDate: '2024-11-20', status: 'done' },
      { id: 't5', title: 'Впровадити програму retention-бонусів', assignee: 'HR', dueDate: '2024-12-15', status: 'pending' },
    ],
  },
  {
    id: 'sc3',
    riskId: 'r2',
    type: 'mitigate',
    title: 'Підготовка до регуляторних змін',
    description: 'Проаналізувати вплив нових вимог НБУ та підготувати план відповідності.',
    tasks: [
      { id: 't6', title: 'Аналіз проєкту нових вимог НБУ', assignee: 'Compliance', dueDate: '2024-12-01', status: 'pending' },
      { id: 't7', title: 'Оцінка gap між поточним та необхідним капіталом', assignee: 'CFO Office', dueDate: '2024-12-15', status: 'pending' },
    ],
  },
]
