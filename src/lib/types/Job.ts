export interface Job {
	title: string;
	url: string;
	company: string;
	time: string;
	salary?: string;
	normalized_salary?: number | null;
	normalized_salary_yearly?: number | null;
}
