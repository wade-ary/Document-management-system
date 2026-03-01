import FileTypeDistribution from "./DepartmentDisturbution";
import DocumentHistory from "./DocumentHistory";
import NotificationBar from "./NotificationBar";
import ErrorAnalysis from "./ErrorAnalysis";
import DocumentsProcessed from "./DocumentProcessed";
import UserActivityTrends from "./UserActivityTrends";

const DataDash = () => {
  return (
    <div className="bg-white rounded-xl p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        
        {/* Department Distribution & Document History */}
        <div className="col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-3">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <FileTypeDistribution/>
            </div>
            <div className="flex-1">
              <DocumentHistory />
            </div>
          </div>
        </div>

        {/* Notification Bar */}
        <div className="col-span-1 sm:col-span-1 md:col-span-1">
          <NotificationBar />
        </div>

        {/* Error Analysis & Documents Processed */}
        <div className="col-span-1 sm:col-span-2 md:col-span-2 lg:col-span-2">
          <div className="flex flex-col lg:flex-row gap-4 h-full">
            <div className="flex-1">
              <ErrorAnalysis />
            </div>
            <div className="flex-1">
              <DocumentsProcessed />
            </div>
          </div>
        </div>

        {/* User Activity Trends - Full Width */}
        <div className="col-span-1 sm:col-span-2 md:col-span-2 lg:col-span-2">
          <UserActivityTrends />
        </div>

        {/* System Performance & Document Processing Status */}
       
      </div>
    </div>
  );
};

export default DataDash;
