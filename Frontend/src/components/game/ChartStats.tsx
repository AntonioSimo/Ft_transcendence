import React, { useMemo } from 'react';
import 'chart.js/auto';
import { Doughnut, Line } from 'react-chartjs-2';

type Props = { profileData: any };

export function ChartStats({ profileData }: Props) {
	const wins = profileData?.wins || 0;
	const played = profileData?.played || 0;
	const losses = played - wins || 0;

	const history = profileData?.history || null;

	const doughnutData = useMemo(
		() => ({
			labels: ['Wins', 'Losses'],
			datasets: [
				{
					data: [wins, losses],
					backgroundColor: ['#16a34a', '#ef4444'],
					hoverBackgroundColor: ['#22c55e', '#f87171'],
				},
			],
		}),
		[wins, losses]
	);

	const lineData = useMemo(() => {
		if (Array.isArray(history) && history.length > 0) {
			const labels = history.map((h: any) => new Date(h.date).toLocaleDateString());
			const winRates = history.map((h: any) => {
				const p = h.played || 0;
				const w = h.wins || 0;
				return p ? Math.round((w / p) * 100 * 100) / 100 : 0;
			});
			return {
				labels,
				datasets: [
					{
						label: 'Win Rate %',
						data: winRates,
						borderColor: '#f59e0b',
						backgroundColor: 'rgba(245,158,11,0.15)',
						tension: 0.3,
						fill: true,
						pointRadius: 2,
					},
				],
			};
		}

		const winRate = played ? (wins / played) * 100 : 0;
		const labels = ['-4', '-3', '-2', '-1', 'Now'];
		const values = [winRate, winRate, winRate, winRate, winRate];
		return {
			labels,
			datasets: [
				{
					label: 'Win Rate % (est.)',
					data: values,
					borderColor: '#f59e0b',
					backgroundColor: 'rgba(245,158,11,0.15)',
					tension: 0.3,
					fill: true,
					pointRadius: 2,
				},
			],
		};
	}, [history, wins, played]);

	const lineOptions = {
		scales: {
			y: { beginAtZero: true, max: 100, ticks: { callback: (val: any) => `${val}%` } },
		},
		plugins: { legend: { display: false } },
		maintainAspectRatio: false,
	};

	return (
		<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
			<div className="w-full h-40">
				<Doughnut data={doughnutData} />
			</div>
			<div className="w-full h-40">
				<div className="h-full">
					<Line data={lineData} options={lineOptions} />
				</div>
			</div>
		</div>
	);
}
