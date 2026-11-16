/**
 * Browser half of composer predictions (1:1 完整无损移植自 dsh-composer-predictions 1.2.8 原版源码)
 * 具备经真机验证的局部坐标测量、ResizeObserver / selectionchange 监听、流式 SSE 消费器与 Tab/Alt 按键拦截
 */
import React from 'react';
/** Show the model's first line while it is still streaming. */
declare function streamingCandidate(stream: string): string;
declare function cleanLine(line: string): string;
/**
 * Join a continuation onto the draft without gluing words together.
 * Avoid repeating a separator already present in the exact draft.
 */
declare function joinContinuation(draft: string, value: string): string;
/** Parse a fully buffered SSE body, for shells that cannot stream fetch bodies. */
declare function parseSseText(text: string): any[];
/** Read one SSE body and hand every `data:` payload to the callback. */
declare function consumeStream(body: any, signal: AbortSignal, onEvent: (ev: any) => void): Promise<boolean>;
declare const PREDICTION_PLACEHOLDER_HIDE_CSS = "[data-composer-card]:has([data-composer-prediction]) [data-composer-placeholder]{visibility:hidden !important;}";
export declare function ComposerPredictionOverlay(props: any): React.ReactElement<any, string | React.JSXElementConstructor<any>>;
export declare function renderPredictionGhost(options: {
    ghost: {
        mode: string;
        items: string[];
        index: number;
        active: boolean;
        stream?: string;
    };
    box: {
        top?: number;
        left?: number;
        width?: number;
        height?: number;
        maxWidth?: number;
    };
    current: string;
    t: (key: string) => string;
    anchor?: React.ReactNode;
}): React.ReactElement;
export { joinContinuation, parseSseText, streamingCandidate, cleanLine, consumeStream, PREDICTION_PLACEHOLDER_HIDE_CSS };
//# sourceMappingURL=ComposerPredictionOverlay.d.ts.map