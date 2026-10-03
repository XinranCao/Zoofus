/** Zoofus — window.Zoofus. Types are documentation of the reference bundle. */
type ReactNode = any;
type TearSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type ColorToken = string; // a color token name, e.g. 'scrap', 'cream-100'

export interface TornOptions { size?: TearSize; amp?: number; res?: number; nick?: number; fiber?: number; edges?: 'trbl' | 'auto' | string; flush?: boolean; w?: number; h?: number }
export declare function tornPair(seed: string, opts?: TornOptions): { face: string; fiber: string };
export declare function tornClip(seed: string, opts?: TornOptions): string;
export declare function tornVars(seed: string, opts?: TornOptions): { '--clip': string; '--fclip': string };
export type PaletteName = string;
export interface PatternSpec { kind: 'solid' | 'stripes' | 'dots' | 'gingham' | 'check' | 'wave' | 'pixels' | 'doodle'; bg: PaletteName; ink?: PaletteName; scale?: number; angle?: number; weight?: number; pixels?: string[]; strokes?: string[] }
export interface StickerEdge { shape?: 'smooth' | 'wobbly' | 'torn'; scale?: number; fill?: PatternSpec }
export declare function patternSVG(spec: PatternSpec, w: number, h: number, k?: number): string;
export declare function dieCut(src: HTMLCanvasElement | ImageBitmap | HTMLImageElement, opts?: { shape?: 'smooth' | 'wobbly' | 'torn'; border?: number; color?: string; fill?: CanvasImageSource | null; fiber?: string; seed?: string }): HTMLCanvasElement;
export declare function stickerBorder(size: number, scale?: number): number;

export interface PaperProps { seed?: string; size?: TearSize; tone?: ColorToken; rotate?: number; edges?: 'trbl' | 'auto' | string; flush?: boolean; fiber?: boolean; fiberTone?: ColorToken; tape?: ReactNode; measure?: boolean; w?: number; h?: number; inline?: boolean; as?: string; className?: string; faceClass?: string; style?: object; faceStyle?: object; wrapperProps?: object; children?: ReactNode }
export interface TapeProps { seed?: string; pattern?: PatternSpec; color?: 'tape-mustard' | 'tape-celery' | 'tape-pink' | 'tape-apricot' | 'tape-gingham'; angle?: number; length?: number; thickness?: number; opacity?: number; ends?: 'torn' | 'cut' | 'pinked'; x?: string; y?: string }
export interface ScribbleProps { seed?: string; variant?: 'line' | 'wave' | 'dashed'; weight?: number }
export interface WordmarkProps { style?: object }
export interface MastheadProps { current?: 'make' | 'book'; signedOut?: boolean; name?: string; avatar?: string; menuOpen?: boolean }
export interface ButtonProps { variant?: 'primary' | 'secondary' | 'quiet' | 'danger'; size?: 'sm' | 'md' | 'lg'; icon?: string; disabled?: boolean; loading?: boolean; seed?: string; type?: 'button' | 'submit'; onClick?: () => void; children?: ReactNode; /** preview only */ state?: 'hover' | 'active' | 'focus' }
export interface ChipProps { selected?: boolean; disabled?: boolean; icon?: string; role?: 'radio'; seed?: string; onClick?: () => void; children?: ReactNode; state?: 'focus' }
export interface ToggleGroupProps { label: string; options: { value: string; label: string; icon?: string }[]; value?: string; onChange?: (v: string) => void; seed?: string }
export interface TextFieldProps { label: string; type?: string; value?: string; placeholder?: string; hint?: string; error?: string | null; disabled?: boolean; seed?: string; state?: 'focus' }
export interface SliderProps { label: string; value: number; min?: number; max?: number; step?: number; unit?: string; format?: (v: number) => string; onChange?: (v: number) => void; seed?: string; state?: 'focus' }
export interface ColorPickerProps { value?: ColorToken; colors?: (ColorToken | [ColorToken, string])[]; columns?: number; popover?: boolean; label?: string; onChange?: (token: ColorToken) => void }
export interface DialogProps { title: ReactNode; kicker?: ReactNode; width?: number; tone?: ColorToken; overlay?: boolean; tapes?: 1 | 2; actions?: ReactNode; seed?: string; children?: ReactNode }
export interface ToastProps { kind?: 'success' | 'error' | 'info'; title: ReactNode; action?: ReactNode; seed?: string; children?: ReactNode }
export interface TooltipProps { label: string; children: ReactNode }
export interface AvatarProps { name?: string; src?: string; size?: number; seed?: string; state?: 'focus' }
export interface AvatarMenuProps { name?: string; email?: string; src?: string }
export interface LoaderProps { variant?: 'typing' | 'reel' | 'skeleton'; label?: string; width?: number; height?: number; seed?: string }
export interface EmptyStateProps { title: ReactNode; kicker?: ReactNode; art?: ReactNode; action?: ReactNode; tone?: ColorToken; width?: number; seed?: string; children?: ReactNode }
export interface StickerProps { src?: string; art?: 'pear' | 'cherry' | 'cup' | 'star' | 'fish' | 'leaf'; size?: number; edge?: StickerEdge; borderColor?: ColorToken; borderScale?: number; rotate?: number; seed?: string; label?: string }
export interface StickerTileProps { name: string; art?: StickerProps['art']; size?: number; meta?: string; tape?: boolean; actions?: boolean; renaming?: boolean; borderColor?: ColorToken }
export interface LassoCanvasProps { mode?: 'select' | 'deselect'; shape?: 'free' | 'triangle' | 'rect' | 'star'; empty?: boolean; loading?: string | null }
export interface AuthPageProps { mode?: 'login' | 'signup1' | 'signup2'; error?: boolean; loading?: boolean; reset?: boolean }
export interface HomePageProps { menuOpen?: boolean }
export interface StickerMakerPageProps { stage?: 'empty' | 'loading' | 'error' | 'lasso' | 'result'; mode?: 'select' | 'deselect'; edgeShape?: StickerEdge['shape']; edgeFill?: PatternSpec }
export interface StickerBookPageProps { empty?: boolean; detail?: boolean; actionsOn?: number; renaming?: number }
export interface NotFoundPageProps {}
export interface PatternEditorProps { value?: Partial<PatternSpec>; onChange?: (spec: PatternSpec) => void; label?: string; kinds?: PatternSpec['kind'][]; seed?: string }
export interface TapeStudioProps { angle?: number; pattern?: PatternSpec }
export interface StickerEdgeStudioProps { art?: StickerProps['art']; size?: number; shape?: StickerEdge['shape']; scale?: number; fill?: PatternSpec; hideActions?: boolean }
export interface CJKSpecimenProps {}
