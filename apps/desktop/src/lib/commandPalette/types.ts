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

export type Command = {
	id: string;
	title: string;
	description?: string;
	action: (ctx: CommandAction) => void | Promise<void>;
	keywords?: string[];
};
