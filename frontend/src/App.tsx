import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { RealtimeProvider } from './context/RealtimeContext';
import { AppShell } from './components/layout/AppShell';

import { DashboardPage } from './pages/DashboardPage';
import { MachinePage } from './pages/MachinePage';
import { TasksPage } from './pages/TasksPage';
import { TaskDetailPage } from './pages/TaskDetailPage';
import { SafetyPage } from './pages/SafetyPage';
import { HealthPage } from './pages/HealthPage';
import { BehaviorPage } from './pages/BehaviorPage';
import { TrainingPage } from './pages/TrainingPage';
import { IncidentsPage } from './pages/IncidentsPage';
import { FleetPage } from './pages/FleetPage';
import { SettingsPage } from './pages/SettingsPage';

export const App: React.FC = () => {
  return (
    <RealtimeProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/machine" element={<MachinePage />} />
            <Route path="/machine/:machineId" element={<MachinePage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/tasks/:taskId" element={<TaskDetailPage />} />
            <Route path="/safety" element={<SafetyPage />} />
            <Route path="/health" element={<HealthPage />} />
            <Route path="/behavior" element={<BehaviorPage />} />
            <Route path="/training" element={<TrainingPage />} />
            <Route path="/incidents" element={<IncidentsPage />} />
            <Route path="/fleet" element={<FleetPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </RealtimeProvider>
  );
};

export default App;
