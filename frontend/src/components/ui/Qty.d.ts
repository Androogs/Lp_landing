interface QtyProps {
    value: number;
    onChange: (v: number) => void;
    min?: number;
}
/** Selector de cantidad (− n +) con los estilos .qty */
export declare function Qty({ value, onChange, min }: QtyProps): import("react").JSX.Element;
export {};
