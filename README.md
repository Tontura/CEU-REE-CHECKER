# Checador de Relatórios de Encargos — CEUs

Aplicação para verificar automaticamente se os Relatórios de Execução de Encargos (PDF) das unidades CEU estão **atualizados** ou **desatualizados**, comparando com o histórico de meses anteriores.

## O que o sistema verifica

**Por regras automáticas (sem custo de API, 100% determinístico):**
- Se o período do relatório (ex: 15/05 a 14/06) é coerente (~30 dias)
- Se o mês de referência aparece mencionado no texto (indício para conferência visual dos gráficos de consumo de água/energia, que são imagens dentro do PDF)
- Se a limpeza do reservatório está dentro do ciclo quadrimestral (120 dias)
- Se o controle de pragas foi executado e está registrado
- Se a licença sanitária do anexo (quando o texto é legível, não escaneado) está vencida
- Se o mês de corte da regularidade fiscal/trabalhista bate com o período do relatório
- Se os anexos citados no texto realmente existem
- **Comparação com o mês anterior da mesma unidade (histórico salvo automaticamente):**
  - Fotos repetidas (hash perceptual de cada imagem do PDF)
  - Total de chamados idêntico ao mês anterior (possível indício de dado não atualizado)

**Por IA (opcional, usa a API da Anthropic):**
- Leitura do texto em busca de inconsistências mais sutis: frases que parecem não terem sido atualizadas, contradições internas, menções vagas que deveriam ser dados concretos do período.

## Limitações conhecidas (importante)

- **Páginas escaneadas (imagem, não texto)** — como a licença sanitária no Anexo I deste modelo — não têm o texto extraído automaticamente (não há OCR implementado). O sistema sinaliza como "atenção" nesses casos em vez de errar silenciosamente.
- **Gráficos de consumo de água/energia são imagens**, não dá pra confirmar com 100% de certeza qual mês está representado neles sem OCR/visão computacional — o sistema dá um indício textual e recomenda conferência visual.
- A extração de imagens para detectar fotos repetidas é "melhor esforço": depende da estrutura interna do PDF. Funcionou bem no teste com o relatório de exemplo (55 imagens extraídas), mas PDFs gerados por outros fluxos podem se comportar diferente.
- O histórico funciona por unidade (nome do CEU extraído do texto) — é importante que o nome do CEU esteja sempre escrito da mesma forma nos relatórios.

## Como rodar localmente

```bash
npm install
cp .env.example .env.local
# preencha ANTHROPIC_API_KEY se quiser usar a análise por IA
npm run dev
```

Acesse http://localhost:3000

## Como subir no GitHub e depois no Vercel

1. Crie um repositório no GitHub e suba este projeto:
   ```bash
   git init
   git add .
   git commit -m "Checador de relatórios CEU"
   git branch -M main
   git remote add origin SEU_REPOSITORIO_GIT
   git push -u origin main
   ```

2. No [Vercel](https://vercel.com), clique em **Add New Project** e importe o repositório.

3. **Configure o armazenamento do histórico (obrigatório para a comparação entre meses funcionar):**
   - No painel do projeto na Vercel, vá em **Storage** → **Create Database** → escolha **Upstash Redis** (ou acesse o **Marketplace** → categoria **Storage** → **Redis**, caso a opção mude de lugar).
   - Conecte o banco ao projeto. A Vercel preenche automaticamente as variáveis `KV_REST_API_URL` e `KV_REST_API_TOKEN` (ou `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`, ambos os nomes são aceitos pelo código).

4. **Configure a chave da IA (opcional):**
   - Em **Settings → Environment Variables**, adicione `ANTHROPIC_API_KEY` com sua chave gerada em [console.anthropic.com](https://console.anthropic.com).
   - Se não configurar, o app continua funcionando normalmente, só a checagem de IA fica desativada (mostra um aviso).

5. Clique em **Deploy**. Pronto — a cada novo relatório de uma unidade, o sistema compara automaticamente com o último salvo daquela mesma unidade.

## Estrutura do projeto

```
app/
  page.tsx              -> tela de upload e resultado
  api/analyze/route.ts  -> rota que processa o PDF
lib/
  pdfExtract.ts          -> extrai texto e dados estruturados do PDF
  pdfImages.ts           -> extrai imagens do PDF e calcula hash perceptual
  rules.ts                -> todas as regras automáticas de checagem
  claude.ts               -> chamada à API da Anthropic para checagens por IA
  historico.ts            -> salva/busca o relatório do mês anterior (Redis)
  types.ts                -> tipos compartilhados
components/
  ResultadoAnalise.tsx     -> exibição visual dos resultados
```

## Possíveis melhorias futuras

- Adicionar OCR (ex: Tesseract) para ler páginas escaneadas, como a licença sanitária
- Permitir reprocessar/corrigir manualmente um item específico
- Tela de histórico por unidade, mostrando evolução mês a mês
- Suporte a anexar e processar os 5 CEUs de uma vez (upload múltiplo)
