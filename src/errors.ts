export class HermesError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HermesError";
  }
}
