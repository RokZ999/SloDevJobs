<script lang="ts">
	import type { Job } from '$lib/types/Job';
	import Grid from 'gridjs-svelte';
	import { h } from 'gridjs';
	import 'gridjs/dist/theme/mermaid.css';
	import { mode } from 'mode-watcher';
	import Button from './ui/button/button.svelte';
	import RangeSlider from 'svelte-range-slider-pips';

	export let data: Array<Job> = [];
	let filteredData = [...data];

	const columns = [
		{ id: 'company', name: 'Podjetje', sort: true },
		{ id: 'title', name: 'Naslov' },
		{
			id: 'salary',
			name: 'Plača',
			formatter: (cell) => `${cell}€`
		},
		{
			id: 'normalized_salary',
			name: 'Mesečna plača',
			formatter: (cell) => `${cell}€`,
			sort: true
		},
		{
			id: 'normalized_salary_yearly',
			name: 'Letna plača',
			formatter: (cell) => `${cell}€`,
			sort: true
		},
		{
			id: 'time',
			name: 'Objava oglasa',
			sort: true,
			formatter: (cell) => {
				const date = new Date(cell);
				return date.toLocaleDateString('sl-SI');
			}
		},
		{
			id: 'url',
			name: 'URL',
			formatter: (cell) => h('a', { href: cell, class: 'text-blue-500 underline' }, 'Link')
		}
	];

	let className = {};

	$: if ($mode === 'dark') {
		className = {
			search: 'search',
			container: 'dark-table-class',
			sort: 'sort-dark'
		};
	} else {
		className = {
			search: 'search',
			table: 'light-table-class'
		};
	}

	function updateInput(value: string) {
		if (!document.querySelector('.search input')) return;
		if (!(document.querySelector('.search input') as HTMLInputElement)) return;
		if ((document.querySelector('.search input') as HTMLInputElement).value === value) {
			(document.querySelector('.search input') as HTMLInputElement).value = '';
		} else {
			(document.querySelector('.search input') as HTMLInputElement).value = value;
		}

		(document.querySelector('.search input') as HTMLInputElement).dispatchEvent(new Event('input'));
	}

	let salaries = data.map((job) => job.normalized_salary);
	const min = Math.min(...salaries);
	const max = Math.max(...salaries);
	let values = [min, max];
	const currency = new Intl.NumberFormat('de', { style: 'currency', currency: 'EUR' });
	const formatter = (value) => currency.format(value);

	$: filteredData = data.filter(
		(job) => job.normalized_salary >= values[0] && job.normalized_salary <= values[1]
	);
</script>

<div class="p-4">
	<RangeSlider
		range
		pushy
		{formatter}
		float
		pips
		all="label"
		{max}
		step={0.1}
		pipstep={20000.0}
		bind:values
	/>
</div>
<div>
	<div class="flex justify-center space-x-2">
		<Button on:click={() => updateInput('Frontend')}>🌐 Frontend</Button>
		<Button on:click={() => updateInput('Backend')}>🖥️ Backend</Button>
		<Button on:click={() => updateInput('Full')}>🔄 Fullstack</Button>
		<Button on:click={() => updateInput('DevOps')}>♾️ DevOps</Button>
		<Button on:click={() => updateInput('QA')}>🔍 QA</Button>
		<Button on:click={() => updateInput('UX')}>🎨 UX</Button>
		<Button on:click={() => updateInput('UI')}>🖌️ UI</Button>
	</div>

	<div class="mt-2 flex justify-center space-x-2">
		<Button on:click={() => updateInput('JavaScript')}>💻 JavaScript</Button>
		<Button on:click={() => updateInput('Python')}>🐍 Python</Button>
		<Button on:click={() => updateInput('Java')}>☕ Java</Button>
		<Button on:click={() => updateInput('C#')}>#️⃣ C#</Button>
		<Button on:click={() => updateInput('Ruby')}>💎 Ruby</Button>
		<Button on:click={() => updateInput('Go')}>🏃 Go</Button>
		<Button on:click={() => updateInput('PHP')}>🐘 PHP</Button>
	</div>

	<div class="mt-2 flex justify-center space-x-2">
		<Button on:click={() => updateInput('Junior')}>👶 Junior</Button>
		<Button on:click={() => updateInput('Mid')}>🧑 Mid</Button>
		<Button on:click={() => updateInput('Senior')}>🧓 Senior</Button>
	</div>
</div>

<Grid data={filteredData} {columns} fixedHeader={true} {className} search="true" height="800px" />

<style>
	:global(
			.dark-table-class th,
			.dark-table-class td,
			.light-table-class th,
			.light-table-class td
		) {
		padding: 0.5rem;
		background-color: hsl(var(--card) / var(--tw-bg-opacity));
		border: 1px solid hsl(var(--border) / var(--tw-border-opacity));
		font-size: 0.875rem;
		line-height: 1.25rem;
		padding-top: 0.5rem;
		padding-bottom: 0.5rem;
		max-width: 50px;
		max-height: 2rem;
		word-wrap: break-word;
		overflow-wrap: break-word;
	}

	:global(
			.dark-table-class th:hover,
			.dark-table-class td:hover,
			.light-table-class th:hover,
			.light-table-class td:hover
		) {
		background-color: hsl(var(--border) / var(--tw-border-opacity));
	}

	:global(.dark-table-class th:focus) {
		background-color: #181818;
	}
	:global(.dark-table-class, .light-table-class) {
		color: var(--tw-text-opacity);
	}

	:global(.sort-dark) {
		filter: invert(100%);
	}

	:global(.search input) {
		background-color: hsl(var(--card) / var(--tw-bg-opacity));
		color: var(--tw-text-opacity);
	}
</style>
