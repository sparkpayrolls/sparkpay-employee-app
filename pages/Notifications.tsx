import React from "react";
import FeatureGate from "../components/FeatureGate";

const Notifications: React.FC = () => (
  <FeatureGate
    feature="notifications"
    title="Notifications"
    icon="notifications"
    message="Updates about your pay, payslips and requests will show up here soon."
  />
);

export default Notifications;
