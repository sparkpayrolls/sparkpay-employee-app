import React from "react";
import FeatureGate from "../components/FeatureGate";

const NewReimbursement: React.FC = () => (
  <FeatureGate
    feature="reimbursements"
    title="New Reimbursement"
    icon="receipt_long"
    message="You'll soon be able to claim back work expenses and track each claim here."
  />
);

export default NewReimbursement;
