
import React, { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Generate from './pages/Generate';
import Edit from './pages/Edit';
import Detect from './pages/Detect';
import Compare from './pages/Compare';
import UserSelectionModal from './components/UserSelectionModal';
import { AppTab } from './types';

const TAB_COMPONENTS: Record<AppTab, React.ComponentType> = {
  dashboard: Dashboard,
  generate: Generate,
  edit: Edit,
  detect: Detect,
  compare: Compare,
};

const App = () => {
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const ActivePage = TAB_COMPONENTS[activeTab];

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      <UserSelectionModal />
      <ActivePage />
    </Layout>
  );
};

export default App;
