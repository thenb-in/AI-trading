import PropTypes from 'prop-types';
import { MasterHeader } from '../master';
import { Loader } from '../../common/Loader';
import { OrgChart } from './OrgChart';

/**
 * A whole page built around an org chart
 */
const OrgChartPage = ({
  title,
  description,
  onRefresh,
  headerActions = null,
  showBack = false,
  loading = false,
  loadingMessage = 'Loading...',
  root,
  onOpen,
  onSelect,
  overlay,
  toolbar,
  searchPlaceholder,
  emptyText,
  modals,
}) => {
  if (loading) {
    return <Loader message={loadingMessage} />;
  }

  return (
    <div className="flex h-[calc(100vh-3rem)] w-full flex-col">
      <MasterHeader
        title={title}
        description={description}
        showBack={showBack}
        onRefresh={onRefresh}
        extraHeaderActions={headerActions}
      />

      <div className="min-h-0 flex-1">
        <OrgChart
          root={root}
          onOpen={onOpen}
          onSelect={onSelect}
          overlay={overlay}
          toolbar={toolbar}
          searchPlaceholder={searchPlaceholder}
          emptyText={emptyText}
        />
      </div>

      {modals}
    </div>
  );
};

OrgChartPage.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  onRefresh: PropTypes.func,
  headerActions: PropTypes.node,
  showBack: PropTypes.bool,
  loading: PropTypes.bool,
  loadingMessage: PropTypes.string,
  root: PropTypes.object,
  onOpen: PropTypes.func,
  onSelect: PropTypes.func,
  overlay: PropTypes.node,
  toolbar: PropTypes.node,
  searchPlaceholder: PropTypes.string,
  emptyText: PropTypes.string,
  modals: PropTypes.node,
};

export { OrgChartPage };
