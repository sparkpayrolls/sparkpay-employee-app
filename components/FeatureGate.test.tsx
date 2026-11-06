import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Notifications from "../pages/Notifications";
import Reimbursements from "../pages/Reimbursements";
import SalaryAdvance from "../pages/SalaryAdvance";

const renderPage = (page: React.ReactElement) =>
  render(<MemoryRouter>{page}</MemoryRouter>);

describe("modules that are not built yet", () => {
  afterEach(cleanup);

  it.each([
    ["Reimbursements", <Reimbursements />],
    ["Notifications", <Notifications />],
    ["Salary Advance", <SalaryAdvance />],
  ])("%s shows coming soon instead of mock data", (title, page) => {
    renderPage(page);

    expect(screen.getByRole("heading", { name: title })).toBeTruthy();
    expect(screen.getByText("Coming soon")).toBeTruthy();
  });
});
