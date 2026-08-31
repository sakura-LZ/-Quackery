const fs = require("fs");
const vm = require("vm");

const source = fs.readFileSync("game.js", "utf8");
if (!source.includes('setText("ethic-val", Math.round(ethicPct))')) {
  throw new Error("HUD ethics summary must use the visible 0-100 ethics score");
}
if (!source.includes('m.gpa.toFixed(2) + " / 3.6"')) {
  throw new Error("HUD must display the 3.6 GPA ceiling");
}
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

const infer = extractFn("inferProfessionalEffects");
const match = extractFn("derivedChoiceEffects");
const handsOn = extractFn("isHandsOnClinicalAction");

if (!infer || !match) {
  throw new Error("Missing tradeoff helpers for visible choice feedback");
}

const context = { CORRECT_GPA: 0.05 };
vm.runInNewContext(handsOn + "\n" + infer + "\n" + match + "\nthis.derivedChoiceEffects = derivedChoiceEffects;", context);

const assessment = context.derivedChoiceEffects({ text: "先核实病史和检查依据", ethics: -2 });
const shortcut = context.derivedChoiceEffects({ text: "直接建立静脉通路并处理", ethics: 3 });
const explicit = context.derivedChoiceEffects({
  text: "完成穿刺和缝合操作",
  ethics: 5,
  effects: { gpa: 0.1, thinking: 6, practice: 3 }
});

if (!(assessment.thinking > 0) || !(assessment.practice < 0)) {
  throw new Error("Assessment choices should favor thinking regardless of ethics sign");
}
if (!(shortcut.practice > 0) || !(shortcut.thinking < 0)) {
  throw new Error("Action-first shortcuts should favor practice regardless of ethics sign");
}
if (explicit.thinking !== 6 || explicit.practice !== 3) {
  throw new Error("Explicit medical effects must remain authoritative");
}

console.log("OK: visible choice feedback derives professional effects independently from ethics");
