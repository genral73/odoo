const api = {
    baseURL: localStorage.getItem('baseURL') || "https://9d80deba.ngrok.io",
    createLead: "/crm/addons/lead/create",
    getLeads: "/crm/addons/lead/get_by_partner_id",
    deleteLead: "/crm/addons/lead/delete",
    getPartner: "/crm/addons/partner/get",
    logMail: "/crm/addons/log_single_mail_content",
    token: "/crm/addons/token",
    login: "/crm/addons/login",
    redirectCreateLead: "/crm/addons/lead/redirect_form_view",
    redirect: "https://localhost:3000/taskpane.html"
};

export default api;