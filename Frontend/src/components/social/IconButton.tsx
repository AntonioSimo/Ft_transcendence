type IconButtonProps = {
	onClick: () => void;
	title: string;
	bgColor: string;
	hoverColor: string;
	pathD: string;
};

export function IconButton({ onClick, title, bgColor, hoverColor, pathD }: IconButtonProps) {
	return (
		<button
			onClick={onClick}
			className={`p-2 ${bgColor} rounded ${hoverColor} transition`}
			title={title}
		>
			<svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
				<path fillRule="evenodd" d={pathD} clipRule="evenodd" />
			</svg>
		</button>
	);
}
