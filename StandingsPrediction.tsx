import React, { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import DraggableTeam from './DraggableTeam';
import { Team } from '../data/sportsData';

interface StandingsPredictionProps {
  conference: string;
  division: string;
  teams: Team[];
  onChange: (teams: Team[]) => void;
}

export default function StandingsPrediction({
  conference,
  division,
  teams: initialTeams,
  onChange
}: StandingsPredictionProps) {
  const [teams, setTeams] = useState(initialTeams);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setTeams((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newTeams = arrayMove(items, oldIndex, newIndex);
        onChange(newTeams);
        return newTeams;
      });
    }
  };

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <div className="mb-4">
        <h3 className="text-xl font-bold text-gray-200">{conference}</h3>
        <h4 className="text-sm text-gray-400">{division} Division</h4>
      </div>
      
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={teams.map(team => team.id)}
          strategy={verticalListSortingStrategy}
        >
          {teams.map((team, index) => (
            <DraggableTeam
              key={team.id}
              id={team.id}
              name={team.name}
              index={index}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}