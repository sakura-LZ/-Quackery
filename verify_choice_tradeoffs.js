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

const inferSource = extractFn("inferProfessionalEffects");
const deriveSource = extractFn("derivedChoiceEffects");
const handsOnSource = extractFn("isHandsOnClinicalAction");
if (!inferSource || !deriveSource || !handsOnSource) {
  throw new Error("Choice tradeoff helpers must derive professional effects independently from ethics");
}

const api = new Function(
  "var CORRECT_GPA = 0.05;\n" + handsOnSource + "\n" + inferSource + "\n" + deriveSource + "\nreturn { derivedChoiceEffects };"
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

function choiceVector(choice) {
  const effects = api.derivedChoiceEffects(choice);
  return [
    (effects.gpa || 0) + (choice.correct ? 0.05 : 0),
    effects.thinking || 0,
    effects.practice || 0,
    choice.ethics || 0,
    choice.harm ? -1 : 0,
    choice.risk ? -choice.risk.chance : 0
  ];
}

function checkDominance(choices, tag) {
  if (!choices || choices.length < 2) return;
  const vectors = choices.map(choiceVector);
  for (let worse = 0; worse < choices.length; worse += 1) {
    for (let better = 0; better < choices.length; better += 1) {
      if (worse === better) continue;
      const noWorse = vectors[better].every((value, index) => value >= vectors[worse][index]);
      const strictlyBetter = vectors[better].some((value, index) => value > vectors[worse][index]);
      if (noWorse && strictlyBetter) {
        failures.push(tag + " contains a dominated choice: " + JSON.stringify({
          dominated: choices[worse].text,
          dominant: choices[better].text,
          dominatedVector: vectors[worse],
          dominantVector: vectors[better]
        }));
        break;
      }
    }
  }
}

function checkChoice(choice, tag) {
  const effects = api.derivedChoiceEffects(choice);
  const values = [
    effects.gpa || 0,
    effects.thinking || 0,
    effects.practice || 0,
    choice.ethics || 0,
    choice.correct ? 0.05 : 0,
    choice.risk ? -1 : 0,
    choice.harm ? -1 : 0
  ];
  checked += 1;
  if (!effects.thinking && !effects.practice) {
    failures.push(tag + " does not affect clinical thinking or professional skill: " + JSON.stringify({ text: choice.text, effects }));
  }
  if (!values.some((value) => value > 0) || !values.some((value) => value < 0)) {
    failures.push(tag + " lacks a real gain/cost tradeoff: " + JSON.stringify({ text: choice.text, effects, ethics: choice.ethics || 0 }));
  }
}

for (const dept of departments) {
  for (const [caseIndex, currentCase] of dept.cases.entries()) {
    checkDominance(currentCase.choices || [], `${dept.id} case ${caseIndex + 1} decision`);
    for (const [choiceIndex, choice] of (currentCase.choices || []).entries()) {
      checkChoice(choice, `${dept.id} case ${caseIndex + 1} decision ${choiceIndex + 1}`);
    }
    const nodes = currentCase.dialogue && currentCase.dialogue.nodes;
    for (const [nodeId, node] of Object.entries(nodes || {})) {
      checkDominance(node.choices || [], `${dept.id} case ${caseIndex + 1} ${nodeId}`);
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
if (principled.thinking <= 5 || principled.practice >= 0) {
  failures.push("Respect and communication should improve judgment, not professional skill");
}

const handsOn = api.derivedChoiceEffects({
  text: "建立静脉通路并完成加压包扎",
  effects: { thinking: 1, practice: 4 },
  ethics: 1,
  risk: { chance: 0.2 }
});
if (handsOn.practice !== 4) {
  failures.push("Hands-on clinical action should retain professional skill gains");
}

const accommodating = api.derivedChoiceEffects({ text: "先顺着家属把场面稳住", ethics: -2 });
if (!accommodating.thinking || !accommodating.practice) {
  failures.push("Dialogue choices must affect professional metrics instead of changing ethics alone");
}

if (failures.length) {
  console.error("FAIL: " + failures.length + " tradeoff problems across " + checked + " choices");
  failures.slice(0, 20).forEach((failure) => console.error("- " + failure));
  process.exit(1);
}

console.log("OK: " + checked + " choices all contain a tradeoff and affect clinical thinking or professional skill");
