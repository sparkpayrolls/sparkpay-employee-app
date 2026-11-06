import React from "react";
import FeatureGate from "../components/FeatureGate";

const SalaryAdvance: React.FC = () => (
  <FeatureGate
    feature="salaryAdvance"
    title="Salary Advance"
    icon="payments"
    message="You'll soon be able to get part of the salary you have already earned before payday."
  />
);

export default SalaryAdvance;
