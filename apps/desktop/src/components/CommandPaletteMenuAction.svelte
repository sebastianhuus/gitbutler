<script lang="ts">
	import { inject } from '@gitbutler/core/context';
	import { UI_STATE } from '$lib/state/uiState.svelte';
	import { SHORTCUT_SERVICE } from '$lib/shortcuts/shortcutService';

	const uiState = inject(UI_STATE);
	const shortcutService = inject(SHORTCUT_SERVICE);

	function toggleCommandPalette() {
		const isOpen = uiState.global.commandPaletteOpen.current;
		uiState.global.commandPaletteOpen.set(!isOpen);
	}

	$effect(() => shortcutService.on('command-palette', () => toggleCommandPalette()));
</script>
