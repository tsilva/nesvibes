import { Cartridge, NES } from "./nes.js";

const canvas = document.getElementById("screen");
const status = document.getElementById("status");

const BUTTON_MAP = new Map([
  ["KeyZ", "b"],
  ["KeyX", "a"],
  ["ShiftLeft", "select"],
  ["ShiftRight", "select"],
  ["Enter", "start"],
  ["ArrowUp", "up"],
  ["ArrowDown", "down"],
  ["ArrowLeft", "left"],
  ["ArrowRight", "right"],
]);

function setStatus(message) {
  status.textContent = message;
}

async function boot() {
  try {
    const romResponse = await fetch("./SuperMarioBros-Nes-v0.nes");
    if (!romResponse.ok) {
      throw new Error(`Unable to load ROM: HTTP ${romResponse.status}`);
    }

    const romBytes = new Uint8Array(await romResponse.arrayBuffer());
    const cartridge = Cartridge.fromINES(romBytes);
    const nes = new NES(cartridge, canvas);

    const setButton = (pressed, event) => {
      const button = BUTTON_MAP.get(event.code);
      if (!button) {
        return;
      }
      event.preventDefault();
      nes.setButton(button, pressed);
    };

    window.addEventListener("keydown", (event) => setButton(true, event));
    window.addEventListener("keyup", (event) => setButton(false, event));
    window.addEventListener("blur", () => nes.releaseAllButtons());

    let previousFrameTime = performance.now();
    let lag = 0;
    const frameDuration = 1000 / 60;
    let running = true;

    const frame = (now) => {
      if (!running) {
        return;
      }

      try {
        lag += Math.min(100, now - previousFrameTime);
        previousFrameTime = now;

        while (lag >= frameDuration) {
          nes.runFrame();
          lag -= frameDuration;
        }

        nes.present();
        requestAnimationFrame(frame);
      } catch (error) {
        console.error(error);
        setStatus(error instanceof Error ? error.message : String(error));
        running = false;
      }
    };

    setStatus("ROM booted. Press Enter to start.");
    requestAnimationFrame(frame);
  } catch (error) {
    console.error(error);
    setStatus(error instanceof Error ? error.message : String(error));
  }
}

boot();
