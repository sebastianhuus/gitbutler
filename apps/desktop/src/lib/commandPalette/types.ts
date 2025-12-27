import type { IBackend } from '$lib/backend';
import type { ShortcutService } from '$lib/shortcuts/shortcutService';
import type { UiState } from '$lib/state/uiState.svelte';

export type CommandAction = {
	backend: IBackend;
	goto: (path: string) => void;
	projectId?: string;
	uiState: UiState;
	shortcutService: ShortcutService;
};

/**
 * An item displayed in a submenu.
 * Can represent any selectable option (project, branch, commit, etc.)
 */
export type SubmenuItem = {
	/** Unique identifier for the item */
	id: string;
	/** Display title */
	title: string;
	/** Optional subtitle or description */
	description?: string;
	/** Optional keywords for search */
	keywords?: string[];
	/** Action to execute when item is selected */
	action: (ctx: CommandAction) => void | Promise<void>;
};

/**
 * Result of a command action.
 * - undefined/void: Execute and close palette (backward compatible)
 * - SubmenuItem[]: Show submenu with these items
 * - Promise<SubmenuItem[]>: Show loading, then submenu with items
 */
export type CommandActionResult = void | SubmenuItem[] | Promise<SubmenuItem[]>;

export type Command = {
	id: string;
	title: string;
	description?: string;
	action: (ctx: CommandAction) => CommandActionResult;
	keywords?: string[];
};
