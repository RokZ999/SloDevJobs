<script lang="ts">
	import type { Job } from '$lib/types/Job';
	import Grid from 'gridjs-svelte';
	import { h } from 'gridjs';
	import 'gridjs/dist/theme/mermaid.css';
	import { mode } from 'mode-watcher';
	import Button from './ui/button/button.svelte';
	import RangeSlider from 'svelte-range-slider-pips';

	export let data: Array<Job> = [];

	const transformedJobs = data.map((job) => ({
		...job,
		company_title: `${job.company} \n ${job.title}`
	}));
	data = transformedJobs;

	let filteredData = [...data];

	const columns = [
		{
			id: 'company_title',
			name: 'Podjetje',
			sort: false
		},
		{
			id: 'normalized_salary',
			name: 'Plača',
			formatter: (cell) => `${cell}€`,
			sort: true
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
		const searchInput = document.querySelectorAll('.search input[type="search"]')[1];
		if (searchInput) {
			if (searchInput.value === value) {
				searchInput.value = '';
			} else {
				searchInput.value = value;
			}
			searchInput.dispatchEvent(new Event('input'));
		}
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
		pipstep={60000.0}
		bind:values
	/>
</div>
<div class="grid grid-cols-3 gap-4 p-4">
	<Button on:click={() => updateInput('Frontend')}>🌐 Frontend</Button>
	<Button on:click={() => updateInput('Backend')}>🖥️ Backend</Button>
	<Button on:click={() => updateInput('Full')}>🔄 Fullstack</Button>
	<Button on:click={() => updateInput('DevOps')}>♾️ DevOps</Button>
	<Button on:click={() => updateInput('QA')}>🔍 QA</Button>
	<Button on:click={() => updateInput('Manager')}>👔 Manager</Button>
</div>

<Grid data={filteredData} {columns} fixedHeader={true} {className} search="true" height="800px" />

<style>
	:global(
			.dark-table-class th,
			.dark-table-class td,
			.light-table-class th,
			.light-table-class td
		) {
		padding: 1rem;
		background-color: hsl(var(--card) / var(--tw-bg-opacity));
		border: 1px solid hsl(var(--border) / var(--tw-border-opacity));
		font-size: 0.875rem;
		line-height: 1.25rem;
		padding-top: 0.5rem;
		padding-bottom: 0.5rem;
		max-width: 80px;
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
