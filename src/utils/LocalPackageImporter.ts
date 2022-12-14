import { JsonType, JsonValue } from "./JsonUtils";
import * as fs from "node:fs";
import merge from "merge";
import * as path from "node:path";
import { LocalPackageImportError } from "./exceptions";

export interface AplPayload {
  document: JsonType;
  datasources: JsonType;
}

interface AplPackageImport {
  name: string;
  version: string;
  source: string;
}

function isAplPackageArray(
  aplPackageArray: any
): aplPackageArray is AplPackageImport[] {
  return (
    Array.isArray(aplPackageArray) &&
    aplPackageArray.every((a) => a.name && a.version)
  );
}

export class LocalPackageImporter {
  inflateAplPayload(documentDirecotyrPath: string, aplPayload: AplPayload) {
    const pacakgeJson = aplPayload.document["import"];
    const newPackageJson: JsonValue[] = [];
    if (pacakgeJson && isAplPackageArray(pacakgeJson)) {
      pacakgeJson.forEach((p: AplPackageImport) => {
        if (
          !p.source ||
          p.source.startsWith("https://") ||
          p.source.startsWith("http://")
        ) {
          newPackageJson.push(JSON.parse(JSON.stringify(p)));
          return;
        }

        const document = this.loadLocalPackage(
          // TODO: Doesn't support '~/' expression yet. Shoud support
          path.resolve(documentDirecotyrPath, p.source)
        );

        if (!document) {
          newPackageJson.push(JSON.parse(JSON.stringify(p)));
          return;
        }

        // Merge each porperty of the package
        Object.keys(document).forEach((k) => {
          // Shouldn't merge mainTemplate with packages
          if (
            k === "mainTemplate" ||
            !(typeof document[k] === "object" && !Array.isArray(document[k]))
          ) {
            return;
          }

          aplPayload.document[k] = merge(
            true,
            document[k],
            aplPayload.document[k]
          );
        });
      });

      // newPackageJson doesn't include local pacakge imports because would happen error while rendering APL document
      aplPayload.document["import"] = newPackageJson;
    }

    return aplPayload;
  }

  private loadLocalPackage(packagePath: string) {
    try {
      if (!fs.existsSync(packagePath)) {
        return;
      }

      const file = fs.readFileSync(packagePath);
      return JSON.parse(file.toString());
    } catch (e) {
      let errorMessage = "Error while importing local pacakge.";
      if (e instanceof Error) {
        errorMessage += ` Reason: ${e.message}`;
      }

      throw new LocalPackageImportError(errorMessage);
    }
  }
}
