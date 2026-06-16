export interface AgriDashboardMeta {
  title: string;
  ward: string;
  district: string;
  city: string;
  source: string;
  updatedAt?: string;
}

export interface AgriDashboardKpis {
  htxCount: number;
  thtCount: number;
  thuyLoiStations: number;
  ocopProducts: number;
  ocopOwners: number;
  productionZones: number;
  effectiveModels: number;
  totalMembers: number;
  totalLandHa: number;
  totalRevenueMillion: number;
  totalProfitMillion: number;
  activeOrgs: number;
  irrigationAreaHa: number;
}

export interface ChartDatum {
  name: string;
  value: number;
}

export interface FinancialCompareRow {
  label: string;
  cost: number;
  revenue: number;
  profit: number;
}

export interface TopRevenueRow {
  name: string;
  value: number | null;
  type: string;
}

export interface ProductionZoneRow {
  name: string;
  sector: string;
  area: string;
  landHa: number | null;
  output: string;
  revenueMillion: number | null;
  profitMillion: number | null;
  status: string;
}

export interface OrgHighlight {
  type: string;
  name: string;
  representative: string;
  area: string;
  sector: string;
  sectorGroup: string;
  landHa: number | null;
  members: number | null;
  output: string;
  revenueMillion: number | null;
  profitMillion: number | null;
  status: string;
  note?: string;
}

export interface OcopHighlight {
  owner: string;
  product: string;
  stars: string;
  area: string;
  output: string;
  channel: string;
  revenueMillion: number | null;
}

export interface EffectiveModelHighlight {
  group: string;
  name: string;
  area: string;
  sector: string;
  landHa: number | null;
  output: string;
  revenueMillion: number | null;
  status: string;
}

export interface ForecastPoint {
  name: string;
  value: number;
  forecast?: boolean;
}

export type AlertSeverity = "high" | "medium" | "low";

export interface AgriAlert {
  id: string;
  title: string;
  area: string;
  severity: AlertSeverity;
  time: string;
}

export type FeedbackStatus = "resolved" | "processing" | "new";

export interface CitizenFeedback {
  id: string;
  title: string;
  area: string;
  status: FeedbackStatus;
  time: string;
}

export interface AgriDashboardData {
  meta: AgriDashboardMeta;
  kpis: AgriDashboardKpis;
  charts: {
    sectorDistribution: ChartDatum[];
    areaDistribution: ChartDatum[];
    bomType: ChartDatum[];
    ocopStars: ChartDatum[];
    financialCompare: FinancialCompareRow[];
    topRevenue: TopRevenueRow[];
    modelGroups: ChartDatum[];
    productionZones: ProductionZoneRow[];
  };
  highlights: {
    htx: OrgHighlight[];
    tht: OrgHighlight[];
    thuyLoi: OrgHighlight[];
    ocop: OcopHighlight[];
    effectiveModels: EffectiveModelHighlight[];
  };
}
