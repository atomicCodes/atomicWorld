import { gsap } from "gsap";

const DIALOGUE_LINES = [
  "Signal detected. You are approaching the Atomic Core.",
  "I am a Code Sentinel — a boundary process between matter and meaning.",
  "Scroll to traverse code layers. Move to bend the particle field.",
  "Bring me a body (.glb) and emissive textures — I will materialize.",
];

export function createUI() {
  const root = document.querySelector(".dialogue");
  const textEl = document.getElementById("dialogueText");

  let open = false;
  let lineIndex = 0;
  let typingTween = null;

  function setOpen(next) {
    open = Boolean(next);
    root?.setAttribute("data-open", String(open));
  }

  function typeLine(line) {
    if (!textEl) return;
    if (typingTween) typingTween.kill();
    textEl.textContent = "";

    const state = { i: 0 };
    typingTween = gsap.to(state, {
      i: line.length,
      duration: Math.min(1.6, 0.04 * line.length),
      ease: "none",
      onUpdate: () => {
        textEl.textContent = line.slice(0, Math.floor(state.i));
      },
    });
  }

  function openDialogue() {
    lineIndex = 0;
    setOpen(true);
    typeLine(DIALOGUE_LINES[lineIndex]);
  }

  function nextLine() {
    if (!open) return;
    lineIndex = (lineIndex + 1) % DIALOGUE_LINES.length;
    typeLine(DIALOGUE_LINES[lineIndex]);
  }

  function closeDialogue() {
    setOpen(false);
  }

  function bindButtonActions(onAction) {
    document.addEventListener("click", (e) => {
      const btn = e.target?.closest?.("[data-action]");
      if (!btn) return;
      const action = btn.getAttribute("data-action");
      if (!action) return;

      if (action === "next-line") return nextLine();
      if (action === "close-dialogue") return closeDialogue();
      onAction?.(action);
    });
  }

  // Escape closes.
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDialogue();
  });

  return {
    openDialogue,
    closeDialogue,
    nextLine,
    bindButtonActions,
  };
}

