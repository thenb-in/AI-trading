import { FileTypeField } from '@startup/components/base_components/fields/FileTypeField';
import PropTypes from "prop-types";
import { MapPin, FileBadge, Landmark, Image, Upload, X } from "lucide-react";
import { TextTypeField } from "@startup/components/base_components/fields/TextTypeField";
import { EmailTypeField } from "@startup/components/base_components/fields/EmailTypeField";
import { PhoneTypeField } from "@startup/components/base_components/fields/PhoneTypeField";
import { TextareaTypeField } from "@startup/components/base_components/fields/TextareaTypeField";
import { FieldFrame } from "@startup/components/base_components/fields/shared/FieldFrame";
import { SettingsCard } from "./SettingsCard";


const Section = ({ icon, title, children }) => (
  <SettingsCard
    icon={icon}
    title={title}
    bodyClassName="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4"
  >
    {children}
  </SettingsCard>
);
Section.propTypes = { icon: PropTypes.elementType.isRequired, title: PropTypes.string.isRequired, children: PropTypes.node.isRequired };

const FullCol = ({ children }) => <div className="sm:col-span-2 lg:col-span-3 xl:col-span-4">{children}</div>;
FullCol.propTypes = { children: PropTypes.node.isRequired };

const formProps = {
  formData: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
};

/* Contact & Address */
const ContactSection = ({ formData, onChange }) => (
  <Section icon={MapPin} title="Company Contact & Address">
    <EmailTypeField name="company_email" label="Company Email" value={formData.company_email} onChange={onChange} placeholder="example@example.com" />
    <PhoneTypeField name="phone" label="Company Phone" value={formData.phone} onChange={onChange} placeholder="+91 XXXXXXXXXXX" />
    <PhoneTypeField name="alternate_phone" label="Company Alternate Phone" value={formData.alternate_phone} onChange={onChange} placeholder="Optional secondary number" />
    <TextTypeField name="district" label="Company District" value={formData.district} onChange={onChange} placeholder="e.g. Jaipur" />
    <FullCol>
      <TextareaTypeField
        name="address"
        label="Company Address"
        value={formData.address}
        onChange={onChange}
        rows={2}
        placeholder="Street, city, state, postal code"
      />
    </FullCol>
  </Section>
);
ContactSection.propTypes = formProps;

/* Tax & Statutory (GSTIN, PAN, EPF, SAC) */
const TaxStatutorySection = ({ formData, onChange }) => (
  <Section icon={FileBadge} title="Tax & Statutory">
    <TextTypeField name="company_gstin" label="Company GSTIN" value={formData.company_gstin} onChange={onChange} placeholder="15-character GSTIN" maxLength={15} />
    <TextTypeField name="pan_no" label="Company PAN" value={formData.pan_no} onChange={onChange} placeholder="ABCDE1234F" maxLength={10} />
    <TextTypeField name="epf_no" label="EPF Number" value={formData.epf_no} onChange={onChange} placeholder="e.g. GNGGNXXXXXXXX" maxLength={50} />
    <TextTypeField name="sac_code" label="SAC Code" value={formData.sac_code} onChange={onChange} placeholder="e.g. 998513" maxLength={20} />
  </Section>
);
TaxStatutorySection.propTypes = formProps;

/* Bank */
const BankSection = ({ formData, onChange }) => (
  <Section icon={Landmark} title="Company Bank Details">
    <TextTypeField name="bank_account_holder_name" label="Account Holder Name" value={formData.bank_account_holder_name} onChange={onChange} placeholder="As per bank records" />
    <TextTypeField name="bank_account_number" label="Account Number" value={formData.bank_account_number} onChange={onChange} placeholder="e.g. 123456789012" />
    <TextTypeField name="bank_name" label="Bank Name" value={formData.bank_name} onChange={onChange} placeholder="e.g. HDFC Bank" />
    <TextTypeField name="bank_branch_name" label="Bank Branch" value={formData.bank_branch_name} onChange={onChange} placeholder="e.g. MI Road, Jaipur" />
    <TextTypeField name="bank_ifsc_code" label="IFSC Code" value={formData.bank_ifsc_code} onChange={onChange} placeholder="e.g. HDFC0001234" maxLength={11} />
  </Section>
);
BankSection.propTypes = formProps;

/* Logo / branding */
const LogoSection = ({
  logoFile,
  logoPreview,
  fileInputRef,
  onLogoChange,
  onClearLogo,
}) => {
  return (
    <Section icon={Image} title="Company Branding">
      <FieldFrame inputId="company_logo" label="Company Logo">
        <div className="flex items-center gap-3">
          {logoPreview ? (
            <div className="relative">
              <img src={logoPreview} alt="Logo preview" className="w-14 h-14 object-cover rounded-md border border-gray-200" />
              <button
                type="button"
                onClick={onClearLogo}
                className="absolute -top-2 -right-2 bg-white border border-gray-300 rounded-full p-0.5 shadow-sm hover:bg-gray-50"
                aria-label="Remove logo"
              >
                <X className="w-3 h-3 text-gray-600" />
              </button>
            </div>
          ) : (
            <div className="w-14 h-14 bg-gray-50 border border-dashed border-gray-300 rounded-md flex items-center justify-center">
              <Upload className="w-5 h-5 text-gray-400" />
            </div>
          )}
          <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 text-xs font-medium border border-gray-300 rounded-md hover:bg-gray-50">
            <Upload className="w-3.5 h-3.5" />
            {logoFile ? "Change file" : "Choose file"}
            <FileTypeField inputRef={fileInputRef} id="company_logo" name="company_logo" accept="image/*" onChange={onLogoChange} fileChangeMode="native" containerClassName="hidden" />
          </label>
        </div>
      </FieldFrame>
    </Section>
  );
};
LogoSection.propTypes = {
  logoFile: PropTypes.object,
  logoPreview: PropTypes.string,
  fileInputRef: PropTypes.oneOfType([PropTypes.func, PropTypes.object]),
  onLogoChange: PropTypes.func,
  onClearLogo: PropTypes.func,
};

export { ContactSection, TaxStatutorySection, BankSection, LogoSection };
