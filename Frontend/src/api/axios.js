import axios from "axios";


const api = axios.create({

    baseURL: "http://localhost:8000/api",

    withCredentials: true,

    headers: {

        "Content-Type": "application/json",

    },

});


function getCookie(name) {

    const cookies = document.cookie.split(";");

    for (let cookie of cookies) {

        cookie = cookie.trim();

        if (
            cookie.startsWith(name + "=")
        ) {

            return decodeURIComponent(
                cookie.substring(name.length + 1)
            );

        }

    }

    return null;

}


api.interceptors.request.use(

    (config) => {

        const method =
            config.method?.toLowerCase();


        if (
            ["post", "put", "patch", "delete"]
                .includes(method)
        ) {

            const csrfToken =
                getCookie("csrftoken");


            if (csrfToken) {

                config.headers[
                    "X-CSRFToken"
                ] = csrfToken;

            }

        }


        return config;

    },

    (error) => {

        return Promise.reject(error);

    }

);


export default api; 
