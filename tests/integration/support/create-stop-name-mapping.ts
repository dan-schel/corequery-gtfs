import z from "zod";
import { intStringSchema } from "./zod.js";
import fsp from "fs/promises";
import path from "path";
import { parseIntThrow } from "@dan-schel/js-utils";

const mappingSchema = z.record(intStringSchema, z.string());

export async function createStopNameMapping(
  dirname: string,
): Promise<StopNameMapping> {
  const mappingJsonPath = path.join(dirname, "stop-name-mapping.json");
  const mappingJsonStr = await fsp.readFile(mappingJsonPath, "utf-8");
  const mappingJson = mappingSchema.parse(JSON.parse(mappingJsonStr));

  return StopNameMapping.build(mappingJson);
}

export class StopNameMapping {
  constructor(
    private readonly _nameById: Map<number, string>,
    private readonly _idByName: Map<string, number>,
  ) {}

  requireName(id: number): string {
    const name = this._nameById.get(id);
    if (name == null) throw new Error(`Stop #${id} not in stop name mapping.`);
    return name;
  }

  requireId(name: string): number {
    const id = this._idByName.get(name);
    if (id == null) throw new Error(`Stop "${name}" not in stop name mapping.`);
    return id;
  }

  static build(json: Record<number, string>) {
    const nameById = new Map<number, string>();
    const idByName = new Map<string, number>();

    for (const [idStr, name] of Object.entries(json)) {
      const id = parseIntThrow(idStr);
      nameById.set(id, name);
      idByName.set(name, id);
    }

    return new StopNameMapping(nameById, idByName);
  }
}
