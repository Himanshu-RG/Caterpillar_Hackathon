/**
 * Training Modules Registry and Helper Lookups
 */

import { EquipmentType, TrainingModule } from '../types';
import { CAT320_MODULES } from './cat320Modules';
import { CAT950M_MODULES } from './cat950mModules';
import { CATD6_MODULES } from './catd6Modules';

export interface EquipmentSpec {
  id: EquipmentType;
  name: string;
  category: string;
  description: string;
  defaultMachineId: string;
  modulesCount: number;
  tags: string[];
}

export const EQUIPMENT_CATALOG: EquipmentSpec[] = [
  {
    id: 'cat320',
    name: 'CAT 320 GC Excavator',
    category: 'Excavator',
    description: 'High-production medium hydraulic excavator with Cat Grade and 2D payload system.',
    defaultMachineId: 'EXC007',
    modulesCount: CAT320_MODULES.length,
    tags: ['Safety', 'Operation', 'Hydraulics', 'Maintenance'],
  },
  {
    id: 'cat950m',
    name: 'CAT 950M Wheel Loader',
    category: 'Wheel Loader',
    description: 'Medium wheel loader with Z-bar linkage and auto-dig payload management.',
    defaultMachineId: 'LOD001',
    modulesCount: CAT950M_MODULES.length,
    tags: ['Safety', 'Articulation', 'Truck Loading', 'Tipping'],
  },
  {
    id: 'catd6',
    name: 'CAT D6 Bulldozer',
    category: 'Dozer',
    description: 'High-drive track-type tractor equipped with Cat GRADE 3D and VPAT blade.',
    defaultMachineId: 'DOZ001',
    modulesCount: CATD6_MODULES.length,
    tags: ['Safety', 'Slope Control', 'Slot Dozing', 'Track Drive'],
  },
];

export const ALL_TRAINING_MODULES: TrainingModule[] = [
  ...CAT320_MODULES,
  ...CAT950M_MODULES,
  ...CATD6_MODULES,
];

export function getModulesByEquipment(type: EquipmentType): TrainingModule[] {
  switch (type) {
    case 'cat320':
      return CAT320_MODULES;
    case 'cat950m':
      return CAT950M_MODULES;
    case 'catd6':
      return CATD6_MODULES;
    default:
      return CAT320_MODULES;
  }
}

export function getModuleById(moduleId: string): TrainingModule | undefined {
  return ALL_TRAINING_MODULES.find((m) => m.id === moduleId);
}

export function getEquipmentById(type: string): EquipmentSpec | undefined {
  return EQUIPMENT_CATALOG.find((e) => e.id === type);
}
