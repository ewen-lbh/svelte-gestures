import {
  DEFAULT_DELAY,
  DEFAULT_PRESS_SPREAD,
  setPointerControls,
  type SvelteAction,
  type SubGestureFunctions,
  type BaseParams,
  type PointerType,
  isConditionApplied,
} from './shared';

type PressParameters = {
  timeframe: number;
  triggerBeforeFinished: boolean;
  spread: number;
} & BaseParams;

export function press(
  node: HTMLElement,
  inputParameters?: Partial<PressParameters>
): SvelteAction | SubGestureFunctions {
  const parameters: PressParameters = {
    composed: false,
    conditionFor: ['touch' as PointerType],
    timeframe: DEFAULT_DELAY,
    triggerBeforeFinished: false,
    spread: DEFAULT_PRESS_SPREAD,
    touchAction: 'auto',
    ...inputParameters,
  };

  node.style.userSelect = 'none';
  node.oncontextmenu = (e) => {
    e.preventDefault();
  };

  const gestureName = 'press';

  let startTime: number;
  let clientX: number;
  let clientY: number;
  const clientMoved = { x: 0, y: 0 };
  let timeout: ReturnType<typeof setTimeout>;
  let triggeredOnTimeout = false;
  let triggered = false;

  function onDone(eventX: number, eventY: number, event: PointerEvent) {
    if (
      Math.abs(eventX - clientX) < parameters.spread &&
      Math.abs(eventY - clientY) < parameters.spread &&
      Date.now() - startTime > parameters.timeframe
    ) {
      const rect = node.getBoundingClientRect();
      const x = Math.round(eventX - rect.left);
      const y = Math.round(eventY - rect.top);

      triggered = true;
      node.dispatchEvent(
        new CustomEvent(gestureName, {
          detail: {
            x,
            y,
            target: event.target,
            pointerType: event.pointerType,
          },
        })
      );
    }
  }

  function onUp(activeEvents: PointerEvent[], event: PointerEvent) {
    clearTimeout(timeout);
    if (!triggeredOnTimeout) {
      onDone(event.clientX, event.clientY, event);
    }
  }

  function onMove(activeEvents: PointerEvent[], event: PointerEvent) {
    clientMoved.x = event.clientX;
    clientMoved.y = event.clientY;

    return !isConditionApplied(parameters.conditionFor, event) || triggered;
  }

  function onDown(activeEvents: PointerEvent[], event: PointerEvent) {
    triggered = false;
    clientX = event.clientX;
    clientY = event.clientY;
    startTime = Date.now();
    triggeredOnTimeout = false;
    clientMoved.x = event.clientX;
    clientMoved.y = event.clientY;

    if (parameters.triggerBeforeFinished) {
      timeout = setTimeout(() => {
        triggeredOnTimeout = true;

        onDone(clientMoved.x, clientMoved.y, event);
      }, parameters.timeframe + 1);
    }
  }

  const onSharedDestroy = setPointerControls(
    gestureName,
    node,
    onMove,
    onDown,
    onUp,
    parameters.touchAction
  );

  if (parameters.composed) {
    return { onMove, onDown, onUp };
  }

  return {
    destroy: () => {
      onSharedDestroy.destroy();
      clearTimeout(timeout);
    },
  };
}
