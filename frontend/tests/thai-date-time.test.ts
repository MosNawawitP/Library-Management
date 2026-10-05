import assert from "node:assert/strict";
import { test } from "node:test";
import { formatThaiDateTime } from "../src/lib/thai-date-time.ts";

test("timestamp uses Thai date and Bangkok time", () => {
  assert.equal(
    formatThaiDateTime("2026-10-04T11:30:00+00:00"),
    "4 ต.ค. 2569 เวลา 18:30 น.",
  );
});
