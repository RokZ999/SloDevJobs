import type { Job } from '$lib/types/Job';
import { parseHTML } from 'linkedom';
import { sql } from '@vercel/postgres';

const BASE_URL = 'https://slo-tech.com';

export async function GET(): Promise<Response> {
	const savedJobs = await getJobs();

	const responseText = await getResponseText(BASE_URL + '/delo');
	let newJobs = parseAndGetSubLinks(responseText);

	const oldJobs = savedJobs.filter(
		(savedJob) => !newJobs.find((newJob) => newJob.url === savedJob.url)
	);

	newJobs = newJobs.filter((job) => !savedJobs.find((savedJob) => savedJob.url === job.url));

	await deleteOldJobs(oldJobs);

	await addSalaryToEachJob(newJobs);
	await addEstimatedPlaca(newJobs);
	await addEstimatedYearlyPlaca(newJobs);

	await saveJobs(newJobs);

	return new Response(JSON.stringify(await getJobs()));
}

async function deleteOldJobs(oldJobs: Job[]): Promise<void> {
	await Promise.all(oldJobs.map((job) => sql`DELETE FROM Job WHERE url = ${job.url}`));
}

async function getJobs(): Promise<Job[]> {
	const { rows } = await sql`SELECT * from job`;
	return rows as Job[];
}

async function saveJobs(jobs: Job[]): Promise<void> {
	await Promise.all(
		jobs.map(
			(job) =>
				sql`
                INSERT INTO JOB (
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

async function getResponseText(url: string): Promise<string> {
	const response = await fetch(url);
	return response.text();
}

function parseAndGetSubLinks(responseText: string): Job[] {
	const { document } = parseHTML(responseText);

	const jobRows = document.querySelectorAll('tbody > tr');
	const jobs: Job[] = [];

	jobRows.forEach((row) => {
		const titleElement = row.querySelector('td.name h3 a') as HTMLAnchorElement;
		const companyElement = row.querySelector('td.company a') as HTMLAnchorElement;
		const timeElement = row.querySelector('td.last_msg time') as HTMLTimeElement;

		if (titleElement && companyElement && timeElement) {
			const job: Job = {
				title: titleElement.textContent.trim(),
				url: BASE_URL + titleElement.href.trim(),
				company: companyElement.textContent.trim(),
				time: timeElement.getAttribute('datetime').trim()
			};
			jobs.push(job);
		}
	});

	return jobs;
}

async function addSalaryToEachJob(jobs: Job[]): Promise<void> {
	await Promise.all(
		jobs.map(async (job) => {
			const responseText = await getResponseText(job.url);
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

async function addEstimatedPlaca(jobs: Job[]): Promise<void> {
	await Promise.all(
		jobs.map((job) => {
			if (job.salary) {
				const estimatedPlaca = parseSalary(job.salary);
				job.normalized_salary = estimatedPlaca;
			}
		})
	);
}

async function addEstimatedYearlyPlaca(jobs: Job[]): Promise<void> {
	await Promise.all(
		jobs.map((job) => {
			if (job.normalized_salary !== null && job.normalized_salary !== undefined) {
				if (job.salary?.includes('projekt')) {
					job.normalized_salary_yearly = 0;
				} else {
					job.normalized_salary_yearly = job.normalized_salary * 12;
				}
			}
		})
	);
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
