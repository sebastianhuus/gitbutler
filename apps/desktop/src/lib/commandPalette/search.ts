import Fuse from 'fuse.js';
import type { Command, SubmenuItem } from '$lib/commandPalette/types';

const fuseOptions = {
	keys: ['title', 'keywords', 'group'],
	threshold: 0.4,
	includeScore: true
};

export function searchCommands(commands: Command[], query: string): Command[] {
	if (!query.trim()) return commands;

	const fuse = new Fuse(commands, fuseOptions);
	const results = fuse.search(query);
	return results.map((result) => result.item);
}

/**
 * Filter commands by search query while preserving the original order.
 * This is useful for recent commands where recency order should be maintained.
 */
export function filterCommandsPreservingOrder(commands: Command[], query: string): Command[] {
	if (!query.trim()) return commands;

	const fuse = new Fuse(commands, fuseOptions);
	const results = fuse.search(query);
	const matchingIds = new Set(results.map((result) => result.item.id));

	// Return commands in original order, filtered to only matching ones
	return commands.filter((cmd) => matchingIds.has(cmd.id));
}

/**
 * Search submenu items using the same fuzzy search logic.
 */
export function searchSubmenuItems(items: SubmenuItem[], query: string): SubmenuItem[] {
	if (!query.trim()) return items;

	const fuse = new Fuse(items, fuseOptions);
	const results = fuse.search(query);
	return results.map((result) => result.item);
}
