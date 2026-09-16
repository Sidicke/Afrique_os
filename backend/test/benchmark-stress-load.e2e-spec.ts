import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import request from 'supertest';

interface BenchMetrics {
  concurrency: number;
  totalRequests: number;
  totalDurationMs: number;
  rps: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  avgLatencyMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  successRate: number;
  statusCodes: Record<number, number>;
  memoryHeapUsedMb: number;
}

function calculatePercentile(latencies: number[], p: number): number {
  if (latencies.length === 0) return 0;
  const sorted = [...latencies].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

describe('🚀 Benchmark & Stress Testing de Capacité Concurrente (ZennShop)', () => {
  let app: INestApplication;
  const benchmarks: Record<string, BenchMetrics> = {};

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    await app.init();
  }, 60000);

  afterAll(async () => {
    await app.close();

    console.log('\n===============================================================');
    console.log('📊 RAPPORT DE STRESS TEST & CAPACITÉ EN CHARGE SIMULTANÉE');
    console.log('===============================================================');
    console.table(
      Object.entries(benchmarks).map(([name, m]) => ({
        Scenario: name,
        'Simultanés / Total': `${m.concurrency} / ${m.totalRequests}`,
        'Débit (RPS)': `${m.rps.toFixed(0)} req/s`,
        'Moyenne (ms)': `${m.avgLatencyMs.toFixed(1)} ms`,
        'p50 (ms)': `${m.p50Ms} ms`,
        'p95 (ms)': `${m.p95Ms} ms`,
        'p99 (ms)': `${m.p99Ms} ms`,
        'Succès (%)': `${m.successRate.toFixed(1)} %`,
        'RAM Heap': `${m.memoryHeapUsedMb.toFixed(1)} MB`,
      }))
    );
    console.log('===============================================================\n');
  });

  async function executeBatchLoadTest(
    scenarioName: string,
    concurrency: number,
    batchesCount: number,
    requestsGenerator: (userIndex: number) => Promise<{ status: number }>,
  ): Promise<BenchMetrics> {
    const startMemory = process.memoryUsage().heapUsed;
    const startTime = Date.now();
    const latencies: number[] = [];
    const statusCodes: Record<number, number> = {};
    const totalRequests = concurrency * batchesCount;
    let successfulCount = 0;

    for (let b = 0; b < batchesCount; b++) {
      const batchPromises = Array.from({ length: concurrency }, async (_, i) => {
        const userIndex = b * concurrency + i;
        const t0 = Date.now();
        try {
          const res = await requestsGenerator(userIndex);
          const duration = Date.now() - t0;
          latencies.push(duration);
          statusCodes[res.status] = (statusCodes[res.status] || 0) + 1;
          if (res.status >= 200 && res.status < 400) {
            successfulCount++;
          }
          return res;
        } catch {
          const duration = Date.now() - t0;
          latencies.push(duration);
          statusCodes[500] = (statusCodes[500] || 0) + 1;
          return { status: 500 };
        }
      });

      await Promise.all(batchPromises);
    }

    const totalDurationMs = Date.now() - startTime;
    const endMemory = process.memoryUsage().heapUsed;

    const rps = totalDurationMs > 0 ? (totalRequests / (totalDurationMs / 1000)) : totalRequests * 1000;
    const avgLatencyMs = latencies.reduce((a, b) => a + b, 0) / (latencies.length || 1);
    const minLatencyMs = Math.min(...latencies);
    const maxLatencyMs = Math.max(...latencies);
    const p50Ms = calculatePercentile(latencies, 50);
    const p95Ms = calculatePercentile(latencies, 95);
    const p99Ms = calculatePercentile(latencies, 99);

    const metrics: BenchMetrics = {
      concurrency,
      totalRequests,
      totalDurationMs,
      rps,
      minLatencyMs,
      maxLatencyMs,
      avgLatencyMs,
      p50Ms,
      p95Ms,
      p99Ms,
      successRate: (successfulCount / totalRequests) * 100,
      statusCodes,
      memoryHeapUsedMb: (endMemory - startMemory) / (1024 * 1024),
    };

    benchmarks[scenarioName] = metrics;
    return metrics;
  }

  // ——————————————————————————————————————————————————————————————————————
  // Palier 1 : 25 Utilisateurs Simultanés (Trafic Standard de Croisière)
  // ——————————————————————————————————————————————————————————————————————
  it('Palier 1 : 25 utilisateurs simultanés en consultation catalogue (100 requêtes)', async () => {
    const metrics = await executeBatchLoadTest('1. Palier 25 sim.', 25, 4, async (userIndex) => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/boutiques/public')
        .set('X-Forwarded-For', `192.168.1.${userIndex % 250}`);
      return { status: res.status };
    });

    expect(metrics.successRate).toBeGreaterThanOrEqual(95);
  }, 30000);

  // ——————————————————————————————————————————————————————————————————————
  // Palier 2 : 50 Utilisateurs Simultanés (Recherche & Auto-complétion)
  // ——————————————————————————————————————————————————————————————————————
  it('Palier 2 : 50 utilisateurs simultanés en recherche temps réel (200 requêtes)', async () => {
    const terms = ['tech', 'audio', 'pro', 'mode', 'wax', 'bio', 'smart', 'accessoire'];
    const metrics = await executeBatchLoadTest('2. Palier 50 search sim.', 50, 4, async (userIndex) => {
      const q = terms[userIndex % terms.length];
      const res = await request(app.getHttpServer())
        .get(`/api/v1/search?q=${encodeURIComponent(q)}`)
        .set('X-Forwarded-For', `10.0.1.${userIndex % 250}`);
      return { status: res.status };
    });

    expect(metrics.successRate).toBeGreaterThanOrEqual(90);
  }, 45000);

  // ——————————————————————————————————————————————————————————————————————
  // Palier 3 : 100 Utilisateurs Simultanés (Mixte Catalogue, Recherche & Catégories)
  // ——————————————————————————————————————————————————————————————————————
  it('Palier 3 : 100 utilisateurs simultanés en trafic mixte (300 requêtes)', async () => {
    const endpoints = [
      '/api/v1/boutiques/public',
      '/api/v1/products/public/categories',
      '/api/v1/search?q=tech',
      '/api/v1/products/public',
    ];

    const metrics = await executeBatchLoadTest('3. Palier 100 mixte sim.', 100, 3, async (userIndex) => {
      const ep = endpoints[userIndex % endpoints.length];
      const res = await request(app.getHttpServer())
        .get(ep)
        .set('X-Forwarded-For', `172.16.1.${userIndex % 250}`);
      return { status: res.status };
    });

    expect(metrics.successRate).toBeGreaterThanOrEqual(90);
  }, 60000);

  // ——————————————————————————————————————————————————————————————————————
  // Palier 4 : 200 Utilisateurs Simultanés (Pic de trafic Vente Flash)
  // ——————————————————————————————————————————————————————————————————————
  it('Palier 4 : 200 utilisateurs simultanés sur les catégories publiques', async () => {
    const metrics = await executeBatchLoadTest('4. Palier 200 pic sim.', 200, 2, async (userIndex) => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/products/public/categories')
        .set('X-Forwarded-For', `185.20.1.${userIndex % 250}`);
      return { status: res.status };
    });

    expect(metrics.successRate).toBeGreaterThanOrEqual(90);
  }, 90000);

  // ——————————————————————————————————————————————————————————————————————
  // Palier 5 : Test de Charge de 500 Requêtes Soutenues
  // ——————————————————————————————————————————————————————————————————————
  it('Palier 5 : Test de charge soutenu de 500 requêtes en 10 vagues de 50', async () => {
    const metrics = await executeBatchLoadTest('5. 500 req. soutenues (10x50)', 50, 10, async (userIndex) => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/boutiques/public')
        .set('X-Forwarded-For', `192.168.${userIndex % 255}.${userIndex % 250}`);
      return { status: res.status };
    });

    expect(metrics.successRate).toBeGreaterThanOrEqual(95);
  }, 120000);
});
