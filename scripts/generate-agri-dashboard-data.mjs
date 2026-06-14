#!/usr/bin/env node
/**
 * Sinh data/agri-dashboard.json từ file Excel tổng hợp nông nghiệp (backend repo).
 *
 * Usage (từ gis_longbinh_web):
 *   node scripts/generate-agri-dashboard-data.mjs
 *
 * Hoặc chỉ định đường dẫn Excel:
 *   node scripts/generate-agri-dashboard-data.mjs ../gis_longbinh/BẢNG....xlsx
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const XLSX = require(path.resolve(__dirname, "../../gis_longbinh/node_modules/xlsx"));
const defaultExcel = path.resolve(
  __dirname,
  "../../gis_longbinh/BẢNG TỔNG HỢP SỐ LIỆU NÔNG NGHIỆPBảng tính không có tiêu đề.xlsx",
);
const excelPath = process.argv[2] ? path.resolve(process.argv[2]) : defaultExcel;
const outPath = path.resolve(__dirname, "../data/agri-dashboard.json");

if (!fs.existsSync(excelPath)) {
  console.error("Không tìm thấy file Excel:", excelPath);
  process.exit(1);
}

const wb = XLSX.readFile(excelPath);

function parseNum(v) {
  if (v === "" || v == null) return null;
  const s = String(v).replace(/[^0-9.,-]/g, "").replace(/,/g, "");
  const n = parseFloat(s);
  return Number.isNaN(n) ? null : n;
}

function normArea(addr) {
  return (
    String(addr || "")
      .replace(/^kv\.?\s*/i, "")
      .replace(/^kv\s*/i, "")
      .split(/[+/,]/)
      .map((p) => p.trim())
      .filter(Boolean)[0] || "Khác"
  );
}

function categorize(sector) {
  const s = String(sector || "").toLowerCase();
  if (s.includes("bơm")) return "Dịch vụ bơm tưới";
  if (
    s.includes("lúa") ||
    s.includes("mít") ||
    s.includes("dưa lưới") ||
    s.includes("trồng") ||
    s.includes("màu") ||
    s.includes("bưởi") ||
    s.includes("hấu")
  )
    return "Trồng trọt";
  if (
    s.includes("lươn") ||
    s.includes("cá") ||
    s.includes("nuôi") ||
    s.includes("baba") ||
    s.includes("ếch") ||
    s.includes("thát lát")
  )
    return "Thủy sản";
  if (
    s.includes("rượu") ||
    s.includes("kẹo") ||
    s.includes("mật") ||
    s.includes("gạo sạch") ||
    s.includes("đường") ||
    s.includes("khô") ||
    s.includes("sấy")
  )
    return "Chế biến & OCOP";
  if (s.includes("vận tải")) return "Vận tải & dịch vụ";
  if (s.includes("nông lâm") || s.includes("mua bán lúa"))
    return "Thương mại nông sản";
  return "Khác";
}

function rowsWithIndex(sheetName) {
  const matrix = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], {
    header: 1,
    defval: "",
  });
  return matrix
    .map((row, idx) => ({ row, excelRow: idx + 1 }))
    .filter(({ row }) => row && row.some((c) => c !== ""));
}

function numericRows(sheetName) {
  return rowsWithIndex(sheetName).filter(({ row }) => typeof row[0] === "number");
}

function mapOrgRow(row, type) {
  const name = String(row[1] || "").trim();
  if (!name) return null;
  return {
    type,
    name,
    representative: String(row[2] || "").trim(),
    area: normArea(row[3]),
    sector: String(row[4] || "").trim(),
    sectorGroup: categorize(row[4]),
    landHa: parseNum(row[5]),
    members: parseNum(row[7]),
    output: String(row[8] || "").trim(),
    channel: String(row[9] || "").trim(),
    costMillion: parseNum(row[10]),
    revenueMillion: parseNum(row[11]),
    profitMillion: parseNum(row[12]),
    phone: String(row[13] || "").trim(),
    status: String(row[14] || "").trim(),
    note: String(row[15] || row[16] || "").trim(),
  };
}

const htx = numericRows("HTX").map(({ row }) => mapOrgRow(row, "HTX")).filter(Boolean);
const tht = numericRows("Tổ hợp tác").map(({ row }) => mapOrgRow(row, "THT")).filter(Boolean);
const thuyLoi = numericRows("Thủy Lợi").map(({ row }) => mapOrgRow(row, "Trạm bơm")).filter(Boolean);

const ocopProducts = [];
for (const { row } of rowsWithIndex("SP OCOP")) {
  const product = String(row[2] || "").trim();
  if (!product) continue;
  ocopProducts.push({
    owner: String(row[1] || "").trim(),
    product,
    stars: String(row[3] || "").trim(),
    representative: String(row[4] || "").trim(),
    area: normArea(row[5]),
    sector: String(row[6] || "").trim(),
    output: String(row[10] || "").trim(),
    channel: String(row[11] || "").trim(),
    costMillion: parseNum(row[12]),
    revenueMillion: parseNum(row[13]),
    profitMillion: parseNum(row[14]),
    status: String(row[16] || "").trim(),
  });
}

const productionZones = numericRows("Vùng sản xuất")
  .map(({ row }) => mapOrgRow(row, "Vùng SX"))
  .filter((r) => r && r.name);

const effectiveModels = [];
let currentGroup = "Khác";
for (const { row } of rowsWithIndex("MH Hiệu quả")) {
  const label = String(row[1] || "").trim();
  if (!label) continue;
  if (typeof row[0] !== "number" && !row[2] && !row[3]) {
    currentGroup = label;
    continue;
  }
  if (typeof row[0] === "number") {
    effectiveModels.push({
      group: currentGroup,
      name: label,
      representative: String(row[2] || "").trim(),
      area: normArea(row[3]),
      sector: String(row[4] || "").trim(),
      landHa: parseNum(row[5]),
      members: parseNum(row[7]),
      output: String(row[8] || "").trim(),
      revenueMillion: parseNum(row[11]),
      profitMillion: parseNum(row[12]),
      status: String(row[14] || "").trim(),
    });
  }
}

function sum(items, key) {
  return items.reduce((acc, item) => acc + (item[key] || 0), 0);
}

const allOrgs = [...htx, ...tht];
const areaDistribution = {};
for (const org of [...allOrgs, ...thuyLoi]) {
  areaDistribution[org.area] = (areaDistribution[org.area] || 0) + 1;
}

const sectorDistribution = {};
for (const org of allOrgs) {
  sectorDistribution[org.sectorGroup] = (sectorDistribution[org.sectorGroup] || 0) + 1;
}

const bomType = { "Bơm điện": 0, "Bơm dầu": 0, Khác: 0 };
for (const s of thuyLoi) {
  const n = String(s.note || "").toLowerCase();
  if (n.includes("điện")) bomType["Bơm điện"]++;
  else if (n.includes("dầu")) bomType["Bơm dầu"]++;
  else bomType.Khác++;
}

const ocopStars = { "3 sao": 0, "4 sao": 0 };
for (const p of ocopProducts) {
  if (p.stars.includes("3")) ocopStars["3 sao"]++;
  if (p.stars.includes("4")) ocopStars["4 sao"]++;
}

const topRevenue = [...allOrgs]
  .filter((o) => o.revenueMillion)
  .sort((a, b) => (b.revenueMillion || 0) - (a.revenueMillion || 0))
  .slice(0, 10)
  .map((o) => ({ name: o.name, value: o.revenueMillion, type: o.type }));

const financialCompare = [
  { label: "HTX", cost: sum(htx, "costMillion"), revenue: sum(htx, "revenueMillion"), profit: sum(htx, "profitMillion") },
  { label: "THT", cost: sum(tht, "costMillion"), revenue: sum(tht, "revenueMillion"), profit: sum(tht, "profitMillion") },
  { label: "Trạm bơm", cost: sum(thuyLoi, "costMillion"), revenue: sum(thuyLoi, "revenueMillion"), profit: sum(thuyLoi, "profitMillion") },
];

const modelGroups = {};
for (const m of effectiveModels) {
  modelGroups[m.group] = (modelGroups[m.group] || 0) + 1;
}

const data = {
  meta: {
    title: "Trung tâm điều hành Nông nghiệp",
    ward: "Phường Long Bình",
    district: "Quận Cái Răng",
    city: "Thành phố Cần Thơ",
    source: "BẢNG TỔNG HỢP SỐ LIỆU NÔNG NGHIỆP",
  },
  kpis: {
    htxCount: htx.length,
    thtCount: tht.filter((o) => o.name).length,
    thuyLoiStations: thuyLoi.length,
    ocopProducts: ocopProducts.length,
    ocopOwners: new Set(ocopProducts.map((p) => p.owner).filter(Boolean)).size,
    productionZones: productionZones.length,
    effectiveModels: effectiveModels.length,
    totalMembers: sum(allOrgs, "members"),
    totalLandHa: Math.round((sum(allOrgs, "landHa") + sum(thuyLoi, "landHa")) * 10) / 10,
    totalRevenueMillion: Math.round((sum(allOrgs, "revenueMillion") + sum(thuyLoi, "revenueMillion")) * 10) / 10,
    totalProfitMillion: Math.round((sum(allOrgs, "profitMillion") + sum(thuyLoi, "profitMillion")) * 10) / 10,
    activeOrgs: allOrgs.filter((o) => /đang/i.test(o.status)).length,
    irrigationAreaHa: Math.round(sum(thuyLoi, "landHa") * 10) / 10,
  },
  charts: {
    sectorDistribution: Object.entries(sectorDistribution)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value),
    areaDistribution: Object.entries(areaDistribution)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value),
    bomType: Object.entries(bomType)
      .map(([name, value]) => ({ name, value }))
      .filter((x) => x.value > 0),
    ocopStars: Object.entries(ocopStars).map(([name, value]) => ({ name, value })),
    financialCompare,
    topRevenue,
    modelGroups: Object.entries(modelGroups).map(([name, value]) => ({ name, value })),
    productionZones: productionZones.map((z) => ({
      name: z.name,
      sector: z.sector,
      area: z.area,
      landHa: z.landHa,
      output: z.output,
      revenueMillion: z.revenueMillion,
      profitMillion: z.profitMillion,
      status: z.status,
    })),
  },
  highlights: {
    htx: htx.slice(0, 6),
    tht,
    thuyLoi: thuyLoi.slice(0, 8),
    ocop: ocopProducts.slice(0, 12),
    effectiveModels: effectiveModels.slice(0, 8),
  },
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
console.log("Đã ghi", outPath);
