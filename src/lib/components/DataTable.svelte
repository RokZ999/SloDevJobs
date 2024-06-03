<script lang="ts">
	import { createRender, createTable, Render, Subscribe } from 'svelte-headless-table';
	import { readable } from 'svelte/store';
	import * as Table from '$lib/components/ui/table';
	import type { Job } from '$lib/types/Job';
	import { addPagination, addSortBy } from 'svelte-headless-table/plugins';
	import ArrowUpDown from 'lucide-svelte/icons/arrow-up-down';
	import { Button } from './ui/button';
	import LinkComponent from './LinkComponent.svelte';

	export let data: Array<Job>;

	const table = createTable(readable(data), {
		//page: addPagination(),
		sort: addSortBy()
	});

	const columns = table.createColumns([
		table.column({
			accessor: 'company',
			header: 'Podjetje',
			plugins: {
				sort: {
					disable: false
				}
			}
		}),
		table.column({
			accessor: 'title',
			header: 'Naslov'
		}),
		table.column({
			accessor: 'salary',
			header: 'Plača'
		}),
		table.column({
			accessor: 'normalized_salary',
			header: 'Mesecna Plača',
			plugins: {
				sort: {
					disable: false
				}
			}
		}),
		table.column({
			accessor: 'normalized_salary_yearly',
			header: 'Letna plača',
			plugins: {
				sort: {
					disable: false
				}
			}
		}),
		table.column({
			accessor: 'time',
			header: 'Obajva oglasa',
			plugins: {
				sort: {
					disable: false
				}
			}
		}),
		table.column({
			accessor: 'url',
			header: 'URL',
			cell: ({ value: url }) => createRender(LinkComponent, { url: url }),
			plugins: {
				sort: {
					disable: false
				}
			}
		})
	]);

	const { headerRows, pageRows, tableAttrs, tableBodyAttrs } = table.createViewModel(columns);
</script>

<div class="mx-auto w-5/6 items-center justify-center rounded-md border">
	<Table.Root {...$tableAttrs}>
		<Table.Header>
			{#each $headerRows as headerRow}
				<Subscribe rowAttrs={headerRow.attrs()}>
					<Table.Row>
						{#each headerRow.cells as cell (cell.id)}
							<Subscribe attrs={cell.attrs()} let:attrs props={cell.props()} let:props>
								<Table.Head {...attrs}>
									{#if cell.id === 'company' || cell.id === 'time' || cell.id === 'normalized_salary' || cell.id === 'normalized_salary_yearly'}
										<Button variant="ghost" on:click={props.sort.toggle}>
											<Render of={cell.render()} />
											<ArrowUpDown class={''} />
										</Button>
									{:else}
										<Render of={cell.render()} />
									{/if}
								</Table.Head>
							</Subscribe>
						{/each}
					</Table.Row>
				</Subscribe>
			{/each}
		</Table.Header>
		<Table.Body {...$tableBodyAttrs}>
			{#each $pageRows as row (row.id)}
				<Subscribe rowAttrs={row.attrs()} let:rowAttrs>
					<Table.Row {...rowAttrs}>
						{#each row.cells as cell (cell.id)}
							<Subscribe attrs={cell.attrs()} let:attrs>
								<Table.Cell {...attrs}>
									{#if cell.id === 'normalized_salary' || cell.id === 'normalized_salary_yearly'}
										<Render of={cell.render()} />€
									{:else}
										<Render of={cell.render()} />
									{/if}
								</Table.Cell>
							</Subscribe>
						{/each}
					</Table.Row>
				</Subscribe>
			{/each}
		</Table.Body>
	</Table.Root>
</div>
