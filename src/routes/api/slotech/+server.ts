import type { Job } from '$lib/types/Job';
import { parseHTML } from 'linkedom';
import { sql } from '@vercel/postgres';
import { z } from 'zod'; // For runtime validation

// Configuration
const CONFIG = {
	BASE_URL: 'https://slo-tech.com',
	HOURS_PER_MONTH: 168,
	MAX_SALARY_THRESHOLD: 100000
} as const;

// Validation schema for Job
const JobSchema = z.object({
	title: z.string(),
	url: z.string().url(),
	company: z.string(),
	time: z.string(),
	salary: z.string().nullable().optional(),
	normalized_salary: z.number().nullable().optional(),
	normalized_salary_yearly: z.number().nullable().optional()
});

// Custom error class
class JobScraperError extends Error {
	constructor(
		message: string,
		public readonly context?: unknown
	) {
		super(message);
		this.name = 'JobScraperError';
	}
}

// Database operations
class JobRepository {
	static async getAll(): Promise<Job[]> {
		const { rows } = await sql`SELECT * FROM job`;
		return rows as Job[];
	}

	static async deleteByUrls(urls: string[]): Promise<void> {
		if (urls.length === 0) return;
		await sql`DELETE FROM Job WHERE url = ANY(${urls})`;
	}

	static async saveMany(jobs: Job[]): Promise<void> {
		if (jobs.length === 0) return;

		const values = jobs.map((job) => ({
			title: job.title,
			url: job.url,
			company: job.company,
			time: job.time,
			salary: job.salary,
			normalized_salary: job.normalized_salary,
			normalized_salary_yearly: job.normalized_salary_yearly
		}));

		await sql`
            INSERT INTO JOB ${sql(values)}
            ON CONFLICT (url) DO NOTHING
        `;
	}
}

// Salary processing
class SalaryProcessor {
	private static findNumberInString(str: string): number {
		const matches = str.match(/\d+/g);
		return matches ? parseInt(matches[0], 10) : 0;
	}

	static normalizeSalary(salary: string): number | null {
		if (!salary) return null;

		const normalizedString = salary
			.toLowerCase()
			.replace(/ do |-/g, '-')
			.replace(/[.,]00 /g, ' ')
			.replace(/[,.](\d{2})/g, '')
			.replace(/[.,]/g, '');

		const isHourlyRate = normalizedString.includes('uro');
		const isThousands =
			normalizedString.includes('k bruto') || normalizedString.trim().includes('k-');
		const isRange = normalizedString.includes('-');

		let result: number;

		if (isRange) {
			const [min, max] = normalizedString.split('-').map((part) => this.findNumberInString(part));
			const average = (min + max) / 2;

			if (isHourlyRate) {
				result = average > 1000 ? average : average * CONFIG.HOURS_PER_MONTH;
			} else if (isThousands) {
				result = average * 1000;
			} else {
				result = average;
			}
		} else if (isHourlyRate) {
			result = this.findNumberInString(normalizedString) * CONFIG.HOURS_PER_MONTH;
		} else {
			result = this.findNumberInString(normalizedString);
		}

		return result > CONFIG.MAX_SALARY_THRESHOLD ? result / 100 : result;
	}

	static calculateYearlySalary(
		monthlySalary: number | null,
		salaryDescription: string | undefined
	): number | null {
		if (monthlySalary === null) return null;
		return salaryDescription?.includes('projekt') ? 0 : monthlySalary * 12;
	}
}

// Job scraping
class JobScraper {
	private static async fetchHtml(url: string): Promise<string> {
		try {
			const response = await fetch(url);
			if (!response.ok) {
				throw new JobScraperError(`Failed to fetch URL: ${url}`, { status: response.status });
			}
			return response.text();
		} catch (error) {
			throw new JobScraperError('Network error while fetching HTML', { error });
		}
	}

	static parseJobListings(html: string): Job[] {
		const { document } = parseHTML(html);
		const jobs: Job[] = [];

		document.querySelectorAll('tbody > tr').forEach((row) => {
			try {
				const titleElement = row.querySelector('td.name h3 a');
				const companyElement = row.querySelector('td.company a');
				const timeElement = row.querySelector('td.last_msg time');

				if (!titleElement || !companyElement || !timeElement) return;

				const job: Job = {
					title: titleElement.textContent?.trim() ?? '',
					url: CONFIG.BASE_URL + titleElement.getAttribute('href')?.trim(),
					company: companyElement.textContent?.trim() ?? '',
					time: timeElement.getAttribute('datetime')?.trim() ?? ''
				};

				// Validate job data
				JobSchema.parse(job);
				jobs.push(job);
			} catch (error) {
				console.error('Error parsing job row:', error);
			}
		});

		return jobs;
	}

	static async getSalaryFromJobPage(url: string): Promise<string | null> {
		const html = await this.fetchHtml(url);
		const { document } = parseHTML(html);

		const salaryElement = Array.from(document.querySelectorAll('dl dt')).find((el) =>
			el.textContent?.includes('Plačilo:')
		)?.nextElementSibling;

		return salaryElement?.textContent?.trim() ?? null;
	}
}

// Main handler
export async function GET(): Promise<Response> {
	try {
		// Get existing jobs
		const savedJobs = await JobRepository.getAll();

		// Fetch and parse new job listings
		const html = await JobScraper.fetchHtml(CONFIG.BASE_URL + '/delo');
		const newJobListings = JobScraper.parseJobListings(html);

		// Find jobs to delete
		const jobsToDelete = savedJobs.filter(
			(saved) => !newJobListings.some((newJob) => newJob.url === saved.url)
		);
		await JobRepository.deleteByUrls(jobsToDelete.map((job) => job.url));

		// Filter out existing jobs from new listings
		const uniqueNewJobs = newJobListings.filter(
			(newJob) => !savedJobs.some((saved) => saved.url === newJob.url)
		);

		if (uniqueNewJobs.length === 0) {
			return new Response(JSON.stringify(savedJobs));
		}

		// Enrich job data
		await Promise.all(
			uniqueNewJobs.map(async (job) => {
				job.salary = await JobScraper.getSalaryFromJobPage(job.url);
				job.normalized_salary = SalaryProcessor.normalizeSalary(job.salary ?? '');
				job.normalized_salary_yearly = SalaryProcessor.calculateYearlySalary(
					job.normalized_salary,
					job.salary
				);
			})
		);

		// Save new jobs
		await JobRepository.saveMany(uniqueNewJobs);

		// Return updated job list
		return new Response(JSON.stringify(await JobRepository.getAll()));
	} catch (error) {
		console.error('Error in GET handler:', error);
		return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
	}
}
