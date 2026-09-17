import { Navigate } from "react-router-dom";


function ProtectedRoute({
    children,
    allowedRoles
}) {

    const user =
        JSON.parse(
            sessionStorage.getItem("user")
        );


    if (!user) {

        return (
            <Navigate
                to="/login"
                replace
            />
        );

    }


    if (
        allowedRoles &&
        !allowedRoles.includes(user.role)
    ) {

        return (
            <Navigate
                to="/unauthorized"
                replace
            />

        );

    }


    return children;

}


export default ProtectedRoute;