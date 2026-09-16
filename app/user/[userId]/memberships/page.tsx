import { getAllMemberships } from "@/actions/user.actions";

export default async function MembershipsPage() {
    const memberships = await getAllMemberships();

    console.log("memberships: ", memberships);
    return (
        <div>
            Memberships page
        </div>
    )
}