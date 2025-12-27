import Fuse from 'fuse.js';
import type { Command } from './types';

const fuseOptions = {
	keys: ['title', 'keywords'],
	threshold: 0.4,
	includeScore: true
};

export function searchCommands(commands: Command[], query: string): Command[] {
	if (!query.trim()) return commands;

	const fuse = new Fuse(commands, fuseOptions);
	const results = fuse.search(query);
	return results.map((result) => result.item);
}
