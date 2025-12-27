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
		title: 'Merge Upstream',
		keywords: ['merge', 'upstream', 'integrate'],
		action: async ({ backend, projectId }) => {
			if (!projectId) return;
			await backend.invoke('integrate_upstream_commits', { projectId });
		}
	}
];
