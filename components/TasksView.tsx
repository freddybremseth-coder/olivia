import React from 'react';
import { Parcel } from '../types';
import TasksKanbanOliviaView from './TasksKanbanOliviaView';

interface TasksViewProps {
  parcels: Parcel[];
}

const TasksView: React.FC<TasksViewProps> = ({ parcels }) => {
  return <TasksKanbanOliviaView parcels={parcels} />;
};

export default TasksView;
