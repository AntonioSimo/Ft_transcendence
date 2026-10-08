import { useState } from 'react';

export function useEditableField(initialValue: string = '') {
	const [isEditing, setIsEditing] = useState(false);
	const [newValue, setNewValue] = useState(initialValue);
	const [loading, setLoading] = useState(false);

	const startEdit = (currentValue: string = '') => {
		setNewValue(currentValue);
		setIsEditing(true);
	};

	const cancelEdit = () => {
		setIsEditing(false);
		setNewValue('');
	};

	const handleKeyDown = (e: React.KeyboardEvent, onSave: () => void) => {
		if (e.key === 'Escape') {
			cancelEdit();
		} else if (e.key === 'Enter') {
			onSave();
		}
	};

	return {
		isEditing,
		newValue,
		loading,
		setNewValue,
		setLoading,
		startEdit,
		cancelEdit,
		handleKeyDown,
	};
}
