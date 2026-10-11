import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";

const execFileAsync = promisify(execFile);

export async function POST() {
  try {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      return NextResponse.json(
        {
          message: "DATABASE_URL is not configured.",
        },
        { status: 500 }
      );
    }

    const dbUrl = new URL(databaseUrl);

    const username = decodeURIComponent(dbUrl.username);
    const password = decodeURIComponent(dbUrl.password);
    const host = dbUrl.hostname;
    const port = dbUrl.port || "5432";
    const database = dbUrl.pathname.replace("/", "");

    if (!username || !database) {
      return NextResponse.json(
        {
          message: "Invalid DATABASE_URL.",
        },
        { status: 500 }
      );
    }

    const backupDirectory = "C:\\HAK-MRS-POS-Backups";

    await fs.mkdir(backupDirectory, {
      recursive: true,
    });

    const now = new Date();

    const timestamp = now
      .toISOString()
      .replace(/T/, "_")
      .replace(/:/g, "-")
      .replace(/\..+/, "");

    const backupFile = path.join(
      backupDirectory,
      `HAK-MRS-POS-${timestamp}.backup`
    );

    const pgDumpPath =
      process.env.PG_DUMP_PATH ||
      "C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe";

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
        backupFile,
      ],
      {
        env: {
          ...process.env,
          PGPASSWORD: password,
        },
      }
    );

    const stats = await fs.stat(backupFile);

    return NextResponse.json({
      success: true,
      message: "Backup created successfully.",
      fileName: path.basename(backupFile),
      filePath: backupFile,
      size: stats.size,
    });
  } catch (error) {
    console.error("Backup Error:", error);

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Failed to create database backup.",
      },
      { status: 500 }
    );
  }
}