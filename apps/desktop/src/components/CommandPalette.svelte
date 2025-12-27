<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { inject } from '@gitbutler/core/context';
	import { BACKEND } from '$lib/backend';
	import { UI_STATE } from '$lib/state/uiState.svelte';
	import { SHORTCUT_SERVICE } from '$lib/shortcuts/shortcutService';
	import { searchCommands } from '$lib/commandPalette/search';
	import { COMMANDS } from '$lib/commandPalette/commandRegistry';
	import { portal } from '@gitbutler/ui/utils/portal';
	import { focusable } from '@gitbutler/ui/focus/focusable';
	import Textbox from '@gitbutler/ui/components/Textbox.svelte';
	import ScrollableContainer from '@gitbutler/ui/components/scroll/ScrollableContainer.svelte';
	import type { Command } from '$lib/commandPalette/types';

	const backend = inject(BACKEND);
	const uiState = inject(UI_STATE);
	const shortcutService = inject(SHORTCUT_SERVICE);

	const projectId = $derived(page.params.projectId);
	const isOpen = $derived(uiState.global.commandPaletteOpen.current);

	let searchQuery = $state('');
	let highlightedIndex = $state(0);
	let searchInputElement = $state<HTMLInputElement>();

	const filteredCommands = $derived(searchCommands(COMMANDS, searchQuery));

	// Reset search and index when opening
	$effect(() => {
		if (isOpen) {
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

	// Update highlighted index when search results change
	$effect(() => {
		if (highlightedIndex >= filteredCommands.length) {
			highlightedIndex = Math.max(0, filteredCommands.length - 1);
		}
	});

	function close() {
		uiState.global.commandPaletteOpen.set(false);
	}

	function executeCommand(command: Command) {
		command.action({ backend, shortcutService, goto, projectId, uiState });
		close();
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			highlightedIndex = Math.min(highlightedIndex + 1, filteredCommands.length - 1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			highlightedIndex = Math.max(highlightedIndex - 1, 0);
		} else if (e.key === 'Enter') {
			e.preventDefault();
			const command = filteredCommands[highlightedIndex];
			if (command) executeCommand(command);
		}
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
			class="command-palette"
			use:focusable={{
				trap: true,
				activate: true,
				focusable: true,
				dim: true,
				onEsc: () => {
					close();
					return true;
				}
			}}
			onkeydown={handleKeyDown}
		>
			<div class="search-container">
				<Textbox
					bind:element={searchInputElement}
					bind:value={searchQuery}
					placeholder="Type a command..."
					autofocus
				/>
			</div>

			<ScrollableContainer maxHeight="400px">
				<div class="commands-list">
					{#each filteredCommands as command, idx}
						<button
							class="command-item"
							class:highlighted={idx === highlightedIndex}
							data-command-index={idx}
							onclick={() => executeCommand(command)}
							onmouseenter={() => (highlightedIndex = idx)}
						>
							<span class="command-title">{command.title}</span>
							{#if command.description}
								<span class="command-description">{command.description}</span>
							{/if}
						</button>
					{/each}

					{#if filteredCommands.length === 0}
						<div class="no-results">No commands found</div>
					{/if}
				</div>
			</ScrollableContainer>
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

	.search-container {
		padding: 12px;
		border-bottom: 1px solid var(--clr-border-2);
	}

	.commands-list {
		display: flex;
		flex-direction: column;
	}

	.command-item {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		padding: 12px 16px;
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

	.command-title {
		color: var(--clr-text-1);
		font-weight: 500;
		font-size: 14px;
	}

	.command-description {
		margin-top: 2px;
		color: var(--clr-text-2);
		font-size: 12px;
	}

	.no-results {
		padding: 24px;
		color: var(--clr-text-2);
		font-size: 13px;
		text-align: center;
	}
</style>
