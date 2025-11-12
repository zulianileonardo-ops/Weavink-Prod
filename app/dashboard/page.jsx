//app/dashboard/page.jsx
import ManageLinks from "./general components/ManageLinks";
import MyLinkDiv from "./general elements/MyLinkDiv";

export default function page() {
    return (
        <div className="flex-1 py-1 flex flex-col">
            <MyLinkDiv />
            <ManageLinks />
        </div>
    );
}