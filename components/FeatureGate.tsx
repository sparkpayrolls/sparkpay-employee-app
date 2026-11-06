import React from "react";
import { useNavigate } from "react-router-dom";
import EmptyState from "./EmptyState";
import { Feature, isFeatureEnabled } from "../services/features";

interface FeatureGateProps {
  feature: Feature;
  title: string;
  message: string;
  icon?: string;
  children?: React.ReactNode;
}

/** Shows the screen when its module is on, and "coming soon" until then. */
const FeatureGate: React.FC<FeatureGateProps> = ({
  feature,
  title,
  message,
  icon,
  children,
}) => {
  const navigate = useNavigate();

  if (isFeatureEnabled(feature)) {
    return <>{children}</>;
  }

  return (
    <>
      <header className="bg-surface-light dark:bg-surface-dark sticky top-0 z-10 flex items-center p-4">
        <button
          className="text-text-light dark:text-text-dark p-2 rounded-full interactive-scale"
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="flex-1 text-center text-lg font-bold pr-8">{title}</h1>
      </header>
      <main className="p-4">
        <EmptyState icon={icon} title="Coming soon" message={message} />
      </main>
    </>
  );
};

export default FeatureGate;
