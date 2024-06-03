<script lang="ts">
	import type { Job } from '$lib/types/Job';
	import * as Card from '$lib/components/ui/card';

	export let data: Array<Job>;

	if (!data) {
		throw new Error('No data provided');
	}

	const jobsCount: number = data.length;
	const salaries: number[] = data.map((job) => job.normalized_salary);
	const salaries_yearly: number[] = data.map((job) => job.normalized_salary_yearly);
	const mediana_monthly = median(salaries);
	const mediana_yearly = median(salaries_yearly);

	function median(numbers: number[]): number {
		const sorted = Array.from(numbers).sort((a, b) => a - b);
		const middle = Math.floor(sorted.length / 2);

		if (sorted.length % 2 === 0) {
			return (sorted[middle - 1] + sorted[middle]) / 2;
		}

		return sorted[middle];
	}
</script>

<div class="flex items-center justify-center space-x-1">
	<Card.Root>
		<Card.Header>
			<Card.Title>Število oglasov:</Card.Title>
			<Card.Description><h2 class="text-2xl">{jobsCount}</h2></Card.Description>
		</Card.Header>
	</Card.Root>
	<Card.Root>
		<Card.Header>
			<Card.Title>Mediana mesečne plače:</Card.Title>
			<Card.Description>
				<h2 class="text-2xl">{mediana_monthly}€</h2></Card.Description
			>
		</Card.Header>
	</Card.Root>
	<Card.Root>
		<Card.Header>
			<Card.Title>Mediana letne plače:</Card.Title>
			<Card.Description><h2 class="text-2xl">{mediana_yearly}€</h2></Card.Description>
		</Card.Header>
	</Card.Root>
</div>
