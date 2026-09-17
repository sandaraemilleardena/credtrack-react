import api from "./axios";


export async function getCSRFToken() {

    await api.get("/auth/csrf/");

}