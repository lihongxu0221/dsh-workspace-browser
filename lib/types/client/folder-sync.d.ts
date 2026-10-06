/** Load and save the `.dsh` folder layer. localStorage stays the live cache. */
import { type FolderLayer } from '../folder-layer.ts';
interface FolderStore {
    getSnapshot(): {
        extraFoldersByWorkspace?: Record<string, string[]>;
        primaryByWorkspace?: Record<string, string>;
    };
    subscribe(fn: () => void): () => void;
    actions: {
        installFolderLayer: (layer: FolderLayer) => void;
    };
}
/**
 * Union the home file into the viewing store, then keep the file current.
 * A missing route (plugin node half not active) leaves the local store alone.
 * @param store - the browser viewing-store instance.
 */
export declare function syncFolderLayer(store: FolderStore): void;
export {};
//# sourceMappingURL=folder-sync.d.ts.map