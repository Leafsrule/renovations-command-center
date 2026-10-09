import { createHash } from "node:crypto";
import type { Bucket } from "@google-cloud/storage";
import { CommandError } from "../task-command";
export const PHOTO_LIMIT = 10 * 1024 * 1024;
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
export type PhotoInfo = { version: string; size: number; contentType: string; metadata: Record<string, string> };
export interface PhotoStore {
  info(path: string): Promise<PhotoInfo>;
  read(path: string, version: string): Promise<Buffer>;
  create(path: string, bytes: Buffer, contentType: string, metadata: Record<string, string>): Promise<void>;
  removeStaging(path: string): Promise<void>;
}
export const photoHash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
export const photoVersionValid = (value: unknown): value is string => typeof value === "string" && (/^\d+$/.test(value) || /^supabase:[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+$/.test(value));
export function privatePhotoStore(store: PhotoStore | Bucket): PhotoStore {
  if ("info" in store) return store;
  return {
    async info(path) {
      const [m] = await store.file(path).getMetadata();
      return { version: String(m.generation), size: Number(m.size), contentType: m.contentType ?? "", metadata: m.metadata as Record<string, string> ?? {} };
    },
    async read(path, version) { return (await store.file(path, { generation: version }).download())[0]; },
    async create(path, bytes, contentType, metadata) {
      await store.file(path).save(bytes, { resumable: false, preconditionOpts: { ifGenerationMatch: 0 }, metadata: { contentType, metadata: { ...metadata, firebaseStorageDownloadTokens: "" } } });
    },
    async removeStaging(path) {
      if (!/^projects\/[^/]+\/evidence-staging\/[^/]+$/.test(path)) throw new CommandError(400, "Only staging files can be removed.");
      await store.file(path).delete({ ignoreNotFound: true });
    },
  };
}
