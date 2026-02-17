const XLSX = require('xlsx');
const wb = XLSX.readFile('Master Parts List.xlsm', { cellDates: true });

// Check Points to Model Nums as array-of-arrays
console.log('=== Points to Model Nums (matrix) ===');
const pmSheet = wb.Sheets['Points to Model Nums'];
const pmData = XLSX.utils.sheet_to_json(pmSheet, { header: 1, defval: null });
console.log('Rows:', pmData.length, 'Cols:', pmData[0] ? pmData[0].length : 0);
console.log('First 3 rows (first 3 cols):');
for (let i = 0; i < Math.min(3, pmData.length); i++) {
  const row = pmData[i];
  console.log('Row', i, ':', JSON.stringify(row ? row.slice(0, 3) : null));
}

// Check all category sheet row counts
console.log('\n=== Category Sheet Sizes ===');
const NON_CATEGORY = new Set([
  'Master Parts List', 'Vendors', 'Vendor NS#', 'Master Points List',
  'Controller Points List', 'Points to Model Nums', 'Compiled', 'AllBOM',
  'Unique MPL Entries', 'Types View', 'Sheet1', 'Sheet2', 'AllReliablePrices',
  'ALL', 'BOM', 'Equipment Points Matrix', 'Equipment Panel Matrix',
  'equipOutput', 'panelOutput', 'Summary Page', 'NEW_MR', 'MR Maker',
  'NEW_SUBMITTAL', 'NEW_SUBMITTAL (2)', 'BELIMO', 'PivotTable',
  'PriorityList', 'Points', 'Controls Diagram Legend', 'VAVforKern',
  'Submittal Maker', 'Spec', 'Valve Actuator Schedule', 'Damper Actuator Schedule',
  'BACnet PICS', 'Installation Manuals', 'PDS',
  'MCS-C$', 'RC-AV$', 'RC-A$', 'WCW-B$', 'FDI-B$', 'ACI-B$',
]);

for (const name of wb.SheetNames) {
  if (NON_CATEGORY.has(name)) continue;
  const ws = wb.Sheets[name];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: null });
  if (rows.length > 0) {
    console.log(name + ':', rows.length, 'rows, Cols:', Object.keys(rows[0]).join(', '));
  } else {
    console.log(name + ': 0 rows');
  }
}

// Check the "Valve Actuator Schedule" and "Damper Actuator Schedule" headers
console.log('\n=== Valve Actuator Schedule ===');
const vasSheet = wb.Sheets['Valve Actuator Schedule'];
const vasRows = XLSX.utils.sheet_to_json(vasSheet, { defval: null });
console.log(vasRows.length, 'rows');
if (vasRows.length > 0) console.log('Headers:', Object.keys(vasRows[0]).join(' | '));

console.log('\n=== Damper Actuator Schedule ===');
const dasSheet = wb.Sheets['Damper Actuator Schedule'];
const dasRows = XLSX.utils.sheet_to_json(dasSheet, { defval: null });
console.log(dasRows.length, 'rows');
if (dasRows.length > 0) console.log('Headers:', Object.keys(dasRows[0]).join(' | '));
