import { NextRequest, NextResponse } from 'next/server';
import { analyzeExcelBuffer } from '@/lib/importers/excelParser';
import { parseDocxBuffer } from '@/lib/importers/docxParser';
import { detectDuplicates } from '@/lib/duplicateDetector';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const targetSheet = formData.get('sheet') as string | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    }

    const fileName = file.name;
    const ext = fileName.split('.').pop()?.toLowerCase();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (ext === 'docx') {
      // Parse Word document directly
      const rawRecords = await parseDocxBuffer(buffer, fileName);
      const duplicateAnalysis = await detectDuplicates(rawRecords);

      return NextResponse.json({
        success: true,
        fileType: 'DOCX',
        fileName,
        duplicateAnalysis,
      });
    } else if (['xlsx', 'xls', 'csv'].includes(ext || '')) {
      // Analyze Excel structure
      const analysis = analyzeExcelBuffer(buffer, fileName, targetSheet || undefined);

      // Check if we have saved mapping configurations in DB that match file or columns
      const savedMappings = await prisma.columnMapping.findMany();

      return NextResponse.json({
        success: true,
        fileType: ext?.toUpperCase(),
        fileName,
        analysis,
        savedMappings,
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Unsupported file type. Please upload XLSX, XLS, CSV, or DOCX.' },
        { status: 400 }
      );
    }
  } catch (err: any) {
    console.error('Error in /api/import/analyze:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
