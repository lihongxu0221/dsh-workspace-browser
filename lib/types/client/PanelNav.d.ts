interface PanelNavProps {
    /** Persisted entry ids; unknown ids are ignored and new entries trail. */
    order: readonly string[];
    /** Entry ids kept outside the "more" accordion, in pin order. */
    pinned: readonly string[];
    onOrder: (order: readonly string[]) => void;
    onPinned: (pinned: readonly string[]) => void;
    t: (key: 'panels.toggle' | 'panels.conversation' | 'panels.more' | 'panels.pin' | 'panels.unpin') => string;
}
export declare function PanelNav({ order, pinned, onOrder, onPinned, t }: PanelNavProps): import("react").JSX.Element | null;
export {};
//# sourceMappingURL=PanelNav.d.ts.map