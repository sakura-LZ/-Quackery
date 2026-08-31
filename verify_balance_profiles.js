const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = __dirname;
const run = spawnSync(process.execPath, ["balance_sim.js"], {
  cwd: ROOT,
  encoding: "utf8"
});

if (run.status !== 0) {
  process.stderr.write(run.stderr || run.stdout || "balance_sim.js failed\n");
  process.exit(run.status || 1);
}

const resultPath = path.join(ROOT, "balance", "latest.json");
if (!fs.existsSync(resultPath)) {
  throw new Error("Virtual playtest must write balance/latest.json");
}

const result = JSON.parse(fs.readFileSync(resultPath, "utf8"));
const required = [
  "ethicsFirst",
  "scoreFirst",
  "thinkingFirst",
  "practiceFirst",
  "competenceFirst",
  "gpaFirst",
  "ethicsLast",
  "random"
];

for (const key of required) {
  const profile = result.profiles && result.profiles[key];
  if (!profile) throw new Error("Missing virtual playtest profile: " + key);
  if (profile.casesPerRun !== 30) throw new Error(key + " must complete all 30 cases");
  if (!(profile.runs >= 100)) throw new Error(key + " must use repeated seeded runs");
  for (const metric of ["score", "thinking", "practice", "gpa", "ethics", "harm"]) {
    if (!profile.metrics || !profile.metrics[metric] || typeof profile.metrics[metric].mean !== "number") {
      throw new Error(key + " is missing numeric summary for " + metric);
    }
  }
  if (profile.metrics.gpa.min < 0 || profile.metrics.gpa.max > 3.6) {
    throw new Error(key + " produced GPA outside 0-3.6");
  }
  if (profile.metrics.thinking.min < 0 || profile.metrics.thinking.max > 100) {
    throw new Error(key + " produced clinical thinking outside 0-100");
  }
  if (profile.metrics.practice.min < 0 || profile.metrics.practice.max > 100) {
    throw new Error(key + " produced professional skill outside 0-100");
  }
  if (profile.metrics.ethics.min < 0 || profile.metrics.ethics.max > 100) {
    throw new Error(key + " exposed ethics outside the visible 0-100 scale");
  }
  if (!profile.endings || Object.keys(profile.endings).length === 0) {
    throw new Error(key + " must report ending distribution");
  }
}

const p = result.profiles;
const expectations = [
  [p.ethicsFirst.metrics.ethics.mean >= p.random.metrics.ethics.mean, "Ethics-first should improve ethics"],
  [p.scoreFirst.metrics.score.mean >= p.random.metrics.score.mean, "Score-first should improve awakening score"],
  [p.thinkingFirst.metrics.thinking.mean >= p.random.metrics.thinking.mean, "Thinking-first should improve clinical thinking"],
  [p.practiceFirst.metrics.practice.mean >= p.random.metrics.practice.mean, "Practice-first should improve professional skill"],
  [p.competenceFirst.metrics.thinking.mean >= 70 && p.competenceFirst.metrics.practice.mean >= 70, "Competence-first should develop both professional dimensions"],
  [(p.competenceFirst.endings.hidden || 0) > 0, "Competence-first should prove the hidden ending is reachable"],
  [p.gpaFirst.metrics.gpa.mean >= p.random.metrics.gpa.mean, "GPA-first should improve GPA"],
  [p.gpaFirst.metrics.gpa.mean < 3.6, "Even GPA-first should approach rather than instantly fill the 3.6 ceiling"],
  [p.ethicsLast.metrics.ethics.mean <= p.random.metrics.ethics.mean, "Ethics-last should reduce ethics"]
];

for (const [passed, message] of expectations) {
  if (!passed) throw new Error(message);
}

console.log("OK: seeded virtual playtest compares 8 complete-game choice profiles and proves hidden-ending reachability");
