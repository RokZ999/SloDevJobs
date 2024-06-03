<script lang="ts">
	import DataTable from '$lib/components/DataTable.svelte';
	import { Button } from '$lib/components/ui/button';
	import type { Job } from '$lib/types/Job';
	import * as Card from '$lib/components/ui/card';
	import QuickSummary from '$lib/components/QuickSummary.svelte';

	export let data;
	const jobs = data.jobs as Job[];
</script>

<Card.Root>
	<Card.Header>
		<Card.Title class="items-center justify-center p-2 text-center text-xl"
			>Razmere na Slotech</Card.Title
		>
		<QuickSummary data={jobs} />
	</Card.Header>
	<Card.Content>
		<DataTable data={jobs} />
	</Card.Content>
</Card.Root>
