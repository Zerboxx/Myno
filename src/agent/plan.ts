import type { ModelCapability } from "../router/model-router.js";
import type { ToolGroup } from "../tools/registry.js";
import {
  detectFullReadOnlyIntent,
  detectScopedProtectionTargets,
} from "./studio-context.js";
import {
  mergeSkillGroups,
  selectSkills,
} from "./skills/select.js";
import type {
  Constraint,
  OperationKind,
  RefinementScope,
  SemanticDomain,
  SemanticIntent,
  SemanticRequest,
  TargetKind,
} from "./skills/types.js";
import type {
  AgentPlan,
  SuccessCriterion,
  TaskIntent,
} from "./execution-types.js";

/* ============================================================================
 * ARABIC INTENT KEYWORDS
 *
 * AGENTS.md defines the primary workflows in Arabic (e.g. "اعمل متجر",
 * "اعمل NPC يطارد اللاعب ويقتله", "اعمل خط أحمر لو اللاعب لمسه يموت").
 * English-only keyword detection silently classifies these requests as
 * plain chat, so Arabic build/test/debug/inspect verbs and Roblox domain
 * words are matched here as well.
 * ========================================================================== */

const ARABIC_BUILD_VERBS = [
  "اعمل",
  "اصنع",
  "أنشئ",
  "انشئ",
  "أضف",
  "اضف",
  "ضع",
  "صمم",
  "أنشأ",
  "انشأ",
  "سوي",
  "سوّي",
  "جهز",
  "جهّز",
];

/**
 * Writing/"author" verbs that describe PRODUCING code or content but must
 * not drag the request into Roblox domain detection by themselves —
 * "اكتب لي ملف" is a filesystem task, "اكتب سكربت سيرفر" is a Roblox
 * build. They participate in build detection only; scripting a
 * standalone file task still resolves to the filesystem skill via
 * needsFiles. Keep separate from ARABIC_BUILD_VERBS (which also feeds
 * detectRobloxIntent) precisely to preserve that distinction.
 */
const ARABIC_CODE_VERBS = [
  "اكتب",
  "أكتب",
];

/**
 * REFINEMENT = improve an EXISTING artifact ("خليها أحلى", "عدّل",
 * "حسّن"). Detected before build so the duplicate-protection skill wins
 * over a naive create. Quality adjectives AND improvement verbs live here;
 * the pure-refinement decision additionally requires either a resolvable
 * target reference or the absence of a create-at-start verb — so
 * "اعمل Admin UI... وخليه يفتح لوحة" stays a BUILD, while
 * "الزرار ده خليه أكبر" and "make the panel cleaner" become REFINEMENT.
 */
const ARABIC_REFINE_HINTS = [
  "أحسن",
  "احسن",
  "أحلى",
  "احلى",
  "أنضف",
  "انضف",
  "أفضل",
  "افضل",
  "أجمل",
  "اجمل",
  "أكبر",
  "اكبر",
  "أصغر",
  "اصغر",
  "أسرع",
  "اسرع",
  "أجمد",
  "اجمد",
  "جامد",
  "تحسين",
  "تطوير",
  "ترقية",
  "حسّن",
  "حسن",
  "طوّر",
  "طور",
  "عدّل",
  "تعديل",
  "حدّث",
  "تحديث",
  "غيّر",
  "نضّف",
  "نضف",
  "نظّف",
  "نظف",
];

const EN_REFINE_HINTS = [
  "improve",
  "improvement",
  "better",
  "faster",
  "quicker",
  "edit ",
  "prettier",
  "cleaner",
  "nicer",
  "smoother",
  "upgrade",
  "enhance",
  "polish",
  "refine",
  "refinement",
  "redesign",
  "refactor",
  "10x",
  "bigger",
  "smaller",
  "cooler",
  "more polished",
  "more beautiful",
];

/**
 * Which facet the refinement targets. Counts decide the scope; full-scope
 * markers win outright.
 */
const ARABIC_VISUAL_HINTS = [
  "شكل",
  "شكلها",
  "مظهر",
  "لون",
  "ألوان",
  "الوان",
  "حجم",
  "تصميم",
  "خط صغير",
  "أوسع",
  "اعرض",
  "طول",
  "عرض",
  "أكبر",
  "اكبر",
  "أصغر",
  "اصغر",
];

const EN_VISUAL_HINTS = [
  "look",
  "looks",
  "design",
  "style",
  "color",
  "colour",
  "colors",
  "colours",
  "appearance",
  "layout",
  "theme",
  "size",
  "width",
  "height",
  "aspect",
  "bigger",
  "smaller",
  "cleaner",
  "prettier",
  "nicer",
  "smoother",
  "polished",
];

const ARABIC_BEHAVIOR_HINTS = [
  "يفتح",
  "فتح",
  "تشغيل",
  "يشتغل",
  "شتغل",
  "يتحرك",
  "حركة",
  "يروح",
  "يوقف",
  "سلوك",
  "استجابة",
  "ضغطة",
  "تفاعل",
  "أسرع",
  "اسرع",
  "سرعة",
];

const EN_BEHAVIOR_HINTS = [
  "behavior",
  "behaviour",
  "click",
  "clicks",
  "clicking",
  "open",
  "opens",
  "press",
  "when i",
  "on click",
  "function",
  "works",
  "reacts",
  "interaction",
  "controls",
  "input",
  "faster",
  "quicker",
  "speed",
];

const ARABIC_LOGIC_HINTS = [
  "منطق",
  "أداء",
  "اداء",
  "سرعة التنفيذ",
];

const EN_LOGIC_HINTS = [
  "logic",
  "performance",
  "optimize",
  "optimise",
  "efficiency",
  "algorithm",
];

const ARABIC_FULL_SCOPE = [
  "كل حاجة",
  "كل شيء",
  "اللعبة كلها",
  "اللعبة كاملة",
  "المشروع كله",
  "كل حاجة في اللعبة",
  "كل شئ",
];

const EN_FULL_SCOPE = [
  "everything",
  "the whole game",
  "whole game",
  "the entire",
  "entire game",
  "10x",
  "from scratch",
  "big overhaul",
];

/**
 * Deictic / pronoun references that cannot be resolved without memory.
 * These make a refinement "requiresClarification" unless a noun also
 * identifies the target.
 */
const ARABIC_DEICTIC = [
  "ده",
  "دي",
  "ديه",
  "دة",
  "اللي فات",
];

const EN_DEICTIC_PATTERN =
  /\b(it|this|that|these|those)\b/;

/**
 * Generic Arabic nouns that usually identify an existing artifact when
 * they carry الـ ("الزرار", "اللوحة"). They make a refinement target
 * "typed" — inspectable rather than ambiguous.
 */
const ARABIC_TARGET_NOUNS = [
  "اللوحه",
  "اللوحة",
  "الزرار",
  "الزر",
  "الأزرار",
  "الازرار",
  "المفتاح",
  "الباب",
  "الحائط",
  "الجدار",
  "السكربت",
  "السكريبت",
  "الموديل",
  "البارت",
  "القائمة",
  "الليستة",
  "الشاشة",
  "النافذة",
  "الخريطة",
  "السيارة",
  "البيت",
  "المنزل",
  "الطريق",
  "المتجر",
  "المحل",
  "الفريق",
  "اللاعب",
  "الشخصية",
  "الوحش",
  "العدو",
  "الصندوق",
  "الحديقة",
  "الجسر",
  "المصعد",
  "اللعبة",
  "السيرفر",
  "الواجهة",
  "العنصر",
  "اللافتة",
];

const ARABIC_ROBLOX_WORDS = [
  "متجر",
  "محل",
  "شوب",
  "لعبة",
  "لاعب",
  "سكريبت",
  "سكربت",
  "سيرفر",
  "كود",
  "واجهة المستخدم",
  "واجهة",
  "جزء",
  "زرار",
  "زر",
  "أزرار",
  "لوحة",
  "شاشة",
  "npc",
  "خط أحمر",
  "حائط",
  "جدار",
  "باب",
  "سيارة",
  "سيف",
  "وحش",
  "عدو",
  "منزل",
  "بيت",
  "طريق",
  "جسر",
  "نفق",
  "مصعد",
  "باب صغير",
  "غرفة",
  "منصة",
  "منصات",
  "صندوق",
  "مفتاح",
  "نافذة",
  "سلاح",
  "مسدس",
  "بندقية",
  "درع",
  "صحة",
  "دم",
  "قلوب",
  "حياة",
  "ضرر",
  "قتال",
  "عدة",
  "مهارة",
  "مهارات",
  "قدرة",
  "قوة",
  "نقود",
  "فلوس",
  "عملة",
  "مخزون",
  "مهام",
  "مهمة",
  "مكافأة",
  "مكافآت",
  "مستويات",
  "مستوى",
  "تجربة",
  "نقاط",
  "فريق",
  "فرق",
  "لوحة المتصدرين",
  "حفظ اللعبة",
  "زومبي",
  "جندي",
  "حارس",
  "بوس",
  "زعيم",
  "الشخصية",
  "شخصية",
  "مطاردة",
  "يطارد",
  "يلاحق",
  "يتبع",
  "دورية",
  "مسار",
  "تخفي",
  "إضاءة",
  "نور",
  "ضوء",
  "سماء",
  "ماء",
  "نار",
  "دخان",
  "انفجار",
  "صوت",
  "موسيقى",
  "أنيميشن",
  "حركة",
  "أرض",
  "جبل",
  "شجرة",
  "بحيرة",
  "نهر",
  "حديقة",
  "جنينة",
  "سلم",
  "درج",
  "بوابة",
  "قلعة",
  "برج",
  "مبنى",
];

/* New English Roblox domain vocabulary, matched alongside the existing
 * inline patterns in detectRobloxIntent. */
const EN_ROBLOX_WORDS = [
  "roblox",
  "studio",
  "workspace",
  "player",
  "character",
  "npc",
  "gui",
  "startergui",
  "serverscriptservice",
  "replicatedstorage",
  "serverstorage",
  "localscript",
  "local script",
  "luau",
  "lua",
  "remoteevent",
  "remote event",
  "remotefunction",
  "remote function",
  "terrain",
  "gamepass",
  "obby",
  "part",
  "model",
  "instance",
  "spawn",
  "bed",
  "house",
  "weapon",
  "sword",
  "gun",
  "tool",
  "tools",
  "health",
  "damage",
  "hp",
  "respawn",
  "team",
  "currency",
  "coins",
  "money",
  "inventory",
  "shop",
  "quest",
  "mission",
  "datastore",
  "saves",
  "saving",
  "door",
  "elevator",
  "checkpoint",
  "light",
  "lighting",
  "sound",
  "audio",
  "music",
  "animation",
  "animate",
  "pathfinding",
  "patrol",
  "chase",
  "follow",
  "enemy",
  "boss",
  "combat",
  "ability",
  "leaderboard",
  "leaderstats",
  "clickdetector",
  "proximityprompt",
  "remote",
  "module",
  "screen gui",
  "textbutton",
  "frame",
  "hud",
  "gamemode",
  "gameplay",
  "game",
  "physics",
  "humanoid",
  "humanoidrootpart",
  "camera",
  "effects",
  "particles",
  "explosion",
  "fire",
  "map",
];

const ARABIC_TESTING_PHRASES = [
  "اختبر",
  "جرب",
  "شغل اللعبة",
  "شغّل اللعبة",
  "ابدأ اللعبة",
  "أوقف اللعبة",
  "اوقف اللعبة",
  "اختبر اللعبة",
  "جرب اللعبة",
];

const ARABIC_DEBUGGING_PHRASES = [
  "اصلح",
  "أصلح",
  "إصلاح",
  "لا يعمل",
  "عطل",
  "خلل",
  "مشكلة",
  "خطأ",
  "مش شغال",
  "بايظ",
  "باظ",
  "عطلان",
  "مكسور",
  "لا يشتغل",
];

const ARABIC_INSPECTION_PHRASES = [
  "افحص",
  "ابحث",
  "اعرض",
  "استعرض",
  "أرني",
  "ما هو موجود",
  "وريني",
  "عدّ",
  "اكشف",
  "عايز أشوف",
];

const ARABIC_PLANNING_PHRASES = [
  "خطط",
  "خطة",
  "تخطيط",
];

const ARABIC_ANALYSIS_PHRASES = [
  "تحليل",
  "حلل",
  "اشرح",
  "فحص",
];

const ARABIC_FILE_WORDS = [
  "ملف",
  "ملفات",
  "مجلد",
  "الكود",
  "اكتب",
];

const ARABIC_TERMINAL_PHRASES = [
  "تشغيل أمر",
  "نفذ الأمر",
  "نفّذ الأمر",
  "أوامر",
  "طرفية",
];

const ARABIC_DESTRUCTIVE_PHRASES = [
  "احذف",
  "حذف",
  "امسح",
  "أزل",
  "ازل",
  "إزالة",
  "احذف كل",
  "امسح كل",
  "مسح",
  "يمسح",
];

const ARABIC_EXPLANATION_PHRASES = [
  "اشرح",
  "شرح",
  "ما هو",
  "ما هي",
  "عرّفني",
  "وضح",
];

/**
 * "How do I...?" style requests that should be answered conceptually and
 * should NOT trigger actual build tooling even when they mention build
 * verbs ("كيف أعمل متجر؟" / "how do I make a shop?").
 */
const ARABIC_HOW_TO_PHRASES = [
  "ازاي",
  "إزاي",
  "كيف",
  "كيفية",
  "طريقة",
];

/**
 * Whole-word match so Arabic verbs do not collide with longer words
 * (e.g. "خطأ" vs. "خط أحمر", "وضع" vs. "ضع"). Arabic is space-delimited,
 * so this behaves like a word-boundary check.
 */
function matchesPhrase(
  text: string,
  phrase: string,
): boolean {
  return (
    text === phrase ||
    text.startsWith(`${phrase} `) ||
    text.includes(` ${phrase} `) ||
    text.endsWith(` ${phrase}`)
  );
}

export function createInitialPlan(message: string): AgentPlan {
  const normalized = message.toLowerCase();
  const conceptualOnly = isConceptualOnlyRequest(normalized);
  const howTo = detectHowToIntent(normalized);

  let needsRoblox = detectRobloxIntent(normalized);

  /*
   * Conceptual questions ("Explain what Roblox Studio is") mention
   * Roblox but do not need live MCP tools. Operational requests
   * ("List connected Roblox Studio instances") still do.
   */
  if (conceptualOnly) {
    needsRoblox = false;
  }

  const needsFiles = detectFileIntent(normalized);
  const needsTerminal = detectTerminalIntent(normalized);

  const explicitReadOnly = detectFullReadOnlyIntent(normalized);
  const protectedTargets = detectScopedProtectionTargets(normalized);
  const destructiveRequested = detectDestructiveIntent(normalized);

  /*
   * Refinement detection runs BEFORE build detection. The gating:
   *
   *   1. a refinement hint must exist (improvement verb or quality
   *      adjective: أحسن/أحلى/better/cleaner/عدّل/حسّن/بدّلت...), and
   *   2. either the user references an EXISTING target (الزرار ده, the
   *      panel, Admin UI), or the request does NOT start with a
   *      create-imperative verb (اعمل/اصنع/build/make/add...).
   *
   * This keeps the key mixed-language example — "اعمل Admin UI وخليه
   * لما أضغط عليه يفتح لوحة اللاعبين" — a BUILD (starts with "اعمل", no
   * quality hint) while "خلي الزرار ده أكبر" and "make the panel
   * cleaner" become REFINEMENT (target + hint), which routes work to the
   * duplicate-prevention skill instead of creating a new artifact.
   */
  const refinementHint = detectRefinementHint(normalized);
  const refineTarget = detectRefineTarget(message);
  const createAtStart = detectCreateAtStart(normalized);

  const pureRefinement =
    !conceptualOnly &&
    !howTo &&
    refinementHint &&
    (refineTarget.kind !== "none" || !createAtStart);

  const baseRequiresBuild =
    explicitReadOnly
      ? false
      : howTo
        ? false
        : detectBuildIntent(normalized);

  const requiresBuild = explicitReadOnly
    ? false
    : (baseRequiresBuild || pureRefinement);

  const requiresTesting = detectTestingIntent(normalized);
  const debugging = detectDebuggingIntent(normalized);
  const planning = detectPlanningIntent(normalized);
  const analysis = detectAnalysisIntent(normalized);
  const inspection = detectInspectionIntent(normalized);

  let intent: TaskIntent = conceptualOnly
    ? "chat"
    : howTo
      ? "analysis"
      : debugging
        ? "debugging"
        : pureRefinement
          ? "refinement"
          : requiresBuild
            ? "building"
            : requiresTesting
              ? "testing"
              : inspection || needsRoblox
                ? "inspection"
                : needsFiles
                  ? "coding"
                  : planning
                    ? "planning"
                    : analysis
                      ? "analysis"
                      : "chat";

  const capability = capabilityForIntent(intent);

  /*
   * Any Roblox-related request may need to inspect the live Studio state.
   *
   * This is intentionally broader than build/test/debug requests.
   */
  const requiresInspection = needsRoblox;

  /*
   * Verification is reserved for operations where we need to prove that
   * a build/test/refine/debug operation actually worked.
   */
  const requiresVerification =
    needsRoblox &&
    (requiresBuild || requiresTesting || debugging || pureRefinement);

  const domain: SemanticDomain = needsRoblox
    ? "roblox"
    : needsFiles
      ? "filesystem"
      : needsTerminal
        ? "terminal"
        : "general";

  const semanticRequest = buildSemanticRequest(normalized, message, {
    intent,
    domain,
    target: intent === "refinement" ? refineTarget : { kind: "none", label: "" },
    explicitReadOnly,
    protectedTargets,
    destructiveRequested,
  });

  const selection = selectSkills(semanticRequest);

  const baseGroups = resolveToolGroups({
    needsRoblox,
    needsFiles,
    needsTerminal,
    requiresInspection,
    requiresBuild,
    requiresTesting,
    requiresVerification,
  });

  const preferredToolGroups = mergeSkillGroups(
    selection,
    baseGroups,
    domain,
  );

  const successCriteria = buildSuccessCriteria({
    needsRoblox,
    requiresInspection,
    requiresBuild,
    requiresTesting,
    requiresVerification,
    needsFiles,
    needsTerminal,
  });

  for (const skill of [
    selection.primary,
    ...selection.adjuncts,
  ]) {
    for (const requirement of skill.verificationRequirements) {
      const description = requirement.description.toLowerCase();

      if (
        successCriteria.some(
          (criterion) =>
            criterion.description.toLowerCase() === description,
        )
      ) {
        continue;
      }

      successCriteria.push({
        id: `skill-${skill.id}-${successCriteria.length}`,
        description: requirement.description,
        required: requirement.required,
      });
    }
  }

  return {
    intent,
    capability,
    objective: message,

    needsRoblox,
    needsFiles,
    needsTerminal,

    requiresInspection,
    requiresBuild,
    requiresTesting,
    requiresVerification,

    destructiveRequested,
    explicitReadOnly,
    protectedTargets,

    successCriteria,

    preferredToolGroups,

    semanticRequest,
    selectedSkills: selection,
    refinementMode: pureRefinement,

    reason: needsRoblox
      ? pureRefinement
        ? "The task is a refinement of existing Roblox content."
        : "The task targets Roblox Studio or Roblox development."
      : needsFiles
        ? "The task targets project source files."
        : needsTerminal
          ? "The task requires terminal command execution."
          : "The task does not require direct Roblox execution.",
  };
}

/* ============================================================================
 * SEMANTIC REQUEST CONSTRUCTION
 * ========================================================================== */

/**
 * Studio/engine terms that contain refinement-looking words but describe
 * MODES or fixed product names, never an instruction to improve something.
 * "Edit datamodel", "Edit Mode", "Play mode" explain WHERE/WHEN to act;
 * "edit the script" tells WHAT to act on. These compounds must not make a
 * plain build request classify as a refinement, so they are masked out of
 * the text before refinement-hint matching.
 */
const INSTRUCTIONAL_NOISE_TERMS = [
  "edit datamodel",
  "edit mode",
  "play mode",
  "playtest",
  "test mode",
  "insert mode",
  "move mode",
  "scale mode",
];

/**
 * Detects the refinement/jamal family before build detection (see
 * createInitialPlan). Arabic hints are whole-word matched; English hints
 * are substring-matched. Studio mode/product names are masked first so
 * "stop Play mode, then build the leaderboard; we'll be in Edit datamodel"
 * never reads as "edit/improve something".
 */
function detectRefinementHint(text: string): boolean {
  const hintText = INSTRUCTIONAL_NOISE_TERMS.reduce(
    (acc, term) => acc.replaceAll(term, " "),
    text,
  );

  return (
    ARABIC_REFINE_HINTS.some((hint) => matchesPhrase(hintText, hint)) ||
    EN_REFINE_HINTS.some((hint) => hintText.includes(hint))
  );
}

/**
 * "How do I...?" style requests should be answered conceptually, never
 * by firing up build tooling ("كيف أعمل متجر؟").
 */
export function detectHowToIntent(text: string): boolean {
  return (
    /\b(how do|how to|how can|how would|how should)\b/.test(text) ||
    ARABIC_HOW_TO_PHRASES.some((phrase) => text.includes(phrase))
  );
}

/**
 * True when the request STARTS with a create-imperative verb. This is
 * one of the two refinement-vs-build deciders: a request that both
 * starts with "اعمل/build/make" AND has no existing-target reference is
 * treated as a fresh build even if it also praises quality.
 */
function detectCreateAtStart(text: string): boolean {
  const verbs = [
    ...ARABIC_BUILD_VERBS,
    "build",
    "create",
    "make",
    "add",
    "generate",
    "construct",
    "place",
    "insert",
    "design",
    "implement",
    "setup",
  ];

  const pattern = new RegExp(
    `^(?:please\\s+)?(?:${verbs.join("|")})\\b`,
    "i",
  );

  return pattern.test(text);
}

export function detectRefineTargetKind(text: string): TargetKind {
  return detectRefineTarget(text).kind;
}

/**
 * Best-effort classification of the artifact a refinement refers to.
 * Order matters: full-scope > named > typed > contextual > none.
 *
 * The named check needs the ORIGINAL casing (AdminUI, PlayersButton),
 * so this takes the raw message, not the lowercased form.
 */
function detectRefineTarget(
  message: string,
): { kind: TargetKind; label: string } {
  const text = message.toLowerCase();

  if (
    ARABIC_FULL_SCOPE.some((phrase) => text.includes(phrase)) ||
    EN_FULL_SCOPE.some((phrase) => text.includes(phrase))
  ) {
    return { kind: "full-scope", label: "the whole experience" };
  }

  const namedMatch = message.match(
    /\b[A-Z][A-Za-z0-9_]{1,31}\b/,
  );

  if (namedMatch) {
    return { kind: "named", label: namedMatch[0] };
  }

  const arabicNoun = ARABIC_TARGET_NOUNS.find((noun) =>
    text.includes(noun),
  );

  if (arabicNoun) {
    return { kind: "typed", label: arabicNoun };
  }

  const enTyped = text.match(
    /\b(?:the|my|this|that)\s+([a-z0-9][a-z0-9 _-]{1,30})/,
  );

  if (enTyped) {
    return { kind: "typed", label: enTyped[1].trim() };
  }

  const arabicDeictic = ARABIC_DEICTIC.some((word) =>
    matchesPhrase(text, word),
  );

  if (arabicDeictic || EN_DEICTIC_PATTERN.test(text)) {
    return { kind: "contextual", label: "the referenced artifact" };
  }

  return { kind: "none", label: "" };
}

/**
 * Determines which facet of refinement the user is targeting. Full-scope
 * markers always win; otherwise the most-mentioned facet wins (visual >
 * behavior > logic on ties). Defaults to "behavior" when no facet word
 * is recognized.
 */
function detectRefinementScope(
  text: string,
  target: { kind: TargetKind; label: string },
): RefinementScope {
  if (
    target.kind === "full-scope" ||
    ARABIC_FULL_SCOPE.some((phrase) => text.includes(phrase)) ||
    EN_FULL_SCOPE.some((phrase) => text.includes(phrase))
  ) {
    return "full";
  }

  const visual =
    ARABIC_VISUAL_HINTS.filter((hint) => text.includes(hint)).length +
    EN_VISUAL_HINTS.filter((hint) => text.includes(hint)).length;

  const behavior =
    ARABIC_BEHAVIOR_HINTS.filter((hint) => text.includes(hint)).length +
    EN_BEHAVIOR_HINTS.filter((hint) => text.includes(hint)).length;

  const logic =
    ARABIC_LOGIC_HINTS.filter((hint) => text.includes(hint)).length +
    EN_LOGIC_HINTS.filter((hint) => text.includes(hint)).length;

  if (visual > behavior && visual >= logic) {
    return "visual";
  }

  if (logic > visual && logic >= behavior) {
    return "logic";
  }

  if (behavior > visual || behavior > logic) {
    return "behavior";
  }

  return "behavior";
}

function operationForIntent(
  intent: SemanticIntent,
  scope: RefinementScope,
): OperationKind {
  switch (intent) {
    case "refinement":
      if (scope === "full") {
        return "refine";
      }

      if (scope === "visual") {
        return "refine-visual";
      }

      if (scope === "logic") {
        return "refine-logic";
      }

      return "refine-behavior";

    case "debugging":
      return "debug";

    case "testing":
      return "test";

    case "inspection":
      return "inspect";

    case "planning":
      return "plan";

    case "analysis":
      return "analyze";

    case "chat":
      return "chat";

    default:
      return "create";
  }
}

function detectLanguage(rawMessage: string): SemanticRequest["language"] {
  const hasArabic = /[\u0600-\u06FF]/.test(rawMessage);
  const hasLatin = /[A-Za-z]/.test(rawMessage);

  if (hasArabic && hasLatin) {
    return "mixed";
  }

  if (hasArabic) {
    return "ar";
  }

  if (hasLatin) {
    return "en";
  }

  return "other";
}

interface SemanticBuildInput {
  intent: SemanticIntent;
  domain: SemanticDomain;
  target: { kind: TargetKind; label: string };
  explicitReadOnly: boolean;
  protectedTargets: string[];
  destructiveRequested: boolean;
}

function buildSemanticRequest(
  normalized: string,
  rawMessage: string,
  input: SemanticBuildInput,
): SemanticRequest {
  const scope =
    input.intent === "refinement"
      ? detectRefinementScope(normalized, input.target)
      : "none";

  const constraints: Constraint[] = [];

  if (input.explicitReadOnly) {
    constraints.push({
      kind: "explicit-read-only",
      label: "Full read-only: do not modify/build/create anything.",
    });
  }

  for (const protectedTarget of input.protectedTargets) {
    constraints.push({
      kind: "scoped-protection",
      label: `Do not modify: ${protectedTarget}`,
    });
  }

  if (input.destructiveRequested) {
    constraints.push({
      kind: "destructive-requested",
      label: "The user explicitly requested destructive operations.",
    });
  }

  if (input.intent === "refinement") {
    constraints.push({
      kind: "preserve-unrelated",
      label:
        "Refine only what the user referenced; preserve everything else.",
    });
  }

  return {
    intent: input.intent,
    domain: input.domain,
    operation: operationForIntent(input.intent, scope),
    scope,
    target: {
      kind: input.target.kind,
      label: input.target.label,
    },
    requiresClarification:
      input.intent === "refinement" &&
      (input.target.kind === "contextual" ||
        (input.target.kind === "none" && scope !== "full")),
    preserveUnrelated: input.intent === "refinement",
    constraints,
    language: detectLanguage(rawMessage),
  };
}

export function detectCapability(message: string): ModelCapability {
  return createInitialPlan(message).capability;
}

export function capabilityForIntent(intent: TaskIntent): ModelCapability {
  switch (intent) {
    case "debugging":
      return "debugging";

    case "planning":
      return "planning";

    case "analysis":
    case "testing":
    case "inspection":
      return "analysis";

    case "coding":
    case "building":
    case "refinement":
      return "coding";

    default:
      return "chat";
  }
}

export function isConceptualOnlyRequest(text: string): boolean {
  if (
    /^(please\s+)?(explain|what is|what's|whats|what are|tell me about|how does|how do|how is)\b/.test(
      text,
    )
  ) {
    return true;
  }

  return ARABIC_EXPLANATION_PHRASES.some(
    (phrase) =>
      text.startsWith(phrase) ||
      text.startsWith(`${phrase} `) ||
      text.includes(` ${phrase} `),
  );
}

export function detectRobloxIntent(text: string): boolean {
  const buildVerbs = [
    "build ",
    "create ",
    "make ",
    "add ",
    "generate ",
    "construct ",
    "place ",
    "spawn ",
    "insert ",
  ];

  return (
    EN_ROBLOX_WORDS.some((word) => text.includes(word)) ||
    ARABIC_ROBLOX_WORDS.some((word) => text.includes(word)) ||
    /\bui\b/.test(text) ||
    /\bscripts?\b/.test(text) ||
    buildVerbs.some((verb) => text.startsWith(verb)) ||
    ARABIC_BUILD_VERBS.some((verb) => matchesPhrase(text, verb))
  );
}

export function detectBuildIntent(text: string): boolean {
  return [
    "build ",
    "create ",
    "make ",
    "add ",
    "generate ",
    "construct ",
    "place ",
    "spawn ",
    "insert ",
    "modify ",
    "change ",
    "update ",
    "design ",
    "implement ",
    "setup ",
    "set up ",
    "edit ",
    "tweak ",
    "adjust ",
    "configure ",
    "tune ",
  ].some((pattern) => text.includes(pattern)) ||
    ARABIC_BUILD_VERBS.some(
      (verb) => matchesPhrase(text, verb),
    ) ||
    ARABIC_CODE_VERBS.some(
      (verb) => matchesPhrase(text, verb),
    );
}

export function detectTestingIntent(text: string): boolean {
  return [
    "playtest",
    "play test",
    "run the game",
    "run game",
    "start game",
    "start play",
    "stop play",
    "test the game",
    "check if it works",
    "does it work",
  ].some((pattern) => text.includes(pattern)) ||
    ARABIC_TESTING_PHRASES.some(
      (phrase) => matchesPhrase(text, phrase),
    );
}

export function detectDebuggingIntent(text: string): boolean {
  return [
    "fix",
    "debug",
    "bug",
    "error",
    "broken",
    "not working",
    "doesn't work",
    "doesnt work",
    "repair",
    "crash",
    "exception",
  ].some((pattern) => text.includes(pattern)) ||
    ARABIC_DEBUGGING_PHRASES.some(
      (phrase) => matchesPhrase(text, phrase),
    );
}

export function detectInspectionIntent(text: string): boolean {
  return [
    "inspect",
    "look at",
    "find",
    "search",
    "show me",
    "show ",
    "list",
    "connected",
    "instances",
    "studio state",
    "current state",
    "what exists",
    "existing structure",
    "analyze the current",
  ].some((pattern) => text.includes(pattern)) ||
    ARABIC_INSPECTION_PHRASES.some(
      (phrase) => matchesPhrase(text, phrase),
    );
}

export function detectPlanningIntent(text: string): boolean {
  return [
    "plan",
    "roadmap",
    "architecture",
    "design the system",
    "how should we structure",
  ].some((pattern) => text.includes(pattern)) ||
    ARABIC_PLANNING_PHRASES.some(
      (phrase) => matchesPhrase(text, phrase),
    );
}

export function detectAnalysisIntent(text: string): boolean {
  return [
    "analyze",
    "analyse",
    "analysis",
    "evaluate",
    "explain",
  ].some((pattern) => text.includes(pattern)) ||
    ARABIC_ANALYSIS_PHRASES.some(
      (phrase) => matchesPhrase(text, phrase),
    );
}

export function detectFileIntent(text: string): boolean {
  return [
    "file",
    "folder",
    "directory",
    "filesystem",
    "source code",
    "package.json",
    "tsconfig",
    ".ts",
    ".js",
    "write code",
    "edit code",
    "read code",
  ].some((pattern) => text.includes(pattern)) ||
    ARABIC_FILE_WORDS.some((word) => text.includes(word));
}

export function detectTerminalIntent(text: string): boolean {
  return [
    "run command",
    "terminal",
    "powershell",
    "npm ",
    "node ",
    "git ",
    "execute command",
    "shell",
  ].some((pattern) => text.includes(pattern)) ||
    ARABIC_TERMINAL_PHRASES.some((phrase) =>
      text.includes(phrase),
    );
}

export function detectDestructiveIntent(text: string): boolean {
  return [
    "delete",
    "destroy",
    "remove",
    "wipe",
    "clear",
    "purge",
    "reset",
    "shutdown",
    "replace everything",
    "replace all",
    "start over",
    "remove all",
    "delete all",
    "destroy all",
  ].some((pattern) => text.includes(pattern)) ||
    ARABIC_DESTRUCTIVE_PHRASES.some(
      (phrase) => matchesPhrase(text, phrase),
    );
}

export function resolveToolGroups(input: {
  needsRoblox: boolean;
  needsFiles: boolean;
  needsTerminal: boolean;
  requiresInspection: boolean;
  requiresBuild: boolean;
  requiresTesting: boolean;
  requiresVerification: boolean;
}): ToolGroup[] {
  const groups = new Set<ToolGroup>();

  /*
   * Roblox inspection is the base Roblox capability.
   *
   * This means even a simple status/connection question can use:
   *   - roblox_get_studio_state
   *   - roblox_list_roblox_studios
   *   - roblox_inspect_instance
   *   - roblox_search_game_tree
   *   etc.
   */
  if (input.needsRoblox) {
    groups.add("roblox-inspection");

    if (input.requiresBuild) {
      groups.add("roblox-building");
      /*
       * Official Studio MCP often mutates via execute_luau rather
       * than a dedicated create_* tool. Keep execution available for
       * build workflows so the model can actually perform the change.
       */
      groups.add("roblox-execution");
    }

    if (input.requiresTesting || input.requiresVerification) {
      groups.add("roblox-execution");
    }
  }

  if (input.needsFiles) {
    groups.add("filesystem");
  }

  if (input.needsTerminal) {
    groups.add("terminal");
  }

  if (groups.size === 0) {
    groups.add("general");
  }

  return [...groups];
}

function buildSuccessCriteria(input: {
  needsRoblox: boolean;
  requiresInspection: boolean;
  requiresBuild: boolean;
  requiresTesting: boolean;
  requiresVerification: boolean;
  needsFiles: boolean;
  needsTerminal: boolean;
}): SuccessCriterion[] {
  const criteria: SuccessCriterion[] = [
    {
      id: "objective",
      description:
        "The user's requested outcome exists or has been truthfully determined impossible.",
      required: true,
    },
  ];

  if (input.needsRoblox) {
    criteria.push({
      id: "roblox-state",
      description:
        "The requested Roblox Studio state is actually present or has been truthfully inspected.",
      required:
        input.requiresBuild ||
        input.requiresTesting ||
        input.requiresVerification ||
        input.requiresInspection,
    });
  }

  if (input.requiresTesting) {
    criteria.push({
      id: "runtime",
      description:
        "The requested Roblox behavior has been runtime tested successfully.",
      required: true,
    });
  }

  if (input.needsFiles) {
    criteria.push({
      id: "files",
      description:
        "Requested source files exist with the intended contents.",
      required: true,
    });
  }

  if (input.needsTerminal) {
    criteria.push({
      id: "commands",
      description: "Requested commands execute successfully.",
      required: true,
    });
  }

  return criteria;
}