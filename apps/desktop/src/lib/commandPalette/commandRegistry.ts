import { editPatch } from '$lib/editMode/editPatchUtils';
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
			const { backend, projectId, page, uiState } = ctx;
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
			const branchName = uiState.project(projectId).workspaceSelection.current.branchName;

			try {
				// Use the new commit_insert_blank API
				const newCommitId = await backend.invoke<string>('commit_insert_blank', {
					projectId,
					relativeTo: { type: 'commit', subject: commitId },
					side: 'above'
				});

				// Select the newly created commit in both global and lane selection
				uiState.project(projectId).workspaceSelection.set({
					commitId: newCommitId,
					stackId,
					branchName
				});

				// Also update lane selection to open the detail panel
				uiState.lane(stackId).selection.set({
					branchName,
					commitId: newCommitId,
					upstream: false,
					previewOpen: true
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
			const { backend, projectId, page, uiState } = ctx;
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
			const branchName = uiState.project(projectId).workspaceSelection.current.branchName;

			try {
				// Use the new commit_insert_blank API
				const newCommitId = await backend.invoke<string>('commit_insert_blank', {
					projectId,
					relativeTo: { type: 'commit', subject: commitId },
					side: 'below'
				});

				// Select the newly created commit in both global and lane selection
				uiState.project(projectId).workspaceSelection.set({
					commitId: newCommitId,
					stackId,
					branchName
				});

				// Also update lane selection to open the detail panel
				uiState.lane(stackId).selection.set({
					branchName,
					commitId: newCommitId,
					upstream: false,
					previewOpen: true
				});

				chipToasts.success('Empty commit inserted below');
			} catch (error) {
				console.error('Failed to insert empty commit:', error);
				chipToasts.error('Failed to insert empty commit');
			}
		}
	},
	{
		id: 'commit.edit-selected',
		title: 'Edit Selected Commit',
		keywords: ['edit', 'commit', 'selected', 'message', 'patch', 'modify'],
		action: (ctx) => {
			const { projectId, uiState, page } = ctx;
			if (!projectId) return;

			// Check if we're in the workspace or branches view
			if (page.route.id !== '/[projectId]/workspace' && page.route.id !== '/[projectId]/branches') {
				chipToasts.info('This command is only available in the workspace or branches view');
				return;
			}

			// Get the currently selected commit
			const selection = getSelectedCommit(ctx);

			if (!selection) {
				chipToasts.warning('Please select a commit first');
				return;
			}

			const { commitId, stackId } = selection;
			const projectState = uiState.project(projectId);
			const branchName =
				page.route.id === '/[projectId]/workspace'
					? projectState.workspaceSelection.current.branchName
					: projectState.branchesSelection.current.branchName;

			if (!branchName) {
				chipToasts.warning('Could not determine branch name');
				return;
			}

			// Return submenu with edit options
			return [
				{
					id: 'edit-message',
					title: 'Edit Commit Message',
					description: 'Edit the commit message only',
					keywords: ['edit', 'message', 'commit'],
					action: ({ uiState, projectId }) => {
						if (!projectId) return;

						// Set exclusive action to edit commit message
						uiState.project(projectId).exclusiveAction.set({
							type: 'edit-commit-message',
							stackId,
							branchName,
							commitId
						});

						chipToasts.success('Editing commit message');
					}
				},
				{
					id: 'edit-commit',
					title: 'Edit Commit',
					description: 'Edit the commit contents (files and changes)',
					keywords: ['edit', 'commit', 'patch', 'files'],
					action: async ({ modeService, projectId }) => {
						if (!projectId) return;

						try {
							await editPatch({
								modeService,
								commitId,
								stackId,
								projectId
							});

							chipToasts.success('Entering edit mode');
						} catch (error) {
							console.error('Failed to enter edit mode:', error);
							chipToasts.error('Failed to enter edit mode');
						}
					}
				}
			];
		}
	}
];
