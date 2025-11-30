import { expect } from "chai";

/**
 * Expect a transaction to fail with a specific error code
 */
export async function expectError(
  transaction: Promise<any>,
  errorCode: string
): Promise<void> {
  try {
    await transaction;
    expect.fail(`Expected error ${errorCode} but transaction succeeded`);
  } catch (error: any) {
    const errorStr = error.toString();
    const logs = error.logs ? error.logs.join(" ") : "";
    const fullError = errorStr + " " + logs;

    if (!fullError.includes(errorCode)) {
      console.log("Actual error:", errorStr);
      if (error.logs) console.log("Logs:", error.logs);
    }
    expect(fullError).to.include(errorCode);
  }
}
