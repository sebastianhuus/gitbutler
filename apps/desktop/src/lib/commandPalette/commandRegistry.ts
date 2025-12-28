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
		shortcut: '⌘B',
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
		id: 'commit.edit-message',
		title: 'Edit Commit Message',
		keywords: ['edit', 'commit', 'message', 'rename', 'amend'],
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

			// Set exclusive action to edit commit message
			projectState.exclusiveAction.set({
				type: 'edit-commit-message',
				stackId,
				branchName,
				commitId
			});

			chipToasts.success('Editing commit message');
		}
	},
	{
		id: 'commit.edit',
		title: 'Edit Commit',
		keywords: ['edit', 'commit', 'patch', 'files', 'changes', 'modify'],
		action: async (ctx) => {
			const { projectId, modeService, page } = ctx;
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
	},
	{
		id: 'project.settings',
		title: 'Open Project Settings',
		keywords: ['project', 'settings', 'preferences', 'config', 'configuration'],
		action: ({ shortcutService, projectId }) => {
			if (!projectId) return;
			shortcutService.trigger('project-settings');
		}
	},
	{
		id: 'global.settings',
		title: 'Open Global Settings',
		shortcut: '⌘,',
		keywords: ['settings', 'preferences', 'global', 'general', 'config', 'configuration', 'app'],
		action: ({ shortcutService }) => shortcutService.trigger('global-settings')
	},
	{
		id: 'branch.open-in-browser',
		title: 'Open Branch in Browser',
		keywords: ['branch', 'open', 'browser', 'github', 'gitlab', 'remote', 'url'],
		action: async (ctx) => {
			const { projectId, stackService, forge, urlService, uiState, page } = ctx;
			if (!projectId) return;

			try {
				// Check if there's a currently selected commit
				const selection = getSelectedCommit(ctx);
				const projectState = uiState.project(projectId);

				// Get the current branch name from selection (if any)
				const currentBranchName =
					page.route.id === '/[projectId]/workspace'
						? projectState.workspaceSelection.current.branchName
						: page.route.id === '/[projectId]/branches'
							? projectState.branchesSelection.current.branchName
							: undefined;

				// If we have a selected commit and branch name, try to open it directly
				if (selection && currentBranchName) {
					const { stackId } = selection;

					// Fetch the branch details to check if it has a remote
					const stackDetails = await stackService.api.endpoints.stackDetails.fetch({
						projectId,
						stackId
					});

					if (stackDetails?.stackInfo?.branchDetails) {
						const branchDetail = stackDetails.stackInfo.branchDetails.find(
							(b) => b.name === currentBranchName
						);

						if (branchDetail?.remoteTrackingBranch) {
							// Branch is pushed, open it directly
							const branchUrl = forge.current.branch(branchDetail.name)?.url;
							if (branchUrl) {
								urlService.openExternalUrl(branchUrl);
								return; // Close palette
							}
						} else {
							chipToasts.info(`Branch "${currentBranchName}" has not been pushed yet`);
							return;
						}
					}
				}

				// No selection or branch not found - show submenu with all pushed branches
				// Fetch all stacks in the workspace (applied stacks only)
				const stacks = await stackService.fetchStacks(projectId);

				if (!stacks || stacks.length === 0) {
					chipToasts.info('No stacks found in workspace');
					return;
				}

				// Collect all branches from all stacks that have a remote tracking branch
				const branchItems: Array<{
					stackId: string;
					branchName: string;
					url: string;
					stackName: string;
				}> = [];

				// For each stack, fetch its details to get branch information
				for (const stack of stacks) {
					if (!stack.id) continue;

					try {
						// Fetch the stack details which contains branchDetails
						const stackDetails = await stackService.api.endpoints.stackDetails.fetch({
							projectId,
							stackId: stack.id
						});

						if (!stackDetails?.stackInfo?.branchDetails) continue;

						// For each branch in the stack that has a remote tracking branch
						for (const branchDetail of stackDetails.stackInfo.branchDetails) {
							if (!branchDetail.remoteTrackingBranch) continue;

							// Get the forge URL for this branch
							const branchUrl = forge.current.branch(branchDetail.name)?.url;
							if (!branchUrl) continue;

							branchItems.push({
								stackId: stack.id,
								branchName: branchDetail.name,
								url: branchUrl,
								stackName: stack.heads[0]?.name || 'Unknown'
							});
						}
					} catch (error) {
						console.error(`Failed to fetch details for stack ${stack.id}:`, error);
						// Continue with other stacks
					}
				}

				if (branchItems.length === 0) {
					chipToasts.info('No pushed branches found in workspace');
					return;
				}

				// Return submenu items for each branch
				return branchItems.map((item) => ({
					id: `${item.stackId}-${item.branchName}`,
					title: item.branchName,
					description: item.stackName !== item.branchName ? `Stack: ${item.stackName}` : undefined,
					keywords: [item.branchName, item.stackName],
					action: () => {
						urlService.openExternalUrl(item.url);
					}
				}));
			} catch (error) {
				console.error('Failed to fetch branches:', error);
				chipToasts.error('Failed to fetch branches');
			}
		}
	}
];
