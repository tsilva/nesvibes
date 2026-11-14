<script>
  import { EyeOff, Gamepad2, Joystick, Keyboard, Maximize2, Minimize2 } from "lucide-svelte";
  export let effectiveCanvasControlsMode;
  export let canToggleFullscreen;
  export let isFullscreen;
  export let cycleCanvasControlsMode;
  export let toggleFullscreenMode;

  function getCanvasControlsModeLabel(mode) {
    if (mode === "gamepad") {
      return "Touch gamepad overlay";
    }

    if (mode === "keys") {
      return "Keyboard overlay";
    }

    if (mode === "hidden") {
      return "Overlay hidden";
    }

    return "Controls overlay";
  }

  function getCanvasControlsModeIcon(mode) {
    if (mode === "gamepad") {
      return Joystick;
    }

    if (mode === "keys") {
      return Keyboard;
    }

    if (mode === "hidden") {
      return EyeOff;
    }

    return Gamepad2;
  }

</script>

            <div class="stage-toolbar">
              <button
                type="button"
                class="stage-toolbar-button controls-toggle"
                aria-label={`Switch controls overlay mode. Currently ${getCanvasControlsModeLabel(effectiveCanvasControlsMode).toLowerCase()}.`}
                title={`Controls overlay: ${getCanvasControlsModeLabel(effectiveCanvasControlsMode)}`}
                on:click={() => cycleCanvasControlsMode()}
              >
                <svelte:component this={getCanvasControlsModeIcon(effectiveCanvasControlsMode)} size={18} strokeWidth={2.25} aria-hidden="true" />
              </button>
              {#if canToggleFullscreen}
                <button
                  type="button"
                  class="stage-toolbar-button fullscreen-toggle"
                  aria-pressed={isFullscreen}
                  aria-label={isFullscreen ? "Exit fullscreen mode" : "Enter fullscreen mode"}
                  title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                  on:click={() => void toggleFullscreenMode()}
                >
                  {#if isFullscreen}
                    <Minimize2 size={18} strokeWidth={2.25} aria-hidden="true" />
                  {:else}
                    <Maximize2 size={18} strokeWidth={2.25} aria-hidden="true" />
                  {/if}
                </button>
              {/if}
            </div>
