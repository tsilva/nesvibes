<script>
  export let ariaLabel = "";
  export let button = "";
  export let className = "";
  export let onLostCapture = () => {};
  export let onPress = () => {};
  export let onRelease = () => {};
  export let pressed = false;

  function handlePointerDown(event) {
    onPress(button, event);
  }

  function handlePointerUp(event) {
    onRelease(button, event);
  }
</script>

<button
  type="button"
  class={`${className} ${pressed ? "pressed" : ""}`.trim()}
  aria-label={ariaLabel}
  aria-pressed={pressed}
  on:pointerdown={handlePointerDown}
  on:pointerup={handlePointerUp}
  on:pointercancel={handlePointerUp}
  on:lostpointercapture={onLostCapture}
>
  <slot />
</button>
