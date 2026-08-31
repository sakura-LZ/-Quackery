const fs = require("fs");
const path = require("path");

const source = fs.readFileSync(path.join(__dirname, "game.js"), "utf8");

function extractFn(name) {
  const signature = "function " + name + "(";
  const start = source.indexOf(signature);
  if (start < 0) throw new Error("Missing function: " + name);
  const bodyStart = source.indexOf("{", start);
  let depth = 0;
  for (let i = bodyStart; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    if (source[i] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error("Unclosed function: " + name);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

const runtime = new Function(
  "clamp",
  "var state = null; var CORRECT_GPA = 0.05;" +
    extractFn("normalizeMetrics") + "\n" +
    extractFn("applyGpaDelta") + "\n" +
    extractFn("isHandsOnClinicalAction") + "\n" +
    extractFn("inferProfessionalEffects") + "\n" +
    extractFn("derivedChoiceEffects") + "\n" +
    extractFn("applyChoiceEffects") + "\n" +
    extractFn("determineEnding") + "\n" +
    "return {" +
      "setState: function (next) { state = next; }," +
      "normalizeMetrics: normalizeMetrics," +
      "applyChoiceEffects: applyChoiceEffects," +
      "determineEnding: determineEnding" +
    "};"
)(clamp);

function makeState(overrides) {
  return Object.assign({
    metrics: { gpa: 2.1, thinking: 18, practice: 12 },
    ethics: 0,
    harmCount: 0,
    owned: []
  }, overrides || {});
}

const high = makeState({ metrics: { gpa: 3.59, thinking: 99, practice: 99 } });
runtime.setState(high);
runtime.applyChoiceEffects({
  text: "完成穿刺和缝合操作",
  effects: { gpa: 8, thinking: 20, practice: 30 },
  ethics: -1,
  correct: true,
  harm: false
});
if (high.metrics.gpa > 3.6 || high.metrics.gpa <= 3.59 || high.metrics.thinking !== 100 || high.metrics.practice !== 100) {
  throw new Error("Choice settlement must approach but never exceed 3.6 and must cap professional metrics at 100");
}

const overflow = makeState({ metrics: { gpa: 9, thinking: 50, practice: 50 } });
runtime.normalizeMetrics(overflow.metrics);
if (overflow.metrics.gpa !== 3.6) {
  throw new Error("Loaded or legacy GPA values must be capped at 3.6");
}

const early = makeState({ metrics: { gpa: 2.1, thinking: 50, practice: 50 } });
const late = makeState({ metrics: { gpa: 3.4, thinking: 50, practice: 50 } });
const sameGain = {
  text: "完成穿刺操作",
  effects: { gpa: 0.2, thinking: -1, practice: 1 },
  ethics: 0
};
runtime.setState(early);
runtime.applyChoiceEffects(sameGain);
runtime.setState(late);
runtime.applyChoiceEffects(sameGain);
if (!((early.metrics.gpa - 2.1) > (late.metrics.gpa - 3.4))) {
  throw new Error("Positive GPA gains must slow down as GPA approaches 3.6");
}

const low = makeState({ metrics: { gpa: 0.01, thinking: 1, practice: 1 } });
runtime.setState(low);
runtime.applyChoiceEffects({
  text: "穿刺操作失败",
  effects: { gpa: -8, thinking: -20, practice: -30 },
  ethics: -1,
  correct: true,
  harm: true
});
if (low.metrics.gpa !== 0 || low.metrics.thinking !== 0 || low.metrics.practice !== 0) {
  throw new Error("Choice settlement must floor visible metrics at zero");
}

const weakHidden = makeState({
  metrics: { gpa: 4, thinking: 100, practice: 35 },
  ethics: 200,
  harmCount: 0,
  owned: new Array(12).fill("skill")
});
runtime.setState(weakHidden);
if (runtime.determineEnding() === "hidden") {
  throw new Error("Hidden ending must require both clinical thinking and professional skill");
}

const qualifiedHidden = makeState({
  metrics: { gpa: 3.5, thinking: 75, practice: 75 },
  ethics: 120,
  harmCount: 0,
  owned: new Array(12).fill("skill")
});
runtime.setState(qualifiedHidden);
if (runtime.determineEnding() !== "hidden") {
  throw new Error("A fully qualified zero-harm route should still unlock the hidden ending");
}

console.log("OK: metric bounds and hidden-ending competence requirements validated");
