import "./setup";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, it } from "vitest";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";

let testEnv: RulesTestEnvironment;

const LINE = {
  entryId: "e1",
  accountId: "2000:clientA",
  clientId: "clientA",
  accountClass: "liability",
  normalBalance: "credit",
  debitKobo: 0,
  creditKobo: 5000,
  date: "2026-06-26",
  memo: "",
};

beforeAll(async () => {
  const [host, port] = (
    process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080"
  ).split(":");
  testEnv = await initializeTestEnvironment({
    projectId: "demo-cluster-rules",
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
      host,
      port: Number(port),
    },
  });
  // Seed a line for clientA, bypassing rules.
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "journalLines/e1_0"), LINE);
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

function fs(uid: string, role: string) {
  return testEnv.authenticatedContext(uid, { role }).firestore();
}

describe("firestore rules — journalLines", () => {
  it("the owning customer can read their own line", async () => {
    await assertSucceeds(getDoc(doc(fs("clientA", "customer"), "journalLines/e1_0")));
  });

  it("another customer cannot read it", async () => {
    await assertFails(getDoc(doc(fs("clientB", "customer"), "journalLines/e1_0")));
  });

  it("staff can read any line", async () => {
    await assertSucceeds(getDoc(doc(fs("staff1", "accounts"), "journalLines/e1_0")));
  });

  it("a customer cannot write a journal line", async () => {
    await assertFails(
      setDoc(doc(fs("clientA", "customer"), "journalLines/e1_0"), {
        ...LINE,
        creditKobo: 999999,
      }),
    );
  });

  it("an unauthenticated client cannot read", async () => {
    await assertFails(
      getDoc(doc(testEnv.unauthenticatedContext().firestore(), "journalLines/e1_0")),
    );
  });
});
