/** Shared movement vector: arrows and WASD take the same collision-checked path. */
export const movementKeys: Record<string, { dx: number; dy: number }> = {
  KeyW: {dx:0,dy:-1}, ArrowUp: {dx:0,dy:-1},
  KeyA: {dx:-1,dy:0}, ArrowLeft: {dx:-1,dy:0},
  KeyS: {dx:0,dy:1}, ArrowDown: {dx:0,dy:1},
  KeyD: {dx:1,dy:0}, ArrowRight: {dx:1,dy:0},
};
export function isTextEntry(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && Boolean(target.closest('input,textarea,select,[contenteditable="true"]'));
}
