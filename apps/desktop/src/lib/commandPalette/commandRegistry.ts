import { chipToasts } from '@gitbutler/ui';
import type { Command, CommandAction } from '$lib/commandPalette/types';

/**
 * Helper to get the currently selected commit from the appropriate view.
 * Workspace view uses workspaceSelection, branches view uses branchesSelection.
 * Returns commitId and stackId if a commit is selected.
 */
function getSelectedCommit(ctx: CommandAction): {
	commitId: string;
	stackId: string;
} | null {
	const { projectId, uiState, page } = ctx;
	if (!projectId) return null;

	const projectState = uiState.project(projectId);

	// Read from the appropriate selection based on current route
	if (page.route.id === '/[projectId]/workspace') {
		// In workspace view: use workspace-specific selection
		const selection = projectState.workspaceSelection.current;
		if (selection.commitId && selection.stackId) {
			return {
				commitId: selection.commitId,
				stackId: selection.stackId
			};
		}
	} else if (page.route.id === '/[projectId]/branches') {
		// In branches view: use branches-specific selection
		const selection = projectState.branchesSelection.current;
		if (selection.commitId && selection.stackId) {
			return {
				commitId: selection.commitId,
				stackId: selection.stackId
			};
		}
	}

	return null;
}

export const COMMANDS: Command[] = [
	{
		id: 'project.switch',
		title: 'Switch Project',
		keywords: ['project', 'switch', 'change'],
		action: async ({ backend }) => {
			// Fetch projects from backend
			const projects = (await backend.invoke('list_projects')) as Array<{
				id: string;
				title: string;
				path: string;
			}>;

			// Return submenu items
			return projects.map((project) => ({
				id: project.id,
				title: project.title,
				description: project.path,
				keywords: [project.title, project.path],
				action: ({ goto }) => {
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
				const baseBranch = (await backend.invoke('get_base_branch_data', { projectId })) as
					| { behind?: number }
					| undefined;
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
	},
	{
		id: 'commit.insert-above',
		title: 'Insert Empty Commit Above',
		keywords: ['insert', 'empty', 'commit', 'above', 'blank'],
		action: async (ctx) => {
			const { backend, projectId, page } = ctx;
			if (!projectId) return;

			// Check if we're in the workspace view
			if (page.route.id !== '/[projectId]/workspace') {
				chipToasts.info('This command is only available in the workspace view');
				return;
			}

			// Get the currently selected commit from workspace selection
			const selection = getSelectedCommit(ctx);

			if (!selection) {
				chipToasts.warning('Please select a commit in the workspace first');
				return;
			}

			const { commitId, stackId } = selection;

			try {
				await backend.invoke('insert_blank_commit', {
					projectId,
					stackId,
					commitId,
					offset: -1 // -1 = above
				});
				chipToasts.success('Empty commit inserted above');
			} catch (error) {
				console.error('Failed to insert empty commit:', error);
				chipToasts.error('Failed to insert empty commit');
			}
		}
	},
	{
		id: 'commit.insert-below',
		title: 'Insert Empty Commit Below',
		keywords: ['insert', 'empty', 'commit', 'below', 'blank'],
		action: async (ctx) => {
			const { backend, projectId, page } = ctx;
			if (!projectId) return;

			// Check if we're in the workspace view
			if (page.route.id !== '/[projectId]/workspace') {
				chipToasts.info('This command is only available in the workspace view');
				return;
			}

			// Get the currently selected commit from workspace selection
			const selection = getSelectedCommit(ctx);

			if (!selection) {
				chipToasts.warning('Please select a commit in the workspace first');
				return;
			}

			const { commitId, stackId } = selection;

			try {
				await backend.invoke('insert_blank_commit', {
					projectId,
					stackId,
					commitId,
					offset: 1 // 1 = below
				});
				chipToasts.success('Empty commit inserted below');
			} catch (error) {
				console.error('Failed to insert empty commit:', error);
				chipToasts.error('Failed to insert empty commit');
			}
		}
	}
];
