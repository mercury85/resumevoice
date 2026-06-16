# ResumeVoice — Next.js

## Быстрый старт

```bash
npm install
cp .env.example .env.local
# Заполни .env.local
npm run dev
# → http://localhost:3000
```

## API маршруты

| Метод | URL | Что делает |
|-------|-----|-----------|
| POST | `/api/transcribe` | Аудио → текст (SaluteSpeech) |
| POST | `/api/resume` | Текст → резюме (GigaChat) |
| GET  | `/api/resume?userId=` | Список резюме пользователя |
| POST | `/api/upgrade` | Аудит резюме (GigaChat) |
| GET  | `/api/vacancies` | Поиск вакансий (HH.ru) |
| GET  | `/api/vacancies/areas` | Список регионов (HH.ru) |
| POST | `/api/cover-letter` | Сопроводительное письмо |
| POST | `/api/analytics` | Совпадение резюме + вакансии |
| POST | `/api/payment` | Создать платёж (UnitPay) |
| PATCH| `/api/payment` | Вебхук оплаты (UnitPay) |

## Параметры фильтра вакансий HH.ru

| Параметр | Значения |
|----------|---------|
| `text` | Поисковый запрос |
| `area` | 1=Москва, 2=СПб, 66=Екб, 4=НСК, 88=Казань |
| `salary` | Минимальная зарплата в рублях |
| `experience` | `noExperience` / `between1And3` / `between3And6` / `moreThan6` |
| `employment` | `full` / `part` / `project` / `volunteer` |
| `schedule` | `fullDay` / `shift` / `flexible` / `remote` |
| `page` | Номер страницы (с 0) |
| `perPage` | Результатов на странице (макс 100) |

## SQL для Supabase

```sql
-- Профили
create table profiles (
  id uuid primary key references auth.users(id),
  name text,
  phone text,
  plan text default 'free' check (plan in ('free','pro','premium')),
  plan_expires_at timestamptz,
  created_at timestamptz default now()
);

-- Резюме
create table resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  title text not null default 'Резюме',
  data jsonb not null default '{}'::jsonb,
  score int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Платежи
create table payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  plan text,
  amount numeric,
  unitpay_id text,
  status text check (status in ('pending','paid','error','refunded')),
  error_message text,
  paid_at timestamptz,
  created_at timestamptz default now()
);

-- Автообновление updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger resumes_updated_at before update on resumes
for each row execute function update_updated_at();

-- RLS
alter table profiles enable row level security;
alter table resumes  enable row level security;
alter table payments enable row level security;

create policy "own profile" on profiles for all using (auth.uid() = id);
create policy "own resumes" on resumes  for all using (auth.uid() = user_id);
create policy "own payments" on payments for select using (auth.uid() = user_id);
```

## Логика исправления речи

Если SaluteSpeech вернул LOW_CONFIDENCE:
1. Показываем транскрипт пользователю
2. Предлагаем: исправить текстом, записать ещё раз, уточнить детали
3. Пользователь подтверждает и идёт дальше

## Деплой

```bash
# Ubuntu 22.04 VPS (timeweb, reg.ru и т.д.)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install nodejs nginx certbot python3-certbot-nginx

npm install -g pm2
git clone ... /var/www/resumevoice && cd /var/www/resumevoice
npm install
cp .env.example .env.local  # заполни переменные
npm run build
pm2 start npm --name resumevoice -- start
pm2 save && pm2 startup

# Nginx /etc/nginx/sites-available/resumevoice:
# server { listen 80; server_name resumevoice.ru;
#   location / { proxy_pass http://localhost:3000; } }
sudo certbot --nginx -d resumevoice.ru
```
