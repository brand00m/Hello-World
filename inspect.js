const XLSX = require('xlsx');
const wb = XLSX.readFile('Master Parts List.xlsm', { cellDates: true });

const sheets = ['Master Parts List', 'Vendors', 'Vendor NS#', 'Master Points List', 'Controller Points List', 'Points to Model Nums', 'Field Peripheral Devices', 'Panel Components', 'Programmable Controllers', 'Wiring', 'Workstation Components', 'Delta Controls', 'Reliable Controls', 'Distech Controls'];

for (const name of sheets) {
  const ws = wb.Sheets[name];
  if (!ws) { console.log(name + ': NOT FOUND'); continue; }
  const rows = XLSX.utils.sheet_to_json(ws, { defval: null });
  console.log('=== ' + name + ' === (' + rows.length + ' rows)');
  if (rows.length > 0) {
    console.log('Headers:', Object.keys(rows[0]).join(' | '));
    const first = rows[0];
    for (const [k, v] of Object.entries(first)) {
      console.log('  ' + k + ': ' + JSON.stringify(v));
    }
  }
  console.log('');
}
