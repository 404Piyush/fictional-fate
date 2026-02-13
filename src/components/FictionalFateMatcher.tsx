"use client";

import {
  AnimatePresence,
  motion,
  type Variants,
  useMotionValue,
  useTransform,
} from "framer-motion";
import {
  Copy,
  Heart,
  MessageCircle,
  RefreshCcw,
  Share2,
  ThumbsDown,
  ThumbsUp,
  Volume2,
  VolumeX,
} from "lucide-react";
import Image from "next/image";
import { type RefObject, useEffect, useMemo, useRef, useState } from "react";
import {
  ARCHETYPE_LABEL,
  COUPLES_DATA,
  type ArchetypeKey,
  type Question,
  QUESTIONS,
  type Weights,
} from "@/lib/fictional-fate-data";

type ScoreState = Record<ArchetypeKey, number>;

const INITIAL_SCORES: ScoreState = {
  obsidian: 0,
  radiant: 0,
  blueprint: 0,
  kinetic: 0,
  sentimental: 0,
};

type Phase = "intro" | "quiz" | "sim" | "result";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function mulberry32(seed: number) {
  let a = seed | 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWithSeed<T>(items: T[], seed: number) {
  const rand = mulberry32(seed);
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

function addWeights(scores: ScoreState, weights: Weights): ScoreState {
  return {
    obsidian: scores.obsidian + (weights.obsidian ?? 0),
    radiant: scores.radiant + (weights.radiant ?? 0),
    blueprint: scores.blueprint + (weights.blueprint ?? 0),
    kinetic: scores.kinetic + (weights.kinetic ?? 0),
    sentimental: scores.sentimental + (weights.sentimental ?? 0),
  };
}

function scoreToTopArchetype(scores: ScoreState): ArchetypeKey {
  const entries = Object.entries(scores) as Array<[ArchetypeKey, number]>;
  let best = entries[0];
  for (const entry of entries) {
    if (entry[1] > best[1]) best = entry;
  }
  return best[0];
}

function maxPossibleForArchetype(questions: Question[], key: ArchetypeKey) {
  return questions.reduce((sum, q) => {
    const left = q.left.weights[key] ?? 0;
    const right = q.right.weights[key] ?? 0;
    return sum + Math.max(0, left, right);
  }, 0);
}

function stableIndexFromScores(scores: ScoreState, mod: number) {
  const raw =
    Math.round(scores.obsidian * 97) +
    Math.round(scores.radiant * 101) +
    Math.round(scores.blueprint * 103) +
    Math.round(scores.kinetic * 107) +
    Math.round(scores.sentimental * 109);
  return mod === 0 ? 0 : Math.abs(raw) % mod;
}

function ConfettiBurst({ burstId }: { burstId: number }) {
  const pieces = useMemo(() => {
    const wobble = (burstId % 97) / 97;
    return Array.from({ length: 18 }).map((_, i) => {
      const angle = (Math.PI * 2 * i) / 18;
      const distance = 120 + wobble * 40 + Math.random() * 120;
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;
      const rotate = (Math.random() * 360 - 180) * 3;
      const delay = Math.random() * 0.08;
      const size = 6 + Math.round(Math.random() * 6);
      const colors = ["#ff4aa2", "#ff007a", "#ffd1e8", "#ff8ac7", "#ffffff"];
      const color = colors[Math.floor(Math.random() * colors.length)]!;
      return { x, y, rotate, delay, size, color };
    });
  }, [burstId]);

  return (
    <div className="pointer-events-none absolute inset-0 z-50 grid place-items-center">
      <div className="relative h-0 w-0">
        {pieces.map((p, i) => (
          <motion.span
            key={i}
            initial={{ x: 0, y: 0, opacity: 0, rotate: 0, scale: 0.8 }}
            animate={{
              x: p.x,
              y: p.y,
              opacity: [0, 1, 1, 0],
              rotate: p.rotate,
              scale: [0.9, 1, 1, 0.9],
            }}
            transition={{ duration: 0.9, ease: "easeOut", delay: p.delay }}
            className="absolute rounded-sm"
            style={{
              width: p.size,
              height: Math.max(4, Math.round(p.size * 0.75)),
              backgroundColor: p.color,
              boxShadow: "0 10px 30px rgba(255,0,122,0.18)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function FictionalFateMatcher() {
  const [runSeed, setRunSeed] = useState(() => Date.now());
  const questions = useMemo(() => shuffleWithSeed(QUESTIONS, runSeed).slice(0, 5), [runSeed]);
  const [phase, setPhase] = useState<Phase>("intro");
  const [index, setIndex] = useState(0);
  const scoresRef = useRef<ScoreState>(INITIAL_SCORES);
  const [lastJudge, setLastJudge] = useState<{
    id: number;
    text: string;
    direction: "left" | "right";
    choiceLabel: string;
  } | null>(null);
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
  const [lastDirection, setLastDirection] = useState<"left" | "right">("right");
  const [result, setResult] = useState<{
    archetypeKey: ArchetypeKey;
    compatibility: string;
    coupleId: string;
  } | null>(null);
  const [burstId, setBurstId] = useState<number | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [musicOn, setMusicOn] = useState(true);
  const [whyOpen, setWhyOpen] = useState(false);
  const [whyText, setWhyText] = useState("");

  const toastTimer = useRef<number | null>(null);
  const whyTimer = useRef<number | null>(null);
  const swipeLockRef = useRef(false);
  const swipeCooldownRef = useRef(0);
  const commitSwipeRef = useRef<(direction: "left" | "right") => void>(() => undefined);
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);
  const sfxPopRef = useRef<HTMLAudioElement | null>(null);
  const sfxWhooshRef = useRef<HTMLAudioElement | null>(null);
  const sfxDrumRef = useRef<HTMLAudioElement | null>(null);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-260, 260], [-16, 16]);
  const cardOpacity = useTransform(x, [-260, 0, 260], [0.65, 1, 0.65]);
  const leftGlowOpacity = useTransform(x, [-200, -40, 0], [1, 0.25, 0]);
  const rightGlowOpacity = useTransform(x, [0, 40, 200], [0, 0.25, 1]);
  const leftStampOpacity = useTransform(x, [-200, -80, 0], [1, 0.6, 0]);
  const rightStampOpacity = useTransform(x, [0, 80, 200], [0, 0.6, 1]);

  const teaserCouple = useMemo(() => COUPLES_DATA[0]!, []);

  const bgBlobs = useMemo(() => {
    const rand = mulberry32(152387);
    return Array.from({ length: 10 }).map((_, i) => {
      const size = 160 + Math.round(rand() * 240);
      const left = Math.round(rand() * 100);
      const top = Math.round(rand() * 100);
      const duration = 10 + rand() * 10;
      const delay = rand() * 2;
      const opacity = 0.15 + rand() * 0.2;
      const colors = ["#ff007a", "#ff4aa2", "#ffd1e8"];
      const color = colors[i % colors.length]!;
      return { size, left, top, duration, delay, opacity, color };
    });
  }, []);

  const cardContainerVariants: Variants = {
    initial: { opacity: 0, y: 20, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: (direction: "left" | "right") => ({
      opacity: 0,
      x: direction === "right" ? 460 : -460,
      rotate: direction === "right" ? 18 : -18,
      transition: { duration: 0.22 },
    }),
  };

  const current = questions[index];
  const next = questions[index + 1] ?? null;

  const matchCouple = useMemo(() => {
    if (!result) return null;
    return COUPLES_DATA.find((c) => c.id === result.coupleId) ?? null;
  }, [result]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const archetypeKeyRaw = params.get("a");
    const coupleIdRaw = params.get("c");
    const compatibilityRaw = params.get("p");
    if (!archetypeKeyRaw || !coupleIdRaw || !compatibilityRaw) return;

    const allowed: ArchetypeKey[] = ["obsidian", "radiant", "blueprint", "kinetic", "sentimental"];
    const archetypeKey = allowed.includes(archetypeKeyRaw as ArchetypeKey)
      ? (archetypeKeyRaw as ArchetypeKey)
      : null;
    const coupleExists = COUPLES_DATA.some((c) => c.id === coupleIdRaw);
    const parsed = Number.parseFloat(compatibilityRaw);
    const compatibility = Number.isFinite(parsed) ? clamp(parsed, 0, 99.9).toFixed(1) : null;

    if (!archetypeKey || !coupleExists || !compatibility) return;
    if (phase !== "intro" && phase !== "result") return;

    if (
      result &&
      result.archetypeKey === archetypeKey &&
      result.coupleId === coupleIdRaw &&
      result.compatibility === compatibility
    ) {
      return;
    }

    setResult({ archetypeKey, compatibility, coupleId: coupleIdRaw });
    setPhase("result");
    setHelpOpen(false);
    x.set(0);
  }, [phase, result, x]);

  useEffect(() => {
    const unlock = () => {
      setAudioEnabled(true);
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    swipeLockRef.current = false;
  }, [index, phase]);

  useEffect(() => {
    if (phase !== "quiz") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        commitSwipeRef.current("left");
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        commitSwipeRef.current("right");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [phase]);

  useEffect(() => {
    commitSwipeRef.current = commitSwipe;
  });

  useEffect(() => {
    if (!audioEnabled) return;
    const bg = bgMusicRef.current;
    if (!bg) return;
    bg.volume = 0.22;
    bg.muted = false;
    if (musicOn) void bg.play();
    else bg.pause();
  }, [audioEnabled, musicOn]);

  useEffect(() => {
    if (phase !== "result" || !matchCouple) return;
    setWhyOpen(true);
    setWhyText("");
    if (whyTimer.current) window.clearInterval(whyTimer.current);
    const full = matchCouple.whyYouMatch;
    let i = 0;
    whyTimer.current = window.setInterval(() => {
      i += 2;
      setWhyText(full.slice(0, i));
      if (i >= full.length) {
        if (whyTimer.current) window.clearInterval(whyTimer.current);
        whyTimer.current = null;
      }
    }, 22);
    return () => {
      if (whyTimer.current) window.clearInterval(whyTimer.current);
      whyTimer.current = null;
    };
  }, [phase, matchCouple]);

  function playSfx(ref: RefObject<HTMLAudioElement | null>, volume = 0.7) {
    if (!audioEnabled) return;
    const el = ref.current;
    if (!el) return;
    el.volume = volume;
    el.currentTime = 0;
    void el.play();
  }

  function stopSfx(ref: RefObject<HTMLAudioElement | null>) {
    const el = ref.current;
    if (!el) return;
    el.pause();
    el.currentTime = 0;
  }

  function showToast(text: string) {
    const id = Date.now();
    setToast({ id, text });
    playSfx(sfxPopRef, 0.6);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2400);
  }

  function reset() {
    setRunSeed(Date.now());
    setPhase("intro");
    setIndex(0);
    scoresRef.current = INITIAL_SCORES;
    setLastJudge(null);
    setToast(null);
    setResult(null);
    setBurstId(null);
    setHelpOpen(false);
    x.set(0);
  }

  function startQuiz() {
    setPhase("quiz");
    setHelpOpen(true);
  }

  function finalize(finalScores: ScoreState) {
    stopSfx(sfxDrumRef);
    const archetypeKey = scoreToTopArchetype(finalScores);
    const maxPossible = maxPossibleForArchetype(questions, archetypeKey);
    const ratio = maxPossible <= 0 ? 0.5 : clamp(finalScores[archetypeKey] / maxPossible, 0, 1);
    const base = 72 + ratio * 27;
    const fuzz = Math.random() * 6 - 3;
    const compatibility = clamp(base + fuzz, 66, 99.9).toFixed(1);

    const candidates = COUPLES_DATA.filter((c) => c.archetypeKey === archetypeKey);
    const pick = candidates[stableIndexFromScores(finalScores, candidates.length)] ?? candidates[0];

    setResult({
      archetypeKey,
      compatibility,
      coupleId: pick?.id ?? COUPLES_DATA[0]!.id,
    });
    setPhase("result");
    setBurstId(Date.now());
    playSfx(sfxPopRef, 0.75);
  }

  function commitSwipe(direction: "left" | "right") {
    if (phase !== "quiz") return;
    const now = Date.now();
    if (now < swipeCooldownRef.current) return;
    swipeCooldownRef.current = now + 450;
    if (swipeLockRef.current) return;
    swipeLockRef.current = true;
    const q = questions[index];
    if (!q) return;

    setLastDirection(direction);
    const picked = direction === "right" ? q.right : q.left;
    setLastJudge({
      id: Date.now(),
      text: picked.judge,
      direction,
      choiceLabel: picked.label,
    });

    playSfx(sfxWhooshRef, 0.55);
    if (direction === "right") setBurstId(Date.now());

    const nextScores = addWeights(scoresRef.current, picked.weights);
    scoresRef.current = nextScores;
    const isLast = index >= questions.length - 1;
    if (isLast) {
      setPhase("sim");
      playSfx(sfxDrumRef, 0.75);
      window.setTimeout(() => finalize(nextScores), 3000);
    } else {
      setIndex((i) => i + 1);
    }

    x.set(0);
  }

  function buildShareLink(r: { archetypeKey: ArchetypeKey; compatibility: string; coupleId: string }) {
    const url = new URL(window.location.href);
    url.searchParams.set("a", r.archetypeKey);
    url.searchParams.set("c", r.coupleId);
    url.searchParams.set("p", r.compatibility);
    return url.toString();
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "true");
        textarea.style.position = "fixed";
        textarea.style.top = "0";
        textarea.style.left = "0";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        textarea.setSelectionRange(0, textarea.value.length);
        const ok = document.execCommand("copy");
        document.body.removeChild(textarea);
        return ok;
      } catch {
        return false;
      }
    }
  }

  async function share() {
    if (!result) return;
    const link = buildShareLink(result);
    const text =
      `My canon event:\\n` +
      `Archetype: ${ARCHETYPE_LABEL[result.archetypeKey]}\\n` +
      `Compatibility: ${result.compatibility}%\\n` +
      `${link}\\n`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Fictional Fate",
          text,
          url: link,
        });
        showToast("Shared. Your timeline just shook.");
      } else {
        const ok = await copyText(link);
        showToast(ok ? "Link copied. Drop it in the group chat." : "Copy failed. Try again.");
      }
    } catch {
      const ok = await copyText(link);
      showToast(ok ? "Link copied. Drop it in the group chat." : "Sharing failed. Copy failed too.");
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-pink-50 via-white to-pink-100 text-slate-900">
      <audio ref={bgMusicRef} src="/audio/Pain.mp3" loop muted preload="auto" />
      <audio ref={sfxPopRef} src="/audio/pop.mp3" preload="auto" />
      <audio ref={sfxWhooshRef} src="/audio/whoosh.mp3" preload="auto" />
      <audio ref={sfxDrumRef} src="/audio/drum-roll.mp3" preload="auto" />

      <div className="pointer-events-none absolute inset-0">
        {bgBlobs.map((b, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full blur-[80px]"
            style={{
              width: b.size,
              height: b.size,
              left: `${b.left}%`,
              top: `${b.top}%`,
              backgroundColor: b.color,
              opacity: b.opacity,
              transform: "translate(-50%, -50%)",
            }}
            animate={{ y: [0, -18, 0], x: [0, 12, 0] }}
            transition={{ duration: b.duration, repeat: Infinity, ease: "easeInOut", delay: b.delay }}
          />
        ))}
      </div>

      {burstId ? <ConfettiBurst burstId={burstId} /> : null}

      <div
        className={`mx-auto flex min-h-screen w-full flex-col ${
          phase === "intro" ? "max-w-6xl px-4 py-10" : "max-w-none px-0 py-0"
        }`}
      >
        <header
          className={`flex items-center justify-end gap-4 ${
            phase === "intro" ? "" : "fixed right-4 top-4 z-40"
          }`}
        >
        </header>

        <AnimatePresence mode="popLayout">
          {lastJudge && phase === "quiz" ? (
            <motion.button
              key={lastJudge.id}
              type="button"
              onClick={() => setLastJudge(null)}
              initial={{
                opacity: 0,
                y: 18,
                x: lastJudge.direction === "right" ? 18 : -18,
                scale: 0.98,
                filter: "blur(8px)",
              }}
              animate={{ opacity: 1, y: 0, x: 0, scale: 1, filter: "blur(0px)" }}
              exit={{
                opacity: 0,
                y: 18,
                x: lastJudge.direction === "right" ? 18 : -18,
                scale: 0.98,
                filter: "blur(8px)",
              }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
              className="fixed bottom-6 left-1/2 z-40 w-[min(94vw,760px)] -translate-x-1/2 text-left"
            >
              <div
                className={`relative overflow-hidden rounded-3xl border bg-white/90 p-5 shadow-[0_34px_120px_rgba(255,0,122,0.18)] backdrop-blur sm:p-6 ${
                  lastJudge.direction === "right" ? "border-pink-200" : "border-slate-200"
                }`}
              >
                <div
                  className={`pointer-events-none absolute inset-0 opacity-60 ${
                    lastJudge.direction === "right"
                      ? "bg-[radial-gradient(circle_at_25%_30%,rgba(255,0,122,0.22),transparent_55%)]"
                      : "bg-[radial-gradient(circle_at_25%_30%,rgba(15,23,42,0.10),transparent_55%)]"
                  }`}
                />

                <div className="relative flex items-start gap-4">
                  <div
                    className={`grid h-12 w-12 flex-shrink-0 place-items-center rounded-2xl border shadow-sm ${
                      lastJudge.direction === "right"
                        ? "border-pink-200 bg-[#ff007a]/10 text-[#ff007a]"
                        : "border-slate-200 bg-slate-100 text-slate-700"
                    }`}
                  >
                    <MessageCircle className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-xs font-extrabold tracking-wide text-slate-600">
                        AI JUDGE
                      </div>
                      <div
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-extrabold tracking-wide ${
                          lastJudge.direction === "right"
                            ? "border-pink-200 bg-white text-[#ff007a]"
                            : "border-slate-200 bg-white text-slate-700"
                        }`}
                      >
                        {lastJudge.direction === "right" ? (
                          <ThumbsUp className="h-4 w-4" />
                        ) : (
                          <ThumbsDown className="h-4 w-4" />
                        )}
                        {lastJudge.direction === "right" ? "RELATABLE" : "NOT ME"}
                      </div>
                      <div className="truncate text-xs font-semibold text-slate-500">
                        {lastJudge.choiceLabel}
                      </div>
                    </div>

                    <div className="mt-2 text-lg font-extrabold leading-snug tracking-tight text-slate-900 sm:text-xl">
                      {lastJudge.text}
                    </div>

                    <div className="mt-3 text-xs font-semibold text-slate-500">
                      Tap to dismiss
                    </div>
                  </div>
                </div>
              </div>
            </motion.button>
          ) : null}
        </AnimatePresence>

        {phase !== "intro" ? (
          <button
            type="button"
            onClick={() => setMusicOn((prev) => !prev)}
            className="fixed bottom-6 left-6 z-40 inline-flex items-center gap-2 rounded-full border border-pink-200 bg-white/80 px-4 py-3 text-xs font-extrabold tracking-wide text-slate-800 shadow-sm backdrop-blur transition hover:bg-white"
          >
            {musicOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            {musicOn ? "Music on" : "Music off"}
          </button>
        ) : null}

        {phase === "intro" ? (
          <div className="mt-10 grid flex-1 grid-cols-1 items-center gap-10 lg:grid-cols-2">
            <div className="flex flex-col gap-5">
              <motion.div
                initial={{ opacity: 0, y: 10, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                className="flex flex-col gap-5"
              >
                <motion.h1
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="text-center text-4xl font-semibold leading-tight tracking-tight sm:text-6xl"
                >
                  <span style={{ fontFamily: "var(--font-cursive)" }} className="font-normal">
                    What’s your dating vibe?
                  </span>
                </motion.h1>
                <motion.div
                  animate={{ scale: [1, 1.02, 1] }}
                  transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
                  className="text-center text-base font-semibold text-slate-700"
                >
                  5 chaotic swipes. 1 archetype. 1 match reveal.
                </motion.div>
              </motion.div>
            </div>

            <div className="relative mx-auto w-full max-w-md">
              <motion.div
                aria-hidden
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="pointer-events-none absolute -inset-10 -z-10"
              >
                <motion.div
                  animate={{ rotate: [0, 6, -6, 0], scale: [1, 1.04, 1] }}
                  transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                  className="h-full w-full rounded-[56px] bg-[radial-gradient(circle_at_30%_20%,rgba(255,0,122,0.25),transparent_55%),radial-gradient(circle_at_70%_60%,rgba(255,138,199,0.22),transparent_60%)] blur-2xl"
                />
              </motion.div>

              <AnimatePresence mode="wait" custom={lastDirection}>
                <motion.div
                  key="intro-card"
                  initial={{ opacity: 0, y: 18, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 18, scale: 0.98 }}
                  className="relative overflow-hidden rounded-3xl border border-pink-200 bg-white/80 shadow-[0_24px_90px_rgba(255,0,122,0.18)] backdrop-blur"
                >
                  <div className="relative">
                    <motion.div
                      animate={{ scale: [1, 1.03, 1] }}
                      transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <Image
                        src={teaserCouple.imageUrl}
                        alt="Mystery match preview"
                        width={1200}
                        height={800}
                        className="h-[420px] w-full object-cover"
                        priority
                      />
                    </motion.div>
                    <div className="absolute inset-0 bg-gradient-to-t from-white via-white/10 to-transparent" />

                    <div className="absolute inset-0 grid place-items-center px-6">
                      <div className="rounded-[28px] border border-pink-200 bg-white/90 px-6 py-5 text-center shadow-[0_26px_90px_rgba(255,0,122,0.20)] backdrop-blur">
                        <div className="text-xs font-semibold tracking-wide text-slate-600">
                          Your match is loading…
                        </div>
                        <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                          <span style={{ fontFamily: "var(--font-cursive)" }} className="font-normal">
                            Your match is almost ready.
                          </span>
                        </div>
                        <div className="mt-2 text-sm font-semibold text-slate-700">
                          Swipe right = relatable • swipe left = not me.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-5">
                    <motion.button
                      type="button"
                      onClick={startQuiz}
                      whileHover={{ scale: 1.03, rotate: -0.5 }}
                      whileTap={{ scale: 0.98, rotate: 0.5 }}
                      className="relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-[#ff007a] via-[#ff4aa2] to-[#ff8ac7] px-6 py-4 text-base font-semibold text-white shadow-[0_26px_90px_rgba(255,0,122,0.28)] ring-1 ring-white/60 transition hover:opacity-95"
                    >
                      <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.45),transparent_55%)]" />
                      <motion.span
                        aria-hidden
                        initial={{ x: "-120%" }}
                        animate={{ x: "120%" }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                        className="pointer-events-none absolute inset-0 opacity-70"
                        style={{
                          background:
                            "linear-gradient(110deg, transparent 20%, rgba(255,255,255,0.55) 45%, transparent 70%)",
                        }}
                      />
                      <span
                        className="relative font-normal"
                        style={{ fontFamily: "var(--font-cursive)" }}
                      >
                        Start the quiz
                      </span>
                    </motion.button>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center px-4 pb-10 pt-28">
            <div className="relative w-full max-w-6xl">
              <AnimatePresence mode="wait" custom={lastDirection}>

              {phase === "quiz" && current ? (
                <motion.div
                  key={current.id}
                  variants={cardContainerVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  custom={lastDirection}
                  className="relative w-full"
                >
                  {next ? (
                    <div className="pointer-events-none absolute inset-0 -z-10 translate-y-4 scale-[0.98] rounded-3xl border border-pink-200 bg-white/60 shadow-sm backdrop-blur">
                      <div className="p-6 opacity-50">
                        <div className="text-xs font-semibold tracking-wide text-slate-500">Next</div>
                        <div className="mt-2 text-lg font-semibold text-slate-800">{next.prompt}</div>
                      </div>
                    </div>
                  ) : null}

                  <motion.div
                    style={{ x, rotate, opacity: cardOpacity }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.12}
                    dragSnapToOrigin
                    whileDrag={{ scale: 1.02 }}
                    onDragEnd={(_, info) => {
                      const threshold = 120;
                      if (info.offset.x > threshold) commitSwipe("right");
                      else if (info.offset.x < -threshold) commitSwipe("left");
                    }}
                    className="relative min-h-[78vh] overflow-hidden rounded-3xl border border-pink-200 bg-white/80 shadow-[0_34px_120px_rgba(255,0,122,0.18)] backdrop-blur sm:rounded-[44px]"
                  >
                    <motion.div
                      style={{ opacity: leftGlowOpacity }}
                      className="pointer-events-none absolute inset-0 bg-gradient-to-r from-slate-400/25 via-transparent to-transparent"
                    />
                    <motion.div
                      style={{ opacity: rightGlowOpacity }}
                      className="pointer-events-none absolute inset-0 bg-gradient-to-l from-[#ff007a]/30 via-transparent to-transparent"
                    />

                    <motion.div
                      style={{ opacity: leftStampOpacity }}
                      className="pointer-events-none absolute left-5 top-6 rotate-[-18deg] rounded-2xl border-2 border-slate-700/40 bg-white/75 px-3 py-2 text-sm font-extrabold tracking-wide text-slate-700 shadow-sm"
                    >
                      NOT ME
                    </motion.div>

                    <motion.div
                      style={{ opacity: rightStampOpacity }}
                      className="pointer-events-none absolute right-5 top-6 rotate-[18deg] rounded-2xl border-2 border-[#ff007a]/50 bg-white/75 px-3 py-2 text-sm font-extrabold tracking-wide text-[#ff007a] shadow-sm"
                    >
                      RELATABLE
                    </motion.div>

                    <div className="flex flex-col gap-6 p-7 sm:p-10">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="text-sm font-extrabold tracking-wide text-slate-800">
                            Q {index + 1}/{questions.length}
                          </div>
                          <div className="flex items-center gap-1.5">
                            {questions.map((q, i) => (
                              <span
                                key={q.id}
                                className={`h-2.5 w-2.5 rounded-full border ${
                                  i < index
                                    ? "border-pink-200 bg-[#ff007a]/80"
                                    : i === index
                                      ? "border-pink-200 bg-white"
                                      : "border-slate-200 bg-white/50"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <div className="text-sm font-semibold text-slate-600">Swipe ← / →</div>
                      </div>

                      <div className="h-2 w-full overflow-hidden rounded-full border border-pink-200 bg-white/60">
                        <motion.div
                          initial={false}
                          animate={{ width: `${Math.round(((index + 1) / questions.length) * 100)}%` }}
                          transition={{ type: "spring", stiffness: 260, damping: 26 }}
                          className="h-full rounded-full bg-gradient-to-r from-[#ff007a] to-[#ff8ac7]"
                        />
                      </div>

                      <div className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                        {current.prompt}
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="overflow-hidden rounded-2xl border border-pink-200 bg-white/70 shadow-sm">
                          <Image
                            src={current.left.imageUrl}
                            alt={current.left.label}
                            width={560}
                            height={320}
                            className="h-52 w-full object-cover sm:h-64"
                          />
                          <div className="p-4">
                            <div className="text-sm font-semibold text-slate-600">Swipe left</div>
                            <div className="mt-1 text-lg font-semibold">{current.left.label}</div>
                          </div>
                        </div>

                        <div className="overflow-hidden rounded-2xl border border-pink-200 bg-white/70 shadow-sm">
                          <Image
                            src={current.right.imageUrl}
                            alt={current.right.label}
                            width={560}
                            height={320}
                            className="h-52 w-full object-cover sm:h-64"
                          />
                          <div className="p-4 text-right">
                            <div className="text-sm font-semibold text-slate-600">Swipe right</div>
                            <div className="mt-1 text-lg font-semibold">{current.right.label}</div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => commitSwipe("left")}
                          className="inline-flex items-center justify-center gap-2 rounded-3xl border border-slate-200 bg-white/80 px-5 py-4 text-sm font-extrabold tracking-wide text-slate-800 shadow-sm backdrop-blur transition hover:bg-white"
                        >
                          <ThumbsDown className="h-5 w-5" />
                          Not me
                        </button>
                        <button
                          type="button"
                          onClick={() => commitSwipe("right")}
                          className="inline-flex items-center justify-center gap-2 rounded-3xl bg-gradient-to-r from-[#ff007a] to-[#ff8ac7] px-5 py-4 text-sm font-extrabold tracking-wide text-white shadow-[0_26px_90px_rgba(255,0,122,0.18)] transition hover:opacity-95"
                        >
                          <ThumbsUp className="h-5 w-5" />
                          Relatable
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              ) : null}

              {phase === "sim" ? (
                <motion.div
                  key="sim"
                  initial={{ opacity: 0, y: 14, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 14, scale: 0.98 }}
                  className="overflow-hidden rounded-3xl border border-pink-200 bg-white/80 p-8 text-center shadow-sm backdrop-blur"
                >
                  <motion.div
                    animate={{ scale: [1, 1.08, 1], opacity: [0.85, 1, 0.85] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                    className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#ff007a]/15 shadow-[0_20px_60px_rgba(255,0,122,0.18)]"
                  >
                    <Heart className="h-10 w-10 text-[#ff007a]" />
                  </motion.div>
                  <div className="mt-5 text-xl font-semibold font-[var(--font-display)]">
                    Simulation running…
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    Analyzing your aura. Checking your timeline. Calling the universe.
                  </div>

                  <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-pink-100">
                    <motion.div
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 3, ease: "easeInOut" }}
                      className="h-full rounded-full bg-gradient-to-r from-[#ff007a] to-[#ff8ac7]"
                    />
                  </div>
                </motion.div>
              ) : null}

              {phase === "result" && result && matchCouple ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 18, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="relative min-h-[78vh] overflow-hidden rounded-[44px] border border-pink-200 bg-white/70 shadow-[0_40px_160px_rgba(255,0,122,0.22)] backdrop-blur-lg"
                >
                  <div className="absolute inset-0">
                    <Image
                      src={matchCouple.imageUrl}
                      alt={matchCouple.coupleName}
                      fill
                      priority
                      sizes="(max-width: 1024px) 100vw, 1200px"
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-white/0 to-white/90" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(255,0,122,0.26),transparent_46%)]" />
                    <motion.div
                      aria-hidden
                      initial={{ x: "-30%" }}
                      animate={{ x: "130%" }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.8 }}
                      className="pointer-events-none absolute inset-y-0 left-0 w-1/3 opacity-35 blur-md"
                      style={{
                        background:
                          "linear-gradient(110deg, transparent 15%, rgba(255,255,255,0.8) 45%, transparent 70%)",
                      }}
                    />
                  </div>

                  <div className="relative flex min-h-[78vh] flex-col justify-between p-7 sm:p-10">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-4 py-2 text-xs font-extrabold tracking-wide text-slate-900 shadow-sm backdrop-blur">
                        <span className="h-2 w-2 rounded-full bg-[#ff007a]" />
                        MATCH UNLOCKED
                      </div>

                      <motion.div
                        initial={{ scale: 0.96, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 340, damping: 22 }}
                        className="rounded-3xl border border-white/60 bg-white/75 px-5 py-3 text-right shadow-sm backdrop-blur"
                      >
                        <div className="text-[11px] font-extrabold tracking-wide text-slate-700">
                          Compatibility
                        </div>
                        <div className="mt-0.5 text-4xl font-extrabold tracking-tight text-slate-900 font-[var(--font-display)] sm:text-5xl">
                          {result.compatibility}%
                        </div>
                      </motion.div>
                    </div>

                    <div className="mt-10 max-w-3xl">
                      <div className="text-xs font-extrabold tracking-wide text-white/90 drop-shadow">
                        {ARCHETYPE_LABEL[result.archetypeKey]}
                      </div>
                      <div className="mt-2 text-4xl font-extrabold leading-tight tracking-tight text-white drop-shadow sm:text-6xl">
                        <span style={{ fontFamily: "var(--font-cursive)" }} className="font-normal">
                          {matchCouple.coupleName}
                        </span>
                      </div>
                      <div className="mt-2 text-base font-semibold text-white/90 drop-shadow">
                        {matchCouple.from} • {matchCouple.compatibilityTagline}
                      </div>
                    </div>

                    <div className="mt-10 grid gap-4">
                      <button
                        type="button"
                        onClick={() => setWhyOpen(true)}
                        className="inline-flex items-center justify-center rounded-3xl border border-white/60 bg-white/75 px-5 py-4 text-sm font-extrabold tracking-wide text-slate-800 shadow-[0_26px_90px_rgba(255,0,122,0.16)] backdrop-blur transition hover:bg-white"
                      >
                        Open Emotional Analysis
                      </button>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={share}
                          className="inline-flex items-center justify-center gap-2 rounded-3xl bg-gradient-to-r from-[#ff007a] to-[#ff8ac7] px-5 py-4 text-sm font-extrabold tracking-wide text-white shadow-[0_26px_90px_rgba(255,0,122,0.22)] transition hover:opacity-95"
                        >
                          <Share2 className="h-5 w-5" />
                          Share Your Canon Event
                        </button>

                        <button
                          type="button"
                          onClick={reset}
                          className="inline-flex items-center justify-center gap-2 rounded-3xl border border-white/60 bg-white/70 px-5 py-4 text-sm font-extrabold tracking-wide text-slate-800 shadow-sm backdrop-blur transition hover:bg-white"
                        >
                          <RefreshCcw className="h-5 w-5" />
                          Reset Timeline
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (!result) return;
                          const link = buildShareLink(result);
                          void copyText(link).then((ok) => {
                            showToast(ok ? "Link copied. Now be insufferable." : "Copy failed. Try again.");
                          });
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-3xl border border-white/60 bg-white/70 px-5 py-4 text-sm font-extrabold tracking-wide text-slate-800 shadow-sm backdrop-blur transition hover:bg-white"
                      >
                        <Copy className="h-5 w-5" />
                        Copy Share Link
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : null}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {helpOpen && phase === "quiz" ? (
          <motion.div
            key="help-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-black/25 px-4"
            onClick={() => setHelpOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 14, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="w-full max-w-md rounded-3xl border border-pink-200 bg-white/90 p-6 text-slate-900 shadow-[0_26px_90px_rgba(255,0,122,0.22)] backdrop-blur"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="text-2xl font-normal"
                style={{ fontFamily: "var(--font-cursive)" }}
              >
                Quick rules
              </div>
              <div className="mt-3 grid gap-2 text-sm font-semibold text-slate-700">
                <div>Swipe right: Relatable</div>
                <div>Swipe left: Not me</div>
                <div>5 questions → match reveal</div>
              </div>
              <button
                type="button"
                onClick={() => setHelpOpen(false)}
                className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#ff007a] to-[#ff8ac7] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
              >
                Got it
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {whyOpen && phase === "result" && matchCouple ? (
          <motion.div
            key="why-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-black/35 px-4"
            onClick={() => setWhyOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="w-full max-w-2xl overflow-hidden rounded-[36px] border border-pink-200 bg-white/90 p-6 text-slate-900 shadow-[0_40px_160px_rgba(255,0,122,0.26)] backdrop-blur"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div
                    className="text-2xl font-normal"
                    style={{ fontFamily: "var(--font-cursive)" }}
                  >
                    Emotional Analysis
                  </div>
                  <div className="mt-1 text-xs font-extrabold tracking-wide text-slate-600">
                    Loading feelings… please do not refresh your timeline.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setWhyOpen(false)}
                  className="rounded-2xl border border-pink-200 bg-white px-4 py-2 text-xs font-extrabold tracking-wide text-slate-800 transition hover:bg-pink-50"
                >
                  Close
                </button>
              </div>

              <div className="mt-5 rounded-3xl border border-pink-200 bg-white/70 p-5 text-sm font-semibold leading-relaxed text-slate-800 shadow-sm backdrop-blur">
                {whyText}
                <motion.span
                  aria-hidden
                  animate={{ opacity: [0.2, 1, 0.2] }}
                  transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
                  className="ml-1 inline-block h-4 w-2 rounded-sm bg-[#ff007a]/70 align-middle"
                />
              </div>

              <button
                type="button"
                onClick={share}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-3xl bg-gradient-to-r from-[#ff007a] to-[#ff8ac7] px-5 py-4 text-sm font-extrabold tracking-wide text-white shadow-[0_26px_90px_rgba(255,0,122,0.22)] transition hover:opacity-95"
              >
                <Share2 className="h-5 w-5" />
                Share Link
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {toast ? (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            className="fixed bottom-6 left-1/2 z-50 w-[min(92vw,520px)] -translate-x-1/2 rounded-2xl border border-pink-200 bg-white/90 px-4 py-3 text-sm text-slate-800 shadow-[0_22px_70px_rgba(255,0,122,0.20)] backdrop-blur"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#ff007a]" />
                <span>{toast.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setToast(null)}
                className="rounded-full border border-pink-200 bg-white px-2.5 py-2 text-slate-700 transition hover:bg-pink-50"
                aria-label="Dismiss"
              >
                <span className="sr-only">Dismiss</span>
                <div className="h-4 w-4">×</div>
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
