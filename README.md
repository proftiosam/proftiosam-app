# App de hábitos de inglês — Prof. Tio Sam

Registro diário de estudo para alunos particulares, no estilo Gym Rats.
PWA: o aluno abre um link, digita o código da turma, escolhe um apelido e está dentro.

**Domínio:** `app.proftiosam.com`
**Protótipo navegável:** [`prototipo.html`](prototipo.html) — arquivo único, sem dependências.

---

## O problema que este app resolve (e o que ele não é)

Os alunos são **particulares e não se conhecem entre si**. Isso invalida o motor
do Gym Rats original, que funciona por vergonha social entre pessoas próximas.

O motor aqui é outro, nesta ordem:

1. **Sequência** — o único vício que não depende dos outros
2. **A presença do professor** — a única validação social real que existe dentro do app
3. **Alerta de aluno sumido** — o que evita cancelamento
4. **Ideias da turma** — check-in de estranho tem zero valor social e muito valor prático
5. **Ranking** — o mais fraco, mantido de propósito, mas nunca a peça central

Toda decisão de produto abaixo sai daí.

## Regras

| Atividade | Pontos |
|---|---|
| English Class | 10 |
| Speaking | 8 |
| Do homework | 6 |
| Reading | 4 |
| Gaming | 3 |
| Podcast | 3 |
| TV & Movies | 3 |
| Music | 2 |

Os nomes ficam em inglês; o resto da interface, em português. O `id` de cada
atividade continua em português e **nunca muda** — é ele que está gravado em
cada linha de `checkins`.

- **Teto de 3 check-ins por dia.** Sem ele o aluno marca música + série + podcast
  e sobe no ranking sem estudar.
- **Pontos são congelados na linha do check-in.** Mudar o peso de uma atividade
  não reescreve o histórico.
- **Verificação por honra**, com um comentário de uma linha. O comentário é o que
  alimenta o feed — sem ele o feed fica vazio.
- **Primeira temporada: 7 dias**, meta de 5 dias com check-in, 1 protetor de sequência.
- **A sequência não quebra por o dia ainda não ter acabado.** Punir às 9h por não
  ter estudado ainda é o jeito mais rápido de perder um aluno.
- **O protetor é gasto na virada do dia e o aluno é avisado.** Descobrir que foi
  salvo é diferente de descobrir que perdeu.
- **Alerta de sumido dispara com 2 dias em temporada curta**, 3 em temporada longa.
  Em 7 dias, esperar o terceiro dia é esperar 40% da temporada.
- **O professor também marca check-in.** Aparece no feed, fica fora do ranking.

As regras vivem em [`src/lib/rules.ts`](src/lib/rules.ts), como funções puras, com
testes em [`src/lib/rules.test.ts`](src/lib/rules.test.ts). Mudança de regra começa ali.

## Stack

Next.js 15 (App Router) · Postgres no [Neon](https://neon.tech) · Drizzle · deploy na Vercel.
Tudo dentro do plano grátis nesta escala — 8 alunos não chegam perto dos limites.

```
src/
  lib/rules.ts        regras do jogo, sem I/O
  db/schema.ts        tabelas
  db/index.ts         conexão
```

## Rodando local

Precisa de Node 22+.

```bash
cp .env.example .env.local
```

Preencha. Os segredos saem daqui:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

```bash
npx web-push generate-vapid-keys
```

O `DATABASE_URL` vem do painel do Neon, na opção **Pooled connection** — a
conexão direta esgota o limite em ambiente serverless.

```bash
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Testes das regras, sem precisar de banco:

```bash
npm test
```

## Publicando

Push no GitHub, importar o repositório na Vercel, colar as variáveis de ambiente.
Cada push na branch principal vira deploy.

O domínio: em **Settings > Domains** na Vercel, adicione `app.proftiosam.com`.
A Vercel mostra o registro a criar — um `CNAME` de `app` apontando para
`cname.vercel-dns.com`, feito no painel de quem administra o DNS do
proftiosam.com. O site principal não é afetado.

### Tarefas agendadas

Estão em [`vercel.json`](vercel.json), com horário em UTC porque a Vercel não
aceita fuso:

- `05:00 UTC` (**00:05 em São Paulo**) — gasta protetor de quem merecia, antes
  de o aluno acordar e ver a sequência quebrada
- `00:00 UTC` (**21:00 em São Paulo**) — cutuca quem ainda não marcou nada

No plano grátis a Vercel garante o dia, não a hora exata — pode atrasar até uma
hora. Para o lembrete das 21h isso é aceitável; para a virada, é o motivo de
rodar 00:05 e não 23:55.

## Notificações no iPhone

Web Push no iOS só funciona se o aluno adicionar o app à tela de início.
É limitação da Apple, não tem contorno — o app mostra o passo a passo no
primeiro acesso.

## Backup

O Neon guarda histórico e permite restaurar para um ponto no tempo pelo painel.
Antes de qualquer migração de schema, vale um dump manual:

```bash
pg_dump "$DATABASE_URL" | gzip > backup-$(date +%F).sql.gz
```
