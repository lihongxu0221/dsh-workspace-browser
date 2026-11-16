export interface PredictionRouteChoice {
    provider: string;
    model: string;
    reasoningEffort?: string;
}
export declare const PREDICTION_ROUTE_STORAGE_KEY = "codex-ui.composer.prediction-route";
export declare function getPredictionRoute(): PredictionRouteChoice | null;
export declare function setPredictionRoute(choice: PredictionRouteChoice | null): void;
export declare function subscribePredictionRoute(listener: () => void): () => void;
//# sourceMappingURL=prediction-route-state.d.ts.map