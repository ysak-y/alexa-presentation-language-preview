export class LocalPackageImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LocalPackageImportError";
  }
}
