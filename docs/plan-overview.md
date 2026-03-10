# Risk Management SaaS — Product Plan (Revised)

## Context

Рынок ERM-программного обеспечения: $5.06 млрд (2024), рост до $7.72 млрд к 2032 (CAGR 5.4%). Основная проблема: существующие инструменты — сложные legacy Enterprise-системы с плохим UX. Mid-market компании сидят в Excel.

**Целевой сегмент**: Mid-market (200–2000 сотрудников). **Важно**: на старте нужно выбрать одну вертикаль — "all industries" это не ICP. Финансовые услуги и банки — наиболее очевидный выбор из-за регуляторного давления и бюджета на compliance. Потом расширяемся.

**Стек**: React 18+ / NestJS / PostgreSQL / Redis / BullMQ / Railway (не Kubernetes)

**Главный дифференциатор**: Коллегиальная оценка риска через голосование топ-менеджеров — это реальный UX-разрыв с рынком. НО: это гипотеза, которую нужно проверить на 10 интервью с CRO/Head of Risk до начала разработки.

---

## ⚠️ Критические выводы по реализуемости (от architecture review)

Три вещи, без которых нельзя начинать разработку:

1. **Multi-tenancy с PostgreSQL Row-Level Security — с первого дня.** Если пропустить, через 6 месяцев придётся переделывать всё. Одна забытая `WHERE organization_id = $1` — утечка данных всех клиентов.

2. **Централизованный policy engine (CASL) до первого endpoint.** Не делать `if (user.role === 'admin')` в контроллерах — это технический долг, который копируется везде.

3. **Контракт audit trail до первой мутирующей операции.** Каждый сервис должен вызывать `auditService.log(...)`. Если добавить в Sprint 3 — будут пробелы в истории.

---

## Анализ конкурентов

| Продукт | Сегмент | Болевые точки пользователей |
|---|---|---|
| **AuditBoard** | Mid→Enterprise | Дорого, фокус на аудит, не ERM-first |
| **LogicGate** | Mid-market | $30K+/год, нужен выделенный admin |
| **Hyperproof** | Mid-market | Compliance-first, слабый ERM модуль |
| **Riskonnect** | Enterprise | Только для больших, долгое внедрение |
| **MetricStream** | Enterprise | Нужна армия консультантов |
| **Excel** | All | Бесплатно, но нет контроля, нет процесса |

**Ценовой разрыв**: между Excel ($0) и LogicGate ($30K+/год) нет достойного продукта для mid-market. Это пространство для нас.

**Главные жалобы пользователей**: "слишком много кликов", "dense interface", "крутая кривая обучения", "тяжёлое внедрение", "data migration nightmare".

---

## Бизнес-процесс (ядро продукта)

### Базовый фреймворк: ISO 31000:2018 + COSO ERM 2017

```
[1. Идентификация риска]         ← Форма, шаблоны (позже)
          ↓
[2. Коллегиальная оценка]        ← ГОЛОСОВАНИЕ топ-менеджеров
     ↙              ↘
[2а. Независимые         [2б. Разработка сценария
голоса топ-менеджеров]        реагирования]
(вероятность, влияние,
скорость, комментарий)
          ↓
[3. Агрегация + утверждение]     ← Консенсусный скор → Heat Map
          ↓
[4. Активация сценария]          ← Выбор и запуск плана
          ↓
[5. Мониторинг KRI]              ← Green/Amber/Red алерты (v1.0)
          ↓
[6. Периодический пересмотр]     ← Повторное голосование если нужно
          ↓
[7. Отчётность]                  ← Операционная / Менеджмент / Совет
```

### Ключевой процесс: Коллегиальная оценка (Voting Engine)

```
Риск создан (Draft)
          ↓
Coordinator назначает участников голосования (топ-менеджеров)
  + (опционально) вес каждого участника
          ↓
Уведомление всем участникам → email + in-app
          ↓
Каждый голосующий НЕЗАВИСИМО оценивает (без видимости чужих голосов):
  - Вероятность (1-5) + обоснование
  - Влияние (составной скор 1-5 по 4 измерениям)
  - Скорость наступления (velocity, 1-5)
  - Комментарий
          ↓
[Quorum достигнут] → Агрегация:
  weighted_avg = Σ(vote.likelihood × weight) / Σ(weight)
  dispersion_flag = если stdev голосов > 1.5 → предупреждение о расхождении
          ↓
Coordinator видит результаты + разброс голосов + комментарии
  → Утверждает финальный скор (или открывает обсуждение)
          ↓
Риск → Status: "Assessed" → попадает в Heat Map
```

**Неопределённые edge cases (нужно решить до начала разработки):**
- Кворум: минимальная доля проголосовавших для закрытия сессии (например 60%)
- Таймаут: что происходит с не проголосовавшим через N дней (напоминание → эскалация → пропуск?)
- Пересмотр: может ли участник изменить голос после отправки?
- Вес: может ли coordinator назначить себе 90% и обнулить ценность голосования?

**Параллельно с голосованием**: разработка сценария реагирования

```
Risk Owner создаёт сценарий (MVP — один тип, бесплатный текст):
  - Описание реагирования
  - Превентивные действия (список задач)
  - Задачи + ответственные + дедлайны + стоимость

После утверждения оценки:
  → Активация сценария = задачи переходят в план мероприятий
  → Начинается мониторинг исполнения
```

### Матрица ролей

| Роль | Права |
|---|---|
| Admin | Настройка системы, пользователи |
| Risk Coordinator | Полный доступ, проверка, утверждение оценок |
| Risk Owner | Создание/редактирование своих рисков, разработка сценариев |
| Voter (top manager) | Только голосование + просмотр своих участий |
| Viewer | Read-only дашборд и отчёты |

---

## Feature Matrix (реалистичная)

### MVP (3 месяца, 2-3 инженера) — только это

**Ядро:**
- [ ] Мультитенантная авторизация (email/password + OIDC Google/Microsoft)
- [ ] Risk Register (CRUD, ~12 фиксированных полей, статусы через state machine)
- [ ] Voting Engine: назначение участников, весовые коэффициенты, независимые голоса, агрегация, утверждение
- [ ] Отображение разброса голосов + dispersion flag
- [ ] Heat Map 5×5 (статическая, click-to-filter, без истории)
- [ ] Сценарии реагирования (один тип, бесплатный текст + задачи)
- [ ] Планы мероприятий (задачи: owner, deadline, status)
- [ ] Email-уведомления: приглашение голосовать, reminder 48h, task overdue
- [ ] Append-only audit log (soft, Interpretation A — явно коммуницировать клиентам)
- [ ] Dashboard (статусы рисков, тепловая карта, top-5)
- [ ] CSV export (рисков + результатов голосований)
- [ ] RBAC (5 ролей) через CASL + PostgreSQL RLS для мультитенантности

**Явно НЕ в MVP (перенесено в v1.0+):**
- ✖ SAML SSO → v1.0 (только OIDC в MVP)
- ✖ CSV/Excel import → v1.0 (сложнее чем кажется: маппинг полей, валидация, частичный импорт)
- ✖ Inherent/Residual/Target отдельные оценки → v1.0 (трёхслойная модель утраивает сложность)
- ✖ Шаблоны рисков и сценариев → v1.0 (нет знаний для хороших шаблонов без обратной связи)
- ✖ Onboarding wizard → v1.1 (первые 10 клиентов онбордим вручную)
- ✖ Risk hierarchy → v1.0 (плоский список ок для MVP)
- ✖ 4T как структурированные стратегии → v1.0
- ✖ Heat Map history → v1.1
- ✖ Mobile app → Roadmap

### v1.0 (3 месяца после MVP)

- SAML SSO (multi-tenant, по-настоящему сложная штука — отдельный sprint)
- Inherent / Residual / Target трёхслойная оценка
- KRI Management: создание, пороги Green/Amber/Red, автоматические алерты, trend
- Библиотека контролей + тестирование + эффективность
- Risk Appetite Management (пороги аппетита, мониторинг нарушений)
- Workflow Engine базовый (кастомные шаги согласования)
- Управление инцидентами + линковка к рискам
- Third-party Risk (базовые анкеты + тиринг вендоров)
- Интерактивные дашборды Board / Management / Operational
- Scheduled PDF/Excel отчёты
- Jira (двусторонняя синхронизация) + Slack (уведомления)
- Webhooks + REST API
- CSV/Excel import (с UI маппинга полей + валидацией)
- Шаблоны рисков и сценариев
- Risk hierarchy

### Roadmap (Phase 3+)

- AI-ассистент для идентификации рисков (Jira, Slack, инциденты, новости)
- Automated Evidence Collection (AWS, GitHub, Okta — Vanta-модель)
- Continuous Control Monitoring
- Quantitative Risk Assessment (Monte Carlo, FAIR)
- Regulatory Mapping (ISO 27001, GDPR, SOC 2, NIST CSF, ЦБ РФ)
- ESG / Climate Risk module (TCFD)
- Trust Center
- **Mobile app (iOS/Android)** — пустая ниша, <20% ERM-инструментов имеют нативный app
- AI-narrative generation
- Multi-entity / Multi-language
- SAP / 1C / NetSuite интеграция
- SCIM provisioning

---

## Техническая архитектура

### Stack (финальный выбор, не "или/или")

- **Frontend**: React 18+, TypeScript, TanStack Query, Zustand, TailwindCSS, shadcn/ui, Heat Map = кастомный SVG (не Recharts — overkill для 5×5)
- **Backend**: **NestJS** (не FastAPI — общие TypeScript типы с frontend через monorepo = -15-20% времени на разработку)
- **ORM**: **Drizzle ORM** (лучше типы чем Prisma, нет Rust binary)
- **Migrations**: Drizzle Kit (версионированные с первого commit)
- **БД**: PostgreSQL с **Row-Level Security (мультитенантность)** + Redis
- **Queue**: BullMQ (не нужен для MVP — использовать Resend/Postmark напрямую для email)
- **Auth**: JWT + `openid-client` (OIDC) + CASL (RBAC policy engine)
- **Email**: `nodemailer` + React Email (React-компоненты для шаблонов)
- **Storage**: Cloudflare R2 (S3-совместимый, нет egress fees)
- **Infra**: **Railway для MVP** (PostgreSQL + Redis + app = один provider, нет DevOps)
- **Error tracking**: Sentry (free tier)
- **Monorepo**: Turborepo (shared types frontend/backend)

### Критические архитектурные решения (перед кодом)

**1. Multi-tenancy через PostgreSQL RLS:**
```sql
ALTER TABLE risks ENABLE ROW LEVEL SECURITY;
CREATE POLICY risks_org_isolation ON risks
  USING (organization_id = current_setting('app.current_org_id')::UUID);
-- Приложение устанавливает app.current_org_id на старте каждого запроса
```

**2. Append-only голоса (нет UPDATE/DELETE):**
```sql
CREATE TABLE votes (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES voting_sessions(id),
  user_id UUID NOT NULL REFERENCES users(id),
  likelihood SMALLINT NOT NULL CHECK (likelihood BETWEEN 1 AND 5),
  impact SMALLINT NOT NULL CHECK (impact BETWEEN 1 AND 5),
  velocity SMALLINT NOT NULL CHECK (velocity BETWEEN 1 AND 5),
  rationale TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_superseded BOOLEAN NOT NULL DEFAULT FALSE,
  superseded_by UUID REFERENCES votes(id)
  -- Нет updated_at. RLS запрещает UPDATE/DELETE для app role.
);
```

**3. State machine для статусов риска (не enum):**
```sql
CREATE TABLE risk_status_history (
  id UUID PRIMARY KEY,
  risk_id UUID REFERENCES risks(id),
  status risk_status_enum NOT NULL,
  entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  entered_by UUID REFERENCES users(id)
);
-- current status = latest row per risk_id
```

**4. Event bus для уведомлений:**
```typescript
// Не прямые вызовы sendEmail() в сервисах
await eventBus.emit('risk.vote_requested', { riskId, voterId });
await eventBus.emit('risk.approved', { riskId, approvedBy });
// NotificationService подписан на события — добавить Slack в v1.0 = 1 handler
```

**5. Конфигурируемая scoring formula в БД:**
```sql
CREATE TABLE scoring_configurations (
  organization_id UUID REFERENCES organizations(id),
  likelihood_weight NUMERIC(4,2) DEFAULT 1.0,
  impact_weight NUMERIC(4,2) DEFAULT 1.0,
  velocity_weight NUMERIC(4,2) DEFAULT 0.5, -- velocity менее важна
  effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**6. Voting Engine: защита от race conditions:**
```typescript
// PostgreSQL advisory lock на voting_session_id при агрегации
await db.execute(sql`SELECT pg_advisory_xact_lock(${sessionId})`);
// Теперь только одна транзакция считает финальный результат
```

### Модели данных

```
Organization → BusinessUnit → Risk
                                → RiskStatusHistory
                                → VotingSession
                                    → VotingParticipants (User + weight)
                                    → Votes (append-only, superseded chain)
                                    → AggregatedScore (weighted avg + dispersion)
                                → ResponseScenario
                                    → ScenarioActions (→ ActionPlan)
                                → ActionPlan → Tasks
                                → AuditLog (append-only)

ScoringConfiguration (per Organization)
RiskAppetite → RiskCategories → Thresholds (v1.0)
KRIDefinition → KRIValues → KRIBreaches (v1.0)

User → Role → CASL Permissions
     → VotingHistory
     → RiskOwnerships
```

---

## Дифференциация

### "Why Us" vs конкурентов

| Критерий | Существующие | Наш продукт |
|---|---|---|
| Time-to-value | Месяцы | Первый риск — 20 минут |
| UX | Dense, clicks-heavy | Linear/Notion-уровень простоты |
| Ценообразование | $50-200K/год enterprise | $1500-3000/мес SaaS, прозрачно |
| Легитимность оценки | Один сотрудник | Коллегиальное голосование топ-менеджеров |
| Sales process | Только звонок с sales | Прозрачный прайс + self-service trial |

### Позиционирование (правильный messaging для CRO)

**Неправильно**: "ERM с Notion-quality UX"
**Правильно**: "Система, где оценка риска — это консенсус топ-менеджеров, а не мнение одного аналитика. Ваш совет директоров будет доверять этим цифрам."

### Table Stakes — нельзя пропустить даже в MVP

Без этих функций enterprise-покупатель откажется на этапе первичного скрининга:
- Immutable audit log (никто не может удалить записи — объяснить клиентам уровень защиты)
- SSO (OIDC в MVP, SAML в v1.0)
- RBAC (минимум 5 ролей)
- Risk Heatmap (интерактивная 2D матрица)
- CSV export

---

## Поэтапный план проекта

### Phase 0: Discovery & Validation (Месяц 1-2) — КРИТИЧНО

**Задачи (до написания кода):**
- [ ] **10 глубоких интервью с CRO/Head of Risk/Head of Compliance** в mid-market компаниях (200-1000 сотрудников):
  - "Как сейчас принимается решение о скоре риска? Кто голосует?"
  - "Что самое болезненное в текущем процессе?"
  - "Готовы ли вы быть design partner (бесплатный доступ + участие в roadmap)?"
- [ ] **Найти 3-5 design partners** — компании, которые дадут время и feedback в обмен на бесплатный доступ и влияние на продукт. Без design partners → запуск вслепую.
- [ ] Анализ конкурентов (пробные версии LogicGate, LogicManager, AuditBoard)
- [ ] Прояснить edge cases голосования (кворум, таймаут, пересмотр, веса)
- [ ] UX-прототип в Figma (основные flow: создание риска, голосование, heat map)
- [ ] Пользовательское тестирование прототипа (5+ участников)
- [ ] PRD + data model + architectural decisions документ

**Deliverables**: Validated hypothesis, 3-5 design partners, Figma protototype, PRD

### Phase 1: MVP (Месяц 3-5) — 2-3 инженера, 4 спринта

**Sprint 1 (2 недели): Фундамент**
- Turborepo monorepo setup, CI/CD, Railway deployment
- PostgreSQL schema с RLS для мультитенантности
- Drizzle ORM + миграции (с первого дня)
- Auth: регистрация email/password + OIDC (Google + Microsoft) через `openid-client`
- CASL policy engine (все правила доступа централизованно)
- Organization + user management (invite by email)
- RBAC (5 ролей)

**Sprint 2 (2 недели): Risk Register + Voting Engine**
- Risk Register CRUD (12 фиксированных полей + state machine)
- Append-only audit log + event bus
- **Voting Engine**: VotingSession lifecycle, Vote submission (с PostgreSQL locking), weighted aggregation + dispersion flag
- Voting isolation (voter не видит чужие голоса до отправки)
- Coordinator approval UI

**Sprint 3 (2 недели): Визуализация + Сценарии**
- Heat Map 5×5 (кастомный SVG + click-to-filter)
- Dashboard (статусы, top-5 рисков, counts)
- Response Scenarios (один тип, free text + tasks)
- Action plan (owner, deadline, status)
- Email notifications (Resend/Postmark: invite to vote, reminder 48h, task overdue)

**Sprint 4 (2 недели): Надёжность + Запуск**
- CSV export (риски + voting results)
- Security review (multi-tenancy isolation test, auth bypass check)
- Performance testing (1000 рисков → load time < 2s)
- Bug fixes + edge cases
- Production deployment

**Criteria for MVP launch**: 3 design partner компании используют систему для реальной работы

### Phase 2: v1.0 (Месяц 6-8)

- Sprint 5: SAML SSO (отдельный спринт — это 2 недели работы само по себе)
- Sprint 6: KRI Engine (создание, пороги, history, алерты, trend charts)
- Sprint 7: Controls library + Risk Appetite Management
- Sprint 8: Workflow Engine (basic) + Incident Management
- Sprint 9: Dashboards (Board/Management) + Scheduled reports
- Sprint 10: Jira + Slack + REST API + CSV import

### Phase 3: Growth (Месяц 9+)

- Выход на рынок: Product Hunt, LinkedIn, IndieHackers
- Self-service trial + in-product tour
- AI-features (risk identification from text)
- Regulatory mapping module
- Mobile app (iOS/Android) — незаполненная ниша
- Enterprise features (SAML multi-tenant, data residency, SCIM)

---

## Реалистичный путь к доходу

**Честная картина (без дизайн-партнёров = нет выручки до месяца 8-10):**

| Месяц | Событие | MRR |
|---|---|---|
| 1-2 | Discovery + design partners | $0 |
| 3-5 | MVP разработка | $0 |
| 6 | Beta с 3-5 design partners (бесплатно) | $0 |
| 7-8 | Первые платные пилоты ($1500-2000/мес) | $3K-6K |
| 9-10 | Referrals от beta + outbound | $8K-15K |
| 11-12 | Масштабирование pipeline | $20K-30K |

**$30K MRR в 12 месяцев реально только при:**
1. Design partners найдены в месяц 1-2 и конвертируются в платных клиентов
2. ICP сужен до одной вертикали (финансы или банки)
3. Цена: $2000-3000/месяц (не $500 — тогда нужно 60 клиентов)
4. Человек на 50%+ в продажах + customer dev с месяца 1, не с месяца 6

**Без этих условий**: реалистичный MRR к 12 месяцам = $10K-15K.

---

## Узкие горлышки и как их решить

### Технические узкие места

#### 1. Race Condition в Voting Engine (КРИТИЧНО)
**Проблема**: Два участника отправляют последний голос одновременно → двойная агрегация → некорректный финальный скор.

**Решение**:
```sql
-- При агрегации: advisory lock на уровне транзакции
BEGIN;
SELECT pg_advisory_xact_lock(hashtext(voting_session_id::text));
-- Теперь только одна транзакция считает результат
UPDATE voting_sessions SET status = 'completed', aggregated_score = ... WHERE id = ...;
COMMIT;
```
Дополнительно: `UNIQUE constraint` на `(session_id, status='completed')` — база откатит дубль.

---

#### 2. Multi-Tenant Data Isolation (КРИТИЧНО)
**Проблема**: Один забытый `WHERE organization_id = $1` → утечка данных всех клиентов в один запрос.

**Решение**: Двухуровневая защита:
- **Уровень 1 (приложение)**: CASL policy — каждый запрос проходит через policy guard
- **Уровень 2 (база)**: PostgreSQL Row-Level Security — даже при пропущенном WHERE база вернёт 0 строк

```sql
-- Установить в начале каждого DB connection/transaction:
SET app.current_org_id = 'uuid-here';
-- RLS policy автоматически добавляет WHERE organization_id = current_setting(...)
```

**Тест**: попытаться сделать прямой SQL запрос без setting → убедиться что возвращается 0 строк.

---

#### 3. Voting Isolation (голосующий видит чужие оценки)
**Проблема**: Voter B видит голос Voter A до закрытия сессии → anchoring bias → теряется ценность независимой оценки.

**Решение**:
- `GET /voting-sessions/:id/votes` → возвращает только голос текущего пользователя, остальные скрыты
- `GET /voting-sessions/:id/results` → доступен только после `session.status = 'completed'`
- Aggegate scores не хранятся до закрытия сессии
- E2E тест: авторизоваться как Voter B → убедиться что API не возвращает vote Voter A

---

#### 4. Манипуляция весами голосования
**Проблема**: Coordinator назначает себе 95% веса → "коллегиальное" голосование превращается в фикцию.

**Решение**:
```sql
-- Ограничение: вес одного участника не более N% от суммы весов всей группы
-- Проверяется на уровне бизнес-логики при создании VotingSession
MAX_WEIGHT_FRACTION = 0.4 -- максимум 40% суммарного веса

-- Нормализация: веса автоматически приводятся к сумме = 1.0
normalized_weight = raw_weight / sum(all_weights)
```
В UI показывать долю каждого участника наглядно ("вы имеете 35% итогового голоса").

---

#### 5. SAML SSO Enterprise сложность
**Проблема**: SAML 2.0 — самый болезненный протокол в enterprise auth. Каждый IdP (Okta, Azure AD, кастомный) имеет свои quirks. Это минимум 2 полных спринта работы, не "bullet point в Sprint 1".

**Решение**: Полный перенос в v1.0 как отдельный спринт.
- MVP: только OIDC (Google + Microsoft) через `openid-client` — 3-4 дня
- v1.0 Sprint 5: SAML через `passport-saml` с test IdP (Keycloak в Docker)
- Мультитенантная конфигурация IdP хранится в `saml_configurations` table (entity_id, SSO_URL, X.509 cert) per organization

---

#### 6. Audit Trail Integrity
**Проблема**: "Append-only" на уровне приложения можно обойти прямым SQL запросом от admin пользователя БД.

**Решение**:
```sql
-- Отдельная DB-роль 'app_user' НЕ имеет GRANT DELETE/UPDATE на audit_logs
REVOKE UPDATE, DELETE ON audit_logs FROM app_user;
-- Только 'audit_admin' роль (не используется в коде) может читать полную историю
```
Дополнительно: ежедневный cron, который верифицирует целостность лога (количество записей не уменьшилось). В v1.0 можно добавить hash chain для криптографической неизменяемости.

---

#### 7. Cold Start Performance
**Проблема**: При большом реестре рисков (1000+ записей) запрос с агрегациями для Dashboard может быть медленным.

**Решение**:
```sql
-- Materialized View для Dashboard аггрегатов
CREATE MATERIALIZED VIEW risk_dashboard_summary AS
SELECT organization_id,
       COUNT(*) FILTER (WHERE status = 'draft') as draft_count,
       COUNT(*) FILTER (WHERE likelihood * impact >= 15) as high_risk_count,
       -- ...
FROM risks GROUP BY organization_id;

-- Обновлять при изменении рисков (через trigger или event bus)
REFRESH MATERIALIZED VIEW CONCURRENTLY risk_dashboard_summary;
```

---

### Бизнесовые узкие места

#### 8. Cold Start / Нет выручки до месяца 8
**Проблема**: Mid-market sales cycle 2-4 месяца. Без design partners = нет реальных пользователей = продукт строится вслепую.

**Решение**: Design partners — критичный приоритет Phase 0 (ДО разработки):
- Найти через LinkedIn (поиск: "Chief Risk Officer" + "500-2000 employees")
- Оффер: бесплатный доступ навсегда + участие в roadmap + public reference
- Минимум: 3 компании, которые согласятся работать с сырым продуктом
- Без design partners → откладываем разработку

#### 9. ICP слишком широкий
**Проблема**: "Всем подходит" = никому не продаётся. Impossible to do deep user research across all industries.

**Решение**: На Phase 0 выбрать и зафиксировать одну вертикаль для первых 10 клиентов.
Приоритет вертикалей:
1. **Финансовые услуги / банки** — регуляторное давление (ЦБ, Basel), большой бюджет на compliance, риск-менеджмент не опция
2. **IT-компании / SaaS** — понимают современный UX, cyber risk важен, быстрый цикл принятия решений
3. Всё остальное — после product-market fit в первой вертикали

#### 10. Конкуренты с bundled ERM
**Проблема**: AuditBoard и другие дают ERM-модуль "в нагрузку" к аудиту/compliance. Бесплатный модуль vs. наш отдельный продукт.

**Решение**: Позиционирование на методологии, а не на функционале:
- "Наш инструмент создан специально для того, чтобы оценка риска была консенсусом команды, а не мнением одного аналитика"
- Bundled ERM модули не имеют voting engine — это фундаментальное отличие, не просто UX

---

### Безопасность

#### Обязательные security controls для SaaS с чувствительными данными

**Аутентификация и сессии:**
- JWT access token: короткий lifetime (15 мин) + refresh token в httpOnly cookie (7 дней)
- OIDC: обязательная валидация `state` параметра (CSRF protection) и `nonce` (replay protection)
- Logout: invalidate refresh token в Redis (token blocklist)
- Brute force protection: rate limiting на `/auth/login` по IP + по email (express-rate-limit)

**API Security:**
- Все endpoints через глобальный AuthGuard + RoleGuard (opt-in exclusions, не opt-in inclusions)
- Строгая валидация входных данных через Zod (whitelist полей, reject unknown keys)
- Никаких raw SQL interpolations — только Drizzle query builder с parameterized queries
- Rate limiting на все API endpoints (особенно vote submission)
- CORS: whitelist конкретных origins, не `*`

**Data Protection:**
- PostgreSQL: SSL соединение в продакшне обязательно
- S3/R2: все файлы в private bucket, только signed URLs для доступа (expiry 5 минут)
- Environment variables: никаких секретов в коде/git, Railway Secrets Management
- Sensitive fields в логах: никогда не логировать пароли, JWT tokens, личные данные пользователей

**Multi-tenancy:**
- PostgreSQL RLS как описано выше (defense in depth)
- Каждый API тест должен включать cross-tenant access attempt
- Subdomain isolation для будущего (company.risktool.io) — не shared app.risktool.io/company

**Audit Trail:**
- `app_user` роль: нет GRANT на UPDATE/DELETE для `audit_logs`, `votes`
- В аудит-логе никогда не хранить чувствительные данные (токены, пароли)

**Dependency Security:**
- `npm audit` в CI/CD pipeline (блокировать при critical vulnerabilities)
- Dependabot или Renovate для автоматических обновлений
- `npm ci` вместо `npm install` в production

**Infrastructure:**
- HTTPS everywhere (Railway даёт автоматически)
- HTTP security headers: `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, `Content-Security-Policy`
- PostgreSQL: регулярные backups (Railway делает ежедневно), проверить retention policy

**Compliance для enterprise клиентов:**
- SOC 2 Type II нужно начинать готовить с первого клиента (Vanta/Drata ускоряют процесс)
- DPA (Data Processing Agreement) — обязательно перед первым enterprise контрактом
- GDPR: если есть EU клиенты — data residency, право на удаление, DPA

---

## Метрики успеха

### Product
- Time-to-first-voted-risk < 30 минут (от регистрации)
- Voting participation rate > 70% (проголосовавших из приглашённых)
- Weekly active users / Total users > 40%
- NPS > 50

### Business
- 3 design partners к концу Phase 0
- MRR к концу Phase 2 (месяц 8): $5,000+
- MRR Month 12: $20,000-30,000 (реалистично), $30,000+ (оптимистично)
- Churn < 5% monthly
- CAC payback < 12 месяцев

---

## Верификация и тестирование

### Functional Testing (сквозной сценарий)

1. Создать организацию, пригласить 5 пользователей с разными ролями
2. Risk Owner создаёт риск (Draft)
3. Coordinator назначает 3 голосующих с разными весами
4. Каждый голосующий заходит по email → видит форму → голосует независимо
5. Проверить: голосующий B не видит оценку голосующего A до отправки своей
6. После 3 голосов → система показывает распределение голосов + dispersion
7. Coordinator утверждает → риск появляется в Heat Map с consensus score
8. Проверить: score = правильная взвешенная сумма
9. Risk Owner создаёт сценарий реагирования + 3 задачи с ответственными
10. Активирует сценарий → задачи переходят в action plan
11. Проверить audit log: каждое действие зафиксировано, ничего нельзя удалить
12. CSV export: все данные выгружены корректно
13. Один пользователь пробует зайти в риск другой организации → отказ доступа

### UX Testing

1. Незнакомый риск-менеджер создаёт первый риск без инструкций < 15 минут
2. Топ-менеджер (Voter) голосует по email-ссылке < 5 минут
3. CRO видит топ-10 рисков компании < 30 секунд после логина

### Security Testing

1. PostgreSQL RLS: прямой SQL-запрос из app role без app.current_org_id = 0 строк
2. Vote isolation: API не возвращает чужие голоса до закрытия сессии
3. Voting race condition: 2 пользователя отправляют последний голос одновременно → только одна агрегация

### Performance

- Risk Register 1000 рисков загружается < 2 секунд
- Heat Map рендерится < 500ms
- Voting aggregation < 200ms

---

## Источники

- [10 Best ERM Software 2026 · Riskonnect](https://riskonnect.com/the-10-best-enterprise-risk-management-erm-software-platforms/)
- [G2 ERM Category Reviews](https://www.g2.com/categories/enterprise-risk-management-erm)
- [16 Top ERM Vendors · TechTarget](https://www.techtarget.com/searchcio/feature/Top-ERM-software-vendors-to-consider)
- [ISO 31000 Framework Guide · MetricStream](https://www.metricstream.com/learn/iso-31000-framework-guide.html)
- [G2 Grid Report ERM Winter 2024 · AuditBoard](https://go.auditboard.com/rs/961-ZQV-184/images/G2CR_GR744_AuditBoard_Grid_Report_Enterprise_Risk_Management_(ERM)_Winter_2024_V1%20(1).pdf)
- Внутренние агенты: ISO 31000:2018 / COSO ERM 2017 / NIST RMF (методологии), ERM Feature Matrix (рынок), Critical Product Review, Technical Architecture Review
