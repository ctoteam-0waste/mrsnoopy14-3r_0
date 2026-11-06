// The Diwali theme is web-only (see Diwali.web.tsx); the apps render nothing.
export function DiwaliLights(_: { top?: number; compact?: boolean }) { return null; }
export function DiwaliDiyas(_: { count: number }) { return null; }
export function DiwaliEmbers(_: { count?: number }) { return null; }
export function DiwaliSparkles(_: { count?: number; from?: number }) { return null; }
export function DiwaliMarigolds() { return null; }
export function DiwaliRangoli(_: { wide: boolean }) { return null; }
export function DiwaliKandils(_: { wide: boolean; variant?: 'landing' | 'dashboard' }) { return null; }
export function DiwaliCursorSparks() { return null; }
export function DiwaliShimmerText(_: { text: string }) { return null; }
export function DiwaliCleanupCard(_: { onPress: () => void; isMobile?: boolean }) { return null; }
export function DiwaliCoinRangoli(_: { size: number; opacity?: number }) { return null; }
export function DiwaliGoldBorder(_: { delay?: number }) { return null; }
export function DiwaliBurst() { return null; }
export function useDiwaliCountUp(value: number, _enabled: boolean): [number, boolean] { return [value, false]; }
export function DiwaliDiyaTracker(_: { litDays: string[]; seenKey: string; onQuiz: () => void; onPickup: () => void; isMobile?: boolean }) { return null; }
export function DiwaliGreetingModal(_: { visible: boolean; name: string; pickups: number; onClose: () => void }) { return null; }
export function DiwaliHeaderDecor(_: { wide: boolean }) { return null; }
export function DiwaliStrip(_: { onPress: () => void }) { return null; }
export function useDiwaliOncePerTab(_key: string): boolean { return false; }
export function DiwaliBackdrop(_: { dark: boolean }) { return null; }
