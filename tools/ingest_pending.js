/**
 * 批量入库：把 reference_books 里 status=pending 的书送进 RAG 向量库。
 * 与 auth-server.js 的 /api/admin/books/ingest/:id 完全同形（同样的 body 字段），
 * 差别只是不需要 admin JWT，且按字数从少到多排、逐本报进度。
 * 用法: docker exec ai3000-backend node /tmp/ingest_pending.js <category> [maxBooks]
 */
const mysql = require('mysql2/promise');
const RAG_URL = process.env.RAG_URL || 'http://rag:8800';
const CATEGORY = process.argv[2] || 'liuyao';
const MAX = parseInt(process.argv[3] || '999', 10);

(async () => {
  const db = await mysql.createPool({
    host: process.env.MYSQL_HOST || 'mysql',
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    charset: 'utf8mb4',
  });
  const [rows] = await db.query(
    'SELECT id, title, category, content FROM reference_books WHERE category = ? AND status = ? ORDER BY CHAR_LENGTH(content) ASC LIMIT ?',
    [CATEGORY, 'pending', MAX]
  );
  console.log(`待入库 ${rows.length} 部（category=${CATEGORY}, RAM in use = ${(process.memoryUsage().heapUsed/1048576).toFixed(0)}MB）`);
  let done = 0, totalChunks = 0;
  for (const b of rows) {
    const t0 = Date.now();
    process.stdout.write(`  → [${b.id}] ${b.title} (${b.content.length} 字) ... `);
    try {
      const r = await fetch(`${RAG_URL}/api/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ book_name: b.title, category: b.category, content: b.content, chapter: '', metadata: {} }),
        signal: AbortSignal.timeout(600000),
      });
      const j = await r.json();
      if (r.ok && j.chunks_created > 0) {
        await db.query('UPDATE reference_books SET status=?, chunks_count=?, updated_at=? WHERE id=?',
          ['ingested', j.chunks_created, Date.now(), b.id]);
        totalChunks += j.chunks_created; done++;
        console.log(`OK ${j.chunks_created} chunks, ${((Date.now()-t0)/1000).toFixed(1)}s`);
      } else {
        await db.query('UPDATE reference_books SET status=?, updated_at=? WHERE id=?', ['error', Date.now(), b.id]);
        console.log(`FAIL ${JSON.stringify(j).slice(0,200)}`);
      }
    } catch (e) {
      console.log(`ERR ${e.message}`);
    }
  }
  console.log(`\n完成 ${done}/${rows.length} 部，共 ${totalChunks} chunks`);
  await db.end();
})();
