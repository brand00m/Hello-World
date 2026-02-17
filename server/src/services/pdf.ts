import PDFDocument from 'pdfkit';

interface SubmittalData {
  id: string;
  title: string;
  project: {
    jobName: string;
    jobNumber: string | null;
    submittalDate: Date | null;
  };
  sections: {
    id: string;
    title: string;
    sortOrder: number;
    category: { name: string } | null;
    items: {
      id: string;
      sortOrder: number;
      specOverride: string | null;
      part: {
        description: string;
        model: string;
        specSection: string | null;
        submittalName: string | null;
        manufacturer: { name: string } | null;
        vendor: { companyName: string } | null;
      };
    }[];
  }[];
}

const COLORS = {
  primary: '#1a365d',
  secondary: '#2b6cb0',
  accent: '#3182ce',
  text: '#1a202c',
  lightText: '#4a5568',
  border: '#cbd5e0',
  headerBg: '#ebf4ff',
  white: '#ffffff',
};

export async function generateSubmittalPdf(submittal: SubmittalData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 72, bottom: 72, left: 72, right: 72 },
      info: {
        Title: submittal.title,
        Author: 'DMG-SC Engineering Controls',
        Subject: `Submittal for ${submittal.project.jobName}`,
      },
    });

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // --- Cover Page ---
    renderCoverPage(doc, submittal);

    // --- Table of Contents ---
    doc.addPage();
    renderTableOfContents(doc, submittal);

    // --- Sections ---
    for (const section of submittal.sections) {
      doc.addPage();
      renderSection(doc, section, submittal);
    }

    doc.end();
  });
}

function renderCoverPage(doc: PDFKit.PDFDocument, submittal: SubmittalData) {
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  // Top decorative bar
  doc.rect(0, 0, doc.page.width, 8).fill(COLORS.primary);

  // Company name
  doc.moveDown(4);
  doc.fontSize(14).fillColor(COLORS.lightText).text('DMG-SC', { align: 'center' });
  doc.moveDown(0.5);

  // Title
  doc.fontSize(28).fillColor(COLORS.primary).text('Engineering Controls', { align: 'center' });
  doc.fontSize(28).text('Submittal', { align: 'center' });

  // Divider
  doc.moveDown(1.5);
  const divY = doc.y;
  doc.moveTo(doc.page.margins.left + pageWidth * 0.2, divY)
     .lineTo(doc.page.margins.left + pageWidth * 0.8, divY)
     .strokeColor(COLORS.accent).lineWidth(2).stroke();

  // Submittal title
  doc.moveDown(2);
  doc.fontSize(20).fillColor(COLORS.secondary).text(submittal.title, { align: 'center' });

  // Project info box
  doc.moveDown(3);
  const boxX = doc.page.margins.left + pageWidth * 0.15;
  const boxW = pageWidth * 0.7;
  const boxY = doc.y;

  doc.rect(boxX, boxY, boxW, 120).strokeColor(COLORS.border).lineWidth(1).stroke();

  doc.fontSize(11).fillColor(COLORS.lightText);
  doc.text('Project:', boxX + 20, boxY + 15, { continued: true });
  doc.fillColor(COLORS.text).fontSize(13).text(`  ${submittal.project.jobName}`);

  doc.fontSize(11).fillColor(COLORS.lightText);
  doc.text('Job Number:', boxX + 20, boxY + 45, { continued: true });
  doc.fillColor(COLORS.text).fontSize(13).text(`  ${submittal.project.jobNumber || 'N/A'}`);

  doc.fontSize(11).fillColor(COLORS.lightText);
  doc.text('Date:', boxX + 20, boxY + 75, { continued: true });
  const dateStr = submittal.project.submittalDate
    ? new Date(submittal.project.submittalDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  doc.fillColor(COLORS.text).fontSize(13).text(`  ${dateStr}`);

  // Section count
  doc.moveDown(6);
  doc.fontSize(11).fillColor(COLORS.lightText).text(
    `${submittal.sections.length} section${submittal.sections.length !== 1 ? 's' : ''}  •  ${submittal.sections.reduce((s, sec) => s + sec.items.length, 0)} items`,
    { align: 'center' },
  );

  // Bottom bar
  doc.rect(0, doc.page.height - 8, doc.page.width, 8).fill(COLORS.primary);
}

function renderTableOfContents(doc: PDFKit.PDFDocument, submittal: SubmittalData) {
  doc.fontSize(20).fillColor(COLORS.primary).text('Table of Contents', { align: 'center' });
  doc.moveDown(1.5);

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  for (let i = 0; i < submittal.sections.length; i++) {
    const section = submittal.sections[i];
    const sectionNum = i + 1;
    const label = `Section ${sectionNum}: ${section.title}`;
    const itemCount = `${section.items.length} item${section.items.length !== 1 ? 's' : ''}`;

    doc.fontSize(12).fillColor(COLORS.text);
    doc.text(label, doc.page.margins.left, doc.y, { width: pageWidth - 80, continued: false });
    doc.moveUp();
    doc.fontSize(10).fillColor(COLORS.lightText).text(itemCount, { align: 'right' });
    doc.moveDown(0.3);

    // List items in the section
    for (const item of section.items) {
      const displayName = item.part.submittalName || item.part.description;
      doc.fontSize(9).fillColor(COLORS.lightText)
         .text(`    ${displayName}  —  ${item.part.model}`, { indent: 20 });
    }
    doc.moveDown(0.5);
  }

  // Footer
  renderPageFooter(doc, submittal, 'Table of Contents');
}

function renderSection(doc: PDFKit.PDFDocument, section: SubmittalData['sections'][0], submittal: SubmittalData) {
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  // Section header
  doc.rect(doc.page.margins.left, doc.y - 5, pageWidth, 35)
     .fill(COLORS.headerBg);

  doc.fontSize(16).fillColor(COLORS.primary)
     .text(section.title, doc.page.margins.left + 10, doc.y - 2);
  doc.moveDown(1);

  // Items table header
  const colX = {
    num: doc.page.margins.left,
    desc: doc.page.margins.left + 30,
    model: doc.page.margins.left + pageWidth * 0.55,
    mfr: doc.page.margins.left + pageWidth * 0.75,
    spec: doc.page.margins.left + pageWidth * 0.9,
  };

  doc.fontSize(9).fillColor(COLORS.lightText);
  doc.text('#', colX.num, doc.y, { width: 25 });
  doc.moveUp();
  doc.text('Description', colX.desc, doc.y);
  doc.moveUp();
  doc.text('Model', colX.model, doc.y);
  doc.moveUp();
  doc.text('Manufacturer', colX.mfr, doc.y);
  doc.moveUp();
  doc.text('Spec', colX.spec, doc.y);

  doc.moveDown(0.3);
  doc.moveTo(doc.page.margins.left, doc.y)
     .lineTo(doc.page.margins.left + pageWidth, doc.y)
     .strokeColor(COLORS.border).lineWidth(0.5).stroke();
  doc.moveDown(0.3);

  // Items
  for (let i = 0; i < section.items.length; i++) {
    const item = section.items[i];
    const displayName = item.part.submittalName || item.part.description;
    const spec = item.specOverride || item.part.specSection || '';

    // Check if we need a new page
    if (doc.y > doc.page.height - doc.page.margins.bottom - 40) {
      doc.addPage();
      doc.fontSize(12).fillColor(COLORS.primary).text(`${section.title} (continued)`, { align: 'left' });
      doc.moveDown(0.5);
    }

    const rowY = doc.y;
    doc.fontSize(9).fillColor(COLORS.text);
    doc.text(`${i + 1}`, colX.num, rowY, { width: 25 });
    doc.text(displayName, colX.desc, rowY, { width: pageWidth * 0.5 - 35 });

    const afterDescY = doc.y;
    doc.text(item.part.model, colX.model, rowY, { width: pageWidth * 0.2 - 5 });
    doc.text(item.part.manufacturer?.name || '', colX.mfr, rowY, { width: pageWidth * 0.15 - 5 });
    doc.fontSize(8).fillColor(COLORS.lightText);
    doc.text(spec, colX.spec, rowY, { width: pageWidth * 0.1 });

    doc.y = Math.max(doc.y, afterDescY);
    doc.moveDown(0.3);

    // Light divider between items
    if (i < section.items.length - 1) {
      doc.moveTo(colX.desc, doc.y)
         .lineTo(doc.page.margins.left + pageWidth, doc.y)
         .strokeColor('#e2e8f0').lineWidth(0.3).stroke();
      doc.moveDown(0.3);
    }
  }

  renderPageFooter(doc, submittal, section.title);
}

function renderPageFooter(doc: PDFKit.PDFDocument, submittal: SubmittalData, sectionTitle: string) {
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const footerY = doc.page.height - doc.page.margins.bottom + 20;

  doc.moveTo(doc.page.margins.left, footerY)
     .lineTo(doc.page.margins.left + pageWidth, footerY)
     .strokeColor(COLORS.border).lineWidth(0.5).stroke();

  doc.fontSize(7).fillColor(COLORS.lightText);
  doc.text(
    `${submittal.project.jobName}  |  ${sectionTitle}`,
    doc.page.margins.left,
    footerY + 5,
    { width: pageWidth, align: 'left' },
  );
}
