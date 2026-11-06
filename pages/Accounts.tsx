import React from "react";
import { useAccounts } from "../hooks/useAccounts";

const Accounts: React.FC = () => {
  const { handleBack } = useAccounts();

  return (
    <>
      <header className="bg-surface-light dark:bg-surface-dark sticky top-0 z-10 flex items-center p-4">
        <button
          className="text-text-light dark:text-text-dark p-2 rounded-full interactive-scale"
          onClick={handleBack}
          aria-label="Go back"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="flex-1 text-center text-lg font-bold pr-8">
          Bank Accounts
        </h1>
      </header>
      <main className="p-4 space-y-8">
        {/* The add-account form comes back with the safe bank change flow
            (M01-06): employer approval and a 24-hour cooling-off. The old
            "My Accounts" list was mock data (removed in P0-07). */}
        <section className="bg-surface-light dark:bg-surface-dark p-4 rounded-lg space-y-2">
          <h2 className="text-lg font-bold">Change your salary account</h2>
          <p className="text-subtext-light dark:text-subtext-dark">
            To change the bank account your salary is paid into, please
            contact your HR or payroll admin. You'll be able to request this
            in the app soon.
          </p>
        </section>
      </main>
    </>
  );
};

export default Accounts;
