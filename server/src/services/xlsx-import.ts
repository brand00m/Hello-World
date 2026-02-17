import * as XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';
import path from 'path';

const WORKBOOK_PATH = path.resolve(__dirname, '../../../Master Parts List.xlsm');

// Sheet name constants
const SHEET_MASTER_PARTS = 'Master Parts List';
const SHEET_VENDORS = 'Vendors';
const SHEET_VENDOR_NS = 'Vendor NS#';
const SHEET_MASTER_POINTS = 'Master Points List';
const SHEET_CONTROLLER_POINTS = 'Controller Points List';
const SHEET_POINTS_TO_MODELS = 'Points to Model Nums';

// Sheets that are NOT part categories
const NON_CATEGORY_SHEETS = new Set([
  SHEET_MASTER_PARTS, SHEET_VENDORS, SHEET_VENDOR_NS,
  SHEET_MASTER_POINTS, SHEET_CONTROLLER_POINTS, SHEET_POINTS_TO_MODELS,
  'Compiled', 'AllBOM', 'Unique MPL Entries', 'Types View',
  'Sheet1', 'Sheet2', 'AllReliablePrices', 'ALL', 'BOM',
  'Equipment Points Matrix', 'Equipment Panel Matrix',
  'equipOutput', 'panelOutput', 'Summary Page',
  'NEW_MR', 'MR Maker', 'NEW_SUBMITTAL', 'NEW_SUBMITTAL (2)',
  'BELIMO', 'PivotTable', 'PriorityList', 'Points',
  'Controls Diagram Legend', 'VAVforKern', 'Submittal Maker', 'Spec',
  'Valve Actuator Schedule', 'Damper Actuator Schedule',
  'BACnet PICS', 'Installation Manuals', 'PDS',
  'MCS-C$', 'RC-AV$', 'RC-A$', 'WCW-B$', 'FDI-B$', 'ACI-B$',
]);

// --- Parsing Helpers ---

function trimStr(val: unknown): string | null {
  if (val === undefined || val === null) return null;
  const s = String(val).trim();
  return s.length === 0 || s === '-' ? null : s;
}

function parseDecimal(val: unknown): number | null {
  if (val === undefined || val === null || val === '') return null;
  const n = typeof val === 'number' ? val : parseFloat(String(val).replace(/[$,]/g, ''));
  return isNaN(n) ? null : n;
}

function parseInt_(val: unknown): number | null {
  if (val === undefined || val === null || val === '') return null;
  const n = typeof val === 'number' ? Math.round(val) : parseInt(String(val), 10);
  return isNaN(n) ? null : n;
}

function parseDate(val: unknown): Date | null {
  if (val === undefined || val === null || val === '') return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  const s = String(val).trim();
  if (s.toLowerCase() === 'unknown' || s === '-') return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function parseBool(val: unknown): boolean {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val !== 0;
  const s = String(val).trim().toLowerCase();
  return s === 'yes' || s === 'true' || s === 'x' || s === '1';
}

function log(phase: string, message: string): void {
  const timestamp = new Date().toISOString().substring(11, 19);
  console.log(`[${timestamp}] [${phase.padEnd(14)}] ${message}`);
}

function readSheet(wb: XLSX.WorkBook, name: string): Record<string, unknown>[] {
  const ws = wb.Sheets[name];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json(ws, { defval: null });
}

// --- Seed Functions ---

async function seedVendors(
  prisma: PrismaClient,
  wb: XLSX.WorkBook,
  masterRows: Record<string, unknown>[],
): Promise<Map<string, string>> {
  log('VENDORS', 'Starting vendor import...');
  const map = new Map<string, string>();

  // 1. Read Vendors sheet for full details
  const vendorRows = readSheet(wb, SHEET_VENDORS);
  const vendorDetails = new Map<string, Record<string, unknown>>();
  for (const row of vendorRows) {
    const name = trimStr(row['Company Name']);
    if (name) vendorDetails.set(name, row);
  }

  // 2. Read Vendor NS# sheet for NetSuite IDs
  const nsRows = readSheet(wb, SHEET_VENDOR_NS);
  const nsMap = new Map<string, string>();
  for (const row of nsRows) {
    const name = trimStr(row['Company Name']);
    const nsId = trimStr(row['NetSuite']);
    if (name && nsId) nsMap.set(name, nsId);
  }

  // 3. Collect all unique vendor names from Master Parts List
  const allNames = new Set<string>();
  for (const name of vendorDetails.keys()) allNames.add(name);
  for (const row of masterRows) {
    const v = trimStr(row['Vendor']);
    if (v && v !== 'By Others') allNames.add(v);
  }

  // 4. Upsert each vendor
  for (const companyName of allNames) {
    const details = vendorDetails.get(companyName);
    const vendor = await prisma.vendor.upsert({
      where: { companyName },
      update: {
        netsuiteId: nsMap.get(companyName) ?? undefined,
      },
      create: {
        companyName,
        multiplier: details ? parseDecimal(details['Multiplier']) : null,
        contactName: details ? trimStr(details['Attention Line 1']) : null,
        contactEmail: details ? trimStr(details['Attention Line 2']) : null,
        addressLine1: details ? trimStr(details['Address Line 1']) : null,
        addressLine2: details ? trimStr(details['Address Line 2']) : null,
        phone: details ? trimStr(details['Phone Number']) : null,
        netsuiteId: nsMap.get(companyName) ?? null,
      },
    });
    map.set(companyName, vendor.id);
  }

  log('VENDORS', `Imported ${map.size} vendors.`);
  return map;
}

async function seedManufacturers(
  prisma: PrismaClient,
  masterRows: Record<string, unknown>[],
): Promise<Map<string, string>> {
  log('MANUFACTURERS', 'Starting manufacturer import...');
  const map = new Map<string, string>();

  const uniqueNames = new Set<string>();
  for (const row of masterRows) {
    const name = trimStr(row['Manufacturer']);
    if (name) uniqueNames.add(name);
  }

  for (const name of uniqueNames) {
    const mfr = await prisma.manufacturer.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    map.set(name, mfr.id);
  }

  log('MANUFACTURERS', `Imported ${map.size} manufacturers.`);
  return map;
}

async function seedCategories(
  prisma: PrismaClient,
  wb: XLSX.WorkBook,
): Promise<{ categoryMap: Map<string, string>; modelToCategory: Map<string, string> }> {
  log('CATEGORIES', 'Starting category import...');
  const categoryMap = new Map<string, string>();
  const modelToCategory = new Map<string, string>();

  // Category sheets are any sheets NOT in the non-category set that have the expected columns
  const categorySheets: string[] = [];
  for (const name of wb.SheetNames) {
    if (NON_CATEGORY_SHEETS.has(name)) continue;
    const rows = readSheet(wb, name);
    if (rows.length > 0 && 'Model' in rows[0]) {
      categorySheets.push(name);
    }
  }

  let sortOrder = 0;
  for (const name of categorySheets) {
    const cat = await prisma.partCategory.upsert({
      where: { name },
      update: { sortOrder },
      create: { name, sortOrder },
    });
    categoryMap.set(name, cat.id);
    sortOrder++;

    // Build model → category reverse lookup
    const rows = readSheet(wb, name);
    for (const row of rows) {
      const model = trimStr(row['Model']);
      if (model) modelToCategory.set(model, name);
    }
  }

  log('CATEGORIES', `Imported ${categoryMap.size} categories: ${categorySheets.join(', ')}`);
  return { categoryMap, modelToCategory };
}

async function seedParts(
  prisma: PrismaClient,
  masterRows: Record<string, unknown>[],
  vendorMap: Map<string, string>,
  mfrMap: Map<string, string>,
  categoryMap: Map<string, string>,
  modelToCategory: Map<string, string>,
  categorySubmittalData: Map<string, { submittalName: string | null; priorityRanking: number | null; spec: string | null }>,
): Promise<Map<string, string>> {
  log('PARTS', 'Starting parts import...');
  const partModelMap = new Map<string, string>();

  // Filter valid rows
  const validRows = masterRows.filter((r) => {
    const desc = trimStr(r['Description']);
    const model = trimStr(r['Model']);
    return desc || model;
  });

  log('PARTS', `Processing ${validRows.length} rows...`);

  const BATCH_SIZE = 500;
  let created = 0;
  let skipped = 0;

  for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
    const batch = validRows.slice(i, i + BATCH_SIZE);
    await prisma.$transaction(async (tx) => {
      for (const raw of batch) {
        try {
          const desc = trimStr(raw['Description']) ?? '';
          const model = trimStr(raw['Model']) ?? '';
          const mfrName = trimStr(raw['Manufacturer']);
          const vendorName = trimStr(raw['Vendor']);
          const categoryName = modelToCategory.get(model) ?? null;
          const submittalData = model ? categorySubmittalData.get(model) : undefined;

          const part = await tx.part.create({
            data: {
              description: desc,
              model,
              manufacturerId: mfrName ? (mfrMap.get(mfrName) ?? null) : null,
              vendorId: vendorName ? (vendorMap.get(vendorName) ?? null) : null,
              categoryId: categoryName ? (categoryMap.get(categoryName) ?? null) : null,
              pointType: trimStr(raw['Point Type']),
              listPrice: parseDecimal(raw['List Price']),
              discountPrice: parseDecimal(raw['Discount Price']),
              pricingDate: parseDate(raw['Pricing Date Updated']),
              submittalName: submittalData?.submittalName ?? trimStr(raw['Submittal Description']),
              priorityRanking: submittalData?.priorityRanking ?? null,
              specSection: submittalData?.spec ?? null,
              isByOthers: vendorName === 'By Others' || parseBool(raw['By Others'] ?? false),
            },
          });

          if (model) {
            partModelMap.set(model, part.id);
          }
          created++;
        } catch (err) {
          skipped++;
          console.error(`  Skipped row: ${err}`);
        }
      }
    });
    log('PARTS', `  Progress: ${Math.min(i + BATCH_SIZE, validRows.length)}/${validRows.length}`);
  }

  log('PARTS', `Imported ${created} parts (${skipped} skipped).`);
  return partModelMap;
}

async function seedPointTypes(
  prisma: PrismaClient,
  wb: XLSX.WorkBook,
): Promise<Map<string, string>> {
  log('POINT_TYPES', 'Starting point types import...');
  const map = new Map<string, string>();

  const rows = readSheet(wb, SHEET_MASTER_POINTS);
  if (rows.length === 0) {
    log('POINT_TYPES', 'WARNING: Master Points List sheet empty or not found. Skipping.');
    return map;
  }

  for (const raw of rows) {
    const name = trimStr(raw['Point Type']);
    if (!name) continue;

    const pt = await prisma.pointType.upsert({
      where: { name },
      update: {
        uiCount: parseInt_(raw['UI']) ?? 0,
        aoCount: parseInt_(raw['AO']) ?? 0,
        doCount: parseInt_(raw['DO']) ?? 0,
        startupHours: parseDecimal(raw['Startup']),
        cadHours: parseDecimal(raw['CAD']),
        designHours: parseDecimal(raw['Design']),
        programmingHours: parseDecimal(raw['Programming']),
        graphicsHours: parseDecimal(raw['Graphics']),
        pmHours: parseDecimal(raw['Project Management']),
      },
      create: {
        name,
        uiCount: parseInt_(raw['UI']) ?? 0,
        aoCount: parseInt_(raw['AO']) ?? 0,
        doCount: parseInt_(raw['DO']) ?? 0,
        startupHours: parseDecimal(raw['Startup']),
        cadHours: parseDecimal(raw['CAD']),
        designHours: parseDecimal(raw['Design']),
        programmingHours: parseDecimal(raw['Programming']),
        graphicsHours: parseDecimal(raw['Graphics']),
        pmHours: parseDecimal(raw['Project Management']),
      },
    });
    map.set(name, pt.id);
  }

  log('POINT_TYPES', `Imported ${map.size} point types.`);
  return map;
}

async function seedControllers(
  prisma: PrismaClient,
  wb: XLSX.WorkBook,
): Promise<void> {
  log('CONTROLLERS', 'Starting controllers import...');

  const rows = readSheet(wb, SHEET_CONTROLLER_POINTS);
  if (rows.length === 0) {
    log('CONTROLLERS', 'WARNING: Controller Points List sheet empty or not found. Skipping.');
    return;
  }

  let count = 0;
  for (const raw of rows) {
    const description = trimStr(raw['Description']) ?? '';
    const model = trimStr(raw['Controller']) ?? '';
    if (!description && !model) continue;

    await prisma.controller.create({
      data: {
        description,
        model,
        uiCapacity: parseInt_(raw['UI']),
        uoCapacity: parseInt_(raw['UO']),
        aoCapacity: parseInt_(raw['AO']),
        boCapacity: parseInt_(raw['BO']),
        hasHoa: parseBool(raw['HOA'] ?? false),
        hasMotion: parseBool(raw['Motion'] ?? false),
      },
    });
    count++;
  }

  log('CONTROLLERS', `Imported ${count} controllers.`);
}

async function seedPointModelMappings(
  prisma: PrismaClient,
  wb: XLSX.WorkBook,
  pointTypeMap: Map<string, string>,
  partModelMap: Map<string, string>,
): Promise<void> {
  log('MAPPINGS', 'Starting point-model mappings import...');

  const ws = wb.Sheets[SHEET_POINTS_TO_MODELS];
  if (!ws) {
    log('MAPPINGS', 'WARNING: Points to Model Nums sheet not found. Skipping.');
    return;
  }

  // This sheet is a matrix: columns = point type names, rows = model alternatives
  // Each cell contains "Model, Description" text
  const data: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
  if (data.length < 2) {
    log('MAPPINGS', 'WARNING: Points to Model Nums sheet has insufficient data. Skipping.');
    return;
  }

  // Row 0 = point type names (column headers)
  const headerRow = data[0] as string[];
  let count = 0;
  let skipped = 0;

  for (let col = 0; col < headerRow.length; col++) {
    const pointTypeName = trimStr(headerRow[col]);
    if (!pointTypeName) continue;

    const pointTypeId = pointTypeMap.get(pointTypeName);
    if (!pointTypeId) {
      skipped++;
      continue;
    }

    let sortOrder = 0;
    for (let row = 1; row < data.length; row++) {
      const cellValue = (data[row] as unknown[])[col];
      if (cellValue === null || cellValue === undefined || cellValue === '') continue;

      const cellStr = String(cellValue).trim();
      if (!cellStr) continue;

      // Parse "Model, Description" format — extract the model number before the first comma
      const commaIdx = cellStr.indexOf(',');
      const modelNum = commaIdx > 0 ? cellStr.substring(0, commaIdx).trim() : cellStr.trim();
      if (!modelNum) continue;

      const partId = partModelMap.get(modelNum);
      if (!partId) {
        skipped++;
        continue;
      }

      // First entry (sortOrder 0) is the default for this point type
      await prisma.pointModelMapping.create({
        data: {
          pointTypeId,
          partId,
          isDefault: sortOrder === 0,
          sortOrder,
        },
      });
      count++;
      sortOrder++;
    }
  }

  log('MAPPINGS', `Imported ${count} mappings (${skipped} skipped).`);
}

// --- Main Export ---

export async function importWorkbook(prisma: PrismaClient): Promise<void> {
  log('INIT', `Reading workbook: ${WORKBOOK_PATH}`);
  const workbook = XLSX.readFile(WORKBOOK_PATH, { cellDates: true });
  log('INIT', `Workbook loaded. ${workbook.SheetNames.length} sheets.`);

  // Pre-read master parts list (used by multiple phases)
  const masterRows = readSheet(workbook, SHEET_MASTER_PARTS);
  log('INIT', `Master Parts List: ${masterRows.length} rows.`);

  // Pre-read category sheets for submittal metadata (submittalName, priorityRanking, spec)
  const categorySubmittalData = new Map<string, { submittalName: string | null; priorityRanking: number | null; spec: string | null }>();
  for (const name of workbook.SheetNames) {
    if (NON_CATEGORY_SHEETS.has(name)) continue;
    const rows = readSheet(workbook, name);
    for (const row of rows) {
      const model = trimStr(row['Model']);
      if (model) {
        categorySubmittalData.set(model, {
          submittalName: trimStr(row['Submittal Name']),
          priorityRanking: parseInt_(row['Priority Ranking']),
          spec: trimStr(row['Spec']),
        });
      }
    }
  }
  log('INIT', `Category submittal data: ${categorySubmittalData.size} entries.`);

  // Phase 1: Independent lookup tables
  const vendorMap = await seedVendors(prisma, workbook, masterRows);
  const mfrMap = await seedManufacturers(prisma, masterRows);
  const { categoryMap, modelToCategory } = await seedCategories(prisma, workbook);

  // Phase 2: Parts (depends on all lookup maps)
  const partModelMap = await seedParts(
    prisma, masterRows, vendorMap, mfrMap, categoryMap,
    modelToCategory, categorySubmittalData,
  );

  // Phase 3: Points & Controllers
  const pointTypeMap = await seedPointTypes(prisma, workbook);
  await seedControllers(prisma, workbook);

  // Phase 4: Point-model mappings (depends on pointTypes + parts)
  await seedPointModelMappings(prisma, workbook, pointTypeMap, partModelMap);

  log('DONE', 'Import complete.');
}
