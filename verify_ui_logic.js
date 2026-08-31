const fs = require("fs");
const vm = require("vm");

const source = fs.readFileSync("game.js", "utf8");
function extractFn(name) {
  const start = source.indexOf("function " + name + "(");
  if (start < 0) return null;
  const brace = source.indexOf("{", start);
  let depth = 0;
  for (let i = brace; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    if (source[i] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  return null;
}

const infer = extractFn("inferRelationsEffect");
const match = extractFn("derivedChoiceEffects");

if (!infer || !match) {
  throw new Error("Missing tradeoff helpers for visible choice feedback");
}

const context = { CORRECT_GPA: 0.05 };
vm.runInNewContext(infer + "\n" + match + "\nthis.derivedChoiceEffects = derivedChoiceEffects;", context);

const positive = context.derivedChoiceEffects({ ethics: 3 });
const negative = context.derivedChoiceEffects({ ethics: -2 });
const explicit = context.derivedChoiceEffects({
  ethics: 5,
  effects: { gpa: 0.1, thinking: 6, practice: 3 }
});

if (positive.thinking !== undefined || positive.practice !== undefined || positive.relations !== -1) {
  throw new Error("Positive ethics must not automatically grant clinical ability");
}
if (negative.thinking !== undefined || negative.relations !== 1) {
  throw new Error("Negative ethics must not automatically reduce clinical ability");
}
if (explicit.thinking !== 6 || explicit.practice !== 3 || explicit.gpa !== 0.1 || explicit.relations !== -1) {
  throw new Error("Explicit medical effects must remain authoritative while receiving a separate tradeoff");
}

console.log("OK: visible choice feedback preserves medical effects and exposes multi-dimensional tradeoffs");
