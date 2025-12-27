import { chipToasts } from '@gitbutler/ui';
import type { Command } from '$lib/commandPalette/types';

export const COMMANDS: Command[] = [
	{
		id: 'project.switch',
		title: 'Switch Project',
		keywords: ['project', 'switch', 'change'],
		action: async ({ backend }) => {
			// Fetch projects from backend
			const projects = await backend.invoke('list_projects');

			// Return submenu items
			return projects.map((project: any) => ({
				id: project.id,
				title: project.title,
				description: project.path,
				keywords: [project.title, project.path],
				action: ({ goto }: any) => {
					goto(`/${project.id}`);
				}
			}));
		}
	},
	{
		id: 'branch.create',
		title: 'Create Branch',
		keywords: ['branch', 'create', 'new'],
		action: ({ shortcutService }) => shortcutService.trigger('create-branch')
	},
	{
		id: 'fetch.upstream',
		title: 'Fetch Upstream',
		keywords: ['fetch', 'upstream', 'remote', 'pull'],
		action: async ({ backend, projectId }) => {
			if (!projectId) return;
			await backend.invoke('fetch_from_remotes', { projectId });
		}
	},
	{
		id: 'integrate.upstream',
		title: 'Update Workspace',
		keywords: ['update', 'workspace', 'merge', 'upstream', 'integrate', 'pull', 'sync'],
		action: async ({ backend, projectId, shortcutService }) => {
			if (!projectId) return;

			// Check if there are upstream commits before opening the modal
			try {
				const baseBranch = await backend.invoke('get_base_branch_data', { projectId });
				const upstreamCommits = baseBranch?.behind ?? 0;

				if (upstreamCommits === 0) {
					// All up to date - show friendly message
					chipToasts.info('Workspace is up to date');
					return;
				}

				// There are upstream commits - open the modal
				shortcutService.trigger('integrate-upstream');
			} catch (error) {
				console.error('Failed to check upstream status:', error);
				// Still try to open the modal in case of error
				shortcutService.trigger('integrate-upstream');
			}
		}
	}
];
