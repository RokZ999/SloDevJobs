<script lang="ts">
	import DataTable from '$lib/components/DataTable.svelte';
	import { Button } from '$lib/components/ui/button';
	import type { Job } from '$lib/types/Job';
	import * as Card from '$lib/components/ui/card';

	export let data;
	const jobs = data.jobs as Job[];
</script>

<Card.Root>
	<Card.Header>
		<Card.Title class="text-center">Razmere na Slotech</Card.Title>
	</Card.Header>
	<Card.Content>
		<DataTable data={jobs} />
	</Card.Content>
</Card.Root>
