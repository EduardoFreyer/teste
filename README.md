# Maria Paparico Backend

Back-end em **NestJS + Prisma + MySQL** com baseline de segurança para e-commerce de papelaria personalizada.

## Requisitos
- Node.js 22+
- Docker + Docker Compose

## Setup local
1. Copie variáveis de ambiente:
   ```bash
   cp .env.example .env
   ```
2. Suba o MySQL local:
   ```bash
   docker compose up -d mysql
   ```
3. Instale dependências:
   ```bash
   npm install
   ```
4. Gere o client Prisma e rode migrations:
   ```bash
   npm run prisma:generate
   npm run prisma:migrate -- --name init
   ```
5. Rode a API:
   ```bash
   npm run start:dev
   ```

## Endpoints iniciais
- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`

## Endpoints vitrine (público)
- `GET /api/store/categories`
- `GET /api/store/products`
- `GET /api/store/products/:id`

## Endpoints checkout/minha-conta (JWT)
- `GET /api/account/addresses`
- `POST /api/account/addresses`
- `PATCH /api/account/addresses/:id`
- `DELETE /api/account/addresses/:id`
- `PATCH /api/account/addresses/:id/default`
- `GET /api/account/orders`
- `GET /api/account/orders/:id`
- `POST /api/checkout/orders`

## Endpoints admin (catálogo)
- `POST /api/admin/categories`
- `GET /api/admin/categories`
- `PATCH /api/admin/categories/:id`
- `POST /api/admin/products`
- `GET /api/admin/products`
- `GET /api/admin/products/:id`
- `PATCH /api/admin/products/:id`
- `PATCH /api/admin/products/:id/status`
- `POST /api/admin/products/:id/options`
- `PATCH /api/admin/products/:id/options/:optionId`
- `DELETE /api/admin/products/:id/options/:optionId`
- `POST /api/admin/products/:id/images`
- `PATCH /api/admin/products/:id/images/:imageId`
- `DELETE /api/admin/products/:id/images/:imageId`

## Segurança implementada na base
- Helmet
- CORS restrito
- Rate limiting global (Nest Throttler)
- Hash de senha com Argon2id
- JWT access token curto + refresh token rotativo
- Refresh token em cookie HttpOnly
- Validação de payload com Zod
- Auditoria básica de login
