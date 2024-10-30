<script lang="ts">
	import DataTable from '$lib/components/DataTable.svelte';
	import { Button } from '$lib/components/ui/button';
	import type { Job } from '$lib/types/Job';
	import * as Card from '$lib/components/ui/card';
	import QuickSummary from '$lib/components/QuickSummary.svelte';
	import DataTableMobile from '$lib/components/DataTableMobile.svelte';

	export let data;
	const jobs = data.jobs as Job[];
</script>

{#await jobs}
	<p>Loading...</p>
{:then jobs}
	<Card.Root>
		<Card.Header>
			<Card.Title class="items-center justify-center p-2 text-center text-xl">
				Razmere na Slotech:
			</Card.Title>
			<QuickSummary data={jobs} />
		</Card.Header>
		<Card.Content>
			<div class="flex items-center justify-center">
				<div class="hidden w-5/6 items-center justify-center sm:block">
					<DataTable data={jobs} />
				</div>
				<div class="block w-full items-center justify-center sm:hidden">
					<DataTableMobile data={jobs} />
				</div>
			</div>
		</Card.Content>
	</Card.Root>
{/await}
