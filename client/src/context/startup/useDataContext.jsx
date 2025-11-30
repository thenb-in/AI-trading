import { useContext } from "react";
import { DataContext } from "./DataContext";

const useDataContext = () => useContext(DataContext);


const hasPermission = (requiredPermission, dataContext) => {
    if (!dataContext) {
        throw new Error("Data context not found");
    }
    return dataContext.userData?.role?.permissions?.some(
        (permission) => permission.name === requiredPermission
    );
};

export { useDataContext, hasPermission };
