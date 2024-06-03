<script lang="ts">
	import LightSwitch from '$lib/components/ui/button/LightSwitch.svelte';
	import '../app.css';
	import { ModeWatcher } from 'mode-watcher';
</script>

<div class="mx-auto flex max-w-screen-xl flex-wrap items-center justify-center space-x-3 p-4">
	<img src="https://flowbite.com/docs/images/logo.svg" class="h-8" alt="Flowbite Logo" />
	<span class="text-2xl font-semibold dark:text-white">SloDevJobs</span>
	<LightSwitch />
</div>
<ModeWatcher />
<slot />
