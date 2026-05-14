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

// export const hasPermission = (userData, permissionNames) => {
//     const userPermissions = userData?.role?.permissions || [];

//     if (!Array.isArray(permissionNames)) {
//         permissionNames = [permissionNames]; // Convert to array if it's a single string
//     }

//     return permissionNames.some((perm) =>
//         userPermissions.some((userPerm) => userPerm.name === perm)
//     );
// };

export { useDataContext, hasPermission };
