import PropTypes from 'prop-types';
import { Building2, MapPin, FileBadge, Briefcase, Landmark, FileText, Upload, X } from 'lucide-react';

import { TextTypeField } from '@startup/components/base_components/fields/TextTypeField';
import { EmailTypeField } from '@startup/components/base_components/fields/EmailTypeField';
import { PhoneTypeField } from '@startup/components/base_components/fields/PhoneTypeField';
import { TextareaTypeField } from '@startup/components/base_components/fields/TextareaTypeField';
import { NumberTypeField } from '@startup/components/base_components/fields/NumberTypeField';
import { SearchableDropdown } from '@startup/components/base_components/fields/SearchableDropdown';
import { FieldFrame } from '@startup/components/base_components/fields/shared/FieldFrame';

const Section = ({ icon: Icon, title, children }) => (
  <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
    <div className="flex items-center gap-2 px-3 py-2 sm:px-5 sm:py-3 border-b border-gray-100">
      <Icon className="w-4 h-4 text-blue-600 flex-shrink-0" />
      <h3 className="text-sm font-semibold text-gray-800 truncate">{title}</h3>
    </div>
    <div className="p-3 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
      {children}
    </div>
  </div>
);

Section.propTypes = {
  icon: PropTypes.elementType.isRequired,
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired
};

const FullCol = ({ children }) => <div className="sm:col-span-2">{children}</div>;
FullCol.propTypes = { children: PropTypes.node.isRequired };

const CustomerDetailsFields = ({
  formData,
  onChange,
  labelPrefix = 'Customer',
  omitFields = [],
  isEditMode = false,
  logoFile,
  logoPreview,
  fileInputRef,
  onLogoChange,
  onClearLogo,
  serviceOfferings = [],
  onServiceOfferingChange,
  customerId,
  draftWorkorders = [],
  onDraftWorkordersChange,
  showWorkorders = false,
  WorkorderSectionComponent
}) => {
  const omit = (field) => omitFields.includes(field);

  const serviceOptions = serviceOfferings.map((o) => ({
    value: o.id,
    label: `${o.service_offering_code} — ${o.service_offering_name}`
  }));

  return (
    <div className="space-y-3 sm:space-y-4">
      <Section icon={Building2} title={`${labelPrefix} Identity`}>
        {!omit('customer_code') && (
          <TextTypeField
            name="customer_code"
            label={`${labelPrefix} Code`}
            value={formData.customer_code}
            onChange={onChange}
            placeholder="e.g. CUST-001"
            required
            disabled={isEditMode}
          />
        )}
        {!omit('entity_type') && (
          <TextTypeField
            name="entity_type"
            label={`${labelPrefix} Type`}
            value={formData.entity_type}
            onChange={onChange}
            placeholder="e.g. Private Limited, LLP, Sole Proprietor"
            required
          />
        )}
        {!omit('entity_name') && (
          <FullCol>
            <TextTypeField
              name="entity_name"
              label={`${labelPrefix} Name`}
              value={formData.entity_name}
              onChange={onChange}
              placeholder={`Registered name of the ${labelPrefix.toLowerCase()}`}
              required
            />
          </FullCol>
        )}
        {!omit('proprietor_name') && (
          <TextTypeField
            name="proprietor_name"
            label={`${labelPrefix} Contact Person`}
            value={formData.proprietor_name}
            onChange={onChange}
            placeholder="Name of the proprietor / point of contact"
          />
        )}
        {!omit('customer_email') && (
          <EmailTypeField
            name="customer_email"
            label={`${labelPrefix} Email`}
            value={formData.customer_email}
            onChange={onChange}
            placeholder="example@example.com"
          />
        )}
      </Section>

      <Section icon={MapPin} title={`${labelPrefix} Contact & Address`}>
        {!omit('phone') && (
          <PhoneTypeField
            name="phone"
            label={`${labelPrefix} Phone`}
            value={formData.phone}
            onChange={onChange}
            placeholder="+91 9876543210"
          />
        )}
        {!omit('alternate_phone') && (
          <PhoneTypeField
            name="alternate_phone"
            label={`${labelPrefix} Alternate Phone`}
            value={formData.alternate_phone}
            onChange={onChange}
            placeholder="Optional secondary number"
          />
        )}
        {!omit('district') && (
          <TextTypeField
            name="district"
            label={`${labelPrefix} District`}
            value={formData.district}
            onChange={onChange}
          />
        )}
        {!omit('address') && (
          <FullCol>
            <TextareaTypeField
              name="address"
              label={`${labelPrefix} Address`}
              value={formData.address}
              onChange={onChange}
              rows={2}
              placeholder="Street, city, state, postal code"
            />
          </FullCol>
        )}
      </Section>

      <Section icon={FileBadge} title={`${labelPrefix} Tax Details`}>
        {!omit('customer_gstin') && (
          <TextTypeField
            name="customer_gstin"
            label={`${labelPrefix} GSTIN`}
            value={formData.customer_gstin}
            onChange={onChange}
            placeholder="15-character GSTIN"
            maxLength={15}
          />
        )}
        {!omit('pan_no') && (
          <TextTypeField
            name="pan_no"
            label={`${labelPrefix} PAN`}
            value={formData.pan_no}
            onChange={onChange}
            placeholder="ABCDE1234F"
            maxLength={10}
          />
        )}
      </Section>

      <Section icon={Briefcase} title={`${labelPrefix} Service & Logo`}>
        {!omit('service_offering_id') && (
          <FieldFrame inputId="service_offering_id" label={`${labelPrefix} Service`}>
            <SearchableDropdown
              options={serviceOptions}
              selectedValues={formData.service_offering_id ? [formData.service_offering_id] : []}
              onChange={onServiceOfferingChange}
              placeholder="Search and select service..."
              multiple={false}
            />
          </FieldFrame>
        )}
        {!omit('service_charge') && (
          <NumberTypeField
            name="service_charge"
            label={`${labelPrefix} Service Charge (%)`}
            value={formData.service_charge}
            onChange={onChange}
            placeholder="e.g. 8.5"
            numberMode="float"
            precision={2}
            min={0}
            max={100}
            clamp
          />
        )}
        {!omit('company_logo') && (
          <FieldFrame inputId="company_logo" label={`${labelPrefix} Logo`}>
            <div className="flex items-center gap-3">
              {logoPreview ? (
                <div className="relative">
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="w-16 h-16 object-cover rounded-md border border-gray-200"
                  />
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
                <div className="w-16 h-16 bg-gray-50 border border-dashed border-gray-300 rounded-md flex items-center justify-center">
                  <Upload className="w-5 h-5 text-gray-400" />
                </div>
              )}
              <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 text-xs font-medium border border-gray-300 rounded-md hover:bg-gray-50">
                <Upload className="w-3.5 h-3.5" />
                {logoFile ? 'Change file' : 'Choose file'}
                <input
                  ref={fileInputRef}
                  id="company_logo" name="company_logo" type="file"
                  accept="image/*"
                  onChange={onLogoChange}
                  className="hidden"
                />
              </label>
            </div>
          </FieldFrame>
        )}
      </Section>

      <Section icon={Landmark} title={`${labelPrefix} Bank Details`}>
        {!omit('bank_account_holder_name') && (
          <TextTypeField
            name="bank_account_holder_name"
            label={`${labelPrefix} Account Holder Name`}
            value={formData.bank_account_holder_name}
            onChange={onChange}
          />
        )}
        {!omit('bank_account_number') && (
          <TextTypeField
            name="bank_account_number"
            label={`${labelPrefix} Account Number`}
            value={formData.bank_account_number}
            onChange={onChange}
          />
        )}
        {!omit('bank_name') && (
          <TextTypeField
            name="bank_name"
            label={`${labelPrefix} Bank Name`}
            value={formData.bank_name}
            onChange={onChange}
          />
        )}
        {!omit('bank_branch_name') && (
          <TextTypeField
            name="bank_branch_name"
            label={`${labelPrefix} Bank Branch`}
            value={formData.bank_branch_name}
            onChange={onChange}
          />
        )}
        {!omit('bank_ifsc_code') && (
          <FullCol>
            <TextTypeField
              name="bank_ifsc_code"
              label={`${labelPrefix} IFSC Code`}
              value={formData.bank_ifsc_code}
              onChange={onChange}
              placeholder="e.g. HDFC0001234"
              maxLength={11}
            />
          </FullCol>
        )}
      </Section>

      {!omit('description') && (
        <Section icon={FileText} title={`${labelPrefix} Notes`}>
          <FullCol>
            <TextareaTypeField
              name="description"
              label={`${labelPrefix} Notes`}
              value={formData.description}
              onChange={onChange}
              rows={3}
              placeholder={`Internal notes about this ${labelPrefix.toLowerCase()}`}
            />
          </FullCol>
        </Section>
      )}

      {showWorkorders && WorkorderSectionComponent ? (
        <WorkorderSectionComponent
          customerId={customerId}
          draftWorkorders={draftWorkorders}
          onDraftWorkordersChange={onDraftWorkordersChange}
        />
      ) : null}
    </div>
  );
};

CustomerDetailsFields.propTypes = {
  formData: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  labelPrefix: PropTypes.string,
  omitFields: PropTypes.arrayOf(PropTypes.string),
  isEditMode: PropTypes.bool,
  logoFile: PropTypes.object,
  logoPreview: PropTypes.string,
  fileInputRef: PropTypes.oneOfType([PropTypes.func, PropTypes.object]),
  onLogoChange: PropTypes.func,
  onClearLogo: PropTypes.func,
  serviceOfferings: PropTypes.array,
  onServiceOfferingChange: PropTypes.func,
  customerId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  draftWorkorders: PropTypes.arrayOf(PropTypes.object),
  onDraftWorkordersChange: PropTypes.func,
  showWorkorders: PropTypes.bool,
  WorkorderSectionComponent: PropTypes.elementType
};

export { CustomerDetailsFields };
