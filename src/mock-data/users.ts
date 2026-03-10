export type UserRole = 'coordinator' | 'voter'

export interface User {
  id: string
  name: string
  role: UserRole
  title: string
  shortTitle: string
  avatar: string
  defaultSelected: boolean // whether included in voting/approval by default
}

export const users: User[] = [
  {
    id: 'u1',
    name: 'Олексій Громов',
    role: 'coordinator',
    title: 'Директор з ризиків (CRO)',
    shortTitle: 'CRO',
    avatar: 'ОГ',
    defaultSelected: false,
  },
  {
    id: 'u2',
    name: 'Марина Ковальова',
    role: 'voter',
    title: 'Генеральний директор (CEO)',
    shortTitle: 'CEO',
    avatar: 'МК',
    defaultSelected: true,
  },
  {
    id: 'u3',
    name: 'Дмитро Орлов',
    role: 'voter',
    title: 'Фінансовий директор (CFO)',
    shortTitle: 'CFO',
    avatar: 'ДО',
    defaultSelected: true,
  },
  {
    id: 'u4',
    name: 'Ірина Білик',
    role: 'voter',
    title: 'Операційний директор (COO)',
    shortTitle: 'COO',
    avatar: 'ІБ',
    defaultSelected: false,
  },
]
