import type { Job } from '$lib/types/Job';
import { parseHTML } from 'linkedom';
import { sql } from '@vercel/postgres';

const BASE_URL = 'https://slo-tech.com';

export async function GET(): Promise<Response> {
	const savedJobs = await fetchJobsFromDatabase();
	const scrapedJobs = await scrapeJobsFromWebsite();

	const jobsToDelete = findOutdatedJobs(savedJobs, scrapedJobs);
	await deleteJobsFromDatabase(jobsToDelete);

	const newJobs = findNewJobs(savedJobs, scrapedJobs);
	if (newJobs.length === 0) {
		return new Response(JSON.stringify(savedJobs));
	}

	await enrichJobsWithSalaryData(newJobs);
	await saveJobsToDatabase(newJobs);

	const updatedJobs = await fetchJobsFromDatabase();
	return new Response(JSON.stringify(updatedJobs), {
		headers: { 'Content-Type': 'application/json' }
	});
}

// Fetch existing jobs from the database
async function fetchJobsFromDatabase(): Promise<Job[]> {
	const { rows } = await sql`SELECT * FROM job ORDER BY time desc`;
	return rows as Job[];
}

// Scrape job listings from the website
async function scrapeJobsFromWebsite(): Promise<Job[]> {
	const responseText = await fetchPageText(BASE_URL + '/delo');
	return parseJobListingsFromHTML(responseText);
}

// Fetch the HTML content from the given URL
async function fetchPageText(url: string): Promise<string> {
	const response = await fetch(url);
	return response.text();
}

// Parse job data from the HTML response
function parseJobListingsFromHTML(html: string): Job[] {
	const { document } = parseHTML(html);
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
				time: timeElement.getAttribute('datetime').trim(),
				salary: null,
				normalized_salary: null,
				normalized_salary_yearly: null
			});
		}
	});

	return jobs;
}

// Identify jobs that exist in the database but are no longer on the website
function findOutdatedJobs(savedJobs: Job[], scrapedJobs: Job[]): Job[] {
	return savedJobs.filter(
		(savedJob) => !scrapedJobs.some((scrapedJob) => scrapedJob.url === savedJob.url)
	);
}

// Identify new jobs from the website that are not in the database
function findNewJobs(savedJobs: Job[], scrapedJobs: Job[]): Job[] {
	return scrapedJobs.filter(
		(scrapedJob) => !savedJobs.some((savedJob) => savedJob.url === scrapedJob.url)
	);
}

// Delete outdated jobs from the database
async function deleteJobsFromDatabase(jobsToDelete: Job[]): Promise<void> {
	await Promise.all(jobsToDelete.map((job) => sql`DELETE FROM Job WHERE url = ${job.url}`));
}

// Save new jobs to the database
async function saveJobsToDatabase(jobs: Job[]): Promise<void> {
	await Promise.all(
		jobs.map(
			(job) =>
				sql`
                INSERT INTO Job (
                    title,
                    url,
                    company,
                    time,
                    salary,
                    normalized_salary,
                    normalized_salary_yearly,
                    date_inserted
                ) VALUES (
                    ${job.title},
                    ${job.url},
                    ${job.company},
                    ${job.time},
                    ${job.salary || null},
                    ${job.normalized_salary || null},
                    ${job.normalized_salary_yearly || null},
                    CURRENT_TIMESTAMP
                ) ON CONFLICT (url) DO NOTHING
            `
		)
	);
}

// Enrich job listings with salary data and calculations
async function enrichJobsWithSalaryData(jobs: Job[]): Promise<void> {
	await addSalaryInformation(jobs);
	calculateMonthlySalary(jobs);
	calculateYearlySalary(jobs);
}

// Fetch salary data for each job from its detailed page
async function addSalaryInformation(jobs: Job[]): Promise<void> {
	await Promise.all(
		jobs.map(async (job) => {
			const responseText = await fetchPageText(job.url);
			const { document } = parseHTML(responseText);

			const dtElements = document.querySelectorAll('dl dt');
			let salaryElement: HTMLElement | null = null;

			dtElements.forEach((dtElement) => {
				if (dtElement.textContent?.includes('Plačilo:')) {
					salaryElement = dtElement.nextElementSibling as HTMLElement;
				}
			});

			if (salaryElement) {
				job.salary = salaryElement.textContent.trim();
			}
		})
	);
}

// Calculate normalized monthly salary for each job
function calculateMonthlySalary(jobs: Job[]): void {
	jobs.forEach((job) => {
		if (job.salary) {
			job.normalized_salary = parseSalary(job.salary);
		}
	});
}

// Calculate normalized yearly salary for each job
function calculateYearlySalary(jobs: Job[]): void {
	jobs.forEach((job) => {
		if (job.normalized_salary !== null) {
			job.normalized_salary_yearly = job.salary?.includes('projekt')
				? 0
				: job.normalized_salary * 12;
		}
	});
}

// Parse and normalize salary data from raw string
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
		const [left, right] = salary.split('-').map(findNumberInString);
		result = salary.includes('uro')
			? (((left + right) / 2) * (left + right)) / 2 > 1000
				? 1
				: 168
			: salary.includes('k bruto') || salary.trim().includes('k-')
				? ((left + right) / 2) * 1000
				: (left + right) / 2;
	} else if (salary.includes('uro')) {
		result = findNumberInString(salary) * 168;
	} else {
		result = findNumberInString(salary);
	}

	return result > 100000 ? result / 100 : result;
}

// Extract numeric value from string
function findNumberInString(str: string): number {
	const regex = /\d+/g;
	const number = str.match(regex);
	return number ? parseInt(number[0].trim()) : 0;
}
