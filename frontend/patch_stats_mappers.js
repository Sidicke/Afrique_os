const fs = require('fs');

// 1. Fix types in src/types/dashboard.ts
let typesContent = fs.readFileSync('src/types/dashboard.ts', 'utf8');
if (!typesContent.includes('requiresBusiness?: boolean;')) {
    typesContent = typesContent.replace('customerSegments: CustomerSegmentBreakdown;', 'customerSegments: CustomerSegmentBreakdown;\n  requiresBusiness?: boolean;');
}
fs.writeFileSync('src/types/dashboard.ts', typesContent);

// 2. Fix mapping in src/lib/api/mappers.ts
let mappersContent = fs.readFileSync('src/lib/api/mappers.ts', 'utf8');
const oldToStats = `export function toStats(api: ApiStats, products: ProductItem[]): StatsData {
  return {
    kpis: api.kpis as StatsData["kpis"],
    // Garde défensive : même règle que toOverview
    revenueChart: (api.revenueChart ?? []).map((p) => ({
      date: shortDate(p.date),
      currentPeriodFcfa: p.currentPeriodFcfa,
      previousPeriodFcfa: p.previousPeriodFcfa,
    })),
    repeatCustomerRate: api.repeatCustomerRate,
    customerSegments: api.customerSegments,
    activeDays: (api.activeDays ?? []).map((d) => ({
      day: d.day as StatsData["activeDays"][number]["day"],
      ordersCount: d.ordersCount,
      isPeakDay: d.isPeakDay,
    })),
    bestSellers: (products ?? []).slice(0, 5),
  };
}`;

const newToStats = `export function toStats(api: any, products: ProductItem[]): StatsData {
  return {
    kpis: api.kpis,
    revenueChart: (api.chart ?? api.revenueChart ?? []).map((p: any) => ({
      date: shortDate(p.date),
      currentPeriodFcfa: p.currentPeriodFcfa,
      previousPeriodFcfa: p.previousPeriodFcfa,
    })),
    repeatCustomerRate: api.repeatCustomerRatio ?? api.repeatCustomerRate ?? 0,
    customerSegments: api.segments ?? api.customerSegments ?? { retailersPercent: 0, distributorsPercent: 0, wholesalersPercent: 0 },
    activeDays: (api.activeDays ?? []).map((d: any) => ({
      day: d.day,
      ordersCount: d.ordersCount,
      isPeakDay: d.isPeakDay,
    })),
    bestSellers: (products ?? []).slice(0, 5),
    requiresBusiness: api.requiresBusiness,
  };
}`;

mappersContent = mappersContent.replace(oldToStats, newToStats);
fs.writeFileSync('src/lib/api/mappers.ts', mappersContent);

