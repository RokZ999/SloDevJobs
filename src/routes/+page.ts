/** @type {import('./$types').PageLoad} */
export async function load({ fetch }) {
	const res = await fetch('/api/slotech');
	const jobs = await res.json();

	return { jobs };
}
