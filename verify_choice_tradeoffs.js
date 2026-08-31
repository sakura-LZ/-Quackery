const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const source = fs.readFileSync(path.join(ROOT, "game.js"), "utf8");

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

const inferSource = extractFn("inferRelationsEffect");
const deriveSource = extractFn("derivedChoiceEffects");
if (!inferSource || !deriveSource) {
  throw new Error("Choice tradeoff helpers must include the relations dimension");
}

const api = new Function(
  "var CORRECT_GPA = 0.05;\n" + inferSource + "\n" + deriveSource + "\nreturn { derivedChoiceEffects };"
)();

function extractDepartments() {
  const marker = source.indexOf("var DEPARTMENTS = ");
  const from = source.indexOf("[", marker);
  let depth = 0;
  for (let i = from; i < source.length; i += 1) {
    if (source[i] === "[") depth += 1;
    if (source[i] === "]") {
      depth -= 1;
      if (depth === 0) return new Function("return " + source.slice(from, i + 1) + ";")();
    }
  }
  throw new Error("Cannot extract departments");
}

const departments = extractDepartments();
const byId = Object.fromEntries(departments.map((dept) => [dept.id, dept]));
for (const id of ["internal", "surgery", "emergency", "obgyn", "pediatrics", "urology"]) {
  const extension = require(path.join(ROOT, "depts", id + ".js"));
  const target = byId[id];
  for (const nextCase of extension.cases || []) {
    const current = target.cases.find((item) => item.title === nextCase.title);
    if (current) current.dialogue = nextCase.dialogue;
    else target.cases.push(nextCase);
  }
}

const failures = [];
let checked = 0;

function checkChoice(choice, tag) {
  const effects = api.derivedChoiceEffects(choice);
  const values = [
    effects.gpa || 0,
    effects.thinking || 0,
    effects.practice || 0,
    effects.relations || 0,
    choice.ethics || 0,
    choice.correct ? 0.05 : 0
  ];
  checked += 1;
  if (!values.some((value) => value > 0) || !values.some((value) => value < 0)) {
    failures.push(tag + " lacks a real gain/cost tradeoff: " + JSON.stringify({ text: choice.text, effects, ethics: choice.ethics || 0 }));
  }
}

for (const dept of departments) {
  for (const [caseIndex, currentCase] of dept.cases.entries()) {
    for (const [choiceIndex, choice] of (currentCase.choices || []).entries()) {
      checkChoice(choice, `${dept.id} case ${caseIndex + 1} decision ${choiceIndex + 1}`);
    }
    const nodes = currentCase.dialogue && currentCase.dialogue.nodes;
    for (const [nodeId, node] of Object.entries(nodes || {})) {
      for (const [choiceIndex, choice] of (node.choices || []).entries()) {
        checkChoice(choice, `${dept.id} case ${caseIndex + 1} ${nodeId} choice ${choiceIndex + 1}`);
      }
    }
  }
}

const principled = api.derivedChoiceEffects({
  text: "和家属一起解释风险并共同决定",
  effects: { gpa: 0.1, thinking: 5, practice: 3 },
  ethics: 3
});
if (!(principled.relations > 0) || ![principled.gpa, principled.thinking, principled.practice].some((value) => value < 0)) {
  failures.push("A relatively correct, relationship-aware choice should gain relations while paying another cost");
}

const accommodating = api.derivedChoiceEffects({ text: "先顺着家属把场面稳住", ethics: -2 });
if (!(accommodating.relations > 0) || accommodating.thinking !== undefined) {
  failures.push("An ethically questionable accommodating choice should gain relations without inventing a clinical effect");
}

if (failures.length) {
  console.error("FAIL: " + failures.length + " tradeoff problems across " + checked + " choices");
  failures.slice(0, 20).forEach((failure) => console.error("- " + failure));
  process.exit(1);
}

console.log("OK: " + checked + " choices all contain at least one gain and one cost, including relations");
