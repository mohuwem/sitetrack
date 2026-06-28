import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import UpdatePasswordForm from "../../components/auth/UpdatePasswordForm";

export default function UpdatePassword() {
  return (
    <>
      <PageMeta
        title="Update Password | SiteTrack"
        description="Update your SiteTrack password"
      />
      <AuthLayout>
        <UpdatePasswordForm />
      </AuthLayout>
    </>
  );
}