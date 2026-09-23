import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
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
import { TrainingSlugDispatcher } from './pages/TrainingRouter';
import { TutorialRunnerPage } from './pages/TutorialRunnerPage';
import { TrainingResultPage } from './pages/TrainingResultPage';
import { IncidentsPage } from './pages/IncidentsPage';
import { FleetPage } from './pages/FleetPage';
import { SettingsPage } from './pages/SettingsPage';
import { DemoPage } from './pages/DemoPage';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
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
              
              {/* Interactive Hardware Training Routes */}
              <Route path="/training" element={<TrainingPage />} />
              <Route path="/training/:moduleId/run" element={<TutorialRunnerPage />} />
              <Route path="/training/:moduleId/result" element={<TrainingResultPage />} />
              <Route path="/training/:slug" element={<TrainingSlugDispatcher />} />

              {/* Presentation & Auto-Demo Mode */}
              <Route path="/demo" element={<DemoPage />} />
              <Route path="/presentation" element={<DemoPage />} />

              {/* Supervisor & Fleet Routes */}
              <Route path="/incidents" element={<IncidentsPage />} />
              <Route path="/fleet" element={<FleetPage />} />
              <Route path="/settings" element={<SettingsPage />} />

              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </RealtimeProvider>
    </ThemeProvider>
  );
};

export default App;
