import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import type { PayslipDetail as PayslipDetailType } from "@/types";
import { $api } from "@/services/api";

export const usePayslipDetail = () => {
  const { payslipId } = useParams<{ payslipId: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [payslip, setPayslip] = useState<PayslipDetailType | null>(null);
  const printableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchPayslip = async () => {
      setIsLoading(true);

      try {
        if (!payslipId) return;

        const { data: response } = await $api.get<Record<string, any>>(
          `employee-payrolls/payslip/${payslipId}`
        );

        let salaryBreakdown = response.salaryBreakdown;
        if (!salaryBreakdown?.length) {
          salaryBreakdown = response.employee.salaryBreakdown;
        }
        if (!salaryBreakdown?.length) {
          salaryBreakdown = response.employee.company.salaryBreakdown || [
            {
              name: "Basic Allowance",
              value: 100,
            },
          ];
        }

        const salary = response.proratedSalary || response.salary;
        const totalBonus =
          response.bonuses?.reduce(
            (acc: number, curr: any) => acc + curr.amount,
            0
          ) || 0;

        const totalGrossEarnings = salary + totalBonus;
        const deductions = [
          { description: "PAYE Tax", amount: response.tax?.amount || 0 },
          {
            description: "Pension Contribution",
            amount: response.pension?.employeeContribution || 0,
          },
          {
            description: "NHF Contribution",
            amount: response.nhf?.amount || 0,
          },
          {
            description: "Other Deductions",
            amount: response.totalDeductions?.amount || 0,
          },
        ];
        const totalDeductions = deductions.reduce(
          (acc, curr) => acc + curr.amount,
          0
        );

        setPayslip({
          id: response.id,
          monthYear: `${response.payroll.proRateMonth} ${response.payroll.year}`,
          employeeName: `${response.employee.firstname} ${response.employee.lastname}`,
          employeeId: response.employee.id.toUpperCase(),
          department:
            response.employee.groups
              ?.map((g: any) => g.group?.name)
              .filter(Boolean)
              .join(", ") || "N/A",
          payPeriod: `${response.payroll.proRateMonth} ${response.payroll.year}`,
          earnings: salaryBreakdown
            .map((item: any) => ({
              description: item.name,
              amount: (item.value * salary) / 100,
            }))
            .concat(
              response.bonuses?.map((b: any) => ({
                description: b.name,
                amount: b.amount,
              })) || []
            ),
          deductions,
          grossEarnings: totalGrossEarnings,
          totalDeductions,
          netSalary: response.netSalary,
          organization: response.employee.company.name,
        });
      } catch (error) {
        console.error("Failed to fetch payslip:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPayslip();
  }, [payslipId]);

  const handleDownload = async () => {
    const element = printableRef.current;
    if (!element || !payslip) return;

    // bundled and loaded on first use, instead of a CDN script on every page
    let html2pdf: (typeof import("html2pdf.js"))["default"];
    try {
      html2pdf = (await import("html2pdf.js")).default;
    } catch {
      alert("Could not generate PDF. Please try again later.");
      return;
    }

    const options = {
      margin: 0,
      filename: `Payslip-${payslip.monthYear.replace(/\s+/g, "-")}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
    };

    html2pdf().set(options).from(element).save();
  };

  const handleShare = () => {
    // alert("Share functionality is not yet implemented.");
  };

  return {
    payslip,
    isLoading,
    printableRef,
    handleDownload,
    handleShare,
  };
};
