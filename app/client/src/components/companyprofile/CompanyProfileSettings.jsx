import { forwardRef, useImperativeHandle } from "react";
import PropTypes from "prop-types";
import { useCompanyProfileSettings } from "./useCompanyProfileSettings";
import { AttendanceSection } from "./sections/AttendanceSection";
import { ComplianceSection } from "./sections/ComplianceSection";
import { EmployeeDefaultsCard } from "./sections/EmployeeDefaultsSection";
import { PerformanceCard } from "./sections/PerformanceSection";
import { CompanyScheduleCard, CompanyWeeklyOffCard } from "./sections/CompanyScheduleSection";
import {
  CredentialsCard,
  DeviceDeactivationCard,
  AttendanceRulesCard,
  ServiceCard,
} from "./sections/ProfileSection";

const CompanyProfileSettings = forwardRef(function CompanyProfileSettings(props, ref) {
  const { isLoading: parentLoading, onDirtyChange } = props;
  const ctx = useCompanyProfileSettings({ onDirtyChange });

  useImperativeHandle(
    ref,
    () => ({
      save: ctx.save,
      isDirty: () => ctx.isDirty,
      reset: ctx.reset,
    }),
    [ctx.save, ctx.isDirty, ctx.reset]
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CredentialsCard ctx={ctx} parentLoading={parentLoading} />
        <ServiceCard ctx={ctx} parentLoading={parentLoading} />
        <AttendanceRulesCard ctx={ctx} parentLoading={parentLoading} />
        <ComplianceSection ctx={ctx} parentLoading={parentLoading} />
        <EmployeeDefaultsCard ctx={ctx} parentLoading={parentLoading} />
      </div>
      <DeviceDeactivationCard ctx={ctx} parentLoading={parentLoading} />
      {/* Full width — the band table needs the room. */}
      <PerformanceCard ctx={ctx} parentLoading={parentLoading} />
      {/* Both save through their own endpoints, so they sit outside the profile form. */}
      <CompanyScheduleCard />
      <CompanyWeeklyOffCard />
      <AttendanceSection ctx={ctx} parentLoading={parentLoading} />
    </div>
  );
});

CompanyProfileSettings.propTypes = {
  isLoading: PropTypes.bool,
  onDirtyChange: PropTypes.func,
};

export { CompanyProfileSettings };
