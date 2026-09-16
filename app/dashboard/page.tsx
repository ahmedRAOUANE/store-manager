
/*
    this route is not an aqual page
    it is working as a redirection afte kinde auth redirects the user to this page
*/ 
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/utils/auth";
import { AppError } from "@/errors/base.error";

export default async function DashboardPage() {
    const user = await getCurrentUser();

    if (user instanceof AppError) {
        redirect("api/auth/login");
    }

    // determine the user's appropriate destination

    if (user.globalRole === "ADMIN") {
        redirect(`/admin/${user.id}/dashboard`);
    }
    
    if (user.globalRole === "USER") {
        redirect(`/user/${user.id}/profile`);
    }



    return <div></div>
}