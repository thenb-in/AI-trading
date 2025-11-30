import PropTypes from 'prop-types';

const DummyComponent = ({ component }) => (
    <div className="p-6 bg-white rounded-xl border border-gray-200">
      <h2 className="text-xl font-semibold text-gray-800 mb-2">{component.title}</h2>
      <p className="text-gray-600">This component does not have a view yet.</p>
    </div>
);
  
DummyComponent.propTypes = {
component: PropTypes.shape({
    title: PropTypes.string.isRequired,
}).isRequired,
};


export { DummyComponent };
