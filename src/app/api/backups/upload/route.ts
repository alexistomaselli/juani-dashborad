import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const BACKUP_DIR = path.join(process.cwd(), 'backups');

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.name.endsWith('.db')) {
      return NextResponse.json({ error: 'Only .db files are allowed' }, { status: 400 });
    }

    // Ensure backup directory exists
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save with a "uploaded_" prefix to distinguish it
    const filename = `uploaded_${new Date().getTime()}_${file.name}`;
    const filePath = path.join(BACKUP_DIR, filename);
    
    fs.writeFileSync(filePath, buffer);

    return NextResponse.json({ 
      message: 'File uploaded successfully',
      filename: filename
    });
  } catch (error) {
    console.error('Error uploading backup:', error);
    return NextResponse.json({ error: 'Failed to upload backup' }, { status: 500 });
  }
}
