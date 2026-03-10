# ПЛАН Б — Полный продукт
## React + NestJS + Supabase (PostgreSQL + RLS)

---

## Архитектура

```
┌─────────────────────────────────────────────────────────┐
│  Frontend: React 18 + TypeScript + Vite                 │
│  (TanStack Query, Zustand, TailwindCSS, shadcn/ui)      │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP / WebSocket
┌────────────────────────▼────────────────────────────────┐
│  Backend: NestJS (Node.js + TypeScript)                 │
│  ORM: Drizzle ORM  │  Auth: JWT + openid-client         │
│  RBAC: CASL        │  Queue: BullMQ + Redis             │
│  Email: Resend     │  Files: Cloudflare R2              │
└────────────────────────┬────────────────────────────────┘
                         │ SSL
┌────────────────────────▼────────────────────────────────┐
│  Supabase (managed PostgreSQL)                          │
│  Row-Level Security │ Daily backups │ pgBouncer         │
└─────────────────────────────────────────────────────────┘
```

**Инфраструктура**: Railway (NestJS app + Redis), Supabase (PostgreSQL), Cloudflare R2 (файлы), Vercel (Frontend)

---

## Схемы таблиц Supabase

> Все таблицы используют `UUID` как PK, `TIMESTAMPTZ` для дат, `NOT NULL` везде где применимо. Supabase автоматически создаёт `auth.users` — мы расширяем через `profiles`.

---

### Таблица: `organizations`
```sql
CREATE TABLE organizations (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT        NOT NULL,
  slug         TEXT        UNIQUE NOT NULL,  -- для субдомена: acme.risktool.io
  industry     TEXT,
  size_range   TEXT,                         -- '200-500', '500-1000', '1000-2000'
  timezone     TEXT        NOT NULL DEFAULT 'UTC',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Индекс для slug-lookup
CREATE UNIQUE INDEX organizations_slug_idx ON organizations(slug);
```

---

### Таблица: `profiles`
Расширение Supabase `auth.users`. Создаётся автоматически через триггер при регистрации.
```sql
CREATE TABLE profiles (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT        NOT NULL,
  title       TEXT,                    -- "Chief Risk Officer", "VP Finance"
  avatar_url  TEXT,
  phone       TEXT,
  locale      TEXT        NOT NULL DEFAULT 'ru',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Триггер: создать profile при регистрации нового пользователя
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

---

### Таблица: `organization_members`
Связь пользователей с организациями и ролями.
```sql
CREATE TYPE member_role AS ENUM (
  'admin',        -- настройка системы, управление пользователями
  'coordinator',  -- ведение реестра, запуск голосований, утверждение
  'risk_owner',   -- создание/редактирование своих рисков, разработка сценариев
  'voter',        -- только голосование + просмотр своих участий
  'viewer'        -- read-only дашборд и отчёты
);

CREATE TABLE organization_members (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            member_role NOT NULL DEFAULT 'viewer',
  invited_by      UUID        REFERENCES auth.users(id),
  invited_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  joined_at       TIMESTAMPTZ,
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,

  UNIQUE(organization_id, user_id)
);

CREATE INDEX org_members_org_idx  ON organization_members(organization_id);
CREATE INDEX org_members_user_idx ON organization_members(user_id);
```

---

### Таблица: `business_units`
Подразделения/департаменты компании.
```sql
CREATE TABLE business_units (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  parent_id       UUID        REFERENCES business_units(id),  -- иерархия
  head_user_id    UUID        REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### Таблица: `risk_categories`
Кастомизируемая таксономия рисков организации.
```sql
CREATE TABLE risk_categories (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  description     TEXT,
  color           TEXT        NOT NULL DEFAULT '#6366f1',  -- hex-цвет для UI
  icon            TEXT,                                   -- lucide icon name
  parent_id       UUID        REFERENCES risk_categories(id),
  sort_order      SMALLINT    NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Стандартные категории добавляются через seed при создании организации:
-- Стратегический, Операционный, Финансовый, Комплаенс, Технологический/Кибер,
-- Репутационный, ESG, Проектный, Третьи стороны, Персонал
```

---

### Таблица: `risks` (центральная)
```sql
CREATE TYPE risk_status AS ENUM (
  'draft',               -- создан, не запущен
  'pending_assessment',  -- ожидает запуска голосования
  'voting_in_progress',  -- голосование активно
  'assessed',            -- оценка утверждена, выбирается сценарий
  'treatment_active',    -- активный план мероприятий выполняется
  'monitoring',          -- план выполнен, отслеживаем KRI
  'closed'               -- риск закрыт/неактуален
);

CREATE TABLE risks (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  business_unit_id UUID         REFERENCES business_units(id),
  category_id      UUID         REFERENCES risk_categories(id),

  -- Идентификация
  title            TEXT         NOT NULL,
  description      TEXT,                          -- что может произойти
  causes           TEXT,                          -- триггеры/причины
  consequences     TEXT,                          -- последствия
  risk_code        TEXT,                          -- OP-2024-001 (генерируется)

  -- Ответственность
  owner_id         UUID         REFERENCES auth.users(id),
  manager_id       UUID         REFERENCES auth.users(id),
  created_by       UUID         NOT NULL REFERENCES auth.users(id),

  -- Текущий статус
  current_status   risk_status  NOT NULL DEFAULT 'draft',

  -- Утверждённые скоры (заполняются после голосования)
  likelihood       SMALLINT     CHECK (likelihood BETWEEN 1 AND 5),
  impact           SMALLINT     CHECK (impact BETWEEN 1 AND 5),
  velocity         SMALLINT     CHECK (velocity BETWEEN 1 AND 5),
  risk_score       SMALLINT     GENERATED ALWAYS AS (
                                  COALESCE(likelihood * impact, 0)
                                ) STORED,

  -- Мониторинг
  review_frequency TEXT         NOT NULL DEFAULT 'quarterly'
                                CHECK (review_frequency IN ('monthly','quarterly','semi-annual','annual')),
  next_review_date DATE,
  last_reviewed_at TIMESTAMPTZ,

  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Индексы
CREATE INDEX risks_org_idx      ON risks(organization_id);
CREATE INDEX risks_status_idx   ON risks(organization_id, current_status);
CREATE INDEX risks_score_idx    ON risks(organization_id, risk_score DESC);
CREATE INDEX risks_owner_idx    ON risks(owner_id);
CREATE INDEX risks_review_idx   ON risks(next_review_date) WHERE current_status = 'monitoring';
```

---

### Таблица: `risk_status_history`
Иммутабельная история переходов статусов. Используется для таймлайна и аудита.
```sql
CREATE TABLE risk_status_history (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_id      UUID        NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
  from_status  risk_status,
  to_status    risk_status NOT NULL,
  changed_by   UUID        NOT NULL REFERENCES auth.users(id),
  changed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes        TEXT
);

CREATE INDEX risk_history_risk_idx ON risk_status_history(risk_id, changed_at DESC);
```

---

### Таблица: `scoring_configurations`
Настройки весов и алгоритма агрегации для каждой организации.
```sql
CREATE TABLE scoring_configurations (
  id                       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id          UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Размер матрицы
  matrix_size              SMALLINT     NOT NULL DEFAULT 5
                                        CHECK (matrix_size IN (3, 4, 5)),

  -- Веса осей при агрегации (насколько каждое измерение влияет на финальный impact)
  impact_financial_weight  NUMERIC(4,2) NOT NULL DEFAULT 1.0,
  impact_operational_weight NUMERIC(4,2) NOT NULL DEFAULT 1.0,
  impact_reputational_weight NUMERIC(4,2) NOT NULL DEFAULT 1.0,
  impact_compliance_weight NUMERIC(4,2) NOT NULL DEFAULT 1.0,

  -- Метод агрегации impact из 4 измерений
  impact_aggregation       TEXT         NOT NULL DEFAULT 'max'
                                        CHECK (impact_aggregation IN ('max', 'weighted_avg')),

  -- Макс. доля веса одного участника (защита от манипуляций)
  max_voter_weight_fraction NUMERIC(4,2) NOT NULL DEFAULT 0.40,

  -- Порог стандартного отклонения для флага разброса
  dispersion_threshold     NUMERIC(4,2) NOT NULL DEFAULT 1.50,

  created_by               UUID         REFERENCES auth.users(id),
  effective_from           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  created_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```

---

### Таблица: `voting_sessions`
Сессия коллегиальной оценки риска.
```sql
CREATE TYPE voting_session_status AS ENUM ('open', 'completed', 'cancelled');

CREATE TABLE voting_sessions (
  id                    UUID                   PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_id               UUID                   NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
  organization_id       UUID                   NOT NULL REFERENCES organizations(id),
  created_by            UUID                   NOT NULL REFERENCES auth.users(id),

  status                voting_session_status  NOT NULL DEFAULT 'open',

  -- Кворум: 100% всех приглашённых должны проголосовать
  total_participants    SMALLINT               NOT NULL DEFAULT 0,
  voted_count           SMALLINT               NOT NULL DEFAULT 0,

  -- Результаты агрегации (заполняются при закрытии)
  consensus_likelihood  NUMERIC(4,2),
  consensus_impact      NUMERIC(4,2),
  consensus_velocity    NUMERIC(4,2),
  consensus_score       NUMERIC(5,2),          -- likelihood * impact (дробный до округления)
  approved_score        SMALLINT,              -- финальный утверждённый скор (целый)

  dispersion_flag       BOOLEAN                NOT NULL DEFAULT FALSE,
  dispersion_value      NUMERIC(4,2),          -- std dev голосов по likelihood

  -- Утверждение координатором
  approved_by           UUID                   REFERENCES auth.users(id),
  approved_at           TIMESTAMPTZ,
  coordinator_notes     TEXT,

  created_at            TIMESTAMPTZ            NOT NULL DEFAULT NOW(),
  closed_at             TIMESTAMPTZ,

  -- Не может быть две открытые сессии для одного риска
  CONSTRAINT one_open_session_per_risk
    EXCLUDE USING btree (risk_id WITH =)
    WHERE (status = 'open')
);

CREATE INDEX voting_sessions_risk_idx    ON voting_sessions(risk_id);
CREATE INDEX voting_sessions_status_idx  ON voting_sessions(organization_id, status);
```

---

### Таблица: `voting_participants`
Участники голосования с весами.
```sql
CREATE TABLE voting_participants (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id          UUID         NOT NULL REFERENCES voting_sessions(id) ON DELETE CASCADE,
  user_id             UUID         NOT NULL REFERENCES auth.users(id),

  -- Вес, назначенный координатором (1-10, например)
  weight              NUMERIC(4,2) NOT NULL DEFAULT 1.0 CHECK (weight > 0 AND weight <= 10),
  -- Нормализованный вес (0..1), вычисляется после закрытия назначений
  normalized_weight   NUMERIC(6,4),

  invited_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  notified_at         TIMESTAMPTZ,             -- когда отправлено email-приглашение
  reminder_sent_at    TIMESTAMPTZ,

  UNIQUE(session_id, user_id)
);

CREATE INDEX voting_participants_session_idx ON voting_participants(session_id);
CREATE INDEX voting_participants_user_idx    ON voting_participants(user_id);
```

---

### Таблица: `votes` (append-only, иммутабельная)
```sql
CREATE TABLE votes (
  id                   UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id           UUID      NOT NULL REFERENCES voting_sessions(id),
  participant_id       UUID      NOT NULL REFERENCES voting_participants(id),
  user_id              UUID      NOT NULL REFERENCES auth.users(id),

  -- Оценки (1-5 по каждой оси)
  likelihood           SMALLINT  NOT NULL CHECK (likelihood BETWEEN 1 AND 5),
  impact_financial     SMALLINT  NOT NULL CHECK (impact_financial BETWEEN 1 AND 5),
  impact_operational   SMALLINT  NOT NULL CHECK (impact_operational BETWEEN 1 AND 5),
  impact_reputational  SMALLINT  NOT NULL CHECK (impact_reputational BETWEEN 1 AND 5),
  impact_compliance    SMALLINT  NOT NULL CHECK (impact_compliance BETWEEN 1 AND 5),
  -- Агрегированный impact (max из 4 измерений) — вычисляемый
  impact_composite     SMALLINT  GENERATED ALWAYS AS (
    GREATEST(impact_financial, impact_operational, impact_reputational, impact_compliance)
  ) STORED,
  velocity             SMALLINT  NOT NULL CHECK (velocity BETWEEN 1 AND 5),
  rationale            TEXT,                   -- обоснование оценки

  submitted_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Пересмотр голоса (append-only цепочка)
  is_superseded        BOOLEAN   NOT NULL DEFAULT FALSE,
  superseded_by        UUID      REFERENCES votes(id),

  -- Один активный голос на участника на сессию
  UNIQUE(session_id, participant_id) WHERE (is_superseded = FALSE)
);

-- ВАЖНО: Запретить UPDATE и DELETE для app role (настраивается в Supabase)
-- REVOKE UPDATE, DELETE ON votes FROM authenticated;

CREATE INDEX votes_session_idx     ON votes(session_id) WHERE is_superseded = FALSE;
CREATE INDEX votes_participant_idx ON votes(participant_id);
```

---

### Таблица: `response_scenarios`
Сценарии реагирования на риск (создаются параллельно с голосованием).
```sql
CREATE TYPE scenario_type   AS ENUM ('preventive', 'reactive', 'termination');
CREATE TYPE scenario_status AS ENUM ('draft', 'active', 'completed', 'archived');

CREATE TABLE response_scenarios (
  id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_id         UUID            NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
  organization_id UUID            NOT NULL REFERENCES organizations(id),

  type            scenario_type   NOT NULL,
  title           TEXT            NOT NULL,
  description     TEXT,
  status          scenario_status NOT NULL DEFAULT 'draft',

  -- Финансовая оценка
  estimated_cost  NUMERIC(15,2),
  currency        TEXT            NOT NULL DEFAULT 'RUB',

  -- Активация
  is_active       BOOLEAN         NOT NULL DEFAULT FALSE,
  activated_at    TIMESTAMPTZ,
  activated_by    UUID            REFERENCES auth.users(id),

  created_by      UUID            NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

  -- Только один активный сценарий на риск
  CONSTRAINT one_active_scenario_per_risk
    EXCLUDE USING btree (risk_id WITH =)
    WHERE (is_active = TRUE)
);

CREATE INDEX scenarios_risk_idx    ON response_scenarios(risk_id);
CREATE INDEX scenarios_active_idx  ON response_scenarios(risk_id) WHERE is_active = TRUE;
```

---

### Таблица: `tasks`
Мероприятия плана реагирования. Привязаны к сценарию или напрямую к риску.
```sql
CREATE TYPE task_status   AS ENUM ('todo', 'in_progress', 'done', 'cancelled');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TABLE tasks (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID          NOT NULL REFERENCES organizations(id),
  scenario_id     UUID          REFERENCES response_scenarios(id) ON DELETE SET NULL,
  risk_id         UUID          REFERENCES risks(id) ON DELETE CASCADE,

  title           TEXT          NOT NULL,
  description     TEXT,
  assignee_id     UUID          REFERENCES auth.users(id),
  due_date        DATE,
  priority        task_priority NOT NULL DEFAULT 'medium',
  status          task_status   NOT NULL DEFAULT 'todo',

  estimated_cost  NUMERIC(15,2),
  actual_cost     NUMERIC(15,2),

  completed_at    TIMESTAMPTZ,
  created_by      UUID          NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX tasks_scenario_idx  ON tasks(scenario_id);
CREATE INDEX tasks_risk_idx      ON tasks(risk_id);
CREATE INDEX tasks_assignee_idx  ON tasks(assignee_id);
CREATE INDEX tasks_due_idx       ON tasks(due_date) WHERE status NOT IN ('done', 'cancelled');
```

---

### Таблица: `audit_logs` (append-only, иммутабельная)
```sql
CREATE TABLE audit_logs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES organizations(id),
  user_id         UUID        REFERENCES auth.users(id),

  -- Тип события
  action          TEXT        NOT NULL,
  -- Примеры: 'risk.created', 'risk.status_changed', 'vote.submitted',
  --          'session.approved', 'scenario.activated', 'task.status_changed'

  entity_type     TEXT        NOT NULL,   -- 'risk', 'voting_session', 'vote', 'task'
  entity_id       UUID,

  old_values      JSONB,                  -- значения ДО изменения
  new_values      JSONB,                  -- значения ПОСЛЕ изменения

  -- Контекст запроса
  ip_address      INET,
  user_agent      TEXT,
  metadata        JSONB,                  -- доп. данные (session_id при голосовании и т.д.)

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- НЕТ updated_at — таблица append-only
);

-- ВАЖНО: Запретить UPDATE и DELETE
-- REVOKE UPDATE, DELETE ON audit_logs FROM authenticated;

CREATE INDEX audit_logs_org_idx    ON audit_logs(organization_id, created_at DESC);
CREATE INDEX audit_logs_entity_idx ON audit_logs(entity_type, entity_id, created_at DESC);
CREATE INDEX audit_logs_user_idx   ON audit_logs(user_id, created_at DESC);
```

---

### v1.0 таблицы (после MVP)

#### `kri_definitions` — определения ключевых индикаторов риска
```sql
CREATE TABLE kri_definitions (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID        NOT NULL REFERENCES organizations(id),
  risk_id           UUID        REFERENCES risks(id) ON DELETE SET NULL,
  name              TEXT        NOT NULL,
  description       TEXT,
  unit              TEXT,                   -- '%', 'шт', 'дней', 'руб'
  frequency         TEXT        NOT NULL DEFAULT 'monthly',
  threshold_green   NUMERIC(15,4),          -- ниже = зелёный
  threshold_amber   NUMERIC(15,4),          -- ниже = жёлтый
  -- выше threshold_amber = красный
  owner_id          UUID        REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### `kri_values` — значения KRI во времени
```sql
CREATE TABLE kri_values (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  kri_id     UUID        NOT NULL REFERENCES kri_definitions(id) ON DELETE CASCADE,
  value      NUMERIC(15,4) NOT NULL,
  status     TEXT        NOT NULL CHECK (status IN ('green', 'amber', 'red')),
  recorded_at TIMESTAMPTZ NOT NULL,
  recorded_by UUID       REFERENCES auth.users(id),
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX kri_values_kri_idx ON kri_values(kri_id, recorded_at DESC);
```

#### `controls` — библиотека контролей
```sql
CREATE TYPE control_type AS ENUM ('preventive', 'detective', 'corrective', 'directive');
CREATE TYPE control_effectiveness AS ENUM ('high', 'medium', 'low', 'not_tested');

CREATE TABLE controls (
  id                  UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID                 NOT NULL REFERENCES organizations(id),
  risk_id             UUID                 REFERENCES risks(id),
  name                TEXT                 NOT NULL,
  description         TEXT,
  type                control_type         NOT NULL,
  owner_id            UUID                 REFERENCES auth.users(id),
  effectiveness       control_effectiveness NOT NULL DEFAULT 'not_tested',
  last_tested_at      DATE,
  next_test_date      DATE,
  created_at          TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ          NOT NULL DEFAULT NOW()
);
```

#### `incidents` — инциденты, связанные с рисками
```sql
CREATE TABLE incidents (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES organizations(id),
  risk_id         UUID        REFERENCES risks(id),
  title           TEXT        NOT NULL,
  description     TEXT,
  severity        TEXT        NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  status          TEXT        NOT NULL DEFAULT 'open'
                              CHECK (status IN ('open','investigating','resolved','closed')),
  financial_impact NUMERIC(15,2),
  root_cause      TEXT,
  lessons_learned TEXT,
  occurred_at     TIMESTAMPTZ,
  resolved_at     TIMESTAMPTZ,
  reported_by     UUID        REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## Row-Level Security (RLS) — политики изоляции

### Включение RLS
```sql
-- Включить для всех таблиц
ALTER TABLE organizations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members   ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_units         ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_categories        ENABLE ROW LEVEL SECURITY;
ALTER TABLE risks                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_status_history    ENABLE ROW LEVEL SECURITY;
ALTER TABLE voting_sessions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE voting_participants    ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE response_scenarios     ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs             ENABLE ROW LEVEL SECURITY;
```

### Вспомогательная функция: получить org пользователя
```sql
-- Возвращает organization_id текущего пользователя
CREATE OR REPLACE FUNCTION get_user_org()
RETURNS UUID AS $$
  SELECT organization_id
  FROM organization_members
  WHERE user_id = auth.uid()
    AND is_active = TRUE
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Проверка роли
CREATE OR REPLACE FUNCTION has_role(required_role member_role)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = auth.uid()
      AND organization_id = get_user_org()
      AND role = required_role
      AND is_active = TRUE
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Проверка одной из нескольких ролей
CREATE OR REPLACE FUNCTION has_any_role(roles member_role[])
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = auth.uid()
      AND organization_id = get_user_org()
      AND role = ANY(roles)
      AND is_active = TRUE
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

### Политики: `risks`
```sql
-- SELECT: члены организации видят все риски своей org
CREATE POLICY risks_select ON risks FOR SELECT
  USING (organization_id = get_user_org());

-- INSERT: только coordinator, admin, risk_owner
CREATE POLICY risks_insert ON risks FOR INSERT
  WITH CHECK (
    organization_id = get_user_org()
    AND has_any_role(ARRAY['admin','coordinator','risk_owner']::member_role[])
  );

-- UPDATE: coordinator/admin могут всё; risk_owner — только свои риски
CREATE POLICY risks_update ON risks FOR UPDATE
  USING (
    organization_id = get_user_org()
    AND (
      has_any_role(ARRAY['admin','coordinator']::member_role[])
      OR (has_role('risk_owner'::member_role) AND owner_id = auth.uid())
    )
  );

-- DELETE: только admin
CREATE POLICY risks_delete ON risks FOR DELETE
  USING (
    organization_id = get_user_org()
    AND has_role('admin'::member_role)
  );
```

### Политики: `votes` (голосующий видит только свой голос до закрытия)
```sql
-- SELECT: свой голос — всегда; чужие — только после закрытия сессии
CREATE POLICY votes_select ON votes FOR SELECT
  USING (
    -- Всегда вижу свой голос
    user_id = auth.uid()
    OR
    -- Чужие голоса — только если сессия завершена и я в той же org
    EXISTS (
      SELECT 1 FROM voting_sessions vs
      WHERE vs.id = votes.session_id
        AND vs.status = 'completed'
        AND vs.organization_id = get_user_org()
    )
    OR
    -- Coordinator/admin видят всё
    has_any_role(ARRAY['admin','coordinator']::member_role[])
  );

-- INSERT: только приглашённый участник, сессия должна быть открытой
CREATE POLICY votes_insert ON votes FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM voting_participants vp
      JOIN voting_sessions vs ON vs.id = vp.session_id
      WHERE vp.session_id = votes.session_id
        AND vp.user_id = auth.uid()
        AND vs.status = 'open'
    )
  );

-- UPDATE, DELETE — запрещены полностью (append-only)
CREATE POLICY votes_no_update ON votes FOR UPDATE USING (FALSE);
CREATE POLICY votes_no_delete ON votes FOR DELETE USING (FALSE);
```

### Политики: `audit_logs` (только чтение, только своя org)
```sql
CREATE POLICY audit_select ON audit_logs FOR SELECT
  USING (organization_id = get_user_org());

-- INSERT разрешён только через SECURITY DEFINER функции сервера
CREATE POLICY audit_insert ON audit_logs FOR INSERT
  WITH CHECK (organization_id = get_user_org());

-- UPDATE, DELETE — запрещены полностью
CREATE POLICY audit_no_update ON audit_logs FOR UPDATE USING (FALSE);
CREATE POLICY audit_no_delete ON audit_logs FOR DELETE USING (FALSE);
```

### Политики: `voting_sessions`
```sql
CREATE POLICY sessions_select ON voting_sessions FOR SELECT
  USING (organization_id = get_user_org());

CREATE POLICY sessions_insert ON voting_sessions FOR INSERT
  WITH CHECK (
    organization_id = get_user_org()
    AND has_any_role(ARRAY['admin','coordinator']::member_role[])
  );

CREATE POLICY sessions_update ON voting_sessions FOR UPDATE
  USING (
    organization_id = get_user_org()
    AND has_any_role(ARRAY['admin','coordinator']::member_role[])
  );
```

---

## Индексы для производительности

```sql
-- Дашборд: быстрый подсчёт рисков по статусам и скорам
CREATE INDEX risks_dashboard_idx ON risks(organization_id, current_status, risk_score DESC);

-- Heat Map: все риски с likelihood/impact
CREATE INDEX risks_heatmap_idx ON risks(organization_id, likelihood, impact)
  WHERE current_status NOT IN ('draft', 'closed');

-- Просроченные задачи
CREATE INDEX tasks_overdue_idx ON tasks(organization_id, due_date, assignee_id)
  WHERE status IN ('todo', 'in_progress') AND due_date < CURRENT_DATE;

-- KRI: последние значения
CREATE INDEX kri_values_latest_idx ON kri_values(kri_id, recorded_at DESC);

-- Полнотекстовый поиск по рискам
CREATE INDEX risks_fts_idx ON risks USING GIN (
  to_tsvector('russian', coalesce(title,'') || ' ' || coalesce(description,''))
);
```

---

## Materialized View: Dashboard Summary

Быстрые агрегаты для главной страницы. Обновляется при изменении рисков через триггер.

```sql
CREATE MATERIALIZED VIEW risk_dashboard_summary AS
SELECT
  organization_id,
  COUNT(*)                                                  AS total_risks,
  COUNT(*) FILTER (WHERE current_status = 'draft')         AS draft_count,
  COUNT(*) FILTER (WHERE current_status = 'voting_in_progress') AS voting_count,
  COUNT(*) FILTER (WHERE risk_score >= 15)                 AS critical_count,
  COUNT(*) FILTER (WHERE risk_score BETWEEN 10 AND 14)     AS high_count,
  COUNT(*) FILTER (WHERE risk_score BETWEEN 5 AND 9)       AS medium_count,
  COUNT(*) FILTER (WHERE risk_score BETWEEN 1 AND 4)       AS low_count,
  COUNT(*) FILTER (WHERE next_review_date < CURRENT_DATE
                     AND current_status = 'monitoring')    AS overdue_reviews
FROM risks
GROUP BY organization_id;

-- Уникальный индекс для REFRESH CONCURRENTLY
CREATE UNIQUE INDEX risk_dashboard_summary_org_idx
  ON risk_dashboard_summary(organization_id);

-- Функция обновления (вызывается триггером на таблице risks)
CREATE OR REPLACE FUNCTION refresh_dashboard_summary()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY risk_dashboard_summary;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER risks_refresh_dashboard
  AFTER INSERT OR UPDATE OR DELETE ON risks
  FOR EACH STATEMENT EXECUTE FUNCTION refresh_dashboard_summary();
```

---

## Функции Supabase (Database Functions)

### Агрегация голосов (вызывается из NestJS)
```sql
CREATE OR REPLACE FUNCTION aggregate_voting_session(p_session_id UUID)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Advisory lock: только одна транзакция считает результат
  PERFORM pg_advisory_xact_lock(hashtext(p_session_id::TEXT));

  -- Проверка: все ли проголосовали (100% кворум)
  IF EXISTS (
    SELECT 1 FROM voting_participants
    WHERE session_id = p_session_id
      AND NOT EXISTS (
        SELECT 1 FROM votes v
        WHERE v.session_id = p_session_id
          AND v.participant_id = voting_participants.id
          AND v.is_superseded = FALSE
      )
  ) THEN
    RAISE EXCEPTION 'Not all participants have voted (quorum: 100%%)';
  END IF;

  -- Вычислить нормализованные веса
  UPDATE voting_participants vp
  SET normalized_weight = vp.weight / total.sum_weights
  FROM (
    SELECT session_id, SUM(weight) AS sum_weights
    FROM voting_participants
    WHERE session_id = p_session_id
    GROUP BY session_id
  ) total
  WHERE vp.session_id = p_session_id;

  -- Агрегация: взвешенное среднее + dispersion
  WITH weighted_votes AS (
    SELECT
      v.likelihood,
      v.impact_composite,
      v.velocity,
      vp.normalized_weight,
      v.likelihood * vp.normalized_weight       AS w_likelihood,
      v.impact_composite * vp.normalized_weight AS w_impact,
      v.velocity * vp.normalized_weight         AS w_velocity
    FROM votes v
    JOIN voting_participants vp ON vp.id = v.participant_id
    WHERE v.session_id = p_session_id
      AND v.is_superseded = FALSE
  )
  UPDATE voting_sessions SET
    consensus_likelihood = (SELECT SUM(w_likelihood) FROM weighted_votes),
    consensus_impact     = (SELECT SUM(w_impact)     FROM weighted_votes),
    consensus_velocity   = (SELECT SUM(w_velocity)   FROM weighted_votes),
    consensus_score      = (SELECT SUM(w_likelihood) * SUM(w_impact) FROM weighted_votes),
    dispersion_value     = (SELECT STDDEV(likelihood) FROM weighted_votes),
    dispersion_flag      = (SELECT STDDEV(likelihood) > (
                              SELECT dispersion_threshold FROM scoring_configurations
                              WHERE organization_id = (
                                SELECT organization_id FROM voting_sessions WHERE id = p_session_id
                              )
                              ORDER BY effective_from DESC LIMIT 1
                            ) FROM weighted_votes),
    voted_count          = (SELECT COUNT(*) FROM weighted_votes),
    status               = 'completed',
    closed_at            = NOW()
  WHERE id = p_session_id;

  SELECT row_to_json(vs) INTO v_result
  FROM voting_sessions vs WHERE id = p_session_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Стек (полный)

### Frontend
```
React 18 + TypeScript + Vite
TanStack Query v5        — серверный стейт, кэш
Zustand                  — клиентский стейт (UI)
React Router v6          — маршрутизация
TailwindCSS + shadcn/ui  — UI компоненты
React Hook Form + Zod    — формы + валидация (shared schemas с backend)
Recharts                 — тренд-графики KRI
Custom SVG               — Heat Map 5×5
Lucide React             — иконки
```

### Backend (NestJS)
```
NestJS 10 + TypeScript   — фреймворк
Drizzle ORM              — type-safe SQL (нет Rust binary в отличие от Prisma)
Drizzle Kit              — миграции (версионированные с day 1)
CASL                     — centralized RBAC policy engine
openid-client            — OIDC (Google + Microsoft), v1.0: passport-saml
BullMQ + Redis           — очередь для notifications
Resend                   — транзакционные email
React Email              — шаблоны писем как React-компоненты
Zod                      — валидация входных данных (shared с frontend)
Helmet                   — HTTP security headers
express-rate-limit       — rate limiting
Sentry                   — error tracking
```

### Монорепо (Turborepo)
```
apps/
  web/          — React frontend
  api/          — NestJS backend
packages/
  types/        — shared TypeScript типы (Risk, Vote, User, etc.)
  validators/   — shared Zod schemas
  ui/           — shared React компоненты (опционально)
```

---

## Фазы разработки

### Phase 0: Discovery (Месяц 1-2)
- 10 интервью с CRO/Head of Risk в финансовых компаниях
- 3-5 design partners (компании с бесплатным доступом + участие в roadmap)
- Figma прототип + user testing
- PRD + финальные решения по edge cases голосования

### Phase 1: MVP (Месяц 3-5) — 2-3 инженера

| Sprint | Задачи |
|---|---|
| **Sprint 1** (2 нед.) | Turborepo + CI/CD + Railway, Supabase schema + RLS, Auth (email + OIDC), CASL, org/user management |
| **Sprint 2** (2 нед.) | Risk Register CRUD + state machine, Event bus, Append-only audit log |
| **Sprint 3** (2 нед.) | Voting Engine (session lifecycle + advisory lock + aggregation DB function), Voting UI |
| **Sprint 4** (2 нед.) | Heat Map, Response Scenarios, Action Plan, Email notifications, CSV export, Security review |

### Phase 2: v1.0 (Месяц 6-8)

| Sprint | Задачи |
|---|---|
| **Sprint 5** (2 нед.) | SAML SSO (отдельный sprint!) |
| **Sprint 6** (2 нед.) | KRI Engine (создание, пороги, auto-alerts, trend) |
| **Sprint 7** (2 нед.) | Controls library + Risk Appetite Management |
| **Sprint 8** (2 нед.) | Basic Workflow Engine + Incident Management |
| **Sprint 9** (2 нед.) | Board/Management dashboards + Scheduled PDF reports |
| **Sprint 10** (2 нед.) | Jira integration + Slack bot + REST API + CSV import |

### Phase 3: Growth (Месяц 9+)
- AI risk identification (Anthropic API)
- Automated evidence collection (AWS/GitHub/Okta connectors)
- Regulatory mapping module
- Mobile app (React Native)
- Multi-language (EN + RU)

---

## Безопасность (ключевые требования)

| Область | Требование |
|---|---|
| Auth tokens | JWT 15 мин + refresh в httpOnly cookie 7 дней |
| OIDC | Обязательная валидация `state` и `nonce` |
| Logout | Invalidate refresh token в Redis |
| Rate limiting | `/auth/*` — 10 req/min по IP; voting — 1 submit/участник/сессию |
| Input validation | Zod everywhere, reject unknown keys |
| SQL | Только Drizzle query builder, никакого string interpolation |
| Files | Private R2 bucket, signed URLs (TTL: 5 мин) |
| Votes | REVOKE UPDATE, DELETE FROM authenticated |
| Audit logs | REVOKE UPDATE, DELETE FROM authenticated |
| Multi-tenancy | PostgreSQL RLS (defense-in-depth поверх CASL) |
| Headers | Helmet: HSTS, X-Frame-Options, CSP |
| Dependencies | npm audit в CI, Dependabot |
| Compliance | SOC 2 Type II prep с первого клиента, DPA перед enterprise |
