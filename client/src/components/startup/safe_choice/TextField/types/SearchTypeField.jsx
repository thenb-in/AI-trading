import { Search } from 'lucide-react';
import { BaseInputField } from '../shared/BaseInputField';
import { commonFieldPropTypes } from '../shared/fieldPropTypes';

function SearchTypeField(props) {
  return (
    <BaseInputField
      {...props}
      inputType="search"
      defaultIcon={<Search className="h-4 w-4 text-gray-400" />}
      clearAriaLabel="Clear search"
    />
  );
}

SearchTypeField.propTypes = {
  ...commonFieldPropTypes,
};

export { SearchTypeField };


