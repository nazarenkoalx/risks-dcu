export interface ActionPlanTask {
  id: string
  title: string
  assignee: string
  dueDate: string
  status: 'todo' | 'in_progress' | 'done'
}

export interface ActionPlanApproval {
  userId: string
  name: string
  approved: boolean
  comment?: string
  respondedAt: string
}

export type ActionPlanStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected'

export interface ActionPlan {
  id: string
  riskId: string
  title: string
  description: string
  status: ActionPlanStatus
  tasks: ActionPlanTask[]
  approvers: string[]
  approvals: ActionPlanApproval[]
  createdBy: string
  createdAt: string
  approvedAt?: string
}

// Plan for r1 (monitoring) — already approved
export const approvedPlan: ActionPlan = {
  id: 'ap1',
  riskId: 'r1',
  title: 'Усунення вразливості API та захист даних клієнтів',
  description: 'Комплекс заходів для закриття вразливості в платіжному API та захисту персональних даних понад 50 000 клієнтів.',
  status: 'approved',
  tasks: [
    { id: 'apt1', title: 'Провести пентест API', assignee: 'IT Security', dueDate: '2024-11-01', status: 'done' },
    { id: 'apt2', title: 'Оновити правила WAF', assignee: 'DevOps', dueDate: '2024-11-15', status: 'done' },
    { id: 'apt3', title: 'Впровадити шифрування даних у спокої', assignee: 'Backend Team', dueDate: '2024-12-01', status: 'in_progress' },
    { id: 'apt4', title: 'Провести навчання команди з безпеки даних', assignee: 'CRO', dueDate: '2024-12-15', status: 'todo' },
  ],
  approvers: ['u2', 'u3'],
  approvals: [
    { userId: 'u2', name: 'Марина Ковальова', approved: true, respondedAt: '2024-10-19' },
    { userId: 'u3', name: 'Дмитро Орлов', approved: true, comment: 'Бюджет на заходи погоджено.', respondedAt: '2024-10-20' },
  ],
  createdBy: 'u1',
  createdAt: '2024-10-18',
  approvedAt: '2024-10-20',
}

// Plan for r3 (in_treatment) — pending approval
export const pendingPlan: ActionPlan = {
  id: 'ap2',
  riskId: 'r3',
  title: 'Програма утримання та розвитку ключових IT-спеціалістів',
  description: 'Заходи для збереження критичних компетенцій та зниження ризику відходу ключових розробників платіжної системи.',
  status: 'pending_approval',
  tasks: [
    { id: 'apt5', title: 'Провести аналіз ринкових зарплат', assignee: 'HR', dueDate: '2024-11-20', status: 'done' },
    { id: 'apt6', title: 'Впровадити retention-бонуси для 10 ключових розробників', assignee: 'HR', dueDate: '2024-12-15', status: 'todo' },
    { id: 'apt7', title: 'Запустити програму mentorship та knowledge transfer', assignee: 'Tech Lead', dueDate: '2025-01-15', status: 'todo' },
  ],
  approvers: ['u2', 'u3'],
  approvals: [],
  createdBy: 'u1',
  createdAt: '2024-11-05',
}

export const actionPlans: ActionPlan[] = [approvedPlan, pendingPlan]
