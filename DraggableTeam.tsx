import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

interface DraggableTeamProps {
  id: string;
  name: string;
  index: number;
}

export default function DraggableTeam({ id, name, index }: DraggableTeamProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center space-x-3 p-3 bg-gray-800 rounded-lg mb-2 ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab hover:text-blue-400"
      >
        <GripVertical className="h-5 w-5" />
      </div>
      <span className="font-medium text-gray-400">{index + 1}.</span>
      <span className="flex-1">{name}</span>
    </div>
  );
}