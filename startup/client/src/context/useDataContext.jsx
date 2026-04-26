import { useContext } from "react";
import { DataContext } from "./DataContext";

const useDataContext = () => useContext(DataContext);


const hasPermission = (requiredPermission, dataContext) => {
    if (!dataContext) {
        throw new Error("Data context not found");
    }
    if (!dataContext.userData) {
        console.log("User data not found", dataContext);
        return false;
    }
    if (!dataContext.userData.role) {
        console.log("Role not found", dataContext);
        return false;
    }
    if (!dataContext.userData.role.permissions) {
        console.log("Permissions not found", dataContext);
        return false;
    }
    const permissionAvailable = dataContext.userData.role.permissions.some(
        (permission) => permission.name === requiredPermission
    );
    if (!permissionAvailable) {
        console.log("Permission not found", requiredPermission, dataContext);
        return false;
    }
    return true;
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
