export declare const SUITE_PACKAGE = "@michengai/dsh-codex-suite";
export declare const SUITE_MEMBER_PACKAGES: readonly ["@michengai/dsh-archive-manager", "@michengai/dsh-codex-ui", "@michengai/dsh-skills-manager", "@michengai/dsh-agency-agents", "@michengai/dsh-im-connect", "@michengai/dsh-automation"];
export declare const MANAGED_DEPENDENCIES: readonly [{
    readonly id: "experts";
    readonly packageName: "@michengai/dsh-agency-agents";
}, {
    readonly id: "skills";
    readonly packageName: "@michengai/dsh-skills-manager";
}, {
    readonly id: "archive";
    readonly packageName: "@michengai/dsh-archive-manager";
}, {
    readonly id: "im";
    readonly packageName: "@michengai/dsh-im-connect";
}, {
    readonly id: "schedule";
    readonly packageName: "@michengai/dsh-automation";
}, {
    readonly id: "btw";
    readonly packageName: "@michengai/dsh-btw";
}, {
    readonly id: "simplify";
    readonly packageName: "@michengai/dsh-simplify";
}, {
    readonly id: "pua";
    readonly packageName: "@michengai/dsh-pua";
}, {
    readonly id: "review";
    readonly packageName: "@michengai/dsh-code-review";
}, {
    readonly id: "pet";
    readonly packageName: "@michengai/dsh-codex-pet";
}, {
    readonly id: "market";
    readonly packageName: "dshmarket";
}];
export type ManagedDependencyId = typeof MANAGED_DEPENDENCIES[number]['id'];
export declare function managedDependency(id: string | null): typeof MANAGED_DEPENDENCIES[number] | undefined;
//# sourceMappingURL=dependencies.d.ts.map