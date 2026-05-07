import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const BACKUP_DIR = path.join(process.cwd(), 'backups');
const DB_PATH = path.join(process.cwd(), 'prisma', 'dev.db');

export async function POST(req: NextRequest) {
  try {
    const { filename } = await req.json();

    if (!filename) {
      return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
    }

    const backupPath = path.join(BACKUP_DIR, filename);

    if (!fs.existsSync(backupPath)) {
      return NextResponse.json({ error: 'Backup file not found' }, { status: 404 });
    }

    // Create a temporary backup of current DB before restoring, just in case
    const timestamp = new Date().getTime();
    const safetyBackup = path.join(BACKUP_DIR, `pre_restore_${timestamp}.db`);
    if (fs.existsSync(DB_PATH)) {
      fs.copyFileSync(DB_PATH, safetyBackup);
    }

    // Copy backup to main DB path
    fs.copyFileSync(backupPath, DB_PATH);

    return NextResponse.json({ message: 'Database restored successfully' });
  } catch (error) {
    console.error('Error restoring backup:', error);
    return NextResponse.json({ error: 'Failed to restore backup' }, { status: 500 });
  }
}
