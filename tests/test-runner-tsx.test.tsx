import test from "node:test";
import assert from "node:assert/strict";

function ExampleLabel({ value }: { value: string }) {
  return <span>{value}</span>;
}

test("test runner transpiles TSX tests", () => {
  const element = <ExampleLabel value="ready" />;
  assert.equal(element.props.value, "ready");
});
