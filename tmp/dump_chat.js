const { Client } = require('pg');

async function main() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_JYk8zPIC4BfS@ep-sweet-bonus-a87df3u3-pooler.eastus2.azure.neon.tech/neondb?sslmode=require&channel_binding=require';
  const caseId = process.argv[2];
  if (!caseId) {
    console.error('Usage: node dump_chat.js <caseId>');
    process.exit(1);
  }

  const client = new Client({ connectionString });
  await client.connect();

  const columnsRes = await client.query(
    "select column_name from information_schema.columns where table_schema = 'public' and table_name = 'chat_messages' order by ordinal_position"
  );
  console.log('Columns:', columnsRes.rows.map((row) => row.column_name));

  const res = await client.query('select * from chat_messages where case_id = $1 order by created_at asc', [caseId]);
  console.log(JSON.stringify(res.rows, null, 2));

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
