import type { IBackend } from '$lib/backend';
import type { DefaultForgeFactory } from '$lib/forge/forgeFactory.svelte';
import type { ModeService } from '$lib/mode/modeService';
import type { ProjectsService } from '$lib/project/projectsService';
import type { UncommittedService } from '$lib/selection/uncommittedService.svelte';
import type { ShortcutService } from '$lib/shortcuts/shortcutService';
import type { StackService } from '$lib/stacks/stackService.svelte';
import type { UiState } from '$lib/state/uiState.svelte';
import type { UrlService } from '$lib/utils/url';
import type { Page } from '@sveltejs/kit';

export type CommandAction = {
	backend: IBackend;
	goto: (path: string) => void;
	projectId?: string;
	uiState: UiState;
	shortcutService: ShortcutService;
	page: Page;
	modeService: ModeService;
	forge: DefaultForgeFactory;
	urlService: UrlService;
	stackService: StackService;
	projectsService: ProjectsService;
	uncommittedService: UncommittedService;
};

/**
 * Command groups for organizing commands in the palette.
 * Commands with a group will display as "Group: Command Title"
 */
export type CommandGroup =
	| 'Project'
	| 'Branch'
	| 'Commit'
	| 'Git'
	| 'Settings'
	| 'Navigation'
	| 'Stack';

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
	/** Optional group for organizing commands (e.g., "Project", "Branch"). Displays as "Group: Title" */
	group?: CommandGroup;
	description?: string;
	action: (ctx: CommandAction) => CommandActionResult;
	keywords?: string[];
	/** Keyboard shortcut (e.g., "$mod+B", "⌘K") that will be formatted for the current platform */
	shortcut?: string;
};
