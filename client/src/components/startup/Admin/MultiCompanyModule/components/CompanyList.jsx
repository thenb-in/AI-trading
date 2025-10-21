import PropTypes from 'prop-types';

const CompanyCard = ({ company, isActive, onSwitch, loading }) => {
  return (
    <li className={`flex items-center justify-between p-4 border rounded-xl shadow-sm ${isActive ? 'bg-green-50 border-green-200' : 'bg-white'}`}>
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold">
          {company.name?.[0]?.toUpperCase() || '?'}
        </div>
        <div>
          <div className="font-semibold text-gray-900">{company.name}</div>
          {isActive ? (
            <span className="inline-flex items-center text-xs mt-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700">Active</span>
          ) : null}
        </div>
      </div>
      <div>
        <button
          onClick={() => onSwitch(company.id)}
          disabled={isActive || loading}
          className={`px-3 py-2 rounded-lg text-sm text-white ${
            isActive ? 'bg-gray-400' : 'bg-gray-900 hover:bg-black'
          }`}
        >
          {isActive ? 'Current' : 'Switch'}
        </button>
      </div>
    </li>
  );
};

CompanyCard.propTypes = {
  company: PropTypes.shape({ id: PropTypes.string, name: PropTypes.string }).isRequired,
  isActive: PropTypes.bool.isRequired,
  onSwitch: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};

const CompanyList = ({ companies, activeCompanyId, activeCompanyName, onSwitch, loading }) => {
  console.log('activeCompany ID', activeCompanyId);
  if (!companies?.length) {
    return (
      <div className="text-gray-500 py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 text-center">
        No companies linked yet.
      </div>
    );
  }

  return (
    <>
  <div className="text-center mb-4">
    <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-300 inline-block pb-2">
      Your Linked & Created Companies
    </h2>
    <p className="text-sm text-gray-600 mt-1">
      You can switch between your linked companies from the list below.
    </p>
  </div>

  <ul className="grid gap-3">
    {companies.map((c) => {
      const isActive = (activeCompanyName && c.name === activeCompanyName);
      return (
      <CompanyCard
        key={c.id}
        company={c}
        isActive={isActive}
        onSwitch={onSwitch}
        loading={loading}
      />
    );})}
  </ul>
</>

  );
};

CompanyList.propTypes = {
  companies: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.string, name: PropTypes.string })).isRequired,
  activeCompanyId: PropTypes.string,
  activeCompanyName: PropTypes.string,
  onSwitch: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};

export default CompanyList;


