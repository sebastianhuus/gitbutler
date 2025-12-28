<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { BACKEND } from '$lib/backend';
	import { COMMANDS } from '$lib/commandPalette/commandRegistry';
	import { searchCommands, searchSubmenuItems } from '$lib/commandPalette/search';
	import { DEFAULT_FORGE_FACTORY } from '$lib/forge/forgeFactory.svelte';
	import { MODE_SERVICE } from '$lib/mode/modeService';
	import { PROJECTS_SERVICE } from '$lib/project/projectsService';
	import { SHORTCUT_SERVICE } from '$lib/shortcuts/shortcutService';
	import { STACK_SERVICE } from '$lib/stacks/stackService.svelte';
	import { UI_STATE } from '$lib/state/uiState.svelte';
	import { URL_SERVICE } from '$lib/utils/url';
	import { inject } from '@gitbutler/core/context';
	import Textbox from '@gitbutler/ui/components/Textbox.svelte';
	import ScrollableContainer from '@gitbutler/ui/components/scroll/ScrollableContainer.svelte';
	import { focusable } from '@gitbutler/ui/focus/focusable';
	import { formatHotkeyForPlatform } from '@gitbutler/ui/utils/hotkeySymbols';
	import { portal } from '@gitbutler/ui/utils/portal';
	import type { Command, SubmenuItem } from '$lib/commandPalette/types';

	const backend = inject(BACKEND);
	const uiState = inject(UI_STATE);
	const shortcutService = inject(SHORTCUT_SERVICE);
	const modeService = inject(MODE_SERVICE);
	const forge = inject(DEFAULT_FORGE_FACTORY);
	const urlService = inject(URL_SERVICE);
	const stackService = inject(STACK_SERVICE);
	const projectsService = inject(PROJECTS_SERVICE);

	const projectId = $derived(page.params.projectId);
	const isOpen = $derived(uiState.global.commandPaletteOpen.current);

	// View state
	let viewMode = $state<'main' | 'submenu'>('main');
	let selectedCommand = $state<Command | undefined>(undefined);
	let submenuItems = $state<SubmenuItem[]>([]);
	let isLoadingSubmenu = $state(false);

	// Search state
	let searchQuery = $state('');
	let highlightedIndex = $state(0);
	let searchInputElement = $state<HTMLInputElement>();

	// Computed filtered items based on view mode
	const filteredItems = $derived.by(() => {
		if (viewMode === 'main') {
			return searchCommands(COMMANDS, searchQuery);
		} else {
			return searchSubmenuItems(submenuItems, searchQuery);
		}
	});

	// Computed recent and remaining commands for main view with no search
	const showSections = $derived(viewMode === 'main' && searchQuery.trim() === '');
	const recentCommandsList = $derived.by(() => {
		if (!showSections) return [];
		const recent = uiState.global.recentCommands.current || [];
		return recent
			.map((id) => COMMANDS.find((cmd) => cmd.id === id))
			.filter((cmd): cmd is Command => cmd !== undefined);
	});
	const remainingCommandsList = $derived.by(() => {
		if (!showSections) return [];
		const recent = uiState.global.recentCommands.current || [];
		return COMMANDS.filter((cmd) => !recent.includes(cmd.id));
	});

	// Reset all state when opening
	$effect(() => {
		if (isOpen) {
			viewMode = 'main';
			selectedCommand = undefined;
			submenuItems = [];
			isLoadingSubmenu = false;
			searchQuery = '';
			highlightedIndex = 0;
			// Focus search input
			setTimeout(() => searchInputElement?.focus(), 10);
		}
	});

	// Auto-scroll highlighted item into view
	$effect(() => {
		if (isOpen && highlightedIndex >= 0) {
			const element = document.querySelector(`[data-command-index="${highlightedIndex}"]`);
			element?.scrollIntoView({ block: 'nearest' });
		}
	});

	// Total items count for navigation
	const totalItemsCount = $derived.by(() => {
		if (showSections) {
			return recentCommandsList.length + remainingCommandsList.length;
		}
		return filteredItems.length;
	});

	// Update highlighted index when search results change
	$effect(() => {
		if (highlightedIndex >= totalItemsCount) {
			highlightedIndex = Math.max(0, totalItemsCount - 1);
		}
	});

	function close() {
		uiState.global.commandPaletteOpen.set(false);
	}

	async function executeCommand(command: Command) {
		const result = command.action({
			backend,
			shortcutService,
			goto,
			projectId,
			uiState,
			page,
			modeService,
			forge,
			urlService,
			stackService,
			projectsService
		});

		// Track as recent command
		trackRecentCommand(command.id);

		// Handle void return: close palette (backward compatible)
		if (result === undefined || result === null) {
			close();
			return;
		}

		// Handle async submenu: show loading state
		if (result instanceof Promise) {
			isLoadingSubmenu = true;
			try {
				const items = await result;
				// Check if promise resolved to undefined, null, or empty array
				if (!items || !Array.isArray(items) || items.length === 0) {
					close();
					return;
				}
				showSubmenu(command, items);
			} catch (error) {
				console.error('Failed to load submenu:', error);
				close();
			} finally {
				isLoadingSubmenu = false;
			}
		} else {
			// Handle sync submenu: show immediately
			// Verify result is an array before accessing length
			if (!Array.isArray(result) || result.length === 0) {
				close();
				return;
			}
			showSubmenu(command, result);
		}
	}

	function trackRecentCommand(commandId: string) {
		const recent = uiState.global.recentCommands.current || [];
		const updated = [commandId, ...recent.filter((id) => id !== commandId)].slice(0, 5);
		uiState.global.recentCommands.set(updated);
	}

	function showSubmenu(command: Command, items: SubmenuItem[]) {
		selectedCommand = command;
		submenuItems = items;
		viewMode = 'submenu';
		searchQuery = '';
		highlightedIndex = 0;
		setTimeout(() => searchInputElement?.focus(), 10);
	}

	function executeSubmenuItem(item: SubmenuItem) {
		item.action({
			backend,
			shortcutService,
			goto,
			projectId,
			uiState,
			page,
			modeService,
			forge,
			urlService,
			stackService,
			projectsService
		});
		close();
	}

	function goBack() {
		viewMode = 'main';
		selectedCommand = undefined;
		submenuItems = [];
		searchQuery = '';
		highlightedIndex = 0;
		setTimeout(() => searchInputElement?.focus(), 10);
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			// Wrap around: if at last item, go to first; otherwise increment
			highlightedIndex = highlightedIndex >= totalItemsCount - 1 ? 0 : highlightedIndex + 1;
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			// Wrap around: if at first item, go to last; otherwise decrement
			highlightedIndex = highlightedIndex <= 0 ? totalItemsCount - 1 : highlightedIndex - 1;
		} else if (e.key === 'Enter') {
			e.preventDefault();
			if (viewMode === 'main') {
				const command = getCommandAtIndex(highlightedIndex);
				if (command) executeCommand(command);
			} else {
				const item = filteredItems[highlightedIndex] as SubmenuItem;
				if (item) executeSubmenuItem(item);
			}
		} else if (e.key === 'Escape') {
			e.preventDefault();
			if (viewMode === 'submenu') {
				goBack();
			} else {
				close();
			}
		}
	}

	// Helper to get command at index when showing sections
	function getCommandAtIndex(index: number): Command | undefined {
		if (showSections) {
			if (index < recentCommandsList.length) {
				return recentCommandsList[index];
			} else {
				return remainingCommandsList[index - recentCommandsList.length];
			}
		}
		return filteredItems[index] as Command;
	}
</script>

{#if isOpen}
	<div
		role="presentation"
		use:portal={'body'}
		class="command-palette-container"
		onmousedown={(e) => {
			if (e.target === e.currentTarget) {
				close();
			}
		}}
	>
		<div
			role="dialog"
			aria-modal="true"
			aria-label="Command Palette"
			tabindex="-1"
			class="command-palette"
			use:focusable={{
				trap: true,
				activate: true,
				focusable: true,
				dim: true,
				onEsc: () => {
					if (viewMode === 'submenu') {
						goBack();
					} else {
						close();
					}
					return true;
				}
			}}
			onkeydown={handleKeyDown}
		>
			{#if viewMode === 'submenu'}
				<div class="submenu-header">
					<button type="button" class="back-button" onclick={goBack} tabindex="-1"> ← Back </button>
					<span class="submenu-title">{selectedCommand?.title}</span>
				</div>
			{/if}

			<div class="search-container">
				<Textbox
					bind:element={searchInputElement}
					bind:value={searchQuery}
					placeholder={viewMode === 'main' ? 'Type a command...' : 'Search...'}
					autofocus
				/>
			</div>

			{#if isLoadingSubmenu}
				<div class="loading-container">
					<div class="loading-spinner"></div>
					<span>Loading...</span>
				</div>
			{:else}
				<ScrollableContainer maxHeight="400px">
					<div class="commands-list">
						{#if showSections}
							<!-- Recent commands section -->
							{#each recentCommandsList as command, idx}
								<button
									type="button"
									class="command-item"
									class:highlighted={idx === highlightedIndex}
									data-item-index={idx}
									data-command-index={idx}
									onclick={() => executeCommand(command)}
									onmouseenter={() => (highlightedIndex = idx)}
								>
									<div class="command-content">
										<span class="command-title">
											{#if command.group}
												<span class="command-group">{command.group}:</span>
											{/if}
											{command.title}
										</span>
										{#if command.description}
											<span class="command-description">{command.description}</span>
										{/if}
									</div>
									{#if command.shortcut}
										<span class="command-shortcut">
											{formatHotkeyForPlatform(command.shortcut)}
										</span>
									{/if}
								</button>
							{/each}

							<!-- Divider between recent and remaining -->
							{#if recentCommandsList.length > 0}
								<div class="commands-divider"></div>
							{/if}

							<!-- Remaining commands section -->
							{#each remainingCommandsList as command, idx}
								{@const globalIdx = idx + recentCommandsList.length}
								<button
									type="button"
									class="command-item"
									class:highlighted={globalIdx === highlightedIndex}
									data-item-index={globalIdx}
									data-command-index={globalIdx}
									onclick={() => executeCommand(command)}
									onmouseenter={() => (highlightedIndex = globalIdx)}
								>
									<div class="command-content">
										<span class="command-title">
											{#if command.group}
												<span class="command-group">{command.group}:</span>
											{/if}
											{command.title}
										</span>
										{#if command.description}
											<span class="command-description">{command.description}</span>
										{/if}
									</div>
									{#if command.shortcut}
										<span class="command-shortcut">
											{formatHotkeyForPlatform(command.shortcut)}
										</span>
									{/if}
								</button>
							{/each}
						{:else}
							<!-- Regular filtered view (with search or submenu) -->
							{#each filteredItems as item, idx}
								<button
									type="button"
									class="command-item"
									class:highlighted={idx === highlightedIndex}
									data-item-index={idx}
									data-command-index={idx}
									onclick={() => {
										if (viewMode === 'main') {
											executeCommand(item as Command);
										} else {
											executeSubmenuItem(item as SubmenuItem);
										}
									}}
									onmouseenter={() => (highlightedIndex = idx)}
								>
									<div class="command-content">
										<span class="command-title">
											{#if viewMode === 'main' && (item as Command).group}
												<span class="command-group">{(item as Command).group}:</span>
											{/if}
											{item.title}
										</span>
										{#if item.description}
											<span class="command-description">{item.description}</span>
										{/if}
									</div>
									{#if viewMode === 'main' && (item as Command).shortcut}
										<span class="command-shortcut">
											{formatHotkeyForPlatform((item as Command).shortcut!)}
										</span>
									{/if}
								</button>
							{/each}

							{#if filteredItems.length === 0}
								<div class="no-results">
									{viewMode === 'main' ? 'No commands found' : 'No items found'}
								</div>
							{/if}
						{/if}
					</div>
				</ScrollableContainer>
			{/if}
		</div>
	</div>
{/if}

<style lang="postcss">
	.command-palette-container {
		display: flex;
		z-index: var(--z-modal);
		position: fixed;
		top: 0;
		left: 0;
		align-items: flex-start;
		justify-content: center;
		width: 100%;
		height: 100%;
		padding-top: 120px;
		background-color: var(--clr-bg-overlay);
	}

	.command-palette {
		display: flex;
		flex-direction: column;
		width: 600px;
		max-height: calc(100vh - 200px);
		overflow: hidden;
		border: 1px solid var(--clr-border-2);
		border-radius: var(--radius-l);
		background-color: var(--clr-bg-1);
		box-shadow: var(--fx-shadow-l);
	}

	.submenu-header {
		display: flex;
		align-items: center;
		padding: 8px 12px;
		gap: 8px;
		border-bottom: 1px solid var(--clr-border-2);
		background-color: var(--clr-bg-2);
	}

	.back-button {
		display: flex;
		align-items: center;
		padding: 4px 8px;
		gap: 4px;
		border: none;
		border-radius: var(--radius-s);
		background: none;
		color: var(--clr-text-2);
		font-size: 12px;
		cursor: pointer;
		transition: background-color 0.1s ease;

		&:hover {
			background-color: var(--clr-bg-1);
		}
	}

	.submenu-title {
		color: var(--clr-text-2);
		font-weight: 500;
		font-size: 12px;
	}

	.search-container {
		padding: 12px;
		border-bottom: 1px solid var(--clr-border-2);
	}

	.loading-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 48px 24px;
		gap: 12px;
		color: var(--clr-text-2);
		font-size: 13px;
	}

	.loading-spinner {
		width: 24px;
		height: 24px;
		border: 2px solid var(--clr-border-2);
		border-radius: 50%;
		border-top-color: var(--clr-text-1);
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.commands-list {
		display: flex;
		flex-direction: column;
	}

	.command-item {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
		padding: 12px 16px;
		gap: 16px;
		border: none;
		background: none;
		text-align: left;
		cursor: pointer;
		transition: background-color 0.1s ease;

		&:hover,
		&.highlighted {
			background-color: var(--clr-bg-2);
		}
	}

	.command-content {
		display: flex;
		flex: 1;
		flex-direction: column;
		align-items: flex-start;
		min-width: 0;
	}

	.command-title {
		color: var(--clr-text-1);
		font-weight: 500;
		font-size: 14px;
	}

	.command-group {
		color: var(--clr-text-2);
		margin-right: 4px;
	}

	.command-description {
		margin-top: 2px;
		color: var(--clr-text-2);
		font-size: 12px;
	}

	.command-shortcut {
		flex-shrink: 0;
		color: var(--clr-text-2);
		font-size: 11px;
		white-space: nowrap;
		opacity: 0.6;
	}

	.no-results {
		padding: 24px;
		color: var(--clr-text-2);
		font-size: 13px;
		text-align: center;
	}

	.commands-divider {
		height: 1px;
		margin: 4px 0;
		background-color: var(--clr-border-2);
		opacity: 0.5;
	}
</style>
