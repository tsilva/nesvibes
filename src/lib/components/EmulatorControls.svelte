<script>
  import TouchControlButton from "#lib/components/TouchControlButton.svelte";
  import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Joystick } from "lucide-svelte";
  export let effectiveCanvasControlsMode;
  export let showJoystickOverlay;
  export let pressedButtons;
  export let joystickState;
  export let handleControllerPress;
  export let handleControllerRelease;
  export let handleJoystickPointerDown;
  export let handleJoystickPointerMove;
  export let handleJoystickPointerUp;
  export let handleJoystickLostCapture;
  export let setPressedButton;

  const BUTTON_KEY_LABELS = new Map([
    ["select", "Shift"],
    ["start", "Enter"],
    ["b", "Z"],
    ["a", "X"],
  ]);
  const TOUCH_DIRECTION_BUTTONS = [
    { button: "up", label: "Up", position: "up", icon: ArrowUp },
    { button: "left", label: "Left", position: "left", icon: ArrowLeft },
    { button: "right", label: "Right", position: "right", icon: ArrowRight },
    { button: "down", label: "Down", position: "down", icon: ArrowDown },
  ];
  const SYSTEM_BUTTONS = [
    { button: "select", label: "Select" },
    { button: "start", label: "Start" },
  ];
  const ACTION_BUTTONS = [
    { button: "b", label: "B", tone: "secondary" },
    { button: "a", label: "A", tone: "primary" },
  ];
  function getCanvasControlText(control, mode) {
    return mode === "keys"
      ? BUTTON_KEY_LABELS.get(control.button) ?? control.label
      : control.label;
  }

</script>

            <div class={`touch-controls active ${effectiveCanvasControlsMode === "keys" ? "keys-mode" : ""} ${showJoystickOverlay ? "gamepad-mode" : ""}`.trim()}>
              <div class="touch-cluster touch-system" role="group" aria-label="System buttons">
                {#each SYSTEM_BUTTONS as control (control.button)}
                  <TouchControlButton
                    ariaLabel={control.label}
                    button={control.button}
                    className="touch-button system"
                    pressed={pressedButtons[control.button]}
                    onPress={handleControllerPress}
                    onRelease={handleControllerRelease}
                    onLostCapture={() => setPressedButton(control.button, false)}
                  >
                    <span class="touch-button-label">{getCanvasControlText(control, effectiveCanvasControlsMode)}</span>
                  </TouchControlButton>
                {/each}
              </div>

              {#if showJoystickOverlay}
                <div class="touch-cluster touch-joystick-shell" role="group" aria-label="Analog directional pad">
                  <div
                    class={`touch-joystick ${joystickState.active ? "active" : ""}`.trim()}
                    aria-hidden="true"
                    on:pointerdown={handleJoystickPointerDown}
                    on:pointermove={handleJoystickPointerMove}
                    on:pointerup={handleJoystickPointerUp}
                    on:pointercancel={handleJoystickPointerUp}
                    on:lostpointercapture={handleJoystickLostCapture}
                  >
                    <span class="touch-joystick-base"></span>
                    <span class="touch-joystick-guide horizontal"></span>
                    <span class="touch-joystick-guide vertical"></span>
                    <span
                      class="touch-joystick-thumb"
                      style={`transform: translate(${joystickState.x}px, ${joystickState.y}px);`}
                    >
                      <Joystick size={24} strokeWidth={2.1} aria-hidden="true" />
                    </span>
                  </div>
                </div>
              {:else}
                <div class="touch-cluster touch-dpad" role="group" aria-label="Directional pad">
                  {#each TOUCH_DIRECTION_BUTTONS as control (control.button)}
                    <TouchControlButton
                      ariaLabel={control.label}
                      button={control.button}
                      className={`touch-button directional ${control.position}`.trim()}
                      pressed={pressedButtons[control.button]}
                      onPress={handleControllerPress}
                      onRelease={handleControllerRelease}
                      onLostCapture={() => setPressedButton(control.button, false)}
                    >
                      <span class="touch-button-label touch-button-icon" aria-hidden="true">
                        <svelte:component this={control.icon} size={18} strokeWidth={2.75} />
                      </span>
                    </TouchControlButton>
                  {/each}
                </div>
              {/if}

              <div class="touch-cluster touch-actions" role="group" aria-label="Action buttons">
                {#each ACTION_BUTTONS as control (control.button)}
                  <TouchControlButton
                    ariaLabel={control.label}
                    button={control.button}
                    className={`touch-button action ${control.button}`.trim()}
                    pressed={pressedButtons[control.button]}
                    onPress={handleControllerPress}
                    onRelease={handleControllerRelease}
                    onLostCapture={() => setPressedButton(control.button, false)}
                  >
                    <span class="touch-button-label">{getCanvasControlText(control, effectiveCanvasControlsMode)}</span>
                  </TouchControlButton>
                {/each}
              </div>
            </div>
