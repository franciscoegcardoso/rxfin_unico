const N8N_BASE = "https://rxfin.app.n8n.cloud/api/v1";
const N8N_API_KEY = process.env.N8N_API_KEY;
const CRON_SECRET = process.env.CIBELIA_CRON_SECRET;

const headers = {
  "X-N8N-API-KEY": N8N_API_KEY,
  "Content-Type": "application/json",
};

const workflow = {
  name: "Cibélia — Alertas Diários",
  nodes: [
    {
      id: "node-schedule",
      name: "Cron Diário 8h Brasília",
      type: "n8n-nodes-base.scheduleTrigger",
      typeVersion: 1.2,
      position: [240, 300],
      parameters: {
        rule: {
          interval: [{ field: "cronExpression", expression: "0 11 * * *" }]
        }
      }
    },
    {
      id: "node-http",
      name: "Chamar Cibélia Alerts",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [460, 300],
      parameters: {
        method: "POST",
        url: "https://kneaniaifzgqibpajyji.supabase.co/functions/v1/cibelia-alerts",
        sendHeaders: true,
        headerParameters: {
          parameters: [
            { name: "Authorization", value: `Bearer ${CRON_SECRET}` }
          ]
        },
        sendBody: true,
        contentType: "json",
        jsonBody: "{}",
        options: { timeout: 30000 }
      }
    }
  ],
  connections: {
    "Cron Diário 8h Brasília": {
      main: [[{ node: "Chamar Cibélia Alerts", type: "main", index: 0 }]]
    }
  },
  settings: {
    executionOrder: "v1",
    saveManualExecutions: true,
  },
  staticData: null,
};

// 1. Verificar se já existe
console.log("🔍 Verificando workflows existentes...");
const listRes = await fetch(`${N8N_BASE}/workflows?limit=100`, { headers });
const listData = await listRes.json();
const existing = listData.data?.find(w => w.name === workflow.name);

let workflowId;

if (existing) {
  console.log(`⚠️  Workflow já existe (ID: ${existing.id}) — atualizando...`);
  const updateRes = await fetch(`${N8N_BASE}/workflows/${existing.id}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(workflow),
  });
  const updateData = await updateRes.json();
  if (!updateRes.ok) {
    console.error("❌ Erro ao atualizar:", updateData);
    process.exit(1);
  }
  workflowId = existing.id;
  console.log(`✅ Workflow atualizado: ${workflowId}`);
} else {
  console.log("➕ Criando workflow...");
  const createRes = await fetch(`${N8N_BASE}/workflows`, {
    method: "POST",
    headers,
    body: JSON.stringify(workflow),
  });
  const createData = await createRes.json();
  if (!createRes.ok) {
    console.error("❌ Erro ao criar:", JSON.stringify(createData, null, 2));
    process.exit(1);
  }
  workflowId = createData.id;
  console.log(`✅ Workflow criado com ID: ${workflowId}`);
}

// 2. Ativar
console.log("⚡ Ativando workflow...");
const activateRes = await fetch(`${N8N_BASE}/workflows/${workflowId}/activate`, {
  method: "POST",
  headers,
});
if (!activateRes.ok) {
  const errData = await activateRes.json();
  console.error("❌ Erro ao ativar:", errData);
  process.exit(1);
}
console.log("🚀 Workflow ativado com sucesso!");
console.log(`\n📋 Resumo:`);
console.log(`   Nome: Cibélia — Alertas Diários`);
console.log(`   ID: ${workflowId}`);
console.log(`   Cron: 0 11 * * * (08:00 BRT / 11:00 UTC)`);
console.log(`   URL: https://rxfin.app.n8n.cloud/workflow/${workflowId}`);
