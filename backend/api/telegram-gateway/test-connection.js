import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Carregar .env do root
const projectRoot = path.resolve(process.cwd(), '../../..');
dotenv.config({ path: path.join(projectRoot, '.env') });

console.log('🔍 Testando conexão Telegram API...\n');

console.log('Variáveis carregadas:');
console.log(`  TIMESCALEDB_HOST: ${process.env.TIMESCALEDB_HOST}`);
console.log(`  TIMESCALEDB_PORT: ${process.env.TIMESCALEDB_PORT}`);
console.log(`  TIMESCALEDB_USER: ${process.env.TIMESCALEDB_USER}`);
console.log(`  TIMESCALEDB_PASSWORD: ${process.env.TIMESCALEDB_PASSWORD ? '***' : 'NOT SET'}`);
console.log(`  TIMESCALEDB_DATABASE: ${process.env.TIMESCALEDB_DATABASE}`);

const config = {
  host: process.env.TIMESCALEDB_HOST || 'localhost',
  port: parseInt(process.env.TIMESCALEDB_PORT || '5432'),
  user: process.env.TIMESCALEDB_USER || 'timescale',
  password: process.env.TIMESCALEDB_PASSWORD || 'pass_timescale',
  database: process.env.TIMESCALEDB_DATABASE || 'APPS-TPCAPITAL',
};

console.log('\nConfigurando conexão:');
console.log(`  postgres://${config.user}@${config.host}:${config.port}/${config.database}`);

const client = new pg.Client(config);

try {
  console.log('\n🔌 Conectando...');
  await client.connect();
  console.log('✅ Conexão bem-sucedida!');
  
  const result = await client.query('SELECT version()');
  console.log('\n📊 Versão PostgreSQL:');
  console.log(`  ${result.rows[0].version}`);
  
  await client.end();
  console.log('\n✅ Teste completo!');
} catch (error) {
  console.error('\n❌ Erro:', error.message);
  console.error('\nDetalhes:');
  console.error(error);
  process.exit(1);
}

