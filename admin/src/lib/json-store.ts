import { promises as fs } from "node:fs";
import crypto from "node:crypto";
import path from "node:path";

const queues = new Map<string, Promise<unknown>>();

function dataPath(file: string) {
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(file)) throw new Error("Invalid data file name.");
  return path.join(process.cwd(), "data", file);
}

async function atomicWrite(target: string, value: unknown) {
  const directory = path.dirname(target);
  const temporary = `${target}.${process.pid}.${crypto.randomUUID()}.tmp`;
  await fs.mkdir(directory, { recursive: true });
  try {
    await fs.writeFile(temporary, JSON.stringify(value, null, 2), "utf8");
    await fs.rename(temporary, target);
  } finally {
    await fs.unlink(temporary).catch(() => undefined);
  }
}

function withFileQueue<T>(key: string, task: () => Promise<T>): Promise<T> {
  const previous = queues.get(key) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(task);
  queues.set(key, next);
  return next.finally(() => {
    if (queues.get(key) === next) queues.delete(key);
  });
}

export async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(dataPath(file), "utf8")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return fallback;
    throw error;
  }
}

export async function writeJson(file: string, value: unknown) {
  const target = dataPath(file);
  await withFileQueue(target, () => atomicWrite(target, value));
}

export async function updateJson<T>(file: string, fallback: T, update: (current: T) => T | Promise<T>) {
  const target = dataPath(file);
  return withFileQueue(target, async () => {
    const next = await update(await readJson(file, fallback));
    await atomicWrite(target, next);
    return next;
  });
}

export async function writeBundledAppContent(value: unknown) {
  const target = path.join(process.cwd(), "..", "config", "published-app-content.json");
  await withFileQueue(target, () => atomicWrite(target, value));
}
