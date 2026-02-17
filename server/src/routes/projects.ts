import { Router } from 'express';
import ExcelJS from 'exceljs';
import { prisma } from '../index';

export const projectsRouter = Router();

// List all projects
projectsRouter.get('/', async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { bomItems: true, submittals: true } },
      },
    });
    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Get single project with BOM
projectsRouter.get('/:id', async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        bomItems: {
          include: {
            part: {
              include: {
                manufacturer: true,
                vendor: true,
                category: true,
              },
            },
          },
        },
        submittals: true,
      },
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// Create project
projectsRouter.post('/', async (req, res) => {
  try {
    const project = await prisma.project.create({ data: req.body });
    res.status(201).json(project);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Update project
projectsRouter.put('/:id', async (req, res) => {
  try {
    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(project);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// Delete project
projectsRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.project.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// Add item to BOM
projectsRouter.post('/:id/bom', async (req, res) => {
  try {
    const bomItem = await prisma.bomItem.create({
      data: {
        projectId: req.params.id,
        ...req.body,
      },
      include: {
        part: {
          include: { manufacturer: true, vendor: true, category: true },
        },
      },
    });
    res.status(201).json(bomItem);
  } catch (error) {
    console.error('Error adding BOM item:', error);
    res.status(500).json({ error: 'Failed to add BOM item' });
  }
});

// Update BOM item
projectsRouter.put('/:id/bom/:bomItemId', async (req, res) => {
  try {
    const bomItem = await prisma.bomItem.update({
      where: { id: req.params.bomItemId },
      data: req.body,
      include: {
        part: {
          include: { manufacturer: true, vendor: true, category: true },
        },
      },
    });
    res.json(bomItem);
  } catch (error) {
    console.error('Error updating BOM item:', error);
    res.status(500).json({ error: 'Failed to update BOM item' });
  }
});

// Delete BOM item
projectsRouter.delete('/:id/bom/:bomItemId', async (req, res) => {
  try {
    await prisma.bomItem.delete({ where: { id: req.params.bomItemId } });
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting BOM item:', error);
    res.status(500).json({ error: 'Failed to delete BOM item' });
  }
});

// Export BOM as Excel
projectsRouter.get('/:id/bom/export', async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        bomItems: {
          include: {
            part: {
              include: { manufacturer: true, vendor: true, category: true },
            },
          },
        },
      },
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Material Requisition');

    // Header rows
    ws.mergeCells('A1:H1');
    const titleCell = ws.getCell('A1');
    titleCell.value = `Material Requisition — ${project.jobName}`;
    titleCell.font = { size: 14, bold: true };

    ws.mergeCells('A2:H2');
    ws.getCell('A2').value = `Job #: ${project.jobNumber || 'N/A'}  |  Date: ${project.submittalDate || new Date().toISOString().substring(0, 10)}`;

    // Column headers
    ws.getRow(4).values = ['#', 'Description', 'Model', 'Manufacturer', 'Vendor', 'Qty', 'Unit Price', 'Ext. Price'];
    const headerRow = ws.getRow(4);
    headerRow.font = { bold: true };
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
      cell.border = { bottom: { style: 'thin' } };
    });

    ws.getColumn(1).width = 5;
    ws.getColumn(2).width = 40;
    ws.getColumn(3).width = 25;
    ws.getColumn(4).width = 20;
    ws.getColumn(5).width = 20;
    ws.getColumn(6).width = 8;
    ws.getColumn(7).width = 12;
    ws.getColumn(8).width = 12;

    let grandTotal = 0;
    project.bomItems.forEach((item, idx) => {
      const unitPrice = item.unitPrice ? Number(item.unitPrice) : (item.part.discountPrice ? Number(item.part.discountPrice) : 0);
      const extPrice = unitPrice * item.quantity;
      grandTotal += extPrice;

      const row = ws.addRow([
        idx + 1,
        item.part.description,
        item.part.model,
        item.part.manufacturer?.name || '',
        item.part.vendor?.companyName || '',
        item.quantity,
        unitPrice,
        extPrice,
      ]);
      row.getCell(7).numFmt = '$#,##0.00';
      row.getCell(8).numFmt = '$#,##0.00';
    });

    // Total row
    const totalRow = ws.addRow(['', '', '', '', 'TOTAL', '', '', grandTotal]);
    totalRow.font = { bold: true };
    totalRow.getCell(8).numFmt = '$#,##0.00';

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="MR-${project.jobNumber || project.jobName}.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error exporting BOM:', error);
    res.status(500).json({ error: 'Failed to export BOM' });
  }
});
