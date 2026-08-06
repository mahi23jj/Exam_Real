import React from 'react';
import Sidebar from '../Sidebar';
import MobileNav from '../MobileNav';

interface AppLayoutProps {
  children: React.ReactNode;
  activePage?: string;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children, activePage }) => {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar activePage={activePage} />
      <div className="flex-1 min-w-0 flex flex-col pb-24 lg:pb-0 h-screen overflow-y-auto">
        {children}
      </div>
      <MobileNav activePage={activePage} />
    </div>
  );
};

export default AppLayout;
