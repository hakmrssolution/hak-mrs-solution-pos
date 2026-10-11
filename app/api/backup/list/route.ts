import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const backupDirectory = "C:\\HAK-MRS-POS-Backups";

export async function GET() {
  try {
    await fs.mkdir(backupDirectory, { recursive: true });

    const files = await fs.readdir(backupDirectory);

    const backups = [];

    for (const fileName of files) {
      if (!fileName.toLowerCase().endsWith(".backup")) {
        continue;
      }

      const filePath = path.join(backupDirectory, fileName);
      const stats = await fs.stat(filePath);

      backups.push({
        fileName,
        size: stats.size,
        createdAt: stats.birthtime.toISOString(),
      });
    }

    backups.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      success: true,
      backups,
    });
  } catch (error) {
    console.error("Backup List Error:", error);

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Failed to load backup list.",
      },
      { status: 500 }
    );
  }
}