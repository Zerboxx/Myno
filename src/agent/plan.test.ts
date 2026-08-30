import test from "node:test";
import assert from "node:assert/strict";

import {
  createInitialPlan,
  detectBuildIntent,
  detectHowToIntent,
  detectRefineTargetKind,
} from "./plan.js";

function skillOf(message: string): string {
  return createInitialPlan(message).selectedSkills?.primary.id ?? "none";
}

test("Arabic build request (the AGENTS NPC example) classifies as Roblox build", () => {
  const plan = createInitialPlan("اعمل NPC يطارد اللاعب ويقتله");

  assert.equal(plan.needsRoblox, true);
  assert.equal(plan.requiresBuild, true);
  assert.equal(plan.intent, "building");
  assert.equal(plan.refinementMode, false);
  assert.equal(plan.semanticRequest?.language, "mixed");
  assert.equal(skillOf("اعمل NPC يطارد اللاعب ويقتله"), "roblox-build");
});

test("Arabic shop build", () => {
  const plan = createInitialPlan("اعمل متجر في اللعبة معا نقود");

  assert.equal(plan.intent, "building");
  assert.equal(skillOf("اعمل متجر في اللعبة معا نقود"), "roblox-build");
});

test("mixed-language Admin UI build with behavior constraint stays a BUILD (no refinement)", () => {
  const message = "اعمل Admin UI وخليه لما أضغط عليه يفتح لوحة اللاعبين";

  const plan = createInitialPlan(message);

  assert.equal(plan.intent, "building");
  assert.equal(plan.refinementMode, false);
  assert.equal(plan.semanticRequest?.language, "mixed");
  assert.equal(skillOf(message), "roblox-build");
});

test("خلي الزرار ده أكبر is a VISUAL refinement of an existing button", () => {
  const message = "خلي الزرار ده أكبر شوية";

  const plan = createInitialPlan(message);

  assert.equal(plan.intent, "refinement");
  assert.equal(plan.refinementMode, true);
  assert.equal(plan.requiresBuild, true);
  assert.equal(plan.semanticRequest?.operation, "refine-visual");
  assert.equal(plan.semanticRequest?.scope, "visual");
  assert.equal(plan.semanticRequest?.target.kind, "typed");
  assert.equal(plan.semanticRequest?.requiresClarification, false);
  assert.equal(skillOf(message), "roblox-refinement");
});

test("make the panel cleaner is an English VISUAL refinement", () => {
  const message = "make the panel cleaner";

  const plan = createInitialPlan(message);

  assert.equal(plan.intent, "refinement");
  assert.equal(plan.refinementMode, true);
  assert.equal(plan.semanticRequest?.operation, "refine-visual");
  assert.equal(plan.semanticRequest?.target.kind, "typed");
  assert.equal(skillOf(message), "roblox-refinement");
});

test("make a cleaner panel (no existing target) is a fresh BUILD", () => {
  const message = "make a cleaner panel";

  const plan = createInitialPlan(message);

  assert.equal(plan.intent, "building");
  assert.equal(plan.refinementMode, false);
  assert.equal(skillOf(message), "roblox-build");
});

test("حسن اللعبة كلها is a FULL redesign", () => {
  const message = "حسن اللعبة كلها وخليها أفضل";

  const plan = createInitialPlan(message);

  assert.equal(plan.intent, "refinement");
  assert.equal(plan.semanticRequest?.scope, "full");
  assert.equal(plan.semanticRequest?.target.kind, "full-scope");
  assert.equal(plan.semanticRequest?.requiresClarification, false);
  assert.equal(skillOf(message), "roblox-full-refinement");
});

test("English edit request on a script resolves to refinement", () => {
  const message = "edit the script to make the boss faster";

  const plan = createInitialPlan(message);

  assert.equal(plan.intent, "refinement");
  assert.equal(plan.semanticRequest?.operation, "refine-behavior");
  assert.equal(skillOf(message), "roblox-refinement");
});

test("explaining Edit datamodel / Play mode never turns a build into a refinement", () => {
  const message =
    "أول خطوة: لو Roblox Studio شغال بوضع التشغيل (Play mode) وقفه الأول عشان نقدر نعدل على Edit datamodel، " +
    "وبعدين اعمل لوحة متصدرين تظهر على الشاشة تعرض اسم كل لاعب ونقاطه وسمّيها LeaderboardGui " +
    "من غير ما تعدل أو تحذف أي حاجة تانية";

  const plan = createInitialPlan(message);

  assert.equal(plan.intent, "building");
  assert.equal(plan.refinementMode, false);
  assert.equal(plan.needsRoblox, true);
  assert.equal(skillOf(message), "roblox-build");
});

test("Studio mode names are masked but a real refine hint still wins", () => {
  const message = "switch to edit mode then improve the leaderboard panel";

  const plan = createInitialPlan(message);

  assert.equal(plan.intent, "refinement");
  assert.equal(plan.semanticRequest?.scope, "behavior");
  assert.equal(skillOf(message), "roblox-refinement");
});

test("how-to questions never trigger build tooling even with build verbs", () => {
  const message = "ازاي أعمل متجر؟";

  const plan = createInitialPlan(message);

  assert.equal(detectHowToIntent(message.toLowerCase()), true);
  assert.equal(plan.intent, "analysis");
  assert.equal(plan.requiresBuild, false);
  assert.equal(plan.refinementMode, false);
});

test("debug request routes to roblox-debug", () => {
  const message = "السكربت فيه خطأ عايزك تصلحه";

  const plan = createInitialPlan(message);

  assert.equal(plan.intent, "debugging");
  assert.equal(plan.requiresVerification, true);
  assert.equal(skillOf(message), "roblox-debug");
});

test("test request routes to roblox-test", () => {
  const message = "اختبر اللعبة وشوف هل كل حاجة شغالة";

  const plan = createInitialPlan(message);

  assert.equal(plan.intent, "testing");
  assert.equal(skillOf(message), "roblox-test");
});

test("inspection request routes to roblox-inspection", () => {
  const message = "افحص اللي موجود في اللعبة دلوقتي";

  const plan = createInitialPlan(message);

  assert.equal(plan.intent, "inspection");
  assert.equal(skillOf(message), "roblox-inspection");
});

test("Arabic full read-only blocks build and stays non-destructive", () => {
  const message = "من فضلك متغيرش حاجة، فحسب عايز أشوف اللي موجود";

  const plan = createInitialPlan(message);

  assert.equal(plan.explicitReadOnly, true);
  assert.equal(plan.requiresBuild, false);
  assert.equal(plan.refinementMode, false);
});

test("Arabic scoped protection surfaces the protected target", () => {
  const message = "اعمل سرير بس متدخلش في البيت القديم";

  const plan = createInitialPlan(message);

  assert.equal(plan.requiresBuild, true);
  assert.ok(
    plan.protectedTargets.some((target) => target.startsWith("البيت")),
  );
});

test("filesystem coding request maps to filesystem domain and skill", () => {
  const message = "اكتب لي ملف جديد للدالة دي";

  const plan = createInitialPlan(message);

  assert.equal(plan.needsFiles, true);
  assert.equal(plan.needsRoblox, false);
  assert.equal(plan.semanticRequest?.domain, "filesystem");
  assert.equal(skillOf(message), "filesystem-ops");
});

test("plain Arabic chat stays general chat with no build tools", () => {
  const plan = createInitialPlan("السلام عليكم، عامل إيه");

  assert.equal(plan.intent, "chat");
  assert.equal(plan.needsRoblox, false);
  assert.equal(plan.requiresBuild, false);
  assert.equal(skillOf("السلام عليكم، عامل إيه"), "general-chat");
});

test("broad Roblox vocabulary is recognized (weapons, teams, leaderboard, saves)", () => {
  const messages = [
    "اعمل سلاح ودرع للجندي",
    "اعمل نظام فرق ولوحة المتصدرين",
    "افعل حفظ اللعبة في المتجر",
    "اعمل غرفة مع مصعد وبوابة في القلعة",
  ];

  for (const message of messages) {
    assert.equal(createInitialPlan(message).needsRoblox, true, message);
  }
});

test("detectRefineTargetKind handles named Latin targets for refinement", () => {
  assert.equal(
    detectRefineTargetKind("خلي AdminUI أحلى"),
    "named",
  );
});

test("detectBuildIntent understands Arabic build verbs", () => {
  assert.equal(detectBuildIntent("اعمل بيت"), true);
  assert.equal(detectBuildIntent("جهز لي منصة"), true);
});