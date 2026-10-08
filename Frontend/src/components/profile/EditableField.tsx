import { useRef, useEffect } from 'react';

interface EditableFieldProps {
	label: string;
	value?: string;
	placeholder: string;
	isEditing: boolean;
	newValue: string;
	loading: boolean;
	type: 'email' | 'text';
	maxLength?: number;
	onValueChange: (value: string) => void;
	onStartEdit: () => void;
	onSave: () => void;
	onCancel: () => void;
	onKeyDown: (e: React.KeyboardEvent) => void;
}

export function EditableField({
	label,
	value,
	placeholder,
	isEditing,
	newValue,
	loading,
	type,
	maxLength,
	onValueChange,
	onStartEdit,
	onSave,
	onCancel,
	onKeyDown,
}: EditableFieldProps) {
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (isEditing && inputRef.current) {
			inputRef.current.focus();
		}
	}, [isEditing]);

	return (
		<div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0">
			<span className="text-white font-bold sm:mr-2">{label}:</span>
			{isEditing ? (
				<div className="flex items-center space-x-2">
					<input
						ref={inputRef}
						type={type}
						value={newValue}
						onChange={(e) => onValueChange(e.target.value)}
						onKeyDown={onKeyDown}
						className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm
                     focus:border-yellow-300 focus:outline-none min-w-0 flex-1"
						placeholder={placeholder}
						disabled={loading}
						maxLength={maxLength}
					/>
					<button
						onClick={onSave}
						disabled={loading}
						className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 
                     disabled:opacity-50 transition-colors"
					>
						{loading ? '⏳' : '✅'}
					</button>
					<button
						onClick={onCancel}
						disabled={loading}
						className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 
                     disabled:opacity-50 transition-colors"
					>
						❌
					</button>
				</div>
			) : (
				<button
					onClick={onStartEdit}
					className="text-gray-300 hover:text-yellow-300 hover:bg-gray-800 
                   px-2 py-1 rounded transition-all duration-200 text-left
                   border-2 border-transparent hover:border-yellow-300"
				>
					{value || placeholder}
				</button>
			)}
		</div>
	);
}
