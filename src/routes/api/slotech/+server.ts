import type { Job } from '$lib/types/Job';
import { parseHTML } from 'linkedom';

const BASE_URL = 'https://slo-tech.com';

// How long Vercel's edge serves a cached response before re-scraping (seconds).
const CACHE_SECONDS = 3600;
// How long the edge may keep serving the stale copy while it revalidates in the background.
const STALE_SECONDS = 86400;
// Max detail pages fetched at once — be polite to slo-tech.com, stay stable on Vercel.
const CONCURRENCY = 8;
// Per-fetch timeout. Must stay well under `maxDuration` below so a hung page can't
// blow the whole function's time budget.
const FETCH_TIMEOUT_MS = 8000;

// adapter-vercel reads this: give the (uncached) scrape room beyond the ~10s default,
// since it runs on the first request and on every background revalidation.
export const config = { maxDuration: 60 };

export async function GET(): Promise<Response> {
	const listingHtml = await getResponseText(`${BASE_URL}/delo`);
	const jobs = parseListing(listingHtml);

	await mapWithConcurrency(jobs, CONCURRENCY, enrichJob);

	return new Response(JSON.stringify(jobs), {
		headers: {
			'content-type': 'application/json',
			// Vercel's edge holds the state instead of a database: scrape at most once
			// per CACHE_SECONDS, serve everyone else the cached JSON instantly, and
			// refresh in the background while still serving the stale copy.
			'cache-control': `s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${STALE_SECONDS}`
		}
	});
}

async function getResponseText(url: string): Promise<string> {
	const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
	return response.text();
}

function parseListing(responseText: string): Job[] {
	const { document } = parseHTML(responseText);

	const jobRows = document.querySelectorAll('tbody > tr');
	const jobs: Job[] = [];

	jobRows.forEach((row) => {
		const titleElement = row.querySelector('td.name h3 a') as HTMLAnchorElement;
		const companyElement = row.querySelector('td.company a') as HTMLAnchorElement;
		const timeElement = row.querySelector('td.last_msg time') as HTMLTimeElement;

		if (titleElement && companyElement && timeElement) {
			jobs.push({
				title: titleElement.textContent.trim(),
				url: BASE_URL + titleElement.href.trim(),
				company: companyElement.textContent.trim(),
				time: timeElement.getAttribute('datetime').trim()
			});
		}
	});

	return jobs;
}

// Fetch one job's detail page and fill in salary + normalized values.
// Wrapped so a single broken/slow page is skipped instead of failing the whole request.
async function enrichJob(job: Job): Promise<void> {
	try {
		const { document } = parseHTML(await getResponseText(job.url));

		let salary: string | undefined;
		document.querySelectorAll('dl dt').forEach((dt) => {
			if (dt.textContent?.includes('Plačilo:')) {
				salary = (dt.nextElementSibling as HTMLElement | null)?.textContent?.trim();
			}
		});

		if (!salary) return;

		job.salary = salary;
		const monthly = parseSalary(salary);
		job.normalized_salary = monthly;
		if (monthly !== null && monthly !== undefined) {
			job.normalized_salary_yearly = salary.includes('projekt') ? 0 : monthly * 12;
		}
	} catch (err) {
		console.error(`Failed to enrich ${job.url}:`, err);
	}
}

// Run `fn` over `items` with at most `limit` in flight at once.
async function mapWithConcurrency<T>(
	items: T[],
	limit: number,
	fn: (item: T) => Promise<void>
): Promise<void> {
	let next = 0;
	const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
		while (next < items.length) {
			await fn(items[next++]);
		}
	});
	await Promise.all(workers);
}

function findNumberInString(str: string): number {
	const regex = /\d+/g;
	const number = str.match(regex);

	return number ? parseInt(number[0].trim()) : 0;
}

function parseSalary(salary: string): number | null {
	salary = salary
		.toLowerCase()
		.replaceAll(' do ', '-')
		.replaceAll('.00 ', '')
		.replaceAll(',00 ', '')
		.replace(/\,\d{2}/g, '')
		.replaceAll('.', '')
		.replaceAll(',', '');

	let result = -1;

	if (salary.includes('-')) {
		let both = salary.split('-');
		let left = findNumberInString(both[0]);
		let right = findNumberInString(both[1]);

		if (salary.includes('uro')) {
			if ((left + right) / 2 > 1000) {
				result = (left + right) / 2;
			} else {
				result = ((left + right) / 2) * 168;
			}
		} else if (salary.includes('k bruto') || salary.trim().includes('k-')) {
			result = ((left + right) / 2) * 1000;
		} else {
			result = (left + right) / 2;
		}
	} else if (salary.includes('uro')) {
		result = findNumberInString(salary) * 168;
	} else result = findNumberInString(salary);

	result = result > 100000 ? result / 100 : result;

	return result;
}
