import React from 'react';
import { useParams } from 'react-router-dom';
import { getModuleById } from '../training/definitions';
import { TrainingDetailPage } from './TrainingDetailPage';
import { MachineTrainingPage } from './MachineTrainingPage';

export const TrainingSlugDispatcher: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  if (slug && getModuleById(slug)) {
    return <TrainingDetailPage moduleIdOverride={slug} />;
  }

  return <MachineTrainingPage machineTypeOverride={slug} />;
};
export default TrainingSlugDispatcher;
