import { promises as fs } from "node:fs";
import path from "node:path";

export async function readJson<T>(file: string, fallback: T): Promise<T> {
  try { return JSON.parse(await fs.readFile(path.join(process.cwd(), "data", file), "utf8")) as T; }
  catch { return fallback; }
}

export async function writeJson(file: string, value: unknown) {
  const directory = path.join(process.cwd(), "data");
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, file), JSON.stringify(value, null, 2), "utf8");
}

export async function writeBundledAppContent(value: unknown) {
  const directory = path.join(process.cwd(), "..", "config");
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, "published-app-content.json"), JSON.stringify(value, null, 2), "utf8");
}
