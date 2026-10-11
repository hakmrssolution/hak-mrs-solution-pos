import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";

const execFileAsync = promisify(execFile);

const backupDirectory = "C:\\HAK-MRS-POS-Backups";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const fileName = body?.fileName;

    if (!fileName || typeof fileName !== "string") {
      return NextResponse.json(
        { message: "Backup file name is required." },
        { status: 400 }
      );
    }

    const safeFileName = path.basename(fileName);

    if (
      safeFileName !== fileName ||
      !safeFileName.toLowerCase().endsWith(".backup")
    ) {
      return NextResponse.json(
        { message: "Invalid backup file." },
        { status: 400 }
      );
    }

    const backupFile = path.join(
      backupDirectory,
      safeFileName
    );

    try {
      await fs.access(backupFile);
    } catch {
      return NextResponse.json(
        { message: "Backup file was not found." },
        { status: 404 }
      );
    }

    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      return NextResponse.json(
        { message: "DATABASE_URL is not configured." },
        { status: 500 }
      );
    }

    const dbUrl = new URL(databaseUrl);

    const username = decodeURIComponent(dbUrl.username);
    const password = decodeURIComponent(dbUrl.password);
    const host = dbUrl.hostname;
    const port = dbUrl.port || "5432";
    const database = dbUrl.pathname.replace(/^\/+/, "");

    if (!username || !database) {
      return NextResponse.json(
        { message: "Invalid DATABASE_URL." },
        { status: 500 }
      );
    }

    const pgBin =
      "C:\\Program Files\\PostgreSQL\\18\\bin";

    const pgDumpPath =
      process.env.PG_DUMP_PATH ||
      path.join(pgBin, "pg_dump.exe");

    const pgRestorePath =
      process.env.PG_RESTORE_PATH ||
      path.join(pgBin, "pg_restore.exe");

    const psqlPath =
      process.env.PSQL_PATH ||
      path.join(pgBin, "psql.exe");

    /*
     * STEP 1
     * Create safety backup before restore
     */

    const now = new Date();

    const timestamp = now
      .toISOString()
      .replace(/T/, "_")
      .replace(/:/g, "-")
      .replace(/\..+/, "");

    const safetyBackupFile = path.join(
      backupDirectory,
      `HAK-MRS-POS-PRE-RESTORE-${timestamp}.backup`
    );

    await execFileAsync(
      pgDumpPath,
      [
        "-U",
        username,
        "-h",
        host,
        "-p",
        port,
        "-d",
        database,
        "-F",
        "c",
        "-f",
        safetyBackupFile,
      ],
      {
        env: {
          ...process.env,
          PGPASSWORD: password,
        },
      }
    );

    /*
     * STEP 2
     * Terminate active connections
     */

    await execFileAsync(
      psqlPath,
      [
        "-U",
        username,
        "-h",
        host,
        "-p",
        port,
        "-d",
        "postgres",
        "-c",
        `SELECT pg_terminate_backend(pid)
         FROM pg_stat_activity
         WHERE datname = '${database}'
         AND pid <> pg_backend_pid();`,
      ],
      {
        env: {
          ...process.env,
          PGPASSWORD: password,
        },
      }
    );

    /*
     * STEP 3
     * Restore selected backup
     */

    await execFileAsync(
      pgRestorePath,
      [
        "-U",
        username,
        "-h",
        host,
        "-p",
        port,
        "-d",
        database,
        "--clean",
        "--if-exists",
        "--no-owner",
        backupFile,
      ],
      {
        env: {
          ...process.env,
          PGPASSWORD: password,
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: "Database restored successfully.",
      restoredFile: safeFileName,
      safetyBackup: path.basename(safetyBackupFile),
    });
  } catch (error) {
    console.error("Restore Error:", error);

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Failed to restore database.",
      },
      { status: 500 }
    );
  }
}