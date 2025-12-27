import { chipToasts } from '@gitbutler/ui';
import type { Command, CommandAction } from '$lib/commandPalette/types';

/**
 * Helper to get the currently selected commit from either workspace view (lane selection)
 * or branches view (branchesSelection). Returns commitId and stackId if a commit is selected.
 */
function getSelectedCommit(ctx: CommandAction): {
	commitId: string;
	stackId: string;
} | null {
	const { projectId, uiState } = ctx;
	if (!projectId) return null;

	// Read from the global branchesSelection which is now updated by both
	// workspace view and branches view when commits are clicked
	const branchSelection = uiState.project(projectId).branchesSelection.current;

	if (branchSelection.commitId && branchSelection.stackId) {
		return {
			commitId: branchSelection.commitId,
			stackId: branchSelection.stackId
		};
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
	},
	{
		id: 'commit.insert-above',
		title: 'Insert Empty Commit Above',
		keywords: ['insert', 'empty', 'commit', 'above', 'blank'],
		action: async (ctx) => {
			const { backend, projectId } = ctx;
			if (!projectId) return;

			// Get the currently selected commit from either workspace or branches view
			const selection = getSelectedCommit(ctx);

			if (!selection) {
				chipToasts.warning('Please select a commit first');
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
			const { backend, projectId } = ctx;
			if (!projectId) return;

			// Get the currently selected commit from either workspace or branches view
			const selection = getSelectedCommit(ctx);

			if (!selection) {
				chipToasts.warning('Please select a commit first');
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
