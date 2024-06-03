<script lang="ts">
	import LightSwitch from '$lib/components/ui/button/LightSwitch.svelte';
	import '../app.css';
	import { ModeWatcher } from 'mode-watcher';
</script>

<div class="mx-auto w-full flex max-w-screen-xl items-center p-4">
	<div class="flex-1 flex justify-start">
		<h1 >Made by: <a class="underline" href="https://rokz999-cv-portfolio.vercel.app/">@RokZ999</a></h1>
	</div>
	<div class="flex-1 flex justify-center items-center space-x-3">
		<img src="https://flowbite.com/docs/images/logo.svg" alt="Flowbite Logo" />
		<span class="text-2xl font-semibold dark:text-white">SloDevJobs</span>
	</div>
	<div class="flex-1 flex justify-end">
		<LightSwitch />
	</div>
</div>
<ModeWatcher />
<slot />
