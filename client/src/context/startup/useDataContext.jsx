import { useContext } from "react";
import { DataContext } from "./DataContext";

const useDataContext = () => useContext(DataContext);


const hasPermission = (requiredPermission, dataContext) => {
    return dataContext?.userData?.role?.permissions?.some(
        (permission) => permission.name === requiredPermission
    );
};

export { useDataContext, hasPermission };
